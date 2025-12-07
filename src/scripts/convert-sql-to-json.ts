
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const csvFilePath = path.join(process.cwd(), 'public', 'UserData', 'OldUsers.csv');
const jsonFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.json');
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
    console.error('ERROR: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in your .env file.');
    process.exit(1);
}


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


// Function to split full name into first and last name
function splitName(firstName: string, lastName: string): { firstName: string, lastName:string } {
    if (firstName && !lastName) {
        const nameParts = firstName.trim().split(/\s+/);
        if (nameParts.length > 1) {
            const last = nameParts.pop() || '';
            const first = nameParts.join(' ');
            return { firstName: first, lastName: last };
        }
    }
    return { firstName: firstName || '', lastName: lastName || '' };
}

// Function to normalize and combine address parts into a single location string for display
function createFullLocationString(address: string, city: string, state: string, zip: string, country: string): string {
    const parts = [address, city, state, zip, country];
    
    const cleanedParts = parts.map(part => 
        (part || '')
            .trim()
            .replace(/city:|state:|country:|address:|zip:/gi, '')
            .replace(/[~!*();?#@&=+$%^]/g, '')
            .trim()
    ).filter(Boolean);

    const uniqueParts = [];
    const seenParts = new Set();
    for (let i = cleanedParts.length - 1; i >= 0; i--) {
        const part = cleanedParts[i];
        const partLower = part.toLowerCase();
        let isRedundant = false;
        for (const seen of seenParts) {
            if ((seen as string).includes(partLower)) {
                isRedundant = true;
                break;
            }
        }
        if (!isRedundant) {
            uniqueParts.unshift(part);
            seenParts.add(partLower);
        }
    }
    
    return uniqueParts.join(', ');
}


async function convertAndGeocode() {
  console.log(`Reading CSV file from: ${csvFilePath}`);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: CSV file not found at ${csvFilePath}`);
    console.error('Please ensure the CSV file exists and the path is correct.');
    process.exit(1);
  }
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const header = Object.keys(records[0] || {}).map(h => h.trim());
  const firstNameKey = header.find(h => h.toLowerCase().includes('first name'));
  const lastNameKey = header.find(h => h.toLowerCase().includes('last name'));
  const emailKey = header.find(h => h.toLowerCase().includes('email'));
  const addressKey = header.find(h => h.toLowerCase().includes('address'));
  const cityKey = header.find(h => h.toLowerCase().includes('city'));
  const stateKey = header.find(h => h.toLowerCase().includes('state'));
  const zipKey = header.find(h => h.toLowerCase().includes('zip'));
  const countryKey = header.find(h => h.toLowerCase().includes('country'));

  if (!firstNameKey || !emailKey) {
      console.error('Could not find "First Name" and "Email" columns in the CSV file. Please check the header row.');
      console.log('Found headers:', header);
      process.exit(1);
  }

  const processedRecords = records.map(record => {
      const { firstName, lastName } = splitName(record[firstNameKey] || '', lastNameKey ? record[lastNameKey] : '');
      const address = addressKey ? record[addressKey] : '';
      const city = cityKey ? record[cityKey] : '';
      const state = stateKey ? record[stateKey] : '';
      const zip = zipKey ? record[zipKey] : '';
      const country = countryKey ? record[countryKey] : '';
      
      return {
          firstName,
          lastName,
          email: record[emailKey] || '',
          location: createFullLocationString(address, city, state, zip, country),
          city: city,
          state: state,
          zip: zip,
          country: country,
      };
  }).filter(record => {
    const hasName = (record.firstName || record.lastName) && (record.firstName.trim() !== '' || record.lastName.trim() !== '');
    const hasEmail = record.email && record.email.trim() !== '';
    if (!hasName || !hasEmail) {
        console.warn('Skipping invalid record due to missing name or email:', record);
    }
    return hasName && hasEmail;
  });

  const uniqueUsers = new Map<string, any>();
  for (const user of processedRecords) {
    const normalizedEmail = user.email.toLowerCase().trim();
    if (normalizedEmail && !uniqueUsers.has(normalizedEmail)) {
      uniqueUsers.set(normalizedEmail, user);
    }
  }

  const deDuplicatedRecords = Array.from(uniqueUsers.values());

  console.log(`Successfully parsed ${records.length} records, with ${processedRecords.length} being valid. After de-duplication, there are ${deDuplicatedRecords.length} unique users.`);
  console.log('--- Starting Geocoding ---');

  let geocodedCount = 0;
  const finalUsers = [];
  for (let i = 0; i < deDuplicatedRecords.length; i++) {
    const user = deDuplicatedRecords[i];
    console.log(`Geocoding user ${i + 1}/${deDuplicatedRecords.length}: ${user.email} (${user.location})`);
    
    try {
        const coords = await geocodeAddress(user.location);
        if (coords) {
            user.lat = coords.lat;
            user.lng = coords.lng;
            geocodedCount++;
        }
        finalUsers.push(user);
        
        // Add a delay to avoid hitting rate limits
        await sleep(50); // ~20 requests per second

    } catch (error: any) {
        if (error.message === 'OVER_QUERY_LIMIT') {
            console.log('Stopping script due to query limit. Writing progress...');
            finalUsers.push(user); // add current user without coords
            break; 
        }
        finalUsers.push(user);
    }
  }

  console.log('--- Geocoding Complete ---');
  console.log(`${geocodedCount} users were successfully geocoded.`);
  
  console.log(`Writing final JSON with ${finalUsers.length} users to: ${jsonFilePath}`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(finalUsers, null, 2));
  
  console.log('Conversion and geocoding complete!');
}

convertAndGeocode().catch(err => {
    console.error('An error occurred during the conversion and geocoding process:', err);
    process.exit(1);
});
