# Hamlet Framework Roadmap 2.0

## Vision
Hamlet provides **type-safe client-server boundaries** with **web-native capabilities** for modern PWA development. Focus on eliminating JSON codec drudgery while enabling mobile-like experiences through standard web APIs.

## Current State
- ✅ **Core Framework**: Rust→Elm type generation working
- ✅ **Middleware Stack**: Database, KV store, SSE, sessions with tenant isolation
- ✅ **Demo Application**: Horatio microblog proves the concept
- ✅ **Background Events**: Basic event queue with retry/DLQ in Horatio
- ✅ **Session Management**: HTTP session cookies replacing fingerprinting

## Major Components (Priority Order)

### 🎯 **Phase 1: File System (Immediate - 4-6 weeks)**

Essential for real applications. Web-native file handling with background processing.

#### 1.1 Type-Safe File Upload
```rust
// Domain types defined in Rust
pub struct FileUploadReq {
    pub content: Vec<u8>,
    pub filename: String,
    pub content_type: String,
    pub constraints: FileConstraints,
}

pub struct FileConstraints {
    pub max_size_mb: u32,
    pub allowed_types: Vec<String>,
    pub image_max_dimensions: Option<(u32, u32)>,
}
```

#### 1.2 File Upload Middleware
- HTTP multipart handling
- Constraint validation  
- Temporary file storage
- Background processing triggers
- CDN integration hooks

#### 1.3 File Storage Backend
- Local filesystem for development
- S3/CloudFlare R2 for production
- URL generation and signed URLs
- Metadata storage in database

**Dependencies**: None (builds on existing middleware)
**Deliverables**: 
- `file-upload` middleware for hamlet-server
- Generated Elm types and HTTP clients
- File processing event integration

---

### 📱 **Phase 2: Web-Native Phone Capabilities (6-8 weeks)**

Mobile-like experience through standard web APIs. Builds on existing storage middleware.

#### 2.1 Device Capabilities Interface
```rust
// GPS capability
pub struct LocationRequest {
    pub accuracy: LocationAccuracy,
    pub timeout_ms: u32,
}

pub enum LocationResult {
    Success { lat: f64, lng: f64, accuracy: f64 },
    Denied,
    Unavailable,
    Timeout,
}
```

#### 2.2 Web APIs Integration
- **GPS**: Geolocation API with permissions
- **Files**: Camera capture, document selection via `<input type="file">`
- **Clipboard**: Copy/paste with fallback patterns
- **Storage**: IndexedDB patterns for device persona

#### 2.3 PWA Infrastructure
- Service worker for app shell caching
- Manifest for installability
- Fast startup optimization
- Offline queue foundation

#### 2.4 Device Persona System
- Per-device identity in IndexedDB
- Server-side device registration
- Session + persona linking
- Recovery via authentication

**Dependencies**: File system (for camera/file capabilities)
**Deliverables**:
- `device-capabilities` middleware
- PWA enhancement utilities
- Generated Elm capability interfaces
- Device persona management system

---

### ⚙️ **Phase 3: Background Workers (8-12 weeks)**

Complex but essential for true mobile experience. Enables offline/background processing.

#### 3.1 Service Worker Architecture
- App shell caching strategy
- Background sync for form submissions
- Offline queue with retry logic
- Push notifications (optional)

#### 3.2 Server-Side Background Jobs
- Generalize Horatio's event queue
- Job scheduling and retry logic
- Worker process management
- Dead letter queue handling

#### 3.3 File Processing Pipeline
- Image resizing and optimization
- Video transcoding
- Document processing
- Virus scanning integration

#### 3.4 Offline-First Patterns
- Local-first data synchronization
- Conflict resolution strategies
- Progressive enhancement
- Network-aware processing

**Dependencies**: File system, Device capabilities
**Deliverables**:
- `background-workers` middleware
- Service worker utilities
- Job queue management system
- Offline synchronization patterns

---

