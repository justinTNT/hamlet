/**
 * Auto-Generated Browser Storage APIs
 * Generated from Elm storage models
 *
 * DO NOT EDIT - Changes will be overwritten
 */

/**
 * Auto-generated browser storage for AdminPreferences
 * Provides type-safe localStorage operations with Elm port integration
 */
class AdminPreferencesStorage {
    static storageKey = 'admin_preferences';
    
    /**
     * Save AdminPreferences to localStorage and notify Elm
     * @param {Object} adminpreferences - AdminPreferences data to save
     */
    static save(adminpreferences) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(adminpreferences));
            
            // Notify Elm of the change (if ports are available)
            if (typeof app !== 'undefined' && app.ports && app.ports.adminpreferencesChanged) {
                app.ports.adminpreferencesChanged.send(adminpreferences);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving AdminPreferences:', error);
            return false;
        }
    }
    
    /**
     * Load AdminPreferences from localStorage
     * @returns {Object|null} AdminPreferences data or null if not found
     */
    static load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading AdminPreferences:', error);
            return null;
        }
    }
    
    /**
     * Clear AdminPreferences from localStorage and notify Elm
     */
    static clear() {
        try {
            localStorage.removeItem(this.storageKey);
            
            // Notify Elm of the change (if ports are available)
            if (typeof app !== 'undefined' && app.ports && app.ports.adminpreferencesChanged) {
                app.ports.adminpreferencesChanged.send(null);
            }
            
            return true;
        } catch (error) {
            console.error('Error clearing AdminPreferences:', error);
            return false;
        }
    }
    
    /**
     * Check if AdminPreferences exists in localStorage
     * @returns {boolean} True if data exists
     */
    static exists() {
        return localStorage.getItem(this.storageKey) !== null;
    }
    
    /**
     * Update specific fields in stored AdminPreferences
     * @param {Object} updates - Fields to update
     */
    static update(updates) {
        const current = this.load();
        if (current) {
            const updated = { ...current, ...updates };
            return this.save(updated);
        }
        return false;
    }
}

/**
 * Auto-generated Elm port integration for browser storage
 * Connects Elm ports to JavaScript storage classes
 * 
 * @param {Object} app - Elm app instance with ports
 */
function connectStoragePorts(app) {
    if (!app || !app.ports) {
        console.warn('Elm app or ports not available for storage integration');
        return;
    }
    
    console.log('🔌 Connecting auto-generated storage ports...');
    
    
    // AdminPreferences port bindings
    if (app.ports.saveAdminPreferences) {
        app.ports.saveAdminPreferences.subscribe((jsonData) => {
            // jsonData is already a JavaScript object from Elm's Json.Encode.Value
            AdminPreferencesStorage.save(jsonData);
        });
    }
    
    if (app.ports.loadAdminPreferences) {
        app.ports.loadAdminPreferences.subscribe(() => {
            const data = AdminPreferencesStorage.load();
            if (app.ports.adminpreferencesLoaded) {
                // Send the raw JavaScript object/null - Elm will decode it
                app.ports.adminpreferencesLoaded.send(data);
            }
        });
    }
    
    if (app.ports.clearAdminPreferences) {
        app.ports.clearAdminPreferences.subscribe(() => {
            AdminPreferencesStorage.clear();
        });
    }
    
    console.log('✅ Storage ports connected successfully');
}

// Export all storage classes
export {
    AdminPreferencesStorage,
    connectStoragePorts
};
