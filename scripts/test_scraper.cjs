const puppeteer = require('puppeteer');

async function testScraper() {
  console.log('🚀 Testing Scraper...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const nb = 'Cidade Nova';
  try {
    const query = encodeURIComponent(`Bairro ${nb}, Manaus, Amazonas`);
    const url = `https://www.google.com/maps/search/${query}`;
    
    console.log(`Searching for: ${nb}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Wait for URL to update with @lat,lng
    await page.waitForFunction('window.location.href.includes("@")', { timeout: 10000 }).catch(() => {});
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    const match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      console.log(`✅ SUCCESS! ${nb}: [${match[1]}, ${match[2]}]`);
    } else {
      console.log(`❌ FAILED: No coordinates in URL for ${nb}`);
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  } finally {
    await browser.close();
  }
}

testScraper();
