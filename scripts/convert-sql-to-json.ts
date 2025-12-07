
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
    console.error('Please ensure the CSV file exists.');
    process.exit(1);
  }
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  const records: LegacyUser[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // Filter out records that are missing essential data like name or email.
  const validRecords = records.filter(record => {
    const hasName = record.name && record.name.trim() !== '';
    const hasEmail = record.email && record.email.trim() !== '';
    if (!hasName || !hasEmail) {
        console.warn('Skipping invalid record:', record);
    }
    return hasName && hasEmail;
  });


  console.log(`Successfully parsed ${records.length} records, with ${validRecords.length} being valid.`);
  
  console.log(`Writing JSON to: ${jsonFilePath}`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(validRecords, null, 2));
  
  console.log('Conversion to JSON complete!');
}

convertCsvToJson().catch(err => {
    console.error('An error occurred during CSV to JSON conversion:', err);
    process.exit(1);
});
