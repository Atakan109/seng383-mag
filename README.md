# MAG – AI-Assisted Child Development Platform

SENG 383 Software Project III term project (Fall 2026) · Team **MAG** · Group 8 · Section 2

A web-based decision support platform that brings parents and specialists together around one shared weekly schedule, task list and record of observations for a child, with a role-based AI summary that supports decisions but never makes them.

## Team

| Name | GitHub | Role |
|---|---|---|
| Atakan Yurdasucu | Atakan109 | Project Manager, Developer |
| Gökhan Kara | gokhankaraa | Developer |
| Yasin Mirza Bozkurt | ymirzabzkrt | Developer, Tester |

## Technology

React (Vite) · Node.js + Express · SQLite · Jest + Supertest · Vitest · GitHub Actions

## Requirements

- Node.js 22 or newer
- npm

## How to run

Open two terminals.

**1. Backend** (http://localhost:3001)

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm start
```

On the first run, open `backend/.env` and set `JWT_SECRET` to any long random text. `.env` is not committed.

Sample users (synthetic): `parent@mag.test`, `specialist@mag.test`, `child@mag.test`. Their test password is `SAMPLE_PASSWORD` in `backend/src/seed.js`.

**2. Frontend** (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in the browser and log in with one of the sample users. Each role sees its own home page: a parent sees their children, a specialist sees the linked children, a child sees the child home page.

## Tests

From the project root:

```bash
cd backend
npm test
cd ../frontend
npm test
```

The same tests run automatically on every pull request (GitHub Actions).

## Project structure

```
backend/    Express API, SQLite database, seed script, tests
frontend/   React (Vite) app, tests
docs/       SRS.md, SDD.md, PMP.md
.github/    CI workflow
```

## Links

- Jira board: https://seng383-mag.atlassian.net/jira/software/projects/MAG/boards/1
- Documents: [SRS](docs/SRS.md) · [SDD](docs/SDD.md) · [PMP](docs/PMP.md)

All data in this project is synthetic and created by the seed script.
