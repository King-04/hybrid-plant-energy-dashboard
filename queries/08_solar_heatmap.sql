-- Solar yield heatmap: PV energy per day x hour, last 30 days
SELECT date_trunc('day', p.ts)::date         AS day,
       extract(hour FROM p.ts)::int          AS hour,
       round((sum(p.mw) * 0.25)::numeric, 2) AS pv_mwh
FROM plant.asset_power p
JOIN plant.asset a USING (asset_id)
WHERE a.kind = 'pv_block'
  AND p.ts >  date_trunc('day', $__timeTo()::timestamptz) - interval '29 days'
  AND p.ts <= $__timeTo()::timestamptz
  AND extract(hour FROM p.ts) BETWEEN 6 AND 19
GROUP BY 1, 2
ORDER BY 1, 2;
