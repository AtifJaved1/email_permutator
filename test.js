// test.js — run with: node test.js
'use strict';
const assert = require('node:assert');
const P = require('./permutator.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  \u2713 ' + name);
    passed++;
  } catch (e) {
    console.error('  \u2717 ' + name);
    console.error('    ' + e.message);
    failed++;
  }
}

// ── normalize ────────────────────────────────────────────────────────────────
console.log('\nnormalize');
test('strips combining accents', () => assert.strictEqual(P.normalize('José'), 'jose'));
test('strips accented uppercase', () => assert.strictEqual(P.normalize('GARCÍA'), 'garcia'));
test('lowercases ASCII', () => assert.strictEqual(P.normalize('JOHN'), 'john'));
test('strips hyphens (non-alpha)', () => assert.strictEqual(P.normalize('Mary-Ann'), 'maryann'));
test('strips numbers', () => assert.strictEqual(P.normalize('j0hn'), 'jhn'));

// ── cleanNameParts ───────────────────────────────────────────────────────────
console.log('\ncleanNameParts');
test('drops prefix dr', () => assert.deepStrictEqual(P.cleanNameParts('Dr. John'), ['john']));
test('drops prefix prof', () => assert.deepStrictEqual(P.cleanNameParts('Prof Smith'), ['smith']));
test('drops suffix jr', () => assert.deepStrictEqual(P.cleanNameParts('John Jr'), ['john']));
test('drops suffix phd', () => assert.deepStrictEqual(P.cleanNameParts('Jane PhD'), ['jane']));
test('splits on space', () => assert.deepStrictEqual(P.cleanNameParts('Mary Ann'), ['mary', 'ann']));
test('splits on hyphen', () => assert.deepStrictEqual(P.cleanNameParts('García-López'), ['garcia', 'lopez']));
test('normalizes accents', () => assert.deepStrictEqual(P.cleanNameParts('José'), ['jose']));
test('empty string', () => assert.deepStrictEqual(P.cleanNameParts(''), []));
test('whitespace only', () => assert.deepStrictEqual(P.cleanNameParts('   '), []));

// ── firstVariants ────────────────────────────────────────────────────────────
console.log('\nfirstVariants');
test('single part → no alt', () => assert.deepStrictEqual(P.firstVariants(['john']), ['john', null]));
test('two parts → joined + first', () => assert.deepStrictEqual(P.firstVariants(['mary', 'ann']), ['maryann', 'mary']));
test('three parts → joined + first', () => assert.deepStrictEqual(P.firstVariants(['a', 'b', 'c']), ['abc', 'a']));
test('empty → [null, null]', () => assert.deepStrictEqual(P.firstVariants([]), [null, null]));

// ── lastVariants ─────────────────────────────────────────────────────────────
console.log('\nlastVariants');
test('single part → no alt', () => assert.deepStrictEqual(P.lastVariants(['smith']), ['smith', null]));
test('non-particle head → alt = head', () => assert.deepStrictEqual(P.lastVariants(['garcia', 'lopez']), ['garcialopez', 'garcia']));
test('particle van → alt = tail', () => assert.deepStrictEqual(P.lastVariants(['van', 'der', 'berg']), ['vanderberg', 'berg']));
test('particle de → alt = tail', () => assert.deepStrictEqual(P.lastVariants(['de', 'la', 'cruz']), ['delacruz', 'cruz']));
test('short head (≤3) → alt = tail', () => assert.deepStrictEqual(P.lastVariants(['lee', 'wang']), ['leewang', 'wang']));
test('empty → [null, null]', () => assert.deepStrictEqual(P.lastVariants([]), [null, null]));

