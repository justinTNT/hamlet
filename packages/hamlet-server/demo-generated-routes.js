/**
 * Demo of Auto-Generated API Routes
 * Shows the difference between old manual endpoint switching and new individual routes
 */

console.log('✅ NEW: Individual auto-generated API routes');
console.log('');

console.log('// OLD: Manual endpoint switching');
console.log('// POST /api');
console.log('// { "endpoint": "GetFeed", "body": { ... } }');
console.log('');

console.log('// NEW: Individual routes with automatic validation and context injection');
console.log('');

console.log('🚀 POST /api/GetFeed');
console.log('  • Automatic host injection from tenant context'); 
console.log('  • Type-safe request/response handling');
console.log('  • Business logic integration');
console.log('');

console.log('🚀 POST /api/SubmitItem'); 
console.log('  • Required field validation (title)');
console.log('  • Automatic bundle context (SubmitItemData)');
console.log('  • Tenant isolation built-in');
console.log('');

console.log('🚀 POST /api/SubmitComment');
console.log('  • Server context injection'); 
console.log('  • Guest session handling');
console.log('  • Type-safe comment validation');
console.log('');

console.log('🚀 POST /api/GetTags');
console.log('  • Host context injection');
console.log('  • Cached tag retrieval'); 
console.log('  • Tenant-scoped results');
console.log('');

console.log('🔄 Generated from Rust #[buildamp_api] annotations');
console.log('🛡️  Automatic validation and context injection');  
console.log('🚀 Type-safe end-to-end from Rust to JavaScript');
console.log('⚡ Replaces manual endpoint switching');

console.log('');
console.log('📝 The old /api endpoint is now deprecated but kept for backwards compatibility.');