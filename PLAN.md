# PortalKahwin — Project Plan & Living Spec

> Malaysian digital wedding-card (kad kahwin) platform with an **admin panel** and a **user panel**.
> Built by porting the mechanisms of `../project_miibook` onto a **Laravel + React** stack for cPanel.
> Status: **planning approved — scaffolding not started.**

---

## 1. Reality check on the reference (`project_miibook`)

`project_miibook` is **not** a Laravel app. Inspected 2026-08-11:

- **Vite + React 18 + TypeScript + TailwindCSS SPA** (bolt.new-generated, "WeMoments/Miibook").
- Backend = **Supabase** (hosted Postgres + Auth + Storage + Edge Functions). **Not** Laravel/MySQL.
- Payments = **Stripe** (edge functions + webhook). **Not** ToyyibPay.
- Scale: **233 TS/TSX files, ~76,000 LOC, 430 direct `supabase.*` calls in 101 files**, ~40 Postgres tables, 3 edge functions.
- It is already a full wedding/event e-invitation platform: HQ admin, analytics, visitor tracking, plans/purchases, RSVP, and a complete Konva + dnd-kit **seating floorplan**.

**Consequence:** "copy all mechanism and run `artisan serve`" = a **port**, not copy-paste. We keep the React UI/mechanics and **replace the data layer** (Supabase → Laravel/MySQL) and the **payment gateway** (Stripe → ToyyibPay).

### Port translation map

| miibook (source) | portalkahwin (target) |
|---|---|
| Supabase Auth (18 calls) | Laravel **Sanctum** (SPA cookie auth, same-origin) |
| Supabase Postgres + RLS | **MySQL** + Eloquent models + Policies |
| `supabase.from(...)` (329 calls) | `api.*(...)` → Laravel REST controllers (`/api/*`) |
| `supabase.rpc(...)` (27 calls) | Laravel service methods / dedicated endpoints |
| `supabase.storage` (56 calls) | Laravel **`public` disk** (cPanel filesystem) |
| Edge fns: checkout / stripe-webhook / send-otp / create-hq-admin | Laravel controllers + queued jobs |
| **Stripe** | **ToyyibPay** (FPX online banking + e-wallet) |
| Postgres `uuid` / `jsonb` / `text[]` | MySQL `char(36)` (keep UUIDs) / `json` / `json`-cast arrays |
| Postgres triggers (auto-create seating settings, etc.) | Eloquent **model observers** |

> **Decision:** keep **UUID string primary keys** (`HasUuids`) to avoid rewriting id handling across the ported React code.

---

## 2. Architecture (locked)

