// Read-only DNSSEC validation probe for the weekly expiry sweep.
//
// WHY THIS EXISTS
//
// The first cut of the sweep asked 1.1.1.1 (then 8.8.8.8) whether *any* DS
// record existed for a zone, and treated a non-empty answer as "all clear".
// That inference is exactly backwards for the failure it was built to catch:
// a DS record published at the registrar that does not match the zone's
// current key makes every validating resolver return SERVFAIL, i.e. the zone
// is BROKEN — and the old check reported it as the healthiest possible state.
// (Observed 2026-09-28 on `tasmania.homes`: a freshly published DS produced
// SERVFAIL from both resolvers and had to be rolled back.)
//
// WHAT IT DOES INSTEAD
//
// Two independent validating resolvers (Cloudflare 1.1.1.1 and Google 8.8.8.8)
// are asked over DoH JSON — plain HTTPS, no credentials, no Cloudflare API
// scope, no `dig`, no third-party CLI. For each zone it establishes:
//
//   * whether a DS record exists at the parent (DS query), and
//   * whether the apex SOA is actually validated (AD=true on a NOERROR SOA).
//
// A zone is clear ONLY when both resolvers independently report a NOERROR,
// AD=true apex SOA. Everything else is a finding, and each finding names the
// zone and the condition. Failures are never rendered as "missing DS" and
// never as "all clear": a transport error, an HTTP error, a malformed body or
// a resolver disagreement leaves the zone's state UNKNOWN, which is itself a
// finding (the sweep's doctrine: a missing signal is a bad signal, not an
// unknown one).
//
// Where a normal (DO=1) query SERVFAILs and the same query with checking
// disabled (CD=1) succeeds, that is consistent with a DNSSEC validation
// failure — Cloudflare's documented diagnostic
// (https://developers.cloudflare.com/dns/dnssec/troubleshooting/). It is
// reported as a LABELLED INFERENCE, never as proven root cause: an
// authoritative nameserver that is simply down produces the same signature.
//
// Sources (JSON shapes, Status/AD semantics):
//   https://developers.cloudflare.com/dns/dnssec/troubleshooting/
//   https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/
//   https://developers.google.com/speed/public-dns/docs/doh/json
//
// CLI (used by .github/workflows/expiry-sweep.yml):
//   node scripts/dnssec-check.mjs <zone> [<zone> ...]
//   DNSSEC_DOMAINS='a.com b.com' node scripts/dnssec-check.mjs
//     → findings lines ("- ...") on stdout, diagnostics on stderr, exit 0.
//       A non-zero exit means the probe itself did not run; the workflow turns
//       that into its own finding rather than into silence.
//   --json     print the full observation set as JSON instead of findings
//   --fixture  load canned DoH responses from a JSON file (tests/QA only)
//   --timeout-ms  per-query timeout (default 10000)

import { readFileSync } from 'node:fs';

/** RR type numbers used here (IANA DNS parameters). */
const TYPE_DS = 43;
const TYPE_SOA = 6;

/** The two independent validating resolvers. Both must agree before a pass. */
export const RESOLVERS = [
  { id: 'cloudflare', label: '1.1.1.1 (Cloudflare)', url: 'https://cloudflare-dns.com/dns-query' },
  { id: 'google', label: '8.8.8.8 (Google)', url: 'https://dns.google/resolve' },
];

/** Per-resolver verdicts. `unverified` is the fail-closed default. */
export const VERDICT = {
  SECURE: 'secure', // DS present, apex SOA NOERROR + AD=true
  UNSIGNED: 'unsigned', // no DS at the parent, apex SOA NOERROR + AD=false
  BOGUS: 'bogus', // DS present (or CD-proven) but validating queries SERVFAIL
  UNVERIFIED: 'unverified', // transport/HTTP/malformed/ambiguous — nothing established
};

