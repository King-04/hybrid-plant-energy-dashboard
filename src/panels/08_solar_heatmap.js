// Solar yield heatmap — 30 days x daylight hours. Cloudy days read as
// dark columns; a dark stripe in a bright column is a plant problem.
const A = frame('A');
const days = [...new Set(A.col('day'))].sort((a, b) => a - b);
const hours = [...new Set(A.num('hour'))].sort((a, b) => a - b);
const dIdx = new Map(days.map((d, i) => [d, i]));
const hIdx = new Map(hours.map((h, i) => [h, i]));
const cells = A.col('day').map((d, i) => [dIdx.get(d), hIdx.get(A.num('hour')[i]), A.num('pv_mwh')[i]]);
const daily = days.map((d) => cells.filter((c) => c[0] === dIdx.get(d)).reduce((s, c) => s + (c[2] || 0), 0));
const max = Math.max(1, ...cells.map((c) => c[2] || 0));
const full = daily.slice(0, -1);                                       // today is partial
const best = full.length ? full.indexOf(Math.max(...full)) : -1;
const worst = full.length ? full.indexOf(Math.min(...full)) : -1;
const dayLbl = (i, long) => new Date(days[i]).toLocaleDateString('en-GB', long ? { weekday: 'short', day: '2-digit', month: 'short' } : { day: '2-digit', month: 'short' }).toUpperCase();

const build = (w, h) => ({
  backgroundColor: 'transparent',
  animation: false,
  textStyle: { fontFamily: FONT },
  graphic: [
    ...card(w, h, { title: 'Solar yield · 30 days', caption: best >= 0 ? `best ${dayLbl(best)} ${fmt(daily[best], 0)} · worst ${dayLbl(worst)} ${fmt(daily[worst], 0)} MWh` : '', marker: T.solar }),
    ...(cells.length ? [] : [empty(w, h)]),
  ],
  tooltip: tooltip({
    formatter: (p) => tipHead(`${dayLbl(p.value[0], true)} · ${String(hours[p.value[1]]).padStart(2, '0')}:00`) +
      tipRow(T.solar, 'PV energy', `${fmt(p.value[2], 1)} MWh`) +
      tipRow('transparent', 'Day total', `${fmt(daily[p.value[0]], 0)} MWh`),
  }),
  grid: { left: 16, right: 16, top: 52, bottom: 40, containLabel: true },
  xAxis: {
    type: 'category', data: days.map((_, i) => i),
    axisTick: { show: false }, axisLine: { show: false },
    axisLabel: { ...axisLabel, interval: w < 700 ? 6 : 3, formatter: (v) => dayLbl(Number(v)) },
  },
  yAxis: {
    type: 'category', data: hours, inverse: true,
    axisTick: { show: false }, axisLine: { show: false },
    axisLabel: { ...axisLabel, interval: 1, formatter: (v) => `${String(v).padStart(2, '0')}h` },
  },
  visualMap: {
    min: 0, max, orient: 'horizontal', right: 16, bottom: 8, itemWidth: 9, itemHeight: Math.min(200, w * 0.3),
    text: [`${fmt(max, 0)} MWh`, '0'], textGap: 8, textStyle: { color: T.muted, fontSize: 10, fontFamily: MONO },
    inRange: { color: isDark ? ['#1D1A14', '#4A3410', '#9A6406', '#FFB020', '#FFE7A8'] : ['#F7F2E9', '#FCDFA3', '#F8B740', '#E08A00', '#8A4B00'] },
  },
  series: [{
    type: 'heatmap', data: cells,
    itemStyle: { borderColor: T.card, borderWidth: 1.5, borderRadius: 2 },
    emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 1 } },
  }],
});
return mount(build);
