port module Logic exposing (main)

import Api.Backend exposing (..)
import Json.Decode as Decode exposing (Value)
import Json.Encode as Encode
import Platform

-- PORTS

port process : (Value -> msg) -> Sub msg
port result : Value -> Cmd msg

-- MODEL

type alias Model =
    ()

type Msg
    = ProcessRequest Value

-- MAIN

main : Program () Model Msg
main =
    Platform.worker
        { init = \_ -> ( (), Cmd.none )
        , update = update
        , subscriptions = subscriptions
        }

-- UPDATE

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ProcessRequest value ->
            case Decode.decodeValue Api.Backend.backendActionDecoder value of
                Ok action ->
                    let
                        output = handleAction action
                    in
                    ( model, result (Api.Backend.backendOutputEncoder output) )

                Err error ->
                    let
                        errOutput = 
                            { effects = []
                            , response = Nothing
                            , error = Just (Decode.errorToString error)
                            }
                    in
                    ( model, result (Api.Backend.backendOutputEncoder errOutput) )

handleAction : BackendAction -> BackendOutput
handleAction action =
    case action of
        SubmitItem slice ->
            let
                -- 1. Create Item
                item : Api.Backend.MicroblogItem
                item =
                    { id = slice.context.requestId
                    , title = slice.input.title
                    , link = slice.input.link
                    , image = slice.input.image
                    , extract = slice.input.extract
                    , ownerComment = slice.input.ownerComment
                    , tags = slice.input.tags
                    , comments = []
                    , timestamp = 0 -- Placeholder
                    }

                itemJson = 
                    Encode.object
                        [ ( "id", Encode.string item.id )
                        , ( "title", Encode.string item.title )
                        , ( "link", Encode.string item.link )
                        , ( "image", Encode.string item.image )
                        , ( "extract", Encode.string item.extract )
                        , ( "owner_comment", Encode.string item.ownerComment )
                        , ( "timestamp", Encode.int item.timestamp )
                        , ( "host", Encode.string slice.context.host )
                        ]
                        |> Encode.encode 0
                
                itemEffect =
                    Api.Backend.Insert
                        { table = "microblog_items"
                        , data = itemJson
                        }
                
                -- 2. Handle Tags
                findTagId : String -> List Api.Backend.Tag -> Maybe String
                findTagId name tags =
                    tags 
                        |> List.filter (\t -> t.name == name)
                        |> List.head
                        |> Maybe.map .id

                (tagEffects, _) =
                    slice.input.tags
                        |> List.foldl (\tagName (effects, remainingIds) ->
                            case findTagId tagName slice.existingTags of
                                Just id ->
                                    -- Link existing
                                    let
                                        linkData = 
                                            Encode.object 
                                                [ ("item_id", Encode.string item.id)
                                                , ("tag_id", Encode.string id)
                                                ]
                                            |> Encode.encode 0
                                        linkEffect = 
                                            Api.Backend.Insert { table = "item_tags", data = linkData }
                                    in
                                    (linkEffect :: effects, remainingIds)
                                
                                Nothing ->
                                    -- Create new tag using fresh ID
                                    case remainingIds of
                                        newId :: rest ->
                                            let
                                                tagData =
                                                    Encode.object
                                                        [ ("id", Encode.string newId)
                                                        , ("name", Encode.string tagName)
                                                        , ("host", Encode.string slice.context.host)
                                                        ]
                                                    |> Encode.encode 0
                                                tagEffect =
                                                    Api.Backend.Insert { table = "tags", data = tagData }
                                                    
                                                linkData =
                                                    Encode.object
                                                        [ ("item_id", Encode.string item.id)
                                                        , ("tag_id", Encode.string newId)
                                                        ]
                                                    |> Encode.encode 0
                                                linkEffect =
                                                    Api.Backend.Insert { table = "item_tags", data = linkData }
                                            in
                                            (tagEffect :: linkEffect :: effects, rest)
                                        
                                        [] ->
                                            -- Should not happen if Node.js provides enough IDs
                                            (effects, [])

                        ) ([], slice.freshTagIds)

                -- 3. Construct Response
                responseJson = 
                    Encode.object [("SubmitItemSuccess", Api.Backend.microblogItemEncoder item)]
                        |> Encode.encode 0
                
                -- 4. Log Intent (Structured)
                logJson =
                    Encode.object
                        [ ( "msg", Encode.string ("Submitting item '" ++ item.title ++ "'") )
                        , ( "request_id", Encode.string slice.context.requestId )
                        , ( "item_id", Encode.string item.id )
                        , ( "tag_count", Encode.int (List.length item.tags) )
                        , ( "host", Encode.string slice.context.host )
                        ]
                        |> Encode.encode 0
                
                logEffect = Api.Backend.Log logJson
            in
            { effects = logEffect :: itemEffect :: tagEffects
            , response = Just responseJson
            , error = Nothing
            }

        SubmitComment slice ->
            let
                -- 1. Determine Guest
                (guestEffects, guestId, guestName) =
                    case slice.existingGuest of
                        Just guest ->
                            ([], guest.id, guest.name)
                        
                        Nothing ->
                            case slice.input.authorName of
                                Just name ->
                                    let
                                        guestData =
                                            Encode.object
                                                [ ("id", Encode.string slice.freshGuestId)
                                                , ("name", Encode.string name)
                                                , ("host", Encode.string slice.context.host)
                                                ]
                                            |> Encode.encode 0
                                        
                                        insertGuest =
                                            Api.Backend.Insert { table = "guests", data = guestData }
                                    in
                                    ([insertGuest], slice.freshGuestId, name)
                                
                                Nothing ->
                                    ([], "", "") -- Error case handled below

                -- 2. Create Comment
                commentData =
                    let
                        baseFields =
                            [ ("id", Encode.string slice.freshCommentId)
                            , ("host", Encode.string slice.context.host)
                            , ("item_id", Encode.string slice.input.itemId)
                            , ("guest_id", Encode.string guestId)
                            , ("text", Encode.string slice.input.text)
                            , ("timestamp", Encode.int 0) -- Placeholder
                            ]
                        
                        fields =
                            case slice.input.parentId of
                                Just pid -> ("parent_id", Encode.string pid) :: baseFields
                                Nothing -> baseFields
                    in
                    Encode.object fields
                    |> Encode.encode 0
                
                commentEffect =
                    Api.Backend.Insert { table = "item_comments", data = commentData }

                -- 3. Log Intent
                logJson =
                    Encode.object
                        [ ( "msg", Encode.string "Submitting comment" )
                        , ( "request_id", Encode.string slice.context.requestId )
                        , ( "item_id", Encode.string slice.input.itemId )
                        , ( "guest_id", Encode.string guestId )
                        ]
                    |> Encode.encode 0
                
                logEffect = Api.Backend.Log logJson

                -- 4. Construct Response
                comment =
                    { id = slice.freshCommentId
                    , itemId = slice.input.itemId
                    , guestId = guestId
                    , parentId = slice.input.parentId
                    , authorName = guestName
                    , text = slice.input.text
                    , timestamp = 0
                    }
                
                responseJson =
                    Api.Backend.submitCommentResEncoder { comment = comment }
                        |> Encode.encode 0
            in
            if slice.existingGuest == Nothing && slice.input.authorName == Nothing then
                { effects = []
                , response = Nothing
                , error = Just "Name required for first-time commenters"
                }
            else
                { effects = logEffect :: commentEffect :: guestEffects
                , response = Just responseJson
                , error = Nothing
                }

-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions _ =
    process ProcessRequest
