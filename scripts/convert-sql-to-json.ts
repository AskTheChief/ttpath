
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
  const lines = sqlContent.split('\n');

  const users: LegacyUser[] = [];
  const valueRegex = /VALUES \((.*?)\);/;

  for (const line of lines) {
    if (!line.startsWith('INSERT INTO')) {
      continue;
    }

    const match = line.match(valueRegex);
    if (!match || !match[1]) {
      continue;
    }

    try {
      const values = match[1].split(/,(?=(?:(?:[^"']*["']){2})*[^"']*$)/).map(v => {
        let value = v.trim();
        if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1).trim();
        }
        return value.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
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
      console.error("Skipping malformed row:", line);
    }
  }

  console.log(`Successfully parsed ${users.length} users.`);
  
  console.log(`Writing JSON to: ${jsonFilePath}`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(users, null, 2));
  
  console.log('Conversion complete!');
}

convertSqlToJson();
