/**
 * Countries with country codes, flags, and phone number lengths
 */

export interface Country {
  name: string;
  code: string;
  flag: string;
  phoneLength: number; // Expected number of digits after country code
}

export const COUNTRIES: Country[] = [
  { name: 'Kenya', code: '+254', flag: '🇰🇪', phoneLength: 9 },
  { name: 'Uganda', code: '+256', flag: '🇺🇬', phoneLength: 9 },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿', phoneLength: 9 },
  { name: 'Ethiopia', code: '+251', flag: '🇪🇹', phoneLength: 9 },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼', phoneLength: 9 },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬', phoneLength: 10 },
  { name: 'South Africa', code: '+27', flag: '🇿🇦', phoneLength: 9 },
  { name: 'Ghana', code: '+233', flag: '🇬🇭', phoneLength: 9 },
  { name: 'Botswana', code: '+267', flag: '🇧🇼', phoneLength: 8 },
  { name: 'Cameroon', code: '+237', flag: '🇨🇲', phoneLength: 9 },
  { name: 'Malawi', code: '+265', flag: '🇲🇼', phoneLength: 9 },
  { name: 'Zambia', code: '+260', flag: '🇿🇲', phoneLength: 9 },
  { name: 'Zimbabwe', code: '+263', flag: '🇿🇼', phoneLength: 9 },
  { name: 'Mozambique', code: '+258', flag: '🇲🇿', phoneLength: 9 },
  { name: 'Egypt', code: '+20', flag: '🇪🇬', phoneLength: 10 },
  { name: 'Morocco', code: '+212', flag: '🇲🇦', phoneLength: 9 },
  { name: 'United States', code: '+1', flag: '🇺🇸', phoneLength: 10 },
  { name: 'Canada', code: '+1', flag: '🇨🇦', phoneLength: 10 },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', phoneLength: 10 },
  { name: 'India', code: '+91', flag: '🇮🇳', phoneLength: 10 },
];

/**
 * Get country by country code
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

/**
 * Normalize phone number with country code
 * Takes country code and phone number and returns formatted number
 */
export function normalizePhoneNumber(countryCode: string, phoneNumber: string): string {
  // Remove any spaces, dashes, or special characters from phone number
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  // Return combined country code + phone number
  return `${countryCode}${cleanPhone}`;
}

/**
 * Validate phone number length for a given country
 */
export function isValidPhoneLength(countryCode: string, phoneNumber: string): boolean {
  const country = getCountryByCode(countryCode);
  if (!country) return false;

  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  return cleanPhone.length === country.phoneLength;
}

/**
 * Get phone number length for a country
 */
export function getPhoneLength(countryCode: string): number {
  const country = getCountryByCode(countryCode);
  return country?.phoneLength || 10;
}
