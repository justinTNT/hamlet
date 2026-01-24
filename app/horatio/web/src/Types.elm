module Types exposing
    ( Model
    , Msg(..)
    , Route(..)
    , FeedState(..)
    , ItemState(..)
    , TagItemsState(..)
    , GuestSession
    )

{-| Shared types for the Horatio web app.

This module contains the Model, Msg, and related types that are shared
between Main.elm and the Page modules.
-}

import Browser
import Browser.Navigation as Nav
import BuildAmp.ApiClient as ApiClient
import BuildAmp.Config exposing (GlobalConfig)
import Dict exposing (Dict)
import Http
import Json.Encode as Encode
import Set
import Storage
import Url


-- MODEL

type alias Model =
    { config : GlobalConfig
    , feed : FeedState
    , replyingTo : Maybe { itemId : String, parentId : Maybe String }
    , newComment : String
    , guestSession : Maybe GuestSession
    , route : Route
    , navKey : Nav.Key
    , hoveredItem : Maybe String
    , itemDetails : Dict String ItemState
    , tagItems : Dict String TagItemsState
    , collapsedComments : Set.Set String
    , moderatedComments : Set.Set String
    }

type Route
    = Feed
    | Item String
    | Tag String

type alias GuestSession = Storage.GuestSession

type FeedState
    = Loading
    | LoadedFeed (List ApiClient.FeedItem)
    | Errored String

type ItemState
    = ItemLoading
    | ItemLoaded ApiClient.MicroblogItem
    | ItemFailed String

type TagItemsState
    = TagItemsLoading
    | TagItemsLoaded (List ApiClient.FeedItem)
    | TagItemsFailed String


-- MSG

type Msg
    = PerformSubmitItem
    | GotFeed (Result Http.Error ApiClient.GetFeedRes)
    | SubmittedItem (Result Http.Error ApiClient.SubmitItemRes)
    | SetReplyTo String (Maybe String)
    | SetCommentText String
    | PerformSubmitComment
    | SubmittedComment (Result Http.Error ApiClient.SubmitCommentRes)
    | CancelReply
    | GuestSessionCreated GuestSession
    | GuestSessionLoaded (Maybe GuestSession)
    | LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | SetHoverState (Maybe String)
    | LoadItem String
    | GotItem String (Result Http.Error ApiClient.GetItemRes)
    | LoadTagItems String
    | GotTagItems String (Result Http.Error ApiClient.GetItemsByTagRes)
    | EditorCommand String
    | EditorLinkPrompt
    | GotEditorContent String
    | RequestSubmitComment
    | ToggleCollapse String
    | ReceivedSseEvent Encode.Value
    | InitViewersForItem String
