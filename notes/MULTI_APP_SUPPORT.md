# Multi-App Support in Hamlet

Hamlet now supports working with multiple example apps in local development without modifying committed files.

## Configuration Priority

1. **Environment Variable** (highest priority)
   - Set `HAMLET_APP=my-playground` in `.env` file
   - Used for local development experiments

2. **Package.json Config**
   - `"hamlet": { "defaultApp": "horatio" }` in root package.json
   - Committed to repo, ensures consistent default

3. **Hardcoded Fallback**
   - Falls back to "horatio" if nothing configured

## Usage

### For Local Development

1. Create your experimental app:
   ```bash
   mkdir -p app/playground/models
   mkdir -p app/playground/web/src
   mkdir -p app/playground/server/src
   ```

2. Create `.env` file:
   ```bash
   echo "HAMLET_APP=playground" > .env
   ```

3. Run hamlet commands:
   ```bash
   hamlet gen    # Now targets app/playground
   hamlet watch  # Watches app/playground/models
   hamlet serve  # Serves app/playground
   ```

### For Committed Examples

To add a new example app that should be committed:

1. Create the app structure under `app/`
2. Don't change the default in package.json
3. Switch to it locally using `.env`

## Benefits

- ✅ Experiment freely without affecting committed code
- ✅ Test multiple apps side-by-side
- ✅ Default (horatio) always works for newcomers
- ✅ No hardcoded paths in hamlet-core

## Example Directory Structure

```
app/
├── horatio/        # Committed example (default)
│   ├── models/
│   ├── web/
│   └── server/
├── playground/     # Local experiment (gitignored)
│   ├── models/
│   ├── web/
│   └── server/
└── tutorial/       # Another local experiment
    ├── models/
    ├── web/
    └── server/
```

The `.env` file is gitignored, so your local app selection won't affect others.