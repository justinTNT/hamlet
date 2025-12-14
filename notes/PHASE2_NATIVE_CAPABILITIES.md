# Phase 2: Native Capabilities - Technical Design

## Goal
Generate type-safe native capability handling (GPS, Clipboard, etc.) from Rust domain types. Eliminate the manual port setup that every mobile-like app implements.

## Domain Types Definition

```rust
// Define capabilities in your app
#[derive(BuildAmpCapability, Debug, Clone)]
pub enum LocationCapability {
    // Request types
    GetLocation { 
        accuracy: LocationAccuracy, 
        timeout_ms: u32 
    },
    WatchLocation { 
        accuracy: LocationAccuracy 
    },
    StopWatching { 
        watch_id: String 
    },
    
    // Response types
    LocationSuccess { 
        lat: f64, 
        lng: f64, 
        accuracy: f64, 
        timestamp: u64,
        watch_id: Option<String>,
    },
    PermissionDenied,
    LocationUnavailable,
    Timeout,
    UnsupportedBrowser,
}

#[derive(BuildAmpElm, Debug, Clone)]
pub enum LocationAccuracy {
    Low,    // ~10km, fast, low battery
    Medium, // ~100m, balanced  
    High,   // ~10m, slow, high battery
}

#[derive(BuildAmpCapability, Debug, Clone)]
pub enum ClipboardCapability {
    // Request types
    Write { text: String },
    Read,
    
    // Response types  
    WriteSuccess,
    ReadSuccess { text: String },
    FallbackRequired, // User needs to paste manually
    PermissionDenied,
    UnsupportedBrowser,
}

#[derive(BuildAmpCapability, Debug, Clone)]
pub enum FilePickerCapability {
    // Request types
    Pick { 
        accept: Vec<String>, 
        multiple: bool,
        capture: Option<CaptureMode>,
    },
    
    // Response types
    FilesSelected { files: Vec<PickedFile> },
    Cancelled,
    PermissionDenied,
    UnsupportedBrowser,
}

#[derive(BuildAmpElm, Debug, Clone)]
pub enum CaptureMode {
    Camera,     // camera capture
    Camcorder,  // video capture  
    Microphone, // audio capture
}

#[derive(BuildAmpElm, Debug, Clone)]
pub struct PickedFile {
    pub name: String,
    pub size: u64,
    pub content_type: String,
    pub last_modified: u64,
    // File object reference handled in JS
}
```

## Generated Elm Code

```elm
-- Generated module: Capabilities.Location
module Capabilities.Location exposing (..)

import Json.Decode as Decode
import Json.Encode as Encode

-- Generated types
type LocationAccuracy = Low | Medium | High

type LocationRequest
    = GetLocation { accuracy : LocationAccuracy, timeoutMs : Int }
    | WatchLocation { accuracy : LocationAccuracy }
    | StopWatching { watchId : String }

type LocationResult
    = LocationSuccess 
        { lat : Float
        , lng : Float  
        , accuracy : Float
        , timestamp : Int
        , watchId : Maybe String
        }
    | PermissionDenied
    | LocationUnavailable  
    | Timeout
    | UnsupportedBrowser

-- Generated capability function
requestLocation : LocationRequest -> Cmd Msg
requestLocation request =
    -- Uses generated port under the hood
    locationRequestPort (encodeLocationRequest request)

-- Generated subscription
locationResult : (LocationResult -> msg) -> Sub msg
locationResult toMsg =
    locationResultPort (toMsg << decodeLocationResult)

-- Generated helper functions
getLocation : LocationAccuracy -> Int -> Cmd Msg
getLocation accuracy timeoutMs =
    requestLocation (GetLocation { accuracy = accuracy, timeoutMs = timeoutMs })

watchLocation : LocationAccuracy -> Cmd Msg  
watchLocation accuracy =
    requestLocation (WatchLocation { accuracy = accuracy })

stopWatching : String -> Cmd Msg
stopWatching watchId =
    requestLocation (StopWatching { watchId = watchId })

-- Generated JSON codecs (internal, hidden from user)
encodeLocationRequest : LocationRequest -> Encode.Value
decodeLocationResult : Decode.Value -> LocationResult
-- Implementation generated automatically...
```

