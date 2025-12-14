# File/Blob Handling (Legacy)

**OUTDATED**: File handling now covered in `../ROADMAP2_REVISED.md` Phase 2.

*This file preserved for historical reference only.*

**Priority**: Medium (completes type-safe pipeline)
**Use Case**: Type-safe file uploads, validation, background processing

## Core Concept

Explicit opt-in file handling with type-safe validation, immediate upload response, and background processing integration.

## File Type Definitions

File upload constraints are defined in regular Rust files. BuildAmp detects from filename and generates upload validation.

```rust
// models/files/image_files.rs
pub struct ImageUpload {
    pub max_size: u64,           // 5MB
    pub formats: Vec<String>,    // ["jpg", "png", "webp"]
    pub max_width: Option<u32>,  // 1920px
    pub max_height: Option<u32>, // 1080px
    pub quality: Option<u8>,     // Compression 0-100
}

pub struct ProfilePicture {
    pub max_size: u64,           // 2MB
    pub formats: Vec<String>,    // ["jpg", "png"]
    pub max_width: Option<u32>,  // 512px
    pub max_height: Option<u32>, // 512px
}

// models/files/document_files.rs  
pub struct DocumentUpload {
    pub max_size: u64,           // 10MB
    pub formats: Vec<String>,    // ["pdf", "docx", "txt"]
    pub virus_scan: bool,        // Require virus scanning
    pub text_extraction: bool,   // Extract text for search
}

pub struct ReportUpload {
    pub max_size: u64,           // 50MB
    pub formats: Vec<String>,    // ["pdf", "xlsx"]
    pub require_approval: bool,  // Manual review required
}

// models/files/video_files.rs
pub struct VideoUpload {
    pub max_size: u64,           // 100MB
    pub formats: Vec<String>,    // ["mp4", "mov", "avi"]
    pub max_duration: Option<u32>, // 300 seconds
    pub require_transcoding: bool,
}
```

## Generated Elm Types

```elm
-- Auto-generated file upload helpers
module BuildAmp.Files exposing (..)

type alias FileUploadResult =
    { file_id : String
    , status : UploadStatus
    , file_name : String
    , file_size : Int
    , upload_url : Maybe String
    }

type UploadStatus
    = Uploading Int  -- Progress 0-100
    | Uploaded
    | Processing
    | Ready
    | Failed String

-- Generated upload functions
uploadImage : ImageUploadConstraints -> File -> (FileUploadResult -> msg) -> Cmd msg
uploadDocument : DocumentUploadConstraints -> File -> (FileUploadResult -> msg) -> Cmd msg
uploadVideo : VideoUploadConstraints -> File -> (FileUploadResult -> msg) -> Cmd msg

-- File validation (client-side)
validateImageFile : File -> Result FileError ()
validateDocumentFile : File -> Result FileError ()

type FileError
    = FileTooLarge Int Int  -- actual, max
    | InvalidFormat String (List String)  -- actual, allowed
    | InvalidDimensions (Int, Int) (Int, Int)  -- actual, max
```

## Upload Flow

### 1. Immediate Upload (Fast Response)
```javascript
// POST /upload/:file_type
app.post('/upload/:file_type', upload.single('file'), async (req, res) => {
    const { file_type } = req.params;
    const constraints = getFileConstraints(file_type);
    
    // 1. Basic validation
    const validation = validateFile(req.file, constraints);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }
    
    // 2. Generate file ID and store temporarily
    const fileId = crypto.randomUUID();
    const tempPath = `temp/${fileId}`;
    await fs.rename(req.file.path, tempPath);
    
    // 3. Store file metadata
    await pool.query(`
        INSERT INTO file_uploads (id, original_name, file_type, size, temp_path, status, host, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, 'uploaded', $6, $7)
    `, [fileId, req.file.originalname, file_type, req.file.size, tempPath, req.headers.host, req.user?.id]);
    
    // 4. Schedule background processing
    await scheduleEvent({
        event_type: "ProcessUploadedFile",
        payload: { file_id: fileId, file_type },
        delay: 0  // Immediate background processing
    });
    
    // 5. Return immediately
    res.json({ 
        file_id: fileId, 
        status: "uploaded",
        processing: true 
    });
});
```

