/**
 * Country Picker Component
 * Tap to open modal with searchable country list
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Country, COUNTRIES } from '@/utils/countries';

interface CountryPickerProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

export function CountryPicker({ selectedCountry, onSelectCountry }: CountryPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(searchText.toLowerCase()) ||
    country.code.includes(searchText) ||
    country.code.replace('+', '').includes(searchText)
  );

  const handleSelectCountry = (country: Country) => {
    onSelectCountry(country);
    setShowModal(false);
    setSearchText('');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowModal(true)}
      >
        <ThemedText style={styles.flagText}>{selectedCountry.flag}</ThemedText>
        <ThemedText style={styles.countryName}>{selectedCountry.name}</ThemedText>
        <ThemedText style={styles.chevron}>›</ThemedText>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowModal(false);
          setSearchText('');
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowModal(false); setSearchText(''); }}>
              <ThemedText style={styles.closeButton}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Select Country</ThemedText>
            <View style={{ width: 60 }} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search country..."
            placeholderTextColor="#aaa"
            value={searchText}
            onChangeText={setSearchText}
          />

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => `${item.code}-${item.name}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryRow}
                onPress={() => handleSelectCountry(item)}
              >
                <ThemedText style={styles.rowFlag}>{item.flag}</ThemedText>
                <View style={styles.rowContent}>
                  <ThemedText style={styles.rowName}>{item.name}</ThemedText>
                  <ThemedText style={styles.rowCode}>{item.code}</ThemedText>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={true}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#8A4FFF',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#faf8ff',
  },
  flagText: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    color: '#8A4FFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    color: '#8A4FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  searchInput: {
    borderColor: '#8A4FFF',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#faf8ff',
    color: '#222',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
  },
  rowCode: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});
