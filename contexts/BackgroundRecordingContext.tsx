import React, { createContext, useContext, useState } from 'react';

interface BackgroundRecordingContextType {
    isInDecoyMode: boolean;
    enterDecoyMode: () => void;
    exitDecoyMode: () => void;
    backgroundRecordingUri: string | null;
    setBackgroundRecordingUri: (uri: string | null) => void;
}

const BackgroundRecordingContext = createContext<BackgroundRecordingContextType | undefined>(undefined);

export function BackgroundRecordingProvider({ children }: { children: React.ReactNode }) {
    const [isInDecoyMode, setIsInDecoyMode] = useState(false);
    const [backgroundRecordingUri, setBackgroundRecordingUri] = useState<string | null>(null);

    const enterDecoyMode = () => {
        setIsInDecoyMode(true);
    };

    const exitDecoyMode = () => {
        setIsInDecoyMode(false);
    };

    return (
        <BackgroundRecordingContext.Provider
            value={{
                isInDecoyMode,
                enterDecoyMode,
                exitDecoyMode,
                backgroundRecordingUri,
                setBackgroundRecordingUri,
            }}
        >
            {children}
        </BackgroundRecordingContext.Provider>
    );
}

export function useBackgroundRecording() {
    const context = useContext(BackgroundRecordingContext);
    if (context === undefined) {
        throw new Error('useBackgroundRecording must be used within a BackgroundRecordingProvider');
    }
    return context;
}
