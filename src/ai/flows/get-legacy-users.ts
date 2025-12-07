
'use server';

/**
 * @fileOverview A Genkit flow for retrieving user data from a pre-converted JSON file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}

const LegacyUserSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  location: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  // Add other fields as optional strings
  id: z.string().optional(),
  field_1: z.string().optional(),
  field_2: z.string().optional(),
  field_5: z.string().optional(),
  field_7: z.string().optional(),
  field_8: z.string().optional(),
  field_10: z.string().optional(),
});
export type LegacyUser = z.infer<typeof LegacyUserSchema>;

const GetLegacyUsersOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  users: z.array(LegacyUserSchema).optional(),
});
export type GetLegacyUsersOutput = z.infer<typeof GetLegacyUsersOutputSchema>;

// This function now reads from a pre-converted and geocoded JSON file.
async function getParsedUsers(): Promise<LegacyUser[]> {
    const jsonFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.json');
    
    if (!fs.existsSync(jsonFilePath)) {
        console.warn('users.json not found. Run `npm run convert-users` to generate it.');
        return [];
    }

    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const usersFromFile = JSON.parse(jsonContent);

    // No mapping needed if the JSON is already in the correct format
    return usersFromFile.map((user: any) => ({
      ...user, // Pass through all fields
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      location: user.location,
      address: user.address,
      city: user.city,
      state: user.state,
      zip: user.zip,
      country: user.country,
      phone: user.phone,
      lat: user.lat,
      lng: user.lng,
    }));
}


const getLegacyUsersFlow = ai.defineFlow(
  {
    name: 'getLegacyUsersFlow',
    outputSchema: GetLegacyUsersOutputSchema,
  },
  async () => {
    try {
      const users = await getParsedUsers();
      
      if (!users || users.length === 0) {
        return { success: false, message: "No users found in the data file or the file is empty." };
      }
      return { success: true, users };

    } catch (error: any) {
      console.error('Error processing legacy user data:', error);
      return { success: false, message: `An error occurred: ${error.message}` };
    }
  }
);


export async function getLegacyUsers(): Promise<GetLegacyUsersOutput> {
    return getLegacyUsersFlow();
}
