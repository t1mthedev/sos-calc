import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', 'src', 'data', 'excel');
if (!existsSync(EXCEL_DIR)) mkdirSync(EXCEL_DIR, { recursive: true });

// ---- ENHANCEMENT ----
// Read existing enhancement file if any, then ensure all 6 MKs have sheets
let enhanceWb;
const enhancePath = join(EXCEL_DIR, 'Behemoth_Enhancements_FINAL.xlsx');
const ENHANCE_COLS = ['Level', 'Benefit', 'Infantry Lethality', 'Infantry Health', 'Rider Lethality', 'Rider Health', 'Hunter Lethality', 'Hunter Health', 'Skill Unlocked', 'Fragments Required'];

if (existsSync(enhancePath)) {
  enhanceWb = XLSX.readFile(enhancePath, { cellDates: true });
  console.log('Enhancement existing sheets:', enhanceWb.SheetNames);
} else {
  enhanceWb = XLSX.utils.book_new();
}

const ALL_MKS = ['MK 0', 'MK I', 'MK II', 'MK III', 'MK IV', 'MK V'];
for (const mk of ALL_MKS) {
  if (!enhanceWb.SheetNames.includes(mk)) {
    const rows = [];
    for (let i = 1; i <= 5; i++) {
      rows.push({
        'Level': i, 'Benefit': `Level ${i}`,
        'Infantry Lethality': 0.01, 'Infantry Health': 0.01,
        'Rider Lethality': 0.01, 'Rider Health': 0.01,
        'Hunter Lethality': 0.01, 'Hunter Health': 0.01,
        'Skill Unlocked': '', 'Fragments Required': 10 + i * 5
      });
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(enhanceWb, ws, mk);
    console.log(`  Added enhancement sheet: ${mk}`);
  }
}
XLSX.writeFile(enhanceWb, enhancePath);
console.log(`Enhancement written (${enhanceWb.SheetNames.length} sheets)`);

// ---- LEVELS ----
let levelsWb;
const levelsPath = join(EXCEL_DIR, 'behemoth_levels.xlsx');
if (existsSync(levelsPath)) {
  levelsWb = XLSX.readFile(levelsPath, { cellDates: true });
  console.log('Levels existing sheets:', levelsWb.SheetNames);
} else {
  levelsWb = XLSX.utils.book_new();
}

for (const mk of ALL_MKS) {
  if (!levelsWb.SheetNames.includes(mk)) {
    const rows = [
      { Level: 1, Mk: mk, PowerSerum: 10, Benefit: 'Placeholder', BenefitPct: 1.4, PointsToUpgrade: 1000 },
      { Level: 2, Mk: mk, PowerSerum: 20, Benefit: 'Placeholder', BenefitPct: 1.4, PointsToUpgrade: 2000 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(levelsWb, ws, mk);
    console.log(`  Added levels sheet: ${mk}`);
  }
}
XLSX.writeFile(levelsWb, levelsPath);
console.log(`Levels written (${levelsWb.SheetNames.length} sheets)`);

// ---- SKILLS ----
let skillsWb;
const skillsPath = join(EXCEL_DIR, 'behemoth_skills.xlsx');
if (existsSync(skillsPath)) {
  skillsWb = XLSX.readFile(skillsPath, { cellDates: true });
  console.log('Skills existing sheets:', skillsWb.SheetNames);
} else {
  skillsWb = XLSX.utils.book_new();
}

// Map mk -> sheet name
const SKILL_SHEETS = {
  'MK 0': 'MK 0 Skills',
  'MK I': 'MK I Skills',
  'MK II': 'MK II Skills',
  'MK III': 'MK III Skills',
  'MK IV': 'MK IV Skills',
  'MK V': 'MK V Skills',
};

for (const mk of ALL_MKS) {
  const sheetName = SKILL_SHEETS[mk];
  if (!skillsWb.SheetNames.includes(sheetName)) {
    const rows = [
      { Tree: 'Tree 1', Skill: 'Skill 1', Level: 1, Benefit: 'Placeholder benefit', 'Neuronal Medium': 10 },
      { Tree: 'Tree 1', Skill: 'Skill 2', Level: 1, Benefit: 'Placeholder benefit', 'Neuronal Medium': 15 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(skillsWb, ws, sheetName);
    console.log(`  Added skills sheet: ${sheetName}`);
  }
}
XLSX.writeFile(skillsWb, skillsPath);
console.log(`Skills written (${skillsWb.SheetNames.length} sheets)`);

console.log('\nDone! All missing MK sheets added.');
