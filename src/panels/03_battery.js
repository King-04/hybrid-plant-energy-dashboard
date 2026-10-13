// KPI · Battery — state of charge ring, current mode, equivalent cycles (7 d)
const A = frame('A');
const t = A.col('time'); const soc = A.num('soc_pct'); const mw = A.num('bess_mw'); const dis = A.num('discharged_mwh');
const n = t.length;
const nowSoc = soc[n - 1];
const nowMw = mw[n - 1] ?? 0;
const mode = nowMw > 0.3 ? `Discharging ${fmt(nowMw, 1)} MW` : nowMw < -0.3 ? `Charging ${fmt(-nowMw, 1)} MW` : 'Idle';
const cycles = dis.reduce((s, v) => s + (v || 0), 0) / 80;
const modeColor = nowMw > 0.3 ? T.battery : nowMw < -0.3 ? T.export : T.muted;

return mount((w, h) => {
  const { g } = figure(w, h, {
    title: 'Battery', caption: '20 MW · 80 MWh', marker: T.battery,
    value: nowSoc, dec: 0, unit: '% SoC',
    sub: `${fmt(cycles, 1)} cycles in 7 days`,
  });
  g.push({ type: 'text', silent: true, style: { x: 18, y: h - 26, text: `● ${mode}`, fill: modeColor, fontSize: 12, fontWeight: 600, fontFamily: FONT, verticalAlign: 'middle' } });
  // ring gauge on the right
  const r = Math.min(h * 0.27, w * 0.16);
  const cx = w - 18 - r - 4, cy = h / 2 + 14;
  const frac = Math.max(0, Math.min(1, (nowSoc ?? 0) / 100));
  const start = -Math.PI / 2;
  g.push(
    { type: 'arc', silent: true, shape: { cx, cy, r, startAngle: 0, endAngle: Math.PI * 2 }, style: { stroke: T.track, lineWidth: 9, fill: 'none' } },
    { type: 'arc', silent: true, shape: { cx, cy, r, startAngle: start, endAngle: start + frac * Math.PI * 2 }, style: { stroke: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: T.wind }, { offset: 1, color: T.battery }] }, lineWidth: 9, lineCap: 'round', fill: 'none' } },
    { type: 'text', silent: true, style: { x: cx, y: cy - 3, text: nowMw > 0.3 ? '▼' : nowMw < -0.3 ? '▲' : '■', align: 'center', verticalAlign: 'middle', fill: modeColor, fontSize: 13, fontFamily: FONT } },
    { type: 'text', silent: true, style: { x: cx, y: cy + 13, text: `${fmt((80 * (nowSoc ?? 0)) / 100, 0)} MWh`, align: 'center', verticalAlign: 'middle', fill: T.muted, fontSize: 9.5, fontFamily: MONO } },
  );
  // 24 h SoC trace under the figure
  const pts = soc.slice(-24);
  if (pts.length > 1) {
    const x0 = 18, x1 = cx - r - 22, y0 = h - 62, y1 = h - 42;
    const line = pts.map((v, i) => [x0 + ((x1 - x0) * i) / (pts.length - 1), y1 - ((v || 0) / 100) * (y1 - y0)]);
    g.push({ type: 'polyline', silent: true, shape: { points: line, smooth: 0.2 }, style: { stroke: T.battery, lineWidth: 1.6, fill: 'none', opacity: 0.9 } });
  }
  return { backgroundColor: 'transparent', animation: false, graphic: g };
}, ['graphic']);
