# Chess SaaS (React + Express + MySQL + Docker)

This is a Dockerized rewrite of the original Flask app:

- **Frontend**: React + Vite
- **Backend**: Node.js + Express + Prisma
- **DB**: MySQL 8

## Quick start (Docker)

From this folder:

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3001/api/health
- MySQL: localhost:3307

### Admin token

Mutating endpoints require `x-admin-token`.

- In Docker: edit `ADMIN_TOKEN` in `docker-compose.yml`
- In the UI: paste the token in the Home page “Admin token” box

## Local dev (without Docker)

Run the database:

```bash
docker compose up -d db
```

### Backend

```bash
cd backend
cp .env.example .env
npm i
npx prisma generate
npm run dev
```

If you need to create new migrations locally, Prisma requires a shadow database.
Use the root URL for `migrate dev`:

```bash
DATABASE_URL="mysql://root:rootpass@localhost:3307/chess" npx prisma migrate dev
```

### Frontend

```bash
cd frontend
npm i
npm run dev
```

Vite proxies `/api` to `http://localhost:3001`.
