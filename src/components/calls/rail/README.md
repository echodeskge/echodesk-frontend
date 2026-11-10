# Call rail

The right-side call rail replaces the dock softphone popup and the
`IncomingCallSidebar` sheet. It is a `<aside className="w-[320px] shrink-0 border-l bg-muted/35">`
sibling after `SidebarInset` in `src/app/(tenant)/layout.tsx` on `md+`, and a
`fixed inset-0 z-[47]` full-screen sheet below `md`.

Files (CL-02): `call-rail.tsx`, `softphone-panel.tsx`, `in-call-view.tsx`,
`dtmf-keypad.tsx`, `transfer-panel.tsx`, `consultation-bar.tsx`,
`caller-context.tsx`, `use-caller-context.ts`.

State comes from `useCallState()` / `useCallActions()` (`src/contexts/call-types.ts`);
access from `useCallingAccess()` (`src/lib/calling-access.ts`).

## `data-testid` contract

Unit tests (CL-02) and the Playwright suite (CL-04, `tests/e2e-calls/**`) rely on
these ids. Do not rename them without updating both.

| Test id | Element | Present when |
|---|---|---|
| `call-rail` | The rail root (`<aside>` on desktop, the sheet on mobile) | `rail.mode !== 'closed'` |
| `call-rail-sip` | SIP status pill in the header (`data-state` = `SipState`); becomes the Reconnect button when `sipState === 'failed'` | always |
| `call-rail-status` | Call status badge (`data-status` = `CallStatus`, `data-hold="true"` while on hold) | during a call |
| `call-rail-dial` | Dial number input | idle |
| `call-rail-key-<k>` | Keypad key, `<k>` in `0-9`, `star`, `hash` (idle dial pad and in-call DTMF keypad) | idle / keypad open |
| `call-rail-call` | Green Call pill | idle |
| `call-rail-accept` | Accept button | incoming `ringing` |
| `call-rail-decline` | Decline button | incoming `ringing` |
| `call-rail-end` | End call pill | `connecting` / outgoing `ringing` / `active` |
| `call-rail-mute` | Mute toggle (`aria-pressed`) | `active` |
| `call-rail-hold` | Hold toggle (`aria-pressed`) | `active` |
| `call-rail-keypad` | DTMF keypad toggle | `active` |
| `call-rail-transfer` | Transfer (opens the transfer panel) | `active` |
| `call-rail-add` | Add call (disabled, "coming soon") | `active` |
| `call-rail-speaker` | Output device picker (disabled when `setSinkId` is unavailable) | `active` |
| `call-rail-context` | Caller context section (client, tickets, recent calls, notes) | during a call |
| `call-rail-answered-elsewhere` | "Answered by {agent}" notice | `activeCall.answeredElsewhere` |
| `call-rail-minimise` | Header chevron; allowed only during a call | during a call |
| `call-rail-close` | Header close; allowed only when idle | idle |

Additional ids inside the panels (transfer list rows, consultation bar actions,
caller-context retry) are prefixed `call-rail-` as well and documented in the
component that owns them.

## i18n key ownership

New keys go to `src/i18n/pending/<wp>.json` (`{"en": {...}, "ka": {...}}`); only the
integrator merges them (`node scripts/merge-i18n-pending.mjs` refuses overlaps).

| Namespace | Owner | Notes |
|---|---|---|
| `calls.errors.*` | CL-01 | One key per `CallError.key` (`micDenied`, `sip486`, ...) |
| `calls.rail.*` | CL-02 | Every string rendered by `src/components/calls/rail/*` |
| `calls.access.*` | CL-03 | Gate messages on `/calls` and the PBX settings layout |
| `featureGate.*` | CL-03 | `FeatureGate.tsx` |
| `calls.settings.*` | CL-03 | Settings additions (`SipConfigForm`, `UserPhoneAssignments`) |

CL-00 adds no i18n keys.
