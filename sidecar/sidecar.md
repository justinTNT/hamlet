Sidecar

## Stub Honesty Policy

**No theatre. Stubs are fine but be explicit.**

### ✅ Good stub patterns:
```javascript
// STUB: Email service not implemented
console.log("🚧 STUB: Would send email to", user.email);
throw new Error("EMAIL_NOT_IMPLEMENTED: Email service is stubbed");

// TODO_IMPLEMENT: Cron parsing needs library
if (eventRequest.schedule) {
    throw new Error("CRON_NOT_IMPLEMENTED: Cron scheduling needs cron parser library");
}
```

### ❌ Bad stub patterns:
```javascript
// DON'T: Fake success
console.log("✅ Email sent successfully!");
// TODO: Actually send email
return { success: true };

// DON'T: Hide critical missing functionality  
console.log("⏰ Recurring event:", eventRequest.schedule);
// TODO: Parse cron schedule
executeAt = new Date(); // Just run now
```

### Rule: **Log what actually happened, not what should have happened**

- If you stub it → say you stubbed it
- If it works → say it works  
- If it's partial → say it's partial
- Make it obvious what works and what remains unresolved

No false confidence. No aspirational logging. No theatre.

### Sidecar Contract

**MANDATORY**: Tools in /sidecar/ MUST be considered whenever an agent might otherwise use python

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

#### disposable coding: ALWAYS consider Clojure before Python for any computational work

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

use this sandbox for checks, constraints, oracles

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


## /z3/

constraints and correctness

If you're worried about invariants being violated, add/extend a Z3 case and run the Z3 harness via Clojure. Summarise only the invariant and whether it holds. but please don't dump solver logs at me.


