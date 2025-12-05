export interface Settings {
    backgroundRecording: {
        calculator: boolean;
        calendar: boolean;
        tracker: boolean;
    };
    abuseDetection: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    backgroundRecording: {
        calculator: true,
        calendar: true,
        tracker: true,
    },
    abuseDetection: true,
};
