# AI Сметчик — Design System

## Обзор

Дизайн-система построена на концепции "Resolution Scale" (SD → HD → Full HD → 4K), которая отражает эволюцию качества и детализации. Визуальный язык сочетает технологичность с доступностью, используя темную тему с акцентами в виде "свечения" различных цветов для каждого уровня.

## Философия дизайна

### Core Principles
1. Clarity First — Информация должна быть мгновенно считываема
2. Progressive Disclosure — Сложность раскрывается постепенно
3. Tactile Feedback — Каждое взаимодействие имеет визуальный отклик
4. Resolution Metaphor — Цветовая кодировка качества (SD=фиолетовый, HD=синий, Full HD=зеленый, 4K=оранжевый)

## Цветовая палитра

### Resolution Colors (Primary Accents)
| Роль | Цвет | Hex | Использование |
|------|------|-----|---------------|
| SD | Фиолетовый | #8B5CF6 | Базовый тариф, начальный уровень |
| HD | Синий | #3B82F6 | Продвинутый тариф, детализация |
| Full HD | Зеленый | #10B981 | Профессиональный тариф, полный охват |
| 4K | Оранжевый | #F59E0B | Энтерпрайз тариф, ультра-детализация |

### Semantic Colors
| Роль | Цвет | Hex | CSS Variable |
|------|------|-----|--------------|
| Background Primary | Глубокий черный | #0A0A0F | --color-bg-primary |
| Background Secondary | Темно-серый | #12121A | --color-bg-secondary |
| Background Tertiary | Серый | #1A1A25 | --color-bg-tertiary |
| Background Elevated | Светло-серый | #252535 | --color-bg-elevated |
| Text Primary | Белый | #FAFAFA | --color-text-primary |
| Text Secondary | Светло-серый | #A1A1AA | --color-text-secondary |
| Text Tertiary | Серый | #71717A | --color-text-tertiary |
| Text Muted | Темно-серый | #52525B | --color-text-muted |
| Accent | Индиго | #6366F1 | --color-accent |
| Accent Hover | Светлый индиго | #818CF8 | --color-accent-hover |

### Border & Shadow
- Border: rgba(255, 255, 255, 0.08)
- Border Hover: rgba(255, 255, 255, 0.15)
- Glow (Accent): rgba(99, 102, 241, 0.4)

## Типографика

### Font Families
- Primary: Inter, -apple-system, BlinkMacSystemFont, sans-serif
- Monospace: JetBrains Mono, monospace (для технических элементов)

### Scale
| Размер | Значение | Использование |
|--------|----------|---------------|
| text-xs | 0.75rem (12px) | Метки, подписи |
| text-sm | 0.875rem (14px) | Вторичный текст, навигация |
| text-base | 1rem (16px) | Основной текст |
| text-lg | 1.125rem (18px) | Подзаголовки |
| text-xl | 1.25rem (20px) | Малые заголовки |
| text-2xl | 1.5rem (24px) | Заголовки карточек |
| text-3xl | 1.875rem (30px) | Секционные заголовки |
| text-4xl | 2.25rem (36px) | Hero подзаголовки |
| text-5xl | 3rem (48px) | Hero заголовки (mobile) |
| text-6xl | 3.75rem (60px) | Hero заголовки (tablet) |
| text-7xl | 4.5rem (72px) | Hero заголовки (desktop) |

### Line Heights
- tight: 1.25 (заголовки)
- normal: 1.5 (основной текст)
- relaxed: 1.75 (описания, абзацы)

## Отступы (Spacing)

### Scale
| Токен | Значение | Пиксели |
|-------|----------|---------|
| space-1 | 0.25rem | 4px |
| space-2 | 0.5rem | 8px |
| space-3 | 0.75rem | 12px |
| space-4 | 1rem | 16px |
| space-5 | 1.25rem | 20px |
| space-6 | 1.5rem | 24px |
| space-8 | 2rem | 32px |
| space-10 | 2.5rem | 40px |
| space-12 | 3rem | 48px |
| space-16 | 4rem | 64px |
| space-20 | 5rem | 80px |
| space-24 | 6rem | 96px |
| space-32 | 8rem | 128px |

## Скругления (Border Radius)

| Токен | Значение | Использование |
|-------|----------|---------------|
| radius-sm | 0.375rem (6px) | Мелкие элементы |
| radius-md | 0.5rem (8px) | Кнопки, инпуты |
| radius-lg | 0.75rem (12px) | Карточки |
| radius-xl | 1rem (16px) | Модули |
| radius-2xl | 1.5rem (24px) | Крупные карточки |
| radius-3xl | 2rem (32px) | Hero элементы |
| radius-full | 9999px | Пилюли, аватары |

## Тени (Shadows)

### Малые
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);

### Средние
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 
0 2px 4px -2px rgba(0, 0, 0, 0.4);

### Большие
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5),
0 4px 6px -4px rgba(0, 0, 0, 0.5);

### Glow эффекты
--shadow-glow: 0 0 40px -10px rgba(99, 102, 241, 0.4);
--shadow-glow-sd: 0 0 40px -10px rgba(139, 92, 246, 0.4);
--shadow-glow-hd: 0 0 40px -10px rgba(59, 130, 246, 0.4);
--shadow-glow-fullhd: 0 0 40px -10px rgba(16, 185, 129, 0.4);
--shadow-glow-4k: 0 0 40px -10px rgba(245, 158, 11, 0.4);