/** Zone states. Only `secure` is clear. */
export const STATE = {
  SECURE: 'secure',
  UNSIGNED: 'unsigned',
  BOGUS: 'bogus',
  INCONSISTENT: 'inconsistent',
  UNKNOWN: 'unknown',
};

// ── DoH plumbing ──────────────────────────────────────────────────────────

/**
 * Parse a DoH JSON body. Anything that is not a well-formed documented
 * response — non-JSON, missing/non-numeric Status, missing boolean AD,
 * non-array Answer — is reported as malformed rather than coerced.
 * @param {string} text
 */
export function parseDohJson(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'body is not JSON' };
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, error: 'body is not a JSON object' };
  }
  if (!Number.isInteger(json.Status) || json.Status < 0) {
    return { ok: false, error: `missing or non-numeric Status (${JSON.stringify(json.Status)})` };
  }
  if (typeof json.AD !== 'boolean') {
    return { ok: false, error: `missing or non-boolean AD (${JSON.stringify(json.AD)})` };
  }
  if (json.Answer !== undefined && !Array.isArray(json.Answer)) {
    return { ok: false, error: 'Answer is present but not an array' };
  }
  const answers = Array.isArray(json.Answer) ? json.Answer : [];
  if (
    answers.some((a) => !a || typeof a.name !== 'string' || !Number.isInteger(a.type) || typeof a.data !== 'string')
  ) {
    return { ok: false, error: 'Answer contains a malformed record' };
  }
  return {
    ok: true,
    status: json.Status,
    ad: json.AD,
    cd: typeof json.CD === 'boolean' ? json.CD : null,
    answers,
    comment: typeof json.Comment === 'string' ? json.Comment : null,
  };
}

/** Apex DS records as normalised `keytag alg digesttype digest` strings. */
export function dsRecords(response, zone) {
  const owner = zone.replace(/\.$/, '').toLowerCase();
  return response.answers
    .filter((a) => a.type === TYPE_DS)
    .map((a) => {
      const parts = a.data.trim().split(/\s+/);
      const sameOwner = a.name.replace(/\.$/, '').toLowerCase() === owner;
      if (
        !sameOwner ||
        parts.length !== 4 ||
        !/^\d+$/.test(parts[0]) ||
        Number(parts[0]) > 65535 ||
        !/^\d+$/.test(parts[1]) ||
        Number(parts[1]) > 255 ||
        !/^\d+$/.test(parts[2]) ||
        Number(parts[2]) > 255 ||
        !/^(?:[0-9a-fA-F]{2})+$/.test(parts[3])
      ) {
        throw new Error('malformed or non-apex DS record');
      }
      return parts.join(' ').toLowerCase();
    });
}

/** The apex SOA record's rdata, or null. Owner is normalised (trailing dot stripped). */
export function apexSoa(response, zone) {
  const want = zone.replace(/\.$/, '').toLowerCase();
  const found = response.answers.find(
    (a) => a.type === TYPE_SOA && String(a.name).replace(/\.$/, '').toLowerCase() === want,
  );
  return found ? found.data : null;
}

/**
 * One DoH query. Returns a discriminated result: `{ ok: true, ...parsed }` or
 * `{ ok: false, error }` where the error is a transport, HTTP or malformed
 * failure. Never throws.
 * @param {string} zone
 * @param {'DS'|'SOA'} type
 * @param {{ resolver: {id: string, url: string}, cd?: boolean, timeoutMs?: number, fetchImpl?: typeof fetch }} opts
 */
export async function queryDoh(zone, type, { resolver, cd = false, timeoutMs = 10000, fetchImpl = fetch }) {
  const url = `${resolver.url}?name=${encodeURIComponent(zone)}&type=${type}` + `&do=1` + (cd ? '&cd=1' : '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    const res = await fetchImpl(url, { headers: { accept: 'application/dns-json' }, signal: controller.signal });
    if (!res || typeof res.status !== 'number') {
      return { ok: false, error: 'fetch returned no usable response' };
    }
    if (res.status !== 200) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const body = await res.text();
    const parsed = parseDohJson(body);
    if (!parsed.ok) return { ok: false, error: `malformed DoH response: ${parsed.error}` };
    return { ok: true, ...parsed };
  } catch (e) {
    return { ok: false, error: `request or response body failed: ${e?.message || e}` };
  } finally {
    clearTimeout(timer);
  }
}

