import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, {
    clients: [],
    operations: [],
    parts: [],
    workOrders: [],
    employees: [],
    teams: [],
    assignments: [],
    skills: [],
    materials: [],
    nonConformities: [],
    subcontractings: [],
    assemblies: [],
    quotes: [],
    timeEntries: [],
    inboundRequests: [],
    bendingSettings: {
      hourlyRate: 85,
      rateWithSecondOperator: 150,
      timePerBend: 1,
      timePerFlip: 0.5,
      setupTimePerSetup: 30,
      neopreneTimePerBend: 1,
      timePerReverse: 0
    },
    laserSettings: {
      machineHourlyRate: 325,
      setupHourlyRate: 65,
      electricityCostPerkW: 0.47,
      gasConsumption6kW: 5,
      gasConsumption12kW: 7,
      costPerPierce: 0.1,
      sheetChangeTimeMinutes: 10,
      sheetChangeHourlyRate: 65
    }
  });
}

// Middleware
app.use(express.json({ limit: '50mb' }));

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/data', async (_req, res) => {
  try {
    const data = await fs.readJson(DATA_FILE);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    await fs.writeJson(DATA_FILE, req.body, { spaces: 2 });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Vite middleware
try {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
} catch (err) {
  console.error('Failed to initialize Vite middleware:', err);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
