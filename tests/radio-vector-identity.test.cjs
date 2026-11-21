/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: tests/radio-vector-identity.test.cjs
Movements: Inventory declared page and Authority connections and exercise account entry with isolated fixtures.
Purpose: Trace Radio handoffs under a synthetic observer identity and distinguish source evidence from executed paths.
Does NOT: Register a UIDL, grant access, send network requests, change Radio code, or publish a campaign.
*/
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const observer = Object.freeze({ id: 'test:cybercrowd-radio:vector', stageName: 'Radio Vector' });
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

test('inventory literal page scripts and Authority calls in tracked Radio source', t => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0');
  const edges = [];
  for (const file of files.filter(name => /\.(html|js)$/.test(name) && !/^(tests\/|test-)/.test(name))) {
    const code = source(file);
    if (file.endsWith('.html')) {
      for (const match of code.matchAll(/<script\b[^>]*?\s+src\s*=\s*["']([^"']+)["']/gi)) {
        edges.push({ from: file, via: 'script tag', to: match[1] });
      }
    }
    // Capture literal references as candidates. A source match is not runtime proof.
    const references = [
      ['calls module', /\b(?:window\.)?(CC[A-Z]\w*)\.(\w+)\s*\(/g],
      ['sends event', /\bdispatchEvent\(\s*new\s+(?:CustomEvent|Event)\(\s*["']([^"']+)["']/g],
      ['listens for event', /\baddEventListener\(\s*["'](cc[-:][^"']+)["']/gi],
      ['reads local storage', /\blocalStorage\.getItem\(\s*["']([^"']+)["']/g],
      ['writes local storage', /\blocalStorage\.setItem\(\s*["']([^"']+)["']/g],
      ['clears local key', /\blocalStorage\.removeItem\(\s*["']([^"']+)["']/g],
      ['fetch literal', /\bfetch\(\s*["']([^"']+)["']/g]
    ];
    for (const [via, pattern] of references) {
      for (const match of code.matchAll(pattern)) {
        edges.push({ from: file, via, to: match.slice(1).join('.') });
      }
    }
    for (const match of code.matchAll(/\bCCAuthority\.ask\s*\(\s*(?:(["'])([^"']+)\1|([\w$]+))/g)) {
      edges.push({ from: file, via: 'CCAuthority.ask', to: match[2] || '(dynamic: ' + match[3] + ')' });
    }
  }
  assert(edges.some(edge => edge.from === 'account-entry.js' && edge.to === '/api/session'));
  t.diagnostic(observer.id + ' observed ' + edges.length + ' source references');
  if (process.env.RADIO_VECTOR_MAP === '1') t.diagnostic(JSON.stringify(edges, null, 2));
});

const cases = [
  { label: 'visitor', token: null, view: 'gate' },
  { label: 'stale session', answer: { success: false }, view: 'gate' },
  { label: 'authority offline', offline: true, view: 'unavailable' },
  { label: 'unreadable reply', malformed: true, view: 'unavailable' },
  { label: 'verified session without UIDL', answer: { success: true }, view: 'missing' },
  { label: 'verified account', view: 'palm' },
  ...['projects','identity','socials','resume'].map(section => ({
    label: 'verified ' + section, hash: '#' + section, view: 'tools'
  }))
];
for (const scenario of cases) {
  test(observer.id + ' / ' + scenario.label, async () => {
    const elements = new Map();
    const element = id => {
      if (!elements.has(id)) elements.set(id, { hidden: true });
      return elements.get(id);
    };
    const scripts = [], calls = [], redirects = [];
    const token = scenario.token === null ? null : 'fixture-session';
    const window = { addEventListener() {} };
    const location = { hash: scenario.hash || '', replace: url => redirects.push(url) };
    const document = {
      getElementById: element, querySelector: () => null, createElement: () => ({}),
      body: { append: script => scripts.push(script.src.split('?')[0]) }
    };
    const context = vm.createContext({
      window, location, document,
      localStorage: { getItem: key => key === 'ccr-session' ? token : null },
      async fetch(url, options) {
        calls.push({ url, method: options.method, data: JSON.parse(options.body) });
        if (scenario.offline) throw Error('offline fixture');
        return { async json() {
          if (scenario.malformed) throw Error('invalid fixture reply');
          return scenario.answer || { success: true, uidl: 'fixture-uidl', stageName: observer.stageName };
        }};
      }
    });
    vm.runInContext(source('cc-authority.js'), context);
    await vm.runInContext(source('account-entry.js'), context);
    assert.deepEqual(calls, token ? [{
      url: 'https://radio-authority.cybercrowdradio.workers.dev/api/session',
      method: 'POST', data: { session: token }
    }] : []);
    assert.deepEqual(redirects, scenario.view === 'palm' ? ['palm.html'] : []);
    assert.equal(element('account-tools').hidden, scenario.view !== 'tools');
    assert.deepEqual(scripts, scenario.view === 'tools'
      ? ['uidl-projects.js','uidl-ican.js','uidl-socials.js','uidl-account-card.js'] : []);
    if (scenario.view === 'tools') assert.equal(element('welcome').textContent, 'Welcome, Radio Vector');
    if (scenario.view === 'gate' || scenario.view === 'unavailable') assert.equal(element('sign-in').hidden, false);
    if (scenario.view === 'unavailable') assert.match(element('status').textContent, /unavailable/);
    if (scenario.view === 'missing') assert.match(element('status').textContent, /UIDL connection is unavailable/);
  });
}
