
'use server';

/**
 * @fileOverview A Genkit flow for retrieving user data from a pre-converted JSON file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as fs from 'fs';
import * as path from 'path';

const LegacyUserSchema = z.object({
  name: z.string(),
  email: z.string(),
  location: z.string(),
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

// This function now reads from a pre-converted JSON file.
async function getParsedUsers(): Promise<LegacyUser[]> {
    const jsonFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.json');
    
    // In a real app, you would run the conversion script in your build process.
    // For now, we assume it exists. If not, we fall back to sample data.
    if (!fs.existsSync(jsonFilePath)) {
        console.warn('users.json not found. Returning sample data. Run `npm run convert-users` to generate it.');
        return [
            { name: 'John Doe (Sample)', email: 'john.d@example.com', location: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
            { name: 'Jane Smith (Sample)', email: 'jane.s@example.com', location: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
        ];
    }

    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const users: LegacyUser[] = JSON.parse(jsonContent);

    // **Simulated Geocoding for demonstration**
    // In a real application, you'd do this in the conversion script and save the results.
    const geocodedUsers = users.map(user => {
        if (user.email === 'john.d@example.com') return { ...user, lat: 40.7128, lng: -74.0060 };
        if (user.email === 'jane.s@example.com') return { ...user, lat: 51.5074, lng: -0.1278 };
        if (user.email === 'carlos.r@example.com') return { ...user, lat: 40.4168, lng: -3.7038 };
        if (user.email === 'mei.l@example.com') return { ...user, lat: 31.2304, lng: 121.4737 };
        if (user.email === 'frank.m@example.com') return { ...user, lat: 52.5200, lng: 13.4050 };
        return user;
    });

    return geocodedUsers;
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

      return { success: true, users: users };

    } catch (error: any) {
      console.error('Error processing legacy user data:', error);
      return { success: false, message: `An error occurred: ${error.message}` };
    }
  }
);


export async function getLegacyUsers(): Promise<GetLegacyUsersOutput> {
    return getLegacyUsersFlow();
}
