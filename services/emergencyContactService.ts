/**
 * Emergency Contact Service
 * Manages emergency contacts and panic messages
 */

import axios from 'axios';
import { apiConfig } from '@/config/api';
import { getAuthToken } from './authService';
import { extractErrorMessage } from '@/utils/errorExtractor';

export interface EmergencyContact {
  contactId: number;
  phone: string;
  name: string;
  relationship: string;
  isActive: boolean;
}

/**
 * Add an emergency contact
 */
export async function addEmergencyContact(
  phone: string,
  name: string,
  relationship: string
): Promise<{ success: boolean; data?: EmergencyContact; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const payload = { phone, name, relationship, isActive: true };

    const response = await axios.post(
      `${apiConfig.baseURL}/api/emergency/add-contact`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );


    if (response.status === 200 || response.status === 201) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to add emergency contact',
    };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Failed to add emergency contact') };
  }
}

/**
 * Get all emergency contacts
 */
export async function getEmergencyContacts(): Promise<{
  success: boolean;
  data?: EmergencyContact[];
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.get(`${apiConfig.baseURL}/api/emergency/contacts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      return { success: true, data: response.data.data?.contacts || [] };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to fetch emergency contacts',
    };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Failed to fetch emergency contacts') };
  }
}

/**
 * Remove an emergency contact
 */
export async function removeEmergencyContact(
  contactId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.delete(
      `${apiConfig.baseURL}/api/emergency/remove-contact/${contactId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to remove emergency contact',
    };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Failed to remove emergency contact') };
  }
}

/**
 * Edit an emergency contact
 */
export async function editEmergencyContact(
  contactId: number,
  updates: { phone?: string; name?: string; relationship?: string }
): Promise<{ success: boolean; data?: EmergencyContact; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.put(
      `${apiConfig.baseURL}/api/emergency/edit-contact/${contactId}`,
      updates,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );


    if (response.status === 200) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to edit emergency contact',
    };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Failed to edit emergency contact') };
  }
}

/**
 * Set custom panic message
 * Backend returns the saved message in response
 */
export async function setPanicMessage(message: string): Promise<{
  success: boolean;
  data?: { panicMessage: string };
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}/api/emergency/set-panic-message`,
      { message },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        data: {
          panicMessage: response.data.data?.panicMessage || message,
        },
      };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to set panic message',
    };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Failed to set panic message') };
  }
}

/**
 * Get current panic message
 */
export async function getPanicMessage(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.get(
      `${apiConfig.baseURL}/api/emergency/panic-message`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      const panicMessage = response.data.data?.panicMessage;
      return { success: true, data: panicMessage };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to fetch panic message',
    };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Failed to fetch panic message') };
  }
}
