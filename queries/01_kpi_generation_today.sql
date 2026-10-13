-- KPI · Generation today
-- Hourly solar + wind energy for the 48 h up to the end of the range.
-- The panel sums "today so far" and compares it with yesterday at the same time.
SELECT date_bin('1 hour', p.ts, timestamptz '2000-01-01') AS "time",
       round((sum(p.mw) FILTER (WHERE a.kind = 'pv_block')     * 0.25)::numeric, 2) AS solar_mwh,
       round((sum(p.mw) FILTER (WHERE a.kind = 'wind_turbine') * 0.25)::numeric, 2) AS wind_mwh
FROM plant.asset_power p
JOIN plant.asset a USING (asset_id)
WHERE a.kind IN ('pv_block', 'wind_turbine')
  AND p.ts >= date_trunc('day', $__timeTo()::timestamptz) - interval '1 day'
  AND p.ts <= $__timeTo()::timestamptz
GROUP BY 1
ORDER BY 1;
