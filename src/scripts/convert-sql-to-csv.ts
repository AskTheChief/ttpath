
import * as fs from 'fs';
import * as path from 'path';

const sqlFilePath = path.join(process.cwd(), 'public', 'UserData', 'UserContact.sql');
const csvFilePath = path.join(process.cwd(), 'public', 'UserData', 'users.csv');

/**
 * A robust parser to split a SQL values tuple string into an array of values.
 * It handles commas and escaped quotes within single-quoted strings.
 * e.g., ('John', 'O\'Malley, Jr.', 'Some text, with a comma') -> ["'John'", "'O\\'Malley, Jr.'", "'Some text, with a comma'"]
 */
function parseRowValues(rowString: string): string[] {
    const values = [];
    let current_value = '';
    let in_quotes = false;
    let is_escaped = false;

    for (const char of rowString) {
        if (is_escaped) {
            current_value += char;
            is_escaped = false;
            continue;
        }

        if (char === '\\') {
            is_escaped = true;
            current_value += char;
            continue;
        }

        if (char === "'") {
            in_quotes = !in_quotes;
        }

        if (char === ',' && !in_quotes) {
            values.push(current_value.trim());
            current_value = '';
        } else {
            current_value += char;
        }
    }
    values.push(current_value.trim()); // Add the last value

    if (values.length < 15) { // A crude check for a valid user row
        throw new Error(`Could not parse row correctly. Found only ${values.length} columns.`);
    }

    return values;
}

/**
 * Cleans a raw SQL value for CSV output.
 * @param value The raw string value from the parsed row.
 * @returns A cleaned string.
 */
function cleanSqlValue(value: string): string {
    if (value === 'NULL') {
        return '';
    }
    // Remove surrounding quotes and handle escaped single quotes.
    if (value.startsWith("'") && value.endsWith("'")) {
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
    
    const insertStatementRegex = /INSERT INTO `table_0` VALUES\s*([\s\S]*?);/g;
    let insertMatch;

    console.log('Searching for INSERT statements...');
    while ((insertMatch = insertStatementRegex.exec(sqlContent)) !== null) {
        const valuesBlock = insertMatch[1];
        
        // This regex finds each individual row tuple, e.g., (1, 'Ed', 'Seykota', ...).
        const rowRegex = /\((.*?)\)/g;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
            const rowContent = rowMatch[1];
            try {
                const rowValues = parseRowValues(rowContent);

                const first = cleanSqlValue(rowValues[3]);
                const last = cleanSqlValue(rowValues[4]);
                const email = cleanSqlValue(rowValues[6]);
                const city = cleanSqlValue(rowValues[11]);
                const state = cleanSqlValue(rowValues[12]);
                const country = cleanSqlValue(rowValues[14]);

                const name = `${first} ${last}`.trim();
                const location = `${city}, ${state}`.replace(/^, |,$/g, '').trim();

                allUsers.push({ name, email, location, country });
            } catch (e: any) {
                console.warn(`Could not parse a row. It might be malformed. Skipping. Error: ${e.message}. Row content: ${rowContent.substring(0, 100)}...`);
            }
        }
    }

    if (allUsers.length === 0) {
        console.error('No users were parsed. Please check the SQL file format and the parsing logic.');
        return;
    }

    console.log(`Successfully parsed ${allUsers.length} users.`);

    const header = ['name', 'email', 'location', 'country'];
    const csvRows = [
        header.join(','),
        ...allUsers.map(user => 
            header.map(fieldName => `"${user[fieldName] ? user[fieldName] : ''}"`).join(',')
        )
    ];
    
    console.log(`Writing CSV to: ${csvFilePath}`);
    fs.writeFileSync(csvFilePath, csvRows.join('\n'));
    
    console.log('Conversion to CSV complete!');
}

convertSqlToCsv();
