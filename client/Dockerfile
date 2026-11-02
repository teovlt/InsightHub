# Stage 1: Build the application
FROM node:26-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Public URL of the API and Firebase web config, baked into the bundle at build time
ARG VITE_API_URL
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""

RUN pnpm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine

# Templates are rendered by the nginx entrypoint with the container environment (API_URL for the CSP)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/*.template /etc/nginx/templates/
COPY --chmod=755 nginx/05-api-ws-url.envsh /docker-entrypoint.d/
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
