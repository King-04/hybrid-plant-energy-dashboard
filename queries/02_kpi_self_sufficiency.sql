-- KPI · Self-sufficiency
-- Share of the campus load covered on site (solar, wind, battery) per day:
-- 1 - imported / consumed. Last 30 days.
SELECT date_trunc('day', ts)                                  AS "time",
       round((sum(load_mw) * 0.25)::numeric, 1)               AS load_mwh,
       round((sum(import_mw) * 0.25)::numeric, 1)             AS import_mwh,
       round((100 * (1 - sum(import_mw) / nullif(sum(load_mw), 0)))::numeric, 1) AS self_sufficiency_pct
FROM plant.site_meter
WHERE ts >  date_trunc('day', $__timeTo()::timestamptz) - interval '30 days'
  AND ts <= $__timeTo()::timestamptz
GROUP BY 1
ORDER BY 1;
