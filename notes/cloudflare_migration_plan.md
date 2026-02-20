# Hamlet on Cloudflare: Implementation Strategy

## Executive Summary
Migrating Hamlet to Cloudflare is not only feasible but arguably **more aligned with the Hamlet philosophy** ("A Few Weird Holes") than the current Node.js setup.

The strict separation of **Elm Logic** (Pure) from **Runtime Effects** (Ports) means the business logic is portable. We simply need to swap the "Node.js Effect Runner" for a "Cloudflare Worker Effect Runner".

## Architecture Map

| Layer | Current (Node.js) | Cloudflare + Hyperdrive | Cloudflare + D1 |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js + Express (Monolithic) | Workers (Microservices) | Workers (Microservices) |
| **Logic** | Elm Worker (via `elm-node`) | Elm Worker (Standard Web) | Elm Worker (Standard Web) |
| **Routing** | `ProjectLoader` (Dynamic FS) | Cloudflare DNS / Routing | Cloudflare DNS / Routing |
| **Database** | Shared Postgres (Pool) | **Existing Postgres via Hyperdrive** | Dedicated D1 per Project |
| **KV** | In-Memory / Redis | Dedicated KV Namespace | Dedicated KV Namespace |
| **Assets** | Express Static Middleware | Cloudflare Pages / Assets | Cloudflare Pages / Assets |
| **Events** | `node-cron` (Centralized) | Cloudflare Cron Triggers | Cloudflare Cron Triggers |
| **File Storage** | Local disk / S3 | R2 (S3-compatible) | R2 (S3-compatible) |

## Strategic Pivot: The "One Worker Per Project" Model

The "Multi-Project Server" logic we built for Node.js (`ProjectLoader`) exists because Node.js processes are heavy and expensive.

Cloudflare flips this constraint:
1.  **Workers are lightweight**: You can deploy 100 separate workers for free.
2.  **Routing is built-in**: Cloudflare handles `app1.com` -> `Worker A` and `app2.com` -> `Worker B`.
3.  **Isolation is better**: If `Horatio` crashes, `Ophelia` is unaffected.

### Revised Architecture
Instead of one "Hamlet Worker" that loads multiple projects, we will have:
- **`app/horatio/wrangler.toml`**: Configures the Horatio Worker + its database binding.
- **`app/ophelia/wrangler.toml`**: Configures the Ophelia Worker + its database binding.

This simplifies the runtime significantly:
- No `ProjectLoader`.
- No `routes` map (Cloudflare does it).
- No shared database complexity (unless desired).

### Dual-Target Capability: "The Hybrid Path"

The `buildamp` tool will be upgraded to support **Build Targets**. This allows you to deploy the exact same application code to either environment.

**1. `buildamp build --target=node` (Legacy / Private Cloud)**
- **Behavior**: Generates `.generated/` files for dynamic loading by `hamlet-server`.
- **Architecture**: Multi-Project Monolith (`ProjectLoader`).
- **Use Case**: Deploying on a single EC2 instance / tiny VM to save costs or keep data strictly on-prem.

**2. `buildamp build --target=worker` (Cloudflare)**
- **Behavior**: Generates a bundled `worker.js` entry point that statically imports all handlers.
- **Architecture**: Single-Project Microservice.
- **Use Case**: Zero-maintenance, scale-to-zero, edge-deployed internal tools.

**Why this works**:
The *Core Logic* (Elm Handlers, SQL Queries, Route Defs) is identical. Only the *Glue Code* (the "Runtime Adapter") changes.

## Decision Guide: AWS vs. Cloudflare

| Feature | AWS (Node.js Monolith) | Cloudflare (Worker Microservices) |
| :--- | :--- | :--- |
| **Data Sovereignty** | **High**. You own the disk, the DB, the network. Total control. | **Medium**. You are married to Cloudflare's platform APIs (D1, KV). |
| **Cost Model** | **Fixed**. You pay for the EC2/RDS instance regardless of traffic. | **Usage-Based**. Free for low traffic; scales linearly with use. |
| **Deployment** | **Slow**. provisioning servers, Docker containers, updates take minutes. | **Instant**. `wrangler deploy` takes seconds. Global propagation. |
| **Complexity** | **High**. You manage OS updates, PM2, reverse proxies, SSL certs. | **Zero**. No OS to manage. SSL is automatic. |
| **Latency** | **Centralized**. Fast for users near the data center (us-east-1). | **Global**. Logic runs near user (Edge). DB reads slightly slower if not using D1. |
| **Fit for Hamlet** | **Good** for a "closet server" hosting 50 tiny internal apps on one $5 box. | **Perfect** for "set and forget" apps that might sit idle for weeks then burst. |

