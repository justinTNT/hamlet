/**
 * Storage Generator Unit Tests
 * Tests for browser storage and Elm port generation functions
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { _test } from '../lib/generators/storage.js';

const {
    generateStorageClass,
    generateElmPorts,
    generateStorageWrapper,
    generateElmHelper,
    generatePortIntegration
} = _test;

// Sample storage model for testing
const sampleModel = {
    name: 'GuestSession',
    storageKey: 'guest_session',
    fields: [
        { name: 'sessionId', type: 'String' },
        { name: 'createdAt', type: 'Int' },
        { name: 'isActive', type: 'Bool' }
    ]
};

describe('Storage Generator - JavaScript Class', () => {
    test('generateStorageClass creates class with correct name', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes('class GuestSessionStorage'));
    });

    test('generateStorageClass includes storage key', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes("static storageKey = 'guest_session'"));
    });

    test('generateStorageClass has save method', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes('static save(guestsession)'));
        assert.ok(result.includes('localStorage.setItem(this.storageKey'));
        assert.ok(result.includes('JSON.stringify'));
    });

    test('generateStorageClass has load method', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes('static load()'));
        assert.ok(result.includes('localStorage.getItem(this.storageKey)'));
        assert.ok(result.includes('JSON.parse'));
    });

    test('generateStorageClass has clear method', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes('static clear()'));
        assert.ok(result.includes('localStorage.removeItem(this.storageKey)'));
    });

    test('generateStorageClass has exists method', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes('static exists()'));
    });

    test('generateStorageClass has update method', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes('static update(updates)'));
    });

    test('generateStorageClass includes Elm port notification', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes('app.ports.guestsessionChanged'));
    });

    test('generateStorageClass includes error handling', () => {
        const result = generateStorageClass(sampleModel);

        assert.ok(result.includes('try {'));
        assert.ok(result.includes('catch (error)'));
        assert.ok(result.includes('console.error'));
    });
});

describe('Storage Generator - Elm Ports', () => {
    test('generateElmPorts creates save port', () => {
        const result = generateElmPorts(sampleModel);

        assert.ok(result.includes('port saveGuestSession : Json.Encode.Value -> Cmd msg'));
    });

    test('generateElmPorts creates load port', () => {
        const result = generateElmPorts(sampleModel);

        assert.ok(result.includes('port loadGuestSession : () -> Cmd msg'));
    });

    test('generateElmPorts creates clear port', () => {
        const result = generateElmPorts(sampleModel);

        assert.ok(result.includes('port clearGuestSession : () -> Cmd msg'));
    });

    test('generateElmPorts creates loaded subscription port', () => {
        const result = generateElmPorts(sampleModel);

        assert.ok(result.includes('port guestsessionLoaded : (Json.Decode.Value -> msg) -> Sub msg'));
    });

    test('generateElmPorts creates changed subscription port', () => {
        const result = generateElmPorts(sampleModel);

        assert.ok(result.includes('port guestsessionChanged : (Json.Decode.Value -> msg) -> Sub msg'));
    });
});

describe('Storage Generator - Elm Helper Module', () => {
    test('generateElmHelper creates module with correct name', () => {
        const result = generateElmHelper(sampleModel);

        assert.ok(result.includes('module Generated.Storage.GuestSession exposing'));
    });

    test('generateElmHelper includes type definition', () => {
        const result = generateElmHelper(sampleModel);

        assert.ok(result.includes('type alias GuestSession ='));
        assert.ok(result.includes('sessionId : String'));
        assert.ok(result.includes('createdAt : Int'));
        assert.ok(result.includes('isActive : Bool'));
    });

    test('generateElmHelper includes encoder', () => {
        const result = generateElmHelper(sampleModel);

        assert.ok(result.includes('encodeGuestSession : GuestSession -> Json.Encode.Value'));
        assert.ok(result.includes('Json.Encode.object'));
        assert.ok(result.includes('Json.Encode.string'));
        assert.ok(result.includes('Json.Encode.int'));
        assert.ok(result.includes('Json.Encode.bool'));
    });

    test('generateElmHelper includes decoder', () => {
        const result = generateElmHelper(sampleModel);

        assert.ok(result.includes('decodeGuestSession : Json.Decode.Decoder GuestSession'));
        assert.ok(result.includes('Json.Decode.string'));
        assert.ok(result.includes('Json.Decode.int'));
        assert.ok(result.includes('Json.Decode.bool'));
    });

    test('generateElmHelper includes save function', () => {
        const result = generateElmHelper(sampleModel);

        assert.ok(result.includes('save : GuestSession -> Cmd msg'));
        assert.ok(result.includes('StoragePorts.saveGuestSession'));
    });

    test('generateElmHelper includes load function', () => {
        const result = generateElmHelper(sampleModel);

        assert.ok(result.includes('load : Cmd msg'));
        assert.ok(result.includes('StoragePorts.loadGuestSession'));
    });

    test('generateElmHelper includes onLoad subscription', () => {
        const result = generateElmHelper(sampleModel);

        assert.ok(result.includes('onLoad : (Maybe GuestSession -> msg) -> Sub msg'));
        assert.ok(result.includes('StoragePorts.guestsessionLoaded'));
    });

    test('generateElmHelper includes onChange subscription', () => {
        const result = generateElmHelper(sampleModel);

        assert.ok(result.includes('onChange : (Maybe GuestSession -> msg) -> Sub msg'));
        assert.ok(result.includes('StoragePorts.guestsessionChanged'));
    });
});

describe('Storage Generator - Elm Storage Wrapper', () => {
    const models = [
        { name: 'GuestSession', fields: [{ name: 'id', type: 'String' }] },
        { name: 'UserPrefs', fields: [{ name: 'theme', type: 'String' }] }
    ];

    test('generateStorageWrapper creates module declaration', () => {
        const result = generateStorageWrapper(models);

        assert.ok(result.includes('module Storage exposing'));
    });

    test('generateStorageWrapper exposes types', () => {
        const result = generateStorageWrapper(models);

        assert.ok(result.includes('GuestSession, UserPrefs'));
    });

    test('generateStorageWrapper exposes functions for each model', () => {
        const result = generateStorageWrapper(models);

        assert.ok(result.includes('loadGuestSession'));
        assert.ok(result.includes('saveGuestSession'));
        assert.ok(result.includes('onGuestSessionLoaded'));
        assert.ok(result.includes('loadUserPrefs'));
        assert.ok(result.includes('saveUserPrefs'));
        assert.ok(result.includes('onUserPrefsLoaded'));
    });

    test('generateStorageWrapper imports from Generated modules', () => {
        const result = generateStorageWrapper(models);

        assert.ok(result.includes('import Generated.Storage.GuestSession'));
        assert.ok(result.includes('import Generated.Storage.UserPrefs'));
    });
});

describe('Storage Generator - Port Integration', () => {
    const models = [sampleModel];

    test('generatePortIntegration creates connectStoragePorts function', () => {
        const result = generatePortIntegration(models);

        assert.ok(result.includes('function connectStoragePorts(app)'));
    });

    test('generatePortIntegration checks for app.ports', () => {
        const result = generatePortIntegration(models);

        assert.ok(result.includes("if (!app || !app.ports)"));
    });

    test('generatePortIntegration binds save port', () => {
        const result = generatePortIntegration(models);

        assert.ok(result.includes('app.ports.saveGuestSession'));
        assert.ok(result.includes('.subscribe'));
        assert.ok(result.includes('GuestSessionStorage.save'));
    });

    test('generatePortIntegration binds load port', () => {
        const result = generatePortIntegration(models);

        assert.ok(result.includes('app.ports.loadGuestSession'));
        assert.ok(result.includes('GuestSessionStorage.load'));
    });

    test('generatePortIntegration binds clear port', () => {
        const result = generatePortIntegration(models);

        assert.ok(result.includes('app.ports.clearGuestSession'));
        assert.ok(result.includes('GuestSessionStorage.clear'));
    });

    test('generatePortIntegration sends data to loaded port', () => {
        const result = generatePortIntegration(models);

        assert.ok(result.includes('app.ports.guestsessionLoaded.send'));
    });
});

describe('Storage Generator - Edge Cases', () => {
    test('handles model with single field', () => {
        const model = {
            name: 'SimpleStore',
            storageKey: 'simple',
            fields: [{ name: 'value', type: 'String' }]
        };

        const jsResult = generateStorageClass(model);
        const elmResult = generateElmHelper(model);

        assert.ok(jsResult.includes('class SimpleStoreStorage'));
        assert.ok(elmResult.includes('type alias SimpleStore'));
        // Single field uses map instead of mapN
        assert.ok(elmResult.includes('Json.Decode.map SimpleStore'));
    });

    test('handles model with many fields', () => {
        const model = {
            name: 'ComplexStore',
            storageKey: 'complex',
            fields: [
                { name: 'field1', type: 'String' },
                { name: 'field2', type: 'Int' },
                { name: 'field3', type: 'Bool' },
                { name: 'field4', type: 'String' },
                { name: 'field5', type: 'Int' }
            ]
        };

        const elmResult = generateElmHelper(model);

        assert.ok(elmResult.includes('type alias ComplexStore'));
        assert.ok(elmResult.includes('field1 : String'));
        assert.ok(elmResult.includes('field2 : Int'));
        assert.ok(elmResult.includes('field3 : Bool'));
        assert.ok(elmResult.includes('field4 : String'));
        assert.ok(elmResult.includes('field5 : Int'));
        // Uses map5 for 5 fields
        assert.ok(elmResult.includes('Json.Decode.map5 ComplexStore'));
    });

    test('handles model name with special casing', () => {
        const model = {
            name: 'HTTPConfig',
            storageKey: 'http_config',
            fields: [{ name: 'url', type: 'String' }]
        };

        const jsResult = generateStorageClass(model);

        assert.ok(jsResult.includes('class HTTPConfigStorage'));
        assert.ok(jsResult.includes('httpconfig')); // lowercase in port notifications
    });
});
