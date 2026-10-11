FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# Test stage: installs everything and runs the tests. The build fails if a test fails.
FROM base AS test
RUN npm ci
COPY . .
RUN npm test

# Final app image: only what the app needs to run
FROM base AS runtime
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "server.js"]
