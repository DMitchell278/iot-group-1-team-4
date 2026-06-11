# ---- Build stage ----
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source code
COPY ./src .

# No build step needed (JS project)

# ---- Prod Stage ----
FROM node:24-slim AS prod

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app code from builder
COPY --from=builder /app ./

# Run your entrypoint file
CMD ["node", "mqtt-ingest.js"]
