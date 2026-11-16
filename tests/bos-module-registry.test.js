'use strict';
/* Registry tests - Node built-in runner: node --test tests/*.test.js
   Synthetic data only. Does NOT load crm.html. */

const test = require('node:test');
const assert = require('node:assert');

global.window = global;

const storageCalls = [];
global.localStorage = {
  getItem: (k) => { storageCalls.push(['get', k]); return null; },
  setItem: (k) => { storageCalls.push(['set', k]); },
  removeItem: (k) => { storageCalls.push(['del', k]); }
};

require('../js/bos-module-registry.js');
const BOS = global.window.BOSModules;

function makeContainer(opts) {
  const o = opts || {};
  return {
    children: [],
    failRemove: !!o.failRemove,
    get firstChild() { return this.children[0] || null; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) {
      if (this.failRemove) throw new Error('removeChild refused');
      const i = this.children.indexOf(c);
      if (i > -1) this.children.splice(i, 1);
      return c;
    }
  };
}

let idCounter = 0;
function validModule(overrides) {
  idCounter += 1;
  const id = 'mod-t' + idCounter;
  return Object.assign({
    id: id,
    name: 'Test Module ' + idCounter,
    navLabel: 'Test ' + idCounter,
    version: '1.0.0',
    permissions: ['p1'],
    render: function (container) { container.appendChild({ marker: true }); }
  }, overrides || {});
}

test('1. valid module registration', () => {
  const m = validModule();
  assert.strictEqual(BOS.register(m), true);
  assert.strictEqual(BOS.get(m.id).id, m.id);
});

test('2. invalid module definition rejected', () => {
  assert.throws(() => BOS.register(null), TypeError);
  assert.throws(() => BOS.register(validModule({ id: 'Bad_ID' })), TypeError);
  assert.throws(() => BOS.register(validModule({ id: '' })), TypeError);
  assert.throws(() => BOS.register(validModule({ name: '   ' })), TypeError);
  assert.throws(() => BOS.register(validModule({ render: 'nope' })), TypeError);
  assert.throws(() => BOS.register(validModule({ onMount: 42 })), TypeError);
});

test('3. duplicate module ID rejected', () => {
  const m = validModule();
  BOS.register(m);
  assert.throws(() => BOS.register(validModule({ id: m.id })), /already registered/);
});

test('4. get() returns registered module; null for unknown', () => {
  const m = validModule();
  BOS.register(m);
  assert.ok(BOS.get(m.id));
  assert.strictEqual(BOS.get('no-such-module-xyz'), null);
});

test('5. list() returns metadata', () => {
  const m = validModule();
  BOS.register(m);
  const entry = BOS.list().find((x) => x.id === m.id);
  assert.ok(entry);
  assert.strictEqual(entry.name, m.name);
  assert.strictEqual(entry.version, '1.0.0');
});

test('6. defensive copies: mutating get()/list() results is blocked by frozen metadata', () => {
  const m = validModule();
  BOS.register(m);
  const copy = BOS.get(m.id);
  assert.throws(() => { copy.name = 'HACKED'; }, TypeError);
  assert.throws(() => { copy.permissions.push('evil'); }, TypeError);
  assert.strictEqual(BOS.get(m.id).name, m.name);
  assert.strictEqual(BOS.get(m.id).permissions.length, 1);
  const listed = BOS.list().find((x) => x.id === m.id);
  assert.throws(() => { listed.navLabel = 'HACKED'; }, TypeError);
  assert.strictEqual(BOS.get(m.id).navLabel, m.navLabel);
});

test('7. permissions array copied at registration; later mutation of input has no effect', () => {
  const perms = ['p1'];
  const m = validModule({ permissions: perms });
  BOS.register(m);
  perms.push('injected');
  assert.strictEqual(BOS.get(m.id).permissions.length, 1);
});

