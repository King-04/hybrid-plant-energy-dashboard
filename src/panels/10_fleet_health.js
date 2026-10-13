// Fleet health — one tile per generating unit. Colour = status,
// big number = performance vs peers, bar = availability.
const A = frame('A');
const U = A.col('asset_id').map((id, i) => ({
  id, kind: A.col('kind')[i], mwh: A.num('energy_mwh')[i], av: A.num('availability_pct')[i],
  perf: A.num('performance_pct')[i], status: A.col('status')[i] || 'ok', event: A.col('last_event')[i],
}));
const ST = {
  ok: { label: 'Healthy', color: T.good },
  underperforming: { label: 'Under-performing', color: T.warn },
  availability: { label: 'Lost availability', color: T.bad },
  down: { label: 'Down', color: T.bad },
};
const groups = [['pv_block', 'Solar blocks', T.solar], ['wind_turbine', 'Wind turbines', T.wind]];
const issues = U.filter((u) => u.status !== 'ok');

const build = (w, h) => {
  const g = card(w, h, { title: 'Fleet health', caption: `${U.length - issues.length}/${U.length} healthy`, marker: T.good });
  if (!U.length) return { backgroundColor: 'transparent', graphic: [...g, empty(w, h)] };
  // status legend
  let lx = 18;
  ['ok', 'underperforming', 'availability'].forEach((k) => {
    g.push(
      { type: 'rect', silent: true, shape: { x: lx, y: 46, width: 8, height: 8, r: 2 }, style: { fill: ST[k].color } },
      { type: 'text', silent: true, style: { x: lx + 13, y: 50, text: ST[k].label, fill: T.muted, fontSize: 11, fontFamily: FONT, verticalAlign: 'middle' } },
    );
    lx += textW(ST[k].label, 11) + 32;
  });
  const cols = 6;
  const gap = 6;
  const tileW = (w - 36 - gap * (cols - 1)) / cols;
  const notes = issues.filter((u) => u.event || u.status === 'underperforming');
  const footer = notes.length ? 20 : 0;
  const rowsTotal = groups.reduce((s, [k]) => s + Math.ceil(U.filter((u) => u.kind === k).length / cols), 0);
  const avail = h - 66 - groups.length * 18 - footer - 10;
  const tileH = Math.max(34, Math.min(58, (avail - gap * (rowsTotal - 1)) / rowsTotal));
  let y = 66;
  groups.forEach(([kind, label, c]) => {
    const list = U.filter((u) => u.kind === kind);
    g.push({ type: 'text', silent: true, style: { x: 18, y: y + 6, text: label.toUpperCase(), fill: c, fontSize: 10, fontWeight: 600, fontFamily: MONO, verticalAlign: 'middle' } });
    y += 16;
    list.forEach((u, i) => {
      const x = 18 + (i % cols) * (tileW + gap);
      const ty = y + Math.floor(i / cols) * (tileH + gap);
      const st = ST[u.status] || ST.ok;
      const bad = u.status !== 'ok';
      g.push(
        { type: 'rect', silent: true, shape: { x, y: ty, width: tileW, height: tileH, r: 6 }, style: { fill: bad ? rgba(st.color, isDark ? 0.14 : 0.09) : T.track, stroke: bad ? rgba(st.color, 0.55) : 'transparent', lineWidth: 1 } },
        { type: 'text', silent: true, style: { x: x + 8, y: ty + 12, text: u.id, fill: T.muted, fontSize: 10, fontWeight: 500, fontFamily: MONO, verticalAlign: 'middle' } },
        { type: 'circle', silent: true, shape: { cx: x + tileW - 9, cy: ty + 12, r: 3 }, style: { fill: st.color } },
        {
          type: 'text', silent: true,
          style: { x: x + 8, y: ty + tileH - 15, text: `${fmt(u.perf, 0)}%`, fill: bad ? st.color : T.ink, fontSize: tileH > 44 ? 17 : 13, fontWeight: 600, fontFamily: FONT, verticalAlign: 'middle' },
        },
        // availability bar along the bottom of the tile
        { type: 'rect', silent: true, shape: { x: x + 8, y: ty + tileH - 5, width: tileW - 16, height: 2, r: 1 }, style: { fill: rgba(T.faint, 0.3) } },
        { type: 'rect', silent: true, shape: { x: x + 8, y: ty + tileH - 5, width: ((tileW - 16) * Math.min(100, u.av || 0)) / 100, height: 2, r: 1 }, style: { fill: (u.av ?? 100) < 95 ? T.bad : rgba(T.good, 0.8) } },
      );
      if (tileW > 92) g.push({ type: 'text', silent: true, style: { x: x + tileW - 8, y: ty + tileH - 15, text: `${fmt(u.mwh, 0)} MWh`, align: 'right', fill: T.faint, fontSize: 9.5, fontFamily: MONO, verticalAlign: 'middle' } });
    });
    y += Math.ceil(list.length / cols) * (tileH + gap) + 4;
  });
  if (notes.length) g.push({
    type: 'text', silent: true,
    style: {
      x: 18, y: h - 16, verticalAlign: 'middle', width: w - 36, overflow: 'truncate', fill: T.muted, fontSize: 10.5, fontFamily: FONT,
      text: notes.map((u) => `${u.id}: ${u.event || 'below peers — check yaw / soiling'}`).join('   ·   '),
    },
  });
  return { backgroundColor: 'transparent', animation: false, graphic: g };
};
return mount(build, ['graphic']);