// ── Per-resolver observation ──────────────────────────────────────────────

/**
 * Observe one zone through one resolver. Pure w.r.t. injected `fetchImpl`.
 * @returns {Promise<{resolver: string, verdict: string, condition: string, ...}>}
 */
export async function observeResolver(zone, resolver, { timeoutMs = 10000, fetchImpl = fetch } = {}) {
  const base = {
    resolver: resolver.id,
    label: resolver.label,
    verdict: VERDICT.UNVERIFIED,
    condition: 'not probed',
    probeError: false,
    dsPresent: null,
    dsStatus: null,
    dsAd: null,
    dsDigests: [],
    soaStatus: null,
    soaAd: null,
    soaPresent: null,
    cdChecked: false,
    cdStatus: null,
    cdAd: null,
  };
  const opts = { resolver, timeoutMs, fetchImpl };
  const ds = await queryDoh(zone, 'DS', opts);

  if (!ds.ok) {
    return { ...base, probeError: true, condition: `DS query failed: ${ds.error}` };
  }
  base.dsStatus = ds.status;
  base.dsAd = ds.ad;
  try {
    base.dsDigests = dsRecords(ds, zone);
  } catch (e) {
    return { ...base, probeError: true, condition: `DS answer failed validation: ${e.message}` };
  }

  if (ds.status !== 0) {
    if (ds.status !== 2) {
      return { ...base, condition: `DS query returned ${statusName(ds.status)}; delegation state is unverified` };
    }
    // A non-NOERROR DS lookup says nothing about whether a DS exists. Ask the
    // same question with validation disabled: that distinguishes "a DS is
    // published and validating lookups fail" (bogus) from "the resolver could
    // not answer at all" (unknown — never treated as missing).
    const cd = await queryDoh(zone, 'DS', { ...opts, cd: true });
    base.cdChecked = true;
    if (!cd.ok) {
      return { ...base, probeError: true, condition: `DS query returned SERVFAIL; CD query failed: ${cd.error}` };
    }
    base.cdStatus = cd.status;
    base.cdAd = cd.ad;
    if (cd.status !== 0) {
      return {
        ...base,
        condition: `DS query returned ${statusName(ds.status)}; CD query also returned ${statusName(cd.status)}`,
      };
    }
    let cdDigests;
    try {
      cdDigests = dsRecords(cd, zone);
    } catch (e) {
      return { ...base, probeError: true, condition: `checking-disabled DS answer failed validation: ${e.message}` };
    }
    if (!cdDigests.length) {
      return {
        ...base,
        dsPresent: false,
        condition: `${statusName(ds.status)} to a validating DS query, but a checking-disabled DS query is NOERROR with no DS`,
      };
    }
    base.dsPresent = true;
    base.dsDigests = cdDigests;
    return {
      ...base,
      verdict: VERDICT.BOGUS,
      condition: `DS published (seen with checking disabled) but a validating DS query returns ${statusName(ds.status)}`,
    };
  }

  // NOERROR on the DS query: a non-empty answer is a published DS.
  const soa = await queryDoh(zone, 'SOA', opts);
  if (!soa.ok) {
    return {
      ...base,
      probeError: true,
      dsPresent: base.dsDigests.length > 0,
      condition: `apex SOA query failed: ${soa.error}`,
    };
  }
  base.soaStatus = soa.status;
  base.soaAd = soa.ad;
  const soaData = soa.status === 0 ? apexSoa(soa, zone) : null;
  base.soaPresent = soaData !== null;

  if (base.dsDigests.length === 0) {
    // No DS at the parent. Insecure delegation IF the apex SOA is answered and
    // not authenticated; anything else is unknown rather than "missing".
    if (soa.status !== 0) {
      return {
        ...base,
        dsPresent: false,
        condition: `no DS, but the apex SOA query returns ${statusName(soa.status)}; delegation state is unverified`,
      };
    }
    if (!base.soaPresent) {
      return {
        ...base,
        dsPresent: false,
        condition: 'no DS, and the NOERROR apex SOA answer carries no apex SOA record',
      };
    }
    if (soa.ad) {
      return {
        ...base,
        dsPresent: false,
        condition: 'no DS at the parent, yet the apex SOA is authenticated (AD=true)',
      };
    }
    return {
      ...base,
      dsPresent: false,
      verdict: VERDICT.UNSIGNED,
      condition: 'no DS at the parent; apex SOA NOERROR with AD=false (insecure delegation)',
    };
  }

  // DS is published. This is where the old check stopped.
  base.dsPresent = true;
  if (soa.status !== 0) {
    if (soa.status !== 2) {
      return {
        ...base,
        condition: `DS published, but the apex SOA query returns ${statusName(soa.status)}; cause unverified`,
      };
    }
    const cd = await queryDoHCd(zone, 'SOA', opts, base);
    if (cd?.status === 0 && apexSoa(cd, zone)) {
      return {
        ...base,
        verdict: VERDICT.BOGUS,
        condition:
          'DS published, apex SOA returns SERVFAIL; checking-disabled apex SOA succeeds, consistent with a DNSSEC validation failure (an inference, not a proven cause)',
      };
    }
    return {
      ...base,
      condition: `DS published, apex SOA returns SERVFAIL; ${cd ? `checking-disabled query returns ${statusName(cd.status)}` : 'checking-disabled query failed'}; cause unverified`,
    };
  }
  if (!base.soaPresent) {
    return { ...base, condition: 'DS published and NOERROR, but the answer carries no apex SOA record' };
  }
  if (!soa.ad) {
    return { ...base, condition: 'DS published, apex SOA NOERROR but AD=false (chain not validated)' };
  }
  return {
    ...base,
    verdict: VERDICT.SECURE,
    condition: 'DS published; apex SOA NOERROR with AD=true',
  };
}

