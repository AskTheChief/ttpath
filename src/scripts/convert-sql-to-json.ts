
import * as fs from 'fs';
import * as path from 'path';

const sqlFilePath = path.join(process.cwd(), 'public', 'UserData', 'UserContact.sql');
const jsonFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.json');

type LegacyUser = {
  name: string;
  email: string;
  location: string;
  country: string;
  lat?: number;
  lng?: number;
};

async function convertSqlToJson() {
  console.log(`Reading SQL file from: ${sqlFilePath}`);
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  console.log(`File read successfully. Total length: ${sqlContent.length} characters.`);

  const users: LegacyUser[] = [];
  
  // This regex finds all INSERT INTO blocks and captures the values part.
  const insertRegex = /INSERT INTO `table_0` .*? VALUES\s*([\s\S]*?);/g;
  let insertMatch;
  let totalMatches = 0;

  while ((insertMatch = insertRegex.exec(sqlContent)) !== null) {
    totalMatches++;
    const valuesBlock = insertMatch[1];
    
    // This regex splits the block into individual rows: ( ... ), ( ... ), ...
    const rowRegex = /\(([^)]+)\)/g;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
      try {
        const values = rowMatch[1].split(/,(?=(?:(?:[^"']*["']){2})*[^"']*$)/).map(v => {
          let value = v.trim();
          // Strip leading/trailing single quotes
          if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          // Unescape single quotes and backslashes
          return value.replace(/\\'/g, "'").replace(/\\\\/g, "\\").trim();
        });

        if (values.length >= 15) {
          const user: LegacyUser = {
            name: `${values[3]} ${values[4]}`.trim(),
            email: values[6],
            location: `${values[11]}, ${values[12]}`.trim(),
            country: values[14],
          };
          users.push(user);
        }
      } catch (e) {
        console.error("Skipping malformed row:", rowMatch[0]);
      }
    }
  }

  console.log(`Found ${totalMatches} INSERT statements.`);
  console.log(`Successfully parsed ${users.length} users.`);
  
  console.log(`Writing JSON to: ${jsonFilePath}`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(users, null, 2));
  
  console.log('Conversion complete!');
}

convertSqlToJson();
