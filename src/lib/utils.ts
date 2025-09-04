import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates a character name based on length and allowed characters.
 * @param name The name to validate.
 * @returns True if the name is valid, false otherwise.
 */
export function isValidName(name: string): boolean {
  if (name.length < 3 || name.length > 16) {
    return false;
  }
  const regex = /^[a-zA-Z0-9]+$/;
  return regex.test(name);
}