**One Laravel 11 app** that serves the **JSON API** and **hosts the built React SPA**. The miibook react-router SPA is ported near-verbatim; Laravel is a catch-all host + `/api/*`. (Chosen over Inertia to maximise reuse of miibook's ~76k LOC.)

- **Auth:** Sanctum stateful (cookie + CSRF) — clean because the SPA is served same-origin by Laravel.
- **Dev:** `php artisan serve` (API + SPA host) **+** `npm run dev` (Vite HMR) — two processes.
- **Prod (cPanel):** `npm run build` once → static assets in `public/build`; **only PHP runs** (php-fpm / `artisan serve`), no Node. Matches the existing cPanel deployment convention.

### Directory layout

```
portalkahwin/
├── app/
│   ├── Models/                 Eloquent models (UUID PKs)
│   ├── Http/Controllers/Api/   REST controllers (replace supabase.from)
│   ├── Policies/               authz (replace RLS)
│   ├── Observers/              auto-create side effects (replace triggers)
│   └── Services/Toyyibpay/     ToyyibpayService (bills, categories, callbacks)
├── routes/
│   ├── api.php                 /api/* — all data
│   └── web.php                 catch-all → built React index.html
├── database/migrations/        ~40 tables ported Supabase → MySQL
├── resources/js/               ← React app ported from miibook/src
│   ├── App.tsx  pages/  components/  contexts/  hooks/
│   └── lib/api.ts              ← replaces lib/supabase.ts (single seam)
├── storage/app/public/         uploads (templates, photos) → storage:link
├── public/build/               Vite output (served by Laravel in prod)
└── vite.config.ts              laravel-vite-plugin
```

### The single porting seam: `lib/api.ts`

miibook centralises DB access through `lib/supabase.ts`. We replace it with `lib/api.ts` exposing the same shape, so most call sites change minimally:

```ts
// before (miibook)
const { data } = await supabase.from('events').select('*').eq('id', id).single();
// after (portalkahwin)
const data = await api.get(`/invitations/${id}`);
```

Where a `.from().select()` chain is complex, the Laravel controller returns the already-shaped payload.

---

## 3. Data model — MySQL (MVP scope)

Reframed from miibook's `events`-centric model to a wedding-card model. Keep UUID PKs.

**Identity & billing**
- `users` — host accounts (name, email, phone, plan, is_active)
- `admins` — HQ/admin accounts (ported from `hq_admins`), role/permissions
- `plans` + `plan_features` — server-driven feature gating (ported)
- `subscriptions` — active paid subscription per user
- `payments` — ToyyibPay bills (bill_code, amount, status, purpose, callback payload)
- `promo_codes` — discount codes (ported)

**Templates (admin-managed)**
- `templates` — name, category, style/`theme_json`, thumbnail_path, tier/price, is_active, is_published
- `template_usage` — per-template usage count → "most used templates"

**The card**
- `invitations` (miibook `events` reframed) — user_id, template_id, slug, bride/groom names, akad datetime, reception datetime, venue, map_waze_url, map_google_url, tentative/`program_json`, contacts/`contacts_json`, gift/DuitNow registry, music_url, `theme_json`, plan, status
- `rsvp_guests` — invitation_id, name, phone, pax, status(pending/attending/declined/attended), notes, `custom_fields_json`, responded_by
- `rsvp_custom_fields` — per-invitation extra RSVP questions

**Seating (ported near-verbatim from miibook `20260223_tables_seating_feature.sql`)**
- `event_seating_settings` — canvas + auto-assign prefs (auto_unassign_declined, seats-per-shape, show_guest_names)
- `floorplan_zones` — named areas
- `floorplan_tables` — shape/seat_count/position/rotation/locked/tags
- `table_seats` — seat_index + nullable `rsvp_guest_id` (the assignment)
- `floorplan_versions` — snapshot history (undo/restore)
- `floorplan_props` — decor/walkway props

**Admin & analytics**
- `visitor_tracking` — page views / visits / traffic (ported; feeds admin dashboard)
- `host_activity_logs` — audit of host & admin-on-behalf actions
- `support_tickets` — (ported)

**Deferred to post-MVP (schema stubbed only if cheap):** `gallery_items`, `photos`, `guestbook_entries` (wishes), live-wall, flipbook/miibook, crew portal, referrals, multi-workspace.

---

## 4. Module map (miibook page → portalkahwin)

### Admin panel — `/admin/*` (miibook `/hq/*`)
- **Dashboard** — traffic, visits, users, revenue at a glance (`HqDashboard`)
- **Analytics + Tracking** — visitor_tracking: system traffic, visits, sources (`HqAnalytics`, `HqTracking`)
- **Customers** — see **all users**; **set up on their behalf / impersonate**; toggle active (`HqCustomers`)
- **Templates** — **add manually**, edit, publish; **most-used + usage counts** (extends `HqStudio`/`HqSignatures`)
- **Packages / Plans** — tiers + feature gating (`HqPackages`)
- **Promo codes**, **Billing** (ToyyibPay), **Tickets**, **Leads**, **Team roles**, **Landing editor**

### User panel — `/{user}/*` (miibook workspace)
- **Dashboard** → **My cards** (`Events`)
- **Card editor** — Details / Design / Invite / **RSVP** / **Seating** / Publish (miibook `EventDashboard` tabs)
- **Guest list** (`InviteTab` / `GuestList`)
- **Reports** (`AnalyticsTab`)
- **Template shop** — browse, buy, pay via ToyyibPay (`Pricing`/`Checkout` reframed)
- **Billing / Upgrade** — subscription

### Public — `/e/:slug`
- Live wedding card · **RSVP form** · QR check-in · (wishes/gallery deferred)

---

## 5. Seating engine — the headline differentiator

miibook already ships Konva canvas + `@dnd-kit` drag-assign, zones/tables/seats, version history, and A* pathfinding (`lib/pathfinding.ts`, `SeatingContext`). We extend to spec:

- **2-way setup** — both **host** and **admin** (via impersonation) can build/edit the floorplan.
- **Assign during RSVP** — on RSVP submit:
  - **Auto-assign** to the next free seat block that fits the party `pax`, **or**
  - **Manual** placement by host/admin.
- **Flexible reassign** — drag any guest to any seat anytime; swap; bulk move.
- **Auto-unassign on decline** — already a setting (`auto_unassign_declined`).
- Show-names mode (full / initials / hidden) already present.

---

## 6. Payments — ToyyibPay (`app/Services/Toyyibpay/ToyyibpayService.php`)

Standby class with:
- `createCategory(name, description)` → `categoryCode`
- `createBill(categoryCode, {name, email, phone, amount, ref, returnUrl, callbackUrl})` → hosted payment URL + `billCode`
- `verifyCallback(request)` — server-to-server callback validation
- `getBillTransactions(billCode)` — reconcile status

**Endpoints:** sandbox `https://dev.toyyibpay.com`, live `https://toyyibpay.com`. Config in `.env` (`TOYYIBPAY_SECRET_KEY`, `TOYYIBPAY_CATEGORY_CODE`, `TOYYIBPAY_ENV`).

**Flow:** buy template/plan → Laravel creates a bill → redirect to ToyyibPay (FPX/e-wallet) → `callbackUrl` marks `payments` paid (source of truth) → activate entitlement/subscription → `returnUrl` shows success. Sandbox first, then live.

---

## 7. Pricing — Free + paid subscription

- **Free** — watermarked card, limited guests/RSVP, basic templates only, no seating floorplan.
- **Paid (subscription)** — premium templates, unlimited RSVP, seating floorplan, QR check-in, custom RSVP form/response, no watermark.
- Enforced server-side via `plans` + `plan_features` (ported `planGating.ts`), never trust the client.

*(Exact tier names/prices in MYR to be set with you; miibook's multi-currency tables give a starting point.)*

---

## 8. UI direction — non-generic

Reuse miibook's **component mechanics** (Konva editor, dnd-kit seating, recharts admin, tiptap, framer-motion) but ship a **fresh Malaysian-wedding design system**: elegant serif + script pairing, optional batik/floral motif themes, custom template thumbnails, refined admin dashboard. Not miibook's brand.

---

## 9. Delivery phases (MVP)

- [ ] **P0 Scaffold** — Laravel 11 (PHP 8.2+) + Sanctum + Vite + `laravel-vite-plugin`; React shell in `resources/js`; `lib/api.ts` seam; auth + one protected route working end-to-end; `storage:link`.
- [ ] **P1 Core card** — `templates`, invitation editor (details/design), public card `/e/:slug`, `rsvp_guests` + public RSVP form.
- [ ] **P2 Seating** — port floorplan tables (settings, zones, tables, seats, versions, props); auto/manual assign during RSVP + reassign.
- [ ] **P3 Payments** — `ToyyibpayService`, template shop + checkout, subscription + `plan_features` gating.
- [ ] **P4 Admin** — dashboard, analytics + `visitor_tracking`, template management (add/most-used/counts), customers + set-up-on-behalf/impersonation.
- [ ] **P5 Polish + deploy** — non-generic theming, QR check-in, cPanel build/deploy runbook.

**Deferred (post-MVP):** gallery, guest wishes (ucapan), live wall, flipbook memory-book, crew portal, referrals, multi-workspace.

---

## 10. Open items to confirm before/while building

1. **Plan tiers & MYR prices** (names + price points for Free + paid tiers).
2. **Domain/subdomain** for the app on cPanel.
3. **ToyyibPay** sandbox credentials (to wire P3).
4. **Template seed set** — how many starter templates, and do you supply artwork or should we design them.
5. **Admin impersonation** depth — full "log in as user" vs. edit-on-behalf only.

---

## 11. Risk notes

- **Port volume:** 430 Supabase calls is the main effort; concentrated at the `lib/api.ts` seam + controllers, done module-by-module per phase.
- **cPanel symlinks:** `storage:link` may be restricted on some cPanel hosts — fallback: serve uploads through a controller or a pre-created symlink.
- **Postgres-isms:** `jsonb`, `text[]`, `gen_random_uuid()`, triggers, RLS, RPC → mapped to MySQL `json`, UUID casts, observers, policies, and endpoints (see §1 map).
