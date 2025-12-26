create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  content_provider text,
  content_provider_id text,
  content_title text,
  content_url text,
  tmdb_metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  body text not null,
  author_id text,
  author_label text,
  score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists content_catalog (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  tmdb_type text not null,
  title text not null,
  year text,
  genres text[],
  overview text,
  poster_url text,
  rating numeric,
  vote_count integer,
  tmdb_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_mappings (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_id text not null,
  content_catalog_id uuid references content_catalog(id) on delete cascade,
  confirmed_by text,
  confirmed_at timestamptz,
  tmdb_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists comments_thread_id_idx on comments(thread_id);
create index if not exists comments_parent_id_idx on comments(parent_id);
create unique index if not exists content_catalog_tmdb_idx on content_catalog(tmdb_id, tmdb_type);
create unique index if not exists content_mappings_provider_idx on content_mappings(provider, provider_id);

alter table threads enable row level security;
alter table comments enable row level security;
alter table content_catalog enable row level security;
alter table content_mappings enable row level security;

create policy "Public read threads" on threads
  for select using (true);

create policy "Public insert threads" on threads
  for insert with check (true);

create policy "Public read comments" on comments
  for select using (true);

create policy "Public insert comments" on comments
  for insert with check (true);

create policy "Public update comments" on comments
  for update using (true);

create policy "Public read catalog" on content_catalog
  for select using (true);

create policy "Public insert catalog" on content_catalog
  for insert with check (true);

create policy "Public read mappings" on content_mappings
  for select using (true);

create policy "Public upsert mappings" on content_mappings
  for insert with check (true);

create policy "Public update mappings" on content_mappings
  for update using (true);
