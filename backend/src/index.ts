import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
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

app.get('/api/v1/analytics', async (req, res) => {
  try {
    const { dbService } = require('./services/db.service');

    // Get DB metrics
    const historicalTvl = await dbService.getHistoricalTvl();
    const activeInstitutionsCount = await dbService.getActiveInstitutionsCount();
    const dbDeals = await dbService.getRecentDeals();          // last 50 for activity table
    const totalDealsCount = await dbService.getTotalDealsCount(); // ✅ real COUNT(*)

    const recentActivity = dbDeals.map((deal: any) => ({
      id: deal.id.substring(0, 12) + '...',
      type: deal.type,
      amount: deal.amount,
      time: new Date(deal.time).toLocaleString(),
      status: deal.status,
      zkProof: deal.zkProof
    }));

    const healthFactors = dbDeals
      .filter((d: any) => d.health_factor !== null)
      .map((d: any) => d.health_factor);

    const realTvl = historicalTvl.length > 0 ? historicalTvl[historicalTvl.length - 1].tvl : 0;

    res.json({
      recentActivity,
      totalDeals: totalDealsCount,
      realTvl,
      parsedHealthFactors: healthFactors,
      historicalTvl,
      activeInstitutions: activeInstitutionsCount
    });
  } catch (error: any) {
    console.error('Analytics endpoint error:', error);
    res.status(500).json({ error: error.message || 'Error fetching analytics' });
  }
});

/**
 * GET /api/v1/config
 * Returns on-chain configuration so the frontend can resolve YLDS asset addresses
 * without hardcoding. Populate via environment variables after running setup_ylds.js.
 */
app.get('/api/v1/config', (req, res) => {
  const config = {
    astraRepoContractId: process.env.ASTRA_REPO_CONTRACT_ID || 'CDNDVKIT56I7ZQQB7ONPWRNLMEX4BCZ7UKJQZDWLL6L6XHW7IW6UX5US',
    nativeXlmSac: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    yldsSacId: process.env.YLDS_SAC_ID || '',
    yldsIssuer: process.env.YLDS_ISSUER || '',
    network: 'testnet',
  };
  res.json(config);
});

/**
 * POST /api/v1/faucet/ylds
 * Mints a small amount of YLDS to the requesting address so users can try the
 * protocol without needing their own YLDS supply.
 * Body: { address: string }
 */
app.post('/api/v1/faucet/ylds', async (req, res) => {
  const { address } = req.body || {};
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'address is required' });
  }

  const issuerSecret = process.env.YLDS_ISSUER_SECRET;
  const yldsSacId = process.env.YLDS_SAC_ID;

  if (!issuerSecret || !yldsSacId) {
    return res.status(503).json({ error: 'YLDS faucet not configured (missing env vars).' });
  }

  try {
    const { Keypair, Asset, Horizon, rpc: SorobanRpc, TransactionBuilder, Networks, Account, nativeToScVal, Contract } = await import('@stellar/stellar-sdk');
    const issuer = Keypair.fromSecret(issuerSecret);
    const ylds = new Asset('YLDS', issuer.publicKey());
    const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
    const soroban = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

    const FAUCET_AMOUNT_STROOPS = BigInt(10_000_0_000_000); // 10,000 YLDS

    // Transfer from contract reserves to user via YLDS SAC
    // (Contract holds the YLDS; use issuer to send from contract's balance)
    // Actually, issuer mints fresh YLDS to user
    const issuerAcct = await horizon.loadAccount(issuer.publicKey());
    const sacContract = new Contract(yldsSacId);
    const sourceAccount = new Account(issuer.publicKey(), issuerAcct.sequence);

    let tx = new TransactionBuilder(sourceAccount, {
      fee: '1000000',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(sacContract.call(
        'mint',
        nativeToScVal(address, { type: 'address' }),
        nativeToScVal(FAUCET_AMOUNT_STROOPS, { type: 'i128' }),
      ))
      .setTimeout(30)
      .build();

    const sim = await soroban.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      throw new Error('Simulation failed: ' + sim.error);
    }
    tx = SorobanRpc.assembleTransaction(tx, sim).build();
    tx.sign(issuer);

    const sendRes = await soroban.sendTransaction(tx);
    res.json({ success: true, hash: sendRes.hash, amount: '10000 YLDS' });
  } catch (error: any) {
    console.error('[faucet/ylds] Error:', error);
    res.status(500).json({ error: error.message || 'Faucet error' });
  }
});


