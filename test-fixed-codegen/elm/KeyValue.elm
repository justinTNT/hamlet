module KeyValue exposing (..)

-- Auto-generated KeyValue module
-- Contains key-value store types for simple persistence
-- Generated from: src/models/kv/

import Json.Decode
import Json.Encode

-- Key Value types discovered:
-- - TestCache
-- - UserSession

-- KeyValue framework features:
-- ✅ Simple key-value persistence
-- ✅ Optional expiry support
-- ✅ JSON serialization
-- ✅ Cross-tab synchronization

type alias TestCache =
    {
      key : String,
      data : String,
      ttl : Int
    }

type alias UserSession =
    {
      user_id : String,
      login_time : Int,
      permissions : List String,
      ttl : Int
    }
