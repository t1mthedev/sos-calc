import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', 'src', 'data', 'excel');

if (!existsSync(EXCEL_DIR)) mkdirSync(EXCEL_DIR, { recursive: true });

const ALL_MKS = ['MK 0', 'MK I', 'MK II', 'MK III', 'MK IV', 'MK V'];

// ENHANCEMENT: create file with all 6 MKs
const enhanceWb = XLSX.utils.book_new();
for (const mk of ALL_MKS) {
  const rows = [
    { Level: 'Level', Benefit: 'Benefit', 'Infantry Lethality': '', 'Infantry Health': '', 'Rider Lethality': '', 'Rider Health': '', 'Hunter Lethality': '', 'Hunter Health': '', 'Skill Unlocked': '', 'Fragments Required': '' },
    { Level: 1, Benefit: 'Placeholder', 'Infantry Lethality': 0.01, 'Infantry Health': 0.01, 'Rider Lethality': 0.01, 'Rider Health': 0.01, 'Hunter Lethality': 0.01, 'Hunter Health': 0.01, 'Skill Unlocked': '', 'Fragments Required': 10 },
  ];
  // Add more placeholder rows (total 5)
  for (let i = 2; i <= 5; i++) {
    rows.push({ Level: i, Benefit: `Level ${i}`, 'Infantry Lethality': 0.01, 'Infantry Health': 0.01, 'Rider Lethality': 0.01, 'Rider Health': 0.01, 'Hunter Lethality': 0.01, 'Hunter Health': 0.01, 'Skill Unlocked': '', 'Fragments Required': 10 + i * 5 });
  }
  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  // Use header row as data too (converter expects first row as data)
  const dataRows = rows.slice(1);
  const ws2 = XLSX.utils.json_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(enhanceWb, ws2, mk);
}
const enhanceOut = join(EXCEL_DIR, 'Behemoth_Enhancements_FINAL.xlsx');
XLSX.writeFile(enhanceWb, enhanceOut);
console.log(`Written ${enhanceOut} with ${ALL_MKS.length} sheets`);

// LEVELS: create file for MK I, MK II, MK V (MK 0/III/IV handled by scraper)
const levelsWb = XLSX.utils.book_new();
const levelMks = ['MK I', 'MK II', 'MK V'];
for (const mk of levelMks) {
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    rows.push({ Level: i, Mk: mk, PowerSerum: i * 10, Benefit: 'Placeholder stat', BenefitPct: 1.4, PointsToUpgrade: 1000 * i });
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(levelsWb, ws, mk);
}
// Also ensure MK 0, MK III, MK IV have at least something in case scraper didn't run
for (const mk of ['MK 0', 'MK III', 'MK IV']) {
  if (!levelsWb.SheetNames.includes(mk)) {
    const rows = [{ Level: 1, Mk: mk, PowerSerum: 10, Benefit: 'Placeholder', BenefitPct: 1.4, PointsToUpgrade: 1000 }];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(levelsWb, ws, mk);
  }
}
const levelsOut = join(EXCEL_DIR, 'behemoth_levels.xlsx');
XLSX.writeFile(levelsWb, levelsOut);
console.log(`Written ${levelsOut} with ${levelsWb.SheetNames.length} sheets`);

// SKILLS: create file for MK I, MK II, MK V (MK 0/III/IV handled by scraper)
const skillsWb = XLSX.utils.book_new();
const skillConfigs = [
  { sheet: 'MK I Skills', mk: 'MK I', trees: ['Artillery Missile', 'Rapid Fire'] },
  { sheet: 'MK II Skills', mk: 'MK II', trees: ['Artillery Missile', 'Rapid Fire'] },
  { sheet: 'MK V Skills', mk: 'MK V', trees: ['Tree 1', 'Tree 2'] },
];
for (const cfg of skillConfigs) {
  const rows = [];
  for (const tree of cfg.trees) {
    for (let i = 1; i <= 5; i++) {
      rows.push({ Tree: tree, Skill: tree, Level: i, Benefit: `Placeholder benefit ${i}`, 'Neuronal Medium': i * 10 });
    }
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(skillsWb, ws, cfg.sheet);
}
// Also ensure MK 0 Skills and MK III/IV have sheets
for (const sheet of ['MK 0 Skills', 'MK III Skills', 'MK IV Skills']) {
  if (!skillsWb.SheetNames.includes(sheet)) {
    const ws = XLSX.utils.json_to_sheet([{ Tree: 'Placeholder', Skill: 'Placeholder', Level: 1, Benefit: 'Placeholder', 'Neuronal Medium': 1 }]);
    XLSX.utils.book_append_sheet(skillsWb, ws, sheet);
  }
}
const skillsOut = join(EXCEL_DIR, 'behemoth_skills.xlsx');
XLSX.writeFile(skillsWb, skillsOut);
console.log(`Written ${skillsOut} with ${skillsWb.SheetNames.length} sheets`);

console.log('\nAll placeholder files generated!');
