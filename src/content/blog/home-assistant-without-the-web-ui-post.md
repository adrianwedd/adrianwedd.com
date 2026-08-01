---
title: 'Home Assistant Without the Web UI'
description: 'The login page died, so I stopped using it. Operating Home Assistant over its APIs: three auth channels, where to write, and what silently eats your change.'
date: 2026-08-02
tags: ['engineering', 'homelab', 'home-assistant', 'raspberry-pi', 'ai-agents', 'claude-code']
draft: false
heroImage: '/notebook-assets/home-assistant-without-the-web-ui/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/home-assistant-without-the-web-ui/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/home-assistant-without-the-web-ui/video.mp4'
audioDuration: '23:19'
youtubeUrl: 'https://www.youtube.com/watch?v=kLO9T59qt9k'
videoUploadDate: 2026-08-01T21:14:00Z
autopublish: true
---

## The forced move

The login page stopped working. Not dramatically — the page loads, the form is there, and the Cloudflare Turnstile widget in the corner simply never resolves. No token, no submit. For stretches there has been no way to hand Home Assistant my credentials through a browser, which is a strange thing to discover about a box sitting three metres away on the same network, answering every request I make to it.

I could have fixed the widget. I went the other way, and I'm glad I did, because the outage didn't create the problem. It exposed one I'd been living with happily: I had been treating the web UI as the system. It isn't. It's a view. Underneath it there is a REST API, a websocket, and a Supervisor proxy, and every one of them stayed up the entire time the login page was dead.

There was a second reason, quieter and more durable than the first. UI changes leave nothing behind. No diff, no backup, no artifact you can review a week later when something has gone strange and you're trying to work out what you did. I click things, the state changes, and the only record is the state itself. Once I started driving the box over its APIs, every change became a request I could print before I sent it, log after I sent it, and read back to check it landed.

So this is the operating model I ended up with, and what each rule cost to learn. Everything below was done without a browser session, on a Raspberry Pi 4 running Home Assistant OS, most of it with an agent at the keyboard. It's a companion to [There Is No API](/blog/there-is-no-api/), which is the same house's router refusing to be automated, and to [The Limits of the Walls](/blog/the-limits-of-the-walls/), which is the discipline that keeps this kind of work from going badly. The camera fleet it touches lives in [Getting Google Nest Cameras Into Frigate NVR](/blog/getting-google-nest-cameras-into-frigate-nvr/).

One thread runs the whole way through, and it's worth stating up front because it's the actual subject: **exit 0 is not evidence**. Nearly every failure in this post reported success.

## A shell first

I lost an afternoon to key auth that "just doesn't work". The key was correct. The permissions were correct. `ssh -v` showed the offer, showed the rejection, showed nothing useful about why.

Two facts explain it, and neither is discoverable from the error.

The first: port 22 on this box is not Home Assistant OS's own sshd. It's the Advanced SSH & Web Terminal add-on, running in a container, with its own separate sshd that neither knows nor cares about the system one. The username is `pi`.

```bash
ssh -i ~/.ssh/<key> pi@<HA_HOST>
```

The second: the public key belongs in the add-on's `ssh.authorized_keys` **option**, not in a home-directory `authorized_keys` file. There is a real file on disk — `/etc/ssh/authorized_keys`, per `AuthorizedKeysFile` in the add-on's `sshd_config` — but it is _rendered from the option on every start_. Edit it directly and your change survives exactly until the next restart, at which point it evaporates and takes your explanation with it. The durable write is `POST /addons/self/options` followed by `POST /addons/self/restart`.

That still wasn't my afternoon. My afternoon was this: two keys had been concatenated into a single array element, space-separated, because an array of one looked tidier than an array of two. sshd read the first key, then read everything after the next space as a _comment_ on that key. The second key was never trusted and never mentioned. **One key per array element.** A malformed `authorized_keys` doesn't error; it just quietly holds fewer keys than you think it does.

Two more things about this shell that have each cost me something. `/home/pi` is ephemeral — it's the container's overlay root, wiped on every add-on restart or update. If you want the box to have an _outbound_ identity, to SSH to other machines, generate the keypair under `/data/.ssh_pi/` (the persistent add-on volume) and add an `init_commands` entry — an add-on option that runs as root before sshd starts — to copy it into place each boot. Anything you leave in the home directory is a draft.

