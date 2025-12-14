// Simple test of imports
try {
    console.log('Testing storage class imports...');
    
    const { UserPreferencesStorage } = await import('./generated/browser-storage.js');
    console.log('✅ UserPreferencesStorage imported successfully');
    
    console.log('UserPreferencesStorage methods:', Object.getOwnPropertyNames(UserPreferencesStorage));
    
} catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Error details:', error);
}