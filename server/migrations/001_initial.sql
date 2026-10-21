CREATE TABLE IF NOT EXISTS bookings (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fname        TEXT NOT NULL,
  sname        TEXT,
  lname        TEXT NOT NULL,
  country_code TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  status       TEXT NOT NULL DEFAULT 'new',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at BIGINT NOT NULL
);