And `scp` to this box does not work at all. What you get is "subsystem request failed on channel 0" and a strong urge to blame your network. Pipe instead:

```bash
ssh pi@<HA_HOST> 'cat > /tmp/x.json' < local.json
```

`pi` has passwordless sudo, which you need, because `/config` and `/backup` are root-owned and plain shell redirection into them fails. `sudo tee`, `sudo python3`, `sudo rm`.

## Three channels and a lever

The single highest-frequency mistake I make on this box returns **401**, and 401 reads like a permissions problem, so I go and look at permissions, and there is nothing wrong with them.

`SUPERVISOR_TOKEN` is exported only in a _login_ shell. A plain `ssh host 'command'` runs a non-login shell, the variable is unset, and both the `ha` CLI and every Supervisor call fail unauthorised. The token isn't wrong. It isn't there. `token_len=0`.

```bash
ssh pi@<HA_HOST> 'bash -lc "curl -s \
  -H \"Authorization: Bearer \$SUPERVISOR_TOKEN\" \
  http://supervisor/core/api/states"'
```

`bash -lc`, always. Not `zsh -lc` — on this add-on that drops into an unrelated console banner and swallows the command whole.

With the token in hand, that first channel reaches more than it looks like it should:

| Surface                             | Path                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Supervisor itself                   | `http://supervisor/addons`, `/addons/<slug>/{info,stats,options,restart}` |
| Core lifecycle                      | `http://supervisor/core/{restart,stop,start,update,check}`                |
| **The full Core REST API, proxied** | `http://supervisor/core/api/...`                                          |
| Core logs                           | `http://supervisor/core/logs`                                             |
| The Core websocket, proxied         | `ws://supervisor/core/websocket`                                          |

The third row is the one that makes the whole approach work. The Supervisor proxy serves the entire `:8123` REST API — states, services, templates, config entries, config flows — **without ever authenticating to `:8123`**. The dead login page is not in the path. `/core/api/states`, `/core/api/config`, `/core/api/config/config_entries/entry` all answer 200 from a box whose front door won't open, and `POST /core/api/template` renders Jinja against live state.

The second channel is long-lived access tokens, for callers that aren't on the box: bearer tokens against `http://<HA_HOST>:8123/api/...`. A rotation last month taught me most of what I know about them, all of it by being wrong first.

The UI says "Each token will be valid for 10 years from creation". That sentence is static boilerplate, not a statement about the token you just made. The storage layer said 365 days for the two I'd just minted. If a token's lifespan matters to you, read it from storage; don't read it off the screen that was going to say that regardless.

The Supervisor cannot mint these. `system_generated` users are refused by `auth/long_lived_access_token`, so a rotation has to bootstrap from an existing user token over the websocket — the old token creates its own replacement. Revocation works the same way, and this is the thing I had written down wrong for months: `auth/refresh_tokens` lists them, `auth/delete_refresh_token` removes one, both over that same user-authenticated websocket.

Both are scoped to the authenticating user's own tokens, so neither is any use held the Supervisor's way — and the two refuse _differently_, which is worth knowing before you spend an hour debugging the wrong half. Minting is genuinely refused: `system_generated` is checked, and the error means what it says. Revoking isn't refused at all. There's no token-type guard on `auth/delete_refresh_token`, so with the Supervisor's token it goes and looks for your token ID among the _Supervisor user's_ tokens, doesn't find it there, and reports that the token ID is invalid. A call that neither refuses nor does what you meant, complaining about the thing you named instead of the credential you used. Which is this entire post in one command.

The rule I'd most want to hand someone else: **before revoking, enumerate deployments, not owners.** One token was believed to belong to a single consumer. It was also in a second consumer's `.env`, was an admin token on another box on the fleet, and was stored twice in the password manager. Revoking it broke a service nobody knew was a consumer, and the breakage was silent — the consumer skipped every call and sat there `active (running)`, exit 0, for as long as I let it. Conversely, a token appearing in a file is not proof that the file uses it as bearer material: one appeared across thirty files purely as an identifier, and rotating it would have cost a working integration for no security gain whatsoever.

The third channel is the websocket, and it exists because REST is missing a handful of registry-level operations outright:

