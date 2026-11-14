# WhatsApp Automation Dashboard — Technical Audit

**Repository:** `channeliamwebsite/channelwhatsapp` · **Audited commit:** `429dbad` (main, 2026-11-14) · **Branch:** `audit/whatsapp-technical-audit`
**Scope:** audit only. No source files were modified; no Meta API was contacted.

> **Correction to the assumed status:** the module table in the brief is outdated. Contacts, campaigns, analytics etc. **no longer use mock or browser-memory data**. Since PR #1 (merged 2026-11-13) all data is persisted in **Cloud Firestore** behind authenticated server routes, and the mock data files and simulator were deleted. The real remaining gap is the **Meta integration layer** (sending + webhooks), which does not exist yet.

---

## 0. Summary

| Area | Status |
|---|---|
| Build / typecheck / lint / unit tests | ✅ Pass (0 errors, 0 lint issues, 13/13 tests, 26 routes) |
| Production (Vercel) | ✅ Live; auth gate works; API returns 401 without session (fixed by PR #4) |
| Persistence | ✅ Firestore (Firebase Admin, server-side only); no mock data remains |
| Authentication | ✅ Single Super Admin, Firebase Auth + httpOnly session cookie |
| Workspace isolation | ✅ Path-scoped + `workspaceId` field, server-checked |
| Funnel engine (logic) | ✅ Implemented and unit-tested; ❌ not connected to real events |
| Meta Cloud API (sending) | ❌ Not implemented (`getSender()` returns `null`) |
| Webhooks | ❌ No endpoint, no signature validation |
| Link tracking | ⚠️ Implemented; **production returns 503** (`LINK_TRACKING_SECRET` not set/too short in Vercel) |

**Findings:** 3 CRITICAL · 8 HIGH · 9 MEDIUM · 6 LOW (see §5–6).

---

## 1. Existing architecture

| Layer | Implementation |
|---|---|
| Framework | Next.js **16.4.6** (App Router, Turbopack), React **19.3**, TypeScript 5, Tailwind CSS 4, shadcn (base-nova) + custom primitives, Lucide, Recharts |
| Next config | `cacheComponents: true`, `partialPrefetching: true` |
| Frontend | Client-rendered dashboard under `src/app/(dashboard)/`. One client store (`src/lib/store/hub-store.tsx`) loads a workspace's data from the API and saves changes optimistically via `POST /api/workspaces/{id}/sync` (diff of creates/updates/deletes), rolling back on server rejection |
| Backend | Next.js Route Handlers (`src/app/api/**`). Business logic in `src/lib/server/*` (server-only), pure rules in `src/lib/{funnel,audience,automation,contacts}/*` |
| Database | Cloud Firestore via `firebase-admin@13.10` (`src/lib/server/firebase-admin.ts`). Client SDK used **only** for sign-in. `firestore.rules` = deny all client access |
| Auth | Firebase Auth email/password → ID token → `POST /api/auth/session` → httpOnly `__session` cookie (5 days, revocation-checked). Only `SUPER_ADMIN_EMAIL` accepted. `src/proxy.ts` redirects unauthenticated page requests to `/login` |
| Hosting | Vercel (project `channeliamwebsite-channelwhatsapp`), Node `22.x` pinned via `package.json` `engines` |
| Background jobs | `GET/POST /api/cron/funnel` (Bearer `CRON_SECRET`) → automations + funnel processor. `vercel.json` schedule `0 3 * * *` (**once a day**) |
| Persistence model | **Persistent Firestore only.** Browser `localStorage` holds UI preferences only (sidebar collapsed, last workspace, notifications last-seen). No server-memory state |

### Firestore layout
```
workspaces/{w}                                  workspace profile + whatsappAccount + settings
workspaces/{w}/contacts|audienceGroups|tags|segments|templates|campaigns|automations/{id}
workspaces/{w}/recipients/{campaignId}__{contactId}   per-contact funnel state
workspaces/{w}/sends/{campaignId}:{contactId}:{step}#{attempt}   duplicate-send claim
workspaces/{w}/events/{eventId}                 funnel event idempotency
workspaces/{w}/conversations|messages/{id}      inbox (written by ingestion only)
workspaces/{w}/automationRuns|activity|clicks/{id}
auditLogs/{id} · rateLimits/{hash} · system/bootstrap
```
Indexes: `firestore.indexes.json` (deployed).

### API routes
`/api/auth/session` (POST/DELETE) · `/api/auth/revoke` · `/api/hub` · `/api/audit` · `/api/workspaces` · `/api/workspaces/[w]` (GET/PATCH/DELETE) · `/[w]/sync` · `/[w]/campaigns/[c]/[action]` (launch|pause|resume|stop) · `/[w]/conversations` · `/[w]/conversations/[conv]` · `/[w]/conversations/[conv]/messages` · `/[w]/whatsapp` · `/api/tracking/links` · `/api/tracking/clicks` · `/api/cron/funnel` · `/r/[token]`

### Environment variables (from code)
| Variable | Side | Used in | Needed for |
|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | public (by design) | `lib/client/firebase.ts` | Deployment |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | server | `lib/server/firebase-admin.ts` | Deployment |
| `SUPER_ADMIN_EMAIL` | server | `lib/server/auth.ts` | Deployment |
| `LINK_TRACKING_SECRET` (≥32 chars) | server | `lib/tracking/links.ts` | Deployment (**missing on Vercel**) |
| `CRON_SECRET` | server | `api/cron/funnel` | Deployment |
| `APP_URL` | server | `lib/server/funnel-pipeline.ts` | Tracked links in sent messages |

No WhatsApp/Meta variables are referenced in code yet.

---

## 2. Module-by-module status

Legend: ✅ done · ⚠️ partial · ❌ missing. "DB" = Firestore-backed via server routes.

| # | Module | UI | Backend / DB | Functional actions | Missing / issues |
|---|---|---|---|---|---|
| 1 | Dashboard | ✅ | ✅ computed from stored records | 7/30/90-day filter, stats, contact growth, recent campaigns, activity | Message charts stay empty until real sends exist (correct). Aggregation runs in the browser over full collections (MEDIUM, scale) |
| 2 | Workspaces | ✅ | ✅ | Create, edit (logo/brand/settings), delete (typed confirm, blocked while campaigns active), switch | Large-workspace delete may exceed function time limit (MEDIUM) |
| 3 | Contacts | ✅ | ✅ | CRUD, bulk actions, search/filter/sort/paginate, CSV/XLSX import & export, duplicates, E.164 validation, consent history, custom fields, activity | Import validates with default "India" instead of workspace default country (LOW); `xlsx` advisory (HIGH, see §6) |
| 4 | Audience groups / tags / segments | ✅ | ✅ | CRUD; unique names server-enforced; in-use deletes blocked | Server does not create group/tag entities when a contact references a new name (UI does) → dangling names via direct API (MEDIUM) |
| 5 | Campaign builder | ✅ | ✅ | 4 steps, objective, variables, preview, review, schedule | Scheduling/launch correctly blocked until WhatsApp is connected |
| 6 | Audience selection | ✅ | ✅ `resolveAudience` (groups ∪ segments) | Excludes opted-out, pending, invalid numbers, no consent record, duplicate phones | — |
| 7 | Templates | ✅ | ✅ | Create/edit drafts, header/body/footer/buttons, variables + examples, preview, delete | **No Meta submission or sync**; "Pending approval" is local only. Approved status can never be set from the client (correct) |
| 8 | Three-message funnel | ✅ | ⚠️ engine ✅, real events ❌ | Branch config, delays, exit conditions, retries, pause/resume/stop | See §3 |
| 9 | Campaign details | ✅ | ✅ | KPIs, progression, branches, recipients table, link test | Status never becomes "completed"/"failed" (HIGH) |
| 10 | Analytics / Reports | ✅ | ✅ from stored events | Date + campaign filters, CSV export, metric definitions | Empty until real events exist (correct) |
| 11 | Link tracking | ✅ | ✅ signed tokens → Firestore → funnel event | Test-link minting, click log | **Production 503**: `LINK_TRACKING_SECRET` missing/short on Vercel (CRITICAL for launch) |
| 12 | Settings | ✅ | ✅ | General, notifications, tracking/UTM, account (reset, sign out everywhere), security + audit log | — |
| 13 | WhatsApp Account | ✅ | ⚠️ | Save business name, number, Phone Number ID, WABA ID (status "pending verification") | No token storage, no verification against Meta, webhook/sync status never updated |
| — | Conversations | ✅ | ⚠️ | List, search, filters, status, unread, pagination, contact panel | Replies return 501; no webhook feeds it; outbound sends not recorded |
| — | Automations | ✅ | ✅ runner | CRUD, enable/disable, triggers, conditions, actions, delay, history | `send_template` recorded as "not sent"; message triggers need webhooks |
| — | Team members | — | — | Removed (single Super Admin) | ✅ as intended |

---

## 3. Campaign funnel audit

**Engine:** `src/lib/funnel/engine.ts` (pure, unit-tested). Recipient state: `workspaces/{w}/recipients/{campaignId}__{contactId}` with `messages[]` (step, template, status, waMessageId, attempts, clicks, timestamps), `state` (waiting/completed/exited), `exitReason`, `nextActionAt`.

**Behaviour classification after each message** (precedence): `replied` > `failed` > `clicked` > `read_not_clicked` > `not_read` ("No interaction" = sent/delivered but not read). Each branch maps to *send template X* or *exit*.

| Event | Captured how (today) | Effect on funnel | Gap |
|---|---|---|---|
| Sent | `processWorkspace` sets `sent` + `waMessageId` when the sender accepts | Starts the wait timer | Sender doesn't exist |
| Delivered | `ingestEvent({type:"delivered"})` | Status only (falls into "No interaction" if never read) | No webhook; **no `waMessageId` → recipient lookup** |
| Read | `ingestEvent({type:"read"})` | Branch `read_not_clicked` (or `clicked`) | Same as above |
| Link clicked | `/r/[token]` → `recordClick` → `ingestEvent({type:"click"})` | Branch `clicked`; conversion if goal set | ✅ genuine clicks only (signed links); production 503 (env) |
| Replied | `ingestEvent({type:"reply"})` | Exit (default) or `replied` branch | **Inbound webhook messages are not routed to `ingestEvent` for active recipients** (only to Conversations + automation trigger) |
| Failed | `ingestEvent({type:"failed", retryable})` | Retry (≤ maxAttempts) else `failed` branch / exit | Needs Meta error-code → retryable mapping |
| Opted out | `ingestEvent({type:"opt_out"})` → contact `opted_out` + consent history | Immediate exit; future sends blocked by guards | **No STOP/unsubscribe keyword detection** on inbound messages; quick-reply "Stop" not mapped |

**Guards before every send** (`checkSendGuards`): campaign running, recipient waiting, opted in + valid number + recorded consent source/date, template approved, step not already sent. Opted-out contacts are excluded at launch and re-checked before each send ✅.

**Duplicate-send prevention:** `sends/{key}#{attempt}` created with `create()` before calling the sender ✅. Event idempotency via `events/{id}` ✅.

**Simulated events:** none. The simulator was removed; no code path fabricates delivery/read/click/reply ✅.

**Funnel gaps:** campaign lifecycle (scheduled → running at `scheduledAt`; running → completed when no recipients wait; failed) not implemented (HIGH); launch marks campaign running before all recipient docs are written (MEDIUM); cron runs once a day — too coarse for hour-level funnel delays (HIGH).

---

## 4. Meta API readiness

| Capability | Present? | Notes |
|---|---|---|
| Cloud API integration / Graph requests | ❌ | 0 references to Graph API in `src/` |
| Phone Number ID config | ⚠️ | Stored per workspace (`whatsappAccount.phoneNumberId`), unverified |
| WABA ID config | ⚠️ | Stored per workspace (`whatsappAccount.wabaId`), unverified |
| Access token handling | ❌ | Not stored anywhere (by design); no secret store |
| Message sending service | ⚠️ | Interface only: `src/lib/server/sender.ts` (`MessageSender`, `getSender()` → `null`) |
| Template messages | ⚠️ | Data model + variable resolution (`lib/funnel/variables.ts`) ready; no payload builder |
| Media messages | ❌ | Types exist (image/document/audio/video); no upload/send |
| API error handling | ⚠️ | `SendResult { ok, retryable, error }` contract; no Meta error-code mapping |
| Rate-limit handling | ❌ | No throughput limiting / backoff for Graph API (dashboard API rate limits exist) |
| Template sync from Meta | ❌ | Fields exist (`metaTemplateId`, `rejectedReason`, `templateSync`) |
| Account verification | ❌ | `status` can only be "pending"/"disconnected"; never "connected" — correct until verification exists |

The UI never claims WhatsApp is connected ✅.

## 5. Webhook readiness

| Capability | Present? |
|---|---|
| `GET` verification (`hub.mode`, `hub.verify_token`, `hub.challenge`) | ❌ no route |
| `POST` event reception | ❌ no route |
| `X-Hub-Signature-256` validation (raw body HMAC with app secret) | ❌ |
| Incoming messages → Conversations | ⚠️ `ingestInboundMessage()` ready (idempotent by `waMessageId`, creates pending contact for unknown senders) |
| Status updates (sent/delivered/read/failed) → Conversations | ⚠️ `applyStatusUpdate()` ready |
| Status updates → Funnel | ⚠️ `ingestEvent()` ready but **needs `campaignId`+`contactId`**; webhooks only provide `waMessageId` |
| Duplicate event prevention | ✅ `events/{id}` + message-id doc keys |
| Event persistence | ✅ Firestore |
| Funnel event processing | ✅ engine; ❌ wiring |
| Workspace routing (`metadata.phone_number_id` → workspace) | ❌ no lookup/index |

---

## 6. Findings by severity

### CRITICAL
| ID | Finding | Location | Fix |
|---|---|---|---|
| C1 | No WhatsApp sending implementation | `src/lib/server/sender.ts` | Implement Cloud API `MessageSender` (§7) |
| C2 | No webhook endpoint or signature verification | (missing) `src/app/api/webhooks/whatsapp/route.ts` | Add GET verify + POST with HMAC-SHA256 on raw body, timing-safe compare |
| C3 | Tracked links return 503 in production | Vercel env | Set `LINK_TRACKING_SECRET` (≥32 random chars) and `APP_URL`, redeploy |

### HIGH
| ID | Finding | Location | Fix |
|---|---|---|---|
| H1 | Status webhooks can't be matched to funnel recipients | `funnel-pipeline.ts` (`ingestEvent`, `processWorkspace`) | On send, write `workspaces/{w}/waMessages/{waMessageId}` → `{campaignId, contactId, step}`; resolve in webhook |
| H2 | Inbound replies don't reach the funnel | `conversations.ts` `ingestInboundMessage` | For each active recipient of that contact, call `ingestEvent({type:"reply"})` (context `id` = replied-to message) |
| H3 | No opt-out keyword handling | `conversations.ts` | Detect STOP/UNSUBSCRIBE (+ local language variants, "Stop updates" quick-reply) → `opt_out` event + contact update |
| H4 | Campaign lifecycle incomplete (scheduled → running, running → completed, failed) | `funnel-pipeline.ts`, `api/cron/funnel/route.ts` | Add lifecycle step to the cron |
| H5 | Cron frequency once/day | `vercel.json` | Vercel Pro `*/5 * * * *`, or Google Cloud Scheduler hitting the route |
| H6 | Access token storage design missing (multi-workspace) | — | See §7 (env for single Meta Business; Secret Manager per workspace otherwise) |
| H7 | Webhook → workspace routing | `repo.ts` / indexes | Query `workspaces where whatsappAccount.phoneNumberId == metadata.phone_number_id` (+ single-field index) |
| H8 | `xlsx@0.18.5` prototype pollution (parses uploaded files in browser) and `@grpc/grpc-js` advisories (via firebase SDKs) | `package.json` | Replace `xlsx` (CSV-only or maintained parser); track grpc fixes |

### MEDIUM
M1 Launch not atomic with recipient creation (`repo.ts` `runCampaignAction`) · M2 Outbound funnel/automation sends not recorded as conversation messages · M3 Server doesn't create group/tag entities for new names (`repo.ts` `applySync`) · M4 Full-collection reads per request/save (`loadWorkspaceData`, `applySync`), client refetch after every save · M5 Large imports near Vercel 4.5 MB body limit · M6 Large workspace delete may exceed function timeout · M7 No Meta error-code → retryable mapping · M8 No outbound throughput control (Meta per-number limits / 131056 pair-rate) · M9 `rateLimits` TTL not configured (needs Blaze billing).

### LOW
L1 Mutations accept requests without an `Origin` header (`lib/server/auth.ts:43`) · L2 Template "Pending approval" set locally without Meta submission (labelled) · L3 Unused deps `@hookform/resolvers`, `@tanstack/react-table`, `react-hook-form`; `shadcn` CLI in runtime deps · L4 Dropdown menus lack arrow-key navigation · L5 Import uses India as default country · L6 Signed-in desktop/mobile UI not yet verified on production.

### Security check results
- Secrets in frontend: only `NEXT_PUBLIC_FIREBASE_*` (public by design) ✅. No secrets in git history (verified) ✅.
- Auth/authorization: every API route verifies the session + Super Admin email; mutations same-origin + rate-limited ✅ (L1).
- Workspace isolation: path + `workspaceId`; verified with live tests (41/42 passed) ✅.
- Input validation: zod schemas on every write ✅.
- Webhook signature validation: ❌ (C2).
- Logging: errors only (`console.error` of exception objects); no tokens or message bodies logged ✅. Keep this when adding the Meta client (never log access tokens or full webhook payloads with PII).

---

## 7. Database readiness

Ready: schema, ownership, indexes, unique constraints (phone/group/tag per workspace), timestamps, consent history, safe deletes, idempotency collections, audit/activity logs.
Needed for integration:
1. `workspaces/{w}/waMessages/{waMessageId}` mapping (H1).
2. Index on `workspaces.whatsappAccount.phoneNumberId` for webhook routing (H7).
3. Optional `webhookEvents/{entryId}` raw-event log (short retention) for replay/debug.
4. Outbound `messages` docs for funnel/automation sends (M2).

---

## 8. Recommended integration architecture

```
Meta Cloud API ◄── WhatsAppCloudSender (lib/server/whatsapp/client.ts)
      │                 ▲  getSender(workspace) → token + phoneNumberId
      │                 │
      │          processWorkspace / automation runner / replies  ◄── cron (*/5)
      ▼
POST /api/webhooks/whatsapp ── verify X-Hub-Signature-256 (META_APP_SECRET, raw body)
      │  route by metadata.phone_number_id → workspace
      ├─ messages[]  → ingestInboundMessage → Conversations
      │                 ├─ reply  → ingestEvent(reply) for active recipients
      │                 └─ STOP   → ingestEvent(opt_out) + contact opted_out
      └─ statuses[]  → waMessages lookup → ingestEvent(sent|delivered|read|failed)
                                          + applyStatusUpdate (Conversations)
GET  /api/webhooks/whatsapp ── hub.mode=subscribe + hub.verify_token === WHATSAPP_VERIFY_TOKEN → hub.challenge
```

**Credentials (server-side only).** The brief's variables fit a **single Meta app / single Business** setup:
`WHATSAPP_ACCESS_TOKEN` (System User token), `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `META_API_VERSION`.
Because the dashboard is **multi-workspace**, `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` should **not** be global: keep them per workspace in Firestore (fields already exist) so each client sends from its own number. If clients use **different Meta Businesses**, store per-workspace tokens in Google Secret Manager (or an encrypted field with a KMS key) — never in plain Firestore.

**Webhook handler rules:** respond 200 fast; process idempotently (event ids / `waMessageId`); never trust payload without a valid signature; read the raw body before JSON parsing.

---

## 9. Prioritized implementation roadmap

| Step | Work | Findings |
|---|---|---|
| 0 | Set `LINK_TRACKING_SECRET` + `APP_URL` on Vercel; verify signed-in UI on production | C3, L6 |
| 1 | Meta client + `getSender()` (template + text), error/retry mapping, throughput limit | C1, M7, M8 |
| 2 | Credential model (env + per-workspace IDs; Secret Manager if multi-Business); "Verify connection" (GET phone number) → set `status: connected` | H6 |
| 3 | Webhook GET verify + POST signature check + workspace routing | C2, H7 |
| 4 | `waMessages` mapping on send; statuses → funnel + conversations | H1, M2 |
| 5 | Inbound messages → conversations; reply → funnel; STOP → opt-out | H2, H3 |
| 6 | Template submit + sync (status from Meta) | — |
| 7 | Campaign lifecycle + cron cadence (Pro or Cloud Scheduler) | H4, H5 |
| 8 | Conversation replies within 24h window; media send | — |
| 9 | End-to-end campaign test on a test number; live analytics check | — |
| 10 | Hardening: atomic launch, pagination, xlsx replacement, Origin check | M1, M4, H8, L1 |

---

## 10. Files to modify during integration

**New**
- `src/lib/server/whatsapp/client.ts` — Graph API client (send template/text/media, verify phone number, list templates)
- `src/lib/server/whatsapp/errors.ts` — Meta error code → `{ retryable, message }`
- `src/lib/server/whatsapp/signature.ts` — `X-Hub-Signature-256` verification
- `src/app/api/webhooks/whatsapp/route.ts` — GET verify, POST events
- `src/lib/server/whatsapp/webhook.ts` — payload parsing + dispatch
- `src/lib/server/whatsapp/templates-sync.ts` — template submit/sync
- `tests/whatsapp-*.test.ts` — signature, payload parsing, error mapping

**Modify**
- `src/lib/server/sender.ts` — return the Cloud API sender when configured
- `src/lib/server/funnel-pipeline.ts` — write `waMessages` mapping, outbound conversation messages, lifecycle transitions, status lookup by `waMessageId`
- `src/lib/server/conversations.ts` — reply → funnel, STOP → opt-out, `sendReply` via sender
- `src/lib/server/automation-runner.ts` — dispatch `send_template`
- `src/lib/server/repo.ts` — workspace lookup by phone number id, connection status updates, atomic launch, server-side group/tag entity creation
- `src/app/api/cron/funnel/route.ts` — lifecycle + template sync steps
- `src/app/api/workspaces/[workspaceId]/whatsapp/route.ts` (+ new verify action) — connection verification
- `src/components/whatsapp/whatsapp-account-manager.tsx` — Verify button, webhook URL display, real statuses
- `src/components/templates/templates-manager.tsx` — Submit to Meta / sync
- `src/types/workspace.ts`, `src/types/funnel.ts` — connection metadata, mapping types
- `firestore.indexes.json` — `whatsappAccount.phoneNumberId`, `waMessages` if queried
- `vercel.json` — cron cadence
- `.env.example` — Meta variables (names only)
