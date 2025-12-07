
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const csvFilePath = path.join(process.cwd(), 'public', 'UserData', 'OldUsers.csv');
const jsonFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.json');

type LegacyUser = {
  firstName: string;
  lastName: string;
  email: string;
  location: string;
  country: string;
};

// Function to split full name into first and last name
function splitName(fullName: string): { firstName: string, lastName:string } {
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length > 1) {
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ');
        return { firstName, lastName };
    }
    return { firstName: fullName, lastName: '' };
}

// Function to normalize location strings for better geocoding results
function normalizeLocation(location: string, country: string): string {
    if (!location) return country;
    
    let cleaned = location
        // Remove known noise
        .replace(/city:|state:|country:/gi, '')
        // Remove characters that are unlikely to be part of an address
        .replace(/[~!*();?#@&=+$%^]/g, '')
        .trim();

    // If the cleaned location doesn't already contain the country, and the country is valid, append it.
    if (country && !cleaned.toLowerCase().includes(country.toLowerCase())) {
        cleaned = `${cleaned}, ${country}`;
    }
    
    // Consolidate multiple commas or spaces
    cleaned = cleaned.replace(/,+/g, ',').replace(/\s,/, ',').replace(/,\s*/g, ', ').trim();
    // Remove leading or trailing commas
    cleaned = cleaned.replace(/^,|,$/g, '').trim();
    
    return cleaned;
}


async function convertCsvToJson() {
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
  const nameKey = header.find(h => h.toLowerCase().includes('name'));
  const emailKey = header.find(h => h.toLowerCase().includes('email'));
  const locationKey = header.find(h => h.toLowerCase().includes('location'));
  const countryKey = header.find(h => h.toLowerCase().includes('country'));

  if (!nameKey || !emailKey) {
      console.error('Could not find "name" and "email" columns in the CSV file. Please check the header row.');
      console.log('Found headers:', header);
      process.exit(1);
  }

  const processedRecords = records.map(record => {
      const { firstName, lastName } = splitName(record[nameKey] || '');
      const location = locationKey ? record[locationKey] : '';
      const country = countryKey ? record[countryKey] : '';
      
      return {
          firstName,
          lastName,
          email: record[emailKey] || '',
          location: normalizeLocation(location, country),
          country: country,
      };
  }).filter(record => {
    const hasName = record.firstName && record.firstName.trim() !== '';
    const hasEmail = record.email && record.email.trim() !== '';
    if (!hasName || !hasEmail) {
        console.warn('Skipping invalid record due to missing name or email:', record);
    }
    return hasName && hasEmail;
  });

  const uniqueUsers = new Map<string, LegacyUser>();
  for (const user of processedRecords) {
    const normalizedEmail = user.email.toLowerCase().trim();
    if (!uniqueUsers.has(normalizedEmail)) {
      uniqueUsers.set(normalizedEmail, user);
    }
  }

  const deDuplicatedRecords = Array.from(uniqueUsers.values());

  console.log(`Successfully parsed ${records.length} records, with ${processedRecords.length} being valid. After de-duplication, there are ${deDuplicatedRecords.length} unique users.`);
  
  console.log(`Writing JSON to: ${jsonFilePath}`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(deDuplicatedRecords, null, 2));
  
  console.log('Conversion to JSON complete!');
}

convertCsvToJson().catch(err => {
    console.error('An error occurred during CSV to JSON conversion:', err);
    process.exit(1);
});
