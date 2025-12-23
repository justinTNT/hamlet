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
            guestsessionChanged: { send: jest.fn() },
            guestsessionLoaded: { send: jest.fn() }
        }
    },
    writable: true
});

describe('Browser Storage Generation', () => {
    let GuestSessionStorage, connectStoragePorts;

    beforeAll(async () => {
        const storageModule = await import('../../generated/browser-storage.js');
        GuestSessionStorage = storageModule.GuestSessionStorage;
        connectStoragePorts = storageModule.connectStoragePorts;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset localStorage mocks to their default behavior
        localStorage.setItem.mockImplementation(() => {});
        localStorage.getItem.mockImplementation(() => null);
        localStorage.removeItem.mockImplementation(() => {});
        
        // Ensure global.app is properly restored
        global.app = {
            ports: {
                guestsessionChanged: { send: jest.fn() },
                guestsessionLoaded: { send: jest.fn() }
            }
        };
    });

    describe('GuestSessionStorage class', () => {
        test('save() stores data in localStorage and notifies Elm', () => {
            const guestSession = { 
                guest_id: 'guest_123', 
                display_name: 'Test User',
                created_at: 1640995200000 
            };

            const result = GuestSessionStorage.save(guestSession);

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'guest_session',
                JSON.stringify(guestSession)
            );
            expect(global.app.ports.guestsessionChanged.send).toHaveBeenCalledWith(guestSession);
            expect(result).toBe(true);
        });

        test('load() retrieves data from localStorage', () => {
            const guestSession = { guest_id: 'guest_456', display_name: 'Another User', created_at: 1640995300000 };
            localStorage.getItem.mockReturnValue(JSON.stringify(guestSession));

            const result = GuestSessionStorage.load();

            expect(localStorage.getItem).toHaveBeenCalledWith('guest_session');
            expect(result).toEqual(guestSession);
        });

        test('load() returns null for missing data', () => {
            localStorage.getItem.mockReturnValue(null);

            const result = GuestSessionStorage.load();

            expect(result).toBeNull();
        });

        test('load() handles JSON parsing errors', () => {
            localStorage.getItem.mockReturnValue('invalid json');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = GuestSessionStorage.load();

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error loading GuestSession:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('clear() removes data and notifies Elm', () => {
            const result = GuestSessionStorage.clear();

            expect(localStorage.removeItem).toHaveBeenCalledWith('guest_session');
            expect(global.app.ports.guestsessionChanged.send).toHaveBeenCalledWith(null);
            expect(result).toBe(true);
        });

        test('exists() checks localStorage correctly', () => {
            localStorage.getItem.mockReturnValue('{"guest_id": "guest_123"}');
            expect(GuestSessionStorage.exists()).toBe(true);

            localStorage.getItem.mockReturnValue(null);
            expect(GuestSessionStorage.exists()).toBe(false);
        });

        test('update() merges with existing data', () => {
            const existing = { guest_id: 'guest_123', display_name: 'Old Name', created_at: 1640995200000 };
            const updates = { display_name: 'New Name', last_active: 1640995500000 };
            const expected = { guest_id: 'guest_123', display_name: 'New Name', created_at: 1640995200000, last_active: 1640995500000 };

            localStorage.getItem.mockReturnValue(JSON.stringify(existing));

            const result = GuestSessionStorage.update(updates);

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'guest_session',
                JSON.stringify(expected)
            );
            expect(result).toBe(true);
        });

        test('update() returns false when no existing data', () => {
            localStorage.getItem.mockReturnValue(null);

            const result = GuestSessionStorage.update({ display_name: 'Updated Name' });

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

            const result = GuestSessionStorage.save({ guest_id: 'test', display_name: 'Test', created_at: Date.now() });

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error saving GuestSession:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('clear() handles localStorage errors gracefully', () => {
            localStorage.removeItem.mockImplementation(() => {
                throw new Error('Storage access denied');
            });
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = GuestSessionStorage.clear();

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error clearing GuestSession:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('works when Elm app ports are not available', () => {
            const originalApp = global.app;
            global.app = undefined;

            const result = GuestSessionStorage.save({ guest_id: 'test', display_name: 'Test', created_at: Date.now() });

            expect(result).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalled();

            global.app = originalApp;
        });
    });

    describe('Elm port integration', () => {
        let mockApp;

        beforeEach(() => {
            mockApp = {
                ports: {
                    saveGuestSession: { subscribe: jest.fn() },
                    loadGuestSession: { subscribe: jest.fn() },
                    clearGuestSession: { subscribe: jest.fn() },
                    guestsessionLoaded: { send: jest.fn() }
                }
            };
        });

        test('connectStoragePorts subscribes to all ports', () => {
            connectStoragePorts(mockApp);

            expect(mockApp.ports.saveGuestSession.subscribe).toHaveBeenCalledWith(
                GuestSessionStorage.save
            );
            expect(mockApp.ports.loadGuestSession.subscribe).toHaveBeenCalled();
            expect(mockApp.ports.clearGuestSession.subscribe).toHaveBeenCalledWith(
                GuestSessionStorage.clear
            );
        });

        test('load port triggers data retrieval and response', () => {
            const testData = { guest_id: 'test', display_name: 'Test User', created_at: Date.now() };
            localStorage.getItem.mockReturnValue(JSON.stringify(testData));

            connectStoragePorts(mockApp);
            
            // Get the callback function that was passed to loadGuestSession.subscribe
            const loadCallback = mockApp.ports.loadGuestSession.subscribe.mock.calls[0][0];
            
            // Call the callback function to simulate Elm sending a load message
            loadCallback();

            expect(localStorage.getItem).toHaveBeenCalledWith('guest_session');
            expect(mockApp.ports.guestsessionLoaded.send).toHaveBeenCalledWith(testData);
        });

        test('handles missing app gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            connectStoragePorts(null);

            expect(consoleSpy).toHaveBeenCalledWith('Elm app or ports not available for storage integration');
            
            consoleSpy.mockRestore();
        });

        test('handles missing ports gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            connectStoragePorts({ ports: null });

            expect(consoleSpy).toHaveBeenCalledWith('Elm app or ports not available for storage integration');
            
            consoleSpy.mockRestore();
        });

        test('skips missing individual ports', () => {
            // App with incomplete port structure
            const incompleteApp = {
                ports: {
                    // Only some ports available
                    saveGuestSession: { subscribe: jest.fn() }
                    // loadGuestSession missing
                    // clearGuestSession missing
                }
            };

            expect(() => connectStoragePorts(incompleteApp)).not.toThrow();
            
            // Should still connect the available port
            expect(incompleteApp.ports.saveGuestSession.subscribe).toHaveBeenCalled();
        });
    });

    describe('type safety', () => {
        test('generated storage classes match Rust struct names', () => {
            // Test that the storage class name follows the expected pattern
            expect(GuestSessionStorage).toBeDefined();
            expect(typeof GuestSessionStorage.save).toBe('function');
            expect(typeof GuestSessionStorage.load).toBe('function');
            expect(typeof GuestSessionStorage.clear).toBe('function');
            expect(typeof GuestSessionStorage.exists).toBe('function');
            expect(typeof GuestSessionStorage.update).toBe('function');
        });

        test('storage operations preserve data types', () => {
            const originalData = {
                guest_id: 'guest_123',
                display_name: 'Test User',
                created_at: 1640995200000
            };

            GuestSessionStorage.save(originalData);
            const saveCallArgs = localStorage.setItem.mock.calls[0];
            const savedData = JSON.parse(saveCallArgs[1]);

            expect(savedData).toEqual(originalData);
            expect(typeof savedData.guest_id).toBe('string');
            expect(typeof savedData.display_name).toBe('string');
            expect(typeof savedData.created_at).toBe('number');
        });
    });

    describe('performance', () => {
        test('storage operations are synchronous', () => {
            const start = performance.now();
            
            GuestSessionStorage.save({ guest_id: 'test', display_name: 'Test', created_at: Date.now() });
            GuestSessionStorage.load();
            GuestSessionStorage.exists();
            GuestSessionStorage.clear();
            
            const end = performance.now();
            
            // Should complete within 10ms
            expect(end - start).toBeLessThan(10);
        });

        test('JSON serialization is efficient', () => {
            const largeData = {
                guest_id: 'guest_123',
                display_name: 'User with very long name '.repeat(100),
                created_at: Date.now(),
                metadata: Array(1000).fill().map((_, i) => ({ key: `prop_${i}`, value: `value_${i}` }))
            };

            const start = performance.now();
            GuestSessionStorage.save(largeData);
            const end = performance.now();

            // Should handle large objects within reasonable time
            expect(end - start).toBeLessThan(50);
            expect(localStorage.setItem).toHaveBeenCalled();
        });
    });
});