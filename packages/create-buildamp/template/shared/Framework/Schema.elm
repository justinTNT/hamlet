module Framework.Schema exposing (..)

{-| Database Schema Framework Types

    These type aliases are recognized by buildamp and map to SQL types:
    - DatabaseId a → TEXT PRIMARY KEY with UUID generation
    - Timestamp → BIGINT with epoch default
    - Host → TEXT NOT NULL (multi-tenant isolation)
    - ForeignKey table a → TEXT NOT NULL with FK constraint
    - RichContent → JSONB NOT NULL
    - Maybe a → nullable field
    - List a → JSONB array

-}


{-| Primary key with auto-generated UUID
-}
type alias DatabaseId a =
    a


{-| Unix timestamp (epoch milliseconds)
-}
type alias Timestamp =
    Int


{-| Multi-tenant host field for data isolation
-}
type alias Host =
    String


{-| Foreign key reference to another table
-}
type alias ForeignKey table a =
    a


{-| Rich text content stored as JSON
-}
type alias RichContent =
    String
