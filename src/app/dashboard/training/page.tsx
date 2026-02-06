// src/app/dashboard/training/page.tsx
// @ts-nocheck
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookOpen, AlertTriangle, PlayCircle, Pencil, Sparkles, Target, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useState, useEffect } from 'react';
import { getKnowledgeBaseArticles, KnowledgeBaseArticle } from '@/actions/adminActions';
import { onSnapshot, collection, query, orderBy } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanBadge } from '@/components/PlanBadge';
import { useServiceRequest } from '@/hooks/use-service-request';

const KnowledgeBaseVideo = ({ title, description, videoUrl }: { title: string, description: string, videoUrl: string }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="aspect-video w-full rounded-lg overflow-hidden border">
                    <iframe
                        width="100%"
                        height="100%"
                        src={videoUrl}
                        title={title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TrainingPage() {
  const { user } = useAppContext();
  const { isPending: isRequestPending, submit: submitRequest } = useServiceRequest({ source: 'training' });
  const canAccess = user?.plan === 'Enterprise' || user?.systemRole === 'Super Admin';
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isEditor = user?.isEditor || user?.systemRole === 'Super Admin';
  const featuredPlaylists = [
    {
        title: "Быстрый старт за 15 минут",
        description: "От загрузки файла до готового КП.",
        items: ["Загрузка и анализ", "Редактирование спецификации", "Генерация КП и счётов"],
        cta: "Открыть плейлист",
        href: "https://www.youtube.com/playlist?list=fast-start",
    },
    {
        title: "Калькулятор и ценообразование",
        description: "Настройка смет, распределение СМР, работа с базой цен.",
        items: ["Распределение СМР", "Частная база цен", "Версии и история"],
        cta: "Смотреть",
        href: "https://www.youtube.com/playlist?list=pricing",
    },
    {
        title: "PWA и Telegram мини-апп",
        description: "Как запускать анализ с мобильного и делиться результатами.",
        items: ["PWA установка", "Шеринг из Telegram", "Уведомления и история"],
        cta: "Изучить",
        href: "https://www.youtube.com/playlist?list=mobile",
    },
  ];

  const deepGuides = [
    {
        title: "1. Роли, тарифы и права",
        steps: [
            "Откройте Профиль → Баланс, убедитесь, что бейдж тарифа подсвечен (Free/PRO/Business/Enterprise) и видна дата окончания.",
            "Если пользователь спрашивает про ограничения: объясните, что Free не имеет приватной базы цен и некоторых AI функций, PRO даёт приватную базу и расширенные лимиты, Business/Enterprise — приоритет, интеграции и расширенные лимиты.",
            "Покажите, как апгрейдить: Баланс → кнопка пополнения/апгрейда. Диалог апгрейда сообщает, если тариф уже PRO+ и до какой даты оплачен.",
            "Админ: проверяйте plan/planExpiresAt в профиле пользователя и отображайте зелёный статус при активном платном тарифе."
        ],
    },
    {
        title: "2. Кредиты и биллинг",
        steps: [
            "Запомните правило: 1 кредит = 1 анализ файла. Бонусные кредиты учитываются отдельно и имеют срок.",
            "Где видеть баланс: раздел Баланс — крупное число кредитов + бонусы и срок их действия.",
            "Пополнение: выберите пакет → «Пополнить» → диалог оплаты. Популярные пакеты подсвечены рамкой.",
            "История счетов: прокрутите вниз до InvoiceHistory — там скачиваются счета.",
            "Enterprise: используйте кнопку «Обсудить условия» (email из настроек)."
        ],
    },
    {
        title: "3. Файлы: подготовка и ограничения",
        steps: [
            "Поддерживаемые форматы: PDF, JPG, PNG, XLSX/XML. Архивы, защищённые или зашифрованные файлы — не принимаются.",
            "Размер: до 50 МБ. Если больше — откроется редактор для обрезки.",
            "Качество: избегать размытых/перекошенных фото, рукописей, сильно зашумлённых сканов.",
            "Перед загрузкой: обрезать лишние страницы, выровнять скан, убедиться, что таблицы читаемы."
        ],
    },
    {
        title: "4. Загрузка и анализ",
        steps: [
            "Где: Дашборд → «Новый расчёт» (drag&drop или клик). На мобильном — Mobile Panel.",
            "Выберите модель AI (список зависит от прав). Если нет кредитов — появится диалог InsufficientCredits.",
            "Старт: кнопка «Анализ файла». Для PDF >50 МБ — сначала обрезать.",
            "Контроль стадий: в ProcessingDialog видно загрузку в S3, выбор PDF‑движка, основной анализ. Ошибки — в тостах.",
            "Результат сохраняется в историю; статус можно увидеть и, при необходимости, повторить анализ."
        ],
    },
    {
        title: "5. Калькулятор и спецификация",
        steps: [
            "Структура: слева аккордеоны (AI настройки, Калькулятор, Детали, КП, Документы, Спецификация, Рекомендации), справа — «Итоги и действия» (липкий блок).",
            "Редактирование: меняйте строки спецификации, удаляйте/добавляйте позиции. В «Рекомендациях» добавляйте найденные AI позиции.",
            "AI‑функции: «Распределить СМР (AI)», поиск пропущенных позиций, заполнение пустых полей — часть доступна с PRO+.",
            "Версии: автосохранения и ручные версии через HistoryActions; кнопка «Сделать основной» переводит черновик в основную.",
            "Цены/налоги: TotalsAndActions показывает подытоги, НДС (если включён), итог. QuoteSettings настраивают ставки/колонки."
        ],
    },
    {
        title: "6. Документы и экспорт",
        steps: [
            "Откройте «Документы» в TotalsAndActions: выберите формат (PDF/DOCX/XLSX) и шаблон.",
            "Укажите реквизиты исполнителя/клиента (из Companies), затем сгенерируйте КП/счёт/договор.",
            "Отправка в Telegram: если пользователь привязан (telegramChatId), можно отправить документ напрямую.",
            "История счетов — в балансе; скачивание и отправка доступны из InvoiceHistory."
        ],
    },
    {
        title: "7. Мобильный доступ (PWA и Telegram)",
        steps: [
            "PWA: предложите установить через «Добавить на экран». Установки и открытия считаются в engagement_events.",
            "Telegram mini‑app: открыть через бота; привязка аккаунта логируется. Можно запускать анализ и смотреть историю.",
            "UX мобильных экранов: фиксированный бар с навигацией/названием проекта, липкие кнопки для запуска AI/документов.",
            "В панели (Mobile Panel) загрузка/поиск проектов закреплены сверху; просмотр проекта — отдельный экран с калькулятором."
        ],
    },
    {
        title: "8. Частые вопросы и эскалации",
        steps: [
            "Файл не анализируется? Проверить формат/размер/качество, кредиты, статус. Если упал — повтор через историю.",
            "Кредиты исчезли? Раздел Баланс показывает основной и бонусный баланс; покупка пакетов там же.",
            "Чем отличается тариф? Free — базовый, PRO — приватная база и AI‑фичи, Business/Enterprise — расширенные лимиты и интеграции.",
            "Документы для юрлиц: счета в истории, Enterprise — через контактный email.",
            "Мобильные сценарии: PWA/Telegram — анализ и результаты синхронизированы с вебом."
        ],
    },
  ];

  const trainingModules = [
    {
        title: "Стартовый модуль",
        description: "Быстрое погружение: тарифы, кредиты, файлы, запуск анализа.",
        articles: [
            {
                title: "Обзор тарифов",
                steps: [
                    "Откройте Профиль → Баланс, убедитесь, что видно бейдж тарифа и дату окончания.",
                    "Free: базовые функции, без приватной базы цен.",
                    "PRO: приватная база, расширенные лимиты и AI-функции.",
                    "Business/Enterprise: приоритет, интеграции (S3), расширенные лимиты."
                ],
            },
            {
                title: "Кредиты и биллинг",
                steps: [
                    "1 кредит = 1 анализ. Бонусные кредиты с датой окончания.",
                    "Баланс → выбрать пакет → «Пополнить», популярный пакет выделен.",
                    "История счетов внизу страницы баланса; Enterprise — «Обсудить условия».",
                ],
            },
            {
                title: "Файлы и подготовка",
                steps: [
                    "Форматы: PDF/JPG/PNG/XLSX/XML. Архивы/защищённые файлы не подходят.",
                    "Размер до 50 МБ, иначе обрезка. Следите за читаемостью сканов.",
                ],
            },
            {
                title: "Запуск анализа",
                steps: [
                    "Дашборд → «Новый расчёт» (или Mobile Panel).",
                    "Выберите модель; при нехватке кредитов — диалог InsufficientCredits.",
                    "ProcessingDialog показывает стадии (S3, PDF-движок, анализ). Ошибки — в тостах.",
                ],
            },
        ],
    },
    {
        title: "Модуль: История и версии",
        description: "Статусы, повтор анализа, группировка и версии.",
        articles: [
            {
                title: "История и статусы",
                steps: [
                    "Статусы: success / processing / failed / reported / draft.",
                    "Действия: жалоба, возврат кредита, архив/разархив, удаление.",
                    "Повтор анализа при наличии fileUri/hash.",
                ],
            },
            {
                title: "Группы и Excel (PRO+)",
                steps: [
                    "Группируйте проекты по объекту, скачивайте сводный Excel.",
                    "Поиск и переключатель плотности (комфорт/компакт).",
                ],
            },
            {
                title: "Версии и автосохранения",
                steps: [
                    "Автосохранение ключевых полей (спека, КП, детали анализа).",
                    "HistoryActions: откат, загрузка версии, «Сделать основной».",
                ],
            },
        ],
    },
    {
        title: "Модуль: Калькулятор и документы",
        description: "Редактирование спецификации, AI и генерация документов.",
        articles: [
            {
                title: "Калькулятор/спека",
                steps: [
                    "Аккордеоны слева, «Итоги и действия» справа (липкий).",
                    "Редактируйте строки, добавляйте рекомендации AI.",
                    "AI: распределение СМР, поиск пропущенных позиций (PRO+).",
                ],
            },
            {
                title: "Настройки КП и налоги",
                steps: [
                    "QuoteSettings: колонки, ставки НДС/налога.",
                    "TotalsAndActions: подытоги, НДС (если включён), итог.",
                ],
            },
            {
                title: "Документы и экспорт",
                steps: [
                    "Выбор формата (PDF/DOCX/XLSX) и шаблона по тарифу.",
                    "Подстановка компаний (исполнитель/клиент), генерация КП/счёта/договора.",
                    "Отправка в Telegram при привязке, история счетов доступна.",
                ],
            },
        ],
    },
    {
        title: "Модуль: Партнёры и мобильные каналы",
        description: "Партнёрка, PWA, Telegram mini-app.",
        articles: [
            {
                title: "Партнёрская программа",
                steps: [
                    "Вкладка «Партнёрам» + баннер в дашборде.",
                    "Статусы Bronze/Silver/Gold/Platinum в профиле.",
                    "Заявки партнёров в админке /partner-requests.",
                ],
            },
            {
                title: "PWA и Telegram",
                steps: [
                    "PWA: «Добавить на экран», события установки учитываются (engagement_events).",
                    "Telegram mini-app: запуск через бота, анализ/история доступны.",
                    "Мобильный UX: закреплённый загрузчик/поиск, просмотр проекта с липкими действиями.",
                ],
            },
        ],
    },
    {
        title: "Модуль: Админка и инфраструктура",
        description: "Навигация, метрики, AI Агент, S3, события PWA/TG.",
        articles: [
            {
                title: "Навигация и поиск",
                steps: [
                    "Группы + сабменю без горизонтального скролла, поиск по разделам (лупа + анимация).",
                ],
            },
            {
                title: "Виджеты и метрики",
                steps: [
                    "Настройка виджетов (drag&drop, размеры 1×1 ... 4×2).",
                    "Метрики: пользователи, роли, AI, платежи, Telegram/PWA таймлайн.",
                ],
            },
            {
                title: "AI Агент и ресурсы",
                steps: [
                    "OpenRouter открыт по умолчанию; «+» добавляет модели из шаблонов провайдеров.",
                    "Разделы: пользователи/тикеты/уведомления/маркетинг/Telegram/шаблоны/промпты/логи/S3.",
                    "S3 для Business/Enterprise, тестирование загрузок/доступа.",
                ],
            },
        ],
    },
    {
        title: "Модуль: FAQ и эскалации",
        description: "Типовые ответы и что делать при проблемах.",
        articles: [
            {
                title: "Файлы и анализ",
                steps: [
                    "Проверить формат/размер/качество/кредиты, статус очереди.",
                    "При ошибке — «Повторить анализ»; если не помогает — тикет.",
                ],
            },
            {
                title: "Кредиты и тарифы",
                steps: [
                    "Баланс: основной + бонусы; покупка пакетов.",
                    "Тарифы: Free/PRO/Business/Enterprise, зелёный статус с датой оплаты.",
                ],
            },
            {
                title: "Документы и юрлица",
                steps: [
                    "Счета в истории, Enterprise — через контактный email.",
                    "Мобильный доступ: PWA/Telegram синхронизированы с вебом.",
                ],
            },
        ],
    },
  ];

  useEffect(() => {
    const q = query(collection(db, 'knowledge_base_articles'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedArticles: KnowledgeBaseArticle[] = [];
        snapshot.forEach(doc => {
            fetchedArticles.push({ id: doc.id, ...doc.data() } as KnowledgeBaseArticle);
        });
        setArticles(fetchedArticles);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEnterpriseRequest = () => {
    submitRequest({ type: 'plan_upgrade', payload: { targetPlan: 'Enterprise (от 25 пользователей)' } });
  };

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen />База знаний</CardTitle>
          <CardDescription>Материалы доступны только на Enterprise.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Доступ ограничен</AlertTitle>
            <AlertDescription>
              База обучения доступна для Enterprise. Для подключения оставьте заявку.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-3">
            <Button onClick={handleEnterpriseRequest} disabled={isRequestPending}>
              {isRequestPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Запросить Enterprise
            </Button>
            <PlanBadge plan="Enterprise" size="xs" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><BookOpen /> База знаний и обучение</CardTitle>
              <CardDescription>
                Изучите материалы, чтобы максимально эффективно использовать все возможности EstimateAI и повысить свой партнерский статус.
              </CardDescription>
            </div>
             {isEditor && (
                <Button variant="outline" disabled>
                    <Pencil className="mr-2 h-4 w-4" />
                    Редактировать
                </Button>
            )}
        </CardHeader>
        <CardContent>
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Путь к статусу "Серебряный партнер"</AlertTitle>
                <AlertDescription>
                    Для получения статуса "Серебряный партнер" необходимо изучить все материалы в этой базе знаний и успешно сдать итоговый экзамен.
                    <div className="mt-4">
                        <Button disabled>Начать экзамен (неактивно)</Button>
                    </div>
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {featuredPlaylists.map((pl) => (
            <Card key={pl.title} className="border border-border/80 bg-card/80">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {pl.title}
                    </CardTitle>
                    <CardDescription>{pl.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {pl.items.map(item => (
                        <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4 text-primary" />
                            <span>{item}</span>
                        </div>
                    ))}
                    <Button asChild className="mt-2 w-full">
                        <a href={pl.href} target="_blank" rel="noreferrer">{pl.cta}</a>
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            Array.from({length: 4}).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                       <Skeleton className="h-6 w-3/4" />
                       <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="w-full aspect-video" />
                    </CardContent>
                </Card>
            ))
          ) : (
             articles.map(article => (
                <KnowledgeBaseVideo
                    key={article.id}
                    title={article.title}
                    description={article.description}
                    videoUrl={article.videoUrl}
                />
            ))
          )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {deepGuides.map((guide, idx) => (
            <Card key={guide.title} className="border border-border/80 bg-card/90">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {guide.title}
                    </CardTitle>
                    <CardDescription>Пошаговый сценарий #{idx + 1}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {guide.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <div className="mt-1">
                                <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <p className="leading-relaxed">{step}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div>
            <CardTitle className="text-xl flex items-center gap-2"><BookOpen className="h-5 w-5"/> Учебные модули</CardTitle>
            <CardDescription>Разбейте обучение по функциям: от старта до админки.</CardDescription>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {trainingModules.map((module) => (
                <Card key={module.title} className="border border-border/70 bg-card/90">
                    <CardHeader>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {module.articles.map((article) => (
                            <div key={article.title} className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-2">
                                <p className="font-semibold text-sm">{article.title}</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {article.steps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>

    </div>
  );
}