| Operation                     | Command                                  |
| ----------------------------- | ---------------------------------------- |
| Delete an orphaned entity     | `config/entity_registry/remove`          |
| Enable/disable a config entry | `disabled_by` is websocket-only          |
| Save a dashboard              | `lovelace/config/save`                   |
| Read/write energy config      | `energy/get_prefs` / `energy/save_prefs` |
| Mint a long-lived token       | `auth/long_lived_access_token`           |

The recipe has one subtlety that took a while to see. Run the Python _inside_ the Home Assistant container, because that's where aiohttp lives — but authenticate with the **SSH add-on's** `SUPERVISOR_TOKEN`, grabbed in a login shell and passed in with `-e`. The Core container's own token is rejected `auth_invalid` on that proxy. Same endpoint, same shape of credential, one works and one doesn't.

```bash
sudo docker exec -i -e TOK="$SUPERVISOR_TOKEN" homeassistant python3 <<'PY'
# aiohttp against ws://supervisor/core/websocket, auth with TOK
PY
```

Nothing on this path needs a restart, which makes it strictly better than editing state on disk whenever an equivalent command exists. More on that shortly.

The lever, finally, is `sudo docker`. Plain `docker` gets permission denied; with sudo it reaches the socket, and it shows you what the API structurally cannot. `sudo docker inspect homeassistant` for image, mounts, env and privilege flags. Booting an image read-only with `--entrypoint sh` to inspect files without running them. And the one that saved an update: when Core fails to start, Supervisor auto-rolls-back _and cleans the container_, so journald and `/core/logs` have nothing at all to say about why. Polling `sudo docker logs homeassistant` in a tight loop while the failing image is live is the only way to catch the stdout of a container that is about to be deleted for your convenience.

**One aside, and it's the fix nobody finds by searching the symptom.** If you reach the box through a tunnel or a reverse proxy rather than on the LAN, Core needs an `http:` block with `use_x_forwarded_for: true` and `trusted_proxies: [172.30.32.0/23]` — the Supervisor add-on docker network, which is the same range on every install — followed by a Core restart. Without it the requests fail at the proxy layer in a shape that looks exactly like a tunnel problem or a DNS problem, and you will go and debug those instead. That's the one address range in this post I haven't replaced with a placeholder, because it isn't specific to my house; it's the value.

## Where you write determines everything

Here's the thing I wish I'd understood before I made any change to this box at all: Home Assistant has five separate write surfaces, and they do not behave alike. Two of them re-read from disk and can't lose your work. One takes effect the instant you send it. One is durable but replaces the whole object. And one will accept your edit, report success, and then overwrite it during a normal restart.

This is the table. It is the most useful thing in this post.

| Surface                                                                            | How you apply it                                                           | Whether Core clobbers you                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| Plain YAML — `configuration.yaml`, `automations.yaml`, `mqtt.yaml`, `rest.yaml`    | `ha core check`, then `automation.reload` / `mqtt/reload` / `core.restart` | **No.** Re-read from disk every time.    |
| `.storage/*.json` — entity registry, lovelace, energy, auth                        | **stop → poll until gone → edit → start**                                  | **Yes, and silently.** See below.        |
| Registry over the websocket — entity removal, entry enable/disable, dashboard save | Takes effect immediately                                                   | No. Nothing to reload.                   |
| Add-on options — `ssh.authorized_keys`, and everything else in an add-on's config  | `POST /addons/<slug>/options` → `POST /addons/<slug>/restart`              | No — but it's a **full-object replace**. |
| Config entries — integrations                                                      | The REST config-flow API                                                   | No.                                      |

The add-on row has a trap with the same shape as the one this house's router pulled on me, which is what made me recognise it: `POST /addons/<slug>/options` is a full-object replace. Post only the key you're changing and every key you omitted is **deleted**. On the MQTT broker add-on that means a sparse POST quietly removes existing logins. On the SSH add-on it means deleting every authorised key except the one you just sent — locking yourself out of the box this entire way of working depends on. GET the current options — from `/addons/<slug>/info`, which returns them in an `options` object, because `/addons/<slug>/options` is POST-only and 405s on a GET — mutate the one key, and POST the whole object back. Every time.

And note the relationship between rows: the add-on _option_ is durable and survives restarts, while the _file it renders to_ does not. Both statements are true at once, and the contradiction is only apparent. The option is the source; the file is the output.

## The `.storage` rule

