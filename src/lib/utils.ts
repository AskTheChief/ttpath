import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const absoluteCenter = "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
