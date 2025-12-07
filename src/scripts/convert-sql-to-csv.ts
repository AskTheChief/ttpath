
import * as fs from 'fs';
import * as path from 'path';

const sqlFilePath = path.join(process.cwd(), 'public', 'UserData', 'UserContact.sql');
const csvFilePath = path.join(process.cwd(), 'public', 'UserData', 'OldUsers.csv');

/**
 * A robust parser to split a SQL values tuple string into an array of values.
 * It handles commas and escaped quotes within single-quoted strings.
 */
function parseRowValues(rowString: string): string[] {
    const values: string[] = [];
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

    return values;
}

/**
 * Cleans a raw SQL value for CSV output.
 */
function cleanSqlValue(value: string): string {
    if (!value || value === 'NULL') {
        return '';
    }
    // Remove surrounding quotes and handle escaped single quotes.
    if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '""');
    }
    return value.replace(/"/g, '""');
}

/**
 * Converts the custom SQL dump file to a clean CSV file with all fields.
 */
async function convertSqlToCsv() {
    console.log(`Reading SQL file from: ${sqlFilePath}`);
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`Error: SQL file not found at ${sqlFilePath}`);
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    const allRows: string[][] = [];
    
    // Define the full header based on the SQL table structure
    const header = [
        'id', 'field_1', 'field_2', 'First Name', 'Last Name', 'field_5', 
        'Email', 'field_7', 'field_8', 'Address', 'field_10', 'City', 
        'State', 'Zip', 'Country', 'Phone'
    ];
    allRows.push(header);

    const insertStatementRegex = /INSERT INTO `table_0` VALUES\s*([\s\S]*?);/g;
    let insertMatch;

    console.log('Searching for INSERT statements...');
    while ((insertMatch = insertStatementRegex.exec(sqlContent)) !== null) {
        const valuesBlock = insertMatch[1];
        
        const rowRegex = /\((.*?)\)/g;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
            const rowContent = rowMatch[1];
            try {
                const parsedSqlValues = parseRowValues(rowContent);
                if (parsedSqlValues.length >= 15) { // Ensure we have enough columns
                    const cleanedRow = parsedSqlValues.map(cleanSqlValue);
                    allRows.push(cleanedRow);
                }
            } catch (e: any) {
                console.warn(`Could not parse a row. Skipping. Error: ${e.message}.`);
            }
        }
    }

    if (allRows.length <= 1) { // Only header row
        console.error('No users were parsed. Please check the SQL file format and the parsing logic.');
        return;
    }

    console.log(`Successfully parsed ${allRows.length - 1} user rows.`);

    const csvContent = allRows.map(row => 
        row.map(field => `"${field}"`).join(',')
    ).join('\n');
    
    console.log(`Writing CSV to: ${csvFilePath}`);
    fs.writeFileSync(csvFilePath, csvContent);
    
    console.log('Conversion to CSV complete!');
}

convertSqlToCsv();
