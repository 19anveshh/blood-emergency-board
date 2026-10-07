# Blood Emergency Board API — Step 4

Node.js + Express REST API with local JSON persistence, bcrypt passwords, JWT authentication, and role/ownership authorization. Step 4 keeps the existing local demo storage, as confirmed during implementation.

## Install and run

Requirements: Node.js 18+ and npm 9+.

```bash
cd backend
npm install
npm run setup:auth
npm run seed
npm run seed:admin
npm run dev
```

Backend: **http://localhost:5000**. Health: **http://localhost:5000/api/health**.

Use `npm start` for a direct Node start. Stop with **Ctrl+C**. The frontend runs separately with its existing Vite command and prototype data.

## Private environment configuration

`npm run setup:auth` creates missing settings in the ignored `.env` file. It generates a random JWT secret and demo admin password, keeps existing private settings, restricts the file permissions, and never prints their values. Open your local `.env` privately to use/change admin credentials.

`.env.example` contains placeholders only:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
JWT_EXPIRES_IN=1d
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_private_password
```

`JWT_SECRET` must contain at least 32 random characters; missing/placeholder secrets are rejected at startup. `JWT_EXPIRES_IN` defaults to `1d`. Admin credentials are needed only for `npm run seed:admin`.

`.gitignore` excludes `.env` and `data/users.json`. Do not print or commit private passwords, tokens, or secrets. The API omits raw internal errors and password hashes from logs/responses. A database connection string is not required.

## Authentication architecture

```text
Register → validate → bcrypt hash (cost 12) → save user → create/link donor or hospital
Login → bcrypt password verification → expiring JWT → safe user + token
Protected request → verify Bearer JWT → reload stored user → role check → ownership check
```

`User` stores `name`, normalized unique `email`, bcrypt `password` hash, `phone`, `role`, `bloodGroup`, `location`, `isAvailable`, timestamps, and `donorId`/`hospitalId` links. The linked profile stores `userId`.

The user repository returns an explicit safe-field whitelist. Password hashes are accessible only internally for login/admin setup and never appear in API responses. Public registration cannot claim existing seeded profiles by email or create an admin account.

### Register — `POST /api/auth/register`

Example donor payload (illustrative password, not a configured account):

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPassword123!",
  "phone": "9876543210",
  "role": "DONOR",
  "bloodGroup": "O+",
  "location": "Hyderabad"
}
```

Returns `201` with `{"success":true,"data":{"user":{...}}}`. Log in afterward to obtain a token.

Validation:

