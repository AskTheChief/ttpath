
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
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
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
        console.warn('users.json not found. Returning sample data. Run `npm run convert-users` to generate it.');
        return [
            { firstName: 'John', lastName: 'Doe (Sample)', email: 'john.d@example.com', location: 'New York, USA', city: 'New York', state: 'NY', zip: '10001', country: 'USA', lat: 40.7128, lng: -74.0060 },
            { firstName: 'Jane', lastName: 'Smith (Sample)', email: 'jane.s@example.com', location: 'London, UK', city: 'London', state: '', zip: '', country: 'UK', lat: 51.5074, lng: -0.1278 },
        ];
    }

    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const usersFromFile = JSON.parse(jsonContent);

    const users = usersFromFile.map((user: any) => ({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      location: user.location,
      city: user.city,
      state: user.state,
      zip: user.zip,
      country: user.country,
      lat: user.lat,
      lng: user.lng,
    }));
    
    return users;
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