I disabled a camera entity by editing the entity registry, restarted Core, and watched the camera come back enabled. Every command in the sequence returned success. The file on disk, checked afterwards, contained the original value — not mine.

Core holds the registry in memory and **flushes it to disk during its own shutdown sequence.** So `edit the file → POST /core/restart` does exactly what it looks like it does, in exactly the wrong order: your change lands, then Core shuts down and writes the in-memory copy over the top of it. Success everywhere. Change gone.

The correct sequence is not a restart:

```
POST http://supervisor/core/stop
  →  WAIT until the container is actually gone
  →  edit the file
  →  POST http://supervisor/core/start
```

Note the paths. These are Supervisor _lifecycle_ endpoints, not Core API endpoints — `http://supervisor/core/stop`, not `http://supervisor/core/api/core/stop`, which 404s. It's an easy mistake to make immediately after teaching yourself that everything Core-related lives behind `/core/api/...`.

Two refinements, both of which I only have because someone reviewed the first version of this procedure and asked the obvious question.

**`POST /core/stop` returns before the container is down.** It initiates a graceful shutdown — and the flush you are trying to avoid happens _during_ that shutdown. Editing the instant the call returns races the precise event the stop exists to sidestep. So poll:

```bash
until ! sudo docker ps --format '{{.Names}}' | grep -qx homeassistant; do sleep 1; done
```

**And once Core is stopped there is no container to exec into.** This sounds obvious written down. It was not obvious in the moment, because the edit was wrapped in `sudo docker exec homeassistant python3`, which is the pattern that works for everything else. With the container gone, that block did nothing at all, reported nothing at all, and the script cheerfully went on to restart Core. Every edit skipped. Only reading the file back caught it. The edit has to run through the SSH add-on's own `sudo python3`.

Back up first, on-box, with a dated suffix. And prefer the websocket whenever an equivalent command exists — no stop window, no clobber risk, no polling loop.

## Adding an integration without a browser

The smart plug arrived during the stretch when the login page was dead. Adding an integration is the single most browser-shaped operation in Home Assistant: you click Add, you pick from a list, you fill in a form the UI builds for you from a schema you never see. There is no obvious way to do that from a terminal.

There is, though, and it's the same API the browser is calling:

```
POST /core/api/config/config_entries/flow          {"handler":"<domain>"}
      → returns flow_id + data_schema
POST /core/api/config/config_entries/flow/<flow_id>  <step payload>
GET  /core/api/config/config_entries/flow/<flow_id>  # re-read a setup step's schema
POST /core/api/config/config_entries/options/flow  {"handler":"<entry_id>"}
GET  /core/api/config/config_entries/options/flow/<flow_id>   # ditto, options flow
GET  /core/api/states                                          # verification
```

The flow _collection_ is POST-only, incidentally — `GET /core/api/config/config_entries/flow`, with no ID on the end, returns 405, which for about a minute reads like the endpoint doesn't exist. It's only the collection, though. Once you hold a `flow_id`, that flow's own resource URL answers a GET perfectly well: that's the re-read in the block above, and it's a different view on a different URL, not the same endpoint changing its mind.

There's a useful trick for a schema you have no documentation for: POST `{}` and read the `errors` the API hands back, which names its own required keys. **Its precondition matters more than the trick.** That only works when the step has at least one mandatory field with no default. A step whose fields are all optional or defaulted treats `{}` as a _valid submission_ and advances — or finalises — the flow with default values you didn't choose. If you're not sure which kind of step you're on, `GET` the flow's own resource URL instead — it re-reads the current step's schema without submitting anything. Mind which flow, though: setup flows and options flows are separate managers with separate ID spaces, so a setup `flow_id` belongs at `/core/api/config/config_entries/flow/<flow_id>`, and handing it to the `.../options/flow/<flow_id>` endpoint gets you an error rather than a schema.

Reading existing entries honestly is its own skill. `GET /core/api/config/config_entries/entry` gives you `state` and `source`, and of the 57 entries on this box, 50 load and 7 don't — which looks like seven problems and is zero. Six are `source: ignore`: discovery hits I deliberately dismissed. One is `disabled_by: user`: a decision I made on purpose. Only `setup_error` and `setup_retry` are actually broken. An agent tidying up "failures" here will helpfully undo a series of choices.

