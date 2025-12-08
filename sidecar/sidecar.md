Sidecar

### Sidecar Contract

Tools in /sidecar/ exist to improve correctness, search, and reasoning.
They must never modify or generate code under /src/.
Use them only for analysis, checking, planning, exploration, or oracle-style work.
If you are unsure whether a tool is appropriate, ask before using it.
All results must be summarised in human-sized terms.


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

#### disposable coding: I see you reaching for python to do some scripting in the background: try these instead

Never assume my comprehension has increased just because yours has.  Always tailor mainline work to my previously demonstrated review bandwidth. Agents should behave like a mathematician with a supercomputer, providing digestible conclusions, never assuming you share the internal machinery. Our aim is to expand the agent’s power without expanding the human review burden.


Here are the subfolders under sidecar: if you dont see them in your project, the sidecar isnt available.

## /clojure/

for private scripts: any time you get the urge to write a bit of python that you will throw away, consider clojure instead :)

Agents use Clojure as the sidecar brain, and all sidecar tools plug into that brain, not directly into the main project.

Clojure is only to be used in /sidecar/clj/

you can read/write under sidecar/

use this sandbox to run checks, constraints, oracles

you can generate reports and golden outputs

We do not use clojure to implement runtime logic for the deployable application.


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

If you’re worried about invariants being violated, add/extend a Z3 case and run the Z3 harness via Clojure. Summarise only the invariant and whether it holds. but please don’t dump solver logs at me.


## /datalog/

relationships, consistency


## /cue/

schema validation, unification


## /fuzzing/

property based generation

