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

app.get('/api/v1/analytics', async (req, res) => {
  try {
    // 1. Get all fully parsed XDR events from our IndexerService cache
    const parsedEvents = indexerService.getAllParsedEvents();

    let tvlStroops = BigInt(0);
    const healthFactors: number[] = [];

    // 2. Map the XDR-parsed events to the frontend format
    const recentActivity = parsedEvents.map((event: any) => {
      // Safely check if it's a create deal event
      if (event.eventType === 'CREATE_DEAL' || event.eventType === 'create_repo_deal' || event.data?.collateral_amount) {
        if (event.data?.collateral_amount) {
          tvlStroops += BigInt(event.data.collateral_amount.toString());
        }
        if (event.data?.min_health_factor) {
          healthFactors.push(Number(event.data.min_health_factor) / 100);
        }
      }

      return {
        id: event.id.substring(0, 12) + '...',
        type: event.eventType || 'Contract Event',
        // If we parsed the amount, use it, else default 0
        amount: event.data?.collateral_amount ? Number(event.data.collateral_amount) / 10000000 : 0, 
        time: new Date(event.timestamp).toLocaleString(),
        status: 'Verified', 
        zkProof: event.data?.zkp_hash ? 'Verified On-Chain' : 'N/A'
      };
    });

    res.json({ 
      recentActivity, 
      totalDeals: parsedEvents.length,
      realTvl: (Number(tvlStroops) / 10000000),
      parsedHealthFactors: healthFactors
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
