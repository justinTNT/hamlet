# Hamlet Sidecar REPL

Interactive Clojure REPL for project verification and analysis.

## Quick Start

```bash
cd sidecar/clj
./start-repl.sh
```

This starts an nREPL server on port 7888 with all verification functions loaded.

## Connect from your editor

**VS Code (Calva):**
- Install Calva extension  
- Connect to Running REPL: `localhost:7888`

**Emacs (CIDER):**
```elisp
M-x cider-connect RET localhost RET 7888
```

**IntelliJ (Cursive):**
- Tools → REPL → Remote nREPL
- Host: localhost, Port: 7888

**Command line:**
```bash
clj -M:nrepl  # or lein repl :connect 7888
```

## Available Commands

```clojure
;; Run all verification checks
(check)

;; Targeted verification  
(check-api)    ; API validation only
(check-db)     ; Database integrity only
(check-biz)    ; Business rules only

;; Interactive workflow
(watch-files)  ; Auto-run checks on file changes
(help)         ; Show all commands

;; Direct function access
(sidecar.api-validation/check-required-field-coverage)
(sidecar.db-integrity/extract-foreign-keys)
(sidecar.business-rules/check-endpoint-consistency)
```

## Example Session

```clojure
user=> (check)
[Sidecar] Running Hamlet project consistency checks...
🔍 API Validation:
[required-field-coverage] ✓ PASS - All required fields have validation coverage
...

user=> (check-api)
🔍 API validation only:
[required-field-coverage] ✓ PASS - All required fields have validation coverage
...

user=> (watch-files)
[Watch] Monitoring files for changes...
; Edit a file, checks run automatically
```

## Development Workflow

1. **Start the REPL**: `./start-repl.sh`
2. **Connect from editor** for interactive development
3. **Run checks** as you work: `(check)`
4. **Monitor changes**: `(watch-files)` for automatic verification
5. **Targeted analysis** with individual check functions

## Philosophy

The sidecar REPL embodies the sidecar contract:
- **Never modifies `/src`** - pure analysis and verification
- **Immediate feedback** - interactive, sub-second responses  
- **Disposable** - Can be stopped/started without affecting main project
- **Exploratory** - REPL encourages investigation and experimentation

Perfect for development workflow - keep it running alongside your main server and get continuous verification feedback.