# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Production Stage
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist
# Copy public ZK files (zkeys, wasm provers)
COPY public/ ./public/

ENV NODE_ENV=production
ENV PORT=8080

# Enforce garbage collection and memory limit for Render Free Tier (512MB)
CMD ["node", "--max-old-space-size=400", "dist/index.js"]
