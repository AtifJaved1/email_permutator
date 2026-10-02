// permutator.js — email permutator core logic
// Works as a plain <script> in the browser (window.Permutator) and via require() in Node.js.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Permutator = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────

  var PREFIXES = { dr: 1, mr: 1, mrs: 1, ms: 1, miss: 1, prof: 1 };
  var SUFFIXES = { jr: 1, sr: 1, ii: 1, iii: 1, iv: 1, phd: 1, md: 1, cpa: 1, esq: 1, mba: 1, dds: 1, pe: 1 };
  var PARTICLES = { van: 1, von: 1, de: 1, der: 1, del: 1, la: 1, le: 1, di: 1, da: 1, st: 1 };

  var FREE_DOMAINS = {
    'gmail.com': 1, 'yahoo.com': 1, 'hotmail.com': 1, 'outlook.com': 1,
    'aol.com': 1, 'icloud.com': 1, 'live.com': 1, 'msn.com': 1,
    'linkedin.com': 1, 'facebook.com': 1,
  };

  // Checked longest-first so "com.au" doesn't shadow "net.au", etc.
  var MULTI_TLDS = [
    'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
    'com.au', 'net.au', 'org.au', 'co.nz',
    'com.pk', 'co.in', 'com.br', 'co.za',
    'com.mx', 'co.jp', 'com.sg',
  ];

  // Default rank order (1–10)
  var FORMATS_DEFAULT = [
    'first.last', 'first', 'flast', 'firstlast', 'f.last',
    'firstl', 'first_last', 'last', 'last.first', 'lastf',
  ];

  // SMB mode order
  var FORMATS_SMB = [
    'first', 'first.last', 'firstlast', 'flast', 'f.last',
    'firstl', 'first_last', 'last', 'last.first', 'lastf',
  ];

  var COLUMN_ALIASES = {
    first:   ['first name', 'first_name', 'firstname', 'fname', 'first', 'given name'],
    last:    ['last name', 'last_name', 'lastname', 'lname', 'last', 'surname', 'family name'],
    company: ['company name', 'company_name', 'company', 'organization', 'organisation', 'account name'],
    website: ['website', 'company website', 'domain', 'url', 'web', 'company domain', 'site'],
  };

  // ── Name helpers ─────────────────────────────────────────────────────────────

  // NFKD-normalize, strip combining accents, lowercase, keep only a-z.
  function normalize(s) {
    return s.normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }

  // Split on spaces/hyphens, normalize each token, drop prefixes & suffixes.
  function cleanNameParts(s) {
    if (!s || !s.trim()) return [];
    return s.trim()
      .split(/[\s\-]+/)
      .map(normalize)
      .filter(function (p) { return p.length > 0 && !PREFIXES[p] && !SUFFIXES[p]; });
  }

  // Returns [primary, alternate] for a first name.
  // Primary = all parts joined; alternate = first part (only when multi-part).
  function firstVariants(parts) {
    if (!parts.length) return [null, null];
    var primary = parts.join('');
    var alt = parts.length > 1 ? parts[0] : null;
    return [primary, alt !== primary ? alt : null];
  }

  // Returns [primary, alternate] for a last name.
  // Primary = all parts joined.
  // Alternate = first part, EXCEPT when first part is a particle or ≤3 chars → use last part.
  function lastVariants(parts) {
    if (!parts.length) return [null, null];
    var primary = parts.join('');
    if (parts.length === 1) return [primary, null];
    var head = parts[0];
    var alt = (PARTICLES[head] || head.length <= 3) ? parts[parts.length - 1] : head;
    return [primary, alt !== primary ? alt : null];
  }

  // ── Format engine ─────────────────────────────────────────────────────────────

  // Returns the local-part string (before @) or null if required parts are absent.
  function applyFormat(fmt, f, l) {
    switch (fmt) {
      case 'first.last':  return (f && l) ? f + '.' + l       : null;
      case 'first':       return f         ? f                 : null;
      case 'flast':       return (f && l) ? f[0] + l          : null;
      case 'firstlast':   return (f && l) ? f + l             : null;
      case 'f.last':      return (f && l) ? f[0] + '.' + l    : null;
      case 'firstl':      return (f && l) ? f + l[0]          : null;
      case 'first_last':  return (f && l) ? f + '_' + l       : null;
      case 'last':        return l         ? l                 : null;
      case 'last.first':  return (f && l) ? l + '.' + f       : null;
      case 'lastf':       return (f && l) ? l + f[0]          : null;
      default:            return null;
    }
  }

  // ── Domain parser ─────────────────────────────────────────────────────────────

  // Returns { domain: string|null, note: string|null }.
  function parseDomain(raw) {
    if (!raw || !raw.trim()) return { domain: null, note: 'missing domain' };
    raw = raw.trim();

    // If it looks like an email address, take the part after @.
    if (raw.indexOf('@') !== -1) raw = raw.split('@').pop().trim();

    // Prepend scheme so URL() can parse bare hostnames.
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;

    var hostname;
    try {
      hostname = new URL(raw).hostname;
    } catch (e) {
      return { domain: null, note: 'missing domain' };
    }
    if (!hostname) return { domain: null, note: 'missing domain' };

    // Strip leading www.
    hostname = hostname.replace(/^www\./i, '');

    // Reduce to root domain, respecting multi-part TLDs.
    var domain = hostname;
    var matchedMultiTld = false;
    for (var i = 0; i < MULTI_TLDS.length; i++) {
      var tld = MULTI_TLDS[i];
      var suffix = '.' + tld;
      if (hostname.length > suffix.length && hostname.slice(-suffix.length) === suffix) {
        var prefix = hostname.slice(0, hostname.length - suffix.length);
        var prefixParts = prefix.split('.');
        domain = prefixParts[prefixParts.length - 1] + suffix;
        matchedMultiTld = true;
        break;
      }
      if (hostname === tld) {
        return { domain: null, note: 'missing domain' };
      }
    }

    // Fallback: reduce to last two labels (only when no multi-part TLD matched).
    if (!matchedMultiTld) {
      var parts = hostname.split('.');
      domain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
    }

    if (!domain || domain.indexOf('.') === -1) return { domain: null, note: 'missing domain' };
    if (FREE_DOMAINS[domain]) return { domain: domain, note: 'free/social domain - skipped' };
    return { domain: domain, note: null };
  }

  // ── Column detection ──────────────────────────────────────────────────────────

  // Auto-maps CSV headers to { first, last, company, website }.
  // Values are original header strings (as they appear in the CSV), or null.
  function detectColumns(headers) {
    var mapping = { first: null, last: null, company: null, website: null };
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].trim().toLowerCase();
      for (var field in COLUMN_ALIASES) {
        if (!mapping[field] && COLUMN_ALIASES[field].indexOf(h) !== -1) {
          mapping[field] = headers[i];
          break;
        }
      }
    }
    return mapping;
  }

  // ── Email generator ───────────────────────────────────────────────────────────

  // lead: { first, last, website }
  // opts: { smb: bool, topN: number }
  // Returns array of { rank, format, email, note }.
  // Error rows have rank/format/email = null and note set.
  function generateEmails(lead, opts) {
    var smb  = (opts && opts.smb  !== undefined) ? opts.smb  : true;
    var topN = (opts && opts.topN !== undefined) ? opts.topN : 4;

    var parsed = parseDomain(lead.website);
    if (parsed.note) return [{ rank: null, format: null, email: null, note: parsed.note }];

    var fParts = cleanNameParts(lead.first  || '');
    if (!fParts.length) return [{ rank: null, format: null, email: null, note: 'missing name' }];

    var lParts = cleanNameParts(lead.last || '');

    var fv = firstVariants(fParts);
    var lv = lastVariants(lParts);
    var fPrimary = fv[0], fAlt = fv[1];
    var lPrimary = lv[0], lAlt = lv[1];

    // All non-null first/last variants (primary first).
    var allF = fAlt ? [fPrimary, fAlt] : [fPrimary];
    var allL = lPrimary
      ? (lAlt ? [lPrimary, lAlt] : [lPrimary])
      : [null];

    var formats = (smb ? FORMATS_SMB : FORMATS_DEFAULT).slice(0, topN);
    var seen = {};
    var results = [];

    for (var r = 0; r < formats.length; r++) {
      var fmt  = formats[r];
      var rank = r + 1;

      // Primary combo first (fPrimary + lPrimary).
      var primaryLocal = applyFormat(fmt, fPrimary, lPrimary || null);
      if (primaryLocal) {
        var primaryEmail = primaryLocal + '@' + parsed.domain;
        if (!seen[primaryEmail]) {
          seen[primaryEmail] = true;
          results.push({ rank: rank, format: fmt, email: primaryEmail, note: null });
        }
      }

      // Alternate combos — every (f, l) pair except the primary.
      for (var fi = 0; fi < allF.length; fi++) {
        for (var li = 0; li < allL.length; li++) {
          var f = allF[fi], l = allL[li];
          if (f === fPrimary && l === (lPrimary || null)) continue;
          var local = applyFormat(fmt, f, l);
          if (local) {
            var email = local + '@' + parsed.domain;
            if (!seen[email]) {
              seen[email] = true;
              results.push({ rank: rank, format: fmt, email: email, note: null });
            }
          }
        }
      }
    }

    if (!results.length) return [{ rank: null, format: null, email: null, note: 'no emails generated' }];
    return results;
  }

  // ── Row processor ─────────────────────────────────────────────────────────────

  // rows:   array of plain objects (PapaParse output)
  // colMap: { first, last, company, website } — header names or null
  // opts:   { smb, topN, layout: 'long'|'wide' }
  // Returns array of plain objects ready for Papa.unparse().
  function processRows(rows, colMap, opts) {
    var smb    = (opts && opts.smb    !== undefined) ? opts.smb    : true;
    var topN   = (opts && opts.topN   !== undefined) ? opts.topN   : 4;
    var layout = (opts && opts.layout)               ? opts.layout : 'long';

    function extractLead(row) {
      return {
        first:   colMap.first   ? (row[colMap.first]   || '').toString().trim() : '',
        last:    colMap.last    ? (row[colMap.last]     || '').toString().trim() : '',
        company: colMap.company ? (row[colMap.company]  || '').toString().trim() : '',
        website: colMap.website ? (row[colMap.website]  || '').toString().trim() : '',
      };
    }

    var genOpts = { smb: smb, topN: topN };

    // Copy all keys from an original CSV row into a new object.
    function copyRow(row) {
      var out = {};
      for (var k in row) {
        if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k];
      }
      return out;
    }

    if (layout === 'wide') {
      // First pass: generate emails for each row and find the max email count.
      var processed = [];
      var maxEmails = 0;

      for (var i = 0; i < rows.length; i++) {
        var lead    = extractLead(rows[i]);
        var dp      = parseDomain(lead.website);
        var emails  = generateEmails(lead, genOpts);
        var emailList = [];
        var rowNote   = '';

        for (var j = 0; j < emails.length; j++) {
          if (emails[j].email) {
            emailList.push(emails[j].email);
          } else if (emails[j].note && !rowNote) {
            rowNote = emails[j].note;
          }
        }

        processed.push({ orig: rows[i], domain: dp.domain || '', emailList: emailList, note: rowNote });
        if (emailList.length > maxEmails) maxEmails = emailList.length;
      }

      // Second pass: build uniform output rows (skip error rows).
      var wideOut = [];
      for (var ii = 0; ii < processed.length; ii++) {
        var p = processed[ii];
        if (!p.emailList.length) continue;
        var outRow = copyRow(p.orig);
        outRow.domain = p.domain;
        for (var k = 0; k < maxEmails; k++) {
          outRow['email_' + (k + 1)] = p.emailList[k] || '';
        }
        outRow.note = p.note;
        wideOut.push(outRow);
      }
      return wideOut;

    } else {
      // Long mode: one row per email guess.
      var longOut = [];
      for (var idx = 0; idx < rows.length; idx++) {
        var lead   = extractLead(rows[idx]);
        var dp     = parseDomain(lead.website);
        var emails = generateEmails(lead, genOpts);

        for (var ej = 0; ej < emails.length; ej++) {
          var e = emails[ej];
          if (!e.email) continue;  // skip error rows
          var outRow = copyRow(rows[idx]);
          outRow.domain = dp.domain || '';
          outRow.rank   = e.rank;
          outRow.format = e.format;
          outRow.email  = e.email;
          outRow.note   = '';
          longOut.push(outRow);
        }
      }
      return longOut;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  return {
    normalize:      normalize,
    cleanNameParts: cleanNameParts,
    firstVariants:  firstVariants,
    lastVariants:   lastVariants,
    applyFormat:    applyFormat,
    parseDomain:    parseDomain,
    detectColumns:  detectColumns,
    generateEmails: generateEmails,
    processRows:    processRows,
    FORMATS_DEFAULT: FORMATS_DEFAULT,
    FORMATS_SMB:     FORMATS_SMB,
    COLUMN_ALIASES:  COLUMN_ALIASES,
  };
}));
