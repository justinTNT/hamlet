Hamlet — Next Steps (Working Note)

Guiding decisions (locked in)
	•	Rust → Elm is a migration, not a continuous build
	•	Regeneration is intentional, explicit, and non-clobbering.
	•	Drift between Rust and Elm is allowed and surfaced deliberately.
	•	Vite is a dev-host adapter (SSR HMR), not the project’s identity
	•	Hamlet owns orchestration, migration, codegen boundaries.
	•	Vite reacts; Hamlet decides.
	•	esbuild is optional and later
	•	Valuable for production builds or auxiliary tasks.
	•	Not relevant for SSR HMR right now.

⸻

Immediate priorities (do these first)

1. Make regeneration safe and explicit
	•	**The "Glue" (Clobberable)**: `.hamlet-gen/`
		○	JSON encoders/decoders, Type definitions, Router plumbing, SQL strings
		○	Always regenerated completely by `hamlet gen` (User NEVER edits this)
	•	**The "Skeletons" (Owned)**: `app/src/`
		○	Backend Handlers, Page components, Business logic  
		○	Created once if missing, never overwritten if exists (User OWNS this)
	•	Add an explicit command:
	•	hamlet gen
	•	runs Rust codegen
	•	writes to .hamlet-gen
	•	updates a contract hash / stamp
	•	Rust watcher:
	•	becomes informational only
	•	reports “contract dirty” instead of auto-regenerating

⸻

2. Encode the migration workflow

Document (and design for) the actual workflow:
	1.	Work normally in Elm (fast SSR HMR loop).
	2.	Switch to Rust only for contract changes.
	3.	Run `hamlet gen` to regenerate Glue (`.hamlet-gen/`).
	4.	Compiler breaks Skeletons that need updating.
	5.	Fix Skeleton code guided by compiler errors.
	6.	Return to Elm world.

This is the canonical flow. Everything else supports it.

⸻

3. Remove unnecessary Vite entanglement
	•	Extract all non–dev-server logic out of Vite plugins/config:
	•	watchers
	•	scheduling
	•	cache keys
	•	“what invalidates what”
	•	Vite integration should:
	•	import from .hamlet-gen
	•	optionally be poked/invalidate on hamlet gen
	•	contain no orchestration logic

Result: Vite is replaceable; Hamlet is not.

⸻

“Create” workflow (near-term, but after migration)

Principle

hamlet create scaffolds Hamlet structure first, then applies a Vite SSR profile.

Create always generates:
	•	Contract zone (Rust inputs)
	•	**Glue Zone** (`.hamlet-gen`, clobberable)
	•	**Owned Zone** (`app/src`, human-owned skeletons)
	•	hamlet gen + hamlet status
	•	Minimal docs:
	•	CONTRACT.md
	•	NON_GOALS.md
	•	TRUST.md

Create may add via profile:
	•	--profile=vite-ssr (default for now)
	•	Vite SSR config
	•	dev scripts
	•	SSR entrypoint wired to .hamlet-gen

Vite is a profile, not a commitment.

⸻

Implementation estimates & decisions

Effort assessment: 1-2 weeks (5-10 days)
	•	Hash-based dirty detection: 1-2 days (file content hashing + stored contracts)
	•	Vite decoupling: 1 day (plugin becomes purely reactive)
	•	Orchestration extraction: 2-3 days (move dev-server.js logic to `hamlet gen`)
	•	Template updates: 1-2 days (simple file replacement, not intelligent merging)
	•	Horatio migration: 1 day (single example project)

Simplified scope decisions:
	•	Template adoption = simple file replacement (users handle conflicts manually)
	•	Migration scope = only Horatio project (well-understood, comprehensive tests)
	•	Example project stays bundled with framework during active development
	•	Existing 9-phase generation pipeline preserved (refactor orchestration, not rebuild)

Sprint breakdown:

**Sprint 1: Foundation (Completed)**
	•	Vite decoupling
		○	Extract orchestration logic from vite-plugin-buildamp/index.js (305→100 LOC)
		○	Plugin becomes purely reactive (imports from .hamlet-gen, triggers HMR)
		○	Test with Horatio web/admin/extension vite configs

**Sprint 2: Contract Integrity (Completed)**
	•	Hash-based dirty detection
		○	Implement contract hash calculation (hamlet-contracts package)
		○	Add .hamlet-gen/contracts.json storage/comparison
		○	Replace auto-regeneration with "contract dirty" notifications

**Sprint 3: Core Command (2-3 days)**
	•	Orchestration extraction
		○	Extract ~200 lines of logic from dev-server.js into standalone CLI
		○	Create `hamlet gen` command with phase detection preserved
		○	Maintain existing 9-phase generation pipeline (shared/generation/)
		○	Update contract hashes post-generation
	•	Validation
		○	Test against Horatio's 300+ test suite
		○	Verify all generation phases work correctly

**Sprint 4: Migration & Templates (1-2 days)**
	•	Horatio project migration
		○	Move Glue files: app/generated/ → app/horatio/web/src/.hamlet-gen/
		○	Keep Skeleton files in place (app/horatio/server/src/Api/Handlers/)
		○	Update elm.json source-directories
		○	Update imports in Skeletons to reference new Glue location
	•	Simple template updates
		○	Extend create-buildamp for template file replacement
		○	Basic template sync workflow (no intelligent merging)
	•	Final validation
		○	Full test suite run
		○	Dev workflow verification

**Sprint 5: Polish & Documentation (1 day)**
	•	Update package.json scripts (hamlet gen vs dev-server orchestration)
	•	Document new workflow in CLAUDE.md
	•	Clean up obsolete watcher code
	•	Verify esbuild integration readiness

⸻

Deferred (explicitly later)
	•	esbuild adapter (becomes much cleaner after restructure)
	•	Intelligent template merging (diff/merge tooling)
	•	Multiple example projects
	•	Separate example project distribution
	•	Any attempt to replace Vite SSR HMR
	•	Intelligent template merging (diff/merge tooling)
	•	Multiple example projects
	•	Separate example project distribution
	•	Any attempt to replace Vite SSR HMR
