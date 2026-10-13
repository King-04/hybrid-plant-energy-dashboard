-- Battery dispatch: hourly charge / discharge power, state of charge and
-- the day-ahead price the dispatch is chasing.
SELECT date_bin('1 hour', s.ts, timestamptz '2000-01-01') AS "time",
       round(avg(p.mw)::numeric, 2)                        AS battery_mw,
       round(avg(s.soc_pct)::numeric, 1)                   AS soc_pct,
       max(m.price_eur_mwh)                                AS price_eur_mwh
FROM plant.bess_state s
JOIN plant.asset_power p ON p.ts = s.ts AND p.asset_id = 'BESS'
LEFT JOIN plant.market m ON m.ts = date_trunc('hour', s.ts)
WHERE $__timeFilter(s.ts)
GROUP BY 1
ORDER BY 1;