// POST /api/v1/deals/record
// Called directly by the frontend immediately after a successful Freighter transaction.
// This is the primary write path — the on-chain indexer is the secondary/fallback.
app.post('/api/v1/deals/record', async (req, res) => {
  try {
    const { dbService } = require('./services/db.service');
    const {
      txHash,        // Stellar transaction hash
      dealId,        // on-chain deal counter (u64)
      borrower,      // G... address
      xlmAmount,     // XLM deposited (decimal, e.g. 100.5)
      yldsAmount,    // YLDS issued (decimal)
      type,          // 'created' | 'repaid' | 'liquidated'
      ledger,        // ledger sequence number
      timestamp,     // ISO string
    } = req.body;

    if (!txHash || !borrower || !type) {
      return res.status(400).json({ error: 'txHash, borrower, and type are required' });
    }

    const now = timestamp || new Date().toISOString();
    const xlm = Number(xlmAmount) || 0;
    const ylds = yldsAmount !== undefined ? Number(yldsAmount) : null;
    const deal_id = dealId !== undefined ? Number(dealId) : null;
    const ledgerNum = Number(ledger) || 0;

    // Record to recent_deals (activity table on analytics page)
    dbService.recordDeal({
      id: txHash,
      type: type === 'created' ? 'Repo Deal' : type === 'repaid' ? 'Repay' : 'Liquidation',
      amount: xlm,
      time: now,
      status: 'Verified',
      zkProof: 'Verified On-Chain',
      health_factor: null,
    });

    // Record to deal_history (history page)
    dbService.recordClosedDeal({
      id: txHash,
      deal_id,
      borrower,
      type,
      deposited_xlm: xlm,
      issued_ylds: ylds,
      closed_at: now,
      ledger: ledgerNum,
    });

    // Record institution
    dbService.recordInstitution(borrower);

    // Update TVL if this is a new deal
    if (type === 'created' && xlm > 0) {
      // Add to current TVL (approximate, indexer will reconcile)
      dbService.recordTvl(String(Math.round(xlm * 1e7)));
    }

    // Broadcast to WebSocket clients
    broadcastToClients({
      type: 'NEW_DEAL',
      payload: {
        id: txHash,
        type: type === 'created' ? 'Repo Deal' : type === 'repaid' ? 'Repay' : 'Liquidation',
        amount: xlm,
        borrower,
        deal_id,
        time: now,
        status: 'Verified',
        zkProof: 'Verified On-Chain',
      },
    });

    console.log(`[record] ${type} deal by ${borrower.substring(0, 8)}... | ${xlm} XLM | tx=${txHash.substring(0, 12)}...`);
    res.json({ success: true, recorded: { txHash, type, xlm, deal_id } });
  } catch (error: any) {
    console.error('[record] Error:', error);
    res.status(500).json({ error: error.message || 'Record error' });
  }
});

// GET /api/v1/deals/history - paginated closed deal history
app.get('/api/v1/deals/history', async (req, res) => {
  try {
    const { dbService } = require('./services/db.service');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const borrower = typeof req.query.borrower === 'string' ? req.query.borrower : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const result = await dbService.getClosedDeals(page, limit, borrower, type);
    res.json({ ...result, page, limit });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching deal history' });
  }
});

