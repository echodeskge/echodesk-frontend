# e2e-calls: Playwright against the local Asterisk

End-to-end suite for the call rail (PLAN.md CL-04). Three real browser
contexts (extensions 101/102/103) register over `ws://localhost:8088/ws` to
the Docker Asterisk from `$E2E/asterisk/` and call each other; every flow is
also checked server-side through the local API. Nothing here touches
production: the session fixture aborts any request that isn't the local web
app, the local API or the local Asterisk.

`$E2E` = `~/Echodesk/.wt/calls-e2e` (override with `E2E_DIR`).

## Running

```bash
# 1. the stack (BK-05 scripts; see $E2E/localdev/README.md)
(cd $E2E/asterisk && docker compose up -d)   # Asterisk, ws :8088, AMI :5038
$E2E/localdev/backend.sh                      # daphne :8020, DB echodesk_calls
$E2E/localdev/frontend.sh                     # next dev :3190 with NEXT_PUBLIC_CALLS_TEST_HOOK=1
$E2E/localdev/mint-tokens.sh                  # $E2E/localdev/tokens.json (admin/agent/agent2)

# 2. the suite
npm run test:e2e:calls                                           # desktop + mobile
npx playwright test -c playwright.calls.config.ts --project desktop register
npx playwright test -c playwright.calls.config.ts --list       # no stack needed
npx tsc --noEmit -p tests/e2e-calls/tsconfig.json              # type-check the suite
```

Environment overrides: `CALLS_WEB_PORT` (3190), `CALLS_API_PORT` (8020),
`CALLS_ASTERISK_WS_PORT` (8088), `E2E_TENANT` (demo), `E2E_WEB_URL`,
`E2E_DIR`, `E2E_LOCALDEV_DIR`, `TOKENS_FILE`, `E2E_ASTERISK_RECORDINGS_DIR`.

`global-setup.ts` refuses to run unless the API answers the admin token on an
lvh.me host, the web app responds and Asterisk accepts a TCP connection on the
websocket port.

## Projects

| Project | Viewport | Specs |
|---|---|---|
| `desktop` | 1440×900 | everything except `rail-mobile` |
| `mobile` | 390×844, touch | `rail-mobile.spec.ts` |

Chromium runs with `--use-fake-device-for-media-stream
--use-fake-ui-for-media-stream` (a synthetic microphone, no permission
prompt), the `microphone` permission, and `--host-resolver-rules="MAP *.lvh.me
127.0.0.1"`. `workers: 1`, `retries: 0`.

## Fixtures

- `fixtures/env.ts`: ports, hosts, token file, the dialplan test numbers
  (`*100` recording, `*200` queue, `*99` DTMF), the extension of each login and
  the request allow-list (`localhost:3190`, `*.lvh.me:8020`,
  `ws://localhost:8088`, `http://localhost:8088`, `data:`, `blob:`).
- `fixtures/session.ts`: `signIn(context, who)` puts the minted DRF token and
  the profile into `localStorage` the way the app's login does, locks the
  network down and rewrites the tenant config's `api_url` to the local API so
  the notifications socket (`call_event`) connects. `api()` is a tiny client
  for server-side assertions.
- `fixtures/agents.ts`: the `agents` test fixture. `{ a101, a102, a103, all }`,
  one signed-in context per extension (admin / agent / agent2), each on
  `/calls` with the rail open and the SIP pill `registered`. Teardown hangs
  up whatever is left and closes the contexts.
- `fixtures/rail.ts`: locators for the CL-00 testid contract and the flow
  drivers (`dial`, `waitIncoming`, `accept`, `decline`, `endCall`,
  `expectIdle`, `hangUp`, `expectTimerRunning`), plus `sipHook()` for the
  dev-only hook below.
- `fixtures/logs.ts`: `logsSince(mark)` reads `/api/call-logs/?started_after=`
  with the admin token; `waitForLogs` polls it; `expectOneRowPerSipCallId`
  asserts the dedupe contract.

Every spec hangs up in `afterEach` (`hangUpAll(agents)`). Waits are bounded:
ring detection ≤ 15 s (`RING_TIMEOUT`), actions ≤ 10 s, registration ≤ 30 s,
the "nobody answers" case waits for the dialplan's 30 s Dial timeout (≤ 45 s).

## Specs

