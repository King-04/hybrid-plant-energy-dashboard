// KPI · Generation today — solar + wind so far vs yesterday at the same time
const A = frame('A');
const t = A.col('time'); const sol = A.num('solar_mwh'); const win = A.num('wind_mwh');
const last = t[t.length - 1];
const today0 = last ? Math.floor(last / 864e5) * 864e5 : 0;   // UTC midnight, same day boundary as the query
let today = 0, yday = 0, ts = 0, tw = 0;
t.forEach((x, i) => {
  const v = (sol[i] || 0) + (win[i] || 0);
  if (x >= today0) { today += v; ts += sol[i] || 0; tw += win[i] || 0; }
  else if (x <= last - 864e5) yday += v;          // yesterday up to the same hour
});
const delta = yday ? ((today - yday) / yday) * 100 : null;
const idx = t.map((x, i) => i).filter((i) => t[i] >= today0);
const hours = Array.from({ length: 24 }, (_, hr) => idx.find((i) => new Date(t[i]).getUTCHours() === hr));

return mount((w, h) => {
  const { g, bottom } = figure(w, h, {
    title: 'Generation today', caption: last ? `to ${new Date(last).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : '', marker: T.solar,
    value: today, dec: 1, unit: 'MWh',
    delta: delta == null ? null : { text: `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta), 0)}%`, good: delta >= 0 },
    sub: `vs yesterday · ☀ ${fmt(ts, 0)} / ≋ ${fmt(tw, 0)}`,
  });
  g.push(...columns(18, bottom, w - 36, h - bottom - 14, [
    { values: hours.map((i) => (i == null ? 0 : sol[i])), color: T.solar },
    { values: hours.map((i) => (i == null ? 0 : win[i])), color: T.wind },
  ], { gap: 3, fadeLast: true }));
  return { backgroundColor: 'transparent', animation: false, graphic: g };
}, ['graphic']);
