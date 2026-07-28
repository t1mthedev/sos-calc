const s = `<div class="mw-collapsible mw-collapsed" id="mw-customcollapsible-1">AAA</div></div><div class="mw-collapsible mw-collapsed" id="mw-customcollapsible-2">BBB</div></div>`;
const re = /<div class="mw-collapsible[^"]*"[^>]*id="[^"]*">([\s\S]*?)<\/div>\s*<\/div>/g;
let m;
while ((m = re.exec(s)) !== null) {
  console.log('Match:', m[1].substring(0, 30));
}