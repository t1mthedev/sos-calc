import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKILL_TREES = [
  {
    tree: 'Inferno Salvo',
    skills: [
      {
        name: 'Inferno Salvo',
        levels: [
          { level: 1, cost: 5 },
          { level: 2, cost: 7 },
          { level: 3, cost: 8 },
          { level: 4, cost: 9 },
          { level: 5, cost: 10, benefit: '+2.06% Troop Defense, +2.06% Troop Attack' },
          { level: 6, cost: 12 },
          { level: 7, cost: 14 },
          { level: 8, cost: 17 },
          { level: 9, cost: 20 },
          { level: 10, cost: 23, benefit: '+2.06% Troop Defense, +2.06% Troop Attack, +1.2% Troop Health' },
          { level: 11, cost: 27 },
          { level: 12, cost: 32 },
          { level: 13, cost: 37 },
          { level: 14, cost: 44 },
          { level: 15, cost: 52, benefit: '+4.12% Troop Defense, +4.12% Troop Attack, +1.2% Troop Health, +1.2% Troop Lethality' },
          { level: 16, cost: 65 },
          { level: 17, cost: 69 },
          { level: 18, cost: 82 },
          { level: 19, cost: 96 },
          { level: 20, cost: 110, benefit: '+4.12% Troop Defense, +4.12% Troop Attack, +2.4% Troop Health, +2.4% Troop Lethality' },
        ],
      },
      {
        name: 'Overheat',
        levels: [
          { level: 1, cost: 44 },
          { level: 2, cost: 116 },
          { level: 3, cost: 375 },
        ],
      },
      {
        name: 'Blaze Pressure',
        levels: [
          { level: 1, cost: 45 },
          { level: 2, cost: 118 },
          { level: 3, cost: 375 },
        ],
      },
    ],
  },
];

function buildRows() {
  const rows = [];
  for (const tree of SKILL_TREES) {
    for (const skill of tree.skills) {
      for (const lvl of skill.levels) {
        rows.push({
          Tree: tree.tree,
          Skill: skill.name,
          Level: lvl.level,
          Benefit: lvl.benefit || '',
          'Neuronal Medium': lvl.cost,
        });
      }
    }
  }
  return rows;
}

function main() {
  const excelDir = join(__dirname, '..', 'src', 'data', 'excel');
  const filePath = join(excelDir, 'behemoth_skills.xlsx');

  const oldWb = XLSX.readFile(filePath);
  const sheetName = 'MK V Skills';

  const wb = XLSX.utils.book_new();
  for (const name of oldWb.SheetNames) {
    if (name === sheetName) continue;
    const ws = oldWb.Sheets[name];
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const rows = buildRows();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, filePath);
  console.log(`Written ${rows.length} rows to ${sheetName} in ${filePath}`);
}

main();
