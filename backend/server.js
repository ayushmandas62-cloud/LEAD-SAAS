const express = require('express');
const cors = require('cors');
const { createObjectCsvStringifier } = require('csv-writer');
const db = require('./database');
const { scrapeYellowPages } = require('./scraper');
const { scrapeJustdial } = require('./justdial_scraper');

const app = express();
app.use(cors());
app.use(express.json());

// Trigger a scrape
app.post('/api/scrape', async (req, res) => {
  const { city, niche, source } = req.body;
  if (!city || !niche) {
    return res.status(400).json({ error: 'City and Niche are required' });
  }

  try {
    // Run asynchronously
    if (source === 'Justdial') {
      scrapeJustdial(city, niche).then(() => console.log('Justdial task finished'));
    } else {
      scrapeYellowPages(city, niche).then(() => console.log('YellowPages task finished'));
    }
    
    res.json({ message: 'Scrape started successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start scrape' });
  }
});

// Get leads
app.get('/api/leads', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM leads ORDER BY score DESC, created_at DESC');
    const leads = stmt.all();
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export CSV
app.get('/api/export', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM leads ORDER BY score DESC');
    const leads = stmt.all();

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'phone', title: 'Phone' },
        { id: 'category', title: 'Category' },
        { id: 'website', title: 'Website' },
        { id: 'score', title: 'Lead Score' },
        { id: 'city', title: 'City' },
        { id: 'source', title: 'Source' }
      ]
    });

    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(leads);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
    res.send(csvString);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
