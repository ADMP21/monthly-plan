# Monthly Plan Supabase Setup

## 1. Create Supabase project

Create a project at Supabase, then open `Project Settings > API`.

Copy:

- Project URL
- anon public key

Put them in `config.js`.

```js
window.MONTHLY_PLAN_CONFIG = {
  supabaseUrl: "https://your-project.supabase.co",
  supabaseAnonKey: "your-anon-key",
};
```

## 2. Create database table

Open `SQL Editor` in Supabase and run everything inside `supabase-schema.sql`.

This creates the `monthly_plans` table and Row Level Security policies so each signed-in user can only read and edit their own plans.

## 3. Auth settings

For the quickest setup, open `Authentication > Providers > Email`.

If you want users to sign in immediately after registering, turn off email confirmation.

If you keep email confirmation on, users must confirm email before login.

## 4. Deploy to Vercel

Deploy these files as a static site:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `supabase-schema.sql` and this setup file are only for reference

No build command is needed.
