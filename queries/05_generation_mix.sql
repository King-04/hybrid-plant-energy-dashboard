-- Generation mix vs campus load, with the day-ahead price.
-- Battery is signed: discharge stacks on top of generation, charging is
-- drawn below zero.
WITH b AS (
    SELECT CASE WHEN $__timeTo()::timestamptz - $__timeFrom()::timestamptz <= interval '3 days'
                THEN interval '15 minutes' ELSE interval '1 hour' END AS step
),
gen AS (
    SELECT date_bin(b.step, x.ts, timestamptz '2000-01-01') AS t,
           avg(x.solar) AS solar, avg(x.wind) AS wind, avg(x.bess) AS bess
    FROM (
        SELECT p.ts,
               sum(p.mw) FILTER (WHERE a.kind = 'pv_block')     AS solar,
               sum(p.mw) FILTER (WHERE a.kind = 'wind_turbine') AS wind,
               sum(p.mw) FILTER (WHERE a.kind = 'bess')         AS bess
        FROM plant.asset_power p
        JOIN plant.asset a USING (asset_id)
        WHERE $__timeFilter(p.ts)
        GROUP BY p.ts
    ) x, b
    GROUP BY 1
),
site AS (
    SELECT date_bin(b.step, ts, timestamptz '2000-01-01') AS t,
           avg(load_mw) AS load_mw, avg(import_mw) AS import_mw, avg(export_mw) AS export_mw
    FROM plant.site_meter, b
    WHERE $__timeFilter(ts)
    GROUP BY 1
)
SELECT g.t                                     AS "time",
       round(g.solar::numeric, 2)              AS solar_mw,
       round(g.wind::numeric, 2)               AS wind_mw,
       round(g.bess::numeric, 2)               AS battery_mw,
       round(s.load_mw::numeric, 2)            AS load_mw,
       round(s.import_mw::numeric, 2)          AS import_mw,
       round(s.export_mw::numeric, 2)          AS export_mw,
       m.price_eur_mwh                         AS price_eur_mwh
FROM gen g
JOIN site s USING (t)
LEFT JOIN plant.market m ON m.ts = date_trunc('hour', g.t)
ORDER BY 1;