**And the deletion cascades.** `DELETE /core/api/config/config_entries/entry/<id>` removes every entity the entry owns, silently, without a restart. I removed one zombie entry and it took twelve live entities with it, along with their history. Disable instead — `disabled_by` over the websocket. The entry goes inert, and its entities keep everything they've recorded. Delete only when you've confirmed the entry owns nothing you want; the one dead cloud integration I _have_ deleted was safe precisely because it owned zero entities and I'd checked.

## Add-ons, and the subcommand that isn't

`ha apps list` prints a list of add-ons. So does `ha apps bogussubcommand`. Byte-for-byte identical output.

The argument isn't implemented; it's _ignored_. Which means the CLI will confirm any hypothesis you bring to it, and a plausible-looking subcommand you invented will appear to work, because everything appears to work. I only found it because I typed a subcommand that genuinely didn't exist and got a helpful answer. For anything where the answer matters, use the API — `curl -H "Authorization: Bearer $SUPERVISOR_TOKEN" http://supervisor/addons`. `/addons/<slug>/stats` gives you `cpu_percent` and `memory_usage`, which is the honest way to find a resource hog.

Add-on management is SSH-only, by the way. Core's long-lived tokens do not reach the Supervisor at all.

Backups have two traps stacked on each other. The default backup target is a network mount that is currently down, so you must pass `--location=.local` — **with the equals sign**, which is required. And more consequentially: the cloud backup add-on auto-prunes `/backup` according to its own retention config, which it applies to everything in there, including the backup you made ninety seconds ago for the change you're about to make. Mine vanished within minutes. A local backup is not a durable restore point while that add-on is running. Pause it, or re-verify immediately before you actually need the thing.

## The three things that still need a browser

Everything above is automatable. This is the list that isn't, and it's short enough to be worth stating precisely. It used to have a fourth entry — revoking a long-lived token — and that entry was simply wrong. `auth/delete_refresh_token` has been sitting on the websocket the whole time, and I'd never gone to look because I'd written down that it wasn't there.

**Companion-app sensor toggles.** Enabling extra phone sensors registers entities as `disabled_by: integration`, and the switch that flips them is on the _phone_, not the server. No amount of server-side access reaches it.

**OAuth consent redirects.** A real browser, a real human, a real click. There is no way around this and there shouldn't be.

**Third-party admin consoles that gate a change you made from here** — and this last one is the interesting one, which is why I've put it last and given it the most room.

The Tailscale add-on's `advertise_routes` is fully settable over the Supervisor API. I set it. The API accepted it. The option read back correctly. The add-on restarted cleanly. The route did not work, and would not work for as long as I cared to wait, because an advertised subnet does nothing until a human approves it **in the Tailscale admin console — a different browser, a different system, a different company entirely**.

That is the failure this whole post is about, wearing a different coat. Everything reads configured. Nothing is wrong. Every call you can make from the box returns exactly what it should, and none of them can tell you that the thing doesn't work, because from the box's point of view it does. Declaring victory here is the easiest mistake on the list to make, and the hardest to detect afterwards.

## Exit 0 is not evidence

Which brings me to the rule underneath everything else. Here are the failures in this post, sorted by what they reported:

The `.storage` edit that Core's shutdown overwrote — exit 0 throughout. The `sudo python3` block that silently skipped every edit because its container had been deleted — exit 0, and Core restarted afterwards as if it had worked. The consumer with a revoked token that skipped every call it was supposed to make — `active (running)`, indefinitely, no error anywhere.

And the one that took the longest to see. A set of MQTT sensors were not writing state on identical payloads — Home Assistant treats a repeated value as a non-event — so `last_reported` froze at the last time the value _changed_. A battery holding steady at a healthy voltage therefore looked, to a 120-second freshness check, exactly like a dead sensor. Forever. The fix is `force_update: true`, which is load-bearing and commented as such, because it looks like a redundant flag and removing it would break the alerting in a way nobody would connect to the change.

The proof that mattered there was negative. An arming counter was supposed to climb to five and never did; watching it for eight minutes showed it sawtooth from zero to two and reset, over and over, never reaching its gate. No error was ever raised. Nothing logged. The only way to know was to sit and watch a number fail to do something.

