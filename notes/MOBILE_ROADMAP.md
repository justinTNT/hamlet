# BuildAmp Mobile Roadmap

*Future stretch goals - not immediate priorities*

## Mobile Strategy Context

**Core Decision:** 90% coverage via "PWA + Touch Events" approach
- Web apps with touch event sprinkling covers most mobile use cases
- Native mobile (React Native, Capacitor) only for camera/GPS/app store needs
- Fits BuildAmp philosophy: minimal surface area, right place in ecosystem

## Phase 1: Touch-Enhanced Web (Future)

**Priority: Stretch Goal**

### Touch Event Handlers
- [ ] Add touch event handlers to Elm framework - touchstart, touchmove, touchend decoders
- [ ] Implement responsive layout utilities for Elm-UI - viewport detection, orientation handling  
- [ ] Add gesture recognition system - swipe, pinch, tap detection in Elm
- [ ] Create mobile-first CSS defaults and viewport meta configuration

**Value Proposition:** Same Elm codebase works seamlessly on mobile browsers with native-feeling touch interactions.

## Phase 2: Native App Pathway (Much Later)

**Priority: Far Future**

### Capacitor Integration  
- [ ] Research and prototype Capacitor integration for camera/GPS access
- [ ] Design port interface for native device capabilities (camera, location, etc.)
- [ ] Create mobile app build pipeline with Capacitor

**Value Proposition:** When users need camera/GPS or app store distribution, thin native wrapper around existing web app.

## Implementation Notes

### Touch Events Architecture
```elm
-- Touch event decoders in BuildAmp-generated Elm
onTouch : (Touch -> msg) -> Attribute msg
onSwipe : (SwipeDirection -> msg) -> Attribute msg

-- Responsive layout utilities
responsiveColumn : Viewport -> List (Attribute msg) -> List (Element msg) -> Element msg
```

### Capacitor Integration
```elm
-- Port interfaces for device capabilities
port requestCamera : () -> Cmd msg
port cameraResult : (String -> msg) -> Sub msg

-- Generated from Rust types, same as other BuildAmp APIs
```

### Build Pipeline
- **Core web app** builds with existing BuildAmp tooling
- **Mobile wrapper** adds native capabilities via separate build step
- **Same domain models** work across web and mobile

## Why This is the Right Approach

1. **Leverages web strengths** - Elm's excellent mobile web support
2. **Avoids ecosystem complexity** - No React Native bridge needed
3. **Maintains code reuse** - 95%+ shared between web and mobile
4. **Progressive enhancement** - Mobile features optional, not required
5. **BuildAmp philosophy** - Small addition, big capability unlock

## Dependencies

**Before mobile makes sense:**
- [ ] Core BuildAmp adoption and stability
- [ ] Plugin ecosystem maturity  
- [ ] User demand for mobile features
- [ ] Touch/gesture library selection
- [ ] Capacitor integration research

**Mobile readiness criteria:**
- BuildAmp has proven web adoption
- Users requesting mobile deployment
- Touch interaction patterns validated
- Native device access use cases clear

---

*This roadmap represents future possibilities, not current commitments. Focus remains on core client↔server boundary solutions.*