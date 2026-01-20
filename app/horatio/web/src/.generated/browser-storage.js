/**
 * Auto-Generated Browser Storage APIs
 * Generated from Elm storage models
 *
 * DO NOT EDIT - Changes will be overwritten
 */

/**
 * Auto-generated browser storage for GuestSession
 * Provides type-safe localStorage operations with Elm port integration
 */
class GuestSessionStorage {
    static storageKey = 'guest_session';
    
    /**
     * Save GuestSession to localStorage and notify Elm
     * @param {Object} guestsession - GuestSession data to save
     */
    static save(guestsession) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(guestsession));
            
            // Notify Elm of the change (if ports are available)
            if (typeof app !== 'undefined' && app.ports && app.ports.guestsessionChanged) {
                app.ports.guestsessionChanged.send(guestsession);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving GuestSession:', error);
            return false;
        }
    }
    
    /**
     * Load GuestSession from localStorage
     * @returns {Object|null} GuestSession data or null if not found
     */
    static load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading GuestSession:', error);
            return null;
        }
    }
    
    /**
     * Clear GuestSession from localStorage and notify Elm
     */
    static clear() {
        try {
            localStorage.removeItem(this.storageKey);
            
            // Notify Elm of the change (if ports are available)
            if (typeof app !== 'undefined' && app.ports && app.ports.guestsessionChanged) {
                app.ports.guestsessionChanged.send(null);
            }
            
            return true;
        } catch (error) {
            console.error('Error clearing GuestSession:', error);
            return false;
        }
    }
    
    /**
     * Check if GuestSession exists in localStorage
     * @returns {boolean} True if data exists
     */
    static exists() {
        return localStorage.getItem(this.storageKey) !== null;
    }
    
    /**
     * Update specific fields in stored GuestSession
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
    
    
    // GuestSession port bindings
    if (app.ports.saveGuestSession) {
        app.ports.saveGuestSession.subscribe((jsonData) => {
            // jsonData is already a JavaScript object from Elm's Json.Encode.Value
            GuestSessionStorage.save(jsonData);
        });
    }
    
    if (app.ports.loadGuestSession) {
        app.ports.loadGuestSession.subscribe(() => {
            const data = GuestSessionStorage.load();
            if (app.ports.guestsessionLoaded) {
                // Send the raw JavaScript object/null - Elm will decode it
                app.ports.guestsessionLoaded.send(data);
            }
        });
    }
    
    if (app.ports.clearGuestSession) {
        app.ports.clearGuestSession.subscribe(() => {
            GuestSessionStorage.clear();
        });
    }
    
    console.log('✅ Storage ports connected successfully');
}

// Export all storage classes
export {
    GuestSessionStorage,
    connectStoragePorts
};
