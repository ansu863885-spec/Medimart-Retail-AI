import type { RegisteredPharmacy } from '../types';

/**
 * NOTE: This is a mock storage service using localStorage.
 * It simulates an async API to a backend server.
 * To enable true multi-device login, replace the localStorage logic in each
 * function with actual `fetch` calls to your backend API endpoints.
 * The examples below show how you might do this.
 */

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const defaultUser = {
    ownerName: 'John Doe',
    pharmacyName: 'MediQuick Pharmacy',
    pharmacistName: 'Jane Smith',
    drugLicense: 'DL12345',
    panCard: '',
    gstNumber: '27ABCDE1234F1Z5',
    phone: '9876543210',
    email: 'test@medimart.com',
    password: 'password123',
    bankAccountName: 'MediQuick Pharmacy',
    bankAccountNumber: '123456789012',
    bankIfsc: 'HDFC0001234',
    authorizedSignatory: 'John Doe',
    pharmacyLogoUrl: ''
};

// Initialize default user if no users exist
const initializeDefaultUser = () => {
    try {
        const storedUsersJson = localStorage.getItem('registeredUsers');
        if (!storedUsersJson) {
            localStorage.setItem('registeredUsers', JSON.stringify([defaultUser]));
        } else {
            const storedUsers = JSON.parse(storedUsersJson);
            const defaultUserExists = storedUsers.some((u: any) => u.email.toLowerCase() === defaultUser.email);
            if (!defaultUserExists) {
                storedUsers.push(defaultUser);
                localStorage.setItem('registeredUsers', JSON.stringify(storedUsers));
            }
        }
    } catch (e) {
        console.error("Failed to initialize default user", e);
        localStorage.setItem('registeredUsers', JSON.stringify([defaultUser]));
    }
};

initializeDefaultUser();

export const login = async (email: string, password: string): Promise<RegisteredPharmacy> => {
    /*
    // --- REAL BACKEND IMPLEMENTATION EXAMPLE ---
    // Replace the localStorage logic below with a fetch call to your login endpoint.
    const response = await fetch('https://your-api.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
    }
    const { user, token } = await response.json();
    // You would typically save the auth token here to use in other API calls
    // localStorage.setItem('authToken', token); 
    return user;
    */

    // --- MOCK IMPLEMENTATION (using localStorage) ---
    await delay(500); // Simulate network latency
    try {
        const storedUsersJson = localStorage.getItem('registeredUsers');
        const storedUsers = storedUsersJson ? JSON.parse(storedUsersJson) : [];
        const user = storedUsers.find((u: any) =>
            u.email.toLowerCase() === email.trim().toLowerCase() &&
            u.password === password
        );

        if (user) {
            const { password, ...profileData } = user;
            return Promise.resolve(profileData as RegisteredPharmacy);
        } else {
            return Promise.reject(new Error('Invalid email or password.'));
        }
    } catch (error) {
        return Promise.reject(new Error('An error occurred during login.'));
    }
};

export const register = async (userData: RegisteredPharmacy, password: string): Promise<RegisteredPharmacy> => {
    /*
    // --- REAL BACKEND IMPLEMENTATION EXAMPLE ---
    const response = await fetch('https://your-api.com/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, password })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
    }
    const { user, token } = await response.json();
    // localStorage.setItem('authToken', token);
    return user;
    */

    // --- MOCK IMPLEMENTATION (using localStorage) ---
    await delay(500);
    try {
        const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const userExists = storedUsers.some((u: any) => u.email.toLowerCase() === userData.email.trim().toLowerCase());

        if (userExists) {
            return Promise.reject(new Error('An account with this email already exists.'));
        }

        const newUser = { ...userData, email: userData.email.trim(), password };
        storedUsers.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(storedUsers));
        
        const { password: _, ...profileData } = newUser;
        return Promise.resolve(profileData as RegisteredPharmacy);
    } catch (error) {
        return Promise.reject(new Error('An error occurred during registration.'));
    }
};

