# Small Node image
FROM node:22-alpine

WORKDIR /app

# Install only what the app needs to run
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the app code
COPY . .

# Run as a normal user, not root
USER node

EXPOSE 5000

# Docker marks the container "unhealthy" if /health stops answering
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
