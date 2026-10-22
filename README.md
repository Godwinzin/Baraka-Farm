# The Baraka Farm
![Tests](https://github.com/Godwinzin/Baraka-Farm/actions/workflows/test.yml/badge.svg)

An interactive, responsive website for **The Baraka Farm**, showcasing sustainably grown agricultural produce and farm operations, with a booking system for farm visits.

**Live site:** https://barakafarm.vercel.app

---

## Features

- **Responsive Hero Section:** Eye-catching hero banner featuring background media and dark overlays for optimal readability.
- **Product Catalog:** Showcases high-quality crops grown using environmentally responsible farming methods.
- **Modern UI Design:** Clean navigation with CSS variable-driven styling, smooth hover transitions, and sticky navigation headers.
- **Mobile-Friendly Layout:** Built with fluid CSS Flexbox and Grid, ensuring seamless usability across mobile, tablet, and desktop viewports.
- **Visit Booking:** A booking form that validates input on the server, saves requests to a database, and emails the owner.
- **Admin Page:** Password-protected page to search, filter, page through, update and delete booking requests, and to change the admin password.
- **Security Basics:** Hashed passwords, session cookies, rate limiting, security headers, and a honeypot field against simple bots.

---

## Built With

- **HTML5:** Semantic markup structure.
- **CSS3:** Custom properties (CSS variables), Flexbox layout, and CSS transitions.
- **JavaScript:** Interactive DOM manipulation in the browser, and the whole backend in Node.js.
- **Node.js 22 + Express 5:** The API, login and validation.
- **PostgreSQL on Neon:** Database for bookings, admin users and sessions.
- **Resend:** Email notifications over HTTPS.
- **Vercel and Render:** Hosting for the static site and the API.

---

## How It Fits Together

| Part | Where it runs | Job |
|---|---|---|
| Static pages (`public/`) | Vercel | The website: pages, styles, scripts, admin page |
| API (`server/`, Express) | Render (free) | Validation, login, bookings, email |
| Database | Neon (Postgres) | Stores bookings, admin users, sessions |
| Email | Resend | Notifies the owner of new bookings |

Vercel forwards every `/api/*` request to Render through a rewrite in `vercel.json`, so the browser only ever talks to one address.

## Project Structure

```
public/            static site (HTML, CSS, JS, images, admin page)
server/
  app.js           the Express app (routes, middleware)
  server.js        starts the app (imports app.js)
  db.js            Postgres pool and table setup
  auth.js          password hashing, sessions, requireAdmin
  validate.js      input validation
  email.js         booking notification email
  create-admin.js  creates or updates an admin account
tests/             unit and API tests (Node's built-in test runner)
vercel.json        Vercel config and the /api rewrite
```

---

## Getting Started

### Just browsing the pages

Open `public/index.html` in any modern browser (Chrome, Firefox, Edge, Safari). The booking form and admin page need the backend, so they won't work this way.

### Running everything locally

**Prerequisites:** Node 22 or newer, and a free [Neon](https://neon.com) account.

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in. Use your **development** Neon branch, never production.
3. Create an admin account: `node --env-file=.env server/create-admin.js yourname "a-long-password"`
4. `npm run dev`, then open http://localhost:3000

### Environment variables

| Name | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | local `.env`, Render | Neon connection string (development branch locally, production on Render) |
| `NODE_ENV` | Render (`production`) | Turns on secure cookies, stops serving static files, enables the redirect |
| `NODE_VERSION` | Render (`22`) | Node version Render uses |
| `FRONTEND_URL` | Render | Vercel address that stray visitors are redirected to |
| `RESEND_API_KEY`, `NOTIFY_EMAIL` | local, Render | Booking notification emails (skipped if empty) |
| `PORT` | set by Render | Port the server listens on |

### Scripts

- `npm run dev` runs the server with auto-restart and loads `.env`
- `npm start` runs the server (used by Render)
- `npm test` runs all tests against a separate Neon `test` branch

### Tests

`npm test` loads `.env.test`, which must contain `NODE_ENV=test` and the connection string of the **test** branch. The test helpers wipe tables and refuse to run otherwise. Never point `.env.test` at development or production.

---

## Deploying

- **Render:** Web Service, Node, region matching the Neon database, build `npm install`, start `npm start`, free instance. Set the environment variables above.
- **Vercel:** "Other" framework preset, no build command. `vercel.json` sets the output directory to `public` and rewrites `/api/*` to the Render address (the URL there is written directly, not an environment variable).
- **Neon:** branches `production` (live), `development` (local work), `test` (automated tests). Turn off automatic expiry on all of them.

---

## Things Worth Knowing

- **Free Render sleeps** after idle time, so the first API call can take up to a minute. The booking page pings `/api/health` on load to wake it, and the form shows a "waking up" message.
- **Render's free tier blocks SMTP**, so email goes through Resend's HTTP API.
- **Visitor IPs are best-effort.** `trust proxy` is set to the measured number of hops (Vercel plus Render), but a caller can forge `X-Forwarded-For`. Important limits therefore don't rely