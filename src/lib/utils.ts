import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API Base URL - uses environment variable or falls back to localhost
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
