// Dashboard manifest: layout, panel sources and the queries each panel uses.
// `npm run build` turns this into grafana/dashboards/kestrel-ridge-plant.json
export default {
  uid: 'kestrel-ridge-plant',
  title: 'Kestrel Ridge Energy Park',
  subtitle: 'Hybrid plant monitor — 48 MWp solar · 36 MW wind · 20 MW / 80 MWh battery behind one grid connection (fictional)',
  datasource: { type: 'grafana-postgresql-datasource', uid: 'kestrel-pg' },
  time: { from: 'now-7d', to: 'now' },
  kit: ['src/kit.js'],
  // Only used by tools/render.mjs for the portfolio screenshots
  showcase: {
    width: 1600,
    font: "'Space Grotesk', system-ui, sans-serif",
    fonts: [
      { family: 'Space Grotesk', pkg: 'space-grotesk', weights: [400, 500, 600, 700] },
      { family: 'JetBrains Mono', pkg: 'jetbrains-mono', weights: [400, 500, 600] },
    ],
    chipRight: 'PostgreSQL 16 · Grafana 11 · ECharts',
    logoRadius: 10,
    chipRadius: 6,
    logo: '<svg width="24" height="24" viewBox="0 0 24 24"><defs><linearGradient id="k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB020"/><stop offset=".55" stop-color="#4CC3FF"/><stop offset="1" stop-color="#B58CFF"/></linearGradient></defs><path d="M13.5 2 5 13.2h5.6L9.8 22l9.2-12.4h-5.9z" fill="url(#k)"/></svg>',
    dark: {
      bg: '#0B0A08', ink: '#F3EEE6', muted: '#A39A8C', stroke: 'rgba(255,236,204,0.12)', accent: '#4ADE80', accentSoft: 'rgba(74,222,128,0.16)',
      logoBg: '#16140F', chipBg: '#16140F',
      bgImage: 'radial-gradient(1000px 420px at 100% 0%, rgba(255,176,32,0.08), transparent 60%), radial-gradient(800px 400px at 0% 100%, rgba(76,195,255,0.05), transparent 60%)',
    },
    light: {
      bg: '#F6F2EA', ink: '#1C1A17', muted: '#6F675C', stroke: '#E4DACA', accent: '#15803D', accentSoft: 'rgba(21,128,61,0.14)',
      logoBg: '#1C1A17', chipBg: '#FFFFFF',
    },
  },
  panels: [
    { id: 1,  src: '01_generation_today.js',  include: ['src/kpi.js'], gridPos: { x: 0,  y: 0,  w: 6,  h: 5 },  queries: { A: '01_kpi_generation_today' } },
    { id: 2,  src: '02_self_sufficiency.js',  include: ['src/kpi.js'], gridPos: { x: 6,  y: 0,  w: 6,  h: 5 },  queries: { A: '02_kpi_self_sufficiency' } },
    { id: 3,  src: '03_battery.js',           include: ['src/kpi.js'], gridPos: { x: 12, y: 0,  w: 6,  h: 5 },  queries: { A: '03_kpi_battery' } },
    { id: 4,  src: '04_co2_avoided.js',       include: ['src/kpi.js'], gridPos: { x: 18, y: 0,  w: 6,  h: 5 },  queries: { A: '04_kpi_co2_avoided' } },
    { id: 5,  src: '05_generation_mix.js',                            gridPos: { x: 0,  y: 5,  w: 16, h: 11 }, queries: { A: '05_generation_mix' } },
    { id: 6,  src: '06_energy_flow.js',                               gridPos: { x: 16, y: 5,  w: 8,  h: 11 }, queries: { A: '06_energy_flow' } },
    { id: 7,  src: '07_battery_dispatch.js',                          gridPos: { x: 0,  y: 16, w: 12, h: 9 },  queries: { A: '07_battery_dispatch' } },
    { id: 8,  src: '09_wind_power_curve.js',                          gridPos: { x: 12, y: 16, w: 12, h: 9 },  queries: { A: '09_wind_power_curve' } },
    { id: 9,  src: '08_solar_heatmap.js',                             gridPos: { x: 0,  y: 25, w: 14, h: 9 },  queries: { A: '08_solar_heatmap' } },
    { id: 10, src: '10_fleet_health.js',                              gridPos: { x: 14, y: 25, w: 10, h: 9 },  queries: { A: '10_fleet_health' } },
  ],
};
