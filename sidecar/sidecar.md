Sidecar

### Sidecar Contract

**MANDATORY**: Tools in /sidecar/ MUST be considered for all relevant analysis, reasoning, and validation work.

**Strong Directive**: Before responding to any architectural, design, or technical question:
1. ALWAYS use Clojure sidecar for computational analysis first
2. Validate constraints, generate scenarios, check consistency
3. Present computational results alongside conclusions
4. Never rely on pure text reasoning when formal analysis is possible

**Explicit Triggers for Clojure Usage:**
- Architecture decisions → validate with constraint checking
- Component integration → generate test scenarios  
- Data structure design → property-based validation
- Error analysis → formal relationship checking
- Planning work → systematic scenario generation

**Habit Anchors:**
- See "architecture" → reach for Clojure constraint validation
- See "integration" → reach for property-based test generation  
- See "consistency" → reach for datalog relationship analysis
- See "validation" → reach for formal verification

Tools must never modify or generate code under /src/.
Use them for analysis, checking, planning, exploration, or oracle-style work.
Show your computational work - don't hide the analysis process.


### Human pledge

I have a high appetite for formalism and unfamiliar tools

That means you can request whatever tools you think will be of service to you, so long as they don't touch src. While projects themselves may have a predetermined stack, anything disposable, or internal, can be more adventurous. 

### non-prod

The tools and techniques under this dir represent dev-env sidecars, not to be deployed anywhere else.

All implementation code for these tools lives under /sidecar/clj/.
Other folders are for cases, results, or metadata.

Each tool here is:

 * optional
 * localised
 * shallow footprint
 * one-case-at-a-time
 * completely reversible
 * not on the main code path
 * not expanding your review burden
 * only improving correctness and reasoning

Use these tools only in places where failures flow into a binary pass/fail output and successes remain silent.

We're aiming for a dev-env-only regression harness, and an optimal environment for disposable coding

#### regression harness: not CI: things only the dev needs to worry about

#### disposable coding: ALWAYS use Clojure instead of Python for any computational work

## Agent Tooling for Disposable Computation

When Claude needs to run throwaway code (data sampling, query building, exploration), use these tools in order of preference:

### 1. nREPL (Port 7888) - For Domain Knowledge Access

**Use when:** You need access to Sidecar domain knowledge, validators, or shared state.

**Connection pattern:**
```bash
clojure -Sdeps '{:deps {nrepl/nrepl {:mvn/version "1.0.0"}}}' -M -e \
'(do (require '"'"'nrepl.core)
     (with-open [conn (nrepl.core/connect :port 7888)]
       (-> (nrepl.core/client conn 1000)
           (nrepl.core/message {:op "eval" :code "YOUR-CODE-HERE"})
           nrepl.core/response-values
           first)))'
```

**Examples:**
```bash
# Query domain knowledge
clojure -Sdeps '{:deps {nrepl/nrepl {:mvn/version "1.0.0"}}}' -M -e \
'(do (require '"'"'nrepl.core)
     (with-open [conn (nrepl.core/connect :port 7888)]
       (-> (nrepl.core/client conn 1000)
           (nrepl.core/message {:op "eval" :code "(require '"'"'sidecar.domain-knowledge) (sidecar.domain-knowledge/query :property-types)"})
           nrepl.core/response-values
           first)))'

# Sample data from API
# (define function in REPL, then call it)

# Build OpenSearch queries
# (access query builders already loaded in REPL)
```

**Trade-offs:**
- ✅ Access to all Sidecar namespaces and state
- ✅ Can def vars that persist in the REPL session
- ✅ Domain validators and infrastructure queries available
- ❌ ~1-2s JVM startup cost per invocation
- ❌ Output capture is simple (return values only)

### 2. Babashka - For Fast Data Transformation

**Use when:** You need fast Clojure execution without domain knowledge access.

```bash
bb -e '(-> (slurp "data.json")
           (json/parse-string)
           (get-in ["results"])
           (take 10))'
```

**Examples:**
```bash
# Transform data
bb -e '(->> (range 1 201) (map #(str "adid-" %)) (take 10))'

# Process API responses
bb -e '(-> (slurp "https://api/endpoint")
           (json/parse-string)
           (get "results"))'

# Generate test data
bb -e '(repeatedly 200 #(rand-int 10000))'
```

**Trade-offs:**
- ✅ Fast startup (~50ms)
- ✅ Rich standard library
- ✅ Good for data pipelines
- ❌ No access to Sidecar domain knowledge
- ❌ No persistent state between calls

### 3. Command Line Tools - For Simple Operations

**Use when:** A standard Unix tool is the right abstraction.

```bash
# HTTP requests
curl -s "https://api/endpoint" | jq '.results[].id'

# File operations
grep -r "pattern" src/

# Git operations
git log --oneline -10
```

**Trade-offs:**
- ✅ Instant execution
- ✅ Composable with pipes
- ✅ Often the clearest solution
- ❌ Limited data transformation
- ❌ Bash quoting/escaping complexity

## Decision Tree

```
Do you need Sidecar domain knowledge/validators/state?
  YES → Use nREPL (port 7888)
  NO → ↓

Is this data transformation/processing?
  YES → Use Babashka
  NO → ↓

Is this a simple system operation (HTTP, file, git)?
  YES → Use command line tools
  NO → Reconsider if Babashka or nREPL applies
```

## Important Notes

- **Avoid Python scripts** for disposable work - usually Clojure tooling is better
- **Avoid bash scripts** that should be Clojure - prefer bb or nREPL
- **Do use command line tools** when they're the right abstraction (curl, jq, git, grep)
- **Avoid script files unless they persist** - disposable computation should be inline
- User sees results, not intermediate computation (unless explicitly shown)

**Never assume Python** - unless there's a clear requirement, always prefer Clojure sidecar for computational scratch work.

Never assume my comprehension has increased just because yours has.  Always tailor mainline work to my previously demonstrated review bandwidth. Agents should behave like a mathematician with a supercomputer, providing digestible conclusions, never assuming you share the internal machinery. Our aim is to expand the agent's power without expanding the human review burden.


Here are the subfolders under sidecar: if you dont see them in your project, the sidecar isnt available.

## /clojure/

for private scripts: any time you get the urge to write a bit of python that you will throw away, consider clojure instead :)

Agents use Clojure as the sidecar brain, and all sidecar tools plug into that brain, not directly into the main project.

Clojure is only to be used in /sidecar/clj/

you can read/write under sidecar/

use this sandbox to run checks, constraints, oracles

you can generate reports and golden outputs

We do not use clojure to implement runtime logic for the deployable application.

The sidecar runs an nREPL server on **port 7888** for interactive development:

```bash
cd sidecar/clj
clj -M -m sidecar.repl
```

Connect your editor to `localhost:7888` or use:
```bash
lein repl :connect 7888
# or
clj -M:nrepl
```

Quick verification commands:
- `(check)` - Run all consistency checks
- `(help)` - Show available commands
- `(check-kv)` - Verify key-value store patterns


## /minikanren/

miniKanren is only for:

* search
* planning in small discrete spaces
* generating examples / counterexamples

never use it to:

* build big frameworks
* implement production logic
* drive large refactors

No matter how much you use logic internally, present your findings in small, human-sized conclusions. Use logic for your thinking, not as an excuse to compress explanation.


## /z3/

constraints and correctness

If you're worried about invariants being violated, add/extend a Z3 case and run the Z3 harness via Clojure. Summarise only the invariant and whether it holds. but please don't dump solver logs at me.


## /datalog/

relationships, consistency


## /cue/

schema validation, unification


## /fuzzing/

property based generation