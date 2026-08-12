"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const zk_service_1 = require("./services/zk.service");
const indexer_service_1 = require("./services/indexer.service");
const oracle_service_1 = require("./services/oracle.service");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Services
const indexerService = new indexer_service_1.IndexerService();
const oracleService = new oracle_service_1.OracleService();
// Schemas
const zkProofRequestSchema = zod_1.z.object({
    collateralAmount: zod_1.z.number().positive(),
    bondMaturityDate: zod_1.z.number().positive(),
    institutionalSecret: zod_1.z.string().min(1),
    requestedLoanXLM: zod_1.z.number().positive(),
    oraclePriceXLM: zod_1.z.number().positive(),
    minHealthFactor: zod_1.z.number().min(100),
    currentTimestamp: zod_1.z.number().positive(),
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
        const proof = await zk_service_1.ZkService.generateProof(data);
        res.json(proof);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Validation Error' });
    }
});
app.post('/api/v1/zk/verify', async (req, res) => {
    try {
        const { proof, publicSignals } = req.body;
        const isValid = await zk_service_1.ZkService.verifyProof(proof, publicSignals);
        res.json({ valid: isValid });
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Verification Error' });
    }
});
app.get('/api/v1/deals/active/:borrowerAddress', (req, res) => {
    try {
        const { borrowerAddress } = req.params;
        const activeDeals = indexerService.getActiveDealsForBorrower(borrowerAddress);
        res.json({ deals: activeDeals });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Server Error' });
    }
});
app.get('/api/v1/oracle/rates', async (req, res) => {
    try {
        const rates = await oracleService.getRates();
        res.json(rates);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Oracle Error' });
    }
});
app.get('/api/v1/analytics', async (req, res) => {
    try {
        const { dbService } = require('./services/db.service');
        // Get DB metrics
        const historicalTvl = await dbService.getHistoricalTvl();
        const activeInstitutionsCount = await dbService.getActiveInstitutionsCount();
        const dbDeals = await dbService.getRecentDeals();
        const recentActivity = dbDeals.map((deal) => ({
            id: deal.id.substring(0, 12) + '...',
            type: deal.type,
            amount: deal.amount,
            time: new Date(deal.time).toLocaleString(),
            status: deal.status,
            zkProof: deal.zkProof
        }));
        const healthFactors = dbDeals
            .filter((d) => d.health_factor !== null)
            .map((d) => d.health_factor);
        const realTvl = historicalTvl.length > 0 ? historicalTvl[historicalTvl.length - 1].tvl : 0;
        res.json({
            recentActivity,
            totalDeals: dbDeals.length,
            realTvl: realTvl,
            parsedHealthFactors: healthFactors,
            historicalTvl: historicalTvl,
            activeInstitutions: activeInstitutionsCount
        });
    }
    catch (error) {
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
        astraRepoContractId: process.env.ASTRA_REPO_CONTRACT_ID || 'CB5VLN6TSOLKVLJ2XENVGMAHRVZLAAOGVBFFAJRHOZ7X5XD4WAWLL2F7',
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
        const { Keypair, Asset, Horizon, rpc: SorobanRpc, TransactionBuilder, Networks, Account, nativeToScVal, Contract } = await Promise.resolve().then(() => __importStar(require('@stellar/stellar-sdk')));
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
            .addOperation(sacContract.call('mint', nativeToScVal(address, { type: 'address' }), nativeToScVal(FAUCET_AMOUNT_STROOPS, { type: 'i128' })))
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
    }
    catch (error) {
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
