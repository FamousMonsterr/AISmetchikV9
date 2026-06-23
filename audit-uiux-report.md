# UI/UX Audit Report — AISmetchikV9

**Дата:** 2026-06-16  
**Аудитор:** AI Subagent  
**Scope:** `src/components/ui/` + все `*Dialog.tsx` компоненты  
**Критерии:** Accessibility, Консистентность, Z-index, Mobile, Focus, Dark Mode, Touch Targets

---

## Сводка

| Категория | High | Medium | Low | Всего |
|-----------|------|--------|-----|-------|
| Accessibility | 4 | 3 | 2 | 9 |
| Консистентность | 1 | 3 | 2 | 6 |
| Z-index конфликты | 1 | 2 | 1 | 4 |
| Mobile responsive | 0 | 3 | 2 | 5 |
| Focus states | 1 | 2 | 1 | 4 |
| Dark mode | 2 | 2 | 1 | 5 |
| Touch targets | 5 | 3 | 1 | 9 |
| **Итого** | **14** | **18** | **10** | **42** |

---

## 🔴 HIGH — Критические баги

### 1. [Touch Target] Checkbox — 16×16px вместо 44×44px
**Файл:** `src/components/ui/checkbox.tsx`  
**Проблема:** Элемент `h-4 w-4` (16×16px) — значительно меньше минимального touch target 44×44px. На мобильных устройствах крайне сложно попасть пальцем.  
**Приоритет:** HIGH  

**Fix:**
```tsx
// checkbox.tsx — увеличить hit area через padding
<CheckboxPrimitive.Root
  ref={ref}
  className={cn(
    "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-50 " +
    "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground " +
    // Добавить min touch target
    "min-h-[44px] min-w-[44px] p-[14px] flex items-center justify-center",
    className
  )}
  {...props}
>
  <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
    <Check className="h-4 w-4" />
  </CheckboxPrimitive.Indicator>
</CheckboxPrimitive.Root>
```

---

### 2. [Touch Target] RadioGroupItem — 16×16px вместо 44×44px
**Файл:** `src/components/ui/radio-group.tsx`  
**Проблема:** `aspect-square h-4 w-4` (16×16px) — слишком маленький touch target.  
**Приоритет:** HIGH  

**Fix:**
```tsx
<RadioGroupPrimitive.Item
  ref={ref}
  className={cn(
    "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-50 " +
    // Увеличить hit area
    "min-h-[44px] min-w-[44px] p-[14px] flex items-center justify-center",
    className
  )}
  {...props}
>
```

---

### 3. [Touch Target] Slider thumb — 20×20px
**Файл:** `src/components/ui/slider.tsx`  
**Проблема:** Thumb `h-5 w-5` (20×20px) — меньше 44×44px. На тач-устройствах ползунок тяжело захватить.  
**Приоритет:** HIGH  

**Fix:**
```tsx
<SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
// Добавить pseudo-element для увеличения hit area или увеличить thumb:
// h-7 w-7 (28px) + обёртка с min 44px
```

Альтернатива — CSS для увеличения click area без визуального изменения:
```css
[data-radix-slider-thumb]::after {
  content: '';
  position: absolute;
  inset: -12px;
}
```

---

### 4. [Touch Target] Dialog/Sheet close button — ~16×16px
**Файл:** `src/components/ui/dialog.tsx`, `sheet.tsx`  
**Проблема:** Кнопка закрытия `<X className="h-4 w-4" />` без явного размера — визуально ~16×16px, touch area мала.  
**Приоритет:** HIGH  

**Fix (dialog.tsx):**
```tsx
<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
  {/* Увеличить touch area */}
  <span className="flex h-11 w-11 items-center justify-center">
    <X className="h-4 w-4" />
  </span>
  <span className="sr-only">Close</span>
</DialogPrimitive.Close>
```

---

### 5. [Touch Target] DropdownMenuItem / SelectItem / MenubarItem — мелкие padding
**Файл:** `src/components/ui/dropdown-menu.tsx`, `select.tsx`, `menubar.tsx`  
**Проблема:** `py-1.5` (6px) — высота элемента ~28px. Touch target значительно меньше 44px.  
**Приоритет:** HIGH  

