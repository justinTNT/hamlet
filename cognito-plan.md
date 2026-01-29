# Implementation Plan - Cognito Service Integration

Implement AWS Cognito authentication using the "Service-First" pattern. Instead of baking authentication logic into the `hamlet-server` framework middleware, we define a standard API endpoint (`Api.Auth.Login`) in the application layer (`app/horatio`). This handler performs the "handshake," verifying the Cognito token and upgrading the user's session.

## User Review Required
> [!IMPORTANT]
> **Environment Variables**: The `horatio` application server requires:
> - `COGNITO_USER_POOL_ID`
> - `COGNITO_CLIENT_ID`
> - `AWS_REGION`

## Proposed Changes

### 1. Service Interface Definition (Elm)

#### [NEW] [app/horatio/models/Api/Auth/Login.elm](file:///Users/jtnt/Play/hamlet/app/horatio/models/Api/Auth/Login.elm)
- **Request**: `{ token : String }` (The Cognito Access Token from the frontend).
- **Response**: `{ success : Bool, userId : Maybe String }`.
- **Purpose**: Handshake endpoint to trade a transient Token for a persistent Session Link.

#### [NEW] [app/horatio/models/Api/Auth/Identify.elm](file:///Users/jtnt/Play/hamlet/app/horatio/models/Api/Auth/Identify.elm)
- **Request**: `{}`
- **Response**: `{ status : AuthStatus, userId : Maybe String, guestId : String }`
- **Purpose**: Allows the frontend to check "Who am I?" based on the current Session Cookie.

### 2. Application Implementation (Node.js)

#### [MODIFY] [app/horatio/server/package.json](file:///Users/jtnt/Play/hamlet/app/horatio/server/package.json)
- Add `aws-jwt-verify` dependency.

#### [NEW] [app/horatio/server/src/Api/Handlers/Auth/Login.js](file:///Users/jtnt/Play/hamlet/app/horatio/server/src/Api/Handlers/Auth/Login.js)
- **Handler Logic**:
    1.  Receive `token` from request body.
    2.  Use `CognitoJwtVerifier` to verify the token.
    3.  Extract `sub` (User ID).
    4.  **Application Link**:
        -   The handler receives the `sessionId` from the context (standard).
        -   It writes to the **Application Database** (e.g., `user_sessions` table) or **KV Store**:
        -   `INSERT INTO user_sessions (session_id, user_id) ...`
    5.  Return success.

### 3. Framework Support (None)

- **[NO CHANGE]** `packages/hamlet-server/middleware/elm-service.js`
- The framework provides the stable `sessionId`.
- The application manages the meaning of that session.

## Verification Plan

### Automated Tests
1.  **Generate**: Run `buildamp gen` to scaffold the new `Auth` endpoints.
2.  **Handler Test**: Verify `Login.js` writes to the DB/KV.

### Manual Verification
1.  **Guest Check**: `Identify` queries DB for `sessionId` -> Returns `Guest`.
2.  **Login**: `Login` verifies token and inserts DB row.
3.  **Auth Check**: `Identify` queries DB -> Finds `userId` -> Returns `Authenticated`.
