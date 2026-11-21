# MovieScope

A responsive React and Vite movie review application with public reviewer access and a protected admin dashboard.

## Supabase setup

1. Open the Supabase SQL Editor for project `teqbcjyngfwagsenzpmu`.
2. Run the complete contents of `supabase-schema.sql`.
3. Restart the Vite development server if it is already running.

The application stores Supabase credentials in `.env.local`. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are loaded by Vite at startup.

## Features

- Browse and search movies by title, director, or genre
- Submit reviewer details and a 1–5 star movie rating
- Store movies and reviews in Supabase
- Fall back to browser localStorage for initial/sample data
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
```
