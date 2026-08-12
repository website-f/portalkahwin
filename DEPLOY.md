# Deploying to portalkahwin.com/app (cPanel, WordPress at the root)

The domain root stays WordPress. This Laravel app is mounted at
`https://portalkahwin.com/app`, so every route lives under that prefix:

| Local | Production |
|---|---|
| `/` | `/app` |
| `/login`, `/register` | `/app/login`, `/app/register` |
| `/panel/...` (user) | `/app/panel/...` |
| `/admin/...` | `/app/admin/...` |
| `/e/:slug` (public card) | `/app/e/:slug` |
| `/api/...` | `/app/api/...` |

## Layout

Clone **outside** `public_html` and expose only `public/` through a symlink:

```
~/portalkahwin/          <- git clone: app/ config/ routes/ vendor/ .env …
~/portalkahwin/public/   <- the only web-reachable directory
~/public_html/app        -> symlink to ~/portalkahwin/public
```

Do **not** clone into `public_html` directly. That puts `.env` (DB password, mail
password, ToyyibPay secret) one URL away from the public internet.

## 0. Preflight

```bash
php -v          # must be 8.3+ (composer.json requires ^8.3)
composer -V     # if missing: install to ~/bin, see step 2
git --version
```

If `php -v` is older, set PHP 8.3 for the domain in cPanel → **MultiPHP Manager**,
and use the matching CLI binary (often `/opt/cpanel/ea-php83/root/usr/bin/php`).

## 1. Clone

```bash
cd ~
git clone https://github.com/website-f/portalkahwin.git portalkahwin
cd portalkahwin
```

## 2. PHP dependencies

`vendor/` is gitignored, so it must be installed on the server:

```bash
composer install --no-dev --optimize-autoloader
```

This now also pulls **barryvdh/laravel-dompdf**, which renders the PDF receipts.
Skipping `composer install` on a deploy makes `/purchases/{id}/receipt` fatal.

No composer? Install it locally to your home directory:

```bash
curl -sS https://getcomposer.org/installer | php -- --install-dir=$HOME/bin --filename=composer
export PATH="$HOME/bin:$PATH"
```

## 3. `.env`

```bash
cp .env.example .env
php artisan key:generate
```

Then edit. The four lines that matter for subdirectory hosting:

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://portalkahwin.com/app     # drives routes, links, emails, app-base meta
ASSET_URL=https://portalkahwin.com/app   # REQUIRED — without it CSS/JS 404 into WordPress
APP_NOINDEX=true                          # emits <meta robots="noindex,nofollow">
```

`ASSET_URL` is not optional. Laravel's `asset()` falls back to the *request* host
(`portalkahwin.com`), not `APP_URL`, so `@vite` would emit `/build/assets/app.js`
— which WordPress answers with a 404.

Also set: `DB_*` (cPanel → MySQL Databases), `MAIL_*`, and the live ToyyibPay keys
with `TOYYIBPAY_ENV=production`.

### Sign in with Google

```ini
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
# Optional. Unset, it derives <APP_URL>/api/auth/google/callback.
# GOOGLE_REDIRECT_URI=
```

In Google Cloud Console → APIs & Services → Credentials, the OAuth client must
list the **production** URLs, not just the local ones:

- Authorised JavaScript origin: `https://portalkahwin.com`
- Authorised redirect URI: `https://portalkahwin.com/app/api/auth/google/callback`

Note the `/app` — the redirect URI must match byte for byte or Google refuses
with `redirect_uri_mismatch`. The consent screen must also be **published**;
in Testing mode only listed test users can sign in.

Leave the keys blank and the sign-in button degrades to a clean error rather
than breaking the page, so this can be deferred past first launch.

## 4. Database, storage, permissions

```bash
php artisan migrate --force
php artisan storage:link
chmod -R 775 storage bootstrap/cache
```

`storage:link` is not optional here: uploaded media, company logos, approval
receipts and storage-tab downloads are all served from `/storage/…`.

## 5. Mount it

```bash
ln -s ~/portalkahwin/public ~/public_html/app
```

WordPress will not intercept `/app` — its rewrite rules are guarded by
`RewriteCond %{REQUEST_FILENAME} !-d`, and `/app` resolves to a real directory.

If the host blocks symlinks (blank page or 403), fall back to a real directory:
`mkdir ~/public_html/app`, copy `public/*` into it, and edit its `index.php` so
both `require` paths point at `~/portalkahwin/…`. You then have to re-copy
`public/build` on every deploy, which is why the symlink is worth fighting for.

## 6. Cache for production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Re-run `config:cache` after **any** `.env` edit — a cached config ignores `.env`
completely, which is the single most common "I changed it and nothing happened"
on cPanel.

## 7. Keeping crawlers out

Three layers, because each covers a different gap:

1. **`X-Robots-Tag` header** — already in `public/.htaccess`. This is the
   load-bearing one: it applies to every response including the JSON API.
2. **`<meta name="robots">`** — emitted when `APP_NOINDEX=true`.
3. **Root `robots.txt`** — `public_html/robots.txt` (WordPress's). `/app/robots.txt`
   is *never read by crawlers*; robots.txt is only fetched from the domain root.

On layer 3, know the trade-off before adding it: `Disallow: /app/` stops crawlers
fetching the pages, which also stops them ever *seeing* the noindex header — so a
URL discovered elsewhere can still appear as a bare link in results. If you want
the app genuinely absent from search, rely on layers 1 and 2 and leave robots.txt
alone. Add `Disallow: /app/` only if you also want to spare the crawl budget.

## Deploying an update

The frontend build is committed (`public/build/` is tracked), because the server
has no npm. **On your laptop, before pushing:**

```bash
npm run build
git add -A public/build
git commit -m "build"
git push
```

Forgetting this ships backend changes against a stale bundle.

**On the server:**

```bash
cd ~/portalkahwin
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

## How one build serves both paths

The bundle never hardcodes `/app`. `resources/views/app.blade.php` renders
`<meta name="app-base">` from `APP_URL`, and `resources/js/lib/base.ts` reads it
at runtime:

- `api.ts` → `baseURL: url('/api')`
- `AppRouter` → `<BrowserRouter basename={BASE}>` (covers every `<Link>`)
- hand-written `<a href>` and QR/share URLs → `appUrl()` / `absoluteUrl()`

So the same committed build runs at `/` locally and `/app` in production. If you
ever add a hand-built URL, route it through `url()` or it will 404 in production
while working fine on your machine.
