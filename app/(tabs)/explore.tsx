import { Collapsible } from '@/components/Collapsible';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type CountryCode = 'UG' | 'KE' | 'TZ' | 'RW' | 'BI' | 'SS';

interface SupportInfo {
  name: string;
  flag: string;
  helplines?: Array<{ name: string; number: string; tollFree?: boolean }>;
  message?: string;
}

const SUPPORT_DATA: Record<CountryCode, SupportInfo> = {
  UG: {
    name: 'Uganda',
    flag: '🇺🇬',
    helplines: [
      { name: 'UNHCR FRRM Helpline', number: '0800323232', tollFree: true },
      { name: 'Uganda Police', number: '0800199195', tollFree: true },
    ],
  },
  KE: {
    name: 'Kenya',
    flag: '🇰🇪',
    message: 'Support information for Kenya is coming soon.',
  },
  TZ: {
    name: 'Tanzania',
    flag: '🇹🇿',
    message: 'Support information for Tanzania is coming soon.',
  },
  RW: {
    name: 'Rwanda',
    flag: '🇷🇼',
    message: 'Support information for Rwanda is coming soon.',
  },
  BI: {
    name: 'Burundi',
    flag: '🇧🇮',
    message: 'Support information for Burundi is coming soon.',
  },
  SS: {
    name: 'South Sudan',
    flag: '🇸🇸',
    message: 'Support information for South Sudan is coming soon.',
  },
};

export default function ExploreScreen() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);

  const handleSupportPress = (country: CountryCode) => {
    setSelectedCountry(country);
  };

  const handleCallPress = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const closeModal = () => {
    setSelectedCountry(null);
  };

  const supportInfo = selectedCountry ? SUPPORT_DATA[selectedCountry] : null;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="globe"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explore</ThemedText>
      </ThemedView>

      {/* Apps Section */}
      <Collapsible title="Apps" defaultOpen={true}>
        <ThemedText style={styles.sectionDescription}>
          Discreet tools designed for your safety.
        </ThemedText>

        <View style={styles.appsGrid}>
          <TouchableOpacity
            style={styles.appIconButton}
            onPress={() => router.push('/fake-calculator')}
          >
            <Text style={styles.appEmoji}>🔢</Text>
            <Text style={styles.appLabel}>Calculator</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.appIconButton, styles.disabledIconButton]}
            onPress={() => Alert.alert('Coming Soon', 'Fake Calendar is under development.')}
          >
            <Text style={styles.appEmojiDisabled}>📅</Text>
            <Text style={styles.appLabelDisabled}>Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.appIconButton, styles.disabledIconButton]}
            onPress={() => Alert.alert('Coming Soon', 'Menstruation Tracker is under development.')}
          >
            <Text style={styles.appEmojiDisabled}>🩸</Text>
            <Text style={styles.appLabelDisabled}>Tracker</Text>
          </TouchableOpacity>
        </View>
      </Collapsible>

      {/* Support Section */}
      <Collapsible title="Support & Helplines">
        <ThemedText style={styles.sectionDescription}>
          Select your country for local support resources.
        </ThemedText>

        <View style={styles.flagsGrid}>
          {(Object.keys(SUPPORT_DATA) as CountryCode[]).map((countryCode) => (
            <TouchableOpacity
              key={countryCode}
              style={styles.flagButton}
              onPress={() => handleSupportPress(countryCode)}
            >
              <Text style={styles.flagText}>{SUPPORT_DATA[countryCode].flag}</Text>
              <ThemedText type="defaultSemiBold" style={styles.countryName}>
                {SUPPORT_DATA[countryCode].name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedView style={styles.ussdContainer}>
          <ThemedText type="defaultSemiBold">USSD Codes</ThemedText>
          <ThemedText>Coming soon...</ThemedText>
        </ThemedView>
      </Collapsible>

      {/* Who We Are Section */}
      <Collapsible title="Who We Are">
        <ThemedText>
          SafeGirls is dedicated to providing discreet, accessible safety tools and resources for women. Our mission is to empower you with technology that protects and supports you in any situation.
        </ThemedText>
        <ThemedText style={{ marginTop: 10 }}>
          We believe in privacy, security, and the right to safety for everyone.
        </ThemedText>
      </Collapsible>

      {/* Support Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={selectedCountry !== null}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {supportInfo && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalFlag}>{supportInfo.flag}</Text>
                  <Text style={styles.modalTitle}>{supportInfo.name} Support</Text>
                </View>

                {supportInfo.helplines ? (
                  <View style={styles.helplinesContainer}>
                    {supportInfo.helplines.map((helpline, index) => (
                      <View key={index} style={styles.helplineItem}>
                        <Text style={styles.helplineName}>{helpline.name}</Text>
                        <TouchableOpacity
                          style={styles.phoneButton}
                          onPress={() => handleCallPress(helpline.number)}
                        >
                          <IconSymbol name="phone.fill" size={18} color="#fff" />
                          <Text style={styles.phoneNumber}>{helpline.number}</Text>
                        </TouchableOpacity>
                        {helpline.tollFree && (
                          <Text style={styles.tollFreeLabel}>Toll-free</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.comingSoonText}>{supportInfo.message}</Text>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.8,
  },
  appsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  appIconButton: {
    flex: 1,
    maxWidth: 90,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    gap: 4,
    marginHorizontal: 4,
  },
  disabledIconButton: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderColor: '#D1D5DB',
  },
  appEmoji: {
    fontSize: 32,
  },
  appEmojiDisabled: {
    fontSize: 32,
    opacity: 0.5,
  },
  appLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  appLabelDisabled: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  flagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
    marginVertical: 16,
  },
  flagButton: {
    alignItems: 'center',
    gap: 8,
    width: '28%',
  },
  flagText: {
    fontSize: 40,
  },
  countryName: {
    fontSize: 12,
    textAlign: 'center',
  },
  ussdContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalFlag: {
    fontSize: 60,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  helplinesContainer: {
    gap: 20,
    marginBottom: 24,
  },
  helplineItem: {
    gap: 8,
  },
  helplineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#8B5CF6',
    padding: 12,
    borderRadius: 12,
  },
  phoneNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tollFreeLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 20,
  },
  closeButton: {
    backgroundColor: '#8B5CF6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
