# Chathur Lakshana Academy of Fine Arts

Official web application for Chathur Lakshana Academy of Fine Arts (Bharatanatyam, Carnatic Vocal, and Fine Arts studio mentorship).

## Tech Stack
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Classical Luxury Dark Theme & Vanilla CSS tokens
- **Backend & Auth:** Supabase (Database, Auth, and Storage)
- **Deployment:** Vercel

---

## Supabase Configuration & Environment Variables

### Local Development (.env)
Create a `.env` file in the root directory (already added to `.gitignore`):

```bash
VITE_SUPABASE_URL=https://xoeizbsngsattbeykuvf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: List of authorized admin emails (comma-separated)
VITE_ADMIN_EMAILS=admin@chathurlakshana.in,admin@admin.com
```

### Production Deployment (Vercel)
When deploying to Vercel (e.g. `https://dancing12345.vercel.app/`):
1. Navigate to **Vercel Dashboard → Your Project → Settings → Environment Variables**.
2. Add the following variables:
   - `VITE_SUPABASE_URL` = `https://xoeizbsngsattbeykuvf.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `<YOUR_SUPABASE_PUBLIC_KEY>`
   - `VITE_SUPABASE_ANON_KEY` = `<YOUR_SUPABASE_ANON_KEY>`
   - (Optional) `VITE_ADMIN_EMAILS` = `admin@chathurlakshana.in`
3. Trigger a redeploy from **Deployments → Redeploy** so Vite injects the variables during build time.

---

## Database & Security Setup

1. Open your Supabase Dashboard: [https://supabase.com/dashboard/project/xoeizbsngsattbeykuvf](https://supabase.com/dashboard/project/xoeizbsngsattbeykuvf)
2. Go to **SQL Editor** → **New Query**.
3. Copy and run the contents of [supabase_schema_and_policies.sql](./supabase_schema_and_policies.sql).
4. This script configures:
   - `public.gallery_images` with Row Level Security (RLS)
   - `public.gallery_reels` with RLS
   - `public.enquiries` with RLS
   - `public.admin_users` table and `is_admin()` helper function
   - `gallery` public storage bucket and upload policies

---

## Creating an Administrator Account

1. In Supabase Dashboard, go to **Authentication → Users → Add User → Create User**.
2. Enter the admin Email (e.g. `admin@chathurlakshana.in`) and a secure Password.
3. In SQL Editor, grant admin access by running:
   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email = 'admin@chathurlakshana.in';
   ```
4. Now log in at:
   - Local: `http://localhost:5173/admin`
   - Production: `https://dancing12345.vercel.app/admin`

---

## Scripts

```bash
# Run local dev server
npm run dev

# Typecheck and build production bundle
npm run build

# Preview build locally
npm run preview
```
