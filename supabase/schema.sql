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

create table if not exists content_metadata (
  id uuid primary key default gen_random_uuid(),
  url text,
  platform text,
  platform_item_id text,
  title text,
  year_released text,
  tmdb_id integer,
  content_type text,
  alternate_titles text[],
  genres text[],
  director text[],
  main_cast text[],
  posters text[],
  imdb_id text,
  wikidata_id text,
  tmdb_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_external_ids (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  content_id uuid references content_metadata(id) on delete set null,
  url text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table content_metadata add column if not exists content_type text;
alter table content_metadata add column if not exists alternate_titles text[];
alter table content_metadata add column if not exists genres text[];
alter table content_metadata add column if not exists director text[];
alter table content_metadata add column if not exists main_cast text[];
alter table content_metadata add column if not exists posters text[];
alter table content_metadata add column if not exists imdb_id text;
alter table content_metadata add column if not exists wikidata_id text;

create index if not exists comments_thread_id_idx on comments(thread_id);
create index if not exists comments_parent_id_idx on comments(parent_id);
create unique index if not exists content_catalog_tmdb_idx on content_catalog(tmdb_id, tmdb_type);
create unique index if not exists content_mappings_provider_idx on content_mappings(provider, provider_id);
create unique index if not exists content_metadata_url_idx on content_metadata(url);
create unique index if not exists content_metadata_platform_idx on content_metadata(platform, platform_item_id);
create unique index if not exists content_external_ids_source_idx on content_external_ids(source, external_id);

alter table threads enable row level security;
alter table comments enable row level security;
alter table content_catalog enable row level security;
alter table content_mappings enable row level security;
alter table content_metadata enable row level security;
alter table content_external_ids enable row level security;

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

create policy "Public read content metadata" on content_metadata
  for select using (true);

create policy "Public insert content metadata" on content_metadata
  for insert with check (true);

create policy "Public update content metadata" on content_metadata
  for update using (true);

create policy "Public read content external ids" on content_external_ids
  for select using (true);

create policy "Public insert content external ids" on content_external_ids
  for insert with check (true);

create policy "Public update content external ids" on content_external_ids
  for update using (true);
