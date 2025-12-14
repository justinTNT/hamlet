import { jest } from '@jest/globals';

// Mock browser globals
Object.defineProperty(global, 'localStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
    },
    writable: true
});

Object.defineProperty(global, 'app', {
    value: {
        ports: {
            userpreferencesChanged: { send: jest.fn() },
            authstateChanged: { send: jest.fn() },
            fileprocessingstatusChanged: { send: jest.fn() },
            processingstepChanged: { send: jest.fn() },
            viewportstateChanged: { send: jest.fn() }
        }
    },
    writable: true
});

describe('Browser Storage Generation', () => {
    let UserPreferencesStorage, AuthStateStorage, connectStoragePorts;

    beforeAll(async () => {
        const storageModule = await import('../../packages/hamlet-server/generated/browser-storage.js');
        UserPreferencesStorage = storageModule.UserPreferencesStorage;
        AuthStateStorage = storageModule.AuthStateStorage;
        connectStoragePorts = storageModule.connectStoragePorts;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('UserPreferencesStorage class', () => {
        test('save() stores data in localStorage and notifies Elm', () => {
            const preferences = { 
                theme: 'dark', 
                language: 'en',
                notifications: true 
            };

            const result = UserPreferencesStorage.save(preferences);

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'user_preferences',
                JSON.stringify(preferences)
            );
            expect(global.app.ports.userpreferencesChanged.send).toHaveBeenCalledWith(preferences);
            expect(result).toBe(true);
        });

        test('load() retrieves data from localStorage', () => {
            const preferences = { theme: 'light', language: 'es' };
            localStorage.getItem.mockReturnValue(JSON.stringify(preferences));

            const result = UserPreferencesStorage.load();

            expect(localStorage.getItem).toHaveBeenCalledWith('user_preferences');
            expect(result).toEqual(preferences);
        });

        test('load() returns null for missing data', () => {
            localStorage.getItem.mockReturnValue(null);

            const result = UserPreferencesStorage.load();

            expect(result).toBeNull();
        });

        test('load() handles JSON parsing errors', () => {
            localStorage.getItem.mockReturnValue('invalid json');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = UserPreferencesStorage.load();

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error loading UserPreferences:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('clear() removes data and notifies Elm', () => {
            const result = UserPreferencesStorage.clear();

            expect(localStorage.removeItem).toHaveBeenCalledWith('user_preferences');
            expect(global.app.ports.userpreferencesChanged.send).toHaveBeenCalledWith(null);
            expect(result).toBe(true);
        });

        test('exists() checks localStorage correctly', () => {
            localStorage.getItem.mockReturnValue('{"theme": "dark"}');
            expect(UserPreferencesStorage.exists()).toBe(true);

            localStorage.getItem.mockReturnValue(null);
            expect(UserPreferencesStorage.exists()).toBe(false);
        });

        test('update() merges with existing data', () => {
            const existing = { theme: 'dark', language: 'en', notifications: true };
            const updates = { theme: 'light', fontSize: 'large' };
            const expected = { theme: 'light', language: 'en', notifications: true, fontSize: 'large' };

            localStorage.getItem.mockReturnValue(JSON.stringify(existing));

            const result = UserPreferencesStorage.update(updates);

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'user_preferences',
                JSON.stringify(expected)
            );
            expect(result).toBe(true);
        });

        test('update() returns false when no existing data', () => {
            localStorage.getItem.mockReturnValue(null);

            const result = UserPreferencesStorage.update({ theme: 'dark' });

            expect(result).toBe(false);
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('save() handles localStorage errors gracefully', () => {
            localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = UserPreferencesStorage.save({ theme: 'dark' });

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error saving UserPreferences:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('clear() handles localStorage errors gracefully', () => {
            localStorage.removeItem.mockImplementation(() => {
                throw new Error('Storage access denied');
            });
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = UserPreferencesStorage.clear();

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error clearing UserPreferences:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('works when Elm app ports are not available', () => {
            const originalApp = global.app;
            global.app = undefined;

            const result = UserPreferencesStorage.save({ theme: 'dark' });

            expect(result).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalled();

            global.app = originalApp;
        });
    });

    describe('AuthStateStorage class', () => {
        test('uses correct storage key', () => {
            AuthStateStorage.save({ isLoggedIn: true, token: 'abc123' });

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'auth_state',
                expect.any(String)
            );
        });

        test('notifies correct Elm port', () => {
            const authState = { isLoggedIn: true, userId: 'user123' };
            
            AuthStateStorage.save(authState);

            expect(global.app.ports.authstateChanged.send).toHaveBeenCalledWith(authState);
        });
    });

    describe('Elm port integration', () => {
        let mockApp;

        beforeEach(() => {
            mockApp = {
                ports: {
                    saveUserPreferences: { subscribe: jest.fn() },
                    loadUserPreferences: { subscribe: jest.fn() },
                    clearUserPreferences: { subscribe: jest.fn() },
                    userpreferencesLoaded: { send: jest.fn() },
                    saveAuthState: { subscribe: jest.fn() },
                    loadAuthState: { subscribe: jest.fn() },
                    clearAuthState: { subscribe: jest.fn() }
                }
            };
        });

        test('connectStoragePorts subscribes to all ports', () => {
            connectStoragePorts(mockApp);

            expect(mockApp.ports.saveUserPreferences.subscribe).toHaveBeenCalledWith(
                UserPreferencesStorage.save
            );
            expect(mockApp.ports.loadUserPreferences.subscribe).toHaveBeenCalled();
            expect(mockApp.ports.clearUserPreferences.subscribe).toHaveBeenCalledWith(
                UserPreferencesStorage.clear
            );
        });

        test('load port triggers data retrieval and response', () => {
            const testData = { theme: 'dark' };
            localStorage.getItem.mockReturnValue(JSON.stringify(testData));

            connectStoragePorts(mockApp);

            // Simulate Elm sending load request
            const loadCallback = mockApp.ports.loadUserPreferences.subscribe.mock.calls[0][0];
            loadCallback();

            expect(mockApp.ports.userpreferencesLoaded.send).toHaveBeenCalledWith(testData);
        });

        test('handles missing app gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            connectStoragePorts(null);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Elm app or ports not available for storage integration'
            );
            
            consoleSpy.mockRestore();
        });

        test('handles missing ports gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            connectStoragePorts({ ports: null });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Elm app or ports not available for storage integration'
            );
            
            consoleSpy.mockRestore();
        });

        test('skips missing individual ports', () => {
            const partialApp = {
                ports: {
                    saveUserPreferences: { subscribe: jest.fn() }
                    // Missing other ports
                }
            };

            // Should not throw error
            connectStoragePorts(partialApp);

            expect(partialApp.ports.saveUserPreferences.subscribe).toHaveBeenCalled();
        });
    });

    describe('type safety', () => {
        test('generated storage classes match Rust struct names', () => {
            // Test that storage class names correspond to Rust structs
            expect(UserPreferencesStorage).toBeDefined();
            expect(AuthStateStorage).toBeDefined();
            
            // Storage keys should be snake_case versions of struct names
            expect(UserPreferencesStorage.storageKey).toBe('user_preferences');
            expect(AuthStateStorage.storageKey).toBe('auth_state');
        });

        test('storage operations preserve data types', () => {
            const complexData = {
                string: 'test',
                number: 42,
                boolean: true,
                array: [1, 2, 3],
                object: { nested: 'value' }
            };

            localStorage.getItem.mockReturnValue(JSON.stringify(complexData));

            const retrieved = UserPreferencesStorage.load();

            expect(retrieved).toEqual(complexData);
            expect(typeof retrieved.string).toBe('string');
            expect(typeof retrieved.number).toBe('number');
            expect(typeof retrieved.boolean).toBe('boolean');
            expect(Array.isArray(retrieved.array)).toBe(true);
            expect(typeof retrieved.object).toBe('object');
        });
    });

    describe('performance', () => {
        test('storage operations are synchronous', () => {
            const start = Date.now();
            
            UserPreferencesStorage.save({ theme: 'dark' });
            UserPreferencesStorage.load();
            UserPreferencesStorage.exists();
            UserPreferencesStorage.clear();
            
            const duration = Date.now() - start;
            
            expect(duration).toBeLessThan(10); // Should be very fast
        });

        test('JSON serialization is efficient', () => {
            const largeData = {
                items: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    name: `Item ${i}`,
                    data: Array.from({ length: 10 }, () => Math.random())
                }))
            };

            const start = Date.now();
            UserPreferencesStorage.save(largeData);
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(100); // Should handle large data efficiently
        });
    });
});