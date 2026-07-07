async function main() {
  const html = (await (await fetch('https://state-of-survival.fandom.com/api.php?action=parse&page=Companion:_Behemoth_Mk_IV&prop=text&format=json')).json()).parse.text['*'];

  // Find h2 headings
  const headings = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/g);
  if (headings) {
    headings.forEach((h, i) => {
      const text = h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
      console.log('Heading', i, ':', text);
    });
  }

  // Find SKILLS heading text
  const skillsIdx = html.indexOf('BEHEMOTH MK IV SKILLS');
  console.log('\n"BEHEMOTH MK IV SKILLS" at:', skillsIdx);
  if (skillsIdx === -1) {
    // Try different casing
    const alt = html.indexOf('BEHEMOTH Mk IV SKILLS');
    console.log('"BEHEMOTH Mk IV SKILLS" at:', alt);
  }

  // Also check SEE ALSO
  const seeAlso = html.indexOf('SEE ALSO', skillsIdx > -1 ? skillsIdx : 0);
  console.log('"SEE ALSO" at:', seeAlso);
}

main().catch(e => { console.error(e); process.exit(1); });
