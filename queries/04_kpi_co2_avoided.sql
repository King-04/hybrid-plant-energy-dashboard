-- KPI · CO2 avoided
-- Renewable energy x grid carbon intensity of the same hour, per day,
-- last 30 days (tonnes).
WITH gen AS (
    SELECT date_trunc('hour', p.ts) AS hr, sum(p.mw) * 0.25 AS mwh
    FROM plant.asset_power p
    JOIN plant.asset a USING (asset_id)
    WHERE a.kind IN ('pv_block', 'wind_turbine')
      AND p.ts >  date_trunc('day', $__timeTo()::timestamptz) - interval '30 days'
      AND p.ts <= $__timeTo()::timestamptz
    GROUP BY 1
)
SELECT date_trunc('day', g.hr)                              AS "time",
       round((sum(g.mwh * m.grid_gco2_kwh) / 1000)::numeric, 1) AS co2_avoided_t,
       round(sum(g.mwh)::numeric, 1)                         AS renewable_mwh
FROM gen g
JOIN plant.market m ON m.ts = g.hr
GROUP BY 1
ORDER BY 1;
