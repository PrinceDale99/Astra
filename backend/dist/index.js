"use strict";
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