test('8. invalid permissions value rejected', () => {
  assert.throws(() => BOS.register(validModule({ permissions: 'not-array' })), TypeError);
  assert.throws(() => BOS.register(validModule({ permissions: [42] })), TypeError);
  assert.throws(() => BOS.register(validModule({ permissions: ['  '] })), TypeError);
});

test('9. omitted permissions default to empty array', () => {
  const m = validModule();
  delete m.permissions;
  BOS.register(m);
  assert.deepStrictEqual(BOS.get(m.id).permissions, []);
});

test('10. unknown module mount rejected', () => {
  const c = makeContainer();
  assert.throws(() => BOS.mount('never-registered-xyz', c), /Unknown module/);
});

test('11. registered module renders inside container', () => {
  const m = validModule();
  BOS.register(m);
  const c = makeContainer();
  BOS.mount(m.id, c);
  assert.strictEqual(c.children.length, 1);
  assert.strictEqual(BOS.getActiveModuleId(), m.id);
  BOS.unmount();
});

test('12. registry does not access or modify localStorage', () => {
  const before = storageCalls.length;
  const m = validModule();
  BOS.register(m);
  const c = makeContainer();
  BOS.mount(m.id, c);
  BOS.unmount();
  assert.strictEqual(storageCalls.length, before);
});

test('13a. previous onUnmount failure + successful cleanup -> next mount proceeds', () => {
  const a = validModule({ onUnmount: () => { throw new Error('unmount boom'); } });
  const b = validModule();
  BOS.register(a); BOS.register(b);
  const c = makeContainer();
  BOS.mount(a.id, c);
  BOS.mount(b.id, c);
  assert.strictEqual(BOS.getActiveModuleId(), b.id);
  assert.strictEqual(c.children.length, 1);
  BOS.unmount();
});

test('13b. previous onUnmount failure + cleanup failure -> next mount ABORTED, registry inactive', () => {
  const a = validModule({ onUnmount: () => { throw new Error('unmount boom'); } });
  const b = validModule();
  BOS.register(a); BOS.register(b);
  const c = makeContainer();
  BOS.mount(a.id, c);
  c.failRemove = true;
  assert.throws(() => BOS.mount(b.id, c), /cleanup failed/);
  assert.strictEqual(BOS.getActiveModuleId(), null);
  assert.ok(c.children.length > 0);
  c.failRemove = false;
  BOS.unmount();
});

test('13c. container cleanup failure with old content remaining aborts mount', () => {
  const a = validModule();
  const b = validModule();
  BOS.register(a); BOS.register(b);
  const c = makeContainer();
  BOS.mount(a.id, c);
  c.failRemove = true;
  assert.throws(() => BOS.mount(b.id, c), /cleanup failed/);
  assert.strictEqual(BOS.getActiveModuleId(), null);
  c.failRemove = false;
  BOS.unmount();
});

test('14. render() failure: original error preserved, cleanup attempted, no active state', () => {
  const bad = validModule({ render: () => { throw new Error('render boom'); } });
  BOS.register(bad);
  const c = makeContainer();
  assert.throws(() => BOS.mount(bad.id, c), /render boom/);
  assert.strictEqual(BOS.getActiveModuleId(), null);
  assert.strictEqual(c.children.length, 0);
});

test('15. onMount() failure: original error preserved, best-effort cleanup, inactive', () => {
  const bad = validModule({ onMount: () => { throw new Error('mount boom'); } });
  BOS.register(bad);
  const c = makeContainer();
  assert.throws(() => BOS.mount(bad.id, c), /mount boom/);
  assert.strictEqual(BOS.getActiveModuleId(), null);
  assert.strictEqual(c.children.length, 0);
});