// ── applyFormat ──────────────────────────────────────────────────────────────
console.log('\napplyFormat');
test('first.last', () => assert.strictEqual(P.applyFormat('first.last',  'john', 'smith'), 'john.smith'));
test('first',      () => assert.strictEqual(P.applyFormat('first',       'john',  null),  'john'));
test('flast',      () => assert.strictEqual(P.applyFormat('flast',       'john', 'smith'), 'jsmith'));
test('firstlast',  () => assert.strictEqual(P.applyFormat('firstlast',   'john', 'smith'), 'johnsmith'));
test('f.last',     () => assert.strictEqual(P.applyFormat('f.last',      'john', 'smith'), 'j.smith'));
test('firstl',     () => assert.strictEqual(P.applyFormat('firstl',      'john', 'smith'), 'johns'));
test('first_last', () => assert.strictEqual(P.applyFormat('first_last',  'john', 'smith'), 'john_smith'));
test('last',       () => assert.strictEqual(P.applyFormat('last',        'john', 'smith'), 'smith'));
test('last.first', () => assert.strictEqual(P.applyFormat('last.first',  'john', 'smith'), 'smith.john'));
test('lastf',      () => assert.strictEqual(P.applyFormat('lastf',       'john', 'smith'), 'smithj'));
test('first.last missing last → null', () => assert.strictEqual(P.applyFormat('first.last', 'john', null), null));
test('last missing last → null',       () => assert.strictEqual(P.applyFormat('last', 'john', null), null));
test('last with null first → works',   () => assert.strictEqual(P.applyFormat('last', null, 'smith'), 'smith'));

// ── parseDomain ──────────────────────────────────────────────────────────────
console.log('\nparseDomain');
test('bare domain', () =>
  assert.deepStrictEqual(P.parseDomain('acme.com'), { domain: 'acme.com', note: null }));
test('with www', () =>
  assert.deepStrictEqual(P.parseDomain('www.acme.com'), { domain: 'acme.com', note: null }));
test('with https scheme', () =>
  assert.deepStrictEqual(P.parseDomain('https://acme.com'), { domain: 'acme.com', note: null }));
test('with http scheme', () =>
  assert.deepStrictEqual(P.parseDomain('http://acme.com'), { domain: 'acme.com', note: null }));
test('subdomain reduced', () =>
  assert.deepStrictEqual(P.parseDomain('shop.acme.com'), { domain: 'acme.com', note: null }));
test('email address → domain extracted', () =>
  assert.deepStrictEqual(P.parseDomain('user@acme.com'), { domain: 'acme.com', note: null }));
test('co.uk TLD preserved', () =>
  assert.deepStrictEqual(P.parseDomain('company.co.uk'), { domain: 'company.co.uk', note: null }));
test('subdomain + co.uk reduced', () =>
  assert.deepStrictEqual(P.parseDomain('mail.company.co.uk'), { domain: 'company.co.uk', note: null }));
test('www + co.uk stripped', () =>
  assert.deepStrictEqual(P.parseDomain('www.company.co.uk'), { domain: 'company.co.uk', note: null }));
test('com.au TLD preserved', () =>
  assert.deepStrictEqual(P.parseDomain('biz.com.au'), { domain: 'biz.com.au', note: null }));
test('free domain flagged', () =>
  assert.deepStrictEqual(P.parseDomain('gmail.com'), { domain: 'gmail.com', note: 'free/social domain - skipped' }));
test('linkedin flagged', () =>
  assert.deepStrictEqual(P.parseDomain('linkedin.com'), { domain: 'linkedin.com', note: 'free/social domain - skipped' }));
test('empty string → missing domain', () =>
  assert.deepStrictEqual(P.parseDomain(''), { domain: null, note: 'missing domain' }));
test('null → missing domain', () =>
  assert.deepStrictEqual(P.parseDomain(null), { domain: null, note: 'missing domain' }));

// ── detectColumns ────────────────────────────────────────────────────────────
console.log('\ndetectColumns');
test('exact snake_case headers', () => {
  const m = P.detectColumns(['first_name', 'last_name', 'company', 'website']);
  assert.strictEqual(m.first,   'first_name');
  assert.strictEqual(m.last,    'last_name');
  assert.strictEqual(m.company, 'company');
  assert.strictEqual(m.website, 'website');
});
test('space-separated headers', () => {
  const m = P.detectColumns(['First Name', 'Last Name', 'Company Name', 'Company Website']);
  assert.strictEqual(m.first,   'First Name');
  assert.strictEqual(m.last,    'Last Name');
  assert.strictEqual(m.company, 'Company Name');
  assert.strictEqual(m.website, 'Company Website');
});
test('alternate aliases', () => {
  const m = P.detectColumns(['fname', 'surname', 'organisation', 'domain']);
  assert.strictEqual(m.first,   'fname');
  assert.strictEqual(m.last,    'surname');
  assert.strictEqual(m.company, 'organisation');
  assert.strictEqual(m.website, 'domain');
});
test('unrecognised headers → null', () => {
  const m = P.detectColumns(['col_a', 'col_b']);
  assert.strictEqual(m.first,   null);
  assert.strictEqual(m.website, null);
});

