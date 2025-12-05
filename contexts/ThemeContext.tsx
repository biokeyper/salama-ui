import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'auto';
type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
    themeMode: ThemeMode;
    colorScheme: ColorScheme;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@salama_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useSystemColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

    // Load saved theme preference
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'auto')) {
                    setThemeModeState(savedTheme as ThemeMode);
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            }
        };
        loadTheme();
    }, []);

    const setThemeMode = async (mode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            setThemeModeState(mode);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    // Determine actual color scheme based on mode
    const colorScheme: ColorScheme =
        themeMode === 'auto'
            ? (systemColorScheme ?? 'light')
            : themeMode;

    return (
        <ThemeContext.Provider value={{ themeMode, colorScheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
