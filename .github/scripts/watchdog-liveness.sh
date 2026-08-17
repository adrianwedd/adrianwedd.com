#!/usr/bin/env bash
# Liveness checks for the monitoring itself — the body of the "Check monitoring
# liveness" step in .github/workflows/monitor-watchdog.yml.
#
# It lives in a file, not inline in the YAML, because GitHub caps a `run:` block
# at 21,000 characters and this one grew past it (24,369). The failure mode was
# total: the API rejects the whole workflow with "Exceeded max expression length
# 21000", so the file parses fine locally, reads fine in review, and simply
# never runs — no dispatch, no schedule, no red run. Six review rounds across
# three engines read this script without noticing GitHub would refuse to load
# it; `gh workflow run` is what surfaced it.
#
# Run from the repo root with the job's env (GH_TOKEN, HOME_REPO, the threshold
# vars) exported. Writes findings.txt in the working directory and its two
# outputs to $GITHUB_OUTPUT.

set +e -u +o pipefail
# `set +e` and `+o pipefail` are deliberate and load-bearing, NOT sloppy.
#
# GitHub Actions runs `run:` blocks as `bash -e {0}`, so -e is already on
# before this script starts. These scripts are ACCUMULATORS: they probe
# many things, record findings, and report at the end. Under -e with
# pipefail, any failing pipeline aborts the whole script — and the
# pipelines that fail are precisely the ones detecting a problem.
# `grep -o` exits 1 when it finds no matches, so an empty feed (the
# thing being checked for) killed the script instead of reporting it:
# verified against the real scripts on ubuntu:24.04, where the integrity
# check aborted after 2 findings out of 5 and exited 1. The workflow then
# reports "failed" with no issue and no detail, which is strictly worse
# than the failure it was built to catch.
#
# Every command whose failure matters is checked explicitly by value
# (`if [ -z "${VAR:-}" ]`) or by `if ! cmd`. -u stays on to catch typos.
: > findings.txt
NOW=$(date -u +%s)

# Repos whose workflows are checked for the disabled/stuck traps.
REPOS="
adrianwedd/adrianwedd.com
adrianwedd/status
adrianwedd/twitb-status
adrianwedd/failurefirst-status
"

# repo|workflow file|max hours since last run.
#
# These are COARSE deliberately — they catch "the workflow is disabled or
# deleted", not "a run was late". For the social crons the tight
# threshold already exists elsewhere and is better: the worker's own
# heartbeats flag the publish cron at 80 minutes (worker/src/heartbeat.ts).
# So 2h here is ~12x the 10-minute cadence, not 3-4x, and that is the
# intended division of labour rather than a slack threshold. The failure
# this list catches does not fix itself, so finding it hours late costs
# nothing, while a tight threshold would just generate false alarms from
# GitHub's best-effort scheduler.
#
# NOTE on e2e.yml: it also runs on pull requests, so a busy PR week
# satisfies this check without the nightly having fired. It is a
# weaker signal than the others by design — the nightly's own failures
# are already visible as failed runs.
#
# This list includes the two new weekly sweeps and monitor-watchdog
# ITSELF. The sweeps are on GitHub Actions with no Cloudflare check-in
# of their own, so without an entry here they'd be the only unwatched
# monitoring in the estate. Self-listing is not circular: a dead
# watchdog can't report itself, but the withheld check-in makes the
# Cloudflare cron email — this entry catches the narrower case where
# the schedule is dropped while manual dispatches keep passing.
# 4th field: alert when the LAST run FAILED, not just when it stopped.
#
# Freshness alone can't see a crashed check. expiry-sweep and
# content-integrity don't check in to Cloudflare, and their post-check
# steps are `if: success()`, so a hard crash in one of them opens no
# issue and sends no email — and a red run is still a RECENT run, so a
# created_at-only check reads it as healthy. That is a check failing
# completely silently, which is the exact thing this file exists to
# prevent.
#
# Only `yes` for workflows whose failure is unambiguously a problem.
# e2e.yml is `no`: it runs on pull requests, where a red run is often
# just a branch under development and would page constantly.
FRESHNESS="
adrianwedd/status|uptime.yml|2|yes
adrianwedd/twitb-status|uptime.yml|2|yes
adrianwedd/failurefirst-status|uptime.yml|2|yes
adrianwedd/adrianwedd.com|social-cron.yml|2|yes
adrianwedd/adrianwedd.com|worker-deploy.yml|30|no
adrianwedd/adrianwedd.com|e2e.yml|30|no
adrianwedd/adrianwedd.com|social-token-alert.yml|200|yes
adrianwedd/adrianwedd.com|content-pipeline.yml|200|no
adrianwedd/adrianwedd.com|expiry-sweep.yml|200|yes
adrianwedd/adrianwedd.com|content-integrity.yml|200|yes
adrianwedd/adrianwedd.com|monitor-watchdog.yml|4|yes
"

