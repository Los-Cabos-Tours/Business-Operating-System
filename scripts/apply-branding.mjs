// ============================================================
// Branding patch — applied to crm.html by GitHub Actions.
// Every replacement must match EXACTLY the expected number of
// times, or the script fails and writes nothing. No fuzzy edits.
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'crm.html';

// Login page rebrand: "Los Cabos Tours — Operations Platform" is now "BOS"
// (Los Cabos Tours is one of the companies managed by the BOS platform.)
const REPLACEMENTS = [
  {
    from: '<title>Aetherion — Los Cabos Tours Operations Platform</title>',
    to: '<title>BOS — Business Operating System</title>',
    expect: 1
  },
  {
    from: '<div class="login-subtitle">Los Cabos Tours — Operations Platform</div>',
    to: '<div class="login-subtitle">BOS</div>',
    expect: 1
  },
  {
    from: 'Authorized personnel only &bull; Los Cabos Tours &bull; All activity is logged',
    to: 'Authorized personnel only &bull; BOS &bull; All activity is logged',
    expect: 1
  }
];

let html = readFileSync(FILE, 'utf8');
const before = html.length;
const errors = [];

for (const r of REPLACEMENTS) {
  const parts = html.split(r.from);
  const count = parts.length - 1;
  if (count !== r.expect) {
    errors.push('Expected ' + r.expect + ' occurrence(s) of ' + JSON.stringify(r.from.slice(0, 70)) + '..., found ' + count);
  } else {
    html = parts.join(r.to);
  }
}

if (errors.length) {
  console.error('BRAND PATCH FAILED — no changes written:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}

writeFileSync(FILE, html);
console.log('Brand patch applied. ' + before + ' -> ' + html.length + ' bytes.');