- Name: 2–120 printable characters.
- Email: valid, normalized to lowercase, unique across user accounts; duplicates return `409`.
- Password: uppercase, lowercase, a number, and a symbol; minimum 8 characters, maximum 72 UTF-8 bytes (bcrypt's limit).
- Phone: 7–15 digits, with optional common formatting.
- Role: `DONOR` or `HOSPITAL` only for public registration.
- Donors must supply a supported blood group; location is required.
- Ownership IDs, `userId`, and privilege fields cannot be supplied by the client.

For hospital registration, use `role: "HOSPITAL"` and the hospital name in `name`; blood group is optional. The response includes its new `hospitalId`. Donor registration returns `donorId`.

### Login — `POST /api/auth/login`

```json
{"email":"john@example.com","password":"StrongPassword123!"}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {"id":"USER_ID","name":"John Doe","email":"john@example.com","role":"DONOR","donorId":"DONOR_ID"},
    "token": "JWT_TOKEN"
  }
}
```

Wrong passwords and nonexistent accounts return the same generic `401` message.

### Current user — `GET /api/auth/me`

Use the login token in the header:

```http
Authorization: Bearer JWT_TOKEN
```

```bash
curl http://localhost:5000/api/auth/me \
  -H 'Authorization: Bearer JWT_TOKEN'
```

Returns `200` with `data.user`. Missing, invalid, expired, or tampered tokens return `401`. JWTs contain `userId` and `role`, use HS256, and are verified against the issuer/audience and current stored account. A missing account or changed role invalidates the token.

### Initial admin

```bash
npm run seed:admin
```

This script uses private `ADMIN_EMAIL` and `ADMIN_PASSWORD`, bcrypt-hashes the password, and creates/updates the admin account. It does not print credentials and refuses to promote an existing ordinary user. There is no fixed admin password in source code.

Seeded hospitals/donors are public demo records without default logins. Register new accounts to demonstrate profile and request ownership.

## Routes and permissions

Existing REST paths and success/error envelopes are preserved. IDs are opaque strings; newly created IDs retain the 24-character hexadecimal shape.

| Method | Endpoint | Permission |
| --- | --- | --- |
| POST | `/api/auth/register` | Public donor/hospital registration |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| GET | `/api/health` | Public |
| GET | `/api/requests` | Public; optional `status`, `bloodGroup`, `urgency` filters |
| GET | `/api/requests/:id` | Public |
| GET | `/api/requests/:id/matches` | Public; donor contact information omitted |
| POST | `/api/requests` | HOSPITAL, for its own linked hospital |
| PUT | `/api/requests/:id` | HOSPITAL, own hospital's requests only |
| POST | `/api/requests/:id/fulfill` | HOSPITAL, own requests only |
| POST | `/api/requests/:id/cancel` | HOSPITAL, own requests only |
| POST | `/api/requests/:id/accept` | DONOR, submitted `donorId` must be its own |
| DELETE | `/api/requests/:id` | ADMIN |
| GET | `/api/donors` | Public, without email/phone/account links; optional `bloodGroup`/`availability` filters |
| GET | `/api/donors/:id` | Public, without contact information |
| POST | `/api/donors` | ADMIN; ordinary donors use registration |
| PUT | `/api/donors/:id` | DONOR, own linked profile only |
| GET | `/api/hospitals` | Public hospital directory |
| GET | `/api/hospitals/:id` | Public |
| POST | `/api/hospitals` | ADMIN; ordinary hospitals use registration |
| PUT | `/api/hospitals/:id` | ADMIN |

Authenticated wrong-role/ownership attempts return `403`. Hospitals cannot transfer their requests to another hospital. Donor updates cannot change role or ownership links, and account/profile availability and details stay synchronized.

Success: `{"success":true,"data":{...}}`.

Error: `{"success":false,"message":"Blood request not found","code":"REQUEST_NOT_FOUND"}`. Validation errors include safe field-level details.

HTTP statuses: `201` creation/registration, `200` login/reads/updates/actions/deletion, `400` invalid input, `401` authentication failure, `403` forbidden role/ownership, `404` missing record/route, `409` duplicates/state conflicts, `503` local storage failure, `500` unexpected failures only.

### Protected request example

Use a hospital login token and its linked hospital's name:

```bash
curl -X POST http://localhost:5000/api/requests \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer HOSPITAL_TOKEN' \
  -d '{"bloodGroup":"O+","unitsRequired":2,"hospital":"YOUR_REGISTERED_HOSPITAL_NAME","location":"Hyderabad","urgency":"CRITICAL","requiredBefore":"2026-12-01T12:00:00.000Z","additionalNotes":"Demo request"}'

curl -X PUT http://localhost:5000/api/requests/REQUEST_ID \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer HOSPITAL_TOKEN' -d '{"unitsRequired":3}'

curl http://localhost:5000/api/requests/REQUEST_ID/matches

curl -X POST http://localhost:5000/api/requests/REQUEST_ID/accept \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer DONOR_TOKEN' -d '{"donorId":"YOUR_DONOR_ID"}'

curl -X POST http://localhost:5000/api/requests/REQUEST_ID/fulfill \
  -H 'Authorization: Bearer HOSPITAL_TOKEN'
```

Cancel a separate open request with `POST /api/requests/:id/cancel`. Closed requests cannot be reopened or accept donors.

## Persistence and demo seed

Files: `data/donors.json`, `data/hospitals.json`, `data/bloodRequests.json`, and local ignored `data/users.json` (hashes only).

`npm run seed` refreshes `isDemo: true` records: **5 hospitals, 15 donors, 8 requests**. Registered accounts, linked profiles, and user-created requests are preserved. IDs are stable and demo dates refresh on reseeding.

`jsonStore.js` queues read–modify–write operations per collection, saves a temporary file then renames it, and refuses to overwrite corrupt/unreadable JSON. Run one backend process and stop it before manual edits/seeding. Ordinary restarts preserve accounts, records, and tokens when the signing secret is unchanged.

Compatibility aliases remain: `notes` ↔ `additionalNotes`, `availability` ↔ `isAvailable`, `isVerified` ↔ `verified`.

Blood groups: `A+ A- B+ B- AB+ AB- O+ O-`. Urgency: `CRITICAL URGENT NORMAL`. Status: `ACTIVE MATCHING FULFILLED CANCELLED`. Units must be a positive integer and dates must be valid ISO dates/timestamps.

The existing matching algorithm/compatibility map remains intact, ranking available compatible donors by blood group, demo distance, donation recency, and donation count. Public matches omit email, phone, and account links. It is a hackathon prototype and is not medically authoritative.

## Tests

```bash
npm test
```

**31 Node built-in tests**: 23 authentication/authorization checks and 8 storage/API regression checks. Coverage includes all registration/login roles, admin setup, duplicate emails, bcrypt storage, invalid/expired/forged JWTs, role/ownership restrictions, profile linking, public contact privacy, secret-safe output, CRUD/matching/lifecycle behavior, reseeding, and actual backend process restart persistence. Tests use generated credentials and temporary data directories and do not change the real `.env` or demo records.

## Structure

```text
backend/
├── data/
├── test/
│   ├── auth.test.js
│   └── demo.test.js
├── .env.example
├── package.json
├── server.js
└── src/
    ├── app.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    │   ├── User.js
    │   ├── Donor.js
    │   ├── Hospital.js
    │   ├── BloodRequest.js
    │   ├── jsonRepository.js
    │   └── jsonStore.js
    ├── routes/
    ├── services/
    ├── seed.js
    ├── seedAdmin.js
    └── setupAuth.js
```
