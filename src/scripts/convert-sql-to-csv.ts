
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
    if (value === 'NULL') {
        return '';
    }
    if (value.startsWith("'") && value.endsWith("'")) {
        // Remove surrounding quotes and escape internal quotes by doubling them.
        // Also handle escaped single quotes within the string.
        return value.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '""');
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
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    const allUsers: any[] = [];
    
    // This regex is designed to find all `VALUES` blocks associated with `table_0`.
    const valuesRegex = /INSERT INTO `table_0` .*? VALUES\s*([\s\S]*?);/g;
    let valuesMatch;

    console.log('Searching for INSERT statements...');
    while ((valuesMatch = valuesRegex.exec(sqlContent)) !== null) {
        const valuesBlock = valuesMatch[1];
        
        // This regex finds each individual row tuple, e.g., (1, 'Ed', 'Seykota', ...).
        // It's designed to handle nested parentheses within quoted strings, though less likely here.
        const rowRegex = /\(((?:[^()']|'[^']*')*)\)/g;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
            // This complex regex splits by comma, but ignores commas inside single quotes.
            const rowValues = rowMatch[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/);
            
            if (rowValues.length > 15) { // User data rows have many columns.
                try {
                    const first = parseSqlValue(rowValues[3]);
                    const last = parseSqlValue(rowValues[4]);
                    const email = parseSqlValue(rowValues[6]);
                    const city = parseSqlValue(rowValues[11]);
                    const state = parseSqlValue(rowValues[12]);
                    const country = parseSqlValue(rowValues[14]);

                    const name = `${first} ${last}`.trim();
                    const location = `${city}, ${state}`.replace(/^,|,$/g, '').trim();

                    allUsers.push({ name, email, location, country });
                } catch (e) {
                    console.warn('Could not parse a row. It might be malformed:', rowMatch[1]);
                }
            }
        }
    }

    if (allUsers.length === 0) {
        console.error('No users were parsed. Please check the SQL file format and the parsing logic.');
        return;
    }

    console.log(`Successfully parsed ${allUsers.length} users.`);

    // Convert to CSV format.
    const header = ['name', 'email', 'location', 'country'];
    const csvRows = [
        header.join(','),
        ...allUsers.map(user => 
            header.map(fieldName => `"${user[fieldName] ? user[fieldName].replace(/"/g, '""') : ''}"`).join(',')
        )
    ];
    
    console.log(`Writing CSV to: ${csvFilePath}`);
    fs.writeFileSync(csvFilePath, csvRows.join('\n'));
    
    console.log('Conversion to CSV complete!');
}

convertSqlToCsv();