The same shape caught me in a template. A couple of automations spoke their assistant's answer by reading `states('conversation.…')`, and they had been silently broken for as long as they'd existed — no error, no log line, just an announcement that made no sense. A conversation agent's entity state is not its answer, and it is not `"idle"` either, which is what I'd assumed and written down. Read live, the `conversation.*` entities hold a **last-used timestamp** — or `unknown` if they've never been used. So `states()` on one returns a date, forever, and a template that renders it produces something perfectly well-formed and completely wrong. The answer only exists in the service call's `response_variable`; you have to capture it there and hand it to `tts.speak`. That isn't a tidier way to write the same automation. It's the only way the automation works at all.

So: **verify settled state, not the snapshot.** After a Core restart, wait out the settle period — and know that Home Assistant reports `state: NOT_RUNNING` for roughly a minute _after_ the API is already answering 200. HTTP 200 is not readiness. Poll `/core/api/config` on the proxy — `/api/config` if you're talking to `:8123` directly — until `state == RUNNING` before you believe any read you take in that window.

And know which resets are by design. My off-grid shutdown interlock deliberately forces its armed flag off and zeroes a related counter on every start, then re-arms itself about six minutes later. Reading that as a regression has cost me time more than once, which is a good argument for writing down the behaviours that look like bugs and aren't.

## Getting data in

Fleet health comes in over MQTT discovery: a small publisher on each machine sends semantic health, entities appear in Home Assistant automatically, and nothing is added to any YAML file. Four decisions in that publisher are load-bearing, and each of them is there because the alternative failed quietly.

**Python and paho, never `mosquitto_pub` for scheduled publishing.** Its `-P` puts the password in argv, where it's world-readable at `/proc/<pid>/cmdline` for the life of the process — once a minute, forever, on every machine. It's a small window each time and an enormous number of windows. The CLI does have a way out, a `~/.config/mosquitto_pub` file taking the same options; the trouble is that a thing on a timer is precisely where the argv form gets used, by whoever adds the unit at eleven at night, and "use the config file" is not a rule you can enforce by asking nicely. Forbid the CLI for anything scheduled and the footgun has nowhere left to go.

**Assert the CONNACK.** `connect()` returns as soon as the TCP connection is up, which is _before_ the broker has accepted your credentials. A rejected password looks precisely like success: publishes queue up locally, the process exits 0, the timer that runs it reports healthy, and nothing whatsoever reaches Home Assistant. This is exactly the silent-failure class the monitoring exists to catch, arriving inside the monitoring. And it's the tax for going in-process, in fairness: `mosquitto_pub` would have exited non-zero on that rejection. paho hands you the connection and leaves it entirely to you whether you ever look at what the broker said.

**`expire_after`, not a last will.** An MQTT last-will fires when a long-lived connection drops — but this process connects, publishes and exits by design, so an LWT would fire on every _successful_ run. `expire_after` at three times the publish interval says the same thing without lying about it.

**Retain the discovery config; do not retain the state.** Retain the discovery payload, so the entities survive a Home Assistant restart instead of disappearing until the next publish. Publish the _state_ unretained, though, because Home Assistant already stores the last state and the time remaining on its expiry across a restart — and a retained state message the broker replays on reconnect can hand an entity back a value that has already expired, briefly, as if it were fresh. Which is the whole thing the expiry was for: a dead host should go `unavailable` rather than freeze at its last good value, because a stale-but-plausible reading reads as healthy, and that's worse than no reading at all.

Flat entity names, no `device:` block: entity IDs have to stay deterministic or the automations that reference them break the next time something is re-registered.

## Standing rules, and a note on staleness

The rules that survived all of this are short, and only one of them is technical.

**Nothing that merely looks dead gets switched off unasked.** Flag it, ask, wait. One capture service on the fleet was proven dead four separate ways and is, as far as I know, still running, because nobody has said the word. That's the correct outcome.

**Prefer disable over delete.** It preserves history and it gives you a one-step rollback. The config-entry delete cascade above is the general case of why.

**Back up before every write** — on-box, dated suffix, and verified to still exist at the moment you need it.

And one last thing, which is really the honest ending. The notes I wrote this post from said Core 2026.6.4, OS 18.0, 58 config entries, 22 add-ons. When I read the box live on the day of writing, it returned 2026.7.4, OS 18.1, 57 entries, 15 add-ons. Every one of those numbers was true when it was written down. Not one of them was true when I went to publish it.

A journal is a record of what _was_ true. That's not a flaw in the journal — it's the only thing a journal can be. But it means the last verification step is always the same one: go and read the box.