### The "Hamlet Sweet Spot"
- If you have **one robust server** (like a Mac mini in a closet or a reserved EC2 instance) and want to host *everything* on it -> **Target: Node**.
- If you want to deploy a tool and **never worry about the server crashing** or the disk filling up -> **Target: Worker**.

## Total Cost of Ownership (Monthly)

| Item | AWS (self-hosted) | AWS (managed) | CF + Hyperdrive | CF + D1 | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Compute** | $5 (t3.micro) | $8 (t3.micro) | $5 (Workers Paid) | $5 (Workers Paid) | CF includes 10M requests. |
| **Database** | $0 (self-hosted Postgres) | $15+ (RDS) | $0–5 (Neon/Supabase free or cheap) | $0 (D1 included) | Hyperdrive needs external Postgres. Neon free tier: 0.5GB. |
| **SSE/Realtime** | $0 (in-process) | $0 (in-process) | $0 (DO free tier) | $0 (DO free tier) | 400K GB-s free. A 10MB DO runs 24/7 for ~26K GB-s — effectively unlimited at Hamlet scale. |
| **Storage (Images)** | $0 (local disk) | $0.023/GB (S3) | $0 (R2) | $0 (R2) | R2 free tier: 10GB storage. |
| **Data Transfer** | $0.09/GB out | $0.09/GB out | $0 (free egress) | $0 (free egress) | Cloudflare's killer feature. |
| **SSL/Ops** | Manual (Let's Encrypt, OS, PM2) | ACM + patching | Automatic | Automatic | |
| **TOTAL** | **~$5** | **~$23+** | **~$5–10** | **~$5** | |

**Cost notes**: The CF floor is real at ~$5. DO-based SSE adds effectively nothing — you'd need ~15 always-on Durable Objects to exceed the free tier. The main variable on the Hyperdrive path is Postgres hosting: free tiers (Neon, Supabase) cover light use; paid plans run $10–25/mo. A fixed EC2 has a predictable bill regardless of traffic, but you're managing the box.

### Multi-Project Scaling (The Pricing Myth)
It is a common misconception that "One Worker per Project" means "$5 per Project". **This is false.**

*   **AWS**: You have one instance ($5). You cram 10 apps onto it. They fight for resources.
*   **Cloudflare**: You simply add more Workers (`app-1`, `app-2`, `app-10`).
    *   **The Cost**: Still **$5/mo total**. (Until you hit the 10M request cap).
    *   **The Isolation**: Perfect. App 1 cannot crash App 2.
    *   **Durable Objects**: You can have 100 different Durable Objects (one per project) all billing to the same $5 subscription.

**Verdict**: Cloudflare allows "Microservice Isolation" at "Monolith Pricing". You get the architecture benefits of separation without the bill multiplying.

### The "Clean Break" Strategy (Scaling Up)
What happens if `Horatio` suddenly gets popular and you want to move it to a dedicated Business Account?

1.  **Code Migration**: 10 seconds.
    *   Change `account_id` in `wrangler.toml`.
    *   Run `wrangler deploy`. Done.
2.  **Data Migration**: Depends on database strategy.
    *   *Hyperdrive*: Point the new Worker at the same Postgres instance. Done.
    *   *D1*: Manual dump/restore (`wrangler d1 export` -> `wrangler d1 execute`).

**Result**: You can incubate 50 apps on your "Lab" account. When one "graduates", you evict it to its own account with zero code changes.

### The "Incubator Strategy" (Hybrid Deployment)
This is the ultimate Hamlet workflow:

1.  **The Monolith (AWS)**: Run 50 small, experimental apps on one EC2 instance.
    *   *Build*: `hamlet build --target=node --projects=*`
    *   *Cost*: Fixed $20/mo (EC2 + RDS).
    *   *Role*: **The Incubator**. Low friction, shared resources.

2.  **The Graduation (Cloudflare)**: `Horatio` becomes mission-critical.
    *   *Action*: Peel it off.
    *   *Build*: `hamlet build --target=worker --project=horatio`
    *   *Deploy*: `wrangler deploy`.
    *   *Role*: **The Graduate**. Isolated, distinct billing, global scale.

**The Power**: You don't choose "AWS vs Cloudflare" for the *project*. You choose it for the *app lifecycle stage*.

### The Identity Question: AWS Cognito vs. Cloudflare Access
**Cognito** is a draw for public-facing apps with progressive auth.

**1. AWS Cognito ("The Toolkit")**
*   **What it is**: A user database (User Pools) + Federation (Google/Facebook Login).
*   **Use Case**: You are building a **Public SaaS** where random internet users sign up.
*   **Dev Experience**: Heavy SDKs, complex token verification.

**2. Cloudflare Access ("The Bouncer")**
*   **What it is**: A Zero-Trust Identity Aware Proxy.
*   **Use Case**: You are building **Internal Tools / B2B Apps**.
*   **How it works**:
    *   You put `horatio.hamlet.com` behind Access.
    *   User visits -> Cloudflare asks for Google/GitHub/SSO login -> User approves.
    *   Worker receives a header: `Cf-Access-Jwt-Assertion`.
    *   **Worker Logic**: "Who is this?" -> "It's Justin". Done.
*   **Cost**: Free for up to 50 users.

**Recommendation**:
*   **Progressive Authentication (Your Strategy)**:
    Since you want "Anonymous Sessions" -> "Upgrade to Google", **Cloudflare Access will NOT work**. Access is a hard gate (you can't see the site until you login).
    *   **Solution**: Use **Cognito** (or Auth0/Supabase) integrated *inside* the Worker.
    *   **How**:
        1.  Visitor arrives -> Worker generates `session_id` cookie (Anonymous Profile).
        2.  User clicks "Login" -> Redirect to Cognito Hosted UI.
        3.  Callback -> Worker verifies JWT -> **Merges** Anonymous Profile into User Profile.

    *   **Verdict**: Cloudflare Workers interact with Cognito APIs (via REST) just fine. It's fully supported.

### Is Cognito "The Best"? (Verdict)

*   **For Cost**: **Yes (Unbeatable)**. The free tier (50,000 MAU) is massive. Auth0 gets expensive very fast.
*   **For Logic**: **It's Neutral**.
    *   *The Trap*: Cognito "Identity Pools" has a feature called "Unauthenticated Identities" that *can* merge users. **Do not use it.** It forces you to use the heavy AWS SDK on the client and locks your logic into AWS IAM.
    *   *The Hamlet Way*: Use **Cognito User Pools** just for "Verifying Credentials". Keep the "Guest -> User Merge" logic in your **Elm/DB** layer.
*   **Conclusion**: Use Cognito because it's cheap, robust, and standard. But don't expect it to magically handle the "data merging". Your code needs to do that.

```elm
-- progressive_auth_flow.elm
-- 1. Guest arrives -> ID: "guest_abc" -> Saved in DB
-- 2. User logs in -> ID: "user_123" (from Cognito)
-- 3. Worker Logic: UPDATE items SET user_id = "user_123" WHERE user_id = "guest_abc"
```

### The "Death of Multi-Tenancy" (Simplification)

**Host Injection is dead** — but only on the D1 path.

*   **Node.js**: We inject `WHERE host = ?` into every SQL query because all apps share one database.
*   **Cloudflare + D1**: Each project gets its own D1 database. No host column needed.
*   **Cloudflare + Hyperdrive**: If you keep one shared Postgres, you still need host injection. Multi-tenancy only dies if each Worker gets its own database (or schema).

**Result**: The Generator (`buildamp`) can conditionally skip tenant injection for the `worker` target *only when using per-project databases*.

### The "Build vs. Gen" Separation

`buildamp` should remain a pure **Code Generator** (Elm -> JS/SQL). Deployment logic belongs in a higher-level tool.

**1. `buildamp gen` (The Universal Generator)**
*   Responsibility: "Translate Elm Types to Code".
*   Output: `src/Api/Handlers/*.js`, `schema.sql`.
*   *Does not know or care about Cloudflare vs AWS.*

**2. `hamlet build` (The System Assembler)**
*   **New Command**: This is where the fork happens.
*   **Usage**:
    *   `hamlet build --target=node` -> Wires up `hamlet-server` + `ProjectLoader`.
    *   `hamlet build --target=worker` -> Bundles the generated files into `worker.js`.

**Why this is better**:
*   `buildamp` stays focused. It can be used by other frameworks.
*   `hamlet` owns the "Opinionated Architecture" (Cloudflare vs Node).

## Key Technical Challenges

### 1. The "No FS" Constraint ("Bundling")
**Current**: `hamlet-server` uses `fs` to look up handlers, schemas, and routes at runtime (`packages/hamlet-server/core/project-loader.js`).
**Cloudflare**: No filesystem access at runtime.
**Solution**: **Build-Time Bundling**.
- We need a **bundler step** (likely via `esbuild` or `vite`) that generates a single `worker-entry.js` file.
- This entry file must statically import all compiled Elm handlers and generated API routes.
- No dynamic `require()` or `fs.readdirSync()`.
- **Action**: Create a `packages/hamlet-worker` that includes a build script to generate this static entry point.

### 2. Database Strategy

Two viable paths. Not mutually exclusive — Hyperdrive first, D1 later if desired.

**Option A: Hyperdrive + Postgres (Recommended starting point)**
- Keep existing Postgres database. No SQL changes, no data migration.
- Hyperdrive maintains edge connection pools, eliminating cold-start connection overhead.
- All current `elmTypeToSql` mappings work: `JSONB`, `TIMESTAMP WITH TIME ZONE`, `gen_random_uuid()`, `RETURNING`, foreign keys.
- Driver swap: `pg` → `pg` over Hyperdrive (same wire protocol).
- **Trade-off**: You still need Postgres hosting (Neon, Supabase, RDS, or self-hosted).

**Option B: D1 (SQLite)**
- Native to Cloudflare. No external database to manage. Included in $5/mo.
- Requires `translateQueryToSQL` dialect support: `$1` → `?`, no `RETURNING`, no `JSONB` type, no `gen_random_uuid()`.
- D1 limitations to be aware of:
  - No foreign key enforcement by default (requires `PRAGMA foreign_keys = ON` per connection, and D1 connections are ephemeral).
  - No `ALTER TABLE DROP COLUMN`.
  - 10GB limit per database on paid plan.
  - Read replicas are eventually consistent — a write may not be visible to the immediately following read.
  - `elmTypeToSql` is deeply Postgres-specific today. The dialect translation is significant work: `JSONB` → `TEXT`, `TIMESTAMP WITH TIME ZONE` → `TEXT` or `INTEGER`, UUID generation moves to application code.
- **Trade-off**: Cheaper and simpler operationally, but more upfront generator work and weaker data integrity guarantees.

### 3. File Storage (R2)
- **Node.js**: Writes to local disk (`storage/blobs/`) or S3 via the blob-storage middleware adapter.
- **Cloudflare**: Must use **R2** (S3-compatible). No disk access in Workers.
- The blob-storage middleware already has a pluggable adapter pattern with local and S3 backends. The S3 adapter works with R2 from Node (via endpoint URL). A native R2 adapter using `env.BUCKET` bindings would live in `packages/hamlet-worker/`.
- **Request body limit**: Workers have a 100MB request body limit on the paid plan (1MB on free). This constrains maximum upload size.

### 4. Elm Port Binding
**Current**: `packages/hamlet-server/middleware/elm-service.js` binds ports to `pg` and `fs`.
**Cloudflare**: `packages/hamlet-worker/src/elm-runtime.js`
- Binds `dbFind` -> `env.DB.prepare(...).bind(...)` (D1) or `pool.query(...)` (Hyperdrive)
- Binds `kvSet` -> `env.KV.put(...)`
- Binds `log` -> `console.log`

**Note**: The TEA handler pool pattern from `elm-service.js` assumes in-process state between requests. Workers are stateless — each request gets a fresh isolate. The pool concept doesn't translate. Each Worker invocation initializes a fresh Elm app, handles one request, and exits. This simplifies state management but may affect performance for handlers that rely on warm caches.

### 5. Cold Starts

Workers themselves have near-zero cold starts (~5ms isolate init). The real latency comes from downstream resources:

- **Hyperdrive**: Maintains warm connection pools at the edge. First request to a new edge location pays a ~50ms TCP/TLS handshake to the pool; subsequent requests reuse connections. This is Hyperdrive's main selling point.
- **D1**: Read replicas are edge-local (fast). Writes go to a single primary region (~50–150ms depending on distance). Cold reads on a previously-unused edge location may take ~100ms to hydrate the replica.
- **Durable Objects**: Hibernated DOs take 100–300ms to wake. If your app is idle for minutes, the first reconnecting WebSocket client pays this cost. Subsequent requests are fast while the DO stays warm.

For Hamlet's "set and forget" use case, cold starts matter most on the first request after idle periods. Hyperdrive handles this well; D1 reads are fast; DO wake time is the main concern for realtime features.

### 6. The KV Trap (Mapping Hamlet to Cloudflare)
You asked: "How does the Hamlet KV interface relate?"

It is a **perfect API match** (`get`/`put`/`delete`), but a **behavioural trap**.
*   **Hamlet KV**: Defined as "Simple Key-Value".
*   **Cloudflare KV**: "Eventually Consistent". Updates take up to 60s to travel the world.

**Usage Rules**:
1.  **Sessions (`user_tokens`)**: **Good**. You create a token, the user redirects (taking >1s). It works.
2.  **Configuration (`site_settings`)**: **Perfect**. Read heavy, write rarely.
3.  **Realtime/Events (`latest_chat`)**: **Danger**. Do NOT use it for this. Use D1.

**Implementation**: The `hamlet-worker` runtime will bind the Elm `GotKv` port directly to `env.KV`. No extra code needed, just awareness of the lag.

## Realtime: SSE Replacement Strategy

This is the hardest problem in the migration. The current SSE system holds open HTTP connections in Node.js process memory — fundamentally incompatible with Workers' stateless request/response lifecycle.

### Option A1: Durable Objects + WebSockets
*   **How it works**: A single Durable Object acts as a stateful WebSocket relay. Workers proxy clients to the DO. The DO holds connections and broadcasts.
*   **Pros**: Real-time, low latency. Bi-directional communication.
*   **Cons**:
    - Requires Workers Paid Plan ($5/mo).
    - Hibernated DOs drop all connections on wake (100–300ms cold start). For idle apps, every reconnect is cold.
    - Managing connection lifecycle, heartbeats, and reconnection adds significant complexity.
    - This is essentially rebuilding a mini pub/sub server inside a Durable Object.
    - Requires client-side WebSocket code — replaces the existing `EventSource` API.
*   **Verdict**: Professional solution, but high implementation cost for what Hamlet SSE currently does (simple event broadcast).

### Option A2: Durable Objects + HTTP Streaming (SSE Fan-out)
*   **How it works**: Same DO architecture as A1, but uses HTTP streaming instead of WebSockets. The DO holds open `ReadableStream` responses and writes SSE-formatted events (`data: ...\n\n`) to each connected client's stream. Workers proxy `GET /events` requests to the DO, which returns a streaming `Response`.
*   **Pros**:
    - Real-time, low latency — same as WebSockets.
    - SSE-compatible: clients use the standard `EventSource` API. No client-side protocol change from the current Node implementation.
    - Simpler than WebSockets — no upgrade handshake, no frame encoding, uni-directional (server → client).
    - The DO `fetch()` handler returns a `new Response(readable)` with `Transfer-Encoding: chunked`. Cloudflare streams it to the client.
*   **Cons**:
    - Same DO cold start problem (100–300ms wake from hibernation).
    - Same paid plan requirement.
    - Still need to manage subscriber lists, detect disconnects (when the writable side errors), and handle reconnection.
    - DO hibernation API (`acceptWebSocket`) is WebSocket-specific — HTTP streams don't hibernate, so the DO stays active as long as any client is connected. This means higher DO billing for always-on channels.
*   **Verdict**: The closest 1:1 replacement for current SSE. Lower client-side migration cost than WebSockets, but same server-side complexity. The lack of hibernation support for streams is a meaningful cost difference for idle apps.

### Option B: Client Polling
*   **How it works**: Client polls a `GET /api/events?since={timestamp}` endpoint on an interval. Server returns new events since the given timestamp. Events are stored in the database (Postgres or D1) with a timestamp, and old events are periodically pruned.
*   **Architecture**:
    - Writer: API handler inserts event row on state change.
    - Reader: Poll endpoint queries `WHERE created_at > $since ORDER BY created_at LIMIT 50`.
    - Client: `setInterval` or Elm `Process.sleep` loop. Adaptive interval (fast when active, slow when idle).
*   **Pros**:
    - Dead simple. No WebSockets, no DOs, no connection management.
    - Works on free tier.
    - Naturally resilient — if the client disconnects and reconnects, it just polls with its last timestamp. No "missed events" problem.
    - Database is the single source of truth. No in-memory fan-out to get wrong.
*   **Cons**:
    - Latency floor equals the poll interval (typically 2–5 seconds).
    - Chatty: N clients × 1 request/interval. For 20 users polling every 3 seconds, that's 400 requests/minute — well within free tier but not zero.
    - Not suitable for "typing indicators" or sub-second reactivity.
*   **Verdict**: Right choice for Hamlet's use case (dashboards, comment feeds, admin notifications). The latency is acceptable and the simplicity is enormous.

### Option B2: "Smart Polling" (Your Insight)
You suggested: "short poll after every other response?" This is the **correct optimization**.

*   **The Problem w/ Dumb Polling**: I post a comment. I wait 5 seconds to see it. That feels broken.
*   **The Smart Fix**:
    1.  **Background**: Poll every 5 seconds (passive).
    2.  **Triggered**: When I send `SubmitComment`, immediately fire `PollEvents`.
    *   *Result*: **Zero latency for the actor**. 5s latency for observers.
*   **Implementation**: This is purely client-side Elm logic in the generated code.

### Option C: Hybrid — Polling with Upgrade Path
*   **How it works**: Ship polling first. Structure the event storage so that a future WebSocket/DO layer can consume the same event table. The client interface (`onEvent` callback) is the same regardless of transport.
*   **Implementation**:
    - `buildamp gen` generates an event table and poll endpoint for every `Sse` model.
    - The generated Elm client uses polling by default.
    - If a `[durable_objects]` binding is detected in `wrangler.toml`, `hamlet build --target=worker` wires up the DO relay instead.
*   **Verdict**: Pragmatic. You get realtime "good enough" on day one and can upgrade the transport without changing application code.

### Option D: Keep SSE on Node (Sidecar)
*   **How it works**: Run Workers for stateless API endpoints. Keep a lightweight Node process just for SSE connections. The Worker writes events to Postgres; the Node process listens via `NOTIFY`/`LISTEN` and pushes to connected clients.
*   **Pros**: Zero changes to existing SSE code. Proven.
*   **Cons**: You still have a Node process to manage — defeats part of the "zero DevOps" goal.
*   **Verdict**: Viable transition strategy. Lets you migrate everything else to Workers while deferring the SSE problem.

### SSE Recommendation

**Go with Option A2 (DO + HTTP streaming).** It's the closest 1:1 replacement for current Node SSE — same `EventSource` API on the client, same uni-directional push model. The paid plan is a given for any serious Workers deployment, so the cost argument for polling doesn't hold. The DO is only active while clients are connected (same as Node holding open connections), so idle apps pay nothing. Building polling as an intermediate step is throwaway work — the implementation effort is comparable, and you'd still need event storage, adaptive intervals, and pruning logic that A2 doesn't require.

## Feature Gap Analysis Summary

| Feature | Node.js | Cloudflare Worker | Difficulty |
| :--- | :--- | :--- | :--- |
| API endpoints | Express routes | Worker `fetch` handler | Low |
| Database | `pg` pool | Hyperdrive (or D1) | Low (High for D1) |
| KV store | In-memory Map | KV Namespace | Low |
| Cron jobs | `node-cron` | Cron Triggers | Low |
| File uploads | Local disk / S3 | R2 binding | Low |
| SSE (realtime) | Open HTTP connections | DO + HTTP streaming | Medium |
| Admin UI | Express static | Pages / Assets | Low |

## Implementation Roadmap

### Phase 1: Worker Runtime + Hyperdrive
Prove the Worker works against existing Postgres. No data migration, no SQL changes.
- [ ] `packages/hamlet-worker/request-handler.js`: Maps standard `Request` to Elm Ports.
- [ ] `packages/hamlet-worker/db-adapter.js`: Postgres via Hyperdrive (same SQL, connection pool at edge).
- [ ] `packages/hamlet-worker/blob-adapter.js`: R2 binding adapter (same `write`/`read`/`remove`/`url` interface as `blob-storage.js` adapters).
- [ ] Validate: deploy one endpoint, confirm round-trip through Hyperdrive to Postgres.

### Phase 2: BuildAmp Bundler Mode
Update `buildamp` to support a `--target=worker` flag.
- [ ] Generate `worker.js` entry point with static imports.
- [ ] Statically import all `app/horatio/server/src/Api/Handlers/*.elm.js`.
- [ ] Inline `schema.json` so it doesn't need `fs.read`.

### Phase 3: SSE via Durable Objects
Replace Node SSE with DO + HTTP streaming. Same `EventSource` API on the client.
- [ ] `packages/hamlet-worker/sse-relay.js`: Durable Object that holds subscriber streams and broadcasts SSE events.
- [ ] Worker `fetch` handler proxies `GET /api/events` to the DO, returns streaming `Response`.
- [ ] API handlers write events to the DO (via `stub.fetch()`) when state changes.
- [ ] Client disconnect detection (writable stream error → remove subscriber).
- [ ] Reconnection support via `Last-Event-ID` header.

### Phase 4: Full Feature Parity
- [ ] Cron Triggers wired to Elm `tick` handlers.
- [ ] KV Namespace binding for `kv` models.
- [ ] R2 uploads working end-to-end through the generated `Upload` API endpoints.
- [ ] Admin UI served via Cloudflare Pages / Assets.

### Phase 5 (Optional): D1 Migration
Only if cutting the Postgres dependency is desired.
- [ ] `translateQueryToSQL` dialect support: `postgres` | `sqlite`.
- [ ] Type conversion: `JSONB` → `TEXT`, `TIMESTAMP` → `INTEGER`, UUID generation in application code.
- [ ] Data migration tooling: Postgres dump → D1 import with type coercion.
- [ ] Foreign key strategy (application-level enforcement or per-query pragma).

## Testing Strategy

- **Unit tests**: Jest (existing) for `buildamp` generators and `hamlet-server` middleware. No change.
- **Worker integration tests**: `wrangler dev --local` provides a local Workers runtime with D1 and KV bindings. Tests can hit `http://localhost:8787` via `fetch`.
- **Dual-target validation**: `run_all_tests.sh` continues to cover the Node target. A parallel `run_worker_tests.sh` covers the Worker target against `wrangler dev`.
- **Database tests**: For Hyperdrive, test against real Postgres (same as today). For D1, test against local D1 via `wrangler d1 execute --local`.

## Benefits
1.  **Zero DevOps**: No managing PM2, Docker, or VPSs.
2.  **Cost**: $5/mo floor for most Hamlet use cases. Postgres hosting is the variable.
3.  **Local Dev**: `wrangler dev` provides a good local experience with hot reload.
4.  **Incremental**: Hyperdrive-first means you can migrate one endpoint at a time without touching the database.

## Recommendation
Start with **Phase 1** using **Hyperdrive + existing Postgres**. This validates the Worker runtime with zero risk to the data layer. Move to D1 only if the operational simplicity justifies the generator work and the loss of Postgres features.
