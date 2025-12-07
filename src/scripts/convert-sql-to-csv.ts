
import * as fs from 'fs';
import * as path from 'path';

const sqlFilePath = path.join(process.cwd(), 'public', 'UserData', 'UserContact.sql');
const csvFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.csv');

/**
 * Parses a single value from a SQL INSERT statement, handling quotes and NULLs.
 * @param value The raw string value from SQL.
 * @returns A cleaned string, ready for CSV.
 */
function parseSqlValue(value: string): string {
    value = value.trim();
    // Handle NULL values
    if (value === 'NULL') {
        return '';
    }
    // Handle quoted strings
    if (value.startsWith("'") && value.endsWith("'")) {
        // Remove surrounding quotes and escape internal quotes
        return value.slice(1, -1).replace(/"/g, '""');
    }
    return value.replace(/"/g, '""');
}

/**
 * Converts the custom SQL dump file to a clean CSV file.
 */
async function convertSqlToCsv() {
    console.log(`Reading SQL file from: ${sqlFilePath}`);
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`Error: SQL file not found at ${sqlFilePath}`);
        return;
    }
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Regex to find all INSERT statements for table_0
    const insertRegex = /INSERT INTO `table_0` .*? VALUES\s*([\s\S]*?);/g;
    let insertMatch;
    const allUsers: any[] = [];

    console.log('Searching for INSERT statements...');
    while ((insertMatch = insertRegex.exec(sqlContent)) !== null) {
        const valuesBlock = insertMatch[1];
        
        // Regex to find each individual row within the VALUES block, e.g., (1, 'Ed', 'Seykota', ...)
        const rowRegex = /\((.*?)\)/g;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
            const rowValues = rowMatch[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/);
            
            if (rowValues.length > 15) { // Ensure it's a user data row
                try {
                    const first = parseSqlValue(rowValues[3]);
                    const last = parseSqlValue(rowValues[4]);
                    const email = parseSqlValue(rowValues[6]);
                    const city = parseSqlValue(rowValues[11]);
                    const state = parseSqlValue(rowValues[12]);
                    const country = parseSqlValue(rowValues[14]);

                    const name = `${first} ${last}`.trim();
                    const location = `${city}, ${state}`.trim().replace(/^, |,$/g, '');

                    allUsers.push({
                        name,
                        email,
                        location,
                        country
                    });
                } catch (e) {
                    console.warn('Could not parse a row:', rowValues);
                }
            }
        }
    }

    if (allUsers.length === 0) {
        console.error('No users were parsed. Please check the SQL file format and regex.');
        return;
    }

    console.log(`Successfully parsed ${allUsers.length} users.`);

    // Convert to CSV
    const header = ['name', 'email', 'location', 'country'];
    const csvRows = [
        header.join(','),
        ...allUsers.map(user => 
            header.map(fieldName => `"${user[fieldName].replace(/"/g, '""')}"`).join(',')
        )
    ];
    
    console.log(`Writing CSV to: ${csvFilePath}`);
    fs.writeFileSync(csvFilePath, csvRows.join('\n'));
    
    console.log('Conversion to CSV complete!');
}

convertSqlToCsv();
