<div align="center">

# Gerador de Sites

**Multi-tenant micro-SaaS that turns a Google Maps listing into a website for a local business.**

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)
![OpenAI API](https://img.shields.io/badge/OpenAI_API-412991?style=flat-square&logo=openai&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)

</div>

## About

Many small local businesses have a Google Maps listing but no website, and building one by hand for each of them does not scale. Gerador de Sites lets an admin find those businesses, paste a Maps link, pick a template and get a site provisioned on its own subdomain, with the content generated and validated against a schema. The business owner then signs in with a magic link and edits the content from a dashboard. The interface is in Brazilian Portuguese.

## Features

- **Prospector**: searches businesses through Google Places or OpenStreetMap (Overpass), shows them on a Leaflet map and scores each one by rating, review count and whether it already has a website
- **Website resolver** that tells a real website apart from a Maps or chain link
- **Site creation pipeline**: Places data, generated copy and SEO fields validated with Zod per template, then the site is stored in Supabase
- **Manual form** to create a site when extraction fails
- **Multi-tenant routing** by subdomain in `middleware.ts`; public sites under `/sites/[slug]` with on-demand revalidation
- **Two templates**: universal and restaurant
- **Client dashboard**: content editor and image upload with in-browser compression
- **Auth** with Supabase magic links and an admin role, with Row Level Security in the database

## Tech stack

| Area | Choice |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, Lucide, Sonner, React Leaflet |
| Data and auth | Supabase (Postgres, Row Level Security, Auth, Storage) |
| Data sources | Google Places API, OpenStreetMap Overpass |
| Content generation | OpenAI API with Zod-validated output |
| Tests | Vitest |
| Deploy | Vercel (subdomain per tenant) |

## Getting started

```bash
npm install
npm run dev     # admin panel at http://localhost:3000
```

Client sites are served at `http://{slug}.localhost:3000`.

The repository has no `.env.example` yet. These are the variables the code reads; put them in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PLATFORM_HOST`
- `PLACES_PROVIDER` (`google` by default)
- `GOOGLE_PLACES_API_KEY`
- `OVERPASS_API_URL`, `OVERPASS_USER_AGENT` (optional)
- `OPENAI_API_KEY` (optional)

Apply the schema in `supabase/migrations/` with `supabase db push`, or paste the SQL into the Supabase SQL Editor. After signing in once with a magic link, promote your account to admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

## Project structure

```
src/
  app/
    admin/          admin panel and prospector
    dashboard/      client dashboard (content, domain, subscription)
    sites/[slug]/   public tenant sites
    api/            prospects, sites, upload routes
  components/       admin, prospector, dashboard and UI components
  lib/              places providers, scoring, website resolver, schemas, services, Supabase clients
  templates/        universal and restaurant templates
  middleware.ts     subdomain routing
supabase/           config and SQL migration
```

## Tests

```bash
npm test        # 19 tests in 2 files (Vitest)
```

## Roadmap

- Stripe billing and handling of unpaid accounts
- Custom domains through the Vercel Domains API
- Monitoring and churn clean-up

## Author

**Lorenzo Leão Dotto**, full-stack developer.

[![Portfolio](https://img.shields.io/badge/Portfolio-lorenzodotto.com.br-2dbd82?style=flat-square&labelColor=0c0d0b)](https://lorenzodotto.com.br)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-lorenzodotto-2dbd82?style=flat-square&logo=linkedin&logoColor=white&labelColor=0c0d0b)](https://www.linkedin.com/in/lorenzodotto)
[![GitHub](https://img.shields.io/badge/GitHub-DottoLeao-2dbd82?style=flat-square&logo=github&logoColor=white&labelColor=0c0d0b)](https://github.com/DottoLeao)
