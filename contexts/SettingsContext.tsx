import { DEFAULT_SETTINGS, Settings } from '@/types/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const SETTINGS_STORAGE_KEY = '@salama_settings';

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    resetSettings: () => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<Settings>) => {
        try {
            const updated = {
                ...settings,
                ...newSettings,
                // Handle nested backgroundRecording object
                backgroundRecording: {
                    ...settings.backgroundRecording,
                    ...(newSettings.backgroundRecording || {}),
                },
            };

            await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
            setSettings(updated);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    };

    const resetSettings = async () => {
        try {
            await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
            setSettings(DEFAULT_SETTINGS);
        } catch (error) {
            console.error('Error resetting settings:', error);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
}