/** Run the checking-disabled companion query and fold it into `base`/result. */
async function queryDoHCd(zone, type, opts, base) {
  const cd = await queryDoh(zone, type, { ...opts, cd: true });
  base.cdChecked = true;
  if (!cd.ok) {
    base.probeError = true;
    return null;
  }
  base.cdStatus = cd.status;
  base.cdAd = cd.ad;
  return cd;
}

function statusName(status) {
  return { 0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 5: 'REFUSED' }[status] || `RCODE${status}`;
}

// ── Zone classification ───────────────────────────────────────────────────

/**
 * Classify a zone from its per-resolver observations. Only two agreeing
 * `secure` verdicts are clear.
 * @param {string} zone
 * @param {Array<object>} observations
 */
export function classifyZone(zone, observations) {
  const verdicts = observations.map((o) => o.verdict);
  const probeFailed = observations.some((o) => o.probeError);
  const state = (() => {
    if (observations.length !== RESOLVERS.length) return STATE.UNKNOWN;
    if (probeFailed) return STATE.UNKNOWN;
    if (verdicts.every((v) => v === VERDICT.SECURE)) return STATE.SECURE;
    if (verdicts.every((v) => v === VERDICT.UNSIGNED)) return STATE.UNSIGNED;
    if (verdicts.every((v) => v === VERDICT.BOGUS)) return STATE.BOGUS;
    if (new Set(verdicts).size > 1) return STATE.INCONSISTENT;
    return STATE.UNKNOWN;
  })();

  // Published DS records must also agree between resolvers: a parent
  // mid-update (or one resolver holding a stale cache) shows up here rather
  // than as a pass, even when both resolvers validate what they hold.
  let mismatch = false;
  if (observations.length === 2 && observations.every((o) => o.dsPresent !== null)) {
    const [a, b] = observations;
    const canonical = (records) => [...new Set(records)].sort().join('|');
    mismatch = canonical(a.dsDigests) !== canonical(b.dsDigests);
  }
  return {
    zone,
    state: mismatch ? STATE.INCONSISTENT : state,
    dsMismatch: mismatch,
    observations,
  };
}

