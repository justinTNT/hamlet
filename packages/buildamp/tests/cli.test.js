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
        assert.ok(genCommand.description().includes('Generate'), 'gen command should have description');
    });

    test('gen command requires --src and --dest options', () => {
        const genCommand = program.commands.find(cmd => cmd.name() === 'gen');
        const options = genCommand.options;

        // Find --src option
        const srcOption = options.find(opt => opt.long === '--src');
        assert.ok(srcOption, '--src option should exist');
        assert.ok(srcOption.required, '--src should be required');

        // Find --dest option
        const destOption = options.find(opt => opt.long === '--dest');
        assert.ok(destOption, '--dest option should exist');
        assert.ok(destOption.required, '--dest should be required');
    });
});
