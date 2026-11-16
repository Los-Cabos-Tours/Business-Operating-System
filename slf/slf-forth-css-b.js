// Brand CSS part B (fields, items, forms, buttons) — SLF navy/gold
'use strict';
SLFBoard.__cssB = '' +
  '.bfld { margin-bottom:10px; }' +
  '.bfld label { display:block; font-size:10.5px; color:var(--muted); margin-bottom:3px; letter-spacing:0.5px; }' +
  '.bfld input, .bfld textarea { width:100%; background:rgba(10,22,40,0.6); border:1px solid var(--line); border-radius:7px; color:var(--text); padding:7px 10px; font-size:12.5px; font-family:inherit; }' +
  '.bfld input:focus, .bfld textarea:focus { outline:1px solid var(--gold); }' +
  '.bcase { border:1px solid var(--line); border-radius:7px; padding:6px 9px; font-size:11.5px; margin-bottom:6px; display:flex; justify-content:space-between; gap:6px; }' +
  '.bcase .bprog { color:var(--gold); white-space:nowrap; font-weight:600; }' +
  '.bitem { display:flex; align-items:flex-start; gap:8px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12.5px; }' +
  '.bitem .bts { color:var(--muted); font-size:10.5px; white-space:nowrap; margin-top:2px; }' +
  '.bitem .bdel { margin-left:auto; background:none; border:none; color:#FF8A5C; cursor:pointer; font-size:13px; padding:0 3px; }' +
  '.bform { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin:10px 0 14px; }' +
  '.bform .bf { margin-bottom:0; }' +
  '.bform .bf label { display:block; font-size:10.5px; color:var(--muted); margin-bottom:3px; }' +
  '.bform .bf input, .bform .bf textarea, .bform .bf select { width:100%; background:rgba(10,22,40,0.6); border:1px solid var(--line); border-radius:7px; color:var(--text); padding:7px 10px; font-size:12px; font-family:inherit; }' +
  '.bform .full { grid-column:1 / -1; }' +
  '.badd { padding:7px 14px; border-radius:8px; border:1px solid rgba(201,168,76,0.45); background:rgba(201,168,76,0.15); color:var(--gold); font-size:11.5px; font-weight:600; cursor:pointer; font-family:inherit; grid-column:1 / -1; justify-self:start; margin-top:2px; }' +
  '.bnote { font-size:11px; color:var(--muted); margin:0 0 8px; }' +
  '.bsave { display:block; width:100%; margin-top:10px; padding:9px; border-radius:8px; border:1px solid rgba(201,168,76,0.5); background:rgba(201,168,76,0.2); color:var(--gold); font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; }' +
  '.bsave:hover { background:rgba(201,168,76,0.32); }' +
  '.bflash { color:var(--green); font-size:11px; margin-left:8px; display:none; }' +
  '.bempty { color:var(--muted); font-size:12.5px; padding:18px; text-align:center; }';