```elm
-- Generated module: Capabilities.Clipboard  
module Capabilities.Clipboard exposing (..)

type ClipboardRequest
    = Write { text : String }
    | Read

type ClipboardResult
    = WriteSuccess
    | ReadSuccess { text : String }
    | FallbackRequired
    | PermissionDenied
    | UnsupportedBrowser

-- Generated capability functions
writeToClipboard : String -> Cmd Msg
writeToClipboard text =
    clipboardRequest (Write { text = text })

readFromClipboard : Cmd Msg
readFromClipboard =
    clipboardRequest Read

-- Generated subscription
clipboardResult : (ClipboardResult -> msg) -> Sub msg

-- Internal ports (hidden)
clipboardRequest : ClipboardRequest -> Cmd Msg
clipboardResult : (ClipboardResult -> msg) -> Sub msg
```

```elm
-- Generated module: Capabilities.FilePicker
module Capabilities.FilePicker exposing (..)

import File exposing (File)

type CaptureMode = Camera | Camcorder | Microphone

type FilePickerRequest
    = Pick 
        { accept : List String
        , multiple : Bool
        , capture : Maybe CaptureMode
        }

type FilePickerResult  
    = FilesSelected { files : List PickedFile }
    | Cancelled
    | PermissionDenied
    | UnsupportedBrowser

type alias PickedFile =
    { name : String
    , size : Int
    , contentType : String
    , lastModified : Int
    , file : File -- Actual File object for upload
    }

-- Generated capability functions
pickFiles : List String -> Bool -> Maybe CaptureMode -> Cmd Msg
pickFiles accept multiple capture =
    filePickerRequest (Pick { accept = accept, multiple = multiple, capture = capture })

pickImages : Bool -> Cmd Msg
pickImages multiple =
    pickFiles ["image/*"] multiple (Just Camera)

pickDocuments : Bool -> Cmd Msg  
pickDocuments multiple =
    pickFiles ["application/pdf", "text/*"] multiple Nothing

-- Generated subscription
filePickerResult : (FilePickerResult -> msg) -> Sub msg
```

## Generated JavaScript Capability Handlers

```javascript
// Generated: location_capability.js
// Auto-generated by Hamlet - do not edit manually

export function setupLocationCapability(app) {
    console.log('📍 Setting up location capability');
    
    let activeWatches = new Map();
    
    function handleLocationError(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return { type: 'PermissionDenied' };
            case error.POSITION_UNAVAILABLE:
                return { type: 'LocationUnavailable' };
            case error.TIMEOUT:
                return { type: 'Timeout' };
            default:
                return { type: 'LocationUnavailable' };
        }
    }
    
    function getGeolocationOptions(accuracy, timeoutMs) {
        return {
            enableHighAccuracy: accuracy === 'High',
            timeout: timeoutMs || 10000,
            maximumAge: accuracy === 'Low' ? 300000 : 60000,
        };
    }
    
    // Handle location requests
    if (app.ports && app.ports.locationRequestPort) {
        app.ports.locationRequestPort.subscribe((request) => {
            if (!('geolocation' in navigator)) {
                app.ports.locationResultPort.send({ type: 'UnsupportedBrowser' });
                return;
            }
            
            switch (request.type) {
                case 'GetLocation':
                    const options = getGeolocationOptions(request.accuracy, request.timeoutMs);
                    
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            app.ports.locationResultPort.send({
                                type: 'LocationSuccess',
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                timestamp: position.timestamp,
                                watchId: null
                            });
                        },
                        error => {
                            app.ports.locationResultPort.send(handleLocationError(error));
                        },
                        options
                    );
                    break;
                    
                case 'WatchLocation':
                    const watchOptions = getGeolocationOptions(request.accuracy, 30000);
                    
                    const watchId = navigator.geolocation.watchPosition(
                        position => {
                            app.ports.locationResultPort.send({
                                type: 'LocationSuccess',
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                timestamp: position.timestamp,
                                watchId: watchId.toString()
                            });
                        },
                        error => {
                            app.ports.locationResultPort.send(handleLocationError(error));
                        },
                        watchOptions
                    );
                    
                    activeWatches.set(watchId.toString(), watchId);
                    break;
                    
                case 'StopWatching':
                    const storedWatchId = activeWatches.get(request.watchId);
                    if (storedWatchId) {
                        navigator.geolocation.clearWatch(storedWatchId);
                        activeWatches.delete(request.watchId);
                    }
                    break;
            }
        });
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        for (const watchId of activeWatches.values()) {
            navigator.geolocation.clearWatch(watchId);
        }
        activeWatches.clear();
    });
}
```

