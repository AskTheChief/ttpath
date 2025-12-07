
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
    // If not, we fall back to sample data.
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
        if (user.email.trim().toLowerCase() === 'tt_95@yahoo.com') return { ...user, lat: 30.19, lng: -97.82 };
        if (user.email.trim().toLowerCase() === 'alex@haascrea.com') return { ...user, lat: 40.75, lng: -73.98 };
        if (user.email.trim().toLowerCase() === 'tradethesun@gmail.com') return { ...user, lat: 40.77, lng: -73.95 };
        if (user.email.trim().toLowerCase() === 'mike.melissinos@gmail.com') return { ...user, lat: 40.71, lng: -74.01 };
        if (user.email.trim().toLowerCase() === 'rideyourwinners@gmail.com') return { ...user, lat: 47.54, lng: -122.75 };
        if (user.email.trim().toLowerCase() === 'crdenapoles@gmail.com') return { ...user, lat: 30.43, lng: -87.21 };

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