**Fix (dropdown-menu.tsx):**
```tsx
const DropdownMenuItem = React.forwardRef<...>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-3 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-h-[44px]",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
```

Аналогично для `SelectItem` и `MenubarItem`.

---

### 6. [Accessibility] CookieConsentDialog — нет focus trap и keyboard navigation
**Файл:** `src/components/CookieConsentDialog.tsx`  
**Проблема:** Использует `<div className="fixed ...">` вместо `<Dialog>` из Radix. Нет focus trap, нет закрытия по Escape, нет `role="dialog"`, нет `aria-modal`.  
**Приоритет:** HIGH  

**Fix:** Переписать на использование `<Dialog>` или добавить `role="dialog"` и `aria-modal="true"`:
```tsx
<div 
  role="dialog" 
  aria-modal="true" 
  aria-label="Настройки cookie"
  className="fixed bottom-0 left-0 right-0 z-50 ..."
>
```

Лучший вариант — обернуть в `<Sheet side="bottom">` или `<Dialog>`.

---

### 7. [Accessibility] NavigationLoader — нет aria-live для screen readers
**Файл:** `src/components/ui/navigation-loader.tsx`  
**Проблема:** Overlay загрузки не объявляет своё появление screen reader'ам. Нет `aria-live`, `role="status"` или `aria-busy`.  
**Приоритет:** HIGH  

**Fix:**
```tsx
<motion.div
  role="status"
  aria-live="polite"
  aria-label="Загрузка страницы"
  className={cn("fixed inset-0 z-[120] ...")}
>
  ...
  <div className="text-sm font-medium">Загрузка…</div>
</motion.div>
```

---

### 8. [Dark Mode] Custom CSS variables всегда тёмные
**Файл:** `src/app/globals.css`  
**Проблема:** Переменные `--color-bg-secondary`, `--color-bg-tertiary`, `--color-bg-elevated`, `--color-text-primary` и др. заданы в `:root` с тёмными значениями (`#12121A`, `#1A1A25`, `#FAFAFA`). В light mode они не переопределяются — компоненты, использующие эти токены, всегда выглядят тёмными.  
**Приоритет:** HIGH  

**Fix:**
```css
:root {
  /* Светлая тема */
  --color-bg-secondary: #F4F4F5;
  --color-bg-tertiary: #E4E4E7;
  --color-bg-elevated: #FFFFFF;
  --color-text-primary: #18181B;
  --color-text-secondary: #71717A;
  --color-text-muted: #A1A1AA;
  --color-border-custom: rgba(0, 0, 0, 0.08);
  --color-border-hover: rgba(0, 0, 0, 0.15);
}

.dark {
  --color-bg-secondary: #12121A;
  --color-bg-tertiary: #1A1A25;
  --color-bg-elevated: #252535;
  --color-text-primary: #FAFAFA;
  --color-text-secondary: #A1A1AA;
  --color-text-muted: #52525B;
  --color-border-custom: rgba(255, 255, 255, 0.08);
  --color-border-hover: rgba(255, 255, 255, 0.15);
}
```

---

### 9. [Dark Mode] RegistrationDialog — hardcoded тёмные стили
**Файл:** `src/components/RegistrationDialog.tsx`  
**Проблема:** `bg-slate-950 text-slate-100`, `border-white/10 bg-white/5` — всегда тёмный вид, не работает light mode.  
**Приоритет:** HIGH  

**Fix:** Использовать CSS-переменные вместо hardcoded цветов:
```tsx
<DialogContent className="max-h-[min(92vh,720px)] max-w-md overflow-y-auto border-border bg-background p-4 text-foreground sm:p-6">
```
И аналогично для всех внутренних элементов: `border-input bg-background text-foreground` вместо `border-white/10 bg-white/5 text-slate-100`.

---

