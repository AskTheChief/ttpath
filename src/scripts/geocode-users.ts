
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const jsonFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.json');
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
    console.error('ERROR: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in your .env file.');
    process.exit(1);
}

type User = {
    firstName: string;
    lastName: string;
    email: string;
    location: string;
    country: string;
    lat?: number;
    lng?: number;
};

// Function to add a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeAddress(address: string): Promise<{ lat: number, lng: number } | null> {
    if (!address) {
        return null;
    }
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            return data.results[0].geometry.location; // { lat, lng }
        } else if (data.status === 'ZERO_RESULTS') {
            console.warn(`No results found for address: "${address}"`);
            return null;
        } else if (data.status === 'OVER_QUERY_LIMIT') {
            console.error('Geocoding API query limit reached. Please wait and try again, or check your billing status.');
            throw new Error('OVER_QUERY_LIMIT');
        } else {
            console.error(`Geocoding failed for address "${address}": ${data.status} - ${data.error_message || ''}`);
            return null;
        }
    } catch (error) {
        console.error(`An error occurred while geocoding: ${error}`);
        throw error;
    }
}

async function geocodeUsers() {
    console.log(`Reading users from: ${jsonFilePath}`);
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`Error: JSON file not found at ${jsonFilePath}`);
        process.exit(1);
    }

    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const users: User[] = JSON.parse(jsonContent);

    let updatedCount = 0;
    let skippedCount = 0;
    const geocodedUsers: User[] = [];

    for (let i = 0; i < users.length; i++) {
        const user = users[i];

        // Skip if user already has coordinates
        if (user.lat && user.lng) {
            skippedCount++;
            geocodedUsers.push(user);
            continue;
        }

        console.log(`Geocoding user ${i + 1}/${users.length}: ${user.email} (${user.location})`);
        
        try {
            const coords = await geocodeAddress(user.location);
            if (coords) {
                user.lat = coords.lat;
                user.lng = coords.lng;
                updatedCount++;
            }
            geocodedUsers.push(user);
            
            // Add a delay to avoid hitting rate limits
            await sleep(50); // ~20 requests per second

        } catch (error: any) {
            if (error.message === 'OVER_QUERY_LIMIT') {
                console.log('Stopping script due to query limit. Writing progress...');
                break; // Exit the loop but still save the progress made
            }
            // For other errors, we'll log them and continue
            geocodedUsers.push(user); // Add the user without coords
        }
    }
    
    console.log(`\nGeocoding complete.`);
    console.log(`- ${updatedCount} users were newly geocoded.`);
    console.log(`- ${skippedCount} users already had coordinates and were skipped.`);
    console.log(`- ${users.length - updatedCount - skippedCount} users could not be geocoded.`);

    console.log(`\nWriting updated data back to: ${jsonFilePath}`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(geocodedUsers, null, 2));

    console.log('Done!');
}

geocodeUsers().catch(err => {
    console.error('An unexpected error occurred during the geocoding process:', err);
    process.exit(1);
});