finding() { echo "- $1" >> findings.txt; }

# A note is something true and worth seeing that is NOT a fault: it must
# never reach findings.txt, because COUNT drives the issue, and an issue
# that can never reach zero comments hourly forever.
#
# This exists because the zombie-run branch below got it wrong for two
# weeks. It correctly concluded "Nothing is stalled" and then reported
# that conclusion as a finding, which held #582 open across 386
# comments — 360 of them the identical three-line "Still degraded"
# about three records the script itself had already cleared. The whole
# point of the zombie probe was that "an hourly false alarm is how a
# monitor teaches you to stop reading it"; emitting the negative result
# through finding() rebuilt the false alarm it was written to remove.
#
# The rule the two functions encode: finding() means SOMEONE MUST ACT.
# note() means the sweep saw something and resolved it. Anything the
# script can conclude is harmless, or that nobody can act on from here,
# is a note.
: > notes.txt
note() { echo "- $1" >> notes.txt; }

# Run names and branch names are attacker-controllable: anyone who can
# open a fork PR against a monitored repo picks `head_branch`, and a
# stuck run puts it in an issue body this bot authors. Unfiltered, that
# is a free `@team` notification blast or a plausible-looking
# `[re-authenticate](https://evil/)` link posted by a trusted account.
# Neutralise the markdown/mention metacharacters and cap the length —
# display only; the API probe below uses the RAW branch.
safe() { local s="${1//[\`\[\]()@<>*_|]/ }"; printf '%.120s' "$s"; }

# ── 1. Disabled workflows ────────────────────────────────────────────
# `state` is disabled_inactivity when GitHub auto-disables after 60
# days, or disabled_manually if a human switched it off. Both mean the
# schedule is not running; both are silent.
for REPO in $REPOS; do
  echo "=== workflows: $REPO"
  if ! WORKFLOWS=$(gh api "repos/${REPO}/actions/workflows" --paginate \
       --jq '.workflows[] | "\(.path)\t\(.state)"' 2>err.txt); then
    # An unreadable repo is itself a finding: silently skipping is how
    # a check passes while the thing it measures is broken.
    finding "Could not read workflows for \`${REPO}\` — $(head -c 200 err.txt | tr -d '\n'). Monitoring for this repo is UNVERIFIED."
    continue
  fi
  echo "$WORKFLOWS"
  # An empty-but-successful response is a silent pass: the `while read`
  # below simply wouldn't run and no disabled workflow would be found.
  # Every one of these repos has workflows, so empty means the response
  # shape changed under us.
  if [ -z "$WORKFLOWS" ]; then
    finding "\`${REPO}\` returned NO workflows — the API response shape may have changed. Monitoring for this repo is UNVERIFIED."
    continue
  fi
  while IFS=$'\t' read -r WF STATE; do
    [ -z "${WF:-}" ] && continue
    case "$STATE" in
      active) ;;
      disabled_inactivity)
        finding "\`${REPO}\` → \`${WF}\` is **disabled_inactivity** — GitHub auto-disabled it after 60 days without repo activity. Re-enable it in the Actions tab (any push to the repo also resets the clock)." ;;
      disabled_manually)
        finding "\`${REPO}\` → \`${WF}\` is **disabled_manually**. If that was deliberate, ignore; if not, re-enable it." ;;
      *)
        finding "\`${REPO}\` → \`${WF}\` has unexpected state \`${STATE}\`." ;;
    esac
  done <<< "$WORKFLOWS"
