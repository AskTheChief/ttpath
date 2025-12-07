
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

  const users: LegacyUser[] = [];
  const insertRegex = /INSERT INTO `UserContact` VALUES \((.*?)\);/g;
  let match;

  while ((match = insertRegex.exec(sqlContent)) !== null) {
    try {
        const values = match[1].split(/,(?=(?:(?:[^"']*["']){2})*[^"']*$)/).map(v => {
            let value = v.trim();
            if (value.startsWith("'") && value.endsWith("'")) {
                value = value.substring(1, value.length - 1);
            }
            return value.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        });

        if (values.length >= 7) {
            const user: LegacyUser = {
                name: values[1],
                email: values[5],
                location: `${values[3]}, ${values[4]}`,
                country: values[2],
            };
            users.push(user);
        }
    } catch (e) {
        console.error("Skipping malformed row:", match[1]);
    }
  }

  console.log(`Successfully parsed ${users.length} users.`);
  
  console.log(`Writing JSON to: ${jsonFilePath}`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(users, null, 2));
  
  console.log('Conversion complete!');
}

convertSqlToJson();
