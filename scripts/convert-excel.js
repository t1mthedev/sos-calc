import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', 'src', 'data', 'excel');
const JSON_DIR = join(__dirname, '..', 'src', 'data', 'json');
const OUTPUT = join(JSON_DIR, 'game-data.json');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

const COST_KEY_MAP = {
  manuals: 'Tactical Analysis',
  boards: 'Optical Storage Boards',
  fiber: 'Luminous Fiber',
  fuel: 'Nuclear Fuel Rod',
  coating: 'Antimatter Coating',
  alloy: 'Reinforced Alloy',
  neuronal: 'Neuronal Medium',
};

function mapCostKey(shortKey) {
  return COST_KEY_MAP[shortKey] || shortKey;
}

function parsePct(v) {
  if (v === '' || v === undefined || v === null) return 0;
  const s = String(v).replace('%', '').trim();
  return parseFloat(s) || 0;
}

function parseNum(v) {
  if (v === '' || v === undefined || v === null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/[^0-9.\-]/g, '')) || 0;
}

function isFormationFile(sheetNames) {
  return sheetNames.includes('Summary');
}

function isBehemothFile(sheetNames) {
  return sheetNames.some(s => /^MK\s+\S+$/.test(s)) && !isBehemothSkillsFile(sheetNames);
}

function isBehemothSkillsFile(sheetNames) {
  return sheetNames.some(s => /^MK\s+\S+\s+Skills$/.test(s));
}

function parseGenFromSheet(sheetName) {
  const m = sheetName.match(/^(MK\s+\S+)/);
  return m ? m[1] : '';
}

function isSpacecraftFile(sheetNames) {
  return sheetNames.some(n => n.startsWith('Capsule_') || n === 'AC04' || n.startsWith('Enterprise Capsule_'));
}

const FORMATION_GROUPS = [
  { name: 'Plasma Wings', offset: 0, count: 6 },
  { name: 'Plasma Fuselage', offset: 6, count: 7 },
  { name: 'Plasma Engine', offset: 13, count: 7 },
];

function parseFormation(wb) {
  const sheetNames = wb.SheetNames.filter(n => n !== 'Summary');
  const allItems = [];
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 3) continue;
    const levels = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lvl = parseInt(row[0], 10);
      if (!lvl) continue;
      const effectRaw = row[1];
      const manuals = parseNum(row[2]);
      const effectVal = parsePct(effectRaw);
      levels.push({
        level: lvl,
        costs: { [mapCostKey('manuals')]: manuals },
        bonuses: effectVal ? [{ type: 'Effect', value: effectVal, unit: '%' }] : []
      });
    }
    if (levels.length) {
      allItems.push({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        name,
        maxLevel: levels.length,
        levels
      });
    }
  }
  return FORMATION_GROUPS.map(g => ({
    name: g.name,
    items: allItems.slice(g.offset, g.offset + g.count),
  })).filter(group => group.items.length > 0);
}

function parseBehemoth(wb) {
  const items = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 3) continue;
    const levels = [];
    let rowIdx = 1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const tierName = String(row[0] || '').trim();
      if (!tierName) continue;
      const benefit = String(row[1] || '').trim();
      const infantryLethality = parsePct(row[2]) * 100;
      const infantryHealth = parsePct(row[3]) * 100;
      const riderLethality = parsePct(row[4]) * 100;
      const riderHealth = parsePct(row[5]) * 100;
      const hunterLethality = parsePct(row[6]) * 100;
      const hunterHealth = parsePct(row[7]) * 100;
      const skillUnlocked = String(row[8] || '').trim();
      const fragments = parseNum(row[9]);
      const costKey = name + ' Fragment';
      const bonuses = [];
      if (infantryLethality) bonuses.push({ type: 'Infantry Lethality', value: infantryLethality, unit: '%' });
      if (infantryHealth) bonuses.push({ type: 'Infantry Health', value: infantryHealth, unit: '%' });
      if (riderLethality) bonuses.push({ type: 'Rider Lethality', value: riderLethality, unit: '%' });
      if (riderHealth) bonuses.push({ type: 'Rider Health', value: riderHealth, unit: '%' });
      if (hunterLethality) bonuses.push({ type: 'Hunter Lethality', value: hunterLethality, unit: '%' });
      if (hunterHealth) bonuses.push({ type: 'Hunter Health', value: hunterHealth, unit: '%' });
      const entry = {
        level: rowIdx++,
        name: tierName,
        costs: { [costKey]: fragments },
        bonuses
      };
      if (benefit) entry.benefit = benefit;
      if (skillUnlocked && skillUnlocked !== '-') entry.skillsUnlocked = [skillUnlocked];
      levels.push(entry);
    }
    if (levels.length) {
      items.push({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        name,
        maxLevel: levels.length,
        levels
      });
    }
  }
  return items;
}

function parseCapsules(wb) {
  const items = [];
  for (const name of wb.SheetNames) {
    if (name === 'AC04') continue;
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 3) continue;
    const isEnterprise = name.startsWith('Enterprise Capsule_');
    const costKey1 = mapCostKey(isEnterprise ? 'fuel' : 'boards');
    const costKey2 = isEnterprise ? 'Superconducting Coil' : mapCostKey('fiber');
    const costCol1 = 3;
    const costCol2 = 4;
    const levels = [];
    let rowIdx = 1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const tierName = String(row[0] || '').trim();
      if (!tierName) continue;
      const healthLethality = parsePct(row[1]) * 100;
      const cost1 = parseNum(row[costCol1]);
      const cost2 = parseNum(row[costCol2]);
      const costs = {};
      if (cost1 > 0) costs[costKey1] = cost1;
      if (cost2 > 0) costs[costKey2] = cost2;
      const entry = {
        level: rowIdx++,
        name: tierName,
        costs,
        bonuses: healthLethality ? [{ type: 'Health/Lethality', value: healthLethality, unit: '%' }] : []
      };
      levels.push(entry);
    }
    if (levels.length) {
      items.push({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        name,
        maxLevel: levels.length,
        levels
      });
    }
  }
  return items;
}

