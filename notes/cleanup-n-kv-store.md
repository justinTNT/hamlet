Maintenance & KV Store Bridge Plan

Address identified entropy in the TEA Handler Pool and complete the type-safe bridge for KV Store models.

Proposed Changes

[Component] TEA Handler Pool (packages/hamlet-server)

[MODIFY] 
elm-service.js

Fix the setTimeout leak by properly clearing timers on request completion/timeout.

something like

// L273: Inside callHandler
let timeoutId = null;

const cleanup = () => {
    if (timeoutId) clearTimeout(timeoutId); // Clear the leak!
    cleanupRequestSubscriptions();
    handlerPool.releaseHandler(handlerInstance);
};

// ... inside the completion subscription ...
cleanup();
resolve(parsed);

// L594: The actual timer
timeoutId = setTimeout(() => {
    if (!isResolved) {
        // ... timeout logic ...
        cleanup();
        reject(new Error(...));
    }
}, 10000);

Add port handling for the new KV Store interface.

[Component] Generators (shared/generation)

[MODIFY] 

elm_shared_modules.js

Add generateKvModule to produce Generated/KV.elm.
Mirror the Database/Events pattern for KV models (Set, Get, Delete, Exists).
Ensure "Rust Once" by parsing models from models/kv/*.rs.

Verification Plan

Automated Tests

Run existing integration tests to ensure no regressions in handler lifecycle.
Verify Generated/KV.elm is produced and syntactically correct.

Manual Verification

Check server logs for "Cleaned up timers" or equivalent to confirm no leak.

Verify that a TEA handler can now use KV.set and KV.get without manual JSON.
