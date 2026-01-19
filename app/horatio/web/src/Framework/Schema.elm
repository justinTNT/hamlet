module Framework.Schema exposing (..)

{-| This module defines the "Schema Gestures" for the BuildAmp generator.
By using these aliases, we Explicitly Request capabilities from the server.
-}

-- CORE TYPES

{-| DatabaseId: Generates `PRIMARY KEY DEFAULT gen_random_uuid()`
Usage: `id : DatabaseId String`
-}
type alias DatabaseId a = a

{-| Timestamp: Generates `BIGINT NOT NULL` (stored as milliseconds)
Usage: `createdAt : Timestamp`
-}
type alias Timestamp = Int

{-| JsonBlob: Generates `JSONB` column
Usage: `metadata : JsonBlob Metadata`
-}
type alias JsonBlob a = a

{-| Link: Generates `TEXT` (implied nullable)
Usage: `website : Link String`
-}
type alias Link a = Maybe a

-- CAPABILITY MARKERS (The "Gestures")

{-| BuildampHost: Enables Multitenancy Isolation.
The generator will inject `WHERE host = $1` logic for this table.
Usage: `host : BuildampHost String`
-}
type alias BuildampHost a = a

{-| SoftDelete: Enables "Trash Can" functionality.
The generator will create `kill...` functions and filter `WHERE deleted_at IS NULL`.
Usage: `deletedAt : SoftDelete Timestamp`
-}
type alias SoftDelete a = Maybe a

{-| Secret: Hints that this field requires encryption or redaction in logs.
(Future capability)
Usage: `apiKey : Secret String`
-}
type alias Secret a = a

-- CONSTRAINTS

{-| DefaultValue: Generates `DEFAULT 'value'` in SQL
Usage: `status : DefaultValue String`
-}
type alias DefaultValue a = a

{-| Unique: Generates `UNIQUE` constraint
Usage: `email : Unique String`
-}
type alias Unique a = a
