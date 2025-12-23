# Plan for Tomorrow: Fix Tests + Integrate Admin UI

## Phase 1: Fix Broken Tests (Priority: High)
**Goal**: Get from 12/18 passing test suites to 18/18

### Test Failures to Address:

**1. dependency-order.test.js**
- **Issue**: Database.elm not found during handler generation
- **Fix**: Ensure shared module generation runs before handler generation
- **Location**: `packages/hamlet-server/tests/generation/dependency-order.test.js`

**2. api-routes.test.js** 
- **Issue**: JSON parsing errors in generated API routes
- **Fix**: Debug JSON structure in generated routes, likely field validation or context injection
- **Location**: `packages/hamlet-server/tests/generation/api-routes.test.js`

**3. kv-store-simple.test.js**
- **Issue**: JSON deserialization error "Unexpected token i"
- **Fix**: Check Redis mock data format in test
- **Location**: `packages/hamlet-server/tests/generation/kv-store-simple.test.js`

**4. sse.test.js, api-routes-simple.test.js, rust-model-parsing.test.js**
- **Fix**: Address remaining parsing/generation issues

## Phase 2: Admin UI Integration (Priority: Medium)
**Goal**: Full admin interface accessible through main Horatio server

### Admin Backend Integration:
**1. Register Admin Middleware**
- **File**: `/app/horatio/server/server.js`
- **Action**: Import and register `admin-api.js` and `admin-auth.js` middleware
- **Code**: 
```javascript
import createAdminApi from '../../../packages/hamlet-server/middleware/admin-api.js';
import createAdminAuth from '../../../packages/hamlet-server/middleware/admin-auth.js';

// After server creation, before start():
server.app.use('/admin', createAdminAuth());
createAdminApi(server);
```

### Admin Frontend Integration:
**2. Static Admin UI Serving**
- **Option A**: Build admin UI and serve static files from main server
- **Option B**: Proxy admin UI dev server through main server
- **Recommended**: Option A for production readiness

**3. Admin UI Build Process**
- **File**: `/app/horatio/admin/package.json`
- **Action**: Ensure build outputs to `dist/` for serving
- **Integration**: Serve `/admin/ui/*` routes from main server

### Security Setup:
**4. Environment Configuration**
- **File**: `/app/horatio/server/.env` (create if needed)
- **Action**: Set `HAMLET_ADMIN_TOKEN=your-secure-token`
- **Documentation**: Add admin access instructions

## Phase 3: Testing & Documentation

**5. End-to-End Admin Testing**
- Test admin login with token
- Test CRUD operations on each model
- Verify tenant isolation works
- Test error handling

**6. Update Documentation**
- Admin UI access instructions
- Environment variable setup
- Admin token security guidelines

## Tomorrow's Execution Order:

1. **Start with tests** (easier wins first):
   - Fix kv-store JSON parsing (likely simple mock data issue)
   - Fix dependency-order Database.elm issue
   - Debug api-routes JSON structure

2. **Then admin integration**:
   - Register middleware in server.js
   - Build and serve admin UI
   - Test full admin workflow

3. **Final verification**:
   - Run all tests → should be 18/18 passing
   - Access admin UI at `http://localhost:3000/admin/ui`
   - Test admin operations with database

**Expected outcome**: Fully functional admin interface integrated into main Horatio server with all tests passing.