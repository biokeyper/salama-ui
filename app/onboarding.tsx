import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
    {
        title: "You Are In Control",
        text: "You are in control of what you choose to share. Your safety and comfort are our top priority throughout this process.",
        icon: "shield-checkmark-outline"
    },
    {
        title: "Your Choices Matter",
        text: "You can skip any question that makes you uncomfortable. There are no wrong answers here - only what you feel ready to share.",
        icon: "heart-outline"
    },
    {
        title: "Safety First",
        text: "Remember, your safety comes first. At any time, you can exit discreetly using the emergency button.",
        icon: "lock-closed-outline"
    }
];

const TypewriterText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');
    const indexRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setDisplayedText('');
        indexRef.current = 0;

        const typeNextChar = () => {
            if (indexRef.current < text.length) {
                setDisplayedText((prev) => prev + text.charAt(indexRef.current));
                indexRef.current += 1;
                timerRef.current = setTimeout(typeNextChar, 30); // Typing speed
            } else {
                if (onComplete) onComplete();
            }
        };

        timerRef.current = setTimeout(typeNextChar, 50);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [text]);

    return <ThemedText style={styles.description}>{displayedText}</ThemedText>;
};

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const router = useRouter();

    const handleNext = () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            router.replace('/(tabs)');
        } catch (error) {
            router.replace('/(tabs)');
        }
    };

    const currentItem = ONBOARDING_DATA[currentIndex];

    return (
        <ThemedView style={styles.container}>
            <View style={styles.contentContainer}>
                <Animated.View
                    key={`icon-${currentIndex}`}
                    entering={FadeIn.duration(500)}
                    exiting={FadeOut.duration(200)}
                    style={styles.iconContainer}
                >
                    <Ionicons name={currentItem.icon as any} size={100} color="#8A4FFF" />
                </Animated.View>

                <Animated.View
                    key={`title-${currentIndex}`}
                    entering={FadeIn.delay(200).duration(500)}
                    style={styles.textContainer}
                >
                    <ThemedText type="title" style={styles.title}>{currentItem.title}</ThemedText>
                    <View style={styles.descriptionContainer}>
                        <TypewriterText text={currentItem.text} />
                    </View>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {ONBOARDING_DATA.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentIndex === index && styles.activeDot
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <ThemedText style={styles.buttonText}>
                        {currentIndex === ONBOARDING_DATA.length - 1 ? "Get Started" : "Next"}
                    </ThemedText>
                    <Ionicons
                        name={currentIndex === ONBOARDING_DATA.length - 1 ? "checkmark" : "arrow-forward"}
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    iconContainer: {
        marginBottom: 40,
        padding: 20,
        backgroundColor: 'rgba(138, 79, 255, 0.1)',
        borderRadius: 100,
    },
    textContainer: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 28,
        marginBottom: 20,
        textAlign: 'center',
        color: '#8A4FFF',
    },
    descriptionContainer: {
        minHeight: 100, // Reserve space for text to prevent jumping
        width: '100%',
        paddingHorizontal: 20,
    },
    description: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 28,
        color: '#666',
    },
    footer: {
        marginBottom: 40,
        gap: 30,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
    },
    activeDot: {
        width: 24,
        backgroundColor: '#8A4FFF',
    },
    button: {
        backgroundColor: '#8A4FFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
        shadowColor: '#8A4FFF',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});
