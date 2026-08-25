import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fetchPageHTML(pageName) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&prop=text&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pageName}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error(`No parse data for ${pageName}`);
  return data.parse.text['*'];
}

function extractTabContents(tabberHtml) {
  const contents = [];
  const tabsStart = tabberHtml.indexOf('<div class="wds-tab__content');
  if (tabsStart === -1) return contents;
  let remaining = tabberHtml.substring(tabsStart);
  while (remaining.startsWith('<div class="wds-tab__content')) {
    const tagEnd = remaining.indexOf('>');
    if (tagEnd === -1) break;
    const after = remaining.substring(tagEnd + 1);
    let depth = 1, p = 0;
    while (depth > 0 && p < after.length) {
      const o = after.indexOf('<div', p);
      const c = after.indexOf('</div>', p);
      if (c === -1) break;
      if (o !== -1 && o < c) { depth++; p = o + 4; }
      else { depth--; p = c + 6; }
    }
    contents.push(after.substring(0, p));
    remaining = after.substring(p);
  }
  return contents;
}

function extractTabNames(tabberHtml) {
  const names = [];
  const m = tabberHtml.match(/<ul class="wds-tabs">([\s\S]*?)<\/ul>/);
  if (!m) return names;
  const liRe = /<li[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/g;
  let r;
  while ((r = liRe.exec(m[1])) !== null) {
    names.push(r[1].replace(/<[^>]+>/g, '').trim());
  }
  return names;
}

function findSection(html, heading) {
  const idx = html.indexOf(heading);
  if (idx === -1) return '';
  const nextH2 = html.indexOf('<h2', idx + heading.length);
  return nextH2 !== -1 ? html.substring(idx, nextH2) : html.substring(idx);
}

function parseNum(v) {
  if (v === '' || v === undefined || v === null) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, '').trim();
  return parseFloat(s) || 0;
}

function cleanCell(cellHtml) {
  return cellHtml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ').replace(/\n/g, '').trim();
}

function parseUpgradeTable(tableHtml) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let r;
  while ((r = rowRe.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
    let c;
    while ((c = cellRe.exec(r[1])) !== null) cells.push(cleanCell(c[1]));
    if (cells.length < 12) continue;

    // Skip header/summary rows
    if (/level/i.test(cells[0]) && /materials/i.test(cells[1])) continue;
    if (/total requirements/i.test(cells[0])) continue;
    if (/for one (slot|category|all)/i.test(cells[0])) continue;
    if (/command manuals|tactical guides|service badge/i.test(cells[1])) continue;
    if (cells[0] === '' && cells[6] === '') continue;

    // Parse left half (cols 0-5) and right half (cols 6-11)
    for (const offset of [0, 6]) {
      const levelRaw = cells[offset];
      const cmdManual = parseNum(cells[offset + 1]);
      const svcBadge = parseNum(cells[offset + 2]);
      const tacGuide = parseNum(cells[offset + 3]);
      const attackRaw = cells[offset + 4];
      const defenseRaw = cells[offset + 5];

      // Parse level from "N~M" or "N-M" format
      const levelMatch = levelRaw.match(/(\d+)\s*[~-]\s*(\d+)/);
      if (!levelMatch) continue;
      const fromLevel = parseInt(levelMatch[1], 10);
      const toLevel = parseInt(levelMatch[2], 10);
      if (isNaN(fromLevel) || isNaN(toLevel)) continue;

      // Parse bonuses
      const bonuses = [];
      const attackMatch = attackRaw.match(/([\d.]+)%/);
      const defenseMatch = defenseRaw.match(/([\d.]+)%/);
      if (attackMatch) {
        bonuses.push({ type: 'Attack', value: parseFloat(attackMatch[1]), unit: '%' });
      }
      if (defenseMatch) {
        bonuses.push({ type: 'Defense', value: parseFloat(defenseMatch[1]), unit: '%' });
      }

      // Build costs object
      const costs = {};
      if (cmdManual > 0) costs['Command Manual'] = cmdManual;
      if (svcBadge > 0) costs['Service Badge'] = svcBadge;
      if (tacGuide > 0) costs['Tactical Guide'] = tacGuide;

      rows.push({
        level: toLevel,
        name: `${fromLevel}~${toLevel}`,
        costs,
        bonuses,
      });
    }
  }
  return rows;
}

async function main() {
  console.log('Fetching Hero Appointment wiki page...');
  const html = await fetchPageHTML('Hero_Appointment');

  // Find the "Slot Enhancement and Benefits" section
  const section = findSection(html, 'Slot Enhancement and Benefits');
  if (!section) {
    console.error('Could not find "Slot Enhancement and Benefits" section');
    process.exit(1);
  }

  // Find the tabber within this section
  const tabberStart = section.indexOf('<div class="tabber wds-tabber">');
  if (tabberStart === -1) {
    console.error('Could not find tabber in section');
    process.exit(1);
  }

  // Extract the full tabber
  let depth = 1, p = section.indexOf('>', tabberStart) + 1;
  while (depth > 0 && p < section.length) {
    const o = section.indexOf('<div', p);
    const c = section.indexOf('</div>', p);
    if (c === -1) break;
    if (o !== -1 && o < c) { depth++; p = o + 4; }
    else { depth--; p = c + 6; }
  }
  const tabberHtml = section.substring(tabberStart, p);

  const tabNames = extractTabNames(tabberHtml);
  const tabContents = extractTabContents(tabberHtml);
  console.log('Tabs found:', tabNames);

  const positions = {
    0: ['Defensive Strategist', 'Flag Bearer', 'Vanguard'],
    1: ['Military Advisor', 'Reservoir Commando', 'Reservoir Tactician'],
  };

  const wb = XLSX.utils.book_new();

  for (let i = 0; i < tabContents.length && i < 2; i++) {
    const tabContent = tabContents[i];
    const posNames = positions[i];

    // Find the wikitable in this tab content
    const tableMatch = tabContent.match(/<table[^>]*class="wikitable"[^>]*>([\s\S]*?)<\/table>/);
    if (!tableMatch) {
      console.warn(`No wikitable found for tab ${i} (${tabNames[i]})`);
      continue;
    }

    const rows = parseUpgradeTable(tableMatch[1]);
    console.log(`  ${tabNames[i]}: ${rows.length} level rows parsed`);

    // All 3 positions in this tab share the same data
    for (const posName of posNames) {
      const sheetData = rows.map(r => ({
        Level: r.level,
        'Command Manual': r.costs['Command Manual'] || 0,
        'Service Badge': r.costs['Service Badge'] || 0,
        'Tactical Guide': r.costs['Tactical Guide'] || 0,
        'Bonus Type': r.bonuses.map(b => b.type).join(', ') || '',
        'Bonus Value': r.bonuses.map(b => `${b.value}%`).join(', ') || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), posName);
    }
  }

  const dir = join(__dirname, '..', 'src', 'data', 'excel');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const out = join(dir, 'hero_appointment.xlsx');
  XLSX.writeFile(wb, out);
  console.log(`Written to ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
