-- KPI · Battery
-- Hourly state of charge and throughput, last 7 days. The panel shows the
-- latest SoC on a ring, the current mode, and equivalent full cycles.
SELECT date_bin('1 hour', s.ts, timestamptz '2000-01-01')            AS "time",
       round(avg(s.soc_pct)::numeric, 1)                              AS soc_pct,
       round(avg(p.mw)::numeric, 2)                                   AS bess_mw,
       round((sum(greatest(p.mw, 0)) * 0.25)::numeric, 2)             AS discharged_mwh
FROM plant.bess_state s
JOIN plant.asset_power p ON p.ts = s.ts AND p.asset_id = 'BESS'
WHERE s.ts > $__timeTo()::timestamptz - interval '7 days'
  AND s.ts <= $__timeTo()::timestamptz
GROUP BY 1
ORDER BY 1;
