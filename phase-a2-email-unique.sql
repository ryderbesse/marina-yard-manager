-- Phase A2: prevent duplicate workers rows for the same email.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- Case-insensitive uniqueness (so "Name@Example.com" and "name@example.com"
-- can't both get a row). Multiple NULL emails are still allowed.
create unique index if not exists workers_email_unique_idx on workers (lower(email));
