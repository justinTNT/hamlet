this aims to be a simple build tool

right now it just fits neatly in vite, but maybe we should consider other host build envs for this same kind of tool.

our contract with the elm dev user is: "elm once, json never"
business domain types in elm => autogen JS glue, SQL schemas, admin UI
to absorb some representational pain on behalf of the user

this tool is a helper that aims to amplify the build through autogeneration
As a mere helper, it does not want to make many demands of devs.
There's an escape hatch for code, but all we need in elm is very basic type aliases.

in return, you get cross platform client/server interop.
for certain classes of app, a similar approach works for store.
there's a few other benefits (like structured logging) that naturally fall into place.


* the sweet zone: "A Few Weird Holes"

  Hamlet = Philosophy
  - "Few weird holes" → We minimise structural irregularities.
  - TEA everywhere
  - Explicit over magic
  - Two-Zone Architecture
  - Not a framework

  BuildAmp = Capability
  - Takes Elm type aliases
  - Amplifies them into JS glue, SQL schemas, admin UI
  - Uses tree-sitter for accurate Elm parsing
  - Handles code generation
  - Provides the concrete tooling


**The Philosophy:**
Your app has just a few integration points, but they're weird-shaped:
- **One weird API**: Not REST, not GraphQL. Just 4-5 specific endpoints that do exactly what you need.
- **One weird store**: Not Redis, not Postgres for everything. Maybe some KV pairs, some browser storage.
- **One weird SSE stream**: Not a general pubsub. Just your specific events flowing to clients.
- **One weird service**: That PDF generator, that webhook handler, that one integration.

- **Big frameworks**: Force you into patterns you don't need. You use 5% but carry 100% of the weight.
- **Hamlet**: Admits these holes exist. Doesn't try to generalize them. Makes them type-safe and fast.

**Perfect for:**
- Internal tools with complex workflows but simple interfaces
- SaaS products with a focused API surface
- Specialized applications that do one thing really well
- Projects where you know exactly what your "weird holes" are

**Wrong for:**
- Apps that need 50+ endpoints
- Systems requiring multiple databases and caching layers  
- Projects where the requirements are unknown or constantly changing
- "Framework shopping" - if you want infinite flexibility, look elsewhere

Buildamp gives you surgical precision for your few weird holes. Nothing more, nothing less.

## Development

### Code Generation

Use the BuildAmp CLI to generate code from Elm models:

```bash
# Generate all targets from Elm type aliases
buildamp gen --src app/horatio/models --dest app/horatio

# Generate for specific model directory
buildamp gen api --src ... --dest ...    # API routes, handlers
buildamp gen db --src ... --dest ...     # Database queries, SQL schema

# Check generation status
buildamp status
```

### Handler Safety

`buildamp gen api --src ... --dest ...`
will not over-write existing handlers

for that, we have:

```bash
buildamp gen api --src ... --dest ... --regenerate ...
```

which regenerates the specified handler - or all handlers, for 'all'

buildamp backs up the existing handler, generates a fresh skeleton with // TODO cut-n-paste business logic from old version


