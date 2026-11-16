// Brand CSS part A (layout, panel, tabs, actions) — SLF navy/gold
'use strict';
SLFBoard.__cssA = '' +
  '.bwrap { display:grid; grid-template-columns:320px 1fr; gap:16px; align-items:start; }' +
  '@media (max-width:900px){ .bwrap { grid-template-columns:1fr; } }' +
  '.bleft { background:rgba(15,32,64,0.45); border:1px solid var(--line); border-radius:12px; padding:16px; position:sticky; top:12px; }' +
  '.bleft h4 { margin:0 0 8px; font-size:12px; color:var(--gold); letter-spacing:1px; text-transform:uppercase; font-family:Cinzel,serif; font-weight:600; }' +
  '.frow { display:flex; gap:8px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:12.5px; align-items:center; }' +
  '.frow .fnum { width:16px; color:var(--gold); font-weight:700; font-size:10.5px; flex:none; }' +
  '.frow .flab { flex:1; color:var(--muted); }' +
  '.frow a { color:var(--gold); text-decoration:none; cursor:pointer; }' +
  '.frow select { background:rgba(10,22,40,0.6); border:1px solid var(--line); border-radius:7px; color:var(--text); padding:4px 6px; font-size:11.5px; font-family:inherit; max-width:150px; }' +
  '.fbtn { background:rgba(201,168,76,0.15); color:var(--gold); border:1px solid rgba(201,168,76,0.45); border-radius:7px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; }' +
  '.btabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--line); margin-bottom:14px; gap:4px; }' +
  '.btab { background:none; color:var(--muted); border:none; border-bottom:2px solid transparent; padding:9px 13px; font-size:12.5px; cursor:pointer; font-family:inherit; }' +
  '.btab.active { color:var(--gold); font-weight:600; border-bottom-color:var(--gold); background:rgba(201,168,76,0.07); border-radius:6px 6px 0 0; }' +
  '.bright { background:rgba(15,32,64,0.45); border:1px solid var(--line); border-radius:12px; padding:16px; min-height:300px; }' +
  '.bbk { color:var(--muted); font-size:11.5px; text-decoration:none; }' +
  '.bbkname { font-family:Cinzel,serif; color:var(--gold); font-size:16px; letter-spacing:1px; }' +
  '.btagid { color:var(--muted); font-size:11px; border:1px solid var(--line); border-radius:12px; padding:2px 9px; }' +
  '.bact { padding:6px 13px; border-radius:9px; border:1px solid rgba(201,168,76,0.45); background:rgba(201,168,76,0.15); color:var(--gold); font-size:11.5px; font-weight:600; cursor:pointer; font-family:inherit; }' +
  '.bact.ghost { background:transparent; color:var(--muted); border:1px solid rgba(240,234,214,0.2); }' +
  '.bact.danger { background:rgba(212,88,26,0.1); color:#FF8A5C; border:1px solid rgba(212,88,26,0.5); }';