### 2. Business Logic Integration
```rust
#[derive(BuildAmpEndpoint)]
pub struct CreatePostReq {
    pub title: String,
    pub content: String,
    pub image_id: Option<String>,  // Reference to uploaded file
}
```

```elm
-- In Elm business logic
createPost : CreatePostReq -> Context -> (List Effect, Response)
createPost req ctx =
    let
        effects = [ Insert "posts" postData ]
        
        -- Validate file if provided
        fileEffects = 
            case req.image_id of
                Just fileId ->
                    [ ValidateFileOwnership fileId ctx.user_id
                    , ScheduleEvent 
                        { event_type = "AttachFileToPost"
                        , payload = { file_id = fileId, post_id = postData.id }
                        , delay = 0
                        }
                    ]
                Nothing -> []
    in
    (effects ++ fileEffects, SuccessResponse req.post_id)
```

### 3. Background Processing
```elm
-- In EventLogic.elm
processEvent : Event -> (List Effect, Response)
processEvent event =
    case event.event_type of
        "ProcessUploadedFile" ->
            case event.payload.file_type of
                "ImageUpload" ->
                    [ TriggerWebhook "ImageOptimization"
                        { file_id = event.payload.file_id
                        , operations = ["resize", "compress", "generate_thumbnails"]
                        }
                    , UpdateFileStatus event.payload.file_id "processing"
                    ]
                    
                "VideoUpload" ->
                    [ TriggerWebhook "VideoTranscoding"
                        { file_id = event.payload.file_id
                        , formats = ["mp4", "webm"]
                        , qualities = ["720p", "1080p"]
                        }
                    , ScheduleEvent
                        { event_type = "CheckTranscodingProgress"
                        , delay_minutes = 2
                        , payload = { file_id = event.payload.file_id }
                        }
                    ]
        
        "AttachFileToPost" ->
            [ UpdateFileRecord 
                { file_id = event.payload.file_id
                , attached_to = "post:" ++ event.payload.post_id
                , status = "active"
                }
            , MoveFile  -- From temp to permanent storage
                { from = "temp/" ++ event.payload.file_id
                , to = "posts/" ++ event.payload.post_id ++ "/" ++ event.payload.file_id
                }
            ]
```

## File Storage Schema

```sql
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,        -- "ImageUpload", "VideoUpload"
    mime_type TEXT,
    file_size BIGINT NOT NULL,
    temp_path TEXT,                 -- Temporary storage path
    final_path TEXT,                -- Final storage path  
    status TEXT DEFAULT 'uploaded', -- uploaded, processing, ready, failed
    host TEXT NOT NULL,
    uploaded_by TEXT,               -- User ID
    attached_to TEXT,               -- "post:123", "user:456", etc
    metadata JSONB,                 -- File-specific metadata
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    expires_at TIMESTAMP            -- For temp files
);

CREATE INDEX idx_file_uploads_host ON file_uploads(host);
CREATE INDEX idx_file_uploads_status ON file_uploads(status);
CREATE INDEX idx_file_uploads_attached ON file_uploads(attached_to);
CREATE INDEX idx_file_uploads_expires ON file_uploads(expires_at) WHERE expires_at IS NOT NULL;
```

## Advanced Processing

### Chained Processing
```elm
-- Complex video workflow
processVideoUpload : VideoFile -> (List Effect, Response)
processVideoUpload file =
    [ -- Step 1: Extract metadata
      TriggerWebhook "FFMpegMetadata" { file_id = file.id }
    , ScheduleEvent 
        { event_type = "GenerateVideoThumbnails"
        , delay_minutes = 1
        , payload = { file_id = file.id }
        }
    , ScheduleEvent
        { event_type = "TranscodeVideoMultiformat" 
        , delay_minutes = 2
        , payload = { file_id = file.id, formats = ["720p", "1080p"] }
        }
    , ScheduleEvent
        { event_type = "ExtractVideoAudio"
        , delay_minutes = 5  
        , payload = { file_id = file.id, format = "mp3" }
        }
    ]
```

