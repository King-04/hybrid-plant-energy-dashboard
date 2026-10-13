-- =====================================================================
--  Kestrel Ridge Energy Park · synthetic seed
--  35 days of 15-minute data ending "now". Deterministic (setseed).
--
--  Story baked into the data:
--    * Weather regimes: sunny / overcast days, windy fronts every few days
--    * The battery arbitrages: charges at night + solar noon, discharges
--      into the evening price peak
--    * PV-04 lost its inverter for ~12 h yesterday         (fault)
--    * WT-07 was stopped ~20 h for a gearbox inspection    (maintenance)
--    * WT-11 under-performs its power curve (yaw misalignment, no alarm!)
--    * PV-06 is ~7 % below its neighbours (soiling)
-- =====================================================================
SET search_path TO plant, public;
SELECT setseed(0.17);

-- Deterministic 0..1 hash, used for per-day weather and per-asset factors
CREATE OR REPLACE FUNCTION plant.hash01(x double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS
$$ SELECT abs(sin(x * 12.9898) * 43758.5453) - floor(abs(sin(x * 12.9898) * 43758.5453)) $$;

-- Generic 3 MW turbine power curve (cut-in 3, rated 12, cut-out 25 m/s)
CREATE OR REPLACE FUNCTION plant.turbine_mw(v double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS
$$ SELECT CASE WHEN v < 3 OR v >= 25 THEN 0
               WHEN v >= 12 THEN 3.0
               ELSE 3.0 * (power(v, 3) - 27) / (1728 - 27) END $$;

-- ---------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------
INSERT INTO asset (asset_id, name, kind, capacity_mw)
SELECT 'PV-0' || n, 'Solar block ' || n, 'pv_block', 8 FROM generate_series(1, 6) n;
INSERT INTO asset (asset_id, name, kind, capacity_mw)
SELECT 'WT-' || lpad(n::text, 2, '0'), 'Turbine ' || n, 'wind_turbine', 3 FROM generate_series(1, 12) n;
INSERT INTO asset VALUES ('BESS', 'Battery', 'bess', 20, 80);

-- ---------------------------------------------------------------------
-- Weather
-- ---------------------------------------------------------------------
CREATE TEMP TABLE t AS
SELECT ts,
       extract(epoch FROM ts) / 86400.0                          AS td,       -- days since epoch
       floor(extract(epoch FROM ts) / 86400.0)                   AS dnum,
       extract(hour FROM ts) + extract(minute FROM ts) / 60.0    AS h,
       extract(isodow FROM ts) IN (6, 7)                         AS weekend,
       extract(epoch FROM (now() - ts)) / 86400.0                AS days_ago
FROM generate_series(date_trunc('hour', now()) - interval '35 days', now(), interval '15 minutes') ts;

CREATE TEMP TABLE wx AS
SELECT t.*,
       950 * power(greatest(0, sin(pi() * (h - 7) / 11)), 1.3)                 AS clear,
       0.30 + 0.70 * plant.hash01(dnum)                                         AS sky,     -- 1 = clear day
       greatest(0.5, least(22,
           7.2 + 3.4 * sin(2 * pi() * td / 3.1 + 0.7)
               + 2.2 * sin(2 * pi() * td / 1.37 + 2.0)
               + 1.1 * sin(2 * pi() * td / 0.53)
               + 0.9 * sin(2 * pi() * h / 24 - 2)
               + (random() - 0.5) * 1.4))                                       AS wind
FROM t;

INSERT INTO weather
SELECT ts,
       round(least(clear * 1.05, clear * sky * (0.82 + random() * (0.36 - 0.3 * sky)))::numeric, 1),
       round(wind::numeric, 2),
       round((11 + 6 * sin(2 * pi() * (h - 9) / 24) + 3 * sky + (random() - 0.5))::numeric, 1)
FROM wx;

-- ---------------------------------------------------------------------
-- Solar: 6 x 8 MWp blocks, 7.2 MW inverter limit
-- ---------------------------------------------------------------------
INSERT INTO asset_power
SELECT w.ts, a.asset_id,
       round(CASE WHEN a.asset_id = 'PV-04' AND t.days_ago BETWEEN 0.75 AND 1.25 THEN 0      -- inverter fault
                  ELSE least(7.2, 8 * w.ghi_wm2 / 1000 * 0.86
                                  * (1 - 0.004 * (w.temp_c + w.ghi_wm2 / 40 - 25))
                                  * CASE a.asset_id WHEN 'PV-06' THEN 0.93 ELSE 0.98 + 0.04 * plant.hash01(length(a.asset_id) + ascii(right(a.asset_id, 1))) END
                                  * (0.985 + random() * 0.03))
             END::numeric, 3)
FROM weather w
JOIN t USING (ts)
CROSS JOIN asset a
WHERE a.kind = 'pv_block';

-- ---------------------------------------------------------------------
-- Wind: 12 x 3 MW turbines (site wind speed varies a little per turbine)
-- ---------------------------------------------------------------------
INSERT INTO asset_power
SELECT w.ts, a.asset_id,
       round(CASE WHEN a.asset_id = 'WT-07' AND t.days_ago BETWEEN 1.6 AND 2.45 THEN 0          -- gearbox inspection
                  ELSE plant.turbine_mw(w.wind_ms * (0.975 + 0.05 * plant.hash01(ascii(right(a.asset_id, 1)) * 3.1 + ascii(substr(a.asset_id, 4, 1))))
                                        * (0.97 + random() * 0.06))
                       * CASE WHEN a.asset_id = 'WT-11' THEN 0.80 ELSE 1 END                     -- yaw misalignment
             END::numeric, 3)
FROM weather w
JOIN t USING (ts)
CROSS JOIN asset a
WHERE a.kind = 'wind_turbine';

-- ---------------------------------------------------------------------
-- Battery: price-driven plan (charge at night and at solar noon,
-- discharge into the evening peak), simulated step by step so the state
-- of charge respects the 8-95 % window (95 % one-way efficiency).
-- ---------------------------------------------------------------------
CREATE TEMP TABLE bess_plan AS
SELECT row_number() OVER (ORDER BY ts) AS rn, ts,
       CASE WHEN h >= 2  AND h < 5  THEN -8.0
            WHEN h >= 11 AND h < 14 THEN -12.0
            WHEN h >= 17 AND h < 21 THEN 15.0
            ELSE 0 END * (0.97 + random() * 0.06) AS plan_mw
FROM t;

CREATE TEMP TABLE bess AS
WITH RECURSIVE sim (rn, ts, mw, soc) AS (
    SELECT 0::bigint, NULL::timestamptz, 0::double precision, 45::double precision
  UNION ALL
    SELECT p.rn, p.ts, x.mw,
           s.soc + 100.0 / 80 * CASE WHEN x.mw < 0 THEN -x.mw * 0.25 * 0.95 ELSE -x.mw * 0.25 / 0.95 END
    FROM sim s
    JOIN bess_plan p ON p.rn = s.rn + 1
    CROSS JOIN LATERAL (
        SELECT CASE WHEN p.plan_mw < 0 THEN -least(-p.plan_mw, greatest(0, (95 - s.soc) / 100 * 80) / (0.25 * 0.95))
                    WHEN p.plan_mw > 0 THEN  least( p.plan_mw, greatest(0, (s.soc - 8) / 100 * 80) * 0.95 / 0.25)
                    ELSE 0 END AS mw
    ) x
)
SELECT ts, mw, soc FROM sim WHERE rn > 0;

INSERT INTO asset_power
SELECT ts, 'BESS', round(mw::numeric, 3) FROM bess;

INSERT INTO bess_state
SELECT ts, round(soc::numeric, 1) FROM bess;

-- ---------------------------------------------------------------------
-- Campus load and grid exchange at the point of connection
-- ---------------------------------------------------------------------
INSERT INTO site_meter
SELECT t.ts, round(l.load::numeric, 3),
       round(greatest(0, l.load - g.gen)::numeric, 3),
       round(greatest(0, g.gen - l.load)::numeric, 3)
FROM t
JOIN LATERAL (
    SELECT 15 + CASE WHEN t.weekend THEN 3 ELSE 13 END * exp(-power(t.h - 13, 2) / 18)
              + 2.0 * sin(2 * pi() * t.td / 2.3) + (random() - 0.5) * 1.5 AS load
) l ON true
JOIN LATERAL (
    SELECT sum(mw) AS gen FROM asset_power ap WHERE ap.ts = t.ts
) g ON true;

-- ---------------------------------------------------------------------
-- Market: hourly day-ahead price (duck curve, cheap when sunny & windy)
-- and grid carbon intensity
-- ---------------------------------------------------------------------
INSERT INTO market
SELECT ts,
       round((82 + 42 * exp(-power(h - 19, 2) / 4) + 18 * exp(-power(h - 8, 2) / 3)
              - 62 * (clear / 950) * sky
              - 3.0 * (wind - 7)
              + (random() - 0.5) * 10)::numeric, 2),
       round(greatest(60, least(450,
              265 + 60 * exp(-power(h - 19, 2) / 5) - 120 * (clear / 950) * sky - 7 * (wind - 7)
              + (random() - 0.5) * 12))::numeric, 1)
FROM wx
WHERE extract(minute FROM ts) = 0;

-- ---------------------------------------------------------------------
-- Downtime log
-- ---------------------------------------------------------------------
INSERT INTO downtime VALUES
  ('PV-04', now() - interval '30 hours',          now() - interval '18 hours',          'fault',       'Inverter IGBT fault — module replaced'),
  ('WT-07', now() - interval '2 days 11 hours',   now() - interval '1 day 14 hours',    'maintenance', 'Gearbox borescope inspection'),
  ('WT-03', now() - interval '19 days',           now() - interval '18 days 20 hours',  'fault',       'Pitch system fault — reset'),
  ('PV-02', now() - interval '26 days',           now() - interval '25 days 21 hours',  'maintenance', 'Tracker firmware update'),
  ('BESS',  now() - interval '12 days 3 hours',   now() - interval '12 days 1 hour',    'maintenance', 'HVAC filter change');

ANALYZE;
