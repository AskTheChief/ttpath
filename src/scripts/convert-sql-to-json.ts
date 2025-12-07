
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const csvFilePath = path.join(process.cwd(), 'public', 'UserData', 'OldUsers.csv');
const jsonFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.json');

type LegacyUser = {
  name: string;
  email: string;
  location: string;
  country: string;
};

async function convertCsvToJson() {
  console.log(`Reading CSV file from: ${csvFilePath}`);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: CSV file not found at ${csvFilePath}`);
    console.error('Please ensure the CSV file exists and the path is correct.');
    process.exit(1);
  }
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  // Robustly parse the CSV, automatically detecting headers.
  const records = parse(csvContent, {
    columns: true, // Use the first line as headers
    skip_empty_lines: true,
    trim: true, // Trim spaces from headers and values
  });

  // Dynamically find the keys for name and email, case-insensitively.
  const header = Object.keys(records[0] || {});
  const nameKey = header.find(h => h.toLowerCase().includes('name'));
  const emailKey = header.find(h => h.toLowerCase().includes('email'));
  const locationKey = header.find(h => h.toLowerCase().includes('location'));
  const countryKey = header.find(h => h.toLowerCase().includes('country'));

  if (!nameKey || !emailKey) {
      console.error('Could not find "name" and "email" columns in the CSV file. Please check the header row.');
      console.log('Found headers:', header);
      process.exit(1);
  }

  // Filter out records that are missing essential data like name or email.
  const validRecords = records.map(record => ({
      name: record[nameKey] || '',
      email: record[emailKey] || '',
      location: locationKey ? record[locationKey] : '',
      country: countryKey ? record[countryKey] : '',
  })).filter(record => {
    const hasName = record.name && record.name.trim() !== '';
    const hasEmail = record.email && record.email.trim() !== '';
    if (!hasName || !hasEmail) {
        console.warn('Skipping invalid record due to missing name or email:', record);
    }
    return hasName && hasEmail;
  });

  // De-duplicate records based on email address, case-insensitively.
  const uniqueUsers = new Map<string, LegacyUser>();
  for (const user of validRecords) {
    const normalizedEmail = user.email.toLowerCase().trim();
    if (!uniqueUsers.has(normalizedEmail)) {
      uniqueUsers.set(normalizedEmail, user);
    }
  }

  const deDuplicatedRecords = Array.from(uniqueUsers.values());

  console.log(`Successfully parsed ${records.length} records, with ${validRecords.length} being valid. After de-duplication, there are ${deDuplicatedRecords.length} unique users.`);
  
  console.log(`Writing JSON to: ${jsonFilePath}`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(deDuplicatedRecords, null, 2));
  
  console.log('Conversion to JSON complete!');
}

convertCsvToJson().catch(err => {
    console.error('An error occurred during CSV to JSON conversion:', err);
    process.exit(1);
});