```javascript
// Generated: clipboard_capability.js  
// Auto-generated by Hamlet - do not edit manually

export function setupClipboardCapability(app) {
    console.log('📋 Setting up clipboard capability');
    
    // Handle clipboard requests
    if (app.ports && app.ports.clipboardRequestPort) {
        app.ports.clipboardRequestPort.subscribe(async (request) => {
            if (!navigator.clipboard) {
                app.ports.clipboardResultPort.send({ type: 'UnsupportedBrowser' });
                return;
            }
            
            try {
                switch (request.type) {
                    case 'Write':
                        await navigator.clipboard.writeText(request.text);
                        app.ports.clipboardResultPort.send({ type: 'WriteSuccess' });
                        break;
                        
                    case 'Read':
                        try {
                            const text = await navigator.clipboard.readText();
                            app.ports.clipboardResultPort.send({ 
                                type: 'ReadSuccess', 
                                text: text 
                            });
                        } catch (readError) {
                            if (readError.name === 'NotAllowedError') {
                                app.ports.clipboardResultPort.send({ type: 'FallbackRequired' });
                            } else {
                                app.ports.clipboardResultPort.send({ type: 'PermissionDenied' });
                            }
                        }
                        break;
                }
            } catch (error) {
                if (error.name === 'NotAllowedError') {
                    app.ports.clipboardResultPort.send({ type: 'PermissionDenied' });
                } else {
                    app.ports.clipboardResultPort.send({ type: 'UnsupportedBrowser' });
                }
            }
        });
    }
}
```

```javascript
// Generated: file_picker_capability.js
// Auto-generated by Hamlet - do not edit manually

export function setupFilePickerCapability(app) {
    console.log('📁 Setting up file picker capability');
    
    function createFilePicker(request) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = request.multiple || false;
            input.accept = request.accept ? request.accept.join(',') : '*/*';
            
            if (request.capture) {
                input.capture = request.capture.toLowerCase();
            }
            
            input.onchange = () => {
                if (input.files && input.files.length > 0) {
                    const files = Array.from(input.files).map(file => ({
                        name: file.name,
                        size: file.size,
                        contentType: file.type,
                        lastModified: file.lastModified,
                        file: file // Keep File object reference
                    }));
                    
                    resolve({ 
                        type: 'FilesSelected', 
                        files: files 
                    });
                } else {
                    resolve({ type: 'Cancelled' });
                }
                
                document.body.removeChild(input);
            };
            
            input.oncancel = () => {
                resolve({ type: 'Cancelled' });
                document.body.removeChild(input);
            };
            
            // Handle permission denied (rare, but possible)
            input.onerror = () => {
                resolve({ type: 'PermissionDenied' });
                document.body.removeChild(input);
            };
            
            input.style.display = 'none';
            document.body.appendChild(input);
            input.click();
        });
    }
    
    // Handle file picker requests
    if (app.ports && app.ports.filePickerRequestPort) {
        app.ports.filePickerRequestPort.subscribe(async (request) => {
            if (!('File' in window)) {
                app.ports.filePickerResultPort.send({ type: 'UnsupportedBrowser' });
                return;
            }
            
            switch (request.type) {
                case 'Pick':
                    const result = await createFilePicker(request);
                    app.ports.filePickerResultPort.send(result);
                    break;
            }
        });
    }
}
```

## Generated Capability Registry

```javascript
// Generated: hamlet_capabilities.js
// Auto-generated by Hamlet - do not edit manually

import { setupLocationCapability } from './location_capability.js';
import { setupClipboardCapability } from './clipboard_capability.js'; 
import { setupFilePickerCapability } from './file_picker_capability.js';

export function setupHamletCapabilities(app) {
    console.log('🔧 Setting up Hamlet capabilities');
    
    // Only setup capabilities that the app actually uses
    // (detected based on port availability)
    
    if (app.ports && app.ports.locationRequestPort) {
        setupLocationCapability(app);
    }
    
    if (app.ports && app.ports.clipboardRequestPort) {
        setupClipboardCapability(app);
    }
    
    if (app.ports && app.ports.filePickerRequestPort) {
        setupFilePickerCapability(app);
    }
    
    console.log('✅ Hamlet capabilities setup complete');
}

// Auto-setup when Elm app is available
function autoSetup() {
    // Look for Elm app in common locations
    const elmApp = window.app || 
                  document.querySelector('[data-elm-app]')?.__elm_app ||
                  window.Elm?.Main?.init;
                  
    if (elmApp) {
        setupHamletCapabilities(elmApp);
    } else {
        // Retry after a short delay
        setTimeout(autoSetup, 100);
    }
}

// Start auto-setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoSetup);
} else {
    autoSetup();
}
```

## Code Generation Process

### 1. Detect `#[derive(BuildAmpCapability)]`

