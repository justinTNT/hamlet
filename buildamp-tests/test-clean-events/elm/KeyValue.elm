module KeyValue exposing (..)

-- Auto-generated KeyValue module
-- Contains key-value store types for simple persistence
-- Generated from: src/models/kv/

import Json.Decode
import Json.Encode

type alias TestCache =
    {
      key : String,
      data : String,
      ttl : Int
    }

type alias UserSession =
    {
      profile : UserProfile,
      login_time : Int,
      permissions : List String,
      ttl : Int
    }

-- Helper types (referenced by main types above)

type alias UserProfile =
    {
      id : String,
      name : String,
      string : String
    }
