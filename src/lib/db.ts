import fs from 'fs/promises';
import path from 'path';
import type { User } from './types';

// IMPORTANT: This is a mock database using the file system.
// It is NOT suitable for production use, especially in serverless environments.
// It's used here to fulfill the prompt's requirement for file-system-based persistence.
const dbPath = path.join(process.cwd(), 'src', 'lib', 'user-data.json');

export async function getUserData(): Promise<User> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data) as User;
  } catch (error) {
    // If file doesn't exist or is invalid, return default state
    return {
      level: 'Visitor',
      completedRequirements: {},
    };
  }
}

export async function updateUserData(userData: User): Promise<void> {
  try {
    await fs.writeFile(dbPath, JSON.stringify(userData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write user data:', error);
    throw new Error('Could not update user data.');
  }
}
