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
npm run seed
npm start
```

**2. Frontend** (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in the browser. The page lists the sample tasks that come from the SQLite database through the backend API.

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
