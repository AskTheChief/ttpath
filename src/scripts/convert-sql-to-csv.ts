
import * as fs from 'fs';
import * as path from 'path';

const sqlFilePath = path.join(process.cwd(), 'public', 'UserData', 'table_0.sql');
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
    
    // The full list of 31 headers from the INSERT statement
    const header = [
        'id', 'login_first', 'login_last', 'first', 'last', 'tribe', 'email', 'phone', 
        'address', 'username', 'password', 'city', 'state', 'province', 'country', 
        'code', 'book_tt', 'book_g', 'attend_w', 'attend_3', 'attend_t', 
        'chief', 'faq_read', 'faq_write', 'wish_j', 'wish_w', 'wish_b', 
        'wish_p', 'reachouts', 'expansion_1', 'expansion_2'
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
                if (parsedSqlValues.length >= header.length) { 
                    const cleanedRow = parsedSqlValues.slice(0, header.length).map(cleanSqlValue);
                    allRows.push(cleanedRow);
                } else {
                    console.warn(`Skipping row with incorrect number of columns. Expected ${header.length}, got ${parsedSqlValues.length}.`);
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
