module Interface.Schema exposing
    ( DatabaseId
    , Timestamp
    , CreateTimestamp
    , UpdateTimestamp
    , Host
    , MultiTenant
    , SoftDelete
    , ForeignKey
    , RichContent
    , Link
    )

{-| Schema definition types for Hamlet models.

These are transparent type aliases used to annotate model fields
with semantic meaning. The buildamp parser recognizes these types
and generates appropriate SQL, codecs, and admin UI components.

All types are transparent (type alias) so there is no runtime
overhead or unwrap tax when using them.

-}


{-| Primary key field. The inner type is the ID type (usually String).

    type alias User =
        { id : DatabaseId String
        , name : String
        }

Generates: `id TEXT PRIMARY KEY`

-}
type alias DatabaseId a =
    a


{-| Unix timestamp in milliseconds.

    type alias Post =
        { id : DatabaseId String
        , createdAt : Timestamp
        }

Generates: `created_at INTEGER NOT NULL`

-}
type alias Timestamp =
    Int


{-| Auto-populated creation timestamp. Set on INSERT.

    type alias Post =
        { id : DatabaseId String
        , createdAt : CreateTimestamp
        }

Generates: `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`

-}
type alias CreateTimestamp =
    Int


{-| Auto-populated update timestamp. Set on INSERT and UPDATE.

    type alias Post =
        { id : DatabaseId String
        , updatedAt : UpdateTimestamp
        }

Generates: `updated_at TIMESTAMP WITH TIME ZONE` (nullable, null until first UPDATE)

-}
type alias UpdateTimestamp =
    Maybe Int


{-| Multi-tenant host identifier. Required field for tenant isolation.

    type alias Item =
        { id : DatabaseId String
        , host : Host
        }

Generates: `host TEXT NOT NULL` with automatic filtering.

-}
type alias Host =
    String


{-| Explicit multi-tenant field. Use this for models that need tenant isolation.
The field name is flexible - the type annotation determines behavior:

    type alias Item =
        { id : DatabaseId String
        , host : MultiTenant       -- or tenant : MultiTenant
        }

Generates: `host TEXT NOT NULL` with automatic tenant filtering in queries.

-}
type alias MultiTenant =
    String


{-| Explicit soft-delete field. Records are marked deleted rather than removed.
The field name is flexible - the type annotation determines behavior:

    type alias Item =
        { id : DatabaseId String
        , deletedAt : SoftDelete   -- or removedAt : SoftDelete
        }

Generates: `deleted_at BIGINT` (nullable timestamp) with automatic filtering.

-}
type alias SoftDelete =
    Maybe Int


{-| Foreign key reference to another table.
First type parameter is the referenced table type (for documentation).
Second type parameter is the actual ID type.

    type alias Comment =
        { id : DatabaseId String
        , postId : ForeignKey Post String
        }

Generates: `post_id TEXT NOT NULL REFERENCES post(id)`

-}
type alias ForeignKey table a =
    a


{-| Rich content field (markdown, HTML, etc.)

    type alias Article =
        { id : DatabaseId String
        , body : RichContent
        }

Generates: `body TEXT NOT NULL` with rich text editor in admin.

-}
type alias RichContent =
    String


{-| URL/link field. Rendered as clickable link in admin UI.

    type alias Bookmark =
        { id : DatabaseId String
        , url : Link
        , imageUrl : Maybe Link
        }

Generates: `url TEXT NOT NULL` with clickable link in admin.

-}
type alias Link =
    String