### Conditional Processing
```elm
processImageUpload : ImageFile -> User -> (List Effect, Response)
processImageUpload file user =
    let
        baseEffects = [ UpdateFileStatus file.id "processing" ]
        
        processingEffects =
            if user.subscription_tier == Premium then
                [ TriggerWebhook "ImageAI" 
                    { file_id = file.id
                    , operations = ["face_detection", "object_recognition", "auto_tag"]
                    }
                , GenerateImageVariants file.id ["thumbnail", "medium", "large"]
                ]
            else
                [ GenerateImageVariants file.id ["thumbnail"] ]
    in
    (baseEffects ++ processingEffects, ProcessingStarted)
```

## File Access & Security

### Access Control
```javascript
// GET /files/:file_id
app.get('/files/:file_id', async (req, res) => {
    const file = await getFileMetadata(req.params.file_id);
    
    // 1. Validate file exists and is ready
    if (!file || file.status !== 'ready') {
        return res.status(404).end();
    }
    
    // 2. Check permissions
    const hasAccess = await validateFileAccess(file, req.user, req.headers.host);
    if (!hasAccess) {
        return res.status(403).end();
    }
    
    // 3. Serve file
    res.sendFile(path.resolve(file.final_path));
});
```

### CDN Integration
```elm
-- After processing, move to CDN
processImageComplete : ImageProcessingResult -> (List Effect, Response)
processImageComplete result =
    [ TriggerWebhook "CloudinaryCDN"
        { file_id = result.file_id
        , processed_variants = result.variants
        }
    , ScheduleEvent
        { event_type = "UpdateImageURLs"
        , delay_minutes = 1
        , payload = { file_id = result.file_id }
        }
    , DeleteTempFiles result.temp_files
    ]
```

## Cleanup & Lifecycle

### Orphan Cleanup
```elm
-- Daily cleanup job
cleanupOrphanedFiles : CleanupConfig -> (List Effect, Response) 
cleanupOrphanedFiles config =
    [ DeleteFiles
        { filter = "temp files older than 24 hours"
        , max_count = 1000
        }
    , DeleteFiles  
        { filter = "unattached files older than 7 days"
        , max_count = 100
        }
    , UpdateMetrics "files_cleaned" 
    ]
```

## Error Handling

### Processing Failures
```elm
handleFileProcessingError : FileProcessingError -> (List Effect, Response)
handleFileProcessingError error =
    [ UpdateFileStatus error.file_id "failed"
    , LogError 
        { context = "file_processing"
        , file_id = error.file_id
        , error_message = error.message
        }
    , NotifyUser error.user_id "File processing failed"
    , ScheduleEvent  -- Retry once after 10 minutes
        { event_type = "RetryFileProcessing"
        , delay_minutes = 10
        , payload = { file_id = error.file_id, retry_count = 1 }
        }
    ]
```

## Benefits

- **Type safety**: File constraints defined in Rust, validated everywhere
- **Fast uploads**: Immediate response, background processing
- **Flexible workflows**: Complex processing chains in Elm
- **Security**: Access control and validation built-in
- **Scalability**: Background processing prevents blocking
- **Integration**: Works seamlessly with webhooks, events, KV store

## Use Cases

### Content Management
- Blog post images with auto-optimization
- User avatars with thumbnail generation
- Document attachments with virus scanning

### Media Processing
- Video transcoding for multiple formats
- Audio extraction from video
- Image AI analysis and tagging

### Workflow Automation
- PDF processing and text extraction
- Batch image operations
- File format conversions

## Implementation Notes

- Start with local filesystem storage
- Add CDN integration via webhooks
- Implement chunked upload for large files
- Add progress tracking via SSE
- Consider storage quotas per tenant
- Implement file deduplication for efficiency

## Integration Points

- **Background events**: All heavy processing
- **Webhooks**: External service integration (CDN, AI services)
- **SSE**: Progress updates to client
- **Key-value store**: Upload progress tracking
- **Database migrations**: File schema evolution