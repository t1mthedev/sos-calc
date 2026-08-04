import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGE = 'War_Vehicles_-_Infantry';

const VEHICLES = [
  { section: 4, name: 'Ravager', gen: 'Purple' },
  { section: 1, name: 'Inferno Striker Mk I', gen: 'Gen 1' },
  { section: 3, name: 'Doomwheel', gen: 'Gen 2' },
];

async function fetchSectionHTML(pageName, section) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&section=${section}&prop=text&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pageName}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error(`No parse data for ${pageName}`);
  return data.parse.text['*'];
}

function stripTags(s) {
  return s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();
}

function parseNum(s) {
  if (s === undefined || s === null || s === '' || s === '-') return 0;
  return parseInt(String(s).replace(/,/g, '').trim(), 10) || 0;
}

// Returns the index just after the matching </div> for a <div> starting at startIdx.
function findMatchingDiv(html, startIdx) {
  const divRe = /<div\b|<\/div>/g;
  divRe.lastIndex = startIdx;
  let depth = 0;
  let m;
  while ((m = divRe.exec(html)) !== null) {
    if (m[0] === '<div') {
      const tagEnd = html.indexOf('>', m.index);
      if (html[tagEnd - 1] === '/') continue;
      depth++;
    } else {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    }
  }
  return -1;
}

// Extract the Enhancements tab content div from a vehicle section.
function extractEnhancements(html) {
  const enhTabIdx = html.indexOf('data-hash="Enhancements"');
  if (enhTabIdx === -1) return null;
  const ulStart = html.lastIndexOf('<ul class="wds-tabs"', enhTabIdx);
  if (ulStart === -1) return null;
  const ulClose = html.indexOf('</ul>', enhTabIdx);
  if (ulClose === -1) return null;
  const wrapperClose = html.indexOf('</div>', ulClose);
  if (wrapperClose === -1) return null;
  const afterWrapper = wrapperClose + '</div>'.length;

  // Content divs follow the tabs wrapper: [Levels, Enhancements, Skills].
  const firstContent = html.indexOf('<div class="wds-tab__content', afterWrapper);
  if (firstContent === -1) return null;
  const firstContentEnd = findMatchingDiv(html, firstContent);
  const enhContentStart = html.indexOf('<div class="wds-tab__content', firstContentEnd);
  if (enhContentStart === -1) return null;
  const enhContentEnd = findMatchingDiv(html, enhContentStart);
  return html.slice(enhContentStart, enhContentEnd);
}

// Split the Enhancements tab into its nested rarity tabber content divs.
function extractRarityTabs(enhContent) {
  const ulStart = enhContent.indexOf('<ul class="wds-tabs"');
  if (ulStart === -1) return [];
  const ulClose = enhContent.indexOf('</ul>', ulStart);
  if (ulClose === -1) return [];
  const hashes = [...enhContent.slice(ulStart, ulClose).matchAll(/data-hash="([^"]+)"/g)].map(m => m[1]);
  const wrapperClose = enhContent.indexOf('</div>', ulClose);
  if (wrapperClose === -1) return [];
  let pos = wrapperClose + '</div>'.length;
  const tabs = [];
  for (const hash of hashes) {
    const contentStart = enhContent.indexOf('<div class="wds-tab__content', pos);
    if (contentStart === -1) break;
    const contentEnd = findMatchingDiv(enhContent, contentStart);
    tabs.push({ hash, content: enhContent.slice(contentStart, contentEnd) });
    pos = contentEnd;
  }
  return tabs;
}

function parseCell(cellHtml) {
  const titleMatch = cellHtml.match(/title="([^"]+)"/);
  return { text: stripTags(cellHtml), title: titleMatch ? titleMatch[1] : null };
}

