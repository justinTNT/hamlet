# Hedge: Hamlet on Edge (Fable Fork)

## Executive Summary

**Hedge** is a strategic "Fork" of the Hamlet project line.
Its purpose is to explore a cleaner, simpler implementation of the Hamlet architecture by leveraging the F# ecosystem (Fable) on Cloudflare Workers.

As identified in `critique.md`, the current Hamlet implementation (Elm + Node + BuildAmp) suffers from accidental complexity:
1.  **Framework Fatigue**: We are building a custom ORM, a custom router, and a custom bundler.
2.  **Generic Plumbing**: The "Universal Handler" pattern forces us to serialize Logic -> JSON -> SQL, losing type safety at the boundaries.
3.  **Port Hell**: Elm Ports are safe but tedious for simple CRUD apps.

**Hedge** aims to solve this by replacing the "Elm + Glue Code" stack with a "End-to-End F#" stack.

---

## 2. The Core Thesis

If we use **Fable** (F# to JS Compiler) across the full stack, we can delete 80% of the "Glue Code".

| Feature | Hamlet (Current) | Hedge (Fable Fork) |
| :--- | :--- | :--- |
| **Language** | Elm (Front) + JS (Back) | F# (Shared) |
| **Types** | `buildamp gen` (Elm -> JS) | `Shared.fs` (Native) |
| **API** | JSON Ports + Custom Router | Thoth.Json + Fetch (Typed HTTP) |
| **Database** | Node `pg` + Custom Query Builder | F# D1 Bindings (Direct SQL) |
| **Runtime** | Node.js Monolith | Cloudflare Worker Microservices |
| **Complexity** | High (Custom Build System) | Low (Standard Compiler) |

---

## 3. The "Golden Model" App: Horatio

To validate this thesis, we will port **Horatio** (the microblog / link aggregator) to the new stack.
This is the "Golden Model". If Hedge can implement Horatio with:
1.  Fewer lines of code
2.  Better type safety
3.  Equivalent performance

...then the fork is successful.

### Repository Structure

We will create a new repository to keep the experiment clean:

```bash
~/Play/hedge/
├── .config/             # Tooling (dotnet tools)
├── public/              # Static assets
├── src/
│   ├── Client/          # Fable.Elmish + Feliz (React)
│   │   ├── App.fs       # Main entry
│   │   └── Style.fs     # CSS-in-F#
│   ├── Admin/           # [NEW] The Admin Dashboard
│   │   ├── App.fs       # Fable.Elmish + Feliz
│   │   └── Style.fs
│   ├── Server/          # Fable.Remoting
│   │   ├── Api.fs       # Public API
│   │   ├── AdminApi.fs  # [NEW] Admin API
│   │   └── Env.fs       # Cloudflare bindings
│   ├── Shared/          # The Golden Types
│   │   ├── Api.fs       # IApi definition
│   │   └── Domain.fs    # User, Comment, Item
│   └── App/             # Feature Modules
│       └── Horatio/     # The Ported App
│           ├── Models.fs
│           ├── View.fs
│           └── Update.fs
├── package.json         # Vite + Wrangler
├── hedge.fsproj         # The Build Definition
└── wrangler.toml        # Cloudflare Config (D1, KV)
```

---

## 4. Technology Stack Detail

### A. The "Rosetta Stone" (Shared Types)
The critical piece. In Hamlet, we used `schema.elm` and a parser generator.
In Hedge, we just write code:

```fsharp
namespace Shared

type User = { Id: System.Guid; Email: string }

type IApi =
    { getLastComment : unit -> Async<string option>
      postComment : string -> Async<Result<unit, string>> }
```

### B. The Frontend (Feliz)
We move from `elm/html` to `Feliz` (React Wrapper).
It feels like Elm, but taps into the React ecosystem.

```fsharp
// Hamlet (Elm)
div [ class "container" ] [ text "Hello" ]

// Hedge (Feliz)
Html.div [
    prop.className "container"
    prop.text "Hello"
]
```

### C. The Backend (Thoth + Fetch)
We replace the `Task` abstraction and `Port` wiring with typed HTTP using shared encoders/decoders.

**Shared (used by both client and server):**
```fsharp
// Shared/Codecs.fs
type Comment = { id: Guid; content: string; author: string }

let encodeComment : Encoder<Comment> =
    fun c -> Encode.object [
        "id", Encode.guid c.id
        "content", Encode.string c.content
        "author", Encode.string c.author
    ]

let decodeComment : Decoder<Comment> =
    Decode.object (fun get -> {
        id = get.Required.Field "id" Decode.guid
        content = get.Required.Field "content" Decode.string
        author = get.Required.Field "author" Decode.string
    })
```

**Client:**
```fsharp
// Api.fs - thin wrapper over fetch
let getLastComment () : Promise<Result<Comment option, string>> =
    fetch "/api/comment/last" []
    |> Promise.bind (fun res -> res.text())
    |> Promise.map (Decode.fromString (Decode.option decodeComment))

// Update.fs
let update msg model =
    match msg with
    | LoadComment ->
        model, Cmd.OfPromise.perform getLastComment () GotComment
```

**Server (Fable → JS on Workers):**
```fsharp
// Server.fs
let handleGetLastComment (req: Request) (env: Env) : Promise<Response> =
    promise {
        let! result = env.d1.query "SELECT * FROM comments ORDER BY created_at DESC LIMIT 1"
        let body = result |> List.tryHead |> Encode.option encodeComment |> Encode.toString 0
        return Response.create(body, headers = [| "content-type", "application/json" |])
    }
```

**Why this works:**
- Encoders/decoders defined once, used everywhere
- No .NET dependency on server (pure Fable → JS)
- Runs natively on Cloudflare Workers
- ~50 extra lines vs Remoting for a typical app (trivial)

**Why not Fable.Remoting?**
Fable.Remoting's server component (Giraffe, Saturn, etc.) requires .NET CLR - it doesn't compile to JavaScript. For Workers deployment, we need pure Fable → JS on both ends. Thoth + Fetch gives us the same type-safe serialization without the runtime dependency.

### D. The Database (D1)
We drop Postgres for Cloudflare D1 (SQLite).
- **Pro**: Zero config, edge replicas, practically free.
- **Con**: No "Real" Foreign Keys (soft enforcement), no JSONB.
- **Mitigation**: We do relations in code (since we have strong types) or use simple JOINs.

---

## 5. Deployment Strategy (Cloudflare)

Deployment becomes trivial:

1.  **Build**: `dotnet fable src/App.fsproj` -> `bundle.js` (via Vite)
2.  **Deploy**: `wrangler deploy`

No Docker. No VPS. No "Cluster".

---

## 6. Comparison Metrics

We will measure success by:

1.  **LOC Closeness**: Does `App/Horatio/Update.fs` look like `hamlet/app/horatio/update.elm`? (It should be 90% similar).
2.  **Boilerplate Ratio**: How much code is "Product" vs "Plumbing"? (Hedge should be significantly better).
3.  **Type Coverage**: Are database rows typed? Are API responses typed? (Hedge guarantees this without codegen).

---

## 7. Realtime Strategy (True SSE with Durable Objects)

Per the **Cloudflare Migration Plan (Option A2)**, we will implement **True SSE** using Durable Objects.

**The Architecture:**
1.  **The Relay**: A single Durable Object (`SseRelay`) acts as a "pub/sub hub".
2.  **The Connection**: Clients connect to `/api/events`. The Worker forwards this to the DO.
3.  **The Stream**: The DO returns a `Response` with a `ReadableStream` (Standard HTTP Streaming).
4.  **The Broadcast**: When `Server.fs` processes a mutation, it calls `SseRelay.broadcast(...)`.

**Why this wins:**
- **Zero Polling**: True push-based architecture.
- **Standard API**: The Frontend uses the standard browser `EventSource` API (same as Node.js).
- **Fable Friendly**: The DO is just an F# class implementing a simple interface.

**Trade-off**: Requires Workers Paid Plan ($5/mo) and managing DO configuration in `wrangler.toml`.

---

## 8. Admin Strategy (Reflection over Introspection)

The current Hamlet Admin works by reading a `schema.json` file generated by `buildamp`.
In Hedge, we replace this build step with **F# Reflection**.

**The Strategy:**
1.  **Decorate Types**: We use Attributes in `Shared.fs` to define metadata.
    ```fsharp
    type User = {
        [<PrimaryKey>] Id: Guid
        [<RichContent>] Bio: string
    }
    ```
2.  **Generate Schema**: A runtime helper `Schema.generate<User>()` reads these attributes and produces the Schema JSON required by the Admin UI.
3.  **Serve API**: `AdminApi.getSchema` simply returns this generated structure.
4.  **Admin UI**: The Admin Dashboard (ported to Feliz) consumes this JSON to render the "Universal CRUD Wrapper".

**Why this wins**:
- **Code-First**: The schema is defined on the types, not in a separate file.
- **No Build Step**: No regex parsers or `buildamp gen` required.
- **Dynamic**: Adding a field to the Type automatically updates the Admin UI.

**The Universal Admin**:
Because the schema format is standardized, the **Admin App** is generic.
A single build of `src/Admin` can point to *any* Hedge backend (Horatio, Ophelia, etc.) and render the correct UI.
This fulfills the "Common Admin App" vision.

---

## 9. Scope Reduction: What We Leave Behind

The simplicity of Hedge comes from **abandoning custom infrastructure** in favor of standard tools.

| Hamlet Component | Hedge Replacement | Rationale |
| :--- | :--- | :--- |
| **`hamlet-server`** | Cloudflare Workers Runtime (`workerd`) | We don't need a custom Node.js server. `workerd` is the standard runtime. |
| **`buildamp`** | Fable Compiler (`fable`) + Vite | We don't need a custom code generator. F# compiles to JS directly. |
| **`project-loader.js`** | Module Imports (`import ...`) | We don't need distinct filesystems per project. We bundle everything at build time. |
| **`elm-service.js`** | `Thoth.Json` shared codecs | We don't need a custom Port adapter. Shared encoders/decoders handle serialization. |

**Verdict:** We are deleting ~5,000 lines of "Framework Code" and replacing it with standard compiler toolchains.

---

## 10. Developer Experience (The DX Goal)

We aim for **Supersonic HMR**:
- **Frontend**: Vite + HMR (via `@vitejs/plugin-react`). Changing a View file updates browser state in <500ms.
- **Backend**: `wrangler dev` (local workerd runtime). Changing API code reloads the worker almost instantly.
- **Shared Code**: Modifying `Shared.fs` triggers both (Vite rebuilds Client, Wrangler rebuilds Server).

**The Dream Workflow**:
One terminal command: `npm run dev`
- Starts `vite` (port 3000) for frontend.
- Starts `wrangler dev` (port 8787) for backend.
- Vite proxies `/api` requests to `localhost:8787`.
- **Zero latency loop.** No "manual build step" ever.

---

## 11. The CLI (Scaffolding)

To match the `npm create vite@latest` experience, we will ship a **dotnet template**.

**The Experience:**
```bash
# Install the template (once)
dotnet new install Hedge.Templates

# Create a new app
dotnet new hedge-app -n MyCoolApp
cd MyCoolApp
npm install
npm run dev
```

**What it generates:**
- Full directory structure (`src/Client`, `src/Server`, `src/Shared`)
- Pre-configured `vite.config.js` and `wrangler.toml`
- A working "Counter" example (the "Hello World" of MVU)

This replaces the need for a complex custom CLI tool with standard .NET tooling.

---

## 12. Validation Spikes (Pre-Commitment Gates)

Before committing to full implementation, we must validate two critical assumptions. These spikes are **blocking** - if either fails, we revisit the architecture.

### Spike A: Fable Ecosystem Adequacy

**Question**: Is the Fable + Feliz + Thoth stack mature enough for production use?

**Context**: We've ruled out Fable.Remoting because its server component requires .NET CLR and won't compile to JS for Workers. Instead, we use Thoth.Json for type-safe serialization and Fable.Fetch for HTTP.

**Validation Criteria**:
1. **Dev Environment**: Can we achieve <500ms HMR with `vite` + `fable watch` + `wrangler dev` running concurrently?
2. **Feliz Completeness**: Does Feliz cover our UI needs, or will we constantly escape-hatch to raw React?
3. **Thoth on Workers**: Do Thoth.Json encoders/decoders work correctly when compiled to JS and run on `workerd`?
4. **Server Routing**: Can we build a minimal router in F# that compiles cleanly to Workers-compatible JS?
5. **Ecosystem Health**: Are these libraries actively maintained? Check GitHub activity, issue response times.

**Deliverable**: A written assessment with go/no-go recommendation.

### Spike B: Fable Reflection on Workers

**Question**: Does Fable's compile-time reflection metadata work correctly on Cloudflare Workers?

**Context**: Fable's "reflection" is not .NET runtime reflection - it emits type metadata into JS at compile time. This *should* work on Workers since it's just JS objects, but we must verify.

**Test Case**:
```fsharp
// In Shared.fs
[<AttributeUsage(AttributeTargets.Property)>]
type RichContentAttribute() = inherit Attribute()

[<AttributeUsage(AttributeTargets.Property)>]
type PrimaryKeyAttribute() = inherit Attribute()

type TestUser = {
    [<PrimaryKey>] Id: System.Guid
    [<RichContent>] Bio: string
    Email: string
}

// In Server.fs (running on wrangler dev)
let schema = Schema.generate<TestUser>()
// Expected output:
// { fields: [
//     { name: "Id", type: "Guid", attrs: ["PrimaryKey"] },
//     { name: "Bio", type: "string", attrs: ["RichContent"] },
//     { name: "Email", type: "string", attrs: [] }
// ]}
```

**Validation Criteria**:
1. Custom attributes are preserved and readable
2. Field names and types are correctly extracted
3. Works on both `wrangler dev` (local) and deployed Worker
4. No runtime errors or V8 isolate incompatibilities

**Fallback**: If reflection fails on Workers, generate schema at build time (similar to Hamlet, but using F# tooling instead of tree-sitter).

**Deliverable**: Working `Schema.generate<T>()` function or documented blockers.

---

## 13. Implementation Roadmap (Sprints)

We will execute this transformation in four 1-week sprints, **after successful completion of both validation spikes**.

### Sprint 0: Validation (Pre-Requisite)
**Goal**: Confirm core assumptions before investing in full implementation.
1.  Execute Spike A (Fable Ecosystem Adequacy).
2.  Execute Spike B (Fable Reflection on Workers).
3.  **Gate**: Both spikes must pass before proceeding. Document any constraints discovered.

### Sprint 1: Genesis (The Skeleton)
**Goal**: A running "Hello World" app with Supersonic HMR.
1.  Initialize `~/Play/hedge` repository.
2.  Configure `vite` + `fable` + `wrangler` concurrency (validated in Spike A).
3.  Implement "Counter App" (Client only).
4.  **Deliverable**: `npm run dev` opens a working, hot-reloading F# React app.

### Sprint 2: The Spine (Data & RPC)
**Goal**: End-to-End Type Safety. `Client -> Server -> D1`.
1.  Create `Shared.fs` with `IApi`.
2.  Implement `Server.fs` with D1 bindings.
3.  Wire up `Fable.Remoting` (RPC).
4.  **Deliverable**: A button that saves "Hello D1" to the local SQLite database and displays it back.

### Sprint 3: The Golden Apps (Horatio Public + Admin)
**Goal**: Feature parity with Hamlet's Horatio.
1.  Port `app/horatio/web` -> `src/Client` (Public App).
2.  Port `app/horatio/admin` -> `src/Admin` (Dashboard).
3.  **Deliverable**: Both apps running on Hedge stack, sharing the same `Shared.fs` domain types.

### Sprint 4: Productization (The Template)
**Goal**: Make it reusable.
1.  Extract the `Horatio` app into a generic `dotnet new` template.
2.  Package `Hedge.Templates` for nuget (local).
3.  Write `HEDGE_GUIDE.md`.
4.  **Deliverable**: `dotnet new hedge-app` creates a production-ready repository.
