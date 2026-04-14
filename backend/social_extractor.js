async function extractFromWebsite(context, url) {
  let email = '';
  let socialProfiles = [];
  
  if (!url || url.trim() === '') return { email, socialProfiles: JSON.stringify(socialProfiles) };

  try {
    const page = await context.newPage();
    // 10s timeout since many local business sites are slow or dead, we don't want to hang
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    const isSocial = url.includes('facebook.com') || url.includes('instagram.com') || url.includes('linkedin.com');
    if (isSocial) {
      socialProfiles.push(url);
    } else {
      // Find social links on the regular website
      const hrefs = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href));
      const socialLinks = hrefs.filter(h => h.includes('facebook.com') || h.includes('instagram.com') || h.includes('twitter.com') || h.includes('linkedin.com'));
      socialProfiles = [...new Set(socialLinks)].slice(0, 3); // keep unique up to 3
    }
    
    // Extract Email via regex from body text
    const pageText = await page.evaluate(() => document.body.innerText);
    const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      email = emailMatch[0];
    } else {
      // try mailto
      const mailtos = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href));
      if (mailtos.length > 0) {
        email = mailtos[0].replace('mailto:', '').split('?')[0];
      }
    }
    
    await page.close();
  } catch (e) {
    // Ignore timeout and navigation errors, keep going
    console.log(`Failed to deep extract from ${url}: ${e.message}`);
  }
  
  return { email, socialProfiles: JSON.stringify(socialProfiles) };
}

module.exports = { extractFromWebsite };
