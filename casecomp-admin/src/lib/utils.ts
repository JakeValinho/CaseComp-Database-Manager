import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Apply default values to missing fields in an object
 */
export function applyDefaults<T>(data: Partial<T>, defaults: Partial<T>): T {
  return { ...defaults, ...filterUndefined(data) } as T;
}

/**
 * Generate a timestamp for createdAt or updatedAt fields
 */
export function getNow(): string {
  return new Date().toISOString();
}

/**
 * Generate a UUID for ID fields
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Remove undefined values from an object
 */
export function filterUndefined<T>(obj: T): T {
  const result = { ...obj };

  Object.entries(result).forEach(([key, value]) => {
    if (value === undefined) {
      delete (result as any)[key];
    }
  });

  return result;
}

/**
 * Parse CSV or TSV string into array of objects
 */
export function parseDelimitedText(text: string, headers: string[]): Record<string, any>[] {
  if (!text.trim()) return [];

  // Split by lines and remove empty lines
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) return [];

  // Detect separator (tab or comma)
  const firstLine = lines[0];
  const separator = firstLine.includes('\t') ? '\t' : ',';

  // Parse each line into an array of values
  return lines.map(line => {
    const values = line.split(separator);
    const row: Record<string, any> = {};

    // Map values to headers
    headers.forEach((header, index) => {
      if (index < values.length) {
        const value = values[index].trim();
        // Handle empty strings
        row[header] = value === '' ? undefined : value;
      }
    });

    return row;
  });
}

/**
 * Validate a row against a schema
 */
export function validateRow<T>(
  row: any,
  requiredFields: (keyof T)[],
  typeValidations: { [K in keyof T]?: (value: any) => boolean } = {}
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  for (const field of requiredFields) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      errors.push(`Missing required field: ${String(field)}`);
    }
  }

  // Check type validations
  Object.entries(typeValidations).forEach(([field, validator]) => {
    if (row[field] !== undefined && row[field] !== null && validator && !validator(row[field])) {
      errors.push(`Invalid value for field: ${field}`);
    }
  });

  return { isValid: errors.length === 0, errors };
}

/**
 * Format a date as a string or return an empty string
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString();
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid date
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: any): boolean {
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'string') return !isNaN(Number(value));
  return false;
}

/**
 * Check if a value is a valid boolean
 */
export function isValidBoolean(value: any): boolean {
  return typeof value === 'boolean' || value === 'true' || value === 'false';
}

/**
 * Convert a value to a boolean
 */
export function toBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return !!value;
}

/**
 * Convert a value to a number
 */
export function toNumber(value: any): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}
