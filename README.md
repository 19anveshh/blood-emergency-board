# Blood Emergency Board

**Connecting hospitals with compatible blood donors when every minute matters.**

![React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-646CFF?logo=react&logoColor=white)
![Node.js + Express](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=nodedotjs&logoColor=white)
![JWT + bcryptjs](https://img.shields.io/badge/Authentication-JWT%20%2B%20bcryptjs-000000?logo=jsonwebtokens&logoColor=white)
![JSON storage](https://img.shields.io/badge/Storage-JSON%20Files-B22222?logo=json&logoColor=white)
[![Vercel demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?logo=vercel&logoColor=white)](https://blood-emergency-board.vercel.app)
[![Render API](https://img.shields.io/badge/API-Render-46E3B7?logo=render&logoColor=black)](https://blood-emergency-board-api.onrender.com/api/health)

A full-stack hackathon prototype that brings emergency blood requests, donor matching, and request fulfillment into one coordinated workflow.

**[Open Live Demo](https://blood-emergency-board.vercel.app)** · **[Emergency Board](https://blood-emergency-board.vercel.app/board)** · **[API Health](https://blood-emergency-board-api.onrender.com/api/health)** · **[Local Setup](#local-setup-instructions)**

## Problem Statement

During a blood emergency, hospitals need to find compatible, available donors quickly. Phone calls, disconnected contact lists, and scattered messages make it difficult to see who can respond and whether a request has already been fulfilled.

The challenge is to provide a shared view of urgent blood needs, shortlist compatible donors, and track each request from creation to completion.

## Solution

Blood Emergency Board connects **Hospitals**, **Donors**, and **Admins** through a role-based web application. Hospitals publish emergency requests, available compatible donors are ranked by the backend, donors accept requests, and the owning hospital records fulfillment.

The prototype uses a lightweight **React/Vite + Express + JSON-file** architecture, making the core workflow easy to run locally and demonstrate publicly.

## Key Features

- **Emergency request creation:** Hospitals specify blood group, units required, location, urgency, deadline, and additional notes.
- **Public Emergency Board:** Browse real backend requests with search and filtering.
- **Ranked donor matching:** Available, compatible donors receive a score based on blood-group match, stored distance, donation recency, and donation count.
- **Donor acceptance:** Authenticated donors accept requests using their own linked donor profile.
- **Hospital fulfillment:** The owning hospital marks a request fulfilled; the saved status remains visible after a page refresh.
- **Role-based authentication:** JWT sessions, bcryptjs password hashing, protected routes, ownership checks, session restoration, and logout.
- **Request lifecycle:** Backend support for `ACTIVE`, `MATCHING`, `FULFILLED`, and `CANCELLED` requests.
- **Responsive interface:** Dedicated hospital, donor, and admin workspaces, urgency badges, request details, and matching views.

**Prototype scope:** The core emergency workflow is backend-connected. Donor dashboard summaries, donation history, availability/profile controls, and admin dashboard analytics currently use mock or local UI data. Matching uses stored/demo values rather than live GPS tracking.

## How It Works

```text
Hospital signs in
       ↓
Creates an emergency blood request
       ↓
Request appears on the Emergency Board
       ↓
Backend filters and ranks available compatible donors
       ↓
Donor signs in, opens the request, and accepts
       ↓
Owning hospital marks the request fulfilled
       ↓
Page refresh confirms the saved fulfilled status
```

### Suggested judge walkthrough

1. Sign in with the **Hospital** demo account.
2. Create a **Critical O−** request using a distinctive location so it is easy to find.
3. Open the **Emergency Board** and search for that location.
4. Sign out and sign in with the **Donor** demo account.
5. Open the same request, select **View all matches**, and **Accept request**.
6. Sign back in as the hospital, open the request, and select **Mark fulfilled**.
7. Refresh the page and confirm the **Fulfilled** status.

## User Roles

| Role | Responsibilities | Workspace |
| --- | --- | --- |
| **Hospital** | Create emergency requests, review matches, and fulfill its own requests. | `/hospital` |
| **Donor** | Browse emergencies, inspect matches, and accept requests as its own linked donor profile. | `/donor` |
| **Admin** | Access the prototype overview and administrative API operations for request and directory management. | `/admin` |

Public registration supports **Hospital** and **Donor** accounts. Admin accounts are provisioned through the private backend setup.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, JavaScript/JSX, React Router |
| Interface | CSS, Lucide React icons |
| Backend | Node.js, Express |
| Authentication | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| Configuration | `dotenv`, CORS |
| Storage | JSON files in `backend/data/*.json` locally |
| Testing | Node.js built-in test runner, Playwright |
| Deployment | Vercel frontend, Render free Web Service backend |

## System Architecture

```text
Hospital / Donor / Admin
          │
          ▼
React + Vite frontend                         Vercel
          │
          │ HTTPS REST requests
          │ Bearer JWT on protected operations
          ▼
Node.js + Express API                         Render
          │
          ├── Authentication and role/ownership checks
          ├── Request validation and lifecycle actions
          ├── Donor compatibility and ranking service
          └── JSON repositories
                    │
                    ▼
          donors.json · hospitals.json
          bloodRequests.json · users.json
```

The frontend reads `VITE_API_URL` to reach the API. The backend uses `CORS_ORIGIN` to allow the frontend origin and stores password hashes in the private users collection. JSON writes are queued per collection and saved using temporary files followed by a rename.

Locally, files live in `backend/data/`. The deployed demo uses `DATA_DIR` to select its runtime JSON directory and initializes it from private snapshot files. **Render's free filesystem is temporary:** runtime changes may reset when the service restarts or redeploys. This setup is intended for the short-term hackathon demo.

## Project Structure

```text
blood-emergency-board/
├── README.md
├── package.json
├── index.html
├── vite.config.js
├── vercel.json
├── render.yaml
├── .env.example
├── src/
│   ├── App.jsx                 # Application routes
│   ├── main.jsx                # Frontend entry point
│   ├── styles.css              # Application styling
│   ├── api/                    # Auth and request API clients
│   ├── auth/                   # Session context and route guards
│   ├── components/             # Shared UI components
│   ├── data/                   # View mapping and prototype data
│   └── pages/                  # Public board and role workspaces
├── backend/
│   ├── README.md               # Detailed API documentation
│   ├── package.json
│   ├── server.js               # API startup
│   ├── .env.example
│   ├── deploy/start.mjs        # Demo JSON initialization
│   ├── data/                   # Local JSON collections
│   ├── src/
│   │   ├── app.js              # Express application
│   │   ├── config/             # Environment, auth, constants
│   │   ├── controllers/        # HTTP request handlers
│   │   ├── middleware/         # Validation, auth, errors
│   │   ├── models/             # JSON store and repositories
│   │   ├── routes/             # REST endpoints
│   │   ├── services/           # Auth, requests, donor matching
│   │   ├── setupAuth.js        # Private local auth setup
│   │   ├── seed.js             # Demo directory and requests
│   │   └── seedAdmin.js        # Private admin provisioning
│   └── test/                   # Backend tests
└── tests/
    ├── auth.browser.mjs        # Browser authentication checks
    └── demo.browser.mjs        # End-to-end emergency workflow
```

## API Overview

**Live API base:** `https://blood-emergency-board-api.onrender.com/api`

| Method | Endpoint | Purpose | Access |
| --- | --- | --- | --- |
| `GET` | `/health` | Check API and JSON-store status. | Public |
| `POST` | `/auth/register` | Register a donor or hospital. | Public |
| `POST` | `/auth/login` | Sign in and receive a JWT. | Public |
| `GET` | `/auth/me` | Restore the authenticated user. | Signed-in user |
| `GET` | `/requests` | List and filter emergencies. | Public |
| `POST` | `/requests` | Create an emergency request. | Hospital |
| `GET` | `/requests/:id` | Retrieve request details. | Public API |
| `GET` | `/requests/:id/matches` | Get ranked compatible donors. | Public API |
| `POST` | `/requests/:id/accept` | Accept as the signed-in donor. | Donor; own profile |
| `POST` | `/requests/:id/fulfill` | Mark a request fulfilled. | Owning hospital |
| `POST` | `/requests/:id/cancel` | Cancel an open request. | Owning hospital |
| `GET` | `/donors` | Browse public donor profiles. | Public |
| `GET` | `/hospitals` | Browse the hospital directory. | Public |

Protected operations require `Authorization: Bearer <JWT>`. Although request details and matches have public API endpoints, their frontend pages require sign-in. Public donor responses omit contact details and account links.

For payloads, additional CRUD endpoints, response formats, and authorization rules, see [backend/README.md](./backend/README.md).

## Demo / Live Link

| Resource | Link |
| --- | --- |
| **Frontend — Vercel** | [blood-emergency-board.vercel.app](https://blood-emergency-board.vercel.app) |
| **Emergency Board** | [Open the public board](https://blood-emergency-board.vercel.app/board) |
| **Backend — Render** | [blood-emergency-board-api.onrender.com](https://blood-emergency-board-api.onrender.com) |
| **API health** | [/api/health](https://blood-emergency-board-api.onrender.com/api/health) |

**Verified public workflow:** Hospital login → Create emergency → Emergency Board → Donor login → Matching → Accept request → Hospital fulfill → Refresh. The fulfilled status remained visible after refresh.

The Render free service can take a little time to wake up after inactivity. Allow it to start before beginning the walkthrough.

## Demo Credentials

Use these dedicated demonstration accounts at the [login page](https://blood-emergency-board.vercel.app/login):

| Role | Email | Demo password |
| --- | --- | --- |
| Hospital | `hospital.demo@bloodboard.local` | `DemoHospital123!` |
| Donor — O− | `donor.demo@bloodboard.local` | `DemoDonor123!` |

Admin credentials are private and configured through `ADMIN_EMAIL` and `ADMIN_PASSWORD`. They are not published in this README.

For a fresh local checkout, register accounts through the UI or run `npm run test:demo` with both servers running to create/reuse the demonstration accounts. The directory seed alone does not create these login accounts.

## Local Setup Instructions

### Prerequisites

- **Node.js 22.12+**; Node.js 22 LTS is recommended.
- **npm 9+** and Git.

### 1. Clone and install the frontend

```bash
git clone https://github.com/19anveshh/blood-emergency-board.git
cd blood-emergency-board
npm ci
cp .env.example .env
```

The root `.env` should point to the local backend:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

### 2. Configure and start the backend

From the project root, run:

```bash
cd backend
npm ci
cp .env.example .env
npm run setup:auth
npm run seed
npm run seed:admin
npm run dev
```

`setup:auth` generates missing private JWT/admin settings in `backend/.env`. `seed` populates demo hospitals, donors, and requests; `seed:admin` provisions the admin account using the private environment settings. Run seeding before starting the API.

| Backend variable | Local configuration |
| --- | --- |
| `PORT` | `5000` |
| `NODE_ENV` | `development` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `JWT_SECRET` | Generated privately; at least 32 random characters. |
| `JWT_EXPIRES_IN` | `1d` |
| `ADMIN_EMAIL` | Configured privately in `backend/.env`. |
| `ADMIN_PASSWORD` | Generated/configured privately in `backend/.env`. |
| `DATA_DIR` | Optional override; defaults to `backend/data/`. |

Keep `.env` files and `backend/data/users.json` out of source control. Run one backend process for the JSON store.

Backend: **http://localhost:5000** · Health: **http://localhost:5000/api/health**

### 3. Start the frontend

In a second terminal, from the project root:

```bash
npm run dev
```

Open **http://localhost:5173**.

### 4. Build and verify

From the project root:

```bash
# Build the frontend into dist/
npm run build

# Run the backend authentication, API, and JSON-persistence tests
npm --prefix backend test

# Install Chromium for the browser checks
npx playwright install --with-deps chromium

# With both local servers running, verify the complete demo and authentication
npm run test:demo
npm run test:auth
```

The backend suite contains **31 tests**. Browser checks cover the core emergency workflow, authentication, role guards, logout, and session restoration. To run `test:demo` against the public deployment, set `TEST_FRONTEND_URL` to the Vercel URL and `TEST_API_URL` to the Render URL ending in `/api`.

## Screenshots

_Add screenshots here before the final submission._

| Screen | Suggested capture | Screenshot |
| --- | --- | --- |
| Landing page | Project introduction and call to action. | _To be added_ |
| Hospital dashboard | Active requests and request-creation action. | _To be added_ |
| Emergency Board | Urgency labels, blood groups, and search results. | _To be added_ |
| Donor matching | Ranked compatible donors and acceptance action. | _To be added_ |
| Fulfilled request | Final status and confirmation after refresh. | _To be added_ |
| Admin dashboard | Prototype network overview. | _To be added_ |

## Future Enhancements

- Real-time request updates and donor notifications.
- Map-based discovery using live location data.
- Hospital verification and richer donor eligibility/profile management.
- Backend-connected donor history, dashboard summaries, and admin analytics.
- Persistent hosting storage and scheduled backups for the existing JSON architecture.
- Expanded accessibility, localization, and performance testing.

These are planned improvements; they are not part of the current implemented workflow.


**Our focus:** Demonstrate a clear, complete path from an emergency blood request to donor acceptance and hospital-confirmed fulfillment.