/** Observe and classify a list of zones (sequentially, in input order). */
export async function checkZones(zones, { timeoutMs = 10000, fetchImpl = fetch, log = () => {} } = {}) {
  const unique = [...new Set(zones.map((z) => String(z).trim()).filter(Boolean))];
  const results = [];
  for (const zone of unique) {
    log(`DNSSEC ${zone}: probing ${RESOLVERS.map((r) => r.label).join(' + ')}`);
    const observations = [];
    for (const resolver of RESOLVERS) {
      observations.push(await observeResolver(zone, resolver, { timeoutMs, fetchImpl }));
    }
    const result = classifyZone(zone, observations);
    for (const o of result.observations) log(`DNSSEC ${zone}: ${o.resolver} — ${o.verdict} (${o.condition})`);
    log(`DNSSEC ${zone}: ${result.state}`);
    results.push(result);
  }
  return results;
}

// ── Findings text ─────────────────────────────────────────────────────────

const shortResolver = (id) => (id === 'cloudflare' ? '1.1.1.1' : id === 'google' ? '8.8.8.8' : id);

/**
 * Turn classified zones into concise findings, grouped by condition.
 * `unsigned` keeps the sweep's long-standing single line (it is a known
 * registrar-side backlog and one line per zone every week is noise);
 * `bogus`, `inconsistent` and `unknown` are grouped per condition too, but
 * with the per-zone evidence in the line.
 * @returns {string[]} lines already prefixed with "- "
 */
export function buildFindings(results) {
  const findings = [];
  const unsigned = results.filter((r) => r.state === STATE.UNSIGNED).map((r) => r.zone);
  const bogus = results.filter((r) => r.state === STATE.BOGUS);
  const inconsistent = results.filter((r) => r.state === STATE.INCONSISTENT);
  const unknown = results.filter((r) => r.state === STATE.UNKNOWN);

  if (unsigned.length) {
    findings.push(
      `DNSSEC: no DS record published for: ${unsigned.join(' ')}. These zones are signed at Cloudflare but not validating — the DS record has to be added at each registrar by hand. Until then DNSSEC is off for them in practice.`,
    );
  }
  if (bogus.length) {
    const first = bogus[0].observations.find((o) => o.condition.includes('checking-disabled'));
    findings.push(
      `DNSSEC: **${bogus.length === 1 ? 'a zone has' : 'zones have'} a DS record published but cannot be validated** — every validating resolver queried returns SERVFAIL: ` +
        bogus.map((r) => `\`${r.zone}\``).join(', ') +
        `. This is the state a parent DS that does not match the zone's current key produces, and it means the zone is broken for validating resolvers, not signed and safe. Treat it as BROKEN until proven otherwise.` +
        (first
          ? ` For \`${bogus[0].zone}\`, a query with checking disabled succeeds where the validating query fails, which is consistent with a DNSSEC validation failure — an inference, not a proven root cause.`
          : ''),
    );
  }
  for (const r of inconsistent) {
    findings.push(
      `DNSSEC: ${r.observations.some((o) => o.verdict === VERDICT.BOGUS) ? '**SERVFAIL / possible validation break** — ' : ''}resolvers disagree about \`${r.zone}\` — ` +
        r.observations.map((o) => `${shortResolver(o.resolver)}: ${o.condition}`).join('; ') +
        `. A settlement is not observable from one run: re-check before adding or removing any DS record.` +
        (r.dsMismatch ? ` The DS records the two resolvers return do not match each other.` : ''),
    );
  }
  if (unknown.length) {
    findings.push(
      `DNSSEC: could not determine the validation state of: ` +
        unknown
          .map(
            (r) =>
              `\`${r.zone}\` (` +
              r.observations
                .map((o) =>
                  o.verdict === VERDICT.UNVERIFIED
                    ? `${shortResolver(o.resolver)}: ${o.condition}`
                    : `${shortResolver(o.resolver)}: saw it ${o.verdict}`,
                )
                .join('; ') +
              ')',
          )
          .join(', ') +
        `. Validation is not established end-to-end for these zones. This is NOT a missing DS and NOT an all-clear; if every zone landed here, suspect the probe's network rather than the zones.`,
    );
  }
  return findings.map((f) => `- ${f}`);
}

