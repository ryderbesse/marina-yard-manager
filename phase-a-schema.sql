-- Phase A: schema additions for worker groups, worker notes,
-- job change requests, and in-app meetings.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

create table if not exists worker_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists worker_group_members (
  group_id uuid not null references worker_groups(id) on delete cascade,
  worker_id uuid not null references workers(id) on delete cascade,
  primary key (group_id, worker_id)
);

alter table workers add column if not exists notes text;

alter table jobs
  add column if not exists change_request text,
  add column if not exists change_request_by uuid references workers(id),
  add column if not exists change_request_at timestamptz;

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 30,
  notes text,
  organizer_worker_id uuid not null references workers(id),
  attendee_worker_id uuid not null references workers(id),
  created_at timestamptz not null default now()
);

alter table worker_groups enable row level security;
alter table worker_group_members enable row level security;
alter table meetings enable row level security;
