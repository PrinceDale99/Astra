import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { ZkService } from './services/zk.service';
import { IndexerService } from './services/indexer.service';
import { OracleService } from './services/oracle.service';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Services
const indexerService = new IndexerService();
const oracleService = new OracleService();

// Schemas
const zkProofRequestSchema = z.object({
  collateralAmount: z.number().positive(),
  bondMaturityDate: z.number().positive(),
  institutionalSecret: z.string().min(1),
  requestedLoanXLM: z.number().positive(),
  oraclePriceXLM: z.number().positive(),
  minHealthFactor: z.number().min(100),
  currentTimestamp: z.number().positive(),
});

// Routes
app.get('/healthz', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    },
    rpcStatus: indexerService.isConnected() ? 'connected' : 'disconnected',
  });
});

app.post('/api/v1/zk/generate-proof', async (req, res) => {
  try {
    const data = zkProofRequestSchema.parse(req.body);
    const proof = await ZkService.generateProof(data);
    res.json(proof);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Validation Error' });
  }
});

app.post('/api/v1/zk/verify', async (req, res) => {
  try {
    const { proof, publicSignals } = req.body;
    const isValid = await ZkService.verifyProof(proof, publicSignals);
    res.json({ valid: isValid });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Verification Error' });
  }
});

app.get('/api/v1/deals/active/:borrowerAddress', (req, res) => {
  try {
    const { borrowerAddress } = req.params;
    const activeDeals = indexerService.getActiveDealsForBorrower(borrowerAddress);
    res.json({ deals: activeDeals });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server Error' });
  }
});

app.get('/api/v1/oracle/rates', async (req, res) => {
  try {
    const rates = await oracleService.getRates();
    res.json(rates);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Oracle Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Astra Repo Backend running on port ${PORT}`);
  indexerService.startPolling();
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  process.exit(0);
});
