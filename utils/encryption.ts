/**
 * Encryption Utilities
 * Uses TweetNaCl (libsodium) for ChaCha20-Poly1305 encryption
 * Keys are stored securely in expo-secure-store
 */

import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';

const ENCRYPTION_KEY_ID = 'salama_encryption_key';
const KEY_SIZE = 32; // 32 bytes for ChaCha20

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Get or create encryption key
 * The key is generated once and stored securely in device's secure storage
 */
export async function getOrCreateEncryptionKey(): Promise<Uint8Array> {
  try {
    const existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
    if (existingKey) {
      return hexToBytes(existingKey);
    }

    // Generate new key
    const newKey = nacl.randomBytes(KEY_SIZE);
    const keyHex = bytesToHex(newKey);
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, keyHex);
    return newKey;
  } catch (error) {
    console.error('Error managing encryption key:', error);
    throw new Error('Failed to manage encryption key');
  }
}

/**
 * Encrypt data using ChaCha20-Poly1305
 * Returns encrypted payload as hex string containing nonce + ciphertext
 */
export async function encryptReport(data: object): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const plaintext = JSON.stringify(data);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // Generate random nonce (24 bytes for ChaCha20-Poly1305)
    const nonce = nacl.randomBytes(24);

    // Encrypt
    const ciphertext = nacl.secretbox(plaintextBytes, nonce, key);

    if (!ciphertext) {
      throw new Error('Encryption failed');
    }

    // Return nonce + ciphertext as hex
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);

    return bytesToHex(combined);
  } catch (error) {
    console.error('Error encrypting report:', error);
    throw new Error('Failed to encrypt report');
  }
}

/**
 * Decrypt data using ChaCha20-Poly1305
 */
export async function decryptReport(encryptedHex: string): Promise<object> {
  try {
    const key = await getOrCreateEncryptionKey();
    const combined = hexToBytes(encryptedHex);

    // Split nonce and ciphertext
    const nonceLength = 24;
    const nonce = combined.slice(0, nonceLength);
    const ciphertext = combined.slice(nonceLength);

    // Decrypt
    const plaintext = nacl.secretbox.open(ciphertext, nonce, key);

    if (!plaintext) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }

    const decryptedText = new TextDecoder().decode(plaintext);
    return JSON.parse(decryptedText);
  } catch (error) {
    console.error('Error decrypting report:', error);
    throw new Error('Failed to decrypt report');
  }
}