| Spec | Flow | Server-side assertion |
|---|---|---|
| `register` | all three rails `registered`, extension shown, launcher ready dot; no non-local request | — |
| `ext-to-ext` | 101 → 102, ringing → accepted → timer runs → 101 ends | one `ended` row per leg with `answered_at`, distinct `sip_call_id`s |
| `queue-ring-both` | 103 → `*200`; 101 and 102 ring; 101 accepts; 102 shows `call-rail-answered-elsewhere` | 101 `ended`, 102 `cancelled` (never missed), 103 `ended`; same `pbx_call_id` when present |
| `hold-resume` | hold → `aria-pressed`, `data-hold`; resume | via the hook: `a=sendonly` + sender track disabled, then `a=sendrecv` + enabled |
| `dtmf` | 101 → `*99`, keypad sends 4 random digits + `#` | the digits appear as a line in `$E2E/asterisk/recordings/dtmf.log` |
| `blind-transfer` | 101 ↔ 103; 101 blind-transfers to 102; 102 answers; 101 idle | 101 `transferred` to 102; 102 `ended` inbound |
| `attended-transfer` | 101 ↔ 103; consult 102; complete; 102 ↔ 103 | 101 `transferred` (`attended`); 102's consultation leg `ended` |
| `decline-missed` | 102 declines → 101 error `sip603`; nobody answers → 30 s timeout | 102 `cancelled` on decline; 102 `missed` + missed toast on timeout |
| `busy-486` | 103 → 101 while 101 ↔ 102 | 103 error `sip486`, `busy` row; 101 stays active with the busy toast |
| `recording-webhook` | 101 → `*100` (MixMonitor + hangup handler) | `recording_url` set; `row-play` on the `/calls` row |
| `call-log-rows` | one answered and one caller-cancelled call | one row per `sip_call_id` with the right statuses; `/calls` shows each once |
| `rail-mobile` (mobile) | sheet opens on ring, Accept works, no horizontal scroll | — |

## `window.__echodeskSip` (dev-only test hook)

CL-01 exposes it from `SipService` when `NEXT_PUBLIC_CALLS_TEST_HOOK === '1'`
(the `frontend.sh` of the local stack sets it). Never present in production
builds.

```ts
interface Window {
  __echodeskSip?: {
    /** `currentLocalDescription.sdp` of the active leg's peer connection, null without a call. */
    getLocalSdp(): string | null;
    /** `track.enabled` of the first audio sender of the active leg, null without a call. */
    getSenderTrackEnabled(): boolean | null;
    /** Diagnostic snapshot: `{ sipState, hasSession, isOnHold, isMuted, ... }` (free-form, logged on failure). */
    getState(): Record<string, unknown>;
  };
}
```

`hold-resume` reads `getLocalSdp()` and checks the direction attribute of the
audio m-line (`sdpDirection()` in `fixtures/rail.ts`), and
`getSenderTrackEnabled()`. `getState()` is only read for diagnostics, so its
keys are not part of the contract.

## Test ids this suite relies on

Everything in `src/components/calls/rail/README.md` (the CL-00 contract),
with these attribute expectations:

- `call-rail-sip` — `data-state="registered"` once REGISTER succeeded.
- `call-rail-status` — `data-status` ∈ `ringing|connecting|active|ending`,
  `data-hold="true"` while on hold; absent when idle.
- `call-rail-hold` / `call-rail-mute` — `aria-pressed`.
- `call-rail-key-<k>` — `0-9`, `star`, `hash` on both keypads.

Ids **beyond the contract** (the README says panel ids are prefixed
`call-rail-` and documented by their component; CL-02 must use these names or
the integrator renames them here):

| Test id | Element |
|---|---|
| `call-rail-timer` | the mono `mm:ss` timer in the in-call view |
| `call-rail-error` | the error strip; `data-key` = the `calls.errors.*` key (`sip603`, `sip486`, …) |
| `call-rail-transfer-panel` | the "Transfer to agent" box |
| `call-rail-transfer-blind` / `call-rail-transfer-attended` | the attended/blind toggle |
| `call-rail-transfer-agent` | one agent row, `data-extension="<ext>"`, disabled when offline |
| `call-rail-transfer-number` / `call-rail-transfer-submit` | external-number input and its submit (unused by the specs today) |
| `call-rail-consultation` | the consultation bar |
| `call-rail-consult-complete` / `call-rail-consult-cancel` / `call-rail-consult-merge` | its actions |
| `missed-call-toast` | the dock's missed-call toast (exists today in `DialpadWidget.tsx`) |
| `busy-rejected-toast` | the "missed while busy" toast after a 486 |
| `phone-ready-dot` | the launcher's green dot (exists today) |
| `[data-dialpad-trigger]` | the dock launcher that opens the rail (exists today) |
| `call-row` (`data-call-id`), `row-play`, `calls-list` | the `/calls` list (exist today) |

## Dialplan expectations (BK-05 `$E2E/asterisk/conf/extensions.conf`)

- `[internal]`: `Dial(PJSIP/${EXTEN},30,b(echodesk-predial^s^1))` — the 30 s
  timeout is what `decline-missed` waits for.
- `*100`: Answer, MixMonitor, hangup handler → `/api/webhooks/call-recording-url/`,
  Playback, Wait(2), Hangup.
- `*200`: `Queue(support,tT,,,30,,,echodesk-predial)` with members 101-103.
  `queue-ring-both` has 103 as the caller, so the queue must not ring a member
  that is already in a call (`ringinuse=no`), otherwise 103's browser answers
  its own queue call with 486.
- `*99`: Answer, `Read(DIGITS,beep,8)`, `System(echo ${DIGITS} >> /var/spool/asterisk/recording/dtmf.log)`,
  SayDigits, Hangup. The recordings directory must be writable by Asterisk
  and mounted at `$E2E/asterisk/recordings`.

## Status

Written against the CL-00 contract before CL-01/CL-02/CL-03 landed and before
the local stack existed. `--list` and the suite's `tsc` pass; the specs go
green only after CL-INT merges the rail and BK-INT brings up the stack.