### 📚 **Phase 4: Developer Experience (Parallel/Ongoing)**

Enhanced documentation and tooling. Can be developed alongside other phases.

#### 4.1 Extended API Documentation
- OpenAPI generation for all middleware
- Interactive documentation (Swagger UI)
- Capability testing interface
- Type-safe client SDK generation

#### 4.2 Development Tooling
- Hot reloading for capabilities
- Debug utilities for PWA features
- Testing harness for offline scenarios
- Performance monitoring integration

#### 4.3 Example Applications
- Photo sharing app (files + capabilities)
- Location-based app (GPS + offline)
- Document editor (clipboard + storage)
- Real-time chat (SSE + background sync)

**Dependencies**: None (can run parallel)
**Deliverables**:
- Enhanced documentation system
- Developer debugging tools
- Reference applications
- Best practices documentation

---

### 🔐 **Phase 5: Authentication Integration (Future)**

Low-friction auth following external specifications. Integrates with existing session system.

#### 5.1 Social Authentication (Cognito)
- OAuth integration with Cognito
- Social login (Google, GitHub, Apple)
- No provider leakage to Elm apps
- Clean auth capability interface

#### 5.2 Device Persona Linking
- Anonymous → authenticated progression
- Device recovery via auth
- Multi-device persona management
- Privacy-first approach

#### 5.3 Authorization Framework
- Role-based access control
- Capability-based permissions
- Tenant-scoped authorization
- API-first security model

**Dependencies**: Device personas, Core file system
**Deliverables**:
- `cognito-auth` middleware
- Device linking system
- Authorization middleware
- Privacy-compliant user management

---

## Success Criteria

### Phase 1 (Files)
- [ ] Upload photos/documents in Elm app with type safety
- [ ] Background image processing working
- [ ] CDN integration for production use

### Phase 2 (Phone)
- [ ] GPS location in Elm app
- [ ] Camera capture through file input
- [ ] PWA installs and launches instantly
- [ ] Device persona persists across sessions

### Phase 3 (Workers)  
- [ ] Offline form submission with background sync
- [ ] File processing without blocking UI
- [ ] Reliable job queue with monitoring
- [ ] True mobile-like offline experience

### Phase 4 (DevEx)
- [ ] Interactive API documentation for all features
- [ ] Debug tools for PWA development
- [ ] Reference apps demonstrating patterns

### Phase 5 (Auth)
- [ ] One-tap social login
- [ ] Seamless device recovery
- [ ] Privacy-compliant user management

## Architecture Principles

1. **Web-Native First**: Use standard web APIs, not native app emulation
2. **Progressive Enhancement**: Apps work with basic HTTP, enhanced with capabilities  
3. **Type Safety**: All boundaries defined in Rust, generated for Elm
4. **Privacy-First**: Anonymous by default, explicit consent for identity
5. **Offline-Capable**: Graceful degradation, local-first when possible
6. **Developer-Friendly**: Minimal boilerplate, maximum type safety

## Risk Mitigation

### Technical Risks
- **Service Worker Complexity**: Start simple, evolve incrementally
- **Browser Compatibility**: Focus on modern browsers, graceful fallbacks
- **Background Job Reliability**: Use proven patterns, comprehensive monitoring

### Scope Risks  
- **Feature Creep**: Stick to web-native capabilities only
- **Performance**: Benchmark early and often
- **Security**: Security review for each phase

### Delivery Risks
- **Dependencies**: Keep phases loosely coupled  
- **Documentation**: Write docs as we build, not after
- **Testing**: Build test infrastructure alongside features

## Next Steps

1. **Week 1-2**: Detailed technical design for Phase 1 (File System)
2. **Week 3**: Begin file upload middleware implementation
3. **Week 4-6**: File processing and storage backend
4. **Week 7**: Begin Phase 2 planning while completing Phase 1

This roadmap balances ambition with pragmatism - each phase delivers standalone value while building toward the complete vision.