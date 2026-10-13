-- Fleet health: one row per generating asset with energy, availability
-- (producing while the resource is there) and a performance index against
-- the median of its peers.
WITH win AS (
    SELECT p.asset_id, a.kind, a.capacity_mw,
           sum(p.mw) * 0.25 AS mwh,
           count(*) FILTER (WHERE (a.kind = 'pv_block' AND w.ghi_wm2 > 80)
                               OR (a.kind = 'wind_turbine' AND w.wind_ms BETWEEN 3.5 AND 25)) AS resource_n,
           count(*) FILTER (WHERE ((a.kind = 'pv_block' AND w.ghi_wm2 > 80)
                               OR (a.kind = 'wind_turbine' AND w.wind_ms BETWEEN 3.5 AND 25)) AND p.mw > 0.01) AS producing_n
    FROM plant.asset_power p
    JOIN plant.asset a USING (asset_id)
    JOIN plant.weather w USING (ts)
    WHERE a.kind IN ('pv_block', 'wind_turbine')
      AND $__timeFilter(p.ts)
    GROUP BY 1, 2, 3
),
peer AS (
    SELECT kind, percentile_cont(0.5) WITHIN GROUP (ORDER BY mwh) AS median_mwh
    FROM win GROUP BY kind
),
last_event AS (
    SELECT DISTINCT ON (asset_id) asset_id, kind AS event_kind, reason, start_ts, end_ts
    FROM plant.downtime
    WHERE start_ts <= $__timeTo()::timestamptz
    ORDER BY asset_id, start_ts DESC
)
SELECT w.asset_id,
       w.kind,
       w.capacity_mw,
       round(w.mwh::numeric, 1)                                         AS energy_mwh,
       round((100.0 * w.producing_n / nullif(w.resource_n, 0))::numeric, 1) AS availability_pct,
       round((100 * w.mwh / nullif(pr.median_mwh, 0))::numeric, 1)      AS performance_pct,
       CASE WHEN e.end_ts IS NULL AND e.start_ts IS NOT NULL            THEN 'down'
            WHEN 100.0 * w.producing_n / nullif(w.resource_n, 0) < 95  THEN 'availability'
            WHEN 100 * w.mwh / nullif(pr.median_mwh, 0) < 95           THEN 'underperforming'
            ELSE 'ok' END                                               AS status,
       CASE WHEN e.start_ts >= $__timeFrom()::timestamptz THEN e.reason END          AS last_event
FROM win w
JOIN peer pr USING (kind)
LEFT JOIN last_event e USING (asset_id)
ORDER BY w.kind, w.asset_id;
