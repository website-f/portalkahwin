# PortalKahwin

Malaysian digital wedding-card (kad kahwin) platform — **Laravel + React (one app) · MySQL · ToyyibPay · no Supabase**.
Full plan/spec: [PLAN.md](PLAN.md).

## Stack (P0 scaffolded)
- Laravel 13 (PHP 8.4) — serves the JSON API **and** hosts the React SPA
- React 18 + TypeScript + Vite 8 (`resources/js/`)
- MySQL (Eloquent) · Sanctum auth
- SPA catch-all route so deep links (e.g. `/e/aisyah-danial`) never 404

## Run — development (two processes, HMR)
```bash
php artisan serve            # http://127.0.0.1:8000  (API + serves React)
npm run dev                  # Vite dev server for hot reload
```
Open http://127.0.0.1:8000 — the page pings `/api/health` and shows Laravel/PHP/MySQL status.

## Run — production build (single process, what cPanel uses)
```bash
npm run build                # compiles React into public/build/
php artisan serve            # (or php-fpm) — no Node needed at runtime
```

## Deploy — cPanel
1. Upload the app; point the domain's document root at **`public/`**.
2. `composer install --no-dev`  ·  set `.env` (APP_ENV=production, MySQL creds).
3. `npm run build` (locally or on server) so `public/build/` exists.
4. `php artisan migrate --force` · `php artisan storage:link`.
5. Only PHP runs in prod — the SPA + `/api/*` are served by one process.

## Health check
`GET /api/health` → `{ app, laravel, php, database:"connected", supabase:"none" }`

## Local DB (this machine)
MySQL `portalkahwin` on 127.0.0.1:3306, user `root` / pass `root` (dev only — cPanel uses its own creds in `.env`).
