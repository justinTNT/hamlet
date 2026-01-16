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
        assert.ok(elmCommand.description().includes('Elm'), 'gen:elm should mention Elm in description');
    });

    test('gen:js command exists', () => {
        const jsCommand = program.commands.find(cmd => cmd.name() === 'gen:js');
        assert.ok(jsCommand, 'gen:js command should exist');
        assert.ok(jsCommand.description().includes('JavaScript'), 'gen:js should mention JavaScript in description');
    });

    test('gen:js command accepts interface argument', () => {
        const jsCommand = program.commands.find(cmd => cmd.name() === 'gen:js');
        const args = jsCommand._args;
        assert.strictEqual(args.length, 1, 'gen:js should have one argument');
        assert.strictEqual(args[0].name(), 'interface');
        assert.ok(!args[0].required, 'interface should be optional');
    });

    test('gen:elm command accepts interface argument', () => {
        const elmCommand = program.commands.find(cmd => cmd.name() === 'gen:elm');
        const args = elmCommand._args;
        assert.strictEqual(args.length, 1, 'gen:elm should have one argument');
        assert.strictEqual(args[0].name(), 'interface');
        assert.ok(!args[0].required, 'interface should be optional');
    });

    test('status command exists', () => {
        const statusCommand = program.commands.find(cmd => cmd.name() === 'status');
        assert.ok(statusCommand, 'status command should exist');
        assert.ok(statusCommand.description().includes('status'), 'status command should have description');
    });

    test('gen:wasm command has --target option', () => {
        const wasmCommand = program.commands.find(cmd => cmd.name() === 'gen:wasm');
        const targetOption = wasmCommand.options.find(opt => opt.long === '--target');
        assert.ok(targetOption, 'gen:wasm should have --target option');
    });

    test('gen:wasm --target option has correct choices description', () => {
        const wasmCommand = program.commands.find(cmd => cmd.name() === 'gen:wasm');
        const targetOption = wasmCommand.options.find(opt => opt.long === '--target');
        // The description or argChoices should mention web/node/bundler
        const desc = targetOption.description || '';
        assert.ok(
            desc.includes('web') || targetOption.argChoices?.includes('web'),
            '--target should document web as a valid option'
        );
    });

    test('gen:wasm command has --force option', () => {
        const wasmCommand = program.commands.find(cmd => cmd.name() === 'gen:wasm');
        const forceOption = wasmCommand.options.find(opt => opt.long === '--force');
        assert.ok(forceOption, 'gen:wasm should have --force option for skipping cache');
    });

    test('all target commands accept optional argument', () => {
        // gen:wasm takes model-dir, gen:js and gen:elm take interface
        const targetCommands = [
            { name: 'gen:wasm', argName: 'model-dir' },
            { name: 'gen:js', argName: 'interface' },
            { name: 'gen:elm', argName: 'interface' },
        ];

        for (const { name: cmdName, argName } of targetCommands) {
            const cmd = program.commands.find(c => c.name() === cmdName);
            assert.ok(cmd, `${cmdName} command should exist`);

            const args = cmd._args;
            assert.strictEqual(args.length, 1, `${cmdName} should have one argument`);
            assert.strictEqual(args[0].name(), argName, `${cmdName} argument should be ${argName}`);
            assert.ok(!args[0].required, `${cmdName} argument should be optional`);
        }
    });
});