## Анимации

### Duration
| Токен | Значение | Использование |
|-------|----------|---------------|
| duration-fast | 150ms | Hover, focus |
| duration-normal | 250ms | Переходы |
| duration-slow | 350ms | Появление |
| duration-slower | 500ms | Сложные анимации |

### Easing
| Токен | Значение | Использование |
|-------|----------|---------------|
| ease-out | cubic-bezier(0.16, 1, 0.3, 1) | Появление |
| ease-in-out | cubic-bezier(0.65, 0, 0.35, 1) | Переходы |

### Keyframes

#### SD Noise (Аналоговый сигнал)
@keyframes sd-noise {
  0%, 100% { opacity: 1; filter: contrast(0.8) brightness(0.9); }
  25% { opacity: 0.9; filter: contrast(1.1) brightness(1.1); }
  50% { opacity: 0.85; filter: contrast(0.9) brightness(0.9); }
  75% { opacity: 0.95; filter: contrast(1.05) brightness(0.95); }
}

#### HD Pixel (Цифровая чёткость)
@keyframes hd-pixel {
  0%, 100% { transform: scale(1); filter: blur(0.5px); }
  50% { transform: scale(1.02); filter: blur(0); }
}

#### Full HD Sharp (Резкий фокус)
@keyframes fullhd-sharp {
  0% { filter: blur(2px) brightness(1); }
  100% { filter: blur(0) brightness(1.1) saturate(1.2); }
}

#### 4K Hyper (Ультрадетализация)
@keyframes k4-hyper {
  0%, 100% { 
    transform: scale(1); 
    filter: contrast(1.2) saturate(1.3) brightness(1);
  }
  50% { 
    transform: scale(1.05); 
    filter: contrast(1.4) saturate(1.5) brightness(1.1);
  }
}

## Компоненты

### Buttons

#### Primary Button
- Background: --color-accent
- Color: white
- Padding: space-3 space-6
- Border-radius: radius-lg
- Box-shadow: 0 0 0 1px rgba(255,255,255,0.1) inset, shadow-glow
- Hover: translateY(-2px), brighter glow

#### Secondary Button
- Background: --color-bg-elevated
- Color: --color-text-primary
- Border: 1px solid --color-border
- Hover: lighter background, border highlight

### Cards

#### Feature Card
- Background: --color-bg-secondary
- Border: 1px solid --color-border
- Border-radius: radius-2xl
- Padding: space-8
- Hover: translateY(-4px), border highlight, background lighten

#### Pricing Card
- Background: --color-bg-primary
- Border: 1px solid resolution color
- Border-radius: radius-2xl
- Special glow on hover based on resolution
- 4K card has persistent glow and "Popular" badge

### Badges
- Background: --color-bg-tertiary
- Border: 1px solid --color-border
- Border-radius: radius-full
- Padding: space-1 space-3
- Font-size: text-xs
- Uppercase, letter-spacing: 0.05em

## Разрешения (Breakpoints)

| Брейкпоинт | Ширина | Описание |
|------------|--------|----------|
| sm | 640px | Мобильные |
| md | 768px | Планшеты |
| lg | 1024px | Малые десктопы |
| xl | 1280px | Десктопы |
| 2xl | 1536px | Большие экраны |

## Иконографика

### Resolution Icons
- SD: 📺 (старый кинескоп)
- HD: 💻 (современный монитор)
- Full HD: 🖥️ (два монитора)
- 4K: 🎬 (кинопроектор)

### Feature Icons
Используются эмодзи в круглых контейнерах с бордером для визуальной консистентности.

## CSS Custom Properties
```css
:root {
  /* Colors */
  --color-sd: #8B5CF6;
  --color-hd: #3B82F6;
  --color-fullhd: #10B981;
  --color-4k: #F59E0B;

  /* Backgrounds */
  --color-bg-primary: #0A0A0F;
  --color-bg-secondary: #12121A;
  --color-bg-tertiary: #1A1A25;
  --color-bg-elevated: #252535;

  /* Text */
  --color-text-primary: #FAFAFA;
  --color-text-secondary: #A1A1AA;
  --color-text-tertiary: #71717A;
  --color-text-muted: #52525B;

  /* Accent */
  --color-accent: #6366F1;
  --color-accent-hover: #818CF8;
  --color-accent-glow: rgba(99, 102, 241, 0.4);

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing, Radius, Shadows... */
  /* ... (см. таблицы выше) ... */
}
```

## Рекомендации по использованию

1. Always use CSS variables — Никогда не хардкодьте цвета
2. Maintain contrast ratios — Текст должен быть читаем на любом фоне
3. Animate with purpose — Анимации должны направлять внимание, не отвлекать
4. Resolution consistency — Используйте цвета resolution только для соответствующих тарифов
5. Mobile first — Начинайте с мобильной версии, расширяйте для десктопа

## Доступность (Accessibility)

- Минимальный контраст 4.5:1 для текста
- Фокус-стили для всех интерактивных элементов
- Поддержка prefers-reduced-motion
- Семантический HTML
- ARIA-метки где необходимо
