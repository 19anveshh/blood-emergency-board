# Blood Emergency Board

React frontend and locally persistent demo backend for a college hackathon project that connects hospitals with compatible blood donors during emergencies.

Frontend registration, login, session restoration, logout, role-based route protection, request creation, the emergency board, matching, donor acceptance, and hospital fulfillment use the real backend. Donor history, profile controls, and admin metrics remain realistic local mock data. The backend provides Express REST endpoints backed by local JSON files.

## What is included

- Responsive healthcare-focused landing page
- Public emergency blood board with search and filters
- Hospital dashboard with active request metrics and response activity
- Create emergency request form with live preview
- Donor dashboard with availability toggle, matched requests, and donation history
- Ranked donor matching screen
- Emergency request details with timeline and local status actions
- Admin dashboard with network metrics, blood group demand, and recent activity
- Backend-connected donor/hospital registration and donor/hospital/admin login
- JWT session restoration, logout, and role-protected workspaces
- Core hospital → emergency board → donor matching/acceptance → hospital fulfillment workflow
- Reusable navigation, app shell, cards, badges, forms, tables, empty states, timeline, and toast components
- Realistic demo data for hospitals, donors, blood groups, requests, statuses, and donation history

## Run the frontend locally

Requirements:

- Node.js 20.19+ or 22.12+ (required by the installed Vite version)
- npm 9 or newer

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` in the project root and keep the local API URL:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Start the backend using the [backend setup](#backend) in a separate terminal, then start the Vite development server from the project root:

```bash
npm run dev
```

Open the local URL printed by Vite. The configured port is 5173; startup fails if that port is already occupied:

```text
http://localhost:5173/
```

To expose the demo to other devices on the same network:

```bash
npm run dev -- --host
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Demo routes

| Screen | URL | Access |
| --- | --- | --- |
| Landing page | `/` | Public |
| Login | `/login` | Guests; signed-in users redirect to their workspace |
| Registration | `/register` | Guests; signed-in users redirect to their workspace |
| Public emergency board | `/board` | Public |
| Hospital dashboard | `/hospital` | HOSPITAL |
| Create emergency request | `/hospital/requests/new` | HOSPITAL |
| Donor dashboard | `/donor` | DONOR |
| Donor matching | `/matching/BER-24081` | Any signed-in role |
| Emergency request details | `/requests/BER-24081` | Any signed-in role |
| Admin dashboard | `/admin` | ADMIN |

Logged-out visitors to protected routes go to `/login`. Signed-in visitors to another role's workspace return to their own workspace.

### Frontend authentication

- Registration calls `POST /api/auth/register` with name, email, password, phone, location, and role. Donors also supply a blood group. Hospital registration uses the hospital name as the account/profile name.
- Public registration offers DONOR and HOSPITAL only. Successful registration returns to login with a confirmation message and prefilled email.
- Login calls `POST /api/auth/login` with email and password only. The backend's returned role controls the destination; the existing Hospital/Donor selector is presentation only.
- The JWT is saved in localStorage under `bloodEmergencyToken`. Passwords and user profiles are not persisted in browser storage.
- On startup or refresh, `GET /api/auth/me` validates the saved Bearer token and restores the current user. Invalid/expired sessions are removed. Route guards wait for restoration before deciding access.
- The existing **Sign out** action clears authentication state and the saved token, then returns to login.
- API validation and sign-in failures appear in the form. Network/server failures use clean retry messages, and server stack traces are suppressed.

### Suggested demo flow

1. Start on the landing page and open **Emergency board**.
2. Use the **Critical** tab to show urgent O− requests.
3. Register a hospital account with its name, email, phone, location, and a strong password, then log in with those credentials.
4. In the hospital workspace, open **Create emergency request** and submit a request. The new record is saved to `backend/data/bloodRequests.json` and appears on the real board.
5. Sign out, register a compatible donor, sign in, open the emergency, view backend-ranked matches, and accept the request.
6. Sign out, sign in as the hospital again, open the same request, mark it fulfilled, and refresh to verify the persisted status.
7. The donor history and admin metrics remain mock-only for this demo step.

### Verify authentication in the browser

Keep both local servers running and complete the private admin setup described below. Install the browser and its runtime dependencies once:

```bash
npx playwright install --with-deps chromium
```

From the project root, run:

```bash
npm run test:auth
npm run test:demo
```

`test:auth` checks real donor/hospital registration, JSON-file persistence, bcrypt hashes, JWT storage, refresh via `/auth/me`, logout, role guards, admin login, validation errors, expired sessions, and clean network/server errors. `test:demo` runs the core hospital → donor → hospital workflow: create a request, find it on the real board, inspect backend matches, accept it, fulfill it, and verify the fulfilled state after refresh. Browser tests create or reuse local demo accounts and requests; they do not print passwords or tokens.

`TEST_FRONTEND_URL` and `TEST_API_URL` can override the default URLs for this test script. Keep them aligned with `VITE_API_URL` and the backend's `CORS_ORIGIN`.

## Folder structure

```text
blood-emergency-board/
├── index.html
├── .env.example
├── package.json
├── README.md
├── vite.config.js
├── tests/
│   ├── auth.browser.mjs
│   └── demo.browser.mjs
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── data/
│   ├── test/
│   └── src/
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    ├── api/
    │   ├── auth.js
    │   ├── client.js
    │   └── requests.js
    ├── auth/
    │   ├── AuthContext.jsx
    │   └── RouteGuards.jsx
    ├── components/
    │   ├── AuthFeedback.jsx
    │   └── Shared.jsx
    ├── data/
    │   └── mockData.js
    └── pages/
        ├── AdminDashboard.jsx
        ├── BloodBoardPage.jsx
        ├── CreateRequestPage.jsx
        ├── DonorDashboard.jsx
        ├── LandingPage.jsx
        ├── LoginPage.jsx
        ├── MatchingPage.jsx
        ├── RegisterPage.jsx
        ├── RequestDetailsPage.jsx
        └── HospitalDashboard.jsx
```

## Tech stack

- React
- Vite
- JavaScript / JSX
- React Router
- Lucide React icons
- Modern CSS with responsive breakpoints and reusable design tokens
- Playwright for browser authentication verification

## Backend

The backend lives in [`backend/`](./backend) and runs separately from the Vite frontend.

Run the demo API:

```bash
cd backend
npm install
npm run setup:auth
npm run seed
npm run seed:admin
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Health endpoint:

```text
http://localhost:5000/api/health
```

The backend includes JSON repositories, bcrypt/JWT authentication, role and ownership checks, and REST routes for health, accounts, blood requests, donors, hospitals, matching, and request lifecycle actions. See [`backend/README.md`](./backend/README.md) for private environment setup, registration/login, Bearer tokens, permissions, and API examples. Demo reseeding preserves registered users and linked profiles; server restarts preserve data. Run `npm test` inside `backend/` for 31 authentication and API/persistence checks.

## Current backend scope

The API currently uses:

- Express.js REST APIs
- Local JSON-file persistence in `backend/data/`
- Demo seed script
- Request validation and centralized error handling
- A separated basic matching service
- Bcrypt password hashing, JWT login, and role/ownership authorization

The following are intentionally deferred until the next approved step:

- AI or automated medical decision-making
- Deployment configuration

Frontend authentication and the core emergency request workflow are integrated with the backend. Donor history, advanced profile management, and admin statistics remain mock-only by design for this hackathon demo step.
