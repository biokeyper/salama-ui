import { hasPin } from '@/services/security';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface PinProtectionContextType {
    isPinSet: boolean;
    checkPinStatus: () => Promise<void>;
    isLoading: boolean;
}

const PinProtectionContext = createContext<PinProtectionContextType | undefined>(undefined);

export function PinProtectionProvider({ children }: { children: React.ReactNode }) {
    const [isPinSet, setIsPinSet] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const checkPinStatus = async () => {
        try {
            const pinExists = await hasPin();
            setIsPinSet(pinExists);
        } catch (error) {
            console.error('Error checking PIN status:', error);
            setIsPinSet(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkPinStatus();
    }, []);

    return (
        <PinProtectionContext.Provider value={{ isPinSet, checkPinStatus, isLoading }}>
            {children}
        </PinProtectionContext.Provider>
    );
}

export function usePinProtection() {
    const context = useContext(PinProtectionContext);
    if (context === undefined) {
        throw new Error('usePinProtection must be used within a PinProtectionProvider');
    }
    return context;
}
