-- ==============================================================================
-- CHATHUR LAKSHANA ACADEMY OF FINE ARTS
-- SUPABASE COMPLETE DATABASE SCHEMA, RLS POLICIES & STORAGE SETUP
-- ==============================================================================
-- Run this SQL in your Supabase SQL Editor:
-- Supabase Dashboard → SQL Editor → New Query → Paste & Run
-- ==============================================================================

-- 1. CREATE EXTENSIONS
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. CREATE / VERIFY TABLES
-- ==============================================================================

-- TABLE: gallery_images
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  storage_path text,
  display_order int default 0,
  is_published boolean default true,
  category text default 'PERFORMANCES',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: gallery_reels
create table if not exists public.gallery_reels (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  instagram_url text not null,
  thumbnail_url text,
  display_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: enquiries
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  course text not null,
  preferred_contact text default 'WhatsApp',
  message text not null,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz default now()
);

-- TABLE: admin_users (Server-controlled admin allowlist)
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz default now()
);

-- ==============================================================================
-- 3. ADMIN AUTHORIZATION FUNCTION (SECURITY DEFINER)
-- ==============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
    and (
      (raw_app_meta_data->>'role') = 'admin'
      or (raw_app_meta_data->>'is_admin')::boolean = true
      or exists (select 1 from public.admin_users where user_id = auth.uid() or email = auth.users.email)
    )
  );
$$;

-- ==============================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS) & ADD MISSING COLUMNS
-- ==============================================================================
alter table public.gallery_images add column if not exists category text default 'PERFORMANCES';

alter table public.gallery_images enable row level security;
alter table public.gallery_reels enable row level security;
alter table public.enquiries enable row level security;
alter table public.admin_users enable row level security;

-- ==============================================================================
-- 5. RLS POLICIES FOR gallery_images
-- ==============================================================================
drop policy if exists "Public view published gallery images" on public.gallery_images;
drop policy if exists "Admin manage all gallery images" on public.gallery_images;
drop policy if exists "Admin insert gallery images" on public.gallery_images;
drop policy if exists "Admin update gallery images" on public.gallery_images;
drop policy if exists "Admin delete gallery images" on public.gallery_images;
drop policy if exists "Public Select gallery_images" on public.gallery_images;
drop policy if exists "Allow Insert gallery_images" on public.gallery_images;
drop policy if exists "Allow Update gallery_images" on public.gallery_images;
drop policy if exists "Allow Delete gallery_images" on public.gallery_images;

create policy "Public Select gallery_images" on public.gallery_images for select using (true);
create policy "Allow Insert gallery_images" on public.gallery_images for insert with check (true);
create policy "Allow Update gallery_images" on public.gallery_images for update using (true);
create policy "Allow Delete gallery_images" on public.gallery_images for delete using (true);

-- ==============================================================================
-- 6. RLS POLICIES FOR gallery_reels
-- ==============================================================================
drop policy if exists "Public view published reels" on public.gallery_reels;
drop policy if exists "Admin insert reels" on public.gallery_reels;
drop policy if exists "Admin update reels" on public.gallery_reels;
drop policy if exists "Admin delete reels" on public.gallery_reels;
drop policy if exists "Public Select gallery_reels" on public.gallery_reels;
drop policy if exists "Allow Insert gallery_reels" on public.gallery_reels;
drop policy if exists "Allow Update gallery_reels" on public.gallery_reels;
drop policy if exists "Allow Delete gallery_reels" on public.gallery_reels;

create policy "Public Select gallery_reels" on public.gallery_reels for select using (true);
create policy "Allow Insert gallery_reels" on public.gallery_reels for insert with check (true);
create policy "Allow Update gallery_reels" on public.gallery_reels for update using (true);
create policy "Allow Delete gallery_reels" on public.gallery_reels for delete using (true);

-- ==============================================================================
-- 7. RLS POLICIES FOR enquiries
-- ==============================================================================
drop policy if exists "Public submit enquiries" on public.enquiries;
drop policy if exists "Admin view enquiries" on public.enquiries;
drop policy if exists "Admin update enquiries" on public.enquiries;
drop policy if exists "Admin delete enquiries" on public.enquiries;
drop policy if exists "Allow Insert enquiries" on public.enquiries;
drop policy if exists "Allow Select enquiries" on public.enquiries;
drop policy if exists "Allow Update enquiries" on public.enquiries;
drop policy if exists "Allow Delete enquiries" on public.enquiries;

create policy "Allow Insert enquiries" on public.enquiries for insert with check (true);
create policy "Allow Select enquiries" on public.enquiries for select using (true);
create policy "Allow Update enquiries" on public.enquiries for update using (true);
create policy "Allow Delete enquiries" on public.enquiries for delete using (true);

-- ==============================================================================
-- 8. SUPABASE STORAGE BUCKETS & POLICIES ('gallery-images' & 'gallery')
-- ==============================================================================
-- Ensure both buckets exist and are marked public
insert into storage.buckets (id, name, public)
values 
  ('gallery-images', 'gallery-images', true),
  ('gallery', 'gallery', true)
on conflict (id) do update set public = true;

-- Drop any previous storage policies to avoid naming collisions
drop policy if exists "Public view gallery bucket objects" on storage.objects;
drop policy if exists "Authenticated admin upload gallery objects" on storage.objects;
drop policy if exists "Authenticated admin update gallery objects" on storage.objects;
drop policy if exists "Authenticated admin delete gallery objects" on storage.objects;

drop policy if exists "Public View for gallery buckets" on storage.objects;
drop policy if exists "Allow Upload for gallery buckets" on storage.objects;
drop policy if exists "Allow Update for gallery buckets" on storage.objects;
drop policy if exists "Allow Delete for gallery buckets" on storage.objects;

-- Allow public read access to all images in gallery-images and gallery buckets
create policy "Public View for gallery buckets"
  on storage.objects
  for select
  using (bucket_id in ('gallery-images', 'gallery'));

-- Allow upload into gallery-images and gallery buckets
create policy "Allow Upload for gallery buckets"
  on storage.objects
  for insert
  with check (bucket_id in ('gallery-images', 'gallery'));

-- Allow update/replace images in gallery-images and gallery buckets
create policy "Allow Update for gallery buckets"
  on storage.objects
  for update
  using (bucket_id in ('gallery-images', 'gallery'));

-- Allow delete images from gallery-images and gallery buckets
create policy "Allow Delete for gallery buckets"
  on storage.objects
  for delete
  using (bucket_id in ('gallery-images', 'gallery'));

-- ==============================================================================
-- 9. REGISTER OFFICIAL ACADEMY ADMINISTRATOR
-- ==============================================================================
-- Register chathurlakshanaacademy@gmail.com into admin_users allowlist:
insert into public.admin_users (email)
values ('chathurlakshanaacademy@gmail.com')
on conflict (email) do nothing;

-- If the user already exists in auth.users, link user_id and set app_metadata role:
update public.admin_users
set user_id = auth.users.id
from auth.users
where public.admin_users.email = auth.users.email
and public.admin_users.user_id is null;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where lower(email) = 'chathurlakshanaacademy@gmail.com';
-- ==============================================================================
