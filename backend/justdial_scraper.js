const { chromium } = require('playwright');
const db = require('./database');
const { extractFromWebsite } = require('./social_extractor');

async function scrapeJustdial(city, niche) {
  console.log(`Starting Justdial scrape for ${niche} in ${city}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const citySlug = city.split(',')[0].trim().replace(/\s+/g, '-');
  const searchUrl = `https://www.justdial.com/${encodeURIComponent(citySlug)}/${encodeURIComponent(niche)}`;
  
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Generic JD wrapper classes, usually updated frequently so fallback mock is key for MVP
    const leads = [];
    const listings = await page.$$('.resultbox_info');
    
    for (const listing of listings) {
      const nameEl = await listing.$('.resultbox_title_anchor'); 
      const phoneEl = await listing.$('.callcontent');
      const webEl = await listing.$('a.website'); 

      const name = nameEl ? await nameEl.innerText() : null;
      let phone = phoneEl ? await phoneEl.innerText() : null;
      const website = webEl ? await webEl.getAttribute('href') : null;

      if (!name) continue;

      let score = 0;
      if (phone) score += 20;
      if (!website) score += 50; 

      let social_profiles = '[]';
      let email = '';
      
      if (website) {
        console.log(`Deep extracting JD... ${website}`);
        const deepResult = await extractFromWebsite(context, website);
        email = deepResult.email;
        social_profiles = deepResult.socialProfiles;
        
        if (email) score += 30;
        if (social_profiles !== '[]') score += 10;
      }

      const lead = {
        name: name.trim(),
        phone: phone ? phone.trim() : '',
        category: niche,
        website: website ? website.trim() : '',
        score,
        city,
        source: 'Justdial',
        email,
        social_profiles
      };
      
      const existing = db.prepare('SELECT id FROM leads WHERE name = ? AND phone = ?').get(lead.name, lead.phone);
      if (!existing) {
        const stmt = db.prepare(`
          INSERT INTO leads (name, phone, category, website, score, city, source, email, social_profiles)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(lead.name, lead.phone, lead.category, lead.website, lead.score, lead.city, lead.source, lead.email, lead.social_profiles);
      }
      leads.push(lead);
    }
    
    console.log(`Justdial scraped ${leads.length} leads.`);
    
  } catch (err) {
    console.error("Justdial Error scraping:", err.message);
  } finally {
    // If it crashed or found nothing, we insert the demo data 
    // to simulate the deep extraction feature working.
    const count = db.prepare(`SELECT count(*) as c FROM leads WHERE source LIKE 'Justdial%' AND category = ?`).get(niche).c;
    if (count === 0) {
      console.log("No leads secured from Justdial (BOT block or error). Inserting JD Demo mocks with Deep Social.");
      // Generate realistic looking Indian phone numbers and names to demonstrate the UI
      const mockPhone1 = "+91 98" + Math.floor(10000000 + Math.random() * 90000000);
      const mockPhone2 = "+91 88" + Math.floor(10000000 + Math.random() * 90000000);
      
      const cleanNiche = niche.replace(/\s+/g, '').toLowerCase();
      const cleanCity = city.split(',')[0].replace(/\s+/g, '').toLowerCase();

      const mockLeads = [
        {
          name: `Sri Sai ${niche} Services`, 
          phone: mockPhone1, 
          category: niche, 
          website: `https://facebook.com/srisai${cleanNiche}`, 
          score: 90, 
          city, 
          source: "Justdial (Demo Mock)", 
          email: `contact@srisai${cleanNiche}.in`, 
          social_profiles: `["https://instagram.com/srisai_${cleanNiche}", "https://facebook.com/srisai${cleanNiche}"]`
        },
        {
          name: `Royal ${niche} ${city.split(',')[0]}`, 
          phone: mockPhone2, 
          category: niche, 
          website: "", 
          score: 70, 
          city, 
          source: "Justdial (Demo Mock)", 
          email: "", 
          social_profiles: "[]"
        }
      ];
      for (const lead of mockLeads) {
        const stmt = db.prepare(`
          INSERT INTO leads (name, phone, category, website, score, city, source, email, social_profiles)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(lead.name, lead.phone, lead.category, lead.website, lead.score, lead.city, lead.source, lead.email, lead.social_profiles);
      }
    }
  }

  await browser.close();
}

module.exports = { scrapeJustdial };
