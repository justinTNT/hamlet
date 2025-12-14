import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('API Route Generation - Basic Tests', () => {
    test('generated files exist', () => {
        const jsFile = path.join(__dirname, '../../generated/api-routes.js');
        const elmFile = path.join(__dirname, '../../../app/generated/ApiClient.elm');
        
        expect(fs.existsSync(jsFile)).toBe(true);
        expect(fs.existsSync(elmFile)).toBe(true);
    });

    test('JavaScript routes file has correct structure', () => {
        const jsFile = path.join(__dirname, '../../generated/api-routes.js');
        const content = fs.readFileSync(jsFile, 'utf-8');
        
        expect(content).toContain('registerApiRoutes');
        expect(content).toContain('/api/SubmitComment');
        expect(content).toContain('/api/GetFeed');
        expect(content).toContain('/api/SubmitItem');
        expect(content).toContain('/api/GetTags');
    });

    test('Elm client has correct structure', () => {
        
        const elmFile = path.join(__dirname, '../../../app/generated/ApiClient.elm');
        const content = fs.readFileSync(elmFile, 'utf-8');
        
        expect(content).toContain('module Generated.ApiClient exposing');
        expect(content).toContain('submitcomment');
        expect(content).toContain('getfeed');
        expect(content).toContain('submititem');
        expect(content).toContain('gettags');
        expect(content).toContain('encodeSubmitCommentReq');
        expect(content).toContain('Http.post');
    });

    test('Elm types match Rust definitions', () => {
        
        const elmFile = path.join(__dirname, '../../../app/generated/ApiClient.elm');
        const content = fs.readFileSync(elmFile, 'utf-8');
        
        // Check type aliases exist
        expect(content).toContain('type alias SubmitCommentReq');
        expect(content).toContain('type alias GetFeedReq');
        expect(content).toContain('type alias SubmitItemReq');
        expect(content).toContain('type alias GetTagsReq');
        
        // Check field types are correct
        expect(content).toContain('host : String');
        expect(content).toContain('title : String');
        expect(content).toContain('tags : List String');
    });
});