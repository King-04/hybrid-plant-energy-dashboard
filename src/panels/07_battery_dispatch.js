// Battery dispatch — charge (below zero) / discharge bars, SoC band and the
// price signal behind the schedule. Shows the arbitrage at a glance.
const A = frame('A');
const t = A.col('time'); const mw = A.num('battery_mw'); const soc = A.num('soc_pct'); const price = A.num('price_eur_mwh');
const hasData = t.length > 0;
// average price paid when charging vs earned when discharging
let cE = 0, cC = 0, dE = 0, dC = 0;
t.forEach((_, i) => {
  const p = price[i]; const m = mw[i] || 0;
  if (p == null) return;
  if (m < -0.3) { cE += -m; cC += -m * p; } else if (m > 0.3) { dE += m; dC += m * p; }
});
const buy = cE ? cC / cE : null, sell = dE ? dC / dE : null;
const spread = buy != null && sell != null ? sell - buy : null;

const build = (w, h) => ({
  backgroundColor: 'transparent',
  animation: false,
  textStyle: { fontFamily: FONT },
  graphic: [
    ...card(w, h, { title: 'Battery dispatch', caption: spread != null ? `buy €${fmt(buy, 0)} · sell €${fmt(sell, 0)} · spread €${fmt(spread, 0)}` : '', marker: T.battery }),
    ...(hasData ? [] : [empty(w, h)]),
  ],
  tooltip: tooltip({
    trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: rgba(T.ink, 0.05) } },
    formatter: (ps) => {
      const i = ps[0]?.dataIndex; if (i == null) return '';
      const m = mw[i] || 0;
      return tipHead(when(t[i])) +
        tipRow(m >= 0 ? T.battery : T.export, m > 0.3 ? 'Discharging' : m < -0.3 ? 'Charging' : 'Idle', `${fmt(Math.abs(m), 1)} MW`) +
        tipRow(T.wind, 'State of charge', `${fmt(soc[i], 0)} %`) +
        (price[i] != null ? tipRow(T.price, 'Day-ahead', `€${fmt(price[i], 0)}/MWh`) : '');
    },
  }),
  legend: legend({ show: hasData, top: 46, left: 14, data: ['Discharge', 'Charge', { name: 'State of charge', icon: 'path://M0,4 L10,4 L10,6 L0,6 Z' }] }),
  grid: { left: 16, right: 16, top: 98, bottom: 12, containLabel: true },
  xAxis: {
    type: 'time', show: hasData, axisTick: { show: false }, axisLine: { lineStyle: { color: T.grid } }, splitLine: { show: false },
    axisLabel: { ...axisLabel, hideOverlap: true, formatter: axisTime, rich: { d: { color: T.ink, fontWeight: 600, fontSize: 10, fontFamily: MONO } } },
  },
  yAxis: [
    { type: 'value', show: hasData, name: 'MW', nameTextStyle: { ...axisLabel, align: 'right' }, axisLabel, splitLine },
    { type: 'value', show: hasData, min: 0, max: 100, interval: 25, axisLabel: { ...axisLabel, color: T.wind, formatter: '{value}%' }, splitLine: { show: false } },
  ],
  series: [
    { name: 'Discharge', type: 'bar', stack: 'b', data: t.map((x, i) => [x, Math.max(0, mw[i] || 0)]), itemStyle: { color: T.battery, borderRadius: [2, 2, 0, 0] }, barMaxWidth: 8 },
    { name: 'Charge', type: 'bar', stack: 'b', data: t.map((x, i) => [x, Math.min(0, mw[i] || 0)]), itemStyle: { color: T.export, borderRadius: [0, 0, 2, 2] }, barMaxWidth: 8 },
    {
      name: 'State of charge', type: 'line', yAxisIndex: 1, data: t.map((x, i) => [x, soc[i]]), showSymbol: false, smooth: 0.3,
      lineStyle: { width: 1.8, color: T.wind }, itemStyle: { color: T.wind }, areaStyle: { color: vgrad(T.wind, isDark ? 0.16 : 0.12, 0) }, z: 3,
    },
  ],
});
return mount(build);