function parseAircraft(wb) {
  const items = [];
  for (const name of wb.SheetNames) {
    if (name !== 'AC04') continue;
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 3) continue;
    const levels = [];
    let rowIdx = 1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const tierName = String(row[0] || '').trim();
      if (!tierName) continue;
      const healthLethality = parsePct(row[1]) * 100;
      const coating = parseNum(row[3]);
      const alloy = parseNum(row[4]);
      const costs = {};
      if (coating > 0) costs[mapCostKey('coating')] = coating;
      if (alloy > 0) costs[mapCostKey('alloy')] = alloy;
      const entry = {
        level: rowIdx++,
        name: tierName,
        costs,
        bonuses: healthLethality ? [{ type: 'Health/Lethality', value: healthLethality, unit: '%' }] : []
      };
      levels.push(entry);
    }
    if (levels.length) {
      items.push({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        name,
        maxLevel: levels.length,
        levels
      });
    }
  }
  return items;
}

function parseBehemothSkills(wb) {
  const groups = [];
  for (const sheetName of wb.SheetNames) {
    if (!/^MK\s+\S+\s+Skills$/.test(sheetName)) continue;
    const gen = parseGenFromSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!rows.length) continue;
    const treeMap = {};
    for (const row of rows) {
      const tree = String(row.Tree || '').trim();
      const skill = String(row.Skill || '').trim();
      if (!tree || !skill) continue;
      if (!treeMap[tree]) treeMap[tree] = {};
      if (!treeMap[tree][skill]) treeMap[tree][skill] = [];
      treeMap[tree][skill].push({ level: parseInt(row.Level, 10), benefit: row.Benefit, cost: parseNum(row['Neuronal Medium']) });
    }
    for (const [treeName, skills] of Object.entries(treeMap)) {
      const items = [];
      for (const [skillName, rows] of Object.entries(skills)) {
        const merged = {};
        for (const row of rows) {
          const gl = row.level;
          if (!merged[gl]) merged[gl] = { level: gl, costs: {}, bonuses: [], benefit: '' };
          if (row.cost > 0) merged[gl].costs[mapCostKey('neuronal')] = (merged[gl].costs[mapCostKey('neuronal')] || 0) + row.cost;
          const pct = parsePct(row.benefit);
          if (pct > 0) merged[gl].bonuses.push({ type: skillName, value: pct, unit: '%' });
          else merged[gl].benefit = row.benefit;
        }
        const entries = Object.values(merged).sort((a, b) => a.level - b.level).map(e => {
          if (!e.benefit) delete e.benefit;
          return e;
        });
        items.push({
          id: (treeName + '-' + skillName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          name: skillName,
          maxLevel: entries.length > 0 ? entries[entries.length - 1].level : 0,
          levels: entries,
        });
      }
      groups.push({ name: treeName, mk: gen, items });
    }
  }
  return groups;
}

function main() {
  ensureDir(JSON_DIR);
  const files = readdirSync(EXCEL_DIR).filter(f => f.endsWith('.xlsx'));
  if (!files.length) {
    console.log('No .xlsx files found in', EXCEL_DIR);
    return;
  }
  const categories = [];
  for (const file of files) {
    const wb = XLSX.readFile(join(EXCEL_DIR, file), { cellDates: true });
    const sheets = wb.SheetNames;
    if (isBehemothSkillsFile(sheets)) {
      categories.push({
        id: 'behemoth-skills',
        name: 'Behemoth Skills',
        groups: parseBehemothSkills(wb)
      });
    } else if (isFormationFile(sheets)) {
      categories.push({
        id: 'formation-system',
        name: 'Formation System',
        groups: parseFormation(wb)
      });
    } else if (isBehemothFile(sheets)) {
      categories.push({
        id: 'behemoth-enhancement',
        name: 'Behemoth Enhancement',
        items: parseBehemoth(wb)
      });
    } else if (isSpacecraftFile(sheets)) {
      const capsuleItems = parseCapsules(wb);
      if (capsuleItems.length) {
        const spacecraftGroup = { name: 'Spacecraft', items: capsuleItems.filter(i => !i.id.startsWith('enterprise-')) };
        const enterpriseGroup = { name: 'Enterprise', items: capsuleItems.filter(i => i.id.startsWith('enterprise-')) };
        categories.push({
          id: 'spacecraft',
          name: 'Spacecraft',
          groups: [spacecraftGroup, enterpriseGroup].filter(g => g.items.length > 0),
        });
      }
      const aircraftItems = parseAircraft(wb);
      if (aircraftItems.length) {
        categories.push({ id: 'aircraft', name: 'Aircraft', items: aircraftItems });
      }
    } else {
      console.warn(`Unknown file format: ${file}, skipping`);
    }
  }
  const data = {
    version: '1.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    categories
  };
  writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Wrote ${OUTPUT}`);
  console.log(`  Categories: ${categories.length}`);
  for (const cat of categories) {
    const count = cat.items ? cat.items.length : (cat.groups ? cat.groups.length : 0);
    console.log(`    ${cat.name}: ${count} ${cat.groups ? 'groups' : 'items'}`);
  }
}

main();