// ── Fixture-backed fetch (tests / QA only, no network) ────────────────────

/**
 * A fetch that answers from a fixture file instead of the network.
 * Fixture shape:
 *   { "responses": { "<resolverId>|<zone>|<TYPE>[|cd]": {status?, json? | text? | error?} } }
 * An undefined key is reported as a fixture miss (never as a silent pass).
 * @param {{responses: Record<string, any>}} fixture
 */
export function createFixtureFetch(fixture) {
  const misses = [];
  const calls = [];
  const fetchImpl = async (url) => {
    const u = new URL(url);
    const zone = u.searchParams.get('name') || '';
    const type = u.searchParams.get('type') || '';
    const cd = u.searchParams.get('cd') === '1';
    const resolverId = u.hostname.startsWith('cloudflare') ? 'cloudflare' : 'google';
    const key = `${resolverId}|${zone}|${type}${cd ? '|cd' : ''}`;
    calls.push(key);
    const entry = fixture.responses[key];
    if (!entry) {
      // A fixture miss must NOT look like a healthy response. Return a body the
      // documented-shape parser rejects, so the observation lands on
      // `unverified` and the miss surfaces as a finding.
      misses.push(key);
      return { status: 200, text: async () => JSON.stringify({ error: `fixture miss: ${key}` }) };
    }
    if (entry.error) throw new Error(entry.error);
    const status = entry.status ?? 200;
    const body = entry.json !== undefined ? JSON.stringify(entry.json) : (entry.text ?? '');
    return { status, text: async () => body };
  };
  return Object.assign(fetchImpl, { misses, calls });
}

// ── CLI ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const zones = [];
  const opts = { json: false, fixture: null, timeoutMs: 10000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--fixture') opts.fixture = argv[++i];
    else if (a === '--timeout-ms') opts.timeoutMs = Number(argv[++i]) || 10000;
    else if (a === '--help' || a === '-h') opts.help = true;
    else zones.push(a);
  }
  if (!zones.length && process.env.DNSSEC_DOMAINS) zones.push(...process.env.DNSSEC_DOMAINS.split(/\s+/));
  opts.zones = zones.filter(Boolean);
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stderr.write(
      'usage: node scripts/dnssec-check.mjs [--json] [--fixture file.json] [--timeout-ms n] <zone> [...]\n',
    );
    return 0;
  }
  if (!opts.zones.length) {
    // Fail closed rather than reporting nothing: an empty zone list is a
    // misconfiguration, and "no zones checked" must never read as "all clear".
    process.stderr.write('dnssec-check: no zones supplied (args or $DNSSEC_DOMAINS)\n');
    return 2;
  }
  const fetchImpl = opts.fixture ? createFixtureFetch(JSON.parse(readFileSync(opts.fixture, 'utf8'))) : fetch;
  const results = await checkZones(opts.zones, {
    timeoutMs: opts.timeoutMs,
    fetchImpl,
    log: (line) => process.stderr.write(`${line}\n`),
  });
  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ zones: results, findings: buildFindings(results) }, null, 2)}\n`);
    return 0;
  }
  for (const line of buildFindings(results)) process.stdout.write(`${line}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      process.stderr.write(`dnssec-check: probe failed to run: ${e?.stack || e}\n`);
      process.exit(1);
    },
  );
}
