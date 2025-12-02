# BuildAmp Development Plan
*Rust data modeling for Elm apps*

*Generated from conversation on 2025-12-02*

## Core Philosophy & Achievements

**Framework Identity**: BuildAmp is a build tool for applications with **complex contracts and small surface area** - rich internal domain logic expressed through minimal, powerful interfaces.

**Target Applications**: Swiss army knife apps where users discover capabilities through the essential operations rather than feature lists. Community platforms, trading systems, content management - apps that do a lot internally but expose clean interfaces.

### Architectural Wins Achieved

1. **Type-Safe Client-Server** - Rust domain types → Elm generation eliminates mismatches
2. **Store Interface** - Simple `get(key)`/`set(key, value)` abstracts persistence complexity
3. **Email Templates** - Domain objects as template variables for transactional email
4. **Structured Logging** - Domain events with correlation IDs for observability  
5. **Admin Interface** - Swagger UI from OpenAPI generation (zero additional code)
6. **Effects System** - Pure Elm business logic with server-side effect execution

### Key Insight: Compound Returns
Each good architectural decision (domain types in Rust) enables multiple capabilities with minimal marginal effort. The benefits accelerate rather than each addition becoming more expensive.

## Implementation Plan

### Phase 1: Developer Experience Polish (1-2 weeks)

#### 1.1 Project Structure & Type Organization
- [ ] **Restructure project layout for clear user/framework separation**:
  ```
  myproject/
  ├── src/
  │   └── models/          ← USER SPACE - where developers work
  │       ├── domain.rs    ← Core business entities
  │       ├── api.rs       ← API contracts with validation
  │       └── effects.rs   ← Server implementation details
  ├── .buildamp/           ← FRAMEWORK INTERNALS (hidden like .git)
  │   ├── generated/       ← Generated Elm types, WASM outputs
  │   ├── macros/          ← BuildAmp macro implementations
  │   └── wasm/            ← WASM build artifacts
  ├── frontend/
  ├── backend/
  └── package.json
  ```

- [ ] **Migrate from current shared/ structure**:
  - Move `shared/proto-rust/src/shared_types.rs` → `src/models/` (split into files)
  - Move `shared/horatio-macro/` → `.buildamp/macros/`
  - Move `shared/schema_generator/` → `.buildamp/generated/`
  - Update all build paths and import references

- [ ] **Implement zero-decoration defaults based on file location**:
  - **`src/models/domain.rs`**: Auto-derives `Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode`
  - **`src/models/api.rs`**: Auto-derives domain set + `ToSchema, BuildAmpEndpoint` (for API generation)
  - **`src/models/effects.rs`**: Auto-derives basic set only (no external interfaces)
  - **Override syntax**: `#[buildamp(skip)]`, `#[buildamp(domain_only)]` for exceptions

- [ ] **Developer experience goal**:
  ```rust
  // In src/models/domain.rs - zero decoration needed
  pub struct MicroblogItem {
      pub title: String,
      pub content: String,
  }
  
  // In src/models/api.rs - zero decoration needed  
  pub struct SubmitItemReq {
      pub title: String,
      pub tags: Vec<String>,
  }
  
  // Exception handling when needed
  #[buildamp(skip)]
  pub struct InternalHelper { ... }
  ```

**User mental model**: "I work in `src/models/` to define my data types. Everything else is BuildAmp's concern."

- [ ] **Clean up deprecated code**:
  - Remove commented `BackendResult` enum
  - Replace manual derive decorations with file-based defaults

#### 1.2 StandardServerContext Implementation
```rust
struct StandardServerContext {
    pub now: u64,              // Current timestamp
    pub timezone: String,      // Server timezone  
    pub request_id: String,    // For correlation/tracing
    pub random_seed: u64,      // Deterministic randomness
    pub session_id: Option<String>, // Fingerprint-based identity
    pub host: String,          // Multi-tenancy
}
```

**Design Goals**:
- Auto-included in all endpoint bundles (zero config for 90% case)
- Keeps infrastructure separate from domain models
- Enables pure Elm business logic with rich server context

#### 1.3 Bundle Architecture Improvements
- [ ] **Improve presentation**: Rename `bundle_with` to `server_context` or `requires`
- [ ] **Request model decomposition**: Use request fields to automatically generate server context
- [ ] **Algebraic composition**: Build context from request components (tags → tag context, etc.)

### Phase 2: Browser Fingerprinting (1-2 weeks)

**Goal**: 128-bit stable identity from maximum browser diversity

#### 2.1 High-Entropy JavaScript Data Collection
```javascript
// Collect from multiple sources for maximum entropy
const fingerprintData = {
    canvas: await getCanvasFingerprint(),      // Hardware/driver differences
    webgl: await getWebGLFingerprint(),        // GPU-specific identifiers
    fonts: await getFontMetrics(),             // Font rendering differences  
    audio: await getAudioFingerprint(),        // Hardware audio processing
    performance: getPerformanceFingerprint()   // CPU/memory timing patterns
};
```

