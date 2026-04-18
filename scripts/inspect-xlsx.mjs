import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

const path = process.argv[2];
const buf = await readFile(path);
const wb = XLSX.read(buf, { type: 'buffer' });

const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
const headers = rows[0];
console.log('Total cols:', headers.length);
console.log('Total rows (incl header):', rows.length);
console.log('\nAll columns:');
headers.forEach((h, i) => console.log(`${i}: ${h}`));

console.log('\nSample row (row 1) as {col: val}:');
const sample = {};
headers.forEach((h, i) => { sample[h] = rows[1][i]; });
console.log(JSON.stringify(sample, null, 2));
