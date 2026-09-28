import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RESOLVERS,
  STATE,
  VERDICT,
  apexSoa,
  buildFindings,
  checkZones,
  classifyZone,
  createFixtureFetch,
  dsRecords,
  observeResolver,
  parseDohJson,
  queryDoh,
} from '../../scripts/dnssec-check.mjs';

// Every state is driven from test/fixtures/dnssec-doh.json — synthetic DoH
// bodies in the documented Cloudflare / Google shape, not a live zone. The
// suite must never need a real domain to be broken right now.
const fixture = JSON.parse(readFileSync(resolve(__dirname, '../fixtures/dnssec-doh.json'), 'utf8'));

type MockResponse = { status: number; text: () => Promise<string> };
type MockFetch = (url: string, init: { signal?: AbortSignal }) => Promise<MockResponse>;

/** The probe only needs `status` + `text()`; Response is not constructible here. */
const asFetch = (fn: MockFetch) => fn as unknown as typeof fetch;
const fixtureFetch = (data: unknown) =>
  createFixtureFetch(data as { responses: Record<string, never> }) as unknown as typeof fetch;

// The probe is plain JS, so its inferred shapes are loose. These aliases give
// the assertions real types without widening the module itself.
type Observation = {
  resolver: string;
  label: string;
  verdict: string;
  condition: string;
  probeError: boolean;
  dsPresent: boolean | null;
  soaAd: boolean | null;
  cdChecked: boolean;
  dsDigests: string[];
};
type ZoneResult = {
  zone: string;
  state: string;
  dsMismatch: boolean;
  observations: Observation[];
};
const withFixture = (zones: string[]) =>
  checkZones(zones, { fetchImpl: fixtureFetch(fixture), timeoutMs: 50 }) as unknown as Promise<ZoneResult[]>;
const findingsOf = (r: ZoneResult[]) => buildFindings(r) as string[];

const okJson = (json: unknown): MockResponse => ({ status: 200, text: async () => JSON.stringify(json) });
const observer = (id: string) => {
  const resolver = RESOLVERS.find((r) => r.id === id)!;
  return (zone: string) =>
    observeResolver(zone, resolver, {
      fetchImpl: fixtureFetch(fixture),
      timeoutMs: 50,
    }) as unknown as Promise<Observation>;
};
const observeWith = (zone: string, data: unknown, id = 'cloudflare') =>
  observeResolver(
    zone,
    RESOLVERS.find((r) => r.id === id)!,
    {
      fetchImpl: fixtureFetch(data),
      timeoutMs: 50,
    },
  ) as unknown as Promise<Observation>;

// ── DoH parsing ───────────────────────────────────────────────────────────

