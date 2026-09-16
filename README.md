# voting

VERAVOTE — a secure MERN voting platform (React + Express + MongoDB) with role-based dashboards, elections, candidates, encrypted voting, results, analytics, anomaly detection, security center, audit logs, sessions and password reset.

## Stack

- **Frontend**: React (Vite), Tailwind CSS, Recharts, Framer Motion
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Auth**: JWT + server-side sessions

## Getting started

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

### 3. Start the stack

```bash
cd backend
npm run mongo     # in-memory MongoDB on 27017 (no install needed)
npm run dev       # API server on http://localhost:5000
npm run seed      # (optional) seed demo data

cd ../frontend
npm run dev       # web app on http://localhost:5173
```

Or run the local persistent MongoDB with `node mongo-dev.js`.

### 4. Demo accounts

| Role | Email | Password |
| ---- | ----- | -------- |
| Super Admin | admin@veravote.local | Admin@123 |
| Voter | voter@veravote.local | Voter@123 |
| Election Officer | officer@veravote.local | Officer@123 |
| Auditor | auditor@veravote.local | Auditor@123 |

## Tests

```bash
cd backend
npm test          # full E2E suite (spins its own in-memory DB)
```