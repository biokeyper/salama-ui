/**
 * Country Code Search Field
 * Searchable country code input with inline dropdown
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Country, COUNTRIES } from '@/utils/countries';

interface CountryCodeSearchFieldProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

export function CountryCodeSearchField({
  selectedCountry,
  onSelectCountry,
}: CountryCodeSearchFieldProps) {
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchText.toLowerCase()) ||
      country.code.includes(searchText) ||
      country.code.replace('+', '').includes(searchText)
  );

  const handleSelectCountry = (country: Country) => {
    onSelectCountry(country);
    setSearchText('');
    setShowDropdown(false);
  };

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Search country (e.g., Uganda, +256, 256)"
        placeholderTextColor="#aaa"
        value={searchText}
        onChangeText={setSearchText}
        onFocus={() => setShowDropdown(true)}
        keyboardType="default"
      />

      {showDropdown && searchText && (
        <View style={styles.dropdown}>
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => `${item.code}-${item.name}`}
            scrollEnabled={filteredCountries.length > 5}
            nestedScrollEnabled={true}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleSelectCountry(item)}
              >
                <ThemedText style={styles.itemFlag}>{item.flag}</ThemedText>
                <View style={styles.itemContent}>
                  <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                  <ThemedText style={styles.itemCode}>{item.code}</ThemedText>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {!searchText && (
        <View style={styles.selectedDisplay}>
          <ThemedText style={styles.selectedText}>
            {selectedCountry.flag} {selectedCountry.name} • {selectedCountry.code}
          </ThemedText>
        </View>
      )}

      {showDropdown && !searchText && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setShowDropdown(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderColor: '#8A4FFF',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#faf8ff',
    color: '#222',
  },
  dropdown: {
    borderColor: '#8A4FFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: '#fff',
    marginTop: -16,
    marginBottom: 16,
    maxHeight: 200,
    zIndex: 1000,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemFlag: {
    fontSize: 18,
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  itemCode: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  selectedDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedText: {
    fontSize: 14,
    color: '#8A4FFF',
    fontWeight: '500',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
