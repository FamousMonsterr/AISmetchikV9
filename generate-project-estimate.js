#!/usr/bin/env node
/**
 * Генератор Excel-файла со спецификациями и расчётом по принципу ИИ-сметчика
 */
const XlsxPopulate = require('xlsx-populate');

const projects = [
  {
    name: "AISmetchikV9 — ИИ-Сметчик",
    description: "SaaS-платформа для инженеров-сметчиков слаботочных систем",
    techStack: "Next.js 16, TypeScript, MongoDB, MinIO, OpenRouter",
    systems: [
      {
        name: "Frontend (Web-интерфейс)",
        category: "device",
        items: [
          { name: "Next.js App Router", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Фреймворк (open-source)" },
          { name: "React 19 + TypeScript", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "UI библиотека" },
          { name: "ShadCN/UI компоненты", qty: 1, unit: "набор", materialPrice: 0, installationPrice: 0, comment: "30+ UI компонентов (Radix UI)" },
          { name: "Tailwind CSS v4", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "CSS фреймворк" },
          { name: "Framer Motion", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Анимации" },
          { name: "Recharts", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Графики и диаграммы" },
        ]
      },
      {
        name: "Backend (Серверная часть)",
        category: "device",
        items: [
          { name: "Next.js API Routes", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "19 API эндпоинтов" },
          { name: "NextAuth (JWT)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Аутентификация + OAuth (VK, Telegram)" },
          { name: "MongoDB драйвер", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "База данных v7.1" },
          { name: "AWS S3 SDK", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Хранилище файлов (MinIO/S3)" },
          { name: "Telegraf (Telegram Bot)", qty: 4, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "4 бота: user/partner/manager/admin" },
          { name: "Nodemailer", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Email уведомления" },
          { name: "PDF парсер (pdf-parse)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Извлечение текста из PDF" },
          { name: "PDF генератор (pdf-lib)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Генерация документов" },
          { name: "Excel генератор (xlsx-populate)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Экспорт в XLSX" },
          { name: "DOCX генератор (docx)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Генерация Word документов" },
        ]
      },
      {
        name: "AI-модули",
        category: "device",
        items: [
          { name: "OpenRouter API (OCR)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Mistral OCR, Cloudflare AI" },
          { name: "Xiaomi MiMo V2.5 Pro", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Основная AI модель" },
          { name: "Nex AGI (бесплатный)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Бесплатная модель для OCR" },
          { name: "Qwen 3.7 Plus", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Дополнительная модель" },
          { name: "AI-промпты (конструктор)", qty: 1, unit: "набор", materialPrice: 0, installationPrice: 0, comment: "Коммерческая тайна — промпты для анализа" },
          { name: "Пайплайн анализа V1/V2", qty: 2, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Классический + серверный режим" },
        ]
      },
      {
        name: "Инфраструктура",
        category: "cable_support",
        items: [
          { name: "MongoDB (основная)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Бизнес-данные, порт 27017" },
          { name: "MongoDB (логи)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Логи и метрики, порт 27018" },
          { name: "MinIO (S3 хранилище)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Файлы, аватары, документы" },
          { name: "Nginx (реверс-прокси)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Маршрутизация по поддоменам" },
          { name: "Docker Compose", qty: 1, unit: "набор", materialPrice: 0, installationPrice: 0, comment: "Оркестрация контейнеров" },
          { name: "GitHub Actions CI/CD", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Автоматический деплой" },
          { name: "Let's Encrypt (TLS)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "SSL сертификаты" },
        ]
      },
      {
        name: "Поддомены (5 шт)",
        category: "cable",
        items: [
          { name: "lk.aismetchik.ru", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Личный кабинет пользователя" },
          { name: "admin.aismetchik.ru", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Админ-панель" },
          { name: "crm.aismetchik.ru", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "CRM система" },
          { name: "partner.aismetchik.ru", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Партнёрский кабинет" },
          { name: "m.aismetchik.ru", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Мобильная версия" },
        ]
      },
      {
        name: "Функционал (модули)",
        category: "consumable",
        items: [
          { name: "Анализ документов (OCR + AI)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "PDF, сканы, фото → спецификация" },
          { name: "Цикл уточнения", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Итеративное исправление ошибок AI" },
          { name: "Калькулятор сметы", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Расчёт монтажа + ПНР + налоги" },
          { name: "Приватная база цен", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "PRO функция — свои цены" },
          { name: "Групповой режим", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Несколько смет одновременно" },
          { name: "Генерация КП (PDF/DOCX/XLSX)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Коммерческое предложение" },
          { name: "Генерация договора", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Договор подряда с приложениями" },
          { name: "Генерация счёта", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Авансовый/финальный счёт" },
          { name: "Акт выполненных работ", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "АКТ, КС-2, КС-3, КС-6а" },
          { name: "Конструктор шаблонов КП", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Кастомизация стиля КП" },
          { name: "CRM (сделки, задачи, SLA)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Полноценная CRM система" },
          { name: "Тарифы (Free/PRO/Business/Enterprise)", qty: 4, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Монетизация + кредиты" },
          { name: "Партнёрская программа", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Привлечение через партнёров" },
          { name: "Telegram интеграция", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Уведомления + документы в бот" },
          { name: "VK OAuth + Callback API", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Вход через VK + бот" },
          { name: "Passkey (WebAuthn)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Безпарольная аутентификация" },
          { name: "Self-delete аккаунта", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "GDPR compliance" },
        ]
      },
      {
        name: "Стоимость инфраструктуры (VPS)",
        category: "consumable",
        items: [
          { name: "VPS (2 CPU, 4 GB RAM)", qty: 1, unit: "мес", materialPrice: 1500, installationPrice: 0, comment: "Хостинг приложения" },
          { name: "Домен (aismetchik.ru)", qty: 1, unit: "год", materialPrice: 1200, installationPrice: 0, comment: "Доменное имя" },
          { name: "OpenRouter API (токены)", qty: 1, unit: "мес", materialPrice: 5000, installationPrice: 0, comment: "~$5-30/мес в зависимости от нагрузки" },
          { name: "MinIO/S3 хранилище", qty: 1, unit: "мес", materialPrice: 500, installationPrice: 0, comment: "5-50 GB в зависимости от тарифа" },
        ]
      }
    ]
  },
  {
    name: "Voice Sales Agent — Голосовой агент продаж",
    description: "Автоматизация B2B продаж через голосовые звонки и мессенджеры",
    techStack: "Python 3.10+, FastAPI, WebSocket, Silero VAD, Whisper MLX",
    systems: [
      {
        name: "Voice Engine (Голосовой движок)",
        category: "device",
        items: [
          { name: "Silero VAD (Voice Activity Detection)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Детекция речи, порог 0.5" },
          { name: "Whisper Large V3 (Russian MLX)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "ASR распознавание речи (русский)" },
          { name: "Silero TTS / Qwen3 TTS", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Синтез речи" },
          { name: "Backchannel (дыхание + поддакивания)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Натуральность диалога" },
          { name: "Low-latency Pipeline", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "WebSocket пайплайн реального времени" },
        ]
      },
      {
        name: "LLM Engine (Языковая модель)",
        category: "device",
        items: [
          { name: "OpenClaw Gateway API", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Интеграция с LLM через OpenClaw" },
          { name: "Xiaomi MiMo V2.5", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Основная модель для диалогов" },
          { name: "RAG база знаний", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Контекст для продаж" },
        ]
      },
      {
        name: "Каналы связи",
        category: "cable",
        items: [
          { name: "SIM-модем Huawei E3372h", qty: 1, unit: "шт", materialPrice: 3000, installationPrice: 500, comment: "USB модем, МегаФон" },
          { name: "Telegram Desktop (AppleScript)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Автоматизация переписки" },
          { name: "WhatsApp Web (Playwright)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Автоматизация переписки" },
          { name: "MAX Web (Playwright)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Автоматизация переписки" },
          { name: "Email (IMAP/SMTP)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Почтовая интеграция" },
          { name: "SMS (SIM-модем)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Отправка SMS" },
        ]
      },
      {
        name: "CRM и данные",
        category: "other",
        items: [
          { name: "SQLite база контактов", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "B2B контакты, ~100K записей" },
          { name: "Pipeline продаж (воронка)", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Холодный контакт → Согласие" },
          { name: "Автоматизация мессенджеров", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Браузерная автоматизация" },
        ]
      },
      {
        name: "Стоимость инфраструктуры",
        category: "consumable",
        items: [
          { name: "MacBook Air M4 (16 GB)", qty: 1, unit: "шт", materialPrice: 150000, installationPrice: 0, comment: "Apple Silicon для MLX моделей" },
          { name: "SIM-карта МегаФон", qty: 1, unit: "мес", materialPrice: 500, installationPrice: 0, comment: "Тариф для модема" },
          { name: "LLM API (токены)", qty: 1, unit: "мес", materialPrice: 3000, installationPrice: 0, comment: "~$3-15/мес" },
          { name: "OpenClaw Companion", qty: 1, unit: "шт", materialPrice: 0, installationPrice: 0, comment: "Лицензия (open-source)" },
        ]
      }
    ]
  }
];

const complexityCoefficients = {
  device: { installation: 1.0, pnr: 0.15 },
  cable: { installation: 0.8, pnr: 0.12 },
  cable_support: { installation: 0.6, pnr: 0.10 },
  consumable: { installation: 0.3, pnr: 0.08 },
  other: { installation: 0.5, pnr: 0.10 }
};

async function generateExcel() {
  const wb = await XlsxPopulate.fromBlankAsync();
  wb.sheet(0).name("Сводный расчёт");
  const ws = wb.sheet(0);

  ws.cell("A1").value("ПРОЕКТЫ — Спецификации и расчёт по методике ИИ-сметчика").style({ bold: true, fontSize: 14 });
  ws.cell("A2").value("Дата: " + new Date().toLocaleDateString('ru-RU')).style({ italic: true, fontSize: 10 });

  let currentRow = 4;
  const headers = ["№", "Проект", "Система", "Позиция", "Кол-во", "Ед.", "Цена материала (₽)", "Цена монтажа (₽)", "ПНР (₽)", "Итого (₽)", "Категория", "Комментарий"];
  headers.forEach((h, i) => {
    ws.cell(`${String.fromCharCode(65 + i)}${currentRow}`).value(h).style({ bold: true, fill: { type: "solid", color: "4472C4" }, fontColor: "FFFFFF" });
  });
  currentRow++;

  let grandTotal = 0;
  let projectNum = 0;

  for (const project of projects) {
    projectNum++;
    let projectTotal = 0;

    ws.cell(`A${currentRow}`).value("Проект " + projectNum + ": " + project.name).style({ bold: true, fontSize: 11, fill: { type: "solid", color: "D9E2F3" } });
    currentRow++;
    ws.cell(`A${currentRow}`).value(project.description).style({ italic: true, fontSize: 9 });
    currentRow++;
    ws.cell(`A${currentRow}`).value("Стек: " + project.techStack).style({ fontSize: 9 });
    currentRow++;
    currentRow++;

    let itemNum = 0;
    for (const system of project.systems) {
      ws.cell(`C${currentRow}`).value("▸ " + system.name).style({ bold: true, fontSize: 10, fill: { type: "solid", color: "E2EFDA" } });
      currentRow++;

      const coeffs = complexityCoefficients[system.category] || complexityCoefficients.other;

      for (const item of system.items) {
        itemNum++;
        const materialTotal = item.materialPrice * item.qty;
        const installationTotal = Math.round(item.installationPrice * item.qty * coeffs.installation);
        const pnrTotal = Math.round((materialTotal + installationTotal) * coeffs.pnr);
        const itemTotal = materialTotal + installationTotal + pnrTotal;

        ws.cell(`A${currentRow}`).value(itemNum);
        ws.cell(`B${currentRow}`).value(project.name.split("—")[0].trim());
        ws.cell(`C${currentRow}`).value(system.name);
        ws.cell(`D${currentRow}`).value(item.name);
        ws.cell(`E${currentRow}`).value(item.qty);
        ws.cell(`F${currentRow}`).value(item.unit);
        ws.cell(`G${currentRow}`).value(materialTotal);
        ws.cell(`H${currentRow}`).value(installationTotal);
        ws.cell(`I${currentRow}`).value(pnrTotal);
        ws.cell(`J${currentRow}`).value(itemTotal);
        ws.cell(`K${currentRow}`).value(system.category);
        ws.cell(`L${currentRow}`).value(item.comment);

        projectTotal += itemTotal;
        currentRow++;
      }
      currentRow++;
    }

    ws.cell(`I${currentRow}`).value("ИТОГО ПРОЕКТ:").style({ bold: true });
    ws.cell(`J${currentRow}`).value(projectTotal).style({ bold: true, fill: { type: "solid", color: "FFF2CC" } });
    currentRow += 2;
    grandTotal += projectTotal;
  }

  ws.cell(`I${currentRow}`).value("ОБЩИЙ ИТОГ:").style({ bold: true, fontSize: 12 });
  ws.cell(`J${currentRow}`).value(grandTotal).style({ bold: true, fontSize: 12, fill: { type: "solid", color: "C6EFCE" } });

  ws.column("A").width(5);
  ws.column("B").width(25);
  ws.column("C").width(25);
  ws.column("D").width(35);
  ws.column("E").width(8);
  ws.column("F").width(8);
  ws.column("G").width(18);
  ws.column("H").width(18);
  ws.column("I").width(15);
  ws.column("J").width(15);
  ws.column("K").width(15);
  ws.column("L").width(40);

  // === Лист 2: AISmetchikV9 детали ===
  const ws2 = wb.addSheet("AISmetchikV9 детали");
  ws2.cell("A1").value("AISmetchikV9 — Детальная спецификация").style({ bold: true, fontSize: 14 });
  ws2.cell("A2").value("ИИ-Сметчик для слаботочных систем").style({ italic: true });

  let r2 = 4;
  ["Модуль", "Технология", "Назначение", "Статус", "Комментарий"].forEach((h, i) => {
    ws2.cell(`${String.fromCharCode(65 + i)}${r2}`).value(h).style({ bold: true, fill: { type: "solid", color: "4472C4" }, fontColor: "FFFFFF" });
  });
  r2++;

  const details = [
    ["Frontend", "Next.js 16 App Router", "SSR/SSG рендеринг", "✅ Работает", "App Router с серверными компонентами"],
    ["Frontend", "React 19 + TypeScript 5.9", "UI логика", "✅ Работает", "Строгая типизация, 64 @ts-nocheck (tech debt)"],
    ["Frontend", "ShadCN/UI (Radix)", "Компоненты", "✅ Работает", "30+ компонентов: Dialog, Tabs, Slider и др."],
    ["Frontend", "Tailwind CSS v4", "Стили", "✅ Работает", "Известные проблемы с @apply в components layer"],
    ["Frontend", "Framer Motion", "Анимации", "✅ Работает", "Плавные переходы и drag-and-drop"],
    ["Frontend", "Recharts", "Графики", "✅ Работает", "Диаграммы для CRM и аналитики"],
    ["Frontend", "React PDF Renderer", "PDF в браузере", "✅ Работает", "Генерация КП/договоров на клиенте"],
    ["Backend", "Next.js API Routes", "REST API", "✅ 19 эндпоинтов", "/api/db, /api/s3-* и др."],
    ["Backend", "NextAuth v4 (JWT)", "Аутентификация", "✅ Работает", "Email/password + VK OAuth + Telegram + Passkey"],
    ["Backend", "MongoDB 7.1", "Хранилище данных", "✅ Работает", "Основная + логовая БД, индексы"],
    ["Backend", "AWS S3 (MinIO)", "Файлы", "⚠️ Частично", "Presigned URL 401 при client-side fetch, base64 fallback работает"],
    ["Backend", "Telegraf 4.16", "Telegram боты", "✅ 4 бота", "user/partner/manager/admin аудитории"],
    ["Backend", "Nodemailer", "Email", "✅ Работает", "Уведомления и пароли"],
    ["Backend", "PDF парсинг", "OCR входящих", "✅ Работает", "pdf-parse + Mistral OCR через OpenRouter"],
    ["Backend", "ExcelJS/xlsx-populate", "Экспорт XLSX", "✅ Работает", "Генерация смет и отчётов"],
    ["Backend", "docx", "Экспорт DOCX", "✅ Работает", "Договоры и КП"],
    ["AI-модули", "OpenRouter API", "OCR + анализ", "✅ Работает", "Cloudflare AI, Mistral OCR, native engine"],
    ["AI-модули", "Xiaomi MiMo V2.5 Pro", "Основная модель", "✅ Работает", "Провайдер: xiaomi, temp=0.2"],
    ["AI-модули", "Nex AGI (free)", "Бесплатный OCR", "✅ Работает", "nex-agi/nex-n2-pro:free"],
    ["AI-модули", "Qwen 3.7 Plus", "Доп. модель", "✅ Работает", "qwen/qwen3.7-plus через OpenRouter"],
    ["AI-модули", "AI-промпты", "Конструктор анализа", "🔒 Коммерч. тайна", "ai-constructor-config.json (32 KB)"],
    ["AI-модули", "Пайплайн V1", "Классический анализ", "✅ Работает", "Файл → основной анализ → ручная проверка → СМР"],
    ["AI-модули", "Пайплайн V2", "Серверный анализ", "✅ Работает", "OCR markdown → единый анализ спецификации"],
    ["Инфра", "MongoDB (x2)", "Данные + логи", "✅ Docker", "Порты 27017, 27018"],
    ["Инфра", "MinIO", "S3 хранилище", "✅ Docker", "Порты 9000, 9001"],
    ["Инфра", "Nginx", "Реверс-прокси", "✅ Работает", "Host-based routing по поддоменам"],
    ["Инфра", "Docker Compose", "Оркестрация", "✅ 7 сервисов", "web_landing/admin/lk/crm/partner/mobile + worker + nginx"],
    ["Инфра", "GitHub Actions", "CI/CD", "✅ Автоматика", "ci.yml + deploy-vds.yml + external-checks.yml"],
    ["Инфра", "Let's Encrypt", "TLS", "⚠️ DNS", "Нужно выровнять DNS на текущий VDS"],
    ["Поддомены", "lk.aismetchik.ru", "Личный кабинет", "✅ Работает", "/dashboard"],
    ["Поддомены", "admin.aismetchik.ru", "Админ-панель", "✅ Работает", "/dashboard/admin"],
    ["Поддомены", "crm.aismetchik.ru", "CRM", "✅ Работает", "/crm"],
    ["Поддомены", "partner.aismetchik.ru", "Партнёры", "✅ Работает", "/partner"],
    ["Поддомены", "m.aismetchik.ru", "Мобилка", "✅ Работает", "/dashboard/mobile-panel"],
    ["Функционал", "Анализ документов", "OCR → спецификация", "✅ Работает", "PDF/сканы/фото → извлечение позиций"],
    ["Функционал", "Цикл уточнения", "Итеративный AI", "✅ Работает", "Исправление ошибок до 100% точности"],
    ["Функционал", "Калькулятор", "Расчёт сметы", "✅ Работает", "Монтаж + ПНР + НДС/УСН + коэфф. сложности"],
    ["Функционал", "Приватная база цен", "Свои цены", "✅ PRO", "Автоматический подбор по названию"],
    ["Функционал", "Групповой режим", "Массовый расчёт", "✅ PRO", "Несколько смет + синхронизация цен"],
    ["Функционал", "Генерация документов", "PDF/DOCX/XLSX", "✅ Работает", "КП, договор, счёт, акт, КС-2/3/6а"],
    ["Функционал", "CRM", "Сделки/задачи/SLA", "✅ Работает", "Board/Table/Tasks/Timeline/SLA"],
    ["Функционал", "Тарифы", "Монетизация", "✅ 4 тарифа", "Free/PRO/Business/Enterprise + кредиты"],
    ["Функционал", "Партнёрская программа", "Привлечение", "✅ Работает", "Вознаграждение за привлечение"],
    ["Функционал", "Telegram интеграция", "Уведомления", "✅ Работает", "4 бота по аудиториям"],
    ["Функционал", "VK OAuth", "Вход через VK", "✅ Работает", "Callback API + synthetic email"],
    ["Функционал", "Passkey", "Безпарольный вход", "✅ Работает", "WebAuthn/FIDO2"],
  ];

  details.forEach(d => {
    d.forEach((val, i) => ws2.cell(`${String.fromCharCode(65 + i)}${r2}`).value(val));
    r2++;
  });

  ws2.column("A").width(15);
  ws2.column("B").width(25);
  ws2.column("C").width(25);
  ws2.column("D").width(18);
  ws2.column("E").width(50);

  // === Лист 3: Voice Agent детали ===
  const ws3 = wb.addSheet("Voice Agent детали");
  ws3.cell("A1").value("Voice Sales Agent — Детальная спецификация").style({ bold: true, fontSize: 14 });
  ws3.cell("A2").value("Автоматизация B2B продаж").style({ italic: true });

  let r3 = 4;
  ["Модуль", "Технология", "Назначение", "Статус", "Комментарий"].forEach((h, i) => {
    ws3.cell(`${String.fromCharCode(65 + i)}${r3}`).value(h).style({ bold: true, fill: { type: "solid", color: "4472C4" }, fontColor: "FFFFFF" });
  });
  r3++;

  const voiceDetails = [
    ["Voice Engine", "Silero VAD", "Детекция речи", "✅ Работает", "Порог 0.5, тишина 700ms, padding 300ms"],
    ["Voice Engine", "Whisper Large V3 Russian MLX", "ASR (распознавание)", "✅ Работает", "valtu4a/whisper-large-v3-russian-mlx"],
    ["Voice Engine", "Silero TTS / Qwen3 TTS", "Синтез речи", "✅ Работает", "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-4bit"],
    ["Voice Engine", "Backchannel", "Натуральность", "✅ Работает", "Дыхание каждые 4 сек + поддакивания"],
    ["Voice Engine", "Low-latency Pipeline", "Real-time", "✅ Работает", "WebSocket + FastAPI на порту 8080"],
    ["LLM", "OpenClaw Gateway API", "Интеграция с LLM", "✅ Работает", "http://127.0.0.1:18789/v1/chat/completions"],
    ["LLM", "Xiaomi MiMo V2.5", "Диалоги", "✅ Работает", "Основная модель через OpenClaw"],
    ["LLM", "RAG база знаний", "Контекст продаж", "✅ Работает", "rag/ директория"],
    ["Каналы", "SIM-модем Huawei E3372h", "Звонки/SMS", "✅ Работает", "USB модем, МегаФон, 115200 baud"],
    ["Каналы", "Telegram Desktop", "Переписка", "✅ AppleScript", "Автоматизация через macOS"],
    ["Каналы", "WhatsApp Web", "Переписка", "✅ Playwright", "Браузерная автоматизация"],
    ["Каналы", "MAX Web", "Переписка", "✅ Playwright", "Браузерная автоматизация"],
    ["Каналы", "Email (IMAP/SMTP)", "Почта", "✅ Работает", "Почтовая интеграция"],
    ["Данные", "SQLite", "База контактов", "✅ Работает", "b2b_contacts.db, ~100K контактов"],
    ["Данные", "Pipeline продаж", "Воронка", "✅ Работает", "Холодный → Звонок → Диалог → КП → Согласие → Менеджер"],
    ["Инфра", "MacBook Air M4 (16GB)", "Хостинг ML моделей", "✅ Apple Silicon", "Для локального запуска Whisper/Qwen3 TTS"],
    ["Инфра", "FastAPI + Uvicorn", "Сервер", "✅ Работает", "REST API + WebSocket"],
    ["Инфра", "Python 3.10+", "Runtime", "✅ Работает", "pydantic, httpx, aiohttp"],
    ["Инфра", "Docker", "Контейнеризация", "✅ Есть Dockerfile", "Для деплоя на Linux сервер"],
  ];

  voiceDetails.forEach(d => {
    d.forEach((val, i) => ws3.cell(`${String.fromCharCode(65 + i)}${r3}`).value(val));
    r3++;
  });

  ws3.column("A").width(15);
  ws3.column("B").width(25);
  ws3.column("C").width(25);
  ws3.column("D").width(18);
  ws3.column("E").width(50);

  // === Лист 4: Расчёт затрат ===
  const ws4 = wb.addSheet("Расчёт затрат");
  ws4.cell("A1").value("Ежемесячные и единовременные затраты").style({ bold: true, fontSize: 14 });

  let r4 = 3;
  ["Статья расходов", "Тип", "Сумма (₽/мес)", "Сумма (₽/год)", "Примечание"].forEach((h, i) => {
    ws4.cell(`${String.fromCharCode(65 + i)}${r4}`).value(h).style({ bold: true, fill: { type: "solid", color: "4472C4" }, fontColor: "FFFFFF" });
  });
  r4++;

  const costs = [
    ["VPS (2 CPU, 4 GB)", "Ежемесячно", 1500, 18000, "Хостинг AISmetchikV9"],
    ["Домен aismetchik.ru", "Годовой", 100, 1200, "Регистрация/продление"],
    ["OpenRouter API (токены)", "Ежемесячно", 5000, 60000, "OCR + AI анализ (~$5-30/мес)"],
    ["MinIO/S3 хранилище", "Ежемесячно", 500, 6000, "5-50 GB"],
    ["SIM-карта МегаФон", "Ежемесячно", 500, 6000, "Для голосового агента"],
    ["LLM API (Voice Agent)", "Ежемесячно", 3000, 36000, "~$3-15/мес"],
    ["GitHub (CI/CD)", "Бесплатно", 0, 0, "Public repo"],
    ["Let's Encrypt", "Бесплатно", 0, 0, "TLS сертификаты"],
    ["", "", "", "", ""],
    ["ИТОГО ежемесячно", "", 10600, 127200, ""],
    ["", "", "", "", ""],
    ["Единовременные:", "", "", "", ""],
    ["MacBook Air M4 (16GB)", "Единовременно", 150000, 0, "Для Voice Agent (MLX модели)"],
    ["SIM-модем Huawei E3372h", "Единовременно", 3000, 0, "USB 4G модем"],
  ];

  costs.forEach(c => {
    c.forEach((val, i) => ws4.cell(`${String.fromCharCode(65 + i)}${r4}`).value(val));
    r4++;
  });

  ws4.column("A").width(30);
  ws4.column("B").width(15);
  ws4.column("C").width(18);
  ws4.column("D").width(18);
  ws4.column("E").width(40);

  const outputPath = '/Users/timofejbruhin/.openclaw/workspace/Проекты_Спецификации_Расчёт.xlsx';
  await wb.toFileAsync(outputPath);
  console.log("✅ Excel файл создан: " + outputPath);
}

generateExcel().catch(console.error);
