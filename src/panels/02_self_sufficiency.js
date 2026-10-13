// KPI · Self-sufficiency — share of campus load met on site, last 7 full days
const A = frame('A');
const t = A.col('time'); const load = A.num('load_mwh'); const imp = A.num('import_mwh'); const pct = A.num('self_sufficiency_pct');
const n = t.length;
const share = (a, b) => {
  let l = 0, m = 0;
  for (let i = Math.max(0, a); i < b; i++) { l += load[i] || 0; m += imp[i] || 0; }
  return l ? 100 * (1 - m / l) : null;
};
const cur = share(n - 8, n - 1);             // today is partial: last 7 complete days
const prev = share(n - 15, n - 8);
const delta = cur != null && prev != null ? cur - prev : null;

return mount((w, h) => {
  const { g, bottom } = figure(w, h, {
    title: 'Self-sufficiency', caption: '7 days', marker: T.export,
    value: cur, dec: 1, unit: '%',
    delta: delta == null ? null : { text: `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta), 1)} pp`, good: delta >= 0 },
    sub: 'of campus load met on site',
  });
  // split bar: on-site vs imported
  const bw = w - 36, by = bottom + 2;
  const on = Math.max(0, Math.min(100, cur || 0));
  g.push(
    { type: 'rect', silent: true, shape: { x: 18, y: by, width: bw, height: 6, r: 3 }, style: { fill: rgba(T.faint, 0.35) } },
    { type: 'rect', silent: true, shape: { x: 18, y: by, width: (bw * on) / 100, height: 6, r: 3 }, style: { fill: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: T.solar }, { offset: 1, color: T.export }] } } },
  );
  // daily share, last 30 days
  g.push(...columns(18, by + 14, w - 36, h - by - 28, [{ values: pct.slice(0, n - 1).map((v) => v || 0), color: rgba(T.export, 0.7) }], { gap: 2, ref: 100 }));
  return { backgroundColor: 'transparent', animation: false, graphic: g };
}, ['graphic']);