done

# ── 2. Scheduled workflows that have stopped running, or are failing ──
echo "$FRESHNESS" | while IFS='|' read -r REPO WF MAXH ALERT_ON_FAIL; do
  [ -z "${REPO:-}" ] && continue
  # Fetch timestamp AND conclusion together: a red run is still a recent
  # run, so freshness alone would report a permanently crashing check as
  # healthy.
  #
  # Exclude THIS run. The runs collection is created_at-desc and
  # includes non-completed runs (which is why `?status=in_progress` is
  # a valid filter on this same endpoint, and what section 3 relies
  # on), so for the monitor-watchdog.yml self-entry `.workflow_runs[0]`
  # is the currently-executing run: created seconds ago, status
  # in_progress, therefore always fresh and never fail-checked. Without
  # this filter the self-entry is inert — it can never produce a
  # finding, which is the silent-pass failure mode this whole file
  # exists to eliminate. jq reads the id from the environment because
  # `gh api --jq` takes no --argjson.
  # Two DIFFERENT runs answer the two questions, so they are selected
  # separately.
  #
  # Freshness asks "is the schedule still firing", and a queued run
  # answers that — it was created, so the trigger fired.
  #
  # The fail-check asks "did the check actually work", which only a
  # COMPLETED run can answer. Reading both off the same newest run
  # meant a newer queued or in_progress run masked the last completed
  # one: `[ "$RUN_STATUS" = "completed" ]` was simply false, so the
  # whole fail-check was skipped and a failing sweep went unreported
  # for as long as something newer sat pending. A check silently not
  # running is exactly what the 4th field was added to catch.
  #
  # per_page=100 (the max) so the newest COMPLETED run is still on the
  # page when pending runs sit in front of it. 30 is the API DEFAULT —
  # writing it here would have raised nothing, and a workflow with a
  # page of queued runs ahead of its last completed one would report
  # an empty conclusion, i.e. silently healthy.
  if ! RUNSJSON=$(gh api "repos/${REPO}/actions/workflows/${WF}/runs?per_page=100" 2>err.txt); then
    finding "Could not read runs for \`${REPO}\` → \`${WF}\` — $(head -c 200 err.txt | tr -d '\n')."
    continue
  fi
  # jq's own exit status matters here. Ignoring it (pipefail is off,
  # but this is the LAST command in the pipeline, so $? is jq's) would
  # turn a jq fault into an empty RUN, which the -z check below reports
  # as "no runs at all" — crying wolf about the workflow when the fault
  # was in the parse. Different problem, different message.
  if ! RUN=$(printf '%s' "$RUNSJSON" | jq -r \
    '([.workflow_runs[] | select(.id != (env.GITHUB_RUN_ID | tonumber))][0] // {}) | .created_at // ""' 2>err.txt); then
    finding "Could not parse the runs payload for \`${REPO}\` → \`${WF}\` — $(head -c 200 err.txt | tr -d '\n'). Freshness and last-conclusion for it are UNVERIFIED."
    continue
  fi
  DONEINFO=$(printf '%s' "$RUNSJSON" | jq -r \
    '([.workflow_runs[] | select(.id != (env.GITHUB_RUN_ID | tonumber)) | select(.status == "completed")][0] // {})
     | [(.created_at // ""), (.conclusion // "")] | @tsv' 2>/dev/null)
  RUN_CONCLUSION=$(printf '%s' "$DONEINFO" | cut -f2)
  if [ -z "$RUN" ]; then
    finding "\`${REPO}\` → \`${WF}\` has **no runs at all** (excluding this watchdog run)."
    continue
  fi
  if [ "${ALERT_ON_FAIL:-no}" = "yes" ] && [ -n "${RUN_CONCLUSION:-}" ]; then
    case "$RUN_CONCLUSION" in
      success|skipped|cancelled) ;;
      *)
        finding "\`${REPO}\` → \`${WF}\` last COMPLETED run concluded **${RUN_CONCLUSION}**. The schedule is still firing, so a freshness check alone would call this healthy — but the check itself is failing, so whatever it monitors is UNVERIFIED." ;;
    esac
  fi
  LAST=$(date -u -d "$RUN" +%s 2>/dev/null || echo 0)
  if [ "$LAST" -eq 0 ]; then
    finding "Could not parse last-run timestamp \`${RUN}\` for \`${REPO}\` → \`${WF}\`."
    continue
  fi
  AGEH=$(( (NOW - LAST) / 3600 ))
  echo "=== ${REPO}/${WF}: last run ${AGEH}h ago (max ${MAXH}h)"
  if [ "$AGEH" -gt "$MAXH" ]; then
    finding "\`${REPO}\` → \`${WF}\` last ran **${AGEH}h ago** (threshold ${MAXH}h). The schedule has stopped firing — check for a disabled workflow, a stuck run holding the concurrency group, or a billing/permissions problem."
  fi
done

# ── 3. Runs stuck pending or hung ────────────────────────────────────
# This is the 2026-07-21 trap: a run in `waiting` holds its concurrency
# group indefinitely, so every later run of that group never starts.
# NOTE on error handling here: an unreadable runs endpoint is REPORTED,
# not skipped. `actions/workflows` and `actions/runs` are separate REST
# endpoints, so a fine-grained PAT can grant one and not the other — in
# which case the disabled-workflow check above would pass while this
# check silently covered nothing. Silence is the failure mode this
# entire workflow exists to eliminate; it must not have its own.
for REPO in $REPOS; do
  for STATUS in waiting queued; do
    # `--paginate`, not a bare per_page. Runs come back newest-first, so
    # a single page silently truncates from the OLD end — and the old
    # end is exactly where a genuinely stuck run sits. A concurrency
    # block that backs up more than one page would hide the run causing
    # it behind the backlog it caused.
    if ! RUNS=$(gh api --paginate "repos/${REPO}/actions/runs?status=${STATUS}&per_page=100" \
         --jq '.workflow_runs[] | [.created_at, .name, .html_url, .workflow_id, (.head_branch // "")] | @tsv' 2>err.txt); then
      finding "Could not list \`${STATUS}\` runs for \`${REPO}\` — $(head -c 200 err.txt | tr -d '\n'). Stuck-run detection for this repo is UNVERIFIED (the token may have workflow read but not run read)."
      continue
    fi
    while IFS=$'\t' read -r CREATED NAME URL WFID BRANCH; do
      [ -z "${CREATED:-}" ] && continue
      NAME_D=$(safe "${NAME:-}"); BRANCH_D=$(safe "${BRANCH:-}")
      # Falling back to $NOW on a parse failure would compute age 0 and
      # silently clear a run that has been stuck indefinitely — the
      # check passing while the thing it measures is broken. Report the
      # unparseable timestamp instead.
      START=$(date -u -d "$CREATED" +%s 2>/dev/null || echo 0)
      if [ "$START" -eq 0 ]; then
        finding "\`${REPO}\`: could not parse \`created_at\` \`${CREATED}\` for \`${STATUS}\` run **${NAME_D}** — stuck-run age is UNKNOWN for it: ${URL}"
        continue
      fi
      AGEH=$(( (NOW - START) / 3600 ))
      [ "$AGEH" -lt "$STUCK_PENDING_HOURS" ] && continue

      # Age alone does NOT prove the run is blocking anything. GitHub
      # leaves behind zombie records — `queued` forever, no job ever
      # assigned, uncancellable via the API (`gh run cancel` 500s) and
      # invisible to `gh run list` once past the 100-run window. Two of
      # these (2026-03-31, 2026-05-15) sat in the status repos while
      # every later run of the same workflow completed normally.
      #
      # The old text here asserted "it is holding its concurrency group,
      # so later runs cannot start" for every aged run. For the zombies
      # that was simply false, and an hourly false alarm is how a
      # monitor teaches you to stop reading it. So test the claim: has a
      # LATER run of this same workflow actually executed since? If yes,
      # the group is demonstrably not blocked.
      # Ask the API to COUNT completed runs of this workflow created
      # after the stuck one, rather than fetching the newest and
      # comparing timestamps. Two traps avoided:
      #
      #   - `.workflow_runs[0]` assumes reverse-chronological order,
      #     which GitHub does in practice but does not document. A
      #     silent sort change would silently break the check.
      #   - reading `created_at` off an EMPTY result yields "", and
      #     `date -u -d ""` on GNU date does not fail — it returns
      #     midnight today, exit 0, so `|| echo 0` never fires. A
      #     workflow whose very first run is stuck (zero completed
      #     runs, ever) would compare against today and be dismissed
      #     as a zombie. That is this workflow's own failure mode:
      #     the check passing while the thing it measures is broken.
      #
      # Counting with a `created=>` filter is order-independent and has
      # no empty-string path.
      #
      # The filter carries the FULL timestamp, not `${CREATED%%T*}`.
      # GitHub reads a bare `>YYYY-MM-DD` as "after the END of that
      # day", so a date-only filter discards every run from the stuck
      # run's own day: verified on workflow 254306947, where
      # `>2026-07-31T00:00:00Z` counts 5 and `>2026-07-31` counts 0.
      # With STUCK_PENDING_HOURS at 2 that is not an edge case — a run
      # flagged two hours in would be called "blocking" until midnight
      # every single time. Colons need encoding inside a query value.
      #
      # It must NOT be `status=completed`, which is every terminal
      # state including `cancelled` and `skipped`. A run cancelled
      # while still queued never acquired the lock, so counting it
      # would prove nothing while reading as proof — and this very
      # workflow (254306947) has 4 cancelled runs among its completed
      # ones. Only `success`, `failure` and `timed_out` mean the run
      # actually started, which is what "the group let something
      # through" requires. `success` alone would be wrong the other
      # way: a chronically failing workflow would look permanently
      # blocked, i.e. an hourly false alarm again.
      #
      # `in_progress` counts too. A later run executing RIGHT NOW is
      # the most direct proof the group is not blocked, but its
      # `conclusion` is null until it finishes (confirmed against the
      # API), so a terminal-states-only filter would score the clearest
      # possible evidence as zero and alert that the group is stuck.
      #
      # Each status is asked for SEPARATELY and summed via
      # `total_count`, rather than fetching a page of runs and counting
      # matches in jq. total_count is the total across all pages, so
      # this is page-independent as well as order-independent: a jq
      # count over `per_page=100` would return 0 — a false "blocking" —
      # whenever the first page happened to be full of queued or
      # cancelled runs and the executed ones sat on page 2. `--paginate`
      # is not the fix here: it applies --jq per page and concatenates,
      # so a scalar-per-page expression yields several numbers and the
      # numeric guard below would reject the lot as garbage.
      #
      # A failed or unparseable probe on ANY status forces UNVERIFIED
      # rather than a partial sum, so a half-answered question can
      # never read as a confident "not blocked".
      #
      # Scoped to the stuck run's OWN branch. Concurrency groups are
      # often per-ref — this repo's e2e.yml uses
      # `group: e2e-${{ github.ref }}` — and for those, a later run on
      # a different branch is in a different group and proves nothing
      # about this one. Unscoped, a run genuinely wedged on a feature
      # branch would be waved through as a zombie because main kept
      # building.
      #
      # The trade-off runs the other way for a STATIC group: there, a
      # later run on any branch does prove the group is free, so
      # branch-scoping can under-count and cry wolf. That is the
      # direction to fail in, and the realistic case is narrow — the
      # static-group workflows here (content-integrity, expiry-sweep,
      # content-pipeline) are scheduled on main, so their stuck runs
      # and their later runs are both on main.
      #
      # `head_branch` can be absent on some event types; when it is,
      # fall back to the unscoped probe rather than sending an empty
      # filter, which would match nothing and alarm on everything.
      #
      # Parameters go through `-f`, not string-concatenation, so gh
      # URL-encodes them. Branch names legally contain `%` and `&`
      # (`git check-ref-format --branch` accepts both): hand-building
      # the query turned `foo&bar` into a stray second parameter and
      # scoped the probe to the WRONG branch, and `100%` into a broken
      # percent-escape. `-X GET` is required — gh switches to POST as
      # soon as any `-f` is present.
      BLOCKED=unknown
      EXECUTED=0
      PROBE_OK=1
      PROBE_ARGS=(-X GET "repos/${REPO}/actions/workflows/${WFID}/runs"
                  -f "created=>${CREATED}" -f per_page=1)
      [ -n "${BRANCH:-}" ] && PROBE_ARGS+=(-f "branch=${BRANCH}")
      for ST in success failure timed_out in_progress; do
        if N=$(gh api "${PROBE_ARGS[@]}" -f "status=${ST}" \
             --jq '.total_count' 2>/dev/null); then
          case "${N:-}" in
            ''|*[!0-9]*) PROBE_OK=0 ;;
            *)           EXECUTED=$(( EXECUTED + N )) ;;
          esac
        else
          PROBE_OK=0
        fi
      done
      if [ "$PROBE_OK" -eq 1 ]; then
        if [ "$EXECUTED" -eq 0 ]; then BLOCKED=yes; else BLOCKED=no; fi
      fi

      case "$BLOCKED" in
        no)
          # A NOTE, not a finding — see note() above. The probe has just
          # proved a later run executed, so there is nothing wrong and,
          # since these records are uncancellable via the API, nothing
          # anyone can do from here either. Both halves of finding()'s
          # contract fail, so it goes to the log and the step summary
          # where it stays visible without holding an issue open.
          note "\`${REPO}\`: run **${NAME_D}** has been \`${STATUS}\` for **${AGEH}h**, but a later run of the same workflow${BRANCH_D:+ on \`${BRANCH_D}\`} has actually executed since — it is a GitHub zombie record, not a concurrency block. Nothing is stalled. It cannot be cancelled via the API; clear it from the repo's Actions UI if you want it gone: ${URL}"
          ;;
        yes)
          finding "\`${REPO}\`: run **${NAME_D}** has been \`${STATUS}\` for **${AGEH}h** and NO later run of that workflow${BRANCH_D:+ on \`${BRANCH_D}\`} has executed since (nothing reached success, failure or timed_out, and nothing is running now) — it is holding its concurrency group, so later runs cannot start. Approve or cancel it: ${URL}"
          ;;
        *)
          finding "\`${REPO}\`: run **${NAME_D}** has been \`${STATUS}\` for **${AGEH}h**. Could not list later runs for workflow \`${WFID}\`, so whether it is blocking the concurrency group is UNVERIFIED — treat as blocking until checked: ${URL}"
          ;;
      esac
    done <<< "$RUNS"
  done

  # `--paginate` for the same reason as the waiting/queued listing
  # above: newest-first means one page truncates from the old end, and
  # the oldest in_progress run is the one most likely to be hung.
  if ! RUNS=$(gh api --paginate "repos/${REPO}/actions/runs?status=in_progress&per_page=100" \
       --jq '.workflow_runs[] | [.created_at, .name, .html_url] | @tsv' 2>err.txt); then
    finding "Could not list \`in_progress\` runs for \`${REPO}\` — $(head -c 200 err.txt | tr -d '\n'). Hung-run detection for this repo is UNVERIFIED."
  else
    while IFS=$'\t' read -r CREATED NAME URL; do
      [ -z "${CREATED:-}" ] && continue
      # Assigned here too, not inherited. Without this the hung-run findings
      # below read NAME_D from the waiting/queued loop above — naming the wrong
      # run — and if that loop never iterated, `set -u` kills the script on the
      # unbound variable partway through the sweep.
      NAME_D=$(safe "${NAME:-}")
      # Same reasoning as the waiting/queued loop above.
      START=$(date -u -d "$CREATED" +%s 2>/dev/null || echo 0)
      if [ "$START" -eq 0 ]; then
        finding "\`${REPO}\`: could not parse \`created_at\` \`${CREATED}\` for \`in_progress\` run **${NAME_D}** — hung-run age is UNKNOWN for it: ${URL}"
        continue
      fi
      AGEH=$(( (NOW - START) / 3600 ))
      if [ "$AGEH" -ge "$STUCK_RUNNING_HOURS" ]; then
        finding "\`${REPO}\`: run **${NAME_D}** has been \`in_progress\` for **${AGEH}h** — likely hung and holding its concurrency group. Cancel it: ${URL}"
      fi
    done <<< "$RUNS"
  fi
