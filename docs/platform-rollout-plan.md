# Platform Rollout Plan (Subdomains + CRM + Bots)

## Goal

Разделить продукт на поддомены и поэтапно вывести отдельные рабочие контуры:
- `admin.aismetchik.ru` — админ-панель
- `lk.aismetchik.ru` — кабинет пользователей
- `crm.aismetchik.ru` — CRM для менеджеров
- `partner.aismetchik.ru` — кабинет партнёров
- `m.aismetchik.ru` — mobile/PWA входная точка

## Phase 1 — Foundation (Implemented)

- Host-based routing in Next middleware:
  - admin -> `/dashboard/admin`
  - lk -> `/dashboard`
  - crm -> `/crm`
  - partner -> `/partner`
  - m -> `/dashboard/mobile-panel`
- Added base app pages:
  - `/crm` (manager workspace for service requests)
  - `/partner` (partner cabinet with referrals and tier applications)
- Deploy infra updated for multi-domain TLS SAN certs:
  - `VDS_DOMAIN` + `VDS_SUBDOMAINS`
- NextAuth session cookie domain support:
  - `NEXTAUTH_COOKIE_DOMAIN` for shared auth across subdomains
- Telegram webhook service upgraded to audience model:
  - `default`, `user`, `partner`, `manager`, `admin`
  - new endpoint: `/api/telegram/webhook/[audience]`

## Phase 2 — Product Hardening (Next)

1. Security hardening:
   - bind all admin/manager actions to server session (remove client `adminUserId` trust)
   - role guards for CRM/Partner pages with server verification
2. CRM functional scope:
   - SLA board, assignee model, notes, timeline, bulk actions
   - filters/search/pagination and response templates
3. Partner scope:
   - onboarding checklist, attestation workflow, partner links dashboard
   - payout/statements and conversion analytics
4. Mobile (`m`) scope:
   - dedicated mobile shell and simplified navigation
   - PWA install + offline/read cache strategy

## Phase 3 — Telegram Bot Matrix (Next)

- Deploy dedicated bot tokens/webhooks per audience:
  - `TELEGRAM_BOT_TOKEN_USER`
  - `TELEGRAM_BOT_TOKEN_PARTNER`
  - `TELEGRAM_BOT_TOKEN_MANAGER`
  - `TELEGRAM_BOT_TOKEN_ADMIN`
- Route bot commands by audience profile
- Add admin UI actions for register/clear/test per audience webhook

## Required Secrets / Env

- `VDS_DOMAIN=aismetchik.ru`
- `VDS_SUBDOMAINS=admin,lk,crm,partner,m`
- `LETSENCRYPT_EMAIL=...`
- `NEXTAUTH_COOKIE_DOMAIN=.aismetchik.ru`

Optional per-audience Telegram:
- `TELEGRAM_BOT_TOKEN_USER`, `TELEGRAM_BOT_SECRET_TOKEN_USER`, `TELEGRAM_BOT_WEBHOOK_URL_USER`
- `TELEGRAM_BOT_TOKEN_PARTNER`, `TELEGRAM_BOT_SECRET_TOKEN_PARTNER`, `TELEGRAM_BOT_WEBHOOK_URL_PARTNER`
- `TELEGRAM_BOT_TOKEN_MANAGER`, `TELEGRAM_BOT_SECRET_TOKEN_MANAGER`, `TELEGRAM_BOT_WEBHOOK_URL_MANAGER`
- `TELEGRAM_BOT_TOKEN_ADMIN`, `TELEGRAM_BOT_SECRET_TOKEN_ADMIN`, `TELEGRAM_BOT_WEBHOOK_URL_ADMIN`
