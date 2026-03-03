/**
 * Emergency Contact Service
 * Manages emergency contacts and panic messages
 */

import axios from 'axios';
import { apiConfig } from '@/config/api';
import { getAuthToken } from './authService';

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

    const response = await axios.post(
      `${apiConfig.baseURL}/api/emergency/add-contact`,
      { phone, name, relationship },
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
    let message = 'Failed to add emergency contact';
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.error || error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, error: message };
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
    let message = 'Failed to fetch emergency contacts';
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.error || error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, error: message };
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
    let message = 'Failed to remove emergency contact';
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.error || error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, error: message };
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
    let errorMessage = 'Failed to set panic message';
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.error || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
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
      return { success: true, data: response.data.data?.panicMessage };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to fetch panic message',
    };
  } catch (error) {
    let message = 'Failed to fetch panic message';
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.error || error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, error: message };
  }
}