done

# ── 4. Is Upptime itself still checking? ─────────────────────────────
# Recorded separately because it decides whether to relay the `upptime`
# check-in to the worker, which is what makes a dead Upptime reach a
# human by email rather than only by GitHub issue.
#
# The repo is adrianwedd/status (renamed from adrianwedd/upptime on
# 2026-07-31) but the check-in NAME stays `upptime`: it is the KV key
# in the worker's EXTERNAL_SOURCES (worker/src/watchdog.ts). Renaming
# it here without deploying a matching worker change would make every
# check-in 404 as an unknown pipeline, and the watchdog would then
# email that Upptime had gone dark. Don't "tidy" the two into
# agreement in one repo.
# The probe FAILING and the run being stale both leave UPPTIME_FRESH=no,
# and both withhold the relay — so a dead PIPELINE_PAT makes Cloudflare
# email "Upptime has stopped checking in" while Upptime is perfectly
# healthy. Withholding is still the right call (this file's whole
# premise is that silence must not be the failure mode, and an
# unreadable API is not evidence of health), but the alert must not
# assert more than was actually verified. So name the cause: an
# unreachable endpoint and a genuinely dark Upptime now read
# differently in the issue, even though both escalate.
#
# The remaining gap — the EMAIL text still says "stopped checking in"
# regardless — needs the check-in to carry its reason, tracked in #587.
UPPTIME_FRESH=no
if ! LASTRUN=$(gh api "repos/adrianwedd/status/actions/workflows/uptime.yml/runs?per_page=1" \
     --jq '.workflow_runs[0].created_at // ""' 2>upperr.txt); then
  finding "Could not read \`adrianwedd/status\` uptime.yml runs — $(head -c 200 upperr.txt | tr -d '\n'). Upptime freshness is UNVERIFIED, so the relay is withheld and the Cloudflare watchdog will escalate: check \`PIPELINE_PAT\` before assuming Upptime is dark."