export const findUserByEmail = async (email: string): Promise<boolean> => {
    /*
    // --- REAL BACKEND IMPLEMENTATION EXAMPLE ---
    // This might be used for a "forgot password" feature.
    const response = await fetch(`https://your-api.com/users/exists?email=${encodeURIComponent(email)}`);
    if (response.status === 404) return false;
    if (!response.ok) throw new Error('Server error');
    return true;
    */
    
    // --- MOCK IMPLEMENTATION (using localStorage) ---
    await delay(300);
    try {
        const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        return storedUsers.some((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());
    } catch {
        return false;
    }
};

export const updateUser = async (updatedProfile: RegisteredPharmacy): Promise<RegisteredPharmacy> => {
    /*
    // --- REAL BACKEND IMPLEMENTATION EXAMPLE ---
    // Assumes you have an auth token stored from login.
    const token = localStorage.getItem('authToken');
    const response = await fetch('https://your-api.com/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
    });
    if (!response.ok) {
        throw new Error("Failed to update user profile on server.");
    }
    return response.json();
    */

    // --- MOCK IMPLEMENTATION (using localStorage) ---
    await delay(300);
    try {
        const storedUsersJson = localStorage.getItem('registeredUsers');
        if (storedUsersJson) {
            let storedUsers = JSON.parse(storedUsersJson);
            const userIndex = storedUsers.findIndex((u: any) => u.email === updatedProfile.email);
            if (userIndex > -1) {
                const oldUserData = storedUsers[userIndex];
                storedUsers[userIndex] = { ...updatedProfile, password: oldUserData.password };
                localStorage.setItem('registeredUsers', JSON.stringify(storedUsers));
                return Promise.resolve(updatedProfile);
            }
        }
        return Promise.reject(new Error("User not found to update."));
    } catch (error) {
        return Promise.reject(new Error("Failed to update user profile in master list."));
    }
};

export const getData = async <T,>(userEmail: string, key: string, defaultValue: T): Promise<T> => {
    /*
    // --- REAL BACKEND IMPLEMENTATION EXAMPLE ---
    const token = localStorage.getItem('authToken');
    const response = await fetch(`https://your-api.com/data/${key}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 404) return defaultValue;
    if (!response.ok) {
        console.error(`Failed to fetch data for key: ${key}`);
        return defaultValue;
    }
    return response.json();
    */
    
    // --- MOCK IMPLEMENTATION (using localStorage) ---
    await delay(100); // Simulate network latency
    try {
        const storedItem = localStorage.getItem(`${userEmail}_${key}`);
        return storedItem ? JSON.parse(storedItem) : defaultValue;
    } catch (error) {
        console.error(`Failed to parse ${key} from localStorage for user ${userEmail}`, error);
        localStorage.removeItem(`${userEmail}_${key}`);
        return defaultValue;
    }
};

export const saveData = async <T,>(userEmail: string, key: string, data: T): Promise<void> => {
    /*
    // --- REAL BACKEND IMPLEMENTATION EXAMPLE ---
    const token = localStorage.getItem('authToken');
    const response = await fetch(`https://your-api.com/data/${key}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error(`Failed to save data for key: ${key}`);
    }
    return;
    */

    // --- MOCK IMPLEMENTATION (using localStorage) ---
    await delay(100);
    localStorage.setItem(`${userEmail}_${key}`, JSON.stringify(data));
    return Promise.resolve();
};


/**
 * The functions below manage the currently logged-in user's profile on the client-side.
 * This is useful for avoiding repeated fetches of user data and for UI display.
 * In a real application with a backend, `saveCurrentUser` would typically be called
 * after a successful login to store the user's profile (or a session token) locally.
 */

export const getCurrentUser = async (): Promise<RegisteredPharmacy | null> => {
    await delay(50);
    try {
        const storedUserJson = localStorage.getItem('currentUser');
        if (storedUserJson) {
            const storedUser = JSON.parse(storedUserJson);
            if (storedUser && storedUser.email) {
                return storedUser;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to parse current user from localStorage", error);
        return null;
    }
};

export const saveCurrentUser = async (user: RegisteredPharmacy): Promise<void> => {
    await delay(50);
    localStorage.setItem('currentUser', JSON.stringify(user));
    return Promise.resolve();
};

export const clearCurrentUser = async (): Promise<void> => {
    await delay(50);
    localStorage.removeItem('currentUser');
    // In a real app, you would also clear the auth token
    // localStorage.removeItem('authToken');
    return Promise.resolve();
};

const USER_DATA_KEYS = [
  'transactions',
  'inventory',
  'salesReturns',
  'purchaseReturns',
  'purchases',
  'purchaseOrders',
  'distributors',
  'customers',
];

export const exportAllUserData = async (userEmail: string): Promise<string> => {
    await delay(100);
    const allData: { [key: string]: any } = {};
    for (const key of USER_DATA_KEYS) {
        const storedItem = localStorage.getItem(`${userEmail}_${key}`);
        if (storedItem) {
            allData[key] = JSON.parse(storedItem);
        }
    }
    return JSON.stringify(allData, null, 2); // Pretty-print for readability
};

export const importAllUserData = async (userEmail: string, jsonData: string): Promise<void> => {
    await delay(100);
    try {
        const dataToImport = JSON.parse(jsonData);
        for (const key of USER_DATA_KEYS) {
            if (dataToImport[key] && Array.isArray(dataToImport[key])) {
                localStorage.setItem(`${userEmail}_${key}`, JSON.stringify(dataToImport[key]));
            } else {
                console.log(`Key "${key}" not found or invalid in import file. Skipping.`);
            }
        }
        return Promise.resolve();
    } catch (error) {
        console.error("Failed to parse or import data", error);
        return Promise.reject(new Error("Invalid backup file format."));
    }
};
