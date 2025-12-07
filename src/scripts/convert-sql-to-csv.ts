
import * as fs from 'fs';
import * as path from 'path';

const sqlFilePath = path.join(process.cwd(), 'public', 'UserData', 'table_0.sql');
const csvFilePath = path.join(process.cwd(), 'public', 'UserData', 'OldUsers.csv');

/**
 * A robust parser to split a SQL values tuple string into an array of values.
 * It uses a regex to correctly handle quoted strings, NULLs, and numbers.
 */
function parseRowValues(rowString: string): string[] {
    const values: string[] = [];
    // This regex will match:
    // 1. Quoted strings, including those with escaped quotes: '((?:[^'\\]|\\.)*)'
    // 2. Numbers (including decimals and negatives): ([\d.-]+)
    // 3. NULL keyword: (NULL)
    // 4. Empty values between commas
    const regex = /'((?:[^'\\]|\\.)*)'|([\d.-]+)|(NULL)|(,|(?=\)))/g;
    let lastIndex = 0;
    let match;
    
    // Add a comma at the end to ensure the last value is captured.
    const processingString = rowString + ',';

    while ((match = regex.exec(processingString)) !== null) {
        if (match[4] === ',' || match[4] === ')') { // If we hit a comma or end parenthesis
            const segment = processingString.substring(lastIndex, match.index).trim();
            if (segment.startsWith("'") && segment.endsWith("'")) {
                values.push(segment.slice(1, -1).replace(/\\'/g, "'"));
            } else if (segment === 'NULL') {
                values.push('NULL');
            } else {
                values.push(segment);
            }
            lastIndex = match.index + 1;
        }
    }
    return values;
}


/**
 * Cleans a raw SQL value for CSV output.
 */
function cleanSqlValue(value: string): string {
    if (!value || value === 'NULL') {
        return '';
    }
    // The value is already un-quoted by parseRowValues, so just handle CSV special characters.
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
    
    const header = ['id', 'login_first', 'login_last', 'first', 'last', 'tribe', 'email', 'phone', 'address', 'username', 'password', 'city', 'state', 'province', 'country', 'code', 'book_tt', 'book_g', 'attend_w', 'attend_3', 'attend_t', 'chief', 'faq_read', 'faq_write', 'wish_j', 'wish_w', 'wish_b', 'wish_p', 'reachouts', 'expansion_1', 'expansion_2'];
    allRows.push(header);

    // This regex finds all INSERT statements, and is case-insensitive for "INSERT" and "VALUES"
    const insertStatementRegex = /INSERT INTO `table_0` \([^)]+\) VALUES\s*([\s\S]*?);/gi;
    let insertMatch;

    console.log('Searching for INSERT statements...');
    while ((insertMatch = insertStatementRegex.exec(sqlContent)) !== null) {
        const valuesBlock = insertMatch[1];
        
        // This regex is designed to split rows correctly, even if they span multiple lines.
        // It looks for a parenthesis, captures everything inside until the next closing parenthesis.
        const rowRegex = /\(([^)]+)\)/g;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
            const rowContent = rowMatch[1];
            try {
                const parsedSqlValues = parseRowValues(rowContent);
                
                // Trim trailing empty strings that might result from trailing commas
                while (parsedSqlValues.length > 0 && parsedSqlValues[parsedSqlValues.length - 1] === '') {
                    parsedSqlValues.pop();
                }

                if (parsedSqlValues.length === header.length) { 
                    const cleanedRow = parsedSqlValues.map(cleanSqlValue);
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
