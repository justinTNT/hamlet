/**
 * Demo of Auto-Generated Type-Safe Database Queries
 * Shows the difference between old dangerous string manipulation and new type-safe queries
 */

// Example usage of the new generated queries (this is what developers should use now)
console.log('✅ NEW: Type-safe generated database queries');
console.log('');

console.log('// Instead of dangerous string manipulation:');
console.log('// await db.queryForTenant(host, "SELECT * FROM microblog_item WHERE title LIKE ?", ["%search%"])');
console.log('');

console.log('// Use generated type-safe functions:');
console.log('const items = await db.getMicroblogItemsByHost(host);');
console.log('const item = await db.getMicroblogItemById("123", host);');
console.log('const newItem = await db.insertMicroblogItem({');
console.log('    title: "My Post",');
console.log('    content: "Content here",');
console.log('    tags: ["tech", "programming"]');
console.log('}, host);');
console.log('');

console.log('// Update with type safety:');
console.log('const updated = await db.updateMicroblogItem("123", {');
console.log('    title: "Updated Post Title",');
console.log('    view_count: 42');
console.log('}, host);');
console.log('');

console.log('// Delete with automatic tenant isolation:');
console.log('const deleted = await db.deleteMicroblogItem("123", host);');
console.log('');

console.log('🔒 All queries include automatic tenant isolation');
console.log('🛡️  No SQL injection vulnerabilities');
console.log('✨ Type-safe parameter handling');
console.log('🚀 Generated from Rust models - "Rust once, JSON never"');