// Forth theme CSS part A (layout, panel, tabs, actions)
'use strict';
SLFBoard.__cssA = '' +
  '.bwrap { display:grid; grid-template-columns:320px 1fr; gap:14px; align-items:start; }' +
  '@media (max-width:900px){ .bwrap { grid-template-columns:1fr; } }' +
  '.bleft { background:#eef0f3; border:1px solid #d8dcde; border-radius:4px; padding:14px; position:sticky; top:12px; color:#2F3941; }' +
  '.bleft h4 { margin:0 0 8px; font-size:12px; color:#8F0094; letter-spacing:0.5px; text-transform:uppercase; font-weight:700; }' +
  '.frow { display:flex; gap:8px; padding:7px 0; border-bottom:1px solid #e4e6ea; font-size:12px; align-items:center; }' +
  '.frow .fnum { width:16px; color:#8F0094; font-weight:700; font-size:10.5px; flex:none; }' +
  '.frow .flab { flex:1; color:#68737d; }' +
  '.frow a { color:#1385E1; text-decoration:none; cursor:pointer; }' +
  '.frow select { background:#fff; border:1px solid #d8dcde; border-radius:3px; color:#2F3941; padding:4px 6px; font-size:11.5px; font-family:inherit; max-width:150px; }' +
  '.fbtn { background:#8F0094; color:#fff; border:none; border-radius:3px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; }' +
  '.fbtn.ghost { background:#fff; color:#8F0094; border:1px solid #8F0094; }' +
  '.btabs { display:flex; flex-wrap:wrap; border-bottom:1px solid #d8dcde; margin-bottom:14px; gap:2px; }' +
  '.btab { background:#e8eaee; color:#555; border:1px solid #d8dcde; border-bottom:none; border-radius:4px 4px 0 0; padding:8px 13px; font-size:12px; cursor:pointer; font-family:inherit; }' +
  '.btab.active { background:#fff; color:#8F0094; font-weight:600; border-top:3px solid #8F0094; }' +
  '.bright { background:#fff; border:1px solid #d8dcde; border-radius:4px; padding:16px; min-height:300px; color:#2F3941; }' +
  '.bbk { color:#68737d; font-size:11.5px; text-decoration:none; }' +
  '.bbk:hover { color:#1385E1; }' +
  '.bbkname { color:#2F3941; font-size:17px; font-weight:700; }' +
  '.btagid { color:#68737d; font-size:11px; border:1px solid #d8dcde; border-radius:3px; padding:2px 8px; background:#fff; }' +
  '.bact { padding:6px 13px; border-radius:3px; border:1px solid #8F0094; background:#8F0094; color:#fff; font-size:11.5px; font-weight:600; cursor:pointer; font-family:inherit; }' +
  '.bact.ghost { background:#fff; color:#8F0094; border:1px solid #d8dcde; }' +
  '.bact.danger { background:#fff; color:#D93F4C; border:1px solid #D93F4C; }';
