-- Wind power curve: hourly mean wind speed vs each turbine's output.
-- Hours inside a logged downtime are excluded, so what remains below the
-- reference curve is genuine under-performance.
SELECT a.asset_id,
       date_bin('1 hour', p.ts, timestamptz '2000-01-01') AS "time",
       round(avg(w.wind_ms)::numeric, 2)                   AS wind_ms,
       round(avg(p.mw)::numeric, 3)                        AS mw
FROM plant.asset_power p
JOIN plant.asset a USING (asset_id)
JOIN plant.weather w USING (ts)
WHERE a.kind = 'wind_turbine'
  AND $__timeFilter(p.ts)
  AND NOT EXISTS (
        SELECT 1 FROM plant.downtime d
        WHERE d.asset_id = p.asset_id
          AND p.ts >= d.start_ts AND p.ts < coalesce(d.end_ts, 'infinity'))
GROUP BY 1, 2
ORDER BY 1, 2;