---

## Appendix: prompts to hand your agent

Most of the value in the above is transferable, and the fastest way to transfer it is not prose. If you're pointing Claude Code (or anything like it) at your own Home Assistant box, the block below is the post compressed into instructions. Substitute your own values for `<HA_HOST>` and `~/.ssh/<key>`.

**Copy this into your agent's context** — `CLAUDE.md`, a system prompt, wherever your harness keeps standing rules.

```markdown
# Home Assistant operating rules

- SSH to the box as `pi@<HA_HOST>` with `-i ~/.ssh/<key>`. Port 22 is the
  Advanced SSH add-on, not the OS's sshd.
- Always run remote commands through `bash -lc`. `SUPERVISOR_TOKEN` exists
  only in a login shell; without it every Supervisor call returns 401 and
  looks like a permissions problem. Never `zsh -lc`.
- Prefer the Supervisor proxy (`http://supervisor/core/api/...`) over
  authenticating to `:8123` directly. It serves the whole Core REST API.
- Supervisor lifecycle paths are `http://supervisor/core/{stop,start,check}` —
  not under `/core/api/`.
- NEVER edit `.storage/*.json` while Core is running: Core flushes its
  in-memory copy on shutdown and will overwrite you. Sequence is
  stop → poll until the container is gone → edit → start. Never restart.
  Once Core is stopped you cannot `docker exec` into it; do the edit with the
  SSH add-on's own `sudo python3`.
- SSH keys go in the add-on's `ssh.authorized_keys` option, ONE key per array
  element. Never edit the rendered file — it is regenerated on every start.
- `POST /addons/<slug>/options` is a full-object replace. GET current options
  from `/addons/<slug>/info` (the `options` path itself is POST-only and 405s
  on a GET), mutate one key, POST the whole object back. A sparse POST deletes
  what you omit.
- Prefer disable over delete. `DELETE /core/api/config/config_entries/entry/<id>`
  cascades to every entity the entry owns, silently and without a restart. Use
  `disabled_by` over the websocket instead.
- `source: ignore` and `disabled_by: user` are decisions, not breakage.
  Do not "fix" them.
- Back up before every write, on-box with a dated suffix — and re-verify the
  backup still exists: the cloud backup add-on prunes `/backup` on its own
  retention. Pass `--location=.local` (with the equals sign) on creation.
- `ha apps` ignores unknown subcommands and prints the list anyway. Never
  infer a subcommand exists from its output; use the API.
- MQTT publishing is Python + paho with the CONNACK explicitly asserted — paho
  will not raise on a rejected one, it queues the publish and exits 0. Never
  `mosquitto_pub` for scheduled publishing: its `-P` puts the password in argv,
  world-readable at `/proc/<pid>/cmdline`, and a timer is exactly where that
  form gets used. Retain the discovery payload, not the state payload.
- `scp` does not work on this box. Pipe: `ssh ... 'cat > /path' < file`.
- Treat exit 0, the Supervisor's `{"result": "ok"}` and `active (running)` as
  "the command ran", NOT as "the change took". Verify by reading settled state
  back after the relevant reload. Poll `/core/api/config` until
  `state == RUNNING`: Core reports `NOT_RUNNING` for ~60s after the API
  answers 200.
