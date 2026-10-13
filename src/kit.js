// ===================================================================
//  Kestrel Ridge · panel kit
//  Shared by every panel; build.mjs prepends it to each panel's code.
//  Look: warm "instrument" cards — flat surfaces, sharp 10 px corners,
//  a spectrum hairline (solar → wind → storage) on top, monospace
//  captions and Space Grotesk numerals.
// ===================================================================
const chart = context.panel.chart;
const dom = chart.getDom();
const isDark = context.grafana.theme.isDark;

if (!document.getElementById('kr-font')) {
  const l = document.createElement('link');
  l.id = 'kr-font';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
  document.head.appendChild(l);
}
const FONT = "'Space Grotesk', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

// ---- Tokens -------------------------------------------------------
const T = isDark
  ? {
      card: '#16140F', stroke: 'rgba(255,236,204,0.08)', ink: '#F3EEE6', muted: '#A39A8C', faint: '#6E665B',
      grid: 'rgba(255,236,204,0.07)', track: 'rgba(255,236,204,0.06)', tipBg: 'rgba(22,20,15,0.97)',
      solar: '#FFB020', wind: '#4CC3FF', battery: '#B58CFF', mains: '#9AA3AE', export: '#4ADE80',
      load: '#F3EEE6', price: '#FF6F59', bad: '#FF5D5D', warn: '#FFB020', good: '#4ADE80',
    }
  : {
      card: '#FFFFFF', stroke: '#EAE2D3', ink: '#1C1A17', muted: '#6F675C', faint: '#A69E91',
      grid: '#EFE9DE', track: '#F3EEE5', tipBg: 'rgba(255,255,255,0.98)',
      solar: '#E08A00', wind: '#0A84C6', battery: '#7C4DDB', mains: '#6B7280', export: '#15803D',
      load: '#1C1A17', price: '#E04F39', bad: '#DC2626', warn: '#D97706', good: '#15803D',
    };

// ---- Data ---------------------------------------------------------
const frame = (refId = 'A') => {
  const all = context.panel.data.series || [];
  const s = all.find((x) => x.refId === refId) || (refId === 'A' ? all[0] : null);
  const fields = s ? s.fields : [];
  const arr = (f) => (typeof f.values.get === 'function'
    ? Array.from({ length: f.values.length }, (_, i) => f.values.get(i))
    : Array.from(f.values));
  const cols = Object.fromEntries(fields.map((f) => [f.name, arr(f)]));
  return {
    rows: fields.length ? fields[0].values.length : 0,
    col: (n) => cols[n] || [],
    num: (n) => (cols[n] || []).map((v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))),
  };
};

// ---- Formatting ---------------------------------------------------
const fmt = (v, d = 0) => (v == null || !Number.isFinite(Number(v)) ? '—'
  : Number(v).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }));
const rgba = (hex, a) => {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};
const vgrad = (c, a0, a1) => ({ type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: rgba(c, a0) }, { offset: 1, color: rgba(c, a1) }] });
const spectrum = () => ({ type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: T.solar }, { offset: 0.5, color: T.wind }, { offset: 1, color: T.battery }] });
const when = (v) => new Date(v).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const axisTime = (v) => {
  const d = new Date(v);
  return d.getHours() === 0 && d.getMinutes() === 0
    ? `{d|${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}}`
    : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const _ctx = document.createElement('canvas').getContext('2d');
const textW = (s, size = 11, weight = 500, font = FONT) => { _ctx.font = `${weight} ${size}px ${font}`; return _ctx.measureText(String(s)).width; };

// ---- Card ---------------------------------------------------------
// title + coloured square marker; caption in mono caps on the right
const card = (w, h, { title, caption, marker = T.solar, hairline = true } = {}) => {
  const g = [
    { type: 'rect', silent: true, z: -20, shape: { x: 0.5, y: 0.5, width: w - 1, height: h - 1, r: 10 }, style: { fill: T.card, stroke: T.stroke, lineWidth: 1 } },
  ];
  if (hairline) g.push({ type: 'rect', silent: true, z: -19, shape: { x: 14, y: 0.5, width: w - 28, height: 2, r: 1 }, style: { fill: spectrum(), opacity: isDark ? 0.75 : 0.9 } });
  if (title) g.push(
    { type: 'rect', silent: true, shape: { x: 18, y: 22, width: 8, height: 8, r: 2 }, style: { fill: marker } },
    {
      type: 'text', silent: true,
      style: { x: 34, y: 26, text: title, fill: T.ink, fontSize: 15, fontWeight: 600, fontFamily: FONT, verticalAlign: 'middle', width: w - 60 - (caption ? textW(caption, 10, 500, MONO) + 20 : 0), overflow: 'truncate' },
    },
  );
  if (caption) g.push({
    type: 'text', silent: true,
    style: { x: w - 18, y: 26, text: caption.toUpperCase(), align: 'right', verticalAlign: 'middle', fill: T.muted, fontSize: 10, fontWeight: 500, fontFamily: MONO },
  });
  return g;
};

const tooltip = (extra = {}) => ({
  backgroundColor: T.tipBg,
  borderColor: T.stroke,
  borderWidth: 1,
  padding: [10, 12],
  textStyle: { color: T.ink, fontSize: 12, fontFamily: FONT },
  extraCssText: `border-radius:8px;box-shadow:0 10px 28px ${isDark ? 'rgba(0,0,0,.5)' : 'rgba(60,45,20,.14)'};`,
  ...extra,
});
const tipRow = (color, label, value) =>
  `<div style="display:flex;align-items:center;gap:8px;margin-top:5px">` +
  `<span style="width:8px;height:8px;border-radius:2px;background:${color}"></span>` +
  `<span style="color:${T.muted};flex:1">${label}</span><b style="margin-left:18px;font-variant-numeric:tabular-nums">${value}</b></div>`;
const tipHead = (text) => `<div style="color:${T.muted};font:500 10.5px ${MONO};text-transform:uppercase">${text}</div>`;

const axisLabel = { color: T.muted, fontSize: 10, fontFamily: MONO };
const splitLine = { lineStyle: { color: T.grid, type: [1, 3] } };
const legend = (extra = {}) => ({
  icon: 'rect', itemWidth: 10, itemHeight: 10, itemGap: 16,
  textStyle: { color: T.muted, fontSize: 11.5, fontFamily: FONT, rich: { v: { color: T.ink, fontWeight: 600, fontSize: 11.5, fontFamily: FONT } } },
  inactiveColor: T.faint,
  ...extra,
});
const empty = (w, h, msg = 'No data in range') => ({
  type: 'text', silent: true,
  style: { x: w / 2, y: h / 2 + 14, text: msg, align: 'center', verticalAlign: 'middle', fill: T.faint, fontSize: 13, fontFamily: FONT },
});

// ---- Mount: re-render on resize -----------------------------------
const mount = (build, merge = ['graphic', 'series', 'legend', 'xAxis', 'yAxis', 'grid', 'visualMap']) => {
  if (dom.__krObs) dom.__krObs.disconnect();
  dom.__krObs = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (!width || !height) return;
    requestAnimationFrame(() => chart.setOption(build(width, height), { replaceMerge: merge }));
  });
  dom.__krObs.observe(dom);
  return build(chart.getWidth(), chart.getHeight());
};
