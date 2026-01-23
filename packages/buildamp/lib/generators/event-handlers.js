/**
 * Elm Event Handler Scaffolding Generation
 *
 * Generates Elm handler files for events from two sources:
 * 1. Config/Cron.elm - Scheduled events (no payload, just EventContext)
 * 2. models/Events/*.elm - Request-triggered events (with payload)
 *
 * Key principles:
 * - Generate files ONLY if they don't exist (never overwrite existing files)
 * - Developer must manually move/delete files to force regeneration
 * - Cron events have no payload (just context.executedAt, context.host)
 * - Payload events have typed payloads from their model definitions
 */

import fs from 'fs';
import path from 'path';
import { parseElmEventsDir, parseCronConfig } from '../../core/elm-parser-ts.js';

/**
 * Generate Elm event handler scaffolding files (only if they don't exist)
 * @param {Object} config - Configuration options
 * @param {string} config.regenerateHandler - Handler name to regenerate (or 'all')
 */
export async function generateElmEventHandlers(config = {}) {
    console.log('🔧 Analyzing Event definitions...');

    const { getGenerationPaths, ensureOutputDir } = await import('./shared-paths.js');
    const paths = getGenerationPaths(config);

    // Event handlers go in server/src/Events/Handlers/
    const outputDir = ensureOutputDir(path.join(paths.outputDir, 'server', 'src', 'Events', 'Handlers'));
    const { regenerateHandler } = config;

    // Collect events from both sources
    const allEvents = [];

    // 1. Cron events from Config/Cron.elm (no payload)
    const cronEvents = parseCronConfig(paths.elmConfigDir);
    for (const cronEvent of cronEvents) {
        allEvents.push({
            name: cronEvent.event,
            hasPayload: false,
            source: 'cron',
            schedule: cronEvent.schedule
        });
    }
    if (cronEvents.length > 0) {
        console.log(`   📅 Found ${cronEvents.length} cron events from Config/Cron.elm`);
    }

    // 2. Payload events from Events/*.elm (with payload)
    if (fs.existsSync(paths.elmEventsDir)) {
        const elmEvents = parseElmEventsDir(paths.elmEventsDir);
        for (const event of elmEvents) {
            // Skip if already defined as cron event
            if (allEvents.some(e => e.name === event.name)) {
                console.log(`   ⚠️  Skipping ${event.name} from Events/ (already defined in Cron.elm)`);
                continue;
            }
            allEvents.push({
                name: event.name,
                hasPayload: true,
                source: 'model',
                fields: event.fields,
                sourceFile: event.filename
            });
        }
        const payloadEvents = allEvents.filter(e => e.source === 'model');
        if (payloadEvents.length > 0) {
            console.log(`   📦 Found ${payloadEvents.length} payload events from Events/*.elm`);
        }
    }

    console.log(`   📁 Total: ${allEvents.length} event types`);

    let generatedCount = 0;
    let skippedCount = 0;
    let regeneratedCount = 0;
    const generatedFiles = [];

    // Generate handler for each event type
    for (const event of allEvents) {
        const handlerFile = path.join(outputDir, `${event.name}Handler.elm`);
        const handlerName = `${event.name}Handler`;

        // Check if this handler should be regenerated
        const shouldRegenerate = regenerateHandler &&
            (regenerateHandler === 'all' ||
             regenerateHandler === event.name ||
             regenerateHandler === handlerName ||
             regenerateHandler === `${handlerName}.elm`);

        if (fs.existsSync(handlerFile)) {
            if (shouldRegenerate) {
                const backupFile = `${handlerFile}.backup`;
                console.log(`   🔄 Regenerating ${handlerName}.elm`);
                console.log(`      📦 Backing up to ${path.basename(backupFile)}`);

                fs.copyFileSync(handlerFile, backupFile);

                const handlerContent = event.hasPayload
                    ? generatePayloadHandlerContent(event, backupFile)
                    : generateCronHandlerContent(event, backupFile);
                fs.writeFileSync(handlerFile, handlerContent);

                generatedFiles.push(handlerFile);
                regeneratedCount++;
                continue;
            }

            console.log(`   ⏭️  Skipping ${handlerName}.elm (already exists)`);
            skippedCount++;
            continue;
        }

        // Check if required shared modules exist
        const databaseModulePath = path.join(paths.serverElmDir, 'BuildAmp', 'Database.elm');
        if (!fs.existsSync(databaseModulePath)) {
            console.log(`   ⚠️  Skipping ${handlerName}.elm (Database.elm not found - run shared module generation first)`);
            skippedCount++;
            continue;
        }

        console.log(`   ✅ Creating ${handlerName}.elm (${event.hasPayload ? 'payload' : 'cron'})`);

        const handlerContent = event.hasPayload
            ? generatePayloadHandlerContent(event)
            : generateCronHandlerContent(event);
        fs.writeFileSync(handlerFile, handlerContent);

        generatedFiles.push(handlerFile);
        generatedCount++;
    }

    console.log('');
    generateCompileScript(allEvents, outputDir);

    console.log('📊 Elm Event Handler Generation Summary:');
    console.log(`   Generated: ${generatedCount} new handlers`);
    if (regeneratedCount > 0) {
        console.log(`   Regenerated: ${regeneratedCount} handlers (backups created)`);
    }
    console.log(`   Skipped: ${skippedCount} existing handlers`);
    console.log(`   Total events: ${generatedCount + regeneratedCount + skippedCount}`);

    return {
        generated: generatedCount,
        regenerated: regeneratedCount,
        skipped: skippedCount,
        outputFiles: generatedFiles
    };
}

