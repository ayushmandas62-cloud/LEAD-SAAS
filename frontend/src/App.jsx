import React, { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [city, setCity] = useState('');
  const [niche, setNiche] = useState('');
  const [source, setSource] = useState('YellowPages');
  const [leads, setLeads] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchLeads = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leads`);
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error("Failed to fetch leads", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // Poll for new leads every 5 seconds if scraping
    let interval;
    if (isScraping) {
      interval = setInterval(fetchLeads, 5000);
    }
    return () => clearInterval(interval);
  }, [isScraping]);

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!city || !niche) return;
    setIsScraping(true);
    try {
      await fetch(`${apiUrl}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, niche, source })
      });
      // The scrape happens in the background, clear scraping loading state after a sensible default
      setTimeout(() => setIsScraping(false), 20000); 
    } catch (err) {
      console.error(err);
      setIsScraping(false);
    }
  };

  const handleExport = () => {
    window.location.href = `${apiUrl}/api/export`;
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>LeadGen MVP</h1>
        <button className="btn btn-secondary" onClick={handleExport}>
          📥 Export CSV
        </button>
      </header>

      <section className="glass-panel">
        <form onSubmit={handleScrape}>
          <div className="form-group">
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g., Plumbers" 
              value={niche}
              onChange={e => setNiche(e.target.value)}
              required
            />
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g., Austin, TX" 
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
            <select 
              className="input-field" 
              value={source} 
              onChange={e => setSource(e.target.value)}
              style={{maxWidth: '160px'}}
            >
              <option value="YellowPages">Yellow Pages</option>
              <option value="Justdial">Justdial</option>
            </select>
            <button type="submit" className="btn" disabled={isScraping}>
              {isScraping ? <span className="loading-spinner"></span> : '🚀 Start Scraping'}
            </button>
          </div>
          {isScraping && <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem'}}>Scraping {source} in progress. Leads will auto-refresh...</p>}
        </form>
      </section>

      <section className="glass-panel" style={{padding: 0}}>
        <div className="table-container">
          {loadingLeads ? (
            <div className="empty-state">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="empty-state">No leads found. Start a scrape!</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Category</th>
                  <th>Phone</th>
                  <th>Website</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  let socials = [];
                  try { if (lead.social_profiles) socials = JSON.parse(lead.social_profiles); } catch(e){}
                  return (
                  <tr key={lead.id}>
                    <td style={{fontWeight: 500}}>{lead.name}</td>
                    <td>{lead.category}</td>
                    <td>{lead.phone || <span style={{color: 'var(--text-secondary)'}}>No phone</span>}</td>
                    <td>
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)', textDecoration: 'none'}}>Visit Site</a>
                      ) : (
                        <span className="badge badge-warning">No Website</span>
                      )}
                      {lead.email && <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px'}}>{lead.email}</div>}
                      
                      {socials.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {socials.map((url, i) => {
                            let handle = "Link";
                            let type = "Social";
                            if (url.includes('instagram.com/')) {
                              handle = '@' + (url.split('instagram.com/')[1] || '').split('/')[0];
                              type = "IG";
                            } else if (url.includes('facebook.com/')) {
                              handle = '/'+(url.split('facebook.com/')[1] || '').split('/')[0];
                              type = "FB";
                            } else if (url.includes('linkedin.com/')) {
                              type = "IN";
                            }
                            return (
                              <a key={i} href={url} target="_blank" rel="noreferrer" style={{fontSize: '0.7rem', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', textDecoration: 'none', color: 'var(--primary-color)', border: '1px solid var(--border-color)'}}>
                                <strong>{type}</strong> {handle !== 'Link' ? handle : ''}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${lead.score >= 50 ? 'badge-high-score' : ''}`}>
                        {lead.score}
                      </span>
                    </td>
                    <td>
                      {lead.score >= 50 ? <span className="badge badge-success">High Potential</span> : '-'}
                      {lead.source.includes('Demo') && <span className="badge badge-warning" style={{marginLeft: '4px', fontSize: '10px'}}>Demo</span>}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
