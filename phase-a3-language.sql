-- Phase A3: per-account language preference (English/Spanish toggle).
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

alter table workers
  add column if not exists preferred_language text not null default 'en';

alter table workers
  drop constraint if exists workers_preferred_language_check;

alter table workers
  add constraint workers_preferred_language_check
  check (preferred_language in ('en', 'es'));
