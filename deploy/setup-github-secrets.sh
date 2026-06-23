#!/bin/bash
# AI Сметчик - Setup GitHub Secrets for CI/CD
# Run this script to configure GitHub Actions secrets

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     Настройка GitHub Secrets для CI/CD                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) не установлен."
    echo "Установи: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Не авторизован в GitHub CLI."
    echo "Выполни: gh auth login"
    exit 1
fi

REPO="FamousMonsterr/AISmetchikV9"

echo "📦 Репозиторий: $REPO"
echo ""

# Read SSH key
SSH_KEY_FILE="$HOME/.ssh/aismetchik_beget"
if [ ! -f "$SSH_KEY_FILE" ]; then
    echo "❌ SSH ключ не найден: $SSH_KEY_FILE"
    exit 1
fi

SSH_KEY=$(cat "$SSH_KEY_FILE")

echo "🔐 Устанавливаю secrets..."
echo ""

# srv-web secrets
gh secret set SRV_WEB_HOST -b "5.35.88.53" -R "$REPO"
echo "✅ SRV_WEB_HOST"

gh secret set SRV_WEB_SSH_KEY -b "$SSH_KEY" -R "$REPO"
echo "✅ SRV_WEB_SSH_KEY"

# Domain
gh secret set VDS_DOMAIN -b "aismetchik.ru" -R "$REPO"
echo "✅ VDS_DOMAIN"

gh secret set VDS_SUBDOMAINS -b "lk,admin,crm,partner,m" -R "$REPO"
echo "✅ VDS_SUBDOMAINS"

gh secret set LETSENCRYPT_EMAIL -b "famousmonster@ya.ru" -R "$REPO"
echo "✅ LETSENCRYPT_EMAIL"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     Все secrets установлены!                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Установленные secrets:"
echo "  - SRV_WEB_HOST: 5.35.88.53"
echo "  - SRV_WEB_SSH_KEY: ~/.ssh/aismetchik_beget"
echo "  - VDS_DOMAIN: aismetchik.ru"
echo "  - VDS_SUBDOMAINS: lk,admin,crm,partner,m"
echo "  - LETSENCRYPT_EMAIL: famousmonster@ya.ru"
echo ""
echo "🚀 Теперь при push в main автоматически:"
echo "  1. Соберутся Docker образы (web, api, worker)"
echo "  2. Образы запушатся в ghcr.io"
echo "  3. Деплой на srv-web и srv-api"
echo "  4. Smoke test проверит healthcheck"
