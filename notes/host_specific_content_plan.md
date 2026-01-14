# Host-Specific Content Plan

## Goal
Allow each host to have customized HTML with inline config, plus static assets via standard Vite public directory.

## Architecture

**GlobalConfig** (Rust-defined):
- Site name, logo, theme, features
- Elm types generated from Rust model
- Config is inline in each `{hostname}.html` - explicit, no magic injection

**GlobalState** (implementation detail, NOT Rust-defined):
- Just `{ server_now }` for now
- Stays in JS/Elm as implementation plumbing

**Static Assets**:
- Standard Vite `web/public/` directory
- Host-specific subdirs: `web/public/localhost/logo.jpg`

**Interim Solution**:
- Minimal middleware serves `{hostname}.html` if exists
- Future: unikernel shims will handle this upstream, Hamlet ignores hosts dir

## Rust Model

**File:** `app/horatio/models/config/global_config.rs`

```rust
pub struct GlobalConfig {
    pub site_name: String,
    pub logo_url: Option<String>,
    pub favicon_url: Option<String>,
    pub theme: ThemeConfig,
    pub features: FeatureFlags,
}

pub struct ThemeConfig {
    pub primary_color: String,
    pub secondary_color: String,
    pub background_color: String,
    pub text_color: String,
}

pub struct FeatureFlags {
    pub comments: bool,
    pub submissions: bool,
    pub tags: bool,
}
```

## Directory Structure

```
app/horatio/web/
  public/
    localhost.html           # Host-specific entry with inline config
    localhost/
      logo.jpg
      styles.css
    example.com.html
    example.com/
      logo.png
      styles.css
  src/
    index.js
    Main.elm
  index.html                 # Default fallback
```

## Minimal Middleware (Hamlet framework)

**File:** `packages/hamlet-server/middleware/host-html.js`

```javascript
import path from 'path';
import fs from 'fs';

export default function createHostHtml(server) {
    const publicDir = path.join(process.cwd(), 'web/public');

    server.app.get('/', (req, res, next) => {
        const host = sanitizeHost(req.tenant?.host || 'localhost');
        const hostHtml = path.join(publicDir, `${host}.html`);

        if (fs.existsSync(hostHtml)) {
            res.sendFile(hostHtml);
        } else {
            next(); // Fall through to index.html
        }
    });
}

function sanitizeHost(host) {
    return host.replace(/[^a-zA-Z0-9.-]/g, '').replace(/\.\./g, '');
}
```

That's it. No config injection, no hosts/ directory - just serve `{hostname}.html` if it exists.

## Host HTML (explicit config)

**File:** `web/public/localhost.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Local Site</title>
    <link rel="icon" href="/localhost/favicon.ico">
    <link rel="stylesheet" href="/localhost/styles.css">
</head>
<body>
    <div id="app"></div>
    <script>
    window.GLOBAL_CONFIG = {
        site_name: "My Local Site",
        logo_url: "/localhost/logo.jpg",
        favicon_url: "/localhost/favicon.ico",
        theme: {
            primary_color: "#3498db",
            secondary_color: "#2ecc71",
            background_color: "#ffffff",
            text_color: "#333333"
        },
        features: {
            comments: true,
            submissions: true,
            tags: true
        }
    };
    </script>
    <script type="module" src="/src/index.js"></script>
</body>
</html>
```

## Client Changes

### index.js

```javascript
import { Elm } from './Main.elm';

const globalConfig = window.GLOBAL_CONFIG || {
    site_name: "Horatio",
    // ... defaults
};

const app = Elm.Main.init({
    node: document.getElementById('app'),
    flags: globalConfig
});
```

### Main.elm

```elm
main : Program GlobalConfig Model Msg

init : GlobalConfig -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init config url key =
    ( { config = config, ... }, ... )
```

## Generation Changes (Hamlet framework)

**File:** `packages/buildamp-core/index.js`

Add config path:
```javascript
configModelsDir: `app/${activeApp}/models/config`,
```

**File:** `shared/generation/elm_shared_modules.js`

Add config model parsing to generate `Generated/Config.elm` with Elm types from Rust.

## Validation

- No build-time validation for now
- Runtime errors if inline JSON doesn't match Elm Flags type
- Developer sees broken page, fixes JSON

## Implementation Order

1. **Extend buildamp-core:** Add `configModelsDir` path
2. **Extend elm_shared_modules.js:** Parse config models, generate Elm types
3. **Create Rust model:** `models/config/global_config.rs`
4. **Run buildamp gen:** Verify Elm types generated
5. **Create middleware:** `packages/hamlet-server/middleware/host-html.js` (minimal)
6. **Register middleware:** Before static file serving
7. **Update index.js:** Read `window.GLOBAL_CONFIG`
8. **Update Main.elm:** Accept `GlobalConfig` flags
9. **Create localhost.html:** Test host-specific entry

## Verification

1. Create `web/public/localhost.html` with custom title/config
2. Start server, visit http://localhost:3000
3. Verify custom title and config received by Elm
4. Remove localhost.html, verify fallback to index.html works