// ── generateEmails ───────────────────────────────────────────────────────────
console.log('\ngenerateEmails');
test('default mode top 3 — correct order', () => {
  const e = P.generateEmails({ first: 'John', last: 'Smith', website: 'acme.com' }, { smb: false, topN: 3 });
  assert.strictEqual(e[0].email,  'john.smith@acme.com');
  assert.strictEqual(e[0].format, 'first.last');
  assert.strictEqual(e[0].rank,   1);
  // rank-2 should be john@acme.com
  assert.ok(e.some(x => x.email === 'john@acme.com' && x.rank === 2));
  // rank-3 should be jsmith@acme.com
  assert.ok(e.some(x => x.email === 'jsmith@acme.com' && x.rank === 3));
});
test('SMB mode — first comes before first.last', () => {
  const e = P.generateEmails({ first: 'John', last: 'Smith', website: 'acme.com' }, { smb: true, topN: 2 });
  assert.strictEqual(e[0].email,  'john@acme.com');
  assert.strictEqual(e[0].format, 'first');
  assert.ok(e.some(x => x.email === 'john.smith@acme.com' && x.rank === 2));
});
test('missing domain returns note row', () => {
  const e = P.generateEmails({ first: 'John', last: 'Smith', website: '' }, {});
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].note,   'missing domain');
  assert.strictEqual(e[0].email,  null);
  assert.strictEqual(e[0].rank,   null);
});
test('free domain returns note row', () => {
  const e = P.generateEmails({ first: 'John', last: 'Smith', website: 'gmail.com' }, {});
  assert.strictEqual(e[0].note, 'free/social domain - skipped');
  assert.strictEqual(e[0].email, null);
});
test('missing first name returns note row', () => {
  const e = P.generateEmails({ first: '', last: 'Smith', website: 'acme.com' }, {});
  assert.strictEqual(e[0].note, 'missing name');
});
test('no last name — formats needing it are skipped', () => {
  // default top 3: first.last, first, flast — only 'first' survives
  const e = P.generateEmails({ first: 'John', last: '', website: 'acme.com' }, { smb: false, topN: 3 });
  assert.ok(e.every(x => x.email && x.email.startsWith('john@')));
  assert.ok(e.every(x => x.format === 'first'));
});
test('emails deduplicated across formats', () => {
  const e = P.generateEmails({ first: 'John', last: '', website: 'acme.com' }, { smb: false, topN: 10 });
  const emails = e.map(x => x.email).filter(Boolean);
  const unique  = Array.from(new Set(emails));
  assert.strictEqual(emails.length, unique.length);
});
test('multi-part first produces alternate email', () => {
  const e = P.generateEmails({ first: 'Mary Ann', last: 'Smith', website: 'co.com' }, { smb: false, topN: 1 });
  assert.strictEqual(e[0].email, 'maryann.smith@co.com');
  assert.ok(e.some(x => x.email === 'mary.smith@co.com'));
});
test('multi-part last (non-particle) produces alternate email', () => {
  const e = P.generateEmails({ first: 'John', last: 'García-López', website: 'co.com' }, { smb: false, topN: 1 });
  assert.strictEqual(e[0].email, 'john.garcialopez@co.com');
  assert.ok(e.some(x => x.email === 'john.garcia@co.com'));
});
test('particle last produces alt = tail', () => {
  const e = P.generateEmails({ first: 'John', last: 'van der Berg', website: 'co.com' }, { smb: false, topN: 1 });
  assert.strictEqual(e[0].email, 'john.vanderberg@co.com');
  assert.ok(e.some(x => x.email === 'john.berg@co.com'));
});
test('accented first and last normalized', () => {
  const e = P.generateEmails({ first: 'José', last: 'García', website: 'co.com' }, { smb: false, topN: 1 });
  assert.strictEqual(e[0].email, 'jose.garcia@co.com');
});
test('domain subdomain reduced in output', () => {
  const e = P.generateEmails({ first: 'John', last: 'Smith', website: 'mail.bigco.com' }, { smb: false, topN: 1 });
  assert.ok(e[0].email.endsWith('@bigco.com'));
});

