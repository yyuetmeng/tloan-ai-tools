# AI Tool Catalogue service (Java / Spring Boot)

A REST API plus a small browser UI for managing the T-Loan **AI Tool Catalogue**
(the list of tools staff can request to borrow). The static T-Loan web app reads
from it when `catalogueApiUrl` is set in `firebase-config.js`.

- Java 21, Spring Boot 3.5, Spring Data JPA
- H2 in-memory database by default (seeded with Claude Pro, Lovable, Figma, Codex Pro);
  point it at PostgreSQL for persistent data
- Reads are public; writes need the `X-API-Key` header

## Run locally

```bash
cd catalogue-service
CATALOGUE_ADMIN_KEY=change-me mvn spring-boot:run
# UI:     http://localhost:8080/
# API:    http://localhost:8080/api/tools
# Health: http://localhost:8080/actuator/health
```

Run the tests with `mvn verify`.

## API

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/tools` | – | Optional filters: `category`, `active=true/false`, `q` (search name/vendor/description) |
| GET | `/api/tools/{id}` | – | 404 if missing |
| POST | `/api/tools` | `X-API-Key` | Returns 201 + `Location`; 409 if the name already exists |
| PUT | `/api/tools/{id}` | `X-API-Key` | Replaces the entry |
| DELETE | `/api/tools/{id}` | `X-API-Key` | 204 |

Request body:

```json
{
  "name": "Claude Pro",
  "vendor": "Anthropic",
  "category": "Assistant",
  "description": "AI assistant for writing, analysis and coding.",
  "websiteUrl": "https://claude.ai",
  "totalLicences": 5,
  "active": true
}
```

## Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port (set automatically by most hosts) |
| `CATALOGUE_ADMIN_KEY` | empty | Secret for write requests. Empty = read-only catalogue |
| `CATALOGUE_ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins, e.g. `https://yyuetmeng.github.io` |
| `SPRING_DATASOURCE_URL` | in-memory H2 | e.g. `jdbc:postgresql://host:5432/catalogue` |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | – | Database credentials |

With the default H2 database, edits are lost when the service restarts — set the
datasource variables to a PostgreSQL database (Render, Neon and Supabase all have free tiers)
to keep them.

## Deploy

GitHub Pages only serves static files, so the Java service needs a host that runs containers.

**CI / container image.** `.github/workflows/catalogue-service.yml` builds and tests on every
push and pull request that touches `catalogue-service/`, and on pushes to `main` publishes
`ghcr.io/<owner>/<repo>/catalogue-service:latest` to GitHub Container Registry. Any container
host (Render, Railway, Fly.io, Google Cloud Run, Azure Container Apps) can run that image.

**Render (free, one click).** The repository root has a `render.yaml` blueprint:

1. Push this repo to GitHub.
2. On <https://render.com>: New → Blueprint → select the repository → Apply.
3. Render builds `catalogue-service/Dockerfile`, generates a `CATALOGUE_ADMIN_KEY`
   (see the service's Environment tab), and gives you a URL like
   `https://tloan-catalogue-service.onrender.com`.
4. Put that URL in `catalogueApiUrl` in `firebase-config.js` so the loan form uses the live catalogue.

**Docker anywhere.**

```bash
docker build -t catalogue-service catalogue-service
docker run -p 8080:8080 -e CATALOGUE_ADMIN_KEY=change-me catalogue-service
```
