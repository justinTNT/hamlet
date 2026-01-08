this aims to be a simple build tool

right now it just fits neatly in vite, but maybe we should consider other host build envs for this same kind of tool.

rust once, json never

business domain types in rust => autogen elm types with codecs

this tool is a helper that aims to amplify the build through autogeneration
As a mere helper, it does not want to make many demands of devs.
There's an escape hatch for code, but all we need in rust is very basic data definition.

in return, you get cross platform client/server interop.
for certain classes of app, a similar approach works for store.
there's a few other benefits (like structured logging) that naturally fall into place.


* the sweet zone: "A Few Weird Holes"

  Hamlet = Philosophy
  - "Few weird holes"
  - TEA everywhere
  - Explicit over magic
  - Two-Zone Architecture
  - Not a framework

  BuildAmp = Capability
  - Takes Rust models
  - Amplifies them into JS, Elm, WASM, SQL
  - Handles code generation
  - Provides the concrete tooling
  - Could theoretically work for any app


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

