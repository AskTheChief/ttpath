
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
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  // Retain all other fields as optional strings
  id: z.string().optional(),
  login_first: z.string().optional(),
  login_last: z.string().optional(),
  first: z.string().optional(),
  last: z.string().optional(),
  tribe: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  province: z.string().optional(),
  code: z.string().optional(),
  book_tt: z.string().optional(),
  book_g: z.string().optional(),
  attend_w: z.string().optional(),
  attend_3: z.string().optional(),
  attend_t: z.string().optional(),
  chief: z.string().optional(),
  faq_read: z.string().optional(),
  faq_write: z.string().optional(),
  wish_j: z.string().optional(),
  wish_w: z.string().optional(),
  wish_b: z.string().optional(),
  wish_p: z.string().optional(),
  reachouts: z.string().optional(),
  expansion_1: z.string().optional(),
  expansion_2: z.string().optional(),
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

    // Pass all user data through, ensuring it matches the schema
    return usersFromFile.map((user: any) => ({
      ...user, // Pass through all fields from the JSON
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

      // Manually add Jon Barry as a temporary measure
      const jonBarry: LegacyUser = {
          id: "manual_jon_barry_123",
          first: "Jon",
          last: "Barry",
          email: "jonathan@futurehouse.ai",
          phone: "8082143284",
          address: "1300 3rd Ave",
          reachouts: "0",
          firstName: "Jon",
          lastName: "Barry",
          location: "1300 3rd Ave",
      };
      
      if (!users.find(u => u.email === jonBarry.email)) {
          users.unshift(jonBarry);
      }
      
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
