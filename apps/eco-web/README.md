# eco-web

Small Node.js app with a **built** static UI (`public/` → `dist/public/`), JSON health endpoints, and a Docker image suited for Kubernetes.

## Develop (no build)

Serves files directly from `public/` when `dist/public/` does not exist:

```bash
cd apps/eco-web
npm run dev
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Production build + run

```bash
cd apps/eco-web
npm run build
npm start
```

`npm run build` copies `public/` into `dist/public/` and injects a `build` timestamp meta tag into `index.html`.

## Docker

```bash
cd apps/eco-web
docker build -t eco-web:local .
docker run --rm -p 8080:8080 eco-web:local
```

## Endpoints

| Path | Purpose |
|------|--------|
| `/` | UI |
| `/health`, `/healthz` | JSON for liveness |
| `/ready` | Plain text for readiness |

Env: `PORT` (default `8080`), `SERVICE_NAME` (default `eco-web`).
