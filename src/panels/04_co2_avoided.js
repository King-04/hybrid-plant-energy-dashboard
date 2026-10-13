// KPI · CO2 avoided — last 7 full days vs the 7 before, 30-day columns
const A = frame('A');
const t = A.col('time'); const co2 = A.num('co2_avoided_t'); const mwh = A.num('renewable_mwh');
const n = t.length;
const sum = (a, b, arr) => arr.slice(Math.max(0, a), b).reduce((s, v) => s + (v || 0), 0);
const cur = sum(n - 8, n - 1, co2);
const prev = sum(n - 15, n - 8, co2);
const delta = prev ? ((cur - prev) / prev) * 100 : null;
const intensity = sum(n - 8, n - 1, mwh) ? (1000 * cur) / sum(n - 8, n - 1, mwh) : null;

return mount((w, h) => {
  const { g, bottom } = figure(w, h, {
    title: 'CO₂ avoided', caption: '7 days', marker: T.export,
    value: cur, dec: 0, unit: 't CO₂',
    delta: delta == null ? null : { text: `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta), 0)}%`, good: delta >= 0 },
    sub: intensity ? `at ${fmt(intensity, 0)} g/kWh grid average` : '',
  });
  g.push(...columns(18, bottom, w - 36, h - bottom - 14, [{ values: co2.map((v, i) => (i === n - 1 ? 0 : v || 0)), color: T.export }], { gap: 2 }));
  return { backgroundColor: 'transparent', animation: false, graphic: g };
}, ['graphic']);