// Parse one rarity table into rows of { Level, statCells, costCells }.
function parseRarityTable(content) {
  const tableMatch = content.match(/<table[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return null;
  const tableBody = tableMatch[1];

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const rows = [];
  let m;
  while ((m = rowRe.exec(tableBody)) !== null) {
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = cellRe.exec(m[1])) !== null) {
      const parsed = parseCell(c[1]);
      if (parsed.text === '' && parsed.title === null) continue;
      cells.push(parsed);
    }
    rows.push(cells);
  }

  // Header row: first cell contains an image (star icon). Re-scan raw HTML per row.
  let headerRowIdx = -1;
  const rowHtmlRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let idx = 0;
  while ((m = rowHtmlRe.exec(tableBody)) !== null) {
    if (/<img/i.test(m[1])) { headerRowIdx = idx; break; }
    idx++;
  }
  if (headerRowIdx === -1) return null;
  const headerCells = rows[headerRowIdx];

  const statNames = [];
  const costNames = [];
  for (const cell of headerCells) {
    if (cell.title) costNames.push(cell.title);
    else if (cell.text) statNames.push(cell.text);
  }

  const dataRows = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 0) continue;
    const levelText = r[0].text;
    if (!/^(Ascend|\d+)$/i.test(levelText)) continue;
    const stats = r.slice(1, 1 + statNames.length);
    const costs = r.slice(1 + statNames.length);
    dataRows.push({ level: levelText, stats, costs });
  }

  return { statNames, costNames, dataRows };
}

async function scrapeVehicle(vehicle) {
  const html = await fetchSectionHTML(PAGE, vehicle.section);
  const enhContent = extractEnhancements(html);
  if (!enhContent) {
    console.warn(`  ${vehicle.name}: no Enhancements tab found`);
    return [];
  }
  const tabs = extractRarityTabs(enhContent);
  const rows = [];
  let costTotals = {};
  for (const tab of tabs) {
    if (tab.hash === 'Enhancements_Costs') continue;
    const parsed = parseRarityTable(tab.content);
    if (!parsed) {
      console.warn(`  ${vehicle.name} / ${tab.hash}: no table parsed`);
      continue;
    }
    let fragTotal = 0;
    for (const d of parsed.dataRows) {
      const stat1 = parsed.statNames[0] || '';
      const stat2 = parsed.statNames[1] || '';
      const cost1Name = parsed.costNames[0] || '';
      const cost2Name = parsed.costNames[1] || '';
      const cost1 = d.costs[0] ? parseNum(d.costs[0].text) : 0;
      const cost2 = d.costs[1] ? parseNum(d.costs[1].text) : 0;
      const row = {
        Rarity: tab.hash,
        Level: d.level,
        Stat1Name: stat1,
        Stat1: d.stats[0] ? d.stats[0].text : '',
        Stat2Name: stat2,
        Stat2: d.stats[1] ? d.stats[1].text : '',
      };
      if (cost1Name) { row.Cost1Name = cost1Name; row.Cost1 = cost1; }
      if (cost2Name) { row.Cost2Name = cost2Name; row.Cost2 = cost2; }
      rows.push(row);
      if (/Fragment$/i.test(cost1Name)) fragTotal += cost1;
      if (/Fragment$/i.test(cost2Name)) fragTotal += cost2;
    }
    costTotals[tab.hash] = fragTotal;
  }

  // Validate fragment totals against the Enhancements Costs tab.
  const costsTab = tabs.find(t => t.hash === 'Enhancements_Costs');
  if (costsTab) {
    const tableMatch = costsTab.content.match(/<table[^>]*>([\s\S]*?)<\/table>/);
    if (tableMatch) {
      const wikiTotals = {};
      const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      let m;
      while ((m = rowRe.exec(tableMatch[1])) !== null) {
        const cells = [];
        const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
        let c;
        while ((c = cellRe.exec(m[1])) !== null) cells.push(stripTags(c[1]));
        if (cells.length >= 2) {
          const name = cells[0];
          const val = parseNum(cells[cells.length - 1]);
          if (name && val > 0) wikiTotals[name] = val;
        }
      }
      for (const [rarity, scraped] of Object.entries(costTotals)) {
        const wikiVal = wikiTotals[rarity];
        if (wikiVal !== undefined && wikiVal !== scraped) {
          console.warn(`  WARNING ${vehicle.name} ${rarity}: scraped ${scraped} vs wiki ${wikiVal}`);
        }
      }
    }
  }

  return rows;
}

async function main() {
  const wb = XLSX.utils.book_new();
  for (const vehicle of VEHICLES) {
    console.log(`Scraping ${vehicle.name} (${vehicle.gen}) section ${vehicle.section}...`);
    const rows = await scrapeVehicle(vehicle);
    const rarityCount = new Set(rows.map(r => r.Rarity)).size;
    console.log(`  ${rows.length} enhancement rows across ${rarityCount} rarities`);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), vehicle.name.slice(0, 31));
  }
  const dir = join(__dirname, '..', 'src', 'data', 'excel');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const out = join(dir, 'vehicles.xlsx');
  XLSX.writeFile(wb, out);
  console.log(`Written to ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
