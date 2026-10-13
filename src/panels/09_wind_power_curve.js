// Wind power curve — hourly (wind speed, power) per turbine against the
// manufacturer curve. A turbine sitting below the curve is losing energy
// without raising any alarm.
const A = frame('A');
const ids = A.col('asset_id'); const v = A.num('wind_ms'); const p = A.num('mw');
const ref = (x) => (x < 3 || x >= 25 ? 0 : x >= 12 ? 3 : (3 * (x ** 3 - 27)) / (1728 - 27));
// performance vs curve in the partial-load region, per turbine
const perf = {};
ids.forEach((id, i) => {
  if (v[i] == null || v[i] < 5 || v[i] > 11) return;
  perf[id] = perf[id] || { a: 0, r: 0 };
  perf[id].a += p[i] || 0; perf[id].r += ref(v[i]);
});
const ratio = Object.fromEntries(Object.entries(perf).map(([id, x]) => [id, x.r ? x.a / x.r : 1]));
const flagged = Object.entries(ratio).filter(([, r]) => r < 0.9).map(([id]) => id).sort();
const curve = Array.from({ length: 101 }, (_, i) => [i * 0.2, ref(i * 0.2)]);
const healthy = ids.map((id, i) => (flagged.includes(id) ? null : [v[i], p[i], id])).filter(Boolean);
const lagging = ids.map((id, i) => (flagged.includes(id) ? [v[i], p[i], id] : null)).filter(Boolean);
const lagName = flagged.length ? `${flagged.join(', ')} · ${fmt((1 - Math.min(...flagged.map((f) => ratio[f]))) * 100, 0)}% below curve` : '';

const build = (w, h) => ({
  backgroundColor: 'transparent',
  animation: false,
  textStyle: { fontFamily: FONT },
  graphic: [
    ...card(w, h, { title: 'Wind power curve', caption: `${new Set(ids).size} turbines · hourly`, marker: T.wind }),
    ...(ids.length ? [] : [empty(w, h)]),
  ],
  tooltip: tooltip({
    trigger: 'item',
    formatter: (q) => (q.seriesName === 'Reference curve'
      ? tipHead('Reference') + tipRow(T.muted, `${fmt(q.value[0], 1)} m/s`, `${fmt(q.value[1], 2)} MW`)
      : tipHead(q.value[2]) + tipRow(q.color, `${fmt(q.value[0], 1)} m/s`, `${fmt(q.value[1], 2)} MW`) +
        tipRow('transparent', 'Expected', `${fmt(ref(q.value[0]), 2)} MW`)),
  }),
  legend: legend({
    top: 46, left: 14,
    data: [{ name: 'Fleet', icon: 'circle' }, ...(flagged.length ? [{ name: lagName, icon: 'circle' }] : []), { name: 'Reference curve', icon: 'path://M0,4 L10,4 L10,6 L0,6 Z' }],
  }),
  grid: { left: 16, right: 30, top: 98, bottom: 12, containLabel: true },
  xAxis: { type: 'value', min: 0, max: 16, name: 'm/s', nameGap: 8, nameTextStyle: axisLabel, axisLabel, splitLine, axisLine: { lineStyle: { color: T.grid } } },
  yAxis: { type: 'value', min: 0, max: 3.3, interval: 0.5, name: 'MW', nameTextStyle: { ...axisLabel, align: 'right' }, axisLabel: { ...axisLabel, formatter: (x) => x.toFixed(1) }, splitLine },
  series: [
    { name: 'Fleet', type: 'scatter', data: healthy, symbolSize: 4, itemStyle: { color: rgba(T.wind, isDark ? 0.35 : 0.4) }, large: true },
    ...(flagged.length ? [{ name: lagName, type: 'scatter', data: lagging, symbolSize: 5, itemStyle: { color: T.warn, opacity: 0.85 }, z: 3 }] : []),
    { name: 'Reference curve', type: 'line', data: curve, showSymbol: false, lineStyle: { color: T.ink, width: 1.6, type: [5, 4] }, itemStyle: { color: T.ink }, z: 4, silent: true },
  ],
});
return mount(build);