/**
 * Generate handler for CRON events (no payload, just EventContext)
 */
function generateCronHandlerContent(event, backupFile = null) {
    const { name, schedule } = event;

    const regenerationHeader = backupFile ? generateRegenerationHeader(backupFile) : '';

    return `port module Events.Handlers.${name}Handler exposing (main)
${regenerationHeader}
{-| ${name} Event Handler (Cron Scheduled)

Schedule: ${schedule || 'See Config/Cron.elm'}

This is a scheduled event with no payload.
Use context.executedAt for timing and context.host for tenant isolation.

-}

import BuildAmp.Events exposing (EventContext, EventResult(..))
import BuildAmp.Database as DB
import Json.Encode as Encode
import Json.Decode as Decode
import Platform


-- MODEL

type alias Model =
    { stage : Stage
    , context : Maybe EventContext
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    }


type Stage
    = Idle
    | Processing
    | Complete EventResult
    | Failed String


type alias GlobalConfig = DB.GlobalConfig


type alias GlobalState =
    { eventCount : Int
    , lastActivity : Int
    }


-- UPDATE

type Msg
    = HandleEvent EventBundle
    | ProcessingComplete EventResult
    | DbResult DB.DbResponse


type alias EventBundle =
    { context : Encode.Value
    , globalConfig : Encode.Value
    , globalState : Encode.Value
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { stage = Idle
      , context = Nothing
      , globalConfig = flags.globalConfig
      , globalState = flags.globalState
      }
    , Cmd.none
    )


type alias Flags =
    { globalConfig : GlobalConfig
    , globalState : GlobalState
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        HandleEvent bundle ->
            case decodeContext bundle of
                Ok ctx ->
                    ( { model
                      | stage = Processing
                      , context = Just ctx
                      }
                    , processEvent ctx model.globalConfig
                    )

                Err error ->
                    ( { model | stage = Failed error }, Cmd.none )

        ProcessingComplete result ->
            ( { model | stage = Complete result }
            , complete (encodeEventResult result)
            )

        DbResult response ->
            -- TODO: Handle database responses
            ( model, Cmd.none )


-- BUSINESS LOGIC

processEvent : EventContext -> GlobalConfig -> Cmd Msg
processEvent context config =
    -- TODO: Implement your scheduled job logic here
    --
    -- Available context:
    --   context.executedAt  - Server timestamp when job ran
    --   context.host        - Tenant host (or "system")
    --   config.serverNow    - Current server time
    --
    -- Example: Calculate 30-day cutoff
    --   let cutoffMs = context.executedAt - (30 * 24 * 60 * 60 * 1000)
    --
    let
        result = Success { message = "${name} completed", recordsAffected = 0 }
    in
    Cmd.none


-- DECODING

decodeContext : EventBundle -> Result String EventContext
decodeContext bundle =
    Decode.decodeValue BuildAmp.Events.eventContextDecoder bundle.context
        |> Result.mapError Decode.errorToString


-- ENCODING

encodeEventResult : EventResult -> Encode.Value
encodeEventResult =
    BuildAmp.Events.encodeEventResult


-- PORTS

port handleEvent : (EventBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg
port dbFind : DB.DbFindRequest -> Cmd msg
port dbKill : DB.DbKillRequest -> Cmd msg
port dbResult : (DB.DbResponse -> msg) -> Sub msg


-- MAIN

main : Program Flags Model Msg
main =
    Platform.worker
        { init = init
        , update = updateWithResponse
        , subscriptions = subscriptions
        }


updateWithResponse : Msg -> Model -> ( Model, Cmd Msg )
updateWithResponse msg model =
    let
        ( newModel, cmd ) = update msg model
    in
    case newModel.stage of
        Complete result ->
            ( newModel, Cmd.batch [ complete (encodeEventResult result), cmd ] )

        Failed error ->
            ( newModel, Cmd.batch [ complete (Encode.object [ ("error", Encode.string error) ]), cmd ] )

        _ ->
            ( newModel, cmd )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch [ handleEvent HandleEvent, dbResult DbResult ]
`;
}

/**
 * Generate handler for PAYLOAD events (from Events/*.elm)
 */