test('16. same module + same container + same context reference -> no-op', () => {
  let renders = 0, mounts = 0, unmounts = 0;
  const m = validModule({
    render: (c) => { renders++; c.appendChild({}); },
    onMount: () => { mounts++; },
    onUnmount: () => { unmounts++; }
  });
  BOS.register(m);
  const c = makeContainer();
  const ctx = { tenant: 'synthetic' };
  BOS.mount(m.id, c, ctx);
  BOS.mount(m.id, c, ctx);
  BOS.mount(m.id, c, ctx);
  assert.strictEqual(renders, 1);
  assert.strictEqual(mounts, 1);
  assert.strictEqual(unmounts, 0);
  assert.strictEqual(c.children.length, 1);
  BOS.unmount();
});

test('17. same module + container, DIFFERENT context reference -> full lifecycle transition', () => {
  let renders = 0, unmounts = 0;
  const m = validModule({
    render: (c) => { renders++; c.appendChild({}); },
    onUnmount: () => { unmounts++; }
  });
  BOS.register(m);
  const c = makeContainer();
  BOS.mount(m.id, c, { a: 1 });
  BOS.mount(m.id, c, { a: 1 });
  assert.strictEqual(renders, 2);
  assert.strictEqual(unmounts, 1);
  assert.strictEqual(c.children.length, 1);
  BOS.unmount();
});

test('18. no context passed twice -> no-op (undefined reference matches)', () => {
  let renders = 0;
  const m = validModule({ render: (c) => { renders++; c.appendChild({}); } });
  BOS.register(m);
  const c = makeContainer();
  BOS.mount(m.id, c);
  BOS.mount(m.id, c);
  assert.strictEqual(renders, 1);
  BOS.unmount();
});

test('19. failed transitions never leave a false active module', () => {
  const badRender = validModule({ render: () => { throw new Error('x'); } });
  const badMount = validModule({ onMount: () => { throw new Error('y'); } });
  const good = validModule();
  BOS.register(badRender); BOS.register(badMount); BOS.register(good);
  const c = makeContainer();
  assert.throws(() => BOS.mount(badRender.id, c));
  assert.strictEqual(BOS.getActiveModuleId(), null);
  assert.throws(() => BOS.mount(badMount.id, c));
  assert.strictEqual(BOS.getActiveModuleId(), null);
  BOS.mount(good.id, c);
  assert.strictEqual(BOS.getActiveModuleId(), good.id);
  BOS.unmount();
});

test('20. switching modules calls previous onUnmount with container cleanup verified', () => {
  let unmounted = 0;
  const a = validModule({ onUnmount: () => { unmounted++; } });
  const b = validModule();
  BOS.register(a); BOS.register(b);
  const c = makeContainer();
  BOS.mount(a.id, c);
  BOS.mount(b.id, c);
  assert.strictEqual(unmounted, 1);
  assert.strictEqual(c.children.length, 1);
  BOS.unmount();
});

test('21. one module's returned metadata cannot modify another module', () => {
  const a = validModule(); const b = validModule();
  BOS.register(a); BOS.register(b);
  const meta = BOS.get(a.id);
  assert.throws(() => { meta.name = b.name; }, TypeError);
  assert.throws(() => { meta.id = b.id; }, TypeError);
  assert.strictEqual(BOS.get(b.id).name, b.name);
  assert.strictEqual(BOS.get(a.id).name, a.name);
});

test('22. demo-style module registers and renders display-only content', () => {
  const demo = validModule({
    id: 'module-test-check',
    render: function (container) {
      const section = { className: 'bos-module-workspace', children: [] };
      container.appendChild(section);
    }
  });
  BOS.register(demo);
  const c = makeContainer();
  BOS.mount(demo.id, c);
  assert.strictEqual(c.children.length, 1);
  assert.strictEqual(c.children[0].className, 'bos-module-workspace');
  BOS.unmount();
});

test('23. version and navLabel defaults applied when omitted', () => {
  const m = validModule();
  delete m.navLabel; delete m.version;
  BOS.register(m);
  const meta = BOS.get(m.id);
  assert.strictEqual(meta.navLabel, m.name);
  assert.strictEqual(meta.version, '1.0.0');
});