describe('parseDohJson', () => {
  it('accepts a documented response and keeps Status/AD/Answer', () => {
    const r = parseDohJson(
      JSON.stringify({
        Status: 0,
        AD: true,
        CD: false,
        Answer: [{ name: 'x.example.', type: 43, TTL: 1, data: '2371 13 2 AABB' }],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.status).toBe(0);
    expect(r.ad).toBe(true);
    expect(r.answers).toHaveLength(1);
  });

  it('rejects a non-JSON body (an HTML error page is not an all-clear)', () => {
    const r = parseDohJson('<html>502 Bad Gateway</html>');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not JSON/);
  });

  it('rejects a body with no Status', () => {
    expect(parseDohJson(JSON.stringify({ AD: false })).ok).toBe(false);
  });

  it('rejects a body whose AD is missing or not a boolean', () => {
    expect(parseDohJson(JSON.stringify({ Status: 0 })).ok).toBe(false);
    expect(parseDohJson(JSON.stringify({ Status: 0, AD: 'false' })).ok).toBe(false);
  });

  it('rejects a body whose Status is not a number', () => {
    expect(parseDohJson(JSON.stringify({ Status: 'NOERROR', AD: false })).ok).toBe(false);
  });

  it('rejects a non-array Answer', () => {
    expect(parseDohJson(JSON.stringify({ Status: 0, AD: false, Answer: {} })).ok).toBe(false);
  });

  it('rejects malformed answer entries instead of silently dropping them', () => {
    expect(parseDohJson(JSON.stringify({ Status: 0, AD: false, Answer: [{}] })).ok).toBe(false);
  });

  it('rejects a JSON array or scalar', () => {
    expect(parseDohJson('[]').ok).toBe(false);
    expect(parseDohJson('"NOERROR"').ok).toBe(false);
  });

  it('tolerates an absent Answer (an insecure-delegation referral has none)', () => {
    const r = parseDohJson(JSON.stringify({ Status: 0, AD: false }));
    expect(r.ok).toBe(true);
    expect(r.answers).toEqual([]);
  });
});

describe('dsRecords / apexSoa', () => {
  const ds = parseDohJson(
    JSON.stringify({
      Status: 0,
      AD: true,
      Answer: [
        { name: 'z.example.', type: 43, TTL: 1, data: '2371 13 2 AABBCC' },
        { name: 'z.example.', type: 46, TTL: 1, data: 'DS 13 2 86400 sig' },
        { name: 'other.example.', type: 43, TTL: 1, data: '9999 8 1 DDEE' },
      ],
    }),
  );

  it('collects DS records case-insensitively and ignores the RRSIG', () => {
    const apexOnly = { ...ds, answers: ds.answers.filter((answer: { name: string }) => answer.name === 'z.example.') };
    expect(dsRecords(apexOnly, 'z.example')).toEqual(['2371 13 2 aabbcc']);
    expect(() => dsRecords(ds, 'z.example')).toThrow(/non-apex DS/);
    expect(() => dsRecords({ ...ds, answers: [{ name: 'z.example.', type: 43, data: 'bad' }] }, 'z.example')).toThrow(
      /malformed/,
    );
  });

  it('finds the apex SOA only for the queried owner, ignoring the trailing dot', () => {
    const soa = parseDohJson(
      JSON.stringify({
        Status: 0,
        AD: false,
        Answer: [
          { name: 'other.example', type: 6, TTL: 1, data: 'not this one' },
          { name: 'z.example.', type: 6, TTL: 1, data: 'ns1.example. hostmaster.example. 1 2 3 4 5' },
        ],
      }),
    );
    expect(apexSoa(soa, 'z.example')).toMatch(/^ns1\.example\./);
    expect(apexSoa(soa, 'missing.example')).toBe(null);
  });
});

// ── queryDoh failure modes ────────────────────────────────────────────────

describe('queryDoh', () => {
  const resolver = RESOLVERS[0];

  it('does not throw on a transport failure and reports it', async () => {
    const r = await queryDoh('z.example', 'DS', {
      resolver,
      fetchImpl: asFetch(() => {
        throw new Error('getaddrinfo ENOTFOUND');
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/getaddrinfo/);
  });

  it('reports a non-200 status as an HTTP error', async () => {
    const r = await queryDoh('z.example', 'DS', {
      resolver,
      fetchImpl: asFetch(async () => ({ status: 429, text: async () => 'rate limited' })),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('HTTP 429');
  });

  it('reports an unreadable body as an error', async () => {
    const r = await queryDoh('z.example', 'DS', {
      resolver,
      fetchImpl: asFetch(async () => ({
        status: 200,
        text: async () => {
          throw new Error('socket hang up');
        },
      })),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/request or response body failed/);
  });

  it('reports a malformed body as an error', async () => {
    const r = await queryDoh('z.example', 'DS', {
      resolver,
      fetchImpl: asFetch(async () => ({ status: 200, text: async () => 'not json' })),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/malformed DoH response/);
  });

  it('aborts on timeout instead of hanging', async () => {
    let sawSignal = false;
    const r = await queryDoh('z.example', 'DS', {
      resolver,
      timeoutMs: 20,
      fetchImpl: asFetch(
        (_url, init) =>
          new Promise<MockResponse>((_res, rej) => {
            const signal = init.signal!;
            sawSignal = true;
            signal.addEventListener('abort', () => rej(signal.reason));
          }),
      ),
    });
    expect(sawSignal).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/timed out/);
  });

  it('keeps the timeout active while reading the response body', async () => {
    const r = await queryDoh('z.example', 'DS', {
      resolver,
      timeoutMs: 20,
      fetchImpl: asFetch(async (_url, init) => ({
        status: 200,
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
          }),
      })),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/timed out/);
  });

  it('requests DS with the DO bit and only adds cd when asked', async () => {
    const urls: string[] = [];
    const fetchImpl = asFetch(async (url) => {
      urls.push(String(url));
      return okJson({ Status: 0, AD: false, Answer: [] });
    });
    await queryDoh('z.example', 'DS', { resolver, fetchImpl });
    await queryDoh('z.example', 'SOA', { resolver, fetchImpl, cd: true });
    expect(urls[0]).toContain('type=DS');
    expect(urls[0]).toContain('do=1');
    expect(urls[0]).not.toContain('cd=1');
    expect(urls[1]).toContain('type=SOA');
    expect(urls[1]).toContain('cd=1');
  });
});

// ── Per-resolver verdicts ─────────────────────────────────────────────────

describe('observeResolver verdicts', () => {
  const observe = observer('cloudflare');

  it('signed control: DS present + authenticated apex SOA → secure', async () => {
    const o = await observe('signed.example');
    expect(o.verdict).toBe(VERDICT.SECURE);
    expect(o.dsPresent).toBe(true);
    expect(o.soaAd).toBe(true);
    expect(o.condition).toMatch(/AD=true/);
  });

  it('unsigned control: no DS + unauthenticated apex SOA → unsigned, never a pass', async () => {
    const o = await observe('insecure.example');
    expect(o.verdict).toBe(VERDICT.UNSIGNED);
    expect(o.dsPresent).toBe(false);
    expect(o.soaAd).toBe(false);
  });

  it('DS present but SOA SERVFAIL → bogus, with the CD inference labelled', async () => {
    const o = await observe('bogus.example');
    expect(o.verdict).toBe(VERDICT.BOGUS);
    expect(o.condition).toMatch(/apex SOA returns SERVFAIL/);
    expect(o.condition).toMatch(/consistent with a DNSSEC validation failure \(an inference, not a proven cause/);
    expect(o.cdChecked).toBe(true);
  });

  it('a presence-only check would have called the bogus zone healthy', async () => {
    // The regression this issue exists for: DS present, validation failing.
    const o = await observe('bogus.example');
    expect(o.dsPresent).toBe(true);
    expect(o.soaAd).toBe(false);
    expect(o.verdict).not.toBe(VERDICT.SECURE);
  });

  it('DS present, SOA NOERROR but AD=false → unverified, not secure and not "missing"', async () => {
    const o = await observe('noad.example');
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
    expect(o.dsPresent).toBe(true);
    expect(o.condition).toMatch(/AD=false/);
  });

  it('does not call a non-SERVFAIL DNS refusal bogus', async () => {
    const local = {
      responses: {
        'cloudflare|refused.example|DS': {
          json: { Status: 0, AD: true, Answer: [{ name: 'refused.example.', type: 43, data: '2371 13 2 AA' }] },
        },
        'cloudflare|refused.example|SOA': { json: { Status: 5, AD: false } },
      },
    };
    const o = await observeWith('refused.example', local);
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
    expect(o.condition).toMatch(/REFUSED/);
    expect(o.condition).not.toMatch(/DNSSEC validation failure/);
  });

  it('does not call SERVFAIL a DNSSEC break when checking-disabled lookup also fails', async () => {
    const local = {
      responses: {
        'cloudflare|unavailable.example|DS': {
          json: { Status: 0, AD: true, Answer: [{ name: 'unavailable.example.', type: 43, data: '2371 13 2 AA' }] },
        },
        'cloudflare|unavailable.example|SOA': { json: { Status: 2, AD: false } },
        'cloudflare|unavailable.example|SOA|cd': { json: { Status: 2, AD: false } },
      },
    };
    const o = await observeWith('unavailable.example', local);
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
    expect(o.condition).toMatch(/cause unverified/);
  });

  it('does not count a malformed DS answer as a published delegation', async () => {
    const local = {
      responses: {
        'cloudflare|wrong-owner.example|DS': {
          json: { Status: 0, AD: true, Answer: [{ name: 'other.example.', type: 43, data: '2371 13 2 AA' }] },
        },
      },
    };
    const o = await observeWith('wrong-owner.example', local);
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
    expect(o.probeError).toBe(true);
    expect(o.condition).toMatch(/non-apex DS/);
  });

  it('partial propagation: SERVFAIL on the DS query with CD also failing → unverified', async () => {
    const o = await observer('google')('partial.example');
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
    expect(o.cdChecked).toBe(true);
    expect(o.condition).toMatch(/CD query also returned SERVFAIL/);
  });

  it('a validating DS SERVFAIL with a clean CD answer is a published DS → bogus', async () => {
    const local = {
      responses: {
        'cloudflare|cdonly.example|DS': { json: { Status: 2, AD: false } },
        'cloudflare|cdonly.example|DS|cd': {
          json: { Status: 0, AD: false, Answer: [{ name: 'cdonly.example.', type: 43, TTL: 1, data: '2371 13 2 AA' }] },
        },
      },
    };
    const o = await observeWith('cdonly.example', local);
    expect(o.verdict).toBe(VERDICT.BOGUS);
    expect(o.dsPresent).toBe(true);
  });

  it('a validating DS SERVFAIL with a NOERROR-but-empty CD answer is NOT a DS', async () => {
    const local = {
      responses: {
        'cloudflare|nodspublished.example|DS': { json: { Status: 2, AD: false } },
        'cloudflare|nodspublished.example|DS|cd': { json: { Status: 0, AD: false } },
      },
    };
    const o = await observeWith('nodspublished.example', local);
    expect(o.dsPresent).toBe(false);
    // Not a pass, and not reported as a missing DS either — the validating
    // query still failed, so the state is unverified.
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
  });

  it('malformed body → unverified', async () => {
    const o = await observe('malformed.example');
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
    expect(o.condition).toMatch(/malformed DoH response/);
  });

  it('HTTP error → unverified', async () => {
    const o = await observe('httperror.example');
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
    expect(o.condition).toMatch(/HTTP 503/);
  });

  it('timeout → unverified', async () => {
    const o = await observe('timeout.example');
    expect(o.verdict).toBe(VERDICT.UNVERIFIED);
    expect(o.condition).toMatch(/timed out/);
  });
});

// ── Zone classification ───────────────────────────────────────────────────

describe('classifyZone', () => {
  it('only two agreeing secure verdicts are clear', async () => {
    const [r] = await withFixture(['signed.example']);
    expect(r.state).toBe(STATE.SECURE);
  });

  it('two agreeing unsigned verdicts stay unsigned', async () => {
    const [r] = await withFixture(['insecure.example']);
    expect(r.state).toBe(STATE.UNSIGNED);
  });

  it('both resolvers SERVFAIL on a published DS → bogus', async () => {
    const [r] = await withFixture(['bogus.example']);
    expect(r.state).toBe(STATE.BOGUS);
  });

  it('one secure + one DNS-answer unverified (partial propagation) → inconsistent', async () => {
    const [r] = await withFixture(['partial.example']);
    expect(r.state).toBe(STATE.INCONSISTENT);
    expect(r.observations.map((o) => o.verdict)).toEqual([VERDICT.SECURE, VERDICT.UNVERIFIED]);
  });

  it('one unsigned + one secure → inconsistent', async () => {
    const local = {
      responses: {
        'cloudflare|split.example|DS': {
          json: { Status: 0, AD: true, Answer: [{ name: 'split.example.', type: 43, TTL: 1, data: '2371 13 2 AA' }] },
        },
        'cloudflare|split.example|SOA': {
          json: {
            Status: 0,
            AD: true,
            Answer: [{ name: 'split.example.', type: 6, TTL: 1, data: 'ns1.example. h. 1 2 3 4 5' }],
          },
        },
        'google|split.example|DS': { json: { Status: 0, AD: false } },
        'google|split.example|SOA': {
          json: {
            Status: 0,
            AD: false,
            Answer: [{ name: 'split.example.', type: 6, TTL: 1, data: 'ns1.example. h. 1 2 3 4 5' }],
          },
        },
      },
    };
    const [r] = (await checkZones(['split.example'], {
      fetchImpl: fixtureFetch(local),
      timeoutMs: 50,
    })) as unknown as ZoneResult[];
    expect(r.state).toBe(STATE.INCONSISTENT);
    expect(r.dsMismatch).toBe(true);
  });

  it('compares DS RRsets as sets, independent of resolver order', () => {
    const dsA = ['2371 13 2 aabb', '2372 13 2 ccdd'];
    const observations = [
      { verdict: VERDICT.SECURE, probeError: false, dsPresent: true, dsDigests: dsA },
      { verdict: VERDICT.SECURE, probeError: false, dsPresent: true, dsDigests: [...dsA].reverse() },
    ];
    const result = classifyZone('example.com', observations);
    expect(result.state).toBe(STATE.SECURE);
    expect(result.dsMismatch).toBe(false);
  });

  it('disagreeing DS records are inconsistent even when both resolvers validate', async () => {
    const [r] = await withFixture(['ds-mismatch.example']);
    expect(r.dsMismatch).toBe(true);
    expect(r.state).toBe(STATE.INCONSISTENT);
  });

  it('a probe failure on either resolver yields unknown', async () => {
    const [a] = await withFixture(['malformed.example']);
    const [b] = await withFixture(['httperror.example']);
    const [c] = await withFixture(['timeout.example']);
    expect([a.state, b.state, c.state]).toEqual([STATE.UNKNOWN, STATE.UNKNOWN, STATE.UNKNOWN]);
  });

  it('a fixture miss is never a pass', async () => {
    const [r] = await withFixture(['absent-from-fixture.example']);
    expect(r.state).toBe(STATE.UNKNOWN);
  });
});

// ── Findings text ─────────────────────────────────────────────────────────

describe('buildFindings', () => {
  it('groups the unsigned backlog into the long-standing single line', async () => {
    const results = await withFixture(['insecure.example', 'signed.example', 'bogus.example']);
    const findings = findingsOf(results);
    const unsignedLine = findings.find((f) => f.includes('no DS record published for:'));
    expect(unsignedLine).toContain('insecure.example');
    expect(unsignedLine).not.toContain('signed.example');
    expect(unsignedLine).not.toContain('bogus.example');
  });

  it('names the bogus zone, calls the state broken, and labels the CD inference', async () => {
    const results = await withFixture(['bogus.example']);
    const bogus = findingsOf(results).find((f) => f.includes('cannot be validated'));
    expect(bogus).toContain('`bogus.example`');
    expect(bogus).toMatch(/BROKEN/);
    expect(bogus).toMatch(/an inference, not a proven root cause/);
  });

  it('says nothing at all for a fully clear run', async () => {
    const results = await withFixture(['signed.example']);
    expect(findingsOf(results)).toEqual([]);
  });

  it('renders a probe failure as UNKNOWN — not as missing DS, not as an all-clear', async () => {
    const results = await withFixture(['timeout.example']);
    const line = findingsOf(results).find((f) => f.includes('could not determine'));
    expect(line).toContain('`timeout.example`');
    expect(line).toMatch(/NOT a missing DS and NOT an all-clear/);
    expect(line).not.toMatch(/no DS record published for:/);
  });

  it('renders resolver disagreement per zone with both verdicts', async () => {
    const results = await withFixture(['partial.example']);
    const line = findingsOf(results).find((f) => f.includes('resolvers disagree'));
    expect(line).toContain('`partial.example`');
    expect(line).toContain('1.1.1.1');
    expect(line).toContain('1.1.1.1: DS published');
    expect(line).toContain('8.8.8.8: DS query returned SERVFAIL');
  });
});

// ── CLI fail-closed behaviour ─────────────────────────────────────────────

describe('dnssec-check.mjs CLI', () => {
  const run = (args: string[], env: Record<string, string> = {}) =>
    spawnSync('node', args, { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, ...env } });

  it('exits non-zero with no zones, instead of reporting nothing', () => {
    const r = run(['scripts/dnssec-check.mjs'], { DNSSEC_DOMAINS: '' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/no zones supplied/);
    expect(r.stdout).toBe('');
  });

  it('returns complete machine-readable evidence when every zone is secure', () => {
    const r = run([
      'scripts/dnssec-check.mjs',
      '--json',
      '--fixture',
      'test/fixtures/dnssec-doh.json',
      'signed.example',
    ]);
    expect(r.status).toBe(0);
    const result = JSON.parse(r.stdout);
    expect(result.zones.map((zone: { zone: string; state: string }) => [zone.zone, zone.state])).toEqual([
      ['signed.example', STATE.SECURE],
    ]);
    expect(result.findings).toEqual([]);
  });

  it('runs a fixture through the CLI and prints findings on stdout only', () => {
    const r = run([
      'scripts/dnssec-check.mjs',
      '--fixture',
      'test/fixtures/dnssec-doh.json',
      'bogus.example',
      'signed.example',
    ]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^- DNSSEC:/m);
    expect(r.stdout).toContain('bogus.example');
    expect(r.stdout).not.toContain('signed.example');
    // Diagnostics stay on stderr so the workflow can pipe stdout into findings.
    expect(r.stderr).toContain('DNSSEC bogus.example: bogus');
  });

  it('reads the zone list from DNSSEC_DOMAINS when no args are given', () => {
    const r = run(['scripts/dnssec-check.mjs', '--fixture', 'test/fixtures/dnssec-doh.json'], {
      DNSSEC_DOMAINS: 'signed.example insecure.example',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('insecure.example');
    expect(r.stdout).not.toContain('signed.example');
  });
});

// ── The workflow must actually use this probe ─────────────────────────────

describe('expiry-sweep.yml DNSSEC section', () => {
  const workflow = readFileSync(resolve(__dirname, '../../.github/workflows/expiry-sweep.yml'), 'utf8');

  it('calls the tested probe instead of a bare DS presence test', () => {
    expect(workflow).toContain('node scripts/dnssec-check.mjs');
    // Guard the CODE, not the commentary: the comments legitimately explain
    // what the old `dig +short DS ...` presence test got wrong, so strip `#`
    // lines before asserting that no such call survives in the shell.
    const shell = workflow
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n');
    expect(shell).not.toMatch(/dig \+short DS/);
    expect(shell).not.toMatch(/\bdig\b/);
  });

  it('runs the actual DNSSEC workflow block: secure clears, bogus and silent probes remain findings', () => {
    const start = workflow.indexOf('DNSSEC_ZONES="$DNSSEC_DOMAINS"');
    const end = workflow.indexOf('COUNT=$(wc -l', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = workflow.slice(start, end);
    const realProbe = '"$DNSSEC_TEST_NODE" "$DNSSEC_TEST_SCRIPT" --json --fixture "$DNSSEC_TEST_FIXTURE"';
    const runBlock = (zone: string, replacement: string) => {
      const scratch = mkdtempSync(resolve(tmpdir(), 'dnssec-workflow-'));
      try {
        const script =
          'set +e -u +o pipefail\n: > findings.txt\nfinding() { echo "- $1" >> findings.txt; }\n' +
          block.replace('node scripts/dnssec-check.mjs --json', replacement);
        const result = spawnSync('bash', ['-c', script], {
          cwd: scratch,
          encoding: 'utf8',
          env: {
            ...process.env,
            DNSSEC_DOMAINS: zone,
            DNSSEC_TEST_NODE: process.execPath,
            DNSSEC_TEST_SCRIPT: resolve(__dirname, '../../scripts/dnssec-check.mjs'),
            DNSSEC_TEST_FIXTURE: resolve(__dirname, '../fixtures/dnssec-doh.json'),
          },
        });
        expect(result.status, result.stderr).toBe(0);
        return readFileSync(resolve(scratch, 'findings.txt'), 'utf8').trim().split('\n').filter(Boolean);
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    };
    expect(runBlock('signed.example', realProbe)).toEqual([]);
    expect(runBlock('bogus.example', realProbe).join(' ')).toContain('bogus.example');
    expect(runBlock('signed.example', 'true').join(' ')).toContain('no usable result');
    expect(runBlock('signed.example', 'false').join(' ')).toContain('no usable result');
  });

  it('still auto-closes only on a zero-finding run, and never on a crashed check step', () => {
    expect(workflow).toMatch(/if \[ "\$COUNT" -gt 0 \]; then/);
    expect(workflow).toMatch(/if: success\(\)/);
    expect(workflow).toMatch(/FAILED=1/);
  });

  it('keeps the certificate and registration checks and the expiry label', () => {
    expect(workflow).toMatch(/openssl s_client/);
    expect(workflow).toMatch(/rdap\.org\/domain/);
    expect(workflow).toContain('--label expiry');
  });
});