// ── processRows ──────────────────────────────────────────────────────────────
console.log('\nprocessRows');
const sampleRows = [
  { first_name: 'John', last_name: 'Smith', company: 'Acme', website: 'acme.com' },
  { first_name: 'Jane', last_name: '',      company: 'Solo', website: 'soloco.com' },
  { first_name: '',     last_name: 'Brown', company: 'NF',   website: 'nf.com' },
  { first_name: 'Bob',  last_name: 'Jones', company: 'Free', website: 'gmail.com' },
];
const colMap = { first: 'first_name', last: 'last_name', company: 'company', website: 'website' };

test('long mode — has required columns', () => {
  const rows = P.processRows(sampleRows, colMap, { smb: false, topN: 2, layout: 'long' });
  const keys = Object.keys(rows[0]);
  ['first_name','last_name','company','domain','rank','format','email','note'].forEach(k =>
    assert.ok(keys.includes(k), 'missing column: ' + k)
  );
});
test('long mode — error lead is excluded from output', () => {
  const rows = P.processRows(sampleRows, colMap, { smb: false, topN: 2, layout: 'long' });
  const noFirstRow = rows.find(r => r.last_name === 'Brown' && !r.email);
  assert.ok(!noFirstRow, 'error row should not appear in output');
});
test('wide mode — has email_1 column', () => {
  const rows = P.processRows(sampleRows, colMap, { smb: false, topN: 2, layout: 'wide' });
  assert.ok('email_1' in rows[0]);
});
test('wide mode — error leads are excluded from output', () => {
  const rows = P.processRows(sampleRows, colMap, { smb: false, topN: 2, layout: 'wide' });
  const noFirst = rows.find(r => r.first_name === '');
  assert.ok(!noFirst, 'error row should not appear in output');
});
test('wide mode — all rows same number of columns', () => {
  const rows = P.processRows(sampleRows, colMap, { smb: false, topN: 4, layout: 'wide' });
  const lengths = rows.map(r => Object.keys(r).length);
  assert.ok(lengths.every(l => l === lengths[0]), 'unequal column counts');
});

// ── encoding (Windows-1252 fallback) ─────────────────────────────────────────
// Simulates the ArrayBuffer → TextDecoder logic from index.html.
console.log('\nencoding');
test('Windows-1252 bytes fail strict UTF-8 decode', () => {
  // 0xe9 is a valid Windows-1252 byte (é) but illegal as a lone byte in UTF-8.
  var buf = Buffer.from([0xe9]);
  var threw = false;
  try { new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (_) { threw = true; }
  assert.ok(threw, 'strict UTF-8 should have thrown on 0xe9');
});
test('Windows-1252 "Désirée" decodes correctly', () => {
  // D(44) é(e9) s(73) i(69) r(72) é(e9) e(65)
  var buf = Buffer.from([0x44, 0xe9, 0x73, 0x69, 0x72, 0xe9, 0x65]);
  var decoded = new TextDecoder('windows-1252').decode(buf);
  assert.strictEqual(decoded, 'D\xe9sir\xe9e'); // 'Désirée'
});
test('Windows-1252 "Désirée Akhavan" generates correct emails', () => {
  // Simulate full fallback: decode buffer as windows-1252, then generate emails.
  var buf = Buffer.from([0x44, 0xe9, 0x73, 0x69, 0x72, 0xe9, 0x65]); // Désirée
  var first = new TextDecoder('windows-1252').decode(buf);
  var emails = P.generateEmails(
    { first: first, last: 'Akhavan', website: 'northstarlegal.io' },
    { smb: false, topN: 10 }
  );
  var addrs = emails.map(function (e) { return e.email; }).filter(Boolean);
  assert.ok(addrs.indexOf('desiree@northstarlegal.io')        !== -1, 'missing desiree@northstarlegal.io');
  assert.ok(addrs.indexOf('desiree.akhavan@northstarlegal.io') !== -1, 'missing desiree.akhavan@northstarlegal.io');
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
