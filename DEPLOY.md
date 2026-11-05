# Deploying InsightHub with Dokploy

The whole app runs from `docker-compose.yml`, with one domain per public service:

```
Traefik (Dokploy, HTTPS)
  ├─ insighthub.teovillet.fr      ──► client (nginx :80, static React build)
  └─ api.insighthub.teovillet.fr  ──► server (Node :3000, REST + Socket.IO)
                                        └─► mongodb (volume mongodb_data, not published)
                                  mongodb-backup ──► daily dump in volume mongodb_backups (14 days)
```

Both domains belong to the same site (`teovillet.fr`), so the httpOnly auth cookie set by the API stays `SameSite=Lax`
and is still sent by the client. Avatars are still stored in Firebase Storage.

## 1. Create the service

1. In Dokploy, create a **Compose** service pointing to this repository, branch `main`, compose path `./docker-compose.yml`.
2. **Environment** tab: paste the variables of [`.env.docker`](.env.docker) and fill them.
   - `CLIENT_URL` / `API_URL`: the two public URLs, without trailing slash.
   - Generate `MONGO_PASSWORD` with `openssl rand -hex 24` and each secret with `openssl rand -hex 32`.
   - **Reuse the current `CRYPTO_SECRET`** from Render, otherwise the GitHub tokens already stored can't be decrypted
     (users would just have to reconnect GitHub).
   - `FIREBASE_PRIVATE_KEY` goes between double quotes with literal `\n`, as in the Firebase JSON key.
3. **Domains** tab, HTTPS on (Let's Encrypt) for both:
   - `insighthub.teovillet.fr` → service **`client`**, port **80**
   - `api.insighthub.teovillet.fr` → service **`server`**, port **3000**
4. DNS: point both names to the VPS (A record, or a CNAME to the main domain).
5. Deploy.

`API_URL` and the `VITE_FIREBASE_*` variables are baked into the client at build time: redeploy after changing them.

## 2. Update the external services

- **GitHub OAuth app** → Authorization callback URL: `https://api.insighthub.teovillet.fr/api/integrations/auth/github/callback`
- **Spotify app** (developer.spotify.com/dashboard) → Redirect URI: `https://api.insighthub.teovillet.fr/api/integrations/auth/oauth/spotify/callback`
- **Strava app** (strava.com/settings/api) → Authorization Callback Domain: `api.insighthub.teovillet.fr`
- OAuth callbacks always go to the **API** domain: leave `OAUTH_CALLBACK_BASE_URL` unset in production (or set it to `API_URL`).
- **Firebase console** → Authentication → Settings → Authorized domains: add `insighthub.teovillet.fr`.

## 3. Move the existing data

From any machine with the MongoDB tools, dump the current database (Atlas/Render URI):

```bash
mongodump --uri="<current MONG_URI>" --gzip --archive=insighthub.archive.gz
```

Copy it to the VPS, then restore it through the `mongodb-backup` container, which has the MongoDB tools and the
connection string (`--nsFrom/--nsTo` renames the database if it had another name):

```bash
docker cp insighthub.archive.gz $(docker ps -qf name=mongodb-backup-1):/backups/
docker exec -it $(docker ps -qf name=mongodb-backup-1) sh -c \
  'mongorestore --uri="$BACKUP_URI" --gzip --archive=/backups/insighthub.archive.gz \
   --nsFrom="<old db name>.*" --nsTo="insighthub.*" --drop'
```

Check the container name with `docker ps` if the filter doesn't match.

## 4. Backups

`mongodb-backup` writes `insighthub-YYYY-MM-DD-HHMM.archive.gz` into the `mongodb_backups` volume once a day and keeps
14 days. They live on the same disk as the database: to survive a VPS loss, set up a Dokploy volume backup of
`mongodb_backups` to S3.

Restore a backup:

```bash
docker exec -it $(docker ps -qf name=mongodb-backup-1) ls /backups
docker exec -it $(docker ps -qf name=mongodb-backup-1) sh -c \
  'mongorestore --uri="$BACKUP_URI" --gzip --archive=/backups/<file> --drop'
```

## 5. Test the stack locally

```bash
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.local.yml up --build
```

with `CLIENT_URL=http://localhost:8080` and `API_URL=http://localhost:3000` in `.env.docker` (fill the secrets too, and
don't commit them).

## 6. Shutting down Vercel and Render

Once the new domains work (login, Google sign-in, GitHub connection, avatar upload), delete the Vercel project and the
Render service. `client/vercel.json` can then be removed.

## Notes

- No port is published on the host: Traefik reaches `client` and `server` through the Dokploy network, and MongoDB
  (with authentication) is only reachable from the containers of the stack. Published ports would bypass the VPS
  firewall, since Docker writes its own iptables rules.
- `mongo:7` needs a CPU with AVX, which any recent VPS has (`grep -m1 -o avx /proc/cpuinfo` to check).
