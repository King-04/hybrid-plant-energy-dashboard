// Generation mix — stacked solar / wind / battery discharge against campus
// load (line) with battery charging below zero and the day-ahead price.
const A = frame('A');
const t = A.col('time');
const S = A.num('solar_mw'), Wd = A.num('wind_mw'), B = A.num('battery_mw'), L = A.num('load_mw');
const P = A.num('price_eur_mwh'), X = A.num('export_mw'), I = A.num('import_mw');
const hasData = t.length > 0;
const pair = (arr, f = (v) => v) => t.map((x, i) => [x, arr[i] == null ? null : f(arr[i])]);
const stepH = t.length > 1 ? (t[1] - t[0]) / 36e5 : 1;
const e = (arr, f = (v) => v) => arr.reduce((s, v) => s + Math.max(0, f(v || 0)), 0) * stepH;
const tot = { Solar: e(S), Wind: e(Wd), 'Battery out': e(B), 'Battery in': e(B, (v) => -v), Load: e(L) };
const exportShare = e(X) / (tot.Solar + tot.Wind || 1) * 100;
const negHours = P.filter((v) => v != null && v < 0).length;

const build = (w, h) => {
  const wide = w >= 880;
  return {
    backgroundColor: 'transparent',
    animation: false,
    textStyle: { fontFamily: FONT },
    graphic: [
      ...card(w, h, { title: 'Generation mix & load', caption: `${fmt(tot.Solar + tot.Wind, 0)} MWh renewable · ${fmt(exportShare, 0)}% exported`, marker: T.solar }),
      ...(hasData ? [] : [empty(w, h)]),
    ],
    tooltip: tooltip({
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: rgba(T.ink, 0.3), width: 1 } },
      formatter: (ps) => {
        const i = ps[0]?.dataIndex;
        if (i == null) return '';
        const net = (I[i] || 0) - (X[i] || 0);
        return tipHead(when(t[i])) +
          tipRow(T.solar, 'Solar', `${fmt(S[i], 1)} MW`) +
          tipRow(T.wind, 'Wind', `${fmt(Wd[i], 1)} MW`) +
          tipRow(T.battery, (B[i] || 0) >= 0 ? 'Battery discharging' : 'Battery charging', `${fmt(Math.abs(B[i] || 0), 1)} MW`) +
          tipRow(T.load, 'Campus load', `${fmt(L[i], 1)} MW`) +
          tipRow(net > 0 ? T.mains : T.export, net > 0 ? 'Grid import' : 'Grid export', `${fmt(Math.abs(net), 1)} MW`) +
          (P[i] != null ? tipRow(T.price, 'Day-ahead', `€${fmt(P[i], 0)}/MWh`) : '');
      },
    }),
    legend: legend({
      show: hasData, top: 46, left: 14,
      data: ['Solar', 'Wind', 'Battery out', 'Battery in', { name: 'Load', icon: 'path://M0,4 L10,4 L10,6 L0,6 Z' }, { name: 'Price', icon: 'path://M0,4 L3,4 L3,6 L0,6 Z M5,4 L8,4 L8,6 L5,6 Z' }],
      formatter: (n) => (!wide || n === 'Price' ? n : `${n}  {v|${fmt(tot[n], 0)}}`),
    }),
    grid: { left: 16, right: 16, top: 98, bottom: 12, containLabel: true },
    xAxis: {
      type: 'time', show: hasData, axisTick: { show: false }, axisLine: { lineStyle: { color: T.grid } }, splitLine: { show: false },
      axisLabel: { ...axisLabel, hideOverlap: true, formatter: axisTime, rich: { d: { color: T.ink, fontWeight: 600, fontSize: 10, fontFamily: MONO } } },
    },
    yAxis: [
      { type: 'value', show: hasData, name: 'MW', nameTextStyle: { ...axisLabel, align: 'right' }, axisLabel, splitLine },
      { type: 'value', show: hasData, name: '€/MWh', nameTextStyle: { ...axisLabel, color: T.price, align: 'left' }, axisLabel: { ...axisLabel, color: T.price }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Solar', type: 'line', stack: 'gen', data: pair(S), showSymbol: false, lineStyle: { width: 0 }, itemStyle: { color: T.solar }, areaStyle: { color: rgba(T.solar, isDark ? 0.85 : 0.8) }, z: 1 },
      { name: 'Wind', type: 'line', stack: 'gen', data: pair(Wd), showSymbol: false, lineStyle: { width: 0 }, itemStyle: { color: T.wind }, areaStyle: { color: rgba(T.wind, isDark ? 0.75 : 0.7) }, z: 1 },
      { name: 'Battery out', type: 'line', stack: 'gen', data: pair(B, (v) => Math.max(0, v)), showSymbol: false, lineStyle: { width: 0 }, itemStyle: { color: T.battery }, areaStyle: { color: rgba(T.battery, 0.8) }, z: 1 },
      { name: 'Battery in', type: 'line', stack: 'chg', data: pair(B, (v) => Math.min(0, v)), showSymbol: false, lineStyle: { width: 0 }, itemStyle: { color: T.battery }, itemStyle: { color: rgba(T.battery, 0.4) }, areaStyle: { color: rgba(T.battery, 0.35) }, z: 1 },
      { name: 'Load', type: 'line', data: pair(L), showSymbol: false, lineStyle: { width: 2, color: T.load }, itemStyle: { color: T.load }, z: 3 },
      { name: 'Price', type: 'line', yAxisIndex: 1, data: pair(P), showSymbol: false, step: 'end', lineStyle: { width: 1.4, color: T.price, type: [4, 3] }, itemStyle: { color: T.price }, z: 4 },
    ],
  };
};
return mount(build);
