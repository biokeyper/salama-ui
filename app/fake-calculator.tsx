import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

const buttons = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '=', '+'],
];

export default function FakeCalculatorScreen() {
  const [display, setDisplay] = useState('');

  const handlePress = (value: string) => {
    if (value === '=') {
      try {
        // Evaluate the expression (very basic, not for real calculator use)
        // eslint-disable-next-line no-eval
        const result = eval(display);
        setDisplay(String(result));
      } catch {
        setDisplay('Error');
      }
    } else {
      setDisplay(display + value);
    }
  };

  const handleClear = () => setDisplay('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.displayContainer}>
          <Text style={styles.displayText}>{display || '0'}</Text>
        </View>
        <View style={styles.buttonsContainer}>
          {buttons.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.buttonRow}>
              {row.map((btn) => (
                <TouchableOpacity
                  key={btn}
                  style={styles.button}
                  onPress={() => handlePress(btn)}
                >
                  <Text style={styles.buttonText}>{btn}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClear}>
            <Text style={styles.buttonText}>C</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  displayContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'flex-end',
    minHeight: 60,
    justifyContent: 'center',
  },
  displayText: {
    fontSize: 32,
    color: '#333',
  },
  buttonsContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    minWidth: 60,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    marginTop: 10,
    alignSelf: 'center',
    minWidth: 260,
  },
  buttonText: {
    fontSize: 22,
    color: '#222',
    fontWeight: 'bold',
  },
});