// GET /api/v1/deals/:dealId/margin - live margin ratio for a deal
app.get('/api/v1/deals/:dealId/margin', async (req, res) => {
  try {
    const { dealId } = req.params;
    const dealIdNum = Number(dealId);
    if (isNaN(dealIdNum) || dealIdNum < 1) {
      return res.status(400).json({ error: 'Invalid dealId' });
    }
    const { rpc: SorobanRpc, Contract, nativeToScVal, scValToNative, TransactionBuilder, Networks, Keypair, Account } = await import('@stellar/stellar-sdk');
    const contractId = process.env.ASTRA_REPO_CONTRACT_ID || 'CDNDVKIT56I7ZQQB7ONPWRNLMEX4BCZ7UKJQZDWLL6L6XHW7IW6UX5US';
    const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
    const contract = new Contract(contractId);
    // Use a throw-away keypair as the source for read-only simulation
    const source = Keypair.random();
    const latestLedger = await server.getLatestLedger();
    const sourceAccount = new Account(source.publicKey(), '0');
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(contract.call('get_margin_ratio', nativeToScVal(BigInt(dealIdNum), { type: 'u64' })))
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      return res.status(404).json({ error: 'Deal not found or contract error', detail: sim.error });
    }
    const retval = (sim as any).result?.retval;
    const marginRatio = retval ? Number(scValToNative(retval)) : null;
    res.json({ dealId: dealIdNum, marginRatio });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Margin ratio error' });
  }
});

// POST /api/v1/deals/:dealId/restore - build a restore footprint transaction
app.post('/api/v1/deals/:dealId/restore', async (req, res) => {
  try {
    const { dealId } = req.params;
    const dealIdNum = Number(dealId);
    if (isNaN(dealIdNum) || dealIdNum < 1) {
      return res.status(400).json({ error: 'Invalid dealId' });
    }
    // Return instructions for the frontend to build a RestoreFootprint + restore_deal tx
    // The actual signing happens client-side via Freighter
    const contractId = process.env.ASTRA_REPO_CONTRACT_ID || 'CDNDVKIT56I7ZQQB7ONPWRNLMEX4BCZ7UKJQZDWLL6L6XHW7IW6UX5US';
    res.json({
      dealId: dealIdNum,
      contractId,
      network: 'testnet',
      function: 'restore_deal',
      args: [{ type: 'u64', value: dealIdNum }],
      message: 'Sign and submit this RestoreFootprint transaction via Freighter to restore the archived deal.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Restore error' });
  }
});

// POST /api/v1/passkey/register - register Secp256r1 passkey credential on-chain
app.post('/api/v1/passkey/register', async (req, res) => {
  try {
    const { walletAddress, credentialId, publicKey } = req.body;
    if (!walletAddress || !credentialId || !publicKey) {
      return res.status(400).json({ error: 'walletAddress, credentialId, and publicKey are required' });
    }
    // Return contract call info for frontend to sign and submit via Freighter
    const contractId = process.env.ASTRA_REPO_CONTRACT_ID || 'CDNDVKIT56I7ZQQB7ONPWRNLMEX4BCZ7UKJQZDWLL6L6XHW7IW6UX5US';
    res.json({
      contractId,
      function: 'register_passkey',
      args: [
        { type: 'address', value: walletAddress },
        { type: 'bytes', value: credentialId },
        { type: 'bytes', value: publicKey }
      ],
      message: 'Sign and submit this transaction via Freighter to register your passkey on-chain.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Passkey registration error' });
  }
});

// Create HTTP server wrapping Express
const httpServer = http.createServer(app);

// WebSocket server for real-time deal broadcasting
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Wire the indexer to broadcast new events via WebSocket
indexerService.setBroadcast(broadcastToClients);

httpServer.listen(PORT, () => {
  console.log(`Astra Repo Backend running on port ${PORT}`);
  indexerService.startPolling();
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  process.exit(0);
});
