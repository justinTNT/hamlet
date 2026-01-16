/**
 * BuildAmp CLI Tests
 * Tests for command parsing and CLI behavior
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { program } from '../lib/cli.js';

describe('BuildAmp CLI', () => {
    test('program has correct name and version', () => {
        assert.strictEqual(program.name(), 'buildamp');
        assert.strictEqual(program.version(), '0.1.0');
    });

    test('gen command exists', () => {
        const genCommand = program.commands.find(cmd => cmd.name() === 'gen');
        assert.ok(genCommand, 'gen command should exist');
        assert.ok(genCommand.description().includes('Generate code'), 'gen command should have description');
    });

    test('gen command accepts model-dir argument', () => {
        const genCommand = program.commands.find(cmd => cmd.name() === 'gen');
        const args = genCommand._args;
        assert.strictEqual(args.length, 1, 'gen should have one argument');
        assert.strictEqual(args[0].name(), 'model-dir');
        assert.ok(!args[0].required, 'model-dir should be optional');
    });

    test('gen command has --target option', () => {
        const genCommand = program.commands.find(cmd => cmd.name() === 'gen');
        const targetOption = genCommand.options.find(opt => opt.long === '--target');
        assert.ok(targetOption, '--target option should exist');
    });

    test('gen:wasm command exists', () => {
        const wasmCommand = program.commands.find(cmd => cmd.name() === 'gen:wasm');
        assert.ok(wasmCommand, 'gen:wasm command should exist');
        assert.ok(wasmCommand.description().includes('wasm'), 'gen:wasm should mention wasm in description');
    });

    test('gen:elm command exists', () => {
        const elmCommand = program.commands.find(cmd => cmd.name() === 'gen:elm');
        assert.ok(elmCommand, 'gen:elm command should exist');
    });

    test('gen:db command exists', () => {
        const dbCommand = program.commands.find(cmd => cmd.name() === 'gen:db');
        assert.ok(dbCommand, 'gen:db command should exist');
    });

    test('gen:api command exists', () => {
        const apiCommand = program.commands.find(cmd => cmd.name() === 'gen:api');
        assert.ok(apiCommand, 'gen:api command should exist');
    });

    test('gen:storage command exists', () => {
        const storageCommand = program.commands.find(cmd => cmd.name() === 'gen:storage');
        assert.ok(storageCommand, 'gen:storage command should exist');
    });

    test('gen:kv command exists', () => {
        const kvCommand = program.commands.find(cmd => cmd.name() === 'gen:kv');
        assert.ok(kvCommand, 'gen:kv command should exist');
    });

    test('gen:sse command exists', () => {
        const sseCommand = program.commands.find(cmd => cmd.name() === 'gen:sse');
        assert.ok(sseCommand, 'gen:sse command should exist');
    });

    test('gen:handlers command exists', () => {
        const handlersCommand = program.commands.find(cmd => cmd.name() === 'gen:handlers');
        assert.ok(handlersCommand, 'gen:handlers command should exist');
    });

    test('gen:admin command exists', () => {
        const adminCommand = program.commands.find(cmd => cmd.name() === 'gen:admin');
        assert.ok(adminCommand, 'gen:admin command should exist');
    });

    test('status command exists', () => {
        const statusCommand = program.commands.find(cmd => cmd.name() === 'status');
        assert.ok(statusCommand, 'status command should exist');
        assert.ok(statusCommand.description().includes('status'), 'status command should have description');
    });

    test('all target commands accept model-dir argument', () => {
        const targetCommands = ['gen:wasm', 'gen:elm', 'gen:db', 'gen:api', 'gen:storage', 'gen:kv', 'gen:sse', 'gen:handlers', 'gen:admin'];

        for (const cmdName of targetCommands) {
            const cmd = program.commands.find(c => c.name() === cmdName);
            assert.ok(cmd, `${cmdName} command should exist`);

            const args = cmd._args;
            assert.strictEqual(args.length, 1, `${cmdName} should have one argument`);
            assert.strictEqual(args[0].name(), 'model-dir', `${cmdName} argument should be model-dir`);
        }
    });
});
