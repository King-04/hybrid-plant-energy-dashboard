// Energy flow — where every MWh came from and went to over the range
const A = frame('A');
const links = A.col('source').map((s, i) => ({ source: s, target: A.col('target')[i], value: A.num('mwh')[i] || 0 })).filter((l) => l.value > 0);
const C = { Solar: T.solar, Wind: T.wind, 'Grid import': T.mains, 'Battery out': T.battery, Campus: T.load, 'Battery in': T.battery, 'Grid export': T.export };
const names = [...new Set(links.flatMap((l) => [l.source, l.target]))];
const total = (n, side) => links.filter((l) => l[side] === n).reduce((s, l) => s + l.value, 0);
const campus = total('Campus', 'target');
const onsite = links.filter((l) => l.target === 'Campus' && l.source !== 'Grid import').reduce((s, l) => s + l.value, 0);
const LEFT = ['Solar', 'Wind', 'Battery out', 'Grid import'];

const build = (w, h) => ({
  backgroundColor: 'transparent',
  animation: false,
  textStyle: { fontFamily: FONT },
  graphic: [
    ...card(w, h, { title: 'Energy flow', caption: campus ? `${fmt((100 * onsite) / campus, 0)}% of load on site` : '', marker: T.wind }),
    ...(links.length ? [] : [empty(w, h)]),
  ],
  tooltip: tooltip({
    trigger: 'item',
    formatter: (p) => (p.dataType === 'edge'
      ? tipHead(`${p.data.source} → ${p.data.target}`) + tipRow(C[p.data.source], 'Energy', `${fmt(p.data.value, 0)} MWh`)
      : tipHead(p.name) + tipRow(C[p.name], LEFT.includes(p.name) ? 'Supplied' : 'Received', `${fmt(p.value, 0)} MWh`)),
  }),
  series: [{
    type: 'sankey',
    left: 18, right: w < 420 ? 74 : 96, top: 58, bottom: 18,
    nodeWidth: 10, nodeGap: 14, nodeAlign: 'justify', layoutIterations: 64,
    draggable: false,
    data: names.map((n) => ({
      name: n, depth: LEFT.includes(n) ? 0 : 1,
      itemStyle: { color: C[n] || T.muted, borderWidth: 0 },
      label: {
        position: LEFT.includes(n) ? 'right' : 'right',
        formatter: () => `{n|${n}}\n{v|${fmt(LEFT.includes(n) ? total(n, 'source') : total(n, 'target'), 0)} MWh}`,
        rich: {
          n: { color: T.ink, fontSize: 11.5, fontWeight: 600, fontFamily: FONT, lineHeight: 15 },
          v: { color: T.muted, fontSize: 10, fontFamily: MONO, lineHeight: 13 },
        },
      },
    })),
    links: links.map((l) => ({ ...l, lineStyle: { color: 'gradient', opacity: isDark ? 0.32 : 0.28, curveness: 0.5 } })),
    emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.6 } },
  }],
});
return mount(build);