#### 2.2 Rust Compression Algorithm
```rust
#[wasm_bindgen]
pub fn generate_fingerprint(data_json: String) -> String {
    // Hash each component to extract maximum entropy
    // Combine into high-entropy input
    // Compress to 128 bits using blake3
    // Return as 22-character base64 URL-safe string
}
```

**Quality Targets**:
- **Stability**: >99% consistency across browser restarts
- **Uniqueness**: <1 in 10M collision rate
- **Storage**: 16 bytes (22 character string)
- **Performance**: <100ms generation time

#### 2.3 Auto-Integration
- [ ] Generate fingerprint on client initialization
- [ ] Auto-include in `X-Session-ID` header for all requests
- [ ] Available in StandardServerContext as `session_id`

### Phase 3: Vite Plugin Packaging (2-3 weeks)

**Goal**: Package existing functionality as `vite-plugin-buildamp`

#### 3.1 Plugin Structure
- [ ] **Extract build logic** from individual `vite.config.js` into plugin
- [ ] **File watching** for Rust source changes with HMR integration
- [ ] **Multi-target WASM** handling (web vs node packages)
- [ ] **Configuration API** for paths and build options

#### 3.2 Self-Dogfooding
- [ ] Convert current apps to use the plugin
- [ ] Test brownfield compatibility
- [ ] Verify both web and extension builds work

#### 3.3 Plugin API Design
```javascript
// Target developer experience
import buildampPlugin from 'vite-plugin-buildamp'

export default defineConfig({
  plugins: [buildampPlugin()] // Zero config for standard setup
})
```

### Phase 4: CLI Scaffolding (1 week)

#### 4.1 Project Template
- [ ] Extract proven project structure
- [ ] Include minimal working example (microblog-style)
- [ ] Pre-configure all dependencies and build scripts

#### 4.2 CLI Implementation
```bash
npm create buildamp my-project
# Generates complete project structure with working example
```

**Template Contents**:
- `/core/src/` - Rust domain types with examples
- `/frontend/src/` - Elm application
- `/backend/` - Node.js server
- Pre-configured `vite.config.js` with buildampPlugin()

## Decision Log

### Bundle Coupling Analysis
**Decision**: Keep the bundling pattern - it's architecturally consistent and makes server dependencies explicit in the interface contract rather than hidden. Improve presentation with better naming and defaults.

**Reasoning**: Makes complex server context explicit and type-safe. The "weirdness" comes from lack of conventions, not fundamental architectural problems.

### Event Sourcing Rejected
**Decision**: Don't implement event sourcing backend despite architectural elegance.

**Reasoning**: Breaks brownfield adoptability and forces specific architectural choices. Store interface should remain unopinionated about persistence implementation.

### Framework Boundary Recognition
**Decision**: Stop feature expansion after structured logging, email templates, admin UI.

**Reasoning**: Everything beyond this point requires domain-specific decisions rather than universal defaults. Framework should stay in "obvious wins" territory.

### Zero-Decoration Defaults
**Decision**: File location determines default derives and behavior rather than explicit decoration.

**Reasoning**: Since this is the ONLY Rust in a BuildAmp project, every type wants BuildAmp treatment. Default behavior should require zero configuration, with decoration only for exceptions. Perfect alignment with "90% case works without configuration" philosophy.

### Framework Positioning
**Decision**: Position as "Rust data modeling for Elm apps" - aim low, deliver high.

**Reasoning**: Attracts users with simple codec needs, lets them discover compound value organically. Under-promise, over-deliver creates delightful surprise rather than overwhelming complexity. Focus on obvious pain point (JSON drift) while enabling architectural benefits.

## Success Criteria

- **Zero-config value** for 90% of target applications
- **Brownfield compatibility** - works with existing projects  
- **Developer focus** on business logic in pure, beautiful Elm
- **Architectural leverage** - each good decision pays increasing dividends

**End Goal**: A build amplifier that makes complex domain applications feel effortless to create and maintain, where the developer spends time on business logic rather than infrastructure concerns.

**Target Developer**: Elm developers who define domain types in Rust to get framework superpowers automatically.

## Notes on Application Archetype

**Size and Shape**: Framework optimized for applications with "few holes, weird holes" - small interface surface area with complex, domain-specific contracts.

**Examples**: 
- Community management platform (big but not complex at interface level)
- Trading system with sophisticated internal rules
- Content moderation with rich business logic
- Any system where you "think hard once" about domain model, then have that thinking pay dividends

**Anti-patterns**: 
- CRUD-heavy applications with many similar operations
- Workflow engines with many small steps  
- Integration platforms with disparate systems
- When you need 50+ generic endpoints rather than 3-5 powerful ones

## Implementation Priority

1. **Phase 1** (Developer Experience) - Immediate quality of life improvements
2. **Phase 2** (Fingerprinting) - Core capability that enables persistent guest experiences  
3. **Phase 3** (Plugin) - Packaging for distribution and adoption
4. **Phase 4** (CLI) - Complete developer onboarding experience

Focus on **self-dogfooding** throughout - use the improvements on your own microblog to validate the developer experience before broader release.