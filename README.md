# MovieScope

A responsive React and Vite movie review application with public reviewer access and a protected admin dashboard.

## Supabase setup

1. Open the Supabase SQL Editor for your project.
2. Run the complete contents of `supabase-schema.sql`.
3. Keep Supabase RLS policies and grants enabled as described in the schema.

## Netlify deployment

1. Push this project to GitHub.
2. In Netlify, select **Add new project** → **Import an existing project**.
3. Choose this repository.
4. Netlify will detect Vite and use `netlify.toml` automatically.
5. Add these environment variables in **Site configuration** → **Environment variables**:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Use only the publishable key. Never add a Supabase service-role key or secret key to a Vite frontend.

The included `netlify.toml` builds `npm run build`, publishes the `dist` directory, and routes all paths to `index.html` for SPA support.

## Features

- Browse and search movies by title, director, or genre
- Submit reviewer details and a 1–5 star movie rating
- Store movies and reviews in Supabase
- Sign in to the admin portal with `admin` / `admin123`
- Add movies and manage the catalog
- Filter reviews by reviewer, movie, gender, rating, or location

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown by Vite, usually `http://localhost:5173/`.

## Build

```bash
npm run build
npm run preview
```
