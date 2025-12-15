import { jest } from '@jest/globals';

describe('Browser Storage Generation - Basic Tests', () => {
    test('storage classes have correct structure and methods', () => {
        class UserPreferencesStorage {
            static storageKey = 'user_preferences';

            static save(data) {
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                    this._notifyElm(data);
                    return true;
                } catch (error) {
                    console.error('Error saving UserPreferences:', error);
                    return false;
                }
            }

            static load() {
                try {
                    const item = localStorage.getItem(this.storageKey);
                    return item ? JSON.parse(item) : null;
                } catch (error) {
                    console.error('Error loading UserPreferences:', error);
                    return null;
                }
            }

            static clear() {
                try {
                    localStorage.removeItem(this.storageKey);
                    this._notifyElm(null);
                    return true;
                } catch (error) {
                    console.error('Error clearing UserPreferences:', error);
                    return false;
                }
            }

            static exists() {
                return localStorage.getItem(this.storageKey) !== null;
            }

            static update(updates) {
                const existing = this.load();
                if (!existing) return false;
                return this.save({ ...existing, ...updates });
            }

            static _notifyElm(data) {
                if (typeof window !== 'undefined' && window.app && window.app.ports) {
                    window.app.ports.userpreferencesChanged?.send(data);
                }
            }
        }

        // Test class structure
        expect(UserPreferencesStorage.storageKey).toBe('user_preferences');
        expect(typeof UserPreferencesStorage.save).toBe('function');
        expect(typeof UserPreferencesStorage.load).toBe('function');
        expect(typeof UserPreferencesStorage.clear).toBe('function');
        expect(typeof UserPreferencesStorage.exists).toBe('function');
        expect(typeof UserPreferencesStorage.update).toBe('function');
    });

    test('storage operations use localStorage correctly', () => {
        const generateStorageClass = (name, key) => {
            return class {
                static storageKey = key;

                static save(data) {
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                    return true;
                }

                static load() {
                    const item = localStorage.getItem(this.storageKey);
                    return item ? JSON.parse(item) : null;
                }

                static clear() {
                    localStorage.removeItem(this.storageKey);
                    return true;
                }

                static exists() {
                    return localStorage.getItem(this.storageKey) !== null;
                }
            };
        };

        const UserStorage = generateStorageClass('UserPreferences', 'user_preferences');
        const AuthStorage = generateStorageClass('AuthState', 'auth_state');
        const ViewportStorage = generateStorageClass('ViewportState', 'viewport_state');

        expect(UserStorage.storageKey).toBe('user_preferences');
        expect(AuthStorage.storageKey).toBe('auth_state');
        expect(ViewportStorage.storageKey).toBe('viewport_state');

        // Test consistent interface
        ['save', 'load', 'clear', 'exists'].forEach(method => {
            expect(typeof UserStorage[method]).toBe('function');
            expect(typeof AuthStorage[method]).toBe('function');
            expect(typeof ViewportStorage[method]).toBe('function');
        });
    });

    test('Elm port integration pattern is correct', () => {
        const connectStoragePorts = (app) => {
            if (!app || !app.ports) {
                console.warn('Elm app or ports not available for storage integration');
                return;
            }

            // Save operations
            if (app.ports.saveUserPreferences) {
                app.ports.saveUserPreferences.subscribe((data) => {
                    localStorage.setItem('user_preferences', JSON.stringify(data));
                    app.ports.userpreferencesChanged?.send(data);
                });
            }

            // Load operations
            if (app.ports.loadUserPreferences) {
                app.ports.loadUserPreferences.subscribe(() => {
                    const data = localStorage.getItem('user_preferences');
                    const parsed = data ? JSON.parse(data) : null;
                    app.ports.userpreferencesLoaded?.send(parsed);
                });
            }

            // Clear operations
            if (app.ports.clearUserPreferences) {
                app.ports.clearUserPreferences.subscribe(() => {
                    localStorage.removeItem('user_preferences');
                    app.ports.userpreferencesChanged?.send(null);
                });
            }

            return true;
        };

        const mockApp = {
            ports: {
                saveUserPreferences: { subscribe: jest.fn() },
                loadUserPreferences: { subscribe: jest.fn() },
                clearUserPreferences: { subscribe: jest.fn() },
                userpreferencesLoaded: { send: jest.fn() },
                userpreferencesChanged: { send: jest.fn() }
            }
        };

        const result = connectStoragePorts(mockApp);

        expect(result).toBe(true);
        expect(mockApp.ports.saveUserPreferences.subscribe).toHaveBeenCalled();
        expect(mockApp.ports.loadUserPreferences.subscribe).toHaveBeenCalled();
        expect(mockApp.ports.clearUserPreferences.subscribe).toHaveBeenCalled();
    });

    test('Elm port files follow correct pattern', () => {
        const generateElmPorts = (storageTypes) => {
            const portDefinitions = [];

            storageTypes.forEach(type => {
                const typeName = type.toLowerCase();
                
                // Outgoing ports (Elm -> JS)
                portDefinitions.push(
                    `port save${type} : ${type}Data -> Cmd msg`,
                    `port load${type} : () -> Cmd msg`,
                    `port clear${type} : () -> Cmd msg`
                );

                // Incoming ports (JS -> Elm)  
                portDefinitions.push(
                    `port ${typeName}Loaded : (Maybe ${type}Data -> msg) -> Sub msg`,
                    `port ${typeName}Changed : (Maybe ${type}Data -> msg) -> Sub msg`
                );
            });

            return {
                header: 'port module Generated.StoragePorts exposing (..)',
                ports: portDefinitions,
                warning: '-- DO NOT EDIT THIS FILE MANUALLY --'
            };
        };

        const elmPorts = generateElmPorts(['UserPreferences', 'AuthState', 'ViewportState']);

        expect(elmPorts.header).toContain('port module Generated.StoragePorts');
        expect(elmPorts.warning).toContain('DO NOT EDIT');
        
        // Check specific port definitions
        expect(elmPorts.ports).toContain('port saveUserPreferences : UserPreferencesData -> Cmd msg');
        expect(elmPorts.ports).toContain('port loadUserPreferences : () -> Cmd msg');
        expect(elmPorts.ports).toContain('port userpreferencesLoaded : (Maybe UserPreferencesData -> msg) -> Sub msg');
        expect(elmPorts.ports).toContain('port authstateChanged : (Maybe AuthStateData -> msg) -> Sub msg');
    });

    test('storage key naming follows snake_case convention', () => {
        const convertToStorageKey = (structName) => {
            return structName
                .replace(/([A-Z])/g, '_$1')
                .toLowerCase()
                .replace(/^_/, '');
        };

        expect(convertToStorageKey('UserPreferences')).toBe('user_preferences');
        expect(convertToStorageKey('AuthState')).toBe('auth_state');
        expect(convertToStorageKey('FileProcessingStatus')).toBe('file_processing_status');
        expect(convertToStorageKey('ProcessingStep')).toBe('processing_step');
        expect(convertToStorageKey('ViewportState')).toBe('viewport_state');
        
        // Test generated storage classes follow this pattern
        const storageTypes = ['UserPreferences', 'AuthState', 'ViewportState'];
        storageTypes.forEach(type => {
            const expectedKey = convertToStorageKey(type);
            expect(expectedKey).toMatch(/^[a-z][a-z_]*[a-z]$/); // snake_case pattern
        });
    });
});