- Three operations require a human in a browser: companion-app sensor toggles,
  OAuth consent, and third-party admin consoles (e.g. Tailscale route
  approval). Say so and stop; do not retry. Revoking a long-lived token is NOT
  one of them — `auth/refresh_tokens` lists and `auth/delete_refresh_token`
  revokes, over a websocket authenticated with a _user_ token (not the
  Supervisor's).
- Nothing that merely looks dead gets switched off unasked. Flag and ask.
```

Four task prompts follow. Each one distils a section of the post, so this doubles as an index.

**Token audit** (_Three channels and a lever_). Audit the long-lived access tokens on my Home Assistant instance and tell me what would break if each were revoked. Read lifespans from the storage layer rather than trusting the UI's "valid for 10 years" boilerplate, which is static text and was wrong on my box. For every token, enumerate _deployments_ rather than owners: grep the fleet's config files, environment files and password manager entries, and treat "one consumer owns this" as a hypothesis to disprove — I revoked a token believed to have a single consumer and broke a service nobody knew was one. Distinguish tokens used as bearer material from tokens that merely appear in files as identifiers; rotating the latter costs a working integration for no security gain. Revocation does have an API, despite what a lot of write-ups say: `auth/refresh_tokens` lists the tokens and `auth/delete_refresh_token` removes one, over a websocket authenticated with a _user_ token, so plan the rotation as fully scriptable. Do not use the Supervisor's token for either: both commands are scoped to the authenticating user's own tokens, and while minting is cleanly refused for a `system_generated` user, `auth/delete_refresh_token` has no token-type guard and will not refuse — it looks the ID up among the Supervisor user's tokens, fails to find it, and reports the token ID as invalid. Check which credential you are holding before you believe that error. And note that a consumer with a dead token can sit `active (running)` at exit 0 indefinitely, so plan to verify data flow rather than unit state after any rotation.

**Add an integration over REST** (_Adding an integration without a browser_). Add the `<domain>` integration without using the web UI, driving the config-flow API through the Supervisor proxy: `POST /core/api/config/config_entries/flow` with the handler to get a `flow_id` and schema, then POST each step's payload. That collection URL is POST-only — a GET on `.../config_entries/flow` with no ID returns 405 — but the per-flow resource `.../config_entries/flow/<flow_id>` does answer GET, so do not read the 405 as meaning the whole family is write-only. If you need to discover an undocumented schema, you may POST `{}` and read the required keys back out of `errors`, but only when the step has at least one mandatory field with no default; a step whose fields are all optional or defaulted will treat `{}` as a valid submission and advance or finalise the flow with defaults I did not choose. When unsure which kind of step you're on, re-read the schema with `GET /core/api/config/config_entries/flow/<flow_id>`, which submits nothing — note that is the setup-flow resource, not `.../options/flow/<flow_id>`, which is a separate manager and only knows options-flow IDs. Verify by reading `/core/api/states` for the new entities. If you need to undo this, disable the entry rather than deleting it — `DELETE /core/api/config/config_entries/entry/<id>` cascades to every entity the entry owns.

**Onboard an MQTT sensor** (_Getting data in_). Write a publisher that reports health from `<host>` into Home Assistant via MQTT discovery, so no YAML is added on the Home Assistant side. Use Python with paho, never `mosquitto_pub` for a scheduled publisher: its `-P` puts the password in argv, world-readable at `/proc/<pid>/cmdline` for the life of every run, and a timer is exactly where that form gets used. Explicitly assert the CONNACK before publishing — this is paho's footgun specifically, since the CLI would exit non-zero on a rejection: `connect()` returns when TCP is up, before the broker has accepted credentials, so a rejected password otherwise looks exactly like success and the process exits 0 having delivered nothing. Set `expire_after` to three times the publish interval rather than configuring a last will, because this process connects, publishes and exits by design and an LWT would fire on every successful run. Retain the _discovery_ payload so entities survive a Home Assistant restart, but publish the _state_ payload unretained: Home Assistant restores the last state and its remaining expiry itself, and a retained state message replayed by the broker can hand an entity back an already-expired value as if it were fresh. Expiry is what makes a dead host go `unavailable` instead of freezing at a stale-but-plausible value. Use flat entity names with no `device:` block so entity IDs stay deterministic. Set `force_update: true` on anything whose freshness is checked, or identical payloads will not write state.

**Diagnose "configured but not working"** (_Exit 0 is not evidence_). `<thing>` reads as correctly configured and does not work. Assume every success signal you find is uninformative: exit 0, the Supervisor's `{"result": "ok"}` and `active (running)` mean the command ran, not that the change took. Verify settled state instead of the snapshot — after any Core restart, poll `/core/api/config` on the Supervisor proxy until `state == RUNNING`, because Home Assistant reports `NOT_RUNNING` for about a minute after the API is already answering 200. If a sensor looks stale, check `last_reported` against `last_changed` before concluding anything is dead: Home Assistant does not write state on identical payloads, so a genuinely healthy sensor holding a steady value will fail a freshness check forever unless `force_update: true` is set. Establish negative proof where you can — watch the value over a window long enough to see whether it ever reaches the threshold it's supposed to. And check whether the change requires approval outside this box: an option can be set, accepted and read back correctly while the thing it configures stays dead pending a human click in a third-party console, which no call made from here will ever reveal.
