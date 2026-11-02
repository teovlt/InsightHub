FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

# Production dependencies only (vitest, mongodb-memory-server... stay out of the image)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY index.js ./
COPY constants ./constants
COPY src ./src

# Avatars live in Firebase Storage, the container writes nothing to disk
USER node

EXPOSE 3000
CMD ["node", "index.js"]