elif [ -z "$LASTRUN" ]; then
  finding "\`adrianwedd/status\` uptime.yml reports NO runs at all. Upptime freshness is UNVERIFIED and the relay is withheld."
else
  LAST=$(date -u -d "$LASTRUN" +%s 2>/dev/null || echo 0)
  if [ "$LAST" -eq 0 ]; then
    finding "Could not parse \`created_at\` \`${LASTRUN}\` for the last \`uptime.yml\` run — Upptime freshness is UNKNOWN and the relay is withheld."
  else
    AGEM=$(( (NOW - LAST) / 60 ))
    echo "=== upptime last run ${AGEM}m ago"
    if [ "$AGEM" -le "$UPPTIME_FRESH_MINUTES" ]; then UPPTIME_FRESH=yes; fi
  fi
fi
echo "upptime_fresh=${UPPTIME_FRESH}" >> "$GITHUB_OUTPUT"

COUNT=$(wc -l < findings.txt | tr -d ' ')
echo "count=${COUNT}" >> "$GITHUB_OUTPUT"
echo "=== ${COUNT} finding(s)"
cat findings.txt || true

# Notes are reported but deliberately NOT counted: they must not appear
# in the `count` output, which is what opens, holds open and closes the
# watchdog issue. The step summary is the right home for them — visible
# on every run to anyone who opens it, silent to anyone who doesn't.
NOTE_COUNT=$(wc -l < notes.txt | tr -d ' ')
echo "=== ${NOTE_COUNT} note(s) (not faults, not counted)"
cat notes.txt || true
# Guarded: GITHUB_STEP_SUMMARY is set by Actions but not when the script
# is run locally or under `docker run ubuntu`, and `set -u` would kill
# the sweep at the very last step, after every check had already passed.
if [ "$NOTE_COUNT" -gt 0 ] && [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    printf '### Watchdog notes — %s item(s), no action needed\n\n' "$NOTE_COUNT"
    cat notes.txt
    printf '\nThese are things the sweep saw and resolved by itself. They are not faults and do not open an issue.\n'
  } >> "$GITHUB_STEP_SUMMARY"
fi
