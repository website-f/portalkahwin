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

### The CLI and the web PHP must match

cPanel keeps them separate, and this bites hard: `composer install` resolves
against the **CLI** PHP, while `vendor/composer/platform_check.php` runs against
the **web** PHP on every request. A newer CLI silently locks packages the web
server cannot run, and every page dies with:

> Composer detected issues in your platform: Your Composer dependencies require
> a PHP version ">= 8.4.1"

`composer.json` pins `config.platform.php` to **8.3.0** so the lock always
resolves for 8.3 regardless of how new the build machine's PHP is. Keep that pin
unless every environment is on 8.4+.

Check both — the CLI number tells you nothing about the browser:

```bash
php -v                                    # CLI PHP
```

For the **web** PHP, hit a one-liner through the browser:

```bash
echo '<?php echo PHP_VERSION;' > ~/public_html/app/v.php
# open https://portalkahwin.com/app/v.php  then:  rm ~/public_html/app/v.php
```

### If the web PHP is below 8.3

No Composer setting can rescue this — `laravel/framework` requires `"php": "^8.3"`,
so the framework itself will not install lower. The web PHP has to come up.

Note that PHP 8.2 is **not** an option: Laravel 13 declares `"php": "^8.3"`, so
Composer will not install the framework there whatever the platform config says.
Staying on 8.2 would mean downgrading the app to Laravel 12 — a much larger job
than changing a dropdown.

**Option A — whole domain.** cPanel → **MultiPHP Manager** → set `portalkahwin.com`
to PHP 8.3 (or newer). This also moves WordPress at the root; WordPress has
supported 8.3 since 6.4, so on a current install this is normally fine. Check the
site afterwards.

Tip: if `php -v` over SSH already reports 8.3/8.4, that version is installed on
the server and MultiPHP Manager will offer it — the CLI and the web simply
default to different ones.

**Option B — only `/app`.** If you would rather not touch WordPress, raise PHP for
this directory alone with a handler in `public/.htaccess` (a commented template
is already in that file):

```apache
<IfModule mime_module>
  AddHandler application/x-httpd-ea-php83 .php .php8 .phtml
</IfModule>
```

CloudLinux / LiteSpeed accounts use `application/x-httpd-alt-php83___lsphp`
instead. If neither works the host has not built 8.3 for the account — that is a
support ticket, not a config change.

### proc_open

Many cPanel accounts disable `proc_open`. Composer still installs, but its
post-install hook fails with *"The Process class relies on proc_open"*, leaving
`bootstrap/cache/packages.php` unwritten — so auto-discovered packages (dompdf,
sanctum) never register.

Either re-enable it in cPanel → **Select PHP Version → Options →
`disable_functions`** (remove `proc_open`), or just run the discovery step
directly afterwards, which does not need it:

```bash
php artisan package:discover
```

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
ASSET_URL=/app                            # REQUIRED — root-relative, see below
APP_NOINDEX=true                          # emits <meta robots="noindex,nofollow">
```

`ASSET_URL` is not optional. Laravel's `asset()` falls back to the *request* host
(`portalkahwin.com`), not `APP_URL`, so `@vite` would emit `/build/assets/app.js`
— which WordPress answers with a 404.

**Keep it root-relative (`/app`), not absolute.** An absolute value hard-codes one
hostname, so a visitor who arrives on the other spelling gets:

> Access to script at 'https://portalkahwin.com/app/build/assets/app-….js' from
> origin 'https://www.portalkahwin.com' has been blocked by CORS policy

Vite emits `<script type="module">`, and module scripts are **always** CORS-checked
even for plain `<script src>`. `/app` sidesteps it entirely by staying on whatever
origin the page was served from. `APP_URL` stays absolute — it drives emails and
the `app-base` meta, which only reads the path.

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

### "migrate ran but phpMyAdmin shows no tables"

Two traps, and they stack.

**Without `.env`, migrations silently go to SQLite.** `config/database.php` reads
`env('DB_CONNECTION', 'sqlite')`, so with no `.env` there is nothing to say
"mysql" and Laravel happily creates `database/database.sqlite` instead. That is
why `php artisan migrate` appeared to work before you had configured anything.

**A cached config ignores `.env` completely.** If `php artisan config:cache` ever
ran (step 6 below), `bootstrap/cache/config.php` is authoritative and editing
`.env` afterwards changes nothing — so migrations keep landing in SQLite even
after the MySQL credentials look correct.

Always confirm the target before migrating:

```bash
php artisan config:clear     # drop bootstrap/cache/config.php
php artisan db:show          # MUST print your MySQL database name
rm -f database/database.sqlite   # bin the accidental SQLite file
php artisan migrate --force
php artisan db:show          # tables should now be listed
```

If `db:show` still reports sqlite after `config:clear`, the `.env` is not being
read at all: check it sits at `~/portalkahwin/.env` (not in `public_html`), is
readable by the account, and actually contains `DB_CONNECTION=mysql`.

⚠️ `migrate:fresh` **drops every table** in whatever database it is pointed at.
Run `db:show` first, every time.

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
