// ---- KPI building blocks: figure block + mini column chart ----------
// figure(): title, big number + unit, delta tag and a caption line
const figure = (w, h, o) => {
  const g = card(w, h, { title: o.title, caption: o.caption, marker: o.marker });
  const big = Math.max(26, Math.min(38, w / 8.5));
  const y = 52 + big / 2;
  const num = fmt(o.value, o.dec ?? 0);
  g.push({
    type: 'text', silent: true,
    style: {
      x: 18, y, verticalAlign: 'middle',
      text: `{n|${num}}${o.unit ? `{u| ${o.unit}}` : ''}`,
      rich: {
        n: { fill: o.value == null ? T.faint : T.ink, fontSize: big, fontWeight: 600, fontFamily: FONT },
        u: { fill: T.muted, fontSize: Math.round(big * 0.42), fontWeight: 500, fontFamily: FONT, padding: [Math.round(big * 0.3), 0, 0, 0] },
      },
    },
  });
  if (o.delta) {
    const c = o.delta.good == null ? T.muted : o.delta.good ? T.good : T.bad;
    g.push({ type: 'text', silent: true, style: { x: 18, y: y + big / 2 + 12, text: o.delta.text, fill: c, fontSize: 11, fontWeight: 600, fontFamily: MONO, verticalAlign: 'middle' } });
    if (o.sub) g.push({ type: 'text', silent: true, style: { x: 18 + textW(o.delta.text, 11, 600, MONO) + 10, y: y + big / 2 + 12, text: o.sub, fill: T.muted, fontSize: 11, fontFamily: FONT, verticalAlign: 'middle', width: w * 0.55, overflow: 'truncate' } });
  } else if (o.sub) {
    g.push({ type: 'text', silent: true, style: { x: 18, y: y + big / 2 + 12, text: o.sub, fill: T.muted, fontSize: 11, fontFamily: FONT, verticalAlign: 'middle', width: w * 0.6, overflow: 'truncate' } });
  }
  return { g, bottom: y + big / 2 + 24 };
};

// columns(): tiny stacked column chart; stacks = [{ values, color }], highlight last
const columns = (x, y, w, h, stacks, { gap = 2, fadeLast = false, ref } = {}) => {
  const n = stacks[0]?.values.length || 0;
  if (!n || h < 8) return [];
  const tot = Array.from({ length: n }, (_, i) => stacks.reduce((s, st) => s + Math.max(0, st.values[i] || 0), 0));
  const max = Math.max(...tot, ref || 0, 1e-9);
  const bw = Math.max(1, (w - gap * (n - 1)) / n);
  const out = [];
  for (let i = 0; i < n; i++) {
    let base = y + h;
    stacks.forEach((st) => {
      const v = Math.max(0, st.values[i] || 0);
      const bh = (v / max) * h;
      if (bh > 0.2) out.push({ type: 'rect', silent: true, shape: { x: x + i * (bw + gap), y: base - bh, width: bw, height: bh, r: [1.5, 1.5, 0, 0] }, style: { fill: st.color, opacity: fadeLast && i === n - 1 ? 0.45 : 1 } });
      base -= bh;
    });
    if (!tot[i]) out.push({ type: 'rect', silent: true, shape: { x: x + i * (bw + gap), y: y + h - 1, width: bw, height: 1 }, style: { fill: T.track } });
  }
  if (ref != null) out.push({ type: 'line', silent: true, shape: { x1: x, y1: y + h - (ref / max) * h, x2: x + w, y2: y + h - (ref / max) * h }, style: { stroke: T.faint, lineDash: [2, 3], lineWidth: 1 } });
  return out;
};