```rust
// In hamlet-macro/src/lib.rs
#[proc_macro_derive(BuildAmpCapability)]
pub fn derive_capability(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);
    
    // Analyze enum variants to determine capability type
    let capability_type = analyze_capability(&ast);
    
    // Generate Elm module
    let elm_output = generate_capability_elm(&ast, &capability_type);
    
    // Generate JavaScript handler  
    let js_output = generate_capability_js(&ast, &capability_type);
    
    quote! {
        // Register capability for build system
        inventory::submit! {
            crate::elm_export::CapabilityDefinition {
                capability_name: stringify!(#ast.ident),
                capability_type: #capability_type,
                elm_module: #elm_output,
                js_handler: #js_output,
            }
        }
    }.into()
}

fn analyze_capability(ast: &DeriveInput) -> CapabilityType {
    // Look at enum variant names to determine capability type
    match ast.ident.to_string().as_str() {
        name if name.contains("Location") => CapabilityType::Location,
        name if name.contains("Clipboard") => CapabilityType::Clipboard,
        name if name.contains("FilePicker") => CapabilityType::FilePicker,
        _ => CapabilityType::Custom,
    }
}
```

### 2. Generate Elm Module

```rust
fn generate_capability_elm(ast: &DeriveInput, capability_type: &CapabilityType) -> String {
    let enum_name = &ast.ident;
    let variants = extract_enum_variants(ast);
    
    let (request_variants, response_variants) = split_variants_by_type(&variants);
    
    format!(
        r#"
        module Capabilities.{} exposing (..)
        
        import Json.Encode as Encode
        import Json.Decode as Decode
        
        {}
        
        {}
        
        {}
        "#,
        capability_type.module_name(),
        generate_elm_types(&request_variants, &response_variants),
        generate_elm_functions(&request_variants, capability_type),
        generate_elm_ports(capability_type)
    )
}
```

### 3. Generate JavaScript Handler

```rust
fn generate_capability_js(ast: &DeriveInput, capability_type: &CapabilityType) -> String {
    match capability_type {
        CapabilityType::Location => generate_location_js(),
        CapabilityType::Clipboard => generate_clipboard_js(),
        CapabilityType::FilePicker => generate_file_picker_js(),
        CapabilityType::Custom => generate_custom_js(ast),
    }
}
```

## Usage Example (Complete Flow)

### 1. Define Capability
```rust
#[derive(BuildAmpCapability)]
pub enum LocationCapability {
    GetLocation { accuracy: LocationAccuracy },
    LocationSuccess { lat: f64, lng: f64 },
    PermissionDenied,
}
```

### 2. Use in Elm
```elm
import Capabilities.Location as Location

type Msg
    = GetLocationClicked
    | LocationReceived Location.LocationResult

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        GetLocationClicked ->
            ( model, Location.getLocation Location.High 10000 )
            
        LocationReceived result ->
            case result of
                Location.LocationSuccess data ->
                    ( { model | position = Just (data.lat, data.lng) }
                    , Cmd.none 
                    )
                    
                Location.PermissionDenied ->
                    ( { model | error = Just "Location permission denied" }
                    , Cmd.none
                    )

subscriptions : Model -> Sub Msg
subscriptions model =
    Location.locationResult LocationReceived
```

### 3. Include Generated JavaScript
```html
<script type="module">
    import './generated/hamlet_capabilities.js';
    // Capabilities auto-setup when Elm app loads
</script>
```

## Benefits

1. **Zero Port Boilerplate**: No manual port definition or JavaScript setup
2. **Type Safety**: All capability communication is type-checked  
3. **Permission Handling**: Generated code handles all permission flows
4. **Browser Compatibility**: Generated code includes feature detection
5. **Progressive Enhancement**: Missing capabilities gracefully degrade
6. **Transparent**: Generated JavaScript is readable and debuggable

## Integration with Build System

### Vite Plugin Enhancement
```javascript
export function hamletPlugin() {
    return {
        name: 'hamlet-capabilities',
        buildStart() {
            // Watch for capability definitions
            this.addWatchFile('./src/**/*.rs');
        },
        generateBundle() {
            // Include capability handlers
            const capabilities = loadGeneratedCapabilities();
            this.emitFile({
                type: 'asset',
                fileName: 'hamlet-capabilities.js',
                source: generateCapabilityRegistry(capabilities)
            });
        }
    };
}
```

This approach eliminates all the manual port setup while keeping the generated code transparent and debuggable. Developers get framework-like convenience without framework lock-in.