import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', 'src', 'data', 'excel');
if (!existsSync(EXCEL_DIR)) mkdirSync(EXCEL_DIR, { recursive: true });

const levelsPath = join(EXCEL_DIR, 'behemoth_levels.xlsx');
if (!existsSync(levelsPath)) {
  console.error('behemoth_levels.xlsx not found, aborting');
  process.exit(1);
}

const wb = XLSX.readFile(levelsPath, { cellDates: true });

if (wb.SheetNames.includes('MK V')) {
  console.log('MK V sheet already exists, aborting');
  process.exit(0);
}

const srcName = 'MK I';
if (!wb.SheetNames.includes(srcName)) {
  console.error(`Source sheet ${srcName} not found, aborting`);
  process.exit(1);
}

const srcRows = XLSX.utils.sheet_to_json(wb.Sheets[srcName], { defval: '' });
if (!srcRows.length) {
  console.error(`Source sheet ${srcName} is empty, aborting`);
  process.exit(1);
}

const rows = srcRows.map(r => ({
  Level: r.Level,
  Mk: 'MK V',
  PowerSerum: r.PowerSerum,
  Benefit: '',
  BenefitPct: '',
  PointsToUpgrade: '',
}));

const ws = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, 'MK V');

XLSX.writeFile(wb, levelsPath);
console.log(`Added MK V sheet with ${rows.length} rows (copied ${srcName} costs, stats empty) -> ${levelsPath}`);