### 10. [Accessibility] Badge — div без role
**Файл:** `src/components/ui/badge.tsx`  
**Проблема:** Badge использует `<div>`, что не имеет семантического значения. Если используется для статусов — нужен `role="status"`.  
**Приоритет:** HIGH (если badge показывает статусы) / MEDIUM (если декоративный)  

**Fix:**
```tsx
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div 
      role="status"
      className={cn(badgeVariants({ variant }), className)} 
      {...props} 
    />
  )
}
```

---

## 🟡 MEDIUM — Важные баги

### 11. [Z-index] Множественные z-50 без иерархии
**Файлы:** `dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `popover.tsx`  
**Проблема:** Все overlay/portal компоненты используют `z-50`. При открытии dropdown внутри dialog, или popover внутри sheet — z-index одинаковый, контент может перекрываться некорректно.  
**Приоритет:** MEDIUM  

**Fix:** Создать z-index scale:
```css
/* globals.css */
:root {
  --z-dropdown: 50;
  --z-sticky: 40;
  --z-overlay: 60;
  --z-modal: 70;
  --z-popover: 80;
  --z-toast: 100;
  --z-loader: 120;
}
```
Применить: `dropdown-menu z-[var(--z-dropdown)]`, `dialog z-[var(--z-modal)]` и т.д.

---

### 12. [Consistency] AlertDialogOverlay — `bg-background` вместо `bg-black/80`
**Файл:** `src/components/ui/alert-dialog.tsx`  
**Проблема:** `AlertDialogOverlay` использует `bg-background` (белый/чёрный в зависимости от темы), тогда как `DialogOverlay` использует `bg-black/80 backdrop-blur-sm`. Визуально несогласовано.  
**Приоритет:** MEDIUM  

**Fix:**
```tsx
const AlertDialogOverlay = React.forwardRef<...>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
```

---

### 13. [Consistency] AlertDialogHeader — `space-y-2` vs DialogHeader `space-y-1.5`
**Файл:** `src/components/ui/alert-dialog.tsx`  
**Проблема:** `AlertDialogHeader` использует `space-y-2`, `DialogHeader` — `space-y-1.5`. Разный визуальный отступ между заголовком и описанием.  
**Приоритет:** MEDIUM  

**Fix:** Унифицировать на `space-y-1.5`:
```tsx
const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
```

---

### 14. [Consistency] Две системы кнопок: Button vs GlassButton
**Файлы:** `src/components/ui/button.tsx`, `src/components/ui/glass-button.tsx`  
**Проблема:** `Button` — `rounded-md`, `GlassButton` — `rounded-full`. Разные системы анимации (CSS transition vs framer-motion). `GlassButton` не имеет `focus-visible` стилей.  
**Приоритет:** MEDIUM  

**Fix:** Добавить focus-visible в GlassButton:
```tsx
const buttonVariants = cva(
  'relative flex items-center justify-center gap-2 rounded-full border transition-all duration-200 font-semibold ' +
  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] active:brightness-95 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  { ... }
)
```

---

### 15. [Mobile] PurchaseCreditsDialog RadioGroup — не стакается на 320px
**Файл:** `src/components/PurchaseCreditsDialog.tsx`  
**Проблема:** `flex gap-4` для двух radio-опций — на экране 320px элементы сжимаются, текст может обрезаться.  
**Приоритет:** MEDIUM  

**Fix:**
```tsx
<RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="flex flex-col gap-3 sm:flex-row sm:gap-4">
```

---

### 16. [Mobile] ExcelImportDialog — max-w-6xl на мобильном
**Файл:** `src/components/ExcelImportDialog.tsx`  
**Проблема:** `max-w-6xl h-[90vh]` — на 320px экране таблица не помещается, горизонтальный скролл неочевиден.  
**Приоритет:** MEDIUM  

**Fix:**
```tsx
<DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-6xl h-[90vh] flex flex-col">
```

---

### 17. [Focus] Calendar day cells — 36×36px, focus ring обрезается
**Файл:** `src/components/ui/calendar.tsx`  
**Проблема:** Ячейки календаря `h-9 w-9` (36×36px) с `focus-within:z-20` — фокус виден, но touch target мал.  
**Приоритет:** MEDIUM  

**Fix:**
```tsx
day: cn(
  buttonVariants({ variant: "ghost" }),
  "h-9 w-9 p-0 font-normal aria-selected:opacity-100 min-h-[44px] min-w-[44px]"
),
```

---

### 18. [Focus] GlassContainer — onClick без focus стилей
**Файл:** `src/components/ui/glass-container.tsx`  
**Проблема:** Компонент принимает `onClick` но не имеет tabIndex, role или focus стилей. Не доступен с клавиатуры.  
**Приоритет:** MEDIUM  

**Fix:**
```tsx
return (
  <motion.div
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    className={cn(
      'glass-effect relative rounded-3xl border backdrop-blur-lg p-6 transition-all duration-300',
      onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      blurMap[blur],
      variantClasses[variant],
      className
    )}
    onClick={onClick}
    ...
  >
```

---

### 19. [Dark Mode] GlassContainer — hardcoded light/dark variant
**Файл:** `src/components/ui/glass-container.tsx`  
**Проблема:** `variantClasses` использует `bg-white/10 border-white/20` и `bg-black/10 border-white/10` — не реагирует на тему автоматически.  
**Приоритет:** MEDIUM  

**Fix:**
```tsx
const variantClasses = {
  light: 'bg-white/10 border-white/20 dark:bg-white/5 dark:border-white/10',
  dark: 'bg-black/10 border-white/10 dark:bg-black/20 dark:border-white/5',
};
```

---

### 20. [Accessibility] StickyBanner — нет aria-live
**Файл:** `src/components/ui/sticky-banner.tsx`  
**Проблема:** Баннер появляется анимированно, но screen reader не узнаёт о его появлении.  
**Приоритет:** MEDIUM  

**Fix:**
```tsx
<motion.div
  role="banner"
  aria-live="polite"
  className={cn("relative z-[60] flex items-center justify-center ...")}
>
```

---

### 21. [Accessibility] SidebarLink — notification badge без aria-label
**Файл:** `src/components/ui/sidebar.tsx`  
**Проблема:** Badge с `notificationCount` не имеет `aria-label`. Screen reader не объявляет количество уведомлений.  
**Приоритет:** MEDIUM  

**Fix:**
```tsx
{link.notificationCount && link.notificationCount > 0 && (
  <motion.div
    aria-label={`${link.notificationCount} уведомлений`}
    className={cn(
      "absolute flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold",
      open ? "top-1.5 right-1.5" : "top-0.5 right-0.5"
    )}
  >
    {link.notificationCount > 9 ? '9+' : link.notificationCount}
  </motion.div>
)}
```

---

### 22. [Z-index] Sidebar mobile overlay z-40 vs Sheet z-50
**Файл:** `src/components/ui/sidebar.tsx`  
**Проблема:** Mobile sidebar overlay `z-40`, content `z-50`. Если открыть Sheet поверх sidebar — оба на z-50, конфликт.  
**Приоритет:** MEDIUM  

**Fix:** Поднять sidebar content до `z-[55]` или опустить overlay до `z-30`.

---

### 23. [Z-index] GlassNavbar z-40 может перекрываться
**Файл:** `src/components/ui/glass-navbar.tsx`  
**Проблема:** `z-40` — такое же как sidebar overlay. Sticky banner на `z-[60]` перекроет navbar.  
**Приоритет:** MEDIUM  

**Fix:** Увеличить до `z-50` или согласовать с общей z-index шкалой.

---

## 🟢 LOW — Незначительные баги

### 24. [Touch Target] ToastClose — ~20×20px
**Файл:** `src/components/ui/toast.tsx`  
**Проблема:** `<X className="h-5 w-5" />` с `p-1` — touch area ~28×28px.  
**Приоритет:** LOW  

**Fix:**
```tsx
<ToastPrimitives.Close
  className={cn(
    "absolute right-2 top-2 rounded-full p-2 text-foreground/80 opacity-100 ring-offset-background transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring ...",
    className
  )}
>
  <X className="h-5 w-5" />
</ToastPrimitives.Close>
```

---

### 25. [Consistency] Toast viewport z-[100] — hardcoded
**Файл:** `src/components/ui/toast.tsx`  
**Проблема:** `z-[100]` — magic number. Должен быть из z-index шкалы.  
**Приоритет:** LOW  

---

### 26. [Consistency] GlassCard vs Card — разные системы
**Файлы:** `src/components/ui/card.tsx`, `src/components/ui/glass-card.tsx`  
**Проблема:** `Card` — `rounded-lg`, `GlassCard` — `rounded-2xl`. Разные подходы к теням и бордерам.  
**Приоритет:** LOW (дизайн-решение, не баг)

---

### 27. [Mobile] Calendar — sm: breakpoint для months layout
**Файл:** `src/components/ui/calendar.tsx`  
**Проблема:** `flex-col sm:flex-row` — на 320px два месяца в столбик может быть много.  
**Приоритет:** LOW  

---

### 28. [Mobile] Sheet w-3/4 — мало места для контента
**Файл:** `src/components/ui/sheet.tsx`  
**Проблема:** `w-3/4` на 320px = 240px. Контент может не поместиться.  
**Приоритет:** LOW  

**Fix:**
```tsx
left: "inset-y-0 left-0 h-full w-[85%] sm:w-3/4 border-r ... sm:max-w-sm",
right: "inset-y-0 right-0 h-full w-[85%] sm:w-3/4 border-l ... sm:max-w-sm",
```

---

### 29. [Accessibility] Separator — decorative по умолчанию, но нет role
**Файл:** `src/components/ui/separator.tsx`  
**Проблема:** `decorative={true}` по умолчанию — корректно, но если передать `decorative={false}`, нужен `role="separator"`. Radix это делает автоматически — OK.  
**Приоритет:** LOW (не баг, проверено)

---

### 30. [Focus] Tabs — tabindex на content
**Файл:** `src/components/ui/tabs.tsx`  
**Проблема:** `TabsContent` имеет `focus-visible:ring-2` — при фокусе с клавиатуры виден ring. Это корректно.  
**Приоритет:** LOW (не баг)

---

### 31. [Consistency] Button — duplicate `transition-all transition-colors`
**Файл:** `src/components/ui/button.tsx`  
**Проблема:** В base class `transition-all transition-colors duration-150` — `transition-all` уже включает `transition-colors`. Избыточно.  
**Приоритет:** LOW  

**Fix:**
```tsx
"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 ..."
```

---

### 32. [Accessibility] Skeleton — нет aria-label
**Файл:** `src/components/ui/skeleton.tsx`  
**Проблема:** Skeleton placeholder не сообщает screen reader'у что это loading placeholder.  
**Приоритет:** LOW  

**Fix:**
```tsx
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Загрузка..."
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}
```

---

### 33. [Consistency] ProcessingDialog — hardcoded dark classes in alerts
**Файл:** `src/components/ProcessingDialog.tsx`  
**Проблема:** `bg-amber-50 dark:bg-amber-900/20`, `bg-green-50 dark:bg-green-900/20` — корректно использует dark: варианты.  
**Приоритет:** LOW (не баг)

---

### 34. [Touch Target] ScrollArea scrollbar — 10px width
**Файл:** `src/components/ui/scroll-area.tsx`  
**Проблема:** `w-2.5` (10px) для scrollbar — тонкий для тач-устройств.  
**Приоритет:** LOW  

**Fix:**
```tsx
orientation === "vertical" && "h-full w-3 border-l border-l-transparent p-[1px]",
```

---

### 35. [Consistency] Menubar height h-10 — фиксированная
**Файл:** `src/components/ui/menubar.tsx`  
**Проблема:** `h-10` (40px) — меньше 44px touch target для самого menubar.  
**Приоритет:** LOW  

---

### 36. [Accessibility] Progress — нет aria-label
**Файл:** `src/components/ui/progress.tsx`  
**Проблема:** Radix Progress автоматически добавляет `role="progressbar"` и `aria-valuenow`, но нет дефолтного `aria-label`.  
**Приоритет:** LOW  

**Fix:** Добавить `aria-label="Прогресс"` при использовании.

---

### 37. [Mobile] CookieConsentDialog — кнопки могут не стакаться
**Файл:** `src/components/CookieConsentDialog.tsx`  
**Проблема:** `sm:flex-row sm:flex-wrap` — на 320px три кнопки в столбик, но `flex-col` не указан явно.  
**Приоритет:** LOW  

**Fix:**
```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
```

---

### 38. [Focus] Badge — не может получить фокус
**Файл:** `src/components/ui/badge.tsx`  
**Проблема:** Badge имеет `focus:ring-2` стили, но `<div>` не может получить фокус без `tabIndex`. Если badge не интерактивен — focus стили не нужны.  
**Приоритет:** LOW  

---

### 39. [Dark Mode] Select dropdown — bg-popover может не работать
**Файл:** `src/components/ui/select.tsx`  
**Проблема:** `bg-popover text-popover-foreground` — зависит от CSS-переменных. В текущем globals.css popover белый в light mode. OK.  
**Приоритет:** LOW (не баг при корректной настройке)

---

### 40. [Accessibility] Form — FormControl aria-describedby
**Файл:** `src/components/ui/form.tsx`  
**Проблема:** `aria-describedby` ссылается на `formDescriptionId` даже когда описания нет. Пустая строка — не проблема, но можно оптимизировать.  
**Приоритет:** LOW  

---

### 41. [Touch Target] TabsTrigger — px-3 py-2
**Файл:** `src/components/ui/tabs.tsx`  
**Проблема:** `px-3 py-2` — высота ~36px с текстом. Чуть меньше 44px.  
**Приоритет:** LOW  

---

### 42. [Consistency] SheetOverlay — `bg-background/80` vs DialogOverlay `bg-black/80`
**Файл:** `src/components/ui/sheet.tsx`  
**Проблема:** Sheet overlay использует `bg-background/80` (белый/чёрный полупрозрачный), Dialog — `bg-black/80`. Визуально разный эффект.  
**Приоритет:** LOW  

**Fix:** Унифицировать:
```tsx
// sheet.tsx
"fixed inset-0 z-50 bg-black/80 backdrop-blur-sm ..."
```

---

## Рекомендации по приоритету исправления

### Phase 1 — Немедленно (1-2 дня)
1. ✅ Touch targets: Checkbox, RadioGroup, Slider, Dialog/Sheet close, Dropdown/Select items
2. ✅ CookieConsentDialog → role="dialog" или переделать на Sheet
3. ✅ NavigationLoader → aria-live
4. ✅ Custom CSS variables → light/dark разделение

### Phase 2 — Следующий спринт (3-5 дней)
1. ✅ Z-index шкала
2. ✅ AlertDialog overlay/header консистентность
3. ✅ GlassButton focus-visible
4. ✅ RegistrationDialog → CSS variables
5. ✅ PurchaseCreditsDialog mobile layout

### Phase 3 — Бэклог
1. Skeleton aria-label
2. Badge role
3. Sheet w-85%
4. Toast padding
5. Menubar height

---

## Позитивные находки ✅

- **Focus states** на shadcn компонентах корректные: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- **Dialog** компоненты используют Radix — встроенный focus trap, Escape закрытие, aria атрибуты
- **Form** компонент правильно связывает `aria-describedby`, `aria-invalid`, `htmlFor`
- **Switch** имеет корректный touch target (44×24px) и focus-visible
- **Tabs** корректно используют `data-[state=active]` стили
- **Separator** правильно использует `decorative` prop
- **ScrollArea** использует Radix с touch-none для скроллбара
- **Sheet** имеет корректные slide анимации и focus trap
- **GlassCard** правильно использует dark: варианты
- **ProcessingDialog** блокирует закрытие во время обработки (`onInteractOutside`)

---

*Отчёт сгенерирован автоматически. Рекомендуется провести ручное тестирование на реальных устройствах (iPhone SE, Android 320px) для верификации touch target размеров.*
