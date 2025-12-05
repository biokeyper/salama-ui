import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'user_pin';

/**
 * Set a new PIN
 */
export async function setPin(pin: string): Promise<boolean> {
    try {
        if (!/^\d{4,6}$/.test(pin)) {
            throw new Error('PIN must be 4-6 digits');
        }
        await SecureStore.setItemAsync(PIN_KEY, pin);
        return true;
    } catch (error) {
        console.error('Error setting PIN:', error);
        return false;
    }
}

/**
 * Verify if the provided PIN matches the stored PIN
 */
export async function verifyPin(pin: string): Promise<boolean> {
    try {
        const storedPin = await SecureStore.getItemAsync(PIN_KEY);
        return storedPin === pin;
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return false;
    }
}

/**
 * Check if a PIN has been set
 */
export async function hasPin(): Promise<boolean> {
    try {
        const pin = await SecureStore.getItemAsync(PIN_KEY);
        return pin !== null;
    } catch (error) {
        console.error('Error checking PIN:', error);
        return false;
    }
}

/**
 * Remove the stored PIN
 */
export async function removePin(): Promise<boolean> {
    try {
        await SecureStore.deleteItemAsync(PIN_KEY);
        return true;
    } catch (error) {
        console.error('Error removing PIN:', error);
        return false;
    }
}
