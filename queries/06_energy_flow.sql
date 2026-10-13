-- Energy flow (Sankey) over the selected range, in MWh.
-- Each 15-minute interval is allocated in merit order:
--   renewables -> campus first, surplus -> battery charging, rest -> export;
--   battery discharge -> campus, rest -> export; grid covers what is left.
WITH i AS (
    SELECT p.ts,
           sum(p.mw) FILTER (WHERE a.kind = 'pv_block')               AS solar,
           sum(p.mw) FILTER (WHERE a.kind = 'wind_turbine')           AS wind,
           greatest(sum(p.mw) FILTER (WHERE a.kind = 'bess'), 0)      AS dis,
           greatest(-sum(p.mw) FILTER (WHERE a.kind = 'bess'), 0)     AS chg
    FROM plant.asset_power p
    JOIN plant.asset a USING (asset_id)
    WHERE $__timeFilter(p.ts)
    GROUP BY p.ts
),
f AS (
    SELECT i.*, s.load_mw,
           least(i.solar + i.wind, s.load_mw)                                   AS ren_load
    FROM i JOIN plant.site_meter s USING (ts)
),
g AS (
    SELECT f.*,
           least(dis, load_mw - ren_load)                                       AS dis_load,
           least(solar + wind - ren_load, chg)                                  AS ren_chg
    FROM f
),
alloc AS (
    SELECT g.*,
           greatest(load_mw - ren_load - dis_load, 0)                           AS grid_load,
           greatest(chg - ren_chg, 0)                                           AS grid_chg,
           greatest(solar + wind - ren_load - ren_chg, 0)                       AS ren_exp,
           greatest(dis - dis_load, 0)                                          AS dis_exp,
           solar / nullif(solar + wind, 0)                                      AS sf
    FROM g
),
flows(source, target, mw) AS (
    SELECT 'Solar', 'Campus',      ren_load * coalesce(sf, 0)     FROM alloc UNION ALL
    SELECT 'Wind',  'Campus',      ren_load * (1 - coalesce(sf, 0)) FROM alloc UNION ALL
    SELECT 'Solar', 'Battery in',  ren_chg * coalesce(sf, 0)      FROM alloc UNION ALL
    SELECT 'Wind',  'Battery in',  ren_chg * (1 - coalesce(sf, 0)) FROM alloc UNION ALL
    SELECT 'Solar', 'Grid export', ren_exp * coalesce(sf, 0)      FROM alloc UNION ALL
    SELECT 'Wind',  'Grid export', ren_exp * (1 - coalesce(sf, 0)) FROM alloc UNION ALL
    SELECT 'Battery out', 'Campus',      dis_load                 FROM alloc UNION ALL
    SELECT 'Battery out', 'Grid export', dis_exp                  FROM alloc UNION ALL
    SELECT 'Grid import', 'Campus',      grid_load                FROM alloc UNION ALL
    SELECT 'Grid import', 'Battery in',  grid_chg                 FROM alloc
)
SELECT source, target, round((sum(mw) * 0.25)::numeric, 1) AS mwh
FROM flows
GROUP BY source, target
HAVING sum(mw) * 0.25 >= 0.05
ORDER BY 3 DESC;
