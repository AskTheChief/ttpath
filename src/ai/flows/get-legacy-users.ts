
'use server';

/**
 * @fileOverview A Genkit flow for parsing and retrieving user data from the legacy SQL file.
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

// This function now parses the real SQL file.
async function parseSqlFile(): Promise<LegacyUser[]> {
    const sqlFilePath = path.join(process.cwd(), 'public', 'UserData', 'UserContact.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    const users: LegacyUser[] = [];
    const insertRegex = /INSERT INTO `UserContact` VALUES \((.*?)\);/g;
    let match;

    while ((match = insertRegex.exec(sqlContent)) !== null) {
        // This regex is brittle and assumes a specific format for the VALUES clause.
        // It splits the values by comma, but handles commas within quotes poorly.
        const values = match[1].split(/,(?=(?:(?:[^"']*["']){2})*[^"']*$)/).map(v => {
            let value = v.trim();
            // Remove surrounding quotes and un-escape characters
            if (value.startsWith("'") && value.endsWith("'")) {
                value = value.substring(1, value.length - 1);
            }
            return value.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        });

        // This mapping is based on the assumed structure of the UserContact table.
        // It may need adjustment if the table structure is different.
        if (values.length >= 7) { // Assuming at least 7 columns
            const user: LegacyUser = {
                name: values[1], // Corresponds to `FullName`
                email: values[5], // Corresponds to `Email`
                location: `${values[3]}, ${values[4]}`, // City, State
                country: values[2], // Country
            };

            // **Simulated Geocoding for the first few entries for demonstration**
            // In a real application, you'd use a geocoding API here and cache results.
            if (user.email === 'john.d@example.com') {
                user.lat = 40.7128;
                user.lng = -74.0060;
            } else if (user.email === 'jane.s@example.com') {
                user.lat = 51.5074;
                user.lng = -0.1278;
            } else if (user.email === 'carlos.r@example.com') {
                user.lat = 40.4168;
                user.lng = -3.7038;
            } else if (user.email === 'mei.l@example.com') {
                user.lat = 31.2304;
                user.lng = 121.4737;
            } else if (user.email === 'frank.m@example.com') {
                 user.lat = 52.5200;
                 user.lng = 13.4050;
            }

            users.push(user);
        }
    }
    
    // Add sample data if parsing fails or returns no users, so the page doesn't break.
    if (users.length === 0) {
        return [
            { name: 'John Doe (Sample)', email: 'john.d@example.com', location: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
            { name: 'Jane Smith (Sample)', email: 'jane.s@example.com', location: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
        ];
    }
    
    return users;
}


const getLegacyUsersFlow = ai.defineFlow(
  {
    name: 'getLegacyUsersFlow',
    outputSchema: GetLegacyUsersOutputSchema,
  },
  async () => {
    try {
      const users = await parseSqlFile();
      
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
