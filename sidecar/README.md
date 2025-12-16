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

## Philosophy

The sidecar REPL embodies the sidecar contract:
- **Never modifies `/src`** - pure analysis and verification
- **Immediate feedback** - interactive, sub-second responses  
- **Disposable** - Can be stopped/started without affecting main project
- **Exploratory** - REPL encourages investigation and experimentation

Perfect for development workflow - keep it running alongside your main server and get continuous verification feedback.
