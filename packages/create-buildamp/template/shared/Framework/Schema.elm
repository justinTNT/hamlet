module Framework.Schema exposing (..)

{-| Database Schema Framework Types

    These type aliases are recognized by buildamp and map to SQL types:
    - DatabaseId a → TEXT PRIMARY KEY with UUID generation
    - MultiTenant → TEXT NOT NULL (multi-tenant isolation)
    - ForeignKey table a → TEXT NOT NULL with FK constraint
    - CreateTimestamp → TIMESTAMP, auto-set on INSERT
    - UpdateTimestamp → TIMESTAMP, auto-set on INSERT and UPDATE
    - SoftDelete → BIGINT, set on soft delete (nullable)
    - Timestamp → BIGINT (epoch millis, manual)
    - RichContent → JSONB NOT NULL
    - Maybe a → nullable field
    - List a → JSONB array

-}


{-| Primary key with auto-generated UUID
-}
type alias DatabaseId a =
    a


{-| Unix timestamp (epoch milliseconds) - manual field
-}
type alias Timestamp =
    Int


{-| Multi-tenant host field for data isolation
-}
type alias MultiTenant =
    String


{-| Legacy alias for MultiTenant
-}
type alias Host =
    String


{-| Auto-populated creation timestamp
-}
type alias CreateTimestamp =
    Int


{-| Auto-populated update timestamp (set on INSERT and UPDATE)
-}
type alias UpdateTimestamp =
    Int


{-| Soft delete timestamp (nullable, set on soft delete)
-}
type alias SoftDelete =
    Maybe Int


{-| Foreign key reference to another table
-}
type alias ForeignKey table a =
    a


{-| Rich text content stored as JSON
-}
type alias RichContent =
    String