function generatePayloadHandlerContent(event, backupFile = null) {
    const { name, fields } = event;

    const regenerationHeader = backupFile ? generateRegenerationHeader(backupFile) : '';

    return `port module Events.Handlers.${name}Handler exposing (main)
${regenerationHeader}
{-| ${name} Event Handler (Request Triggered)

This event has a payload - triggered from code via:
    Events.pushEvent (${name} { ... })

-}

import BuildAmp.Events exposing (${name}Payload, EventContext, EventResult(..))
import BuildAmp.Database as DB
import Json.Encode as Encode
import Json.Decode as Decode
import Platform


-- MODEL

type alias Model =
    { stage : Stage
    , payload : Maybe ${name}Payload
    , context : Maybe EventContext
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    }


type Stage
    = Idle
    | Processing
    | Complete EventResult
    | Failed String


type alias GlobalConfig = DB.GlobalConfig


type alias GlobalState =
    { eventCount : Int
    , lastActivity : Int
    }


-- UPDATE

type Msg
    = HandleEvent EventBundle
    | ProcessingComplete EventResult
    | DbResult DB.DbResponse


type alias EventBundle =
    { payload : Encode.Value
    , context : Encode.Value
    , globalConfig : Encode.Value
    , globalState : Encode.Value
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { stage = Idle
      , payload = Nothing
      , context = Nothing
      , globalConfig = flags.globalConfig
      , globalState = flags.globalState
      }
    , Cmd.none
    )


type alias Flags =
    { globalConfig : GlobalConfig
    , globalState : GlobalState
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        HandleEvent bundle ->
            case decodeEventBundle bundle of
                Ok ( payload, ctx ) ->
                    ( { model
                      | stage = Processing
                      , payload = Just payload
                      , context = Just ctx
                      }
                    , processEvent payload ctx model.globalConfig
                    )

                Err error ->
                    ( { model | stage = Failed error }, Cmd.none )

        ProcessingComplete result ->
            ( { model | stage = Complete result }
            , complete (encodeEventResult result)
            )

        DbResult response ->
            -- TODO: Handle database responses
            ( model, Cmd.none )


-- BUSINESS LOGIC

processEvent : ${name}Payload -> EventContext -> GlobalConfig -> Cmd Msg
processEvent payload context config =
    -- TODO: Implement your event processing logic here
    --
    -- Payload fields available:
${fields && fields.length > 0 ? fields.map(f => `    --   payload.${snakeToCamel(f.camelName || f.name)}`).join('\n') : '    --   (empty payload)'}
    --
    let
        result = Success { message = "${name} processed", recordsAffected = 0 }
    in
    Cmd.none


-- DECODING

decodeEventBundle : EventBundle -> Result String ( ${name}Payload, EventContext )
decodeEventBundle bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue BuildAmp.Events.${lowerFirst(name)}PayloadDecoder bundle.payload |> Result.mapError Decode.errorToString)
        (Decode.decodeValue BuildAmp.Events.eventContextDecoder bundle.context |> Result.mapError Decode.errorToString)


-- ENCODING

encodeEventResult : EventResult -> Encode.Value
encodeEventResult =
    BuildAmp.Events.encodeEventResult


-- PORTS

port handleEvent : (EventBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg
port dbFind : DB.DbFindRequest -> Cmd msg
port dbKill : DB.DbKillRequest -> Cmd msg
port dbResult : (DB.DbResponse -> msg) -> Sub msg


-- MAIN

main : Program Flags Model Msg
main =
    Platform.worker
        { init = init
        , update = updateWithResponse
        , subscriptions = subscriptions
        }


updateWithResponse : Msg -> Model -> ( Model, Cmd Msg )
updateWithResponse msg model =
    let
        ( newModel, cmd ) = update msg model
    in
    case newModel.stage of
        Complete result ->
            ( newModel, Cmd.batch [ complete (encodeEventResult result), cmd ] )

        Failed error ->
            ( newModel, Cmd.batch [ complete (Encode.object [ ("error", Encode.string error) ]), cmd ] )

        _ ->
            ( newModel, cmd )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch [ handleEvent HandleEvent, dbResult DbResult ]
`;
}

/**
 * Generate regeneration header comment
 */
function generateRegenerationHeader(backupFile) {
    return `
{- ═══════════════════════════════════════════════════════════════════════════
   REGENERATED HANDLER - MIGRATION REQUIRED

   Your previous implementation has been backed up to:
   ${backupFile}

   Please migrate your business logic from the backup to this new skeleton.
   ═══════════════════════════════════════════════════════════════════════════ -}
`;
}

/**
 * Generate compilation script
 */
function generateCompileScript(events, outputDir) {
    const compileScript = `#!/bin/bash
# Auto-generated Elm event handler compilation script

set -e
echo "🔨 Compiling Elm event handlers..."

for elm_file in *.elm; do
    if [ -f "$elm_file" ]; then
        basename=$(basename "$elm_file" .elm)
        echo "Compiling $basename..."
        elm make "$elm_file" --output="$basename.js" && mv "$basename.js" "$basename.cjs"
    fi
done

echo "✅ All event handlers compiled successfully!"
`;

    const scriptPath = path.join(outputDir, 'compile-event-handlers.sh');
    fs.writeFileSync(scriptPath, compileScript);
    fs.chmodSync(scriptPath, '755');
    console.log(`   ✅ Generated compilation script`);
}

// Helpers

function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
              .replace(/_([0-9])/g, (_, digit) => digit);
}

function lowerFirst(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

export const _test = {
    generateCronHandlerContent,
    generatePayloadHandlerContent,
    snakeToCamel,
    lowerFirst
};
