
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

function createFullLocationString(address: string, city: string, state: string, zip: string, country: string): string {
    const parts = [address, city, state, zip, country].filter(Boolean);
    return parts.join(', ');
}


async function convertAndGeocode() {
  console.log(`Reading CSV file from: ${csvFilePath}`);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: CSV file not found at ${csvFilePath}`);
    console.error('Please ensure the CSV file exists and the path is correct. Run `npm run convert-sql` first.');
    process.exit(1);
  }
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
      console.log('No records found in CSV file.');
      return;
  }

  // Find the actual keys for first name, last name, and email
  const headers = Object.keys(records[0]);
  const firstKey = headers.find(h => h.toLowerCase().includes('first'));
  const lastKey = headers.find(h => h.toLowerCase().includes('last'));
  const emailKey = headers.find(h => h.toLowerCase().includes('email'));
  
  if (!firstKey || !lastKey || !emailKey) {
      console.error('Could not find required columns (first, last, email) in CSV headers:', headers);
      process.exit(1);
  }


  const processedRecords = records.filter((record: any) => {
    const hasName = (record[firstKey] && record[firstKey].trim() !== '') || (record[lastKey] && record[lastKey].trim() !== '');
    const hasEmail = record[emailKey] && record[emailKey].trim() !== '';
    if (!hasName || !hasEmail) {
        console.warn('Skipping invalid record due to missing name or email:', record);
        return false;
    }
    return true;
  }).map((record: any) => {
      const { firstName, lastName } = splitName(record[firstKey], record[lastKey]);
      
      const city = record.city || '';
      const state = record.state || record.province || '';
      const zip = record.code || '';
      const country = record.country || '';
      const address = record.address || '';
      
      const user: any = {
          firstName,
          lastName,
          email: record.email || '',
          location: createFullLocationString(address, city, state, zip, country),
          phone: record.phone || '',
          address: address,
          city: city,
          state: state,
          zip: zip,
          country: country
      };
      
      // Copy all original fields from the record
      const allHeaders = Object.keys(record);
      allHeaders.forEach(header => {
          // Only add if not one of the specially handled fields to avoid conflicts
          if (!['firstName', 'lastName', 'location'].includes(header) && record[header] !== undefined) {
            user[header] = record[header];
          }
      });
      
      return user;
  });

  const uniqueUsers = new Map<string, any>();
  for (const user of processedRecords) {
    const normalizedEmail = user.email.toLowerCase().trim();
    if (normalizedEmail && !uniqueUsers.has(normalizedEmail)) {
      uniqueUsers.set(normalizedEmail, user);
    }
  }

  const deDuplicatedRecords = Array.from(uniqueUsers.values());

  console.log(`Successfully parsed ${records.length} records, with ${deDuplicatedRecords.length} being valid. After de-duplication, there are ${deDuplicatedRecords.length} unique users.`);
  console.log('--- Starting Geocoding ---');

  let geocodedCount = 0;
  const finalUsers = [];
  for (let i = 0; i < deDuplicatedRecords.length; i++) {
    const user = deDuplicatedRecords[i];
    const geocodeQuery = user.location;
    console.log(`Geocoding user ${i + 1}/${deDuplicatedRecords.length}: ${user.email} (${geocodeQuery})`);
    
    try {
        const coords = await geocodeAddress(geocodeQuery);
        if (coords) {
            user.lat = coords.lat;
            user.lng = coords.lng;
            geocodedCount++;
        }
        finalUsers.push(user);
        
        await sleep(50); // Be respectful to the API

    } catch (error: any) {
        if (error.message === 'OVER_QUERY_LIMIT') {
            console.log('Stopping script due to query limit. Writing progress...');
            finalUsers.push(user); // save the user we were working on
            break; // Exit the loop
        }
        finalUsers.push(user); // Still add user even if geocoding fails
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
