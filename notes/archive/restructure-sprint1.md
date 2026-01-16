# Sprint 1: Foundation (2-3 days)

## Objective
Establish the foundation for explicit `hamlet gen` workflow by decoupling Vite and implementing contract integrity.

## Day 1: Vite Plugin Simplification

### Implementation
- Extract orchestration logic from `vite-plugin-buildamp/index.js` (305→100 LOC)
- Plugin becomes purely reactive adapter
- Remove file watching, build scheduling, WASM orchestration

### Target Plugin Structure
```javascript
export default function buildampPlugin(options = {}) {
    return {
        name: 'vite-plugin-buildamp-reactive',
        config: () => ({
            // Setup aliases to .hamlet-gen/
        }),
        configureServer: (server) => {
            // Watch .hamlet-gen/contracts.json
            // Trigger HMR when contracts change
        }
    };
}
```

### Tests to Write
```javascript
// packages/vite-plugin-buildamp/tests/reactive-plugin.test.js
describe('Vite Plugin Reactive Mode', () => {
  test('plugin exports required Vite hooks', () => {})
  test('configures aliases to .hamlet-gen directory', () => {})
  test('does NOT contain file watching logic', () => {})
  test('does NOT contain build orchestration', () => {})
  test('plugin is under 100 LOC', () => {})
})

// packages/vite-plugin-buildamp/tests/hmr-boundaries.test.js
describe('HMR Boundaries', () => {
  test('reacts to .hamlet-gen/contracts.json changes', () => {})
  test('does NOT react to owned Elm code changes', () => {})
  test('does NOT react to Rust model changes', () => {})
  test('triggers full-reload on contract changes', () => {})
})
```

### Existing Tests to Verify
- All generation tests should still pass (15+ tests)
- Horatio dev server should still work


## Day 2: Contract Integrity

*Moved to Sprint 2 (hamlet-contracts package) - Completed*

## Day 3: Integration & Cleanup

*Completed in Sprint 1 wrap-up*

### Tests to Write
```javascript
// tests/integration/sprint1-workflow.test.js
describe('Sprint 1 Integration', () => {
  test('full workflow: change model → detect dirty → user runs gen → HMR triggers', () => {})
  test('Vite plugin loads .hamlet-gen files correctly', () => {})
  test('no regression in existing dev-server workflow', () => {})
})

// packages/hamlet-server/tests/elm-service-cleanup.test.js
describe('Elm Service Cleanup', () => {
  test('requestContexts removed completely', () => {})
  test('request isolation still works via local scoping', () => {})
  test('no performance regression after cleanup', () => {})
})
```

### Final Validation
```bash
# Run after each component:
npm test -- packages/vite-plugin-buildamp/
npm test -- packages/hamlet-server/tests/generation/
npm test -- app/horatio/server/tests/

# Final validation:
./run_all_tests.sh
```

## Critical Success Criteria

### Must Have
- [ ] Vite plugin ≤100 LOC, no orchestration
- [ ] Contract hashing works reliably
- [ ] HMR triggers ONLY on `.hamlet-gen/` changes
- [ ] Existing generation still works (via dev-server.js)
- [ ] 15+ new tests written and passing
- [ ] No existing test failures

### Nice to Have
- [ ] Server startup contract verification
- [ ] Dead code removal completed

## Test Coverage Targets
- **Vite Plugin**: 90%+ coverage (small, focused code)
- **Contract System**: 95%+ coverage (critical functionality)
- **Integration**: Key workflows covered
- **No regression**: All 300+ existing tests still pass

## Risks & Mitigations

### Risk 1: HMR breaks completely
- Mitigation: Keep old plugin available as fallback
- Test incrementally with Horatio

### Risk 2: Contract hashing too slow
- Mitigation: Cache intermediate results
- Only hash changed files

### Risk 3: Breaking existing workflow
- Mitigation: Keep dev-server.js working
- Sprint 1 adds capabilities without removing old ones

## Decisions Made
1. **Contract hash algorithm**: SHA-256 (cryptographically secure, deterministic)
2. **HMR signal mechanism**: File watcher on `.hamlet-gen/contracts.json`
3. **Contract storage location**: Always `.hamlet-gen/contracts.json` (consistent, predictable)

## Test-Driven Implementation Order
1. **Write failing tests first**
2. **Implement minimal code to pass**
3. **Refactor with confidence**

## Success Metrics
- [ ] Contract dirty detection <10ms
- [ ] HMR boundary tests prevent circular loops
- [ ] Dead code verified removed
- [ ] All tests passing