/**
 * Масскод Монти — 10 вариантов анимации
 * Каждый вариант — отдельный SVG с CSS-анимацией внутри
 */

export const MONTY_ANIMATIONS = {
  // 1. 👋 Приветствие — махает рукой
  wave: '/mascot/monty-wave.svg',

  // 2. 💡 Идея — лампочка загорается на каске
  idea: '/mascot/monty-idea.svg',

  // 3. 🔧 Работа — крутит отвёрткой
  work: '/mascot/monty-work.svg',

  // 4. ✅ Готово — thumbs up, галочка
  done: '/mascot/monty-done.svg',

  // 5. 🤔 Думает — рука у подбородка
  think: '/mascot/monty-think.svg',

  // 6. 🎉 Празднует — конфетти, прыгает
  celebrate: '/mascot/monty-celebrate.svg',

  // 7. 😴 Спит — zzz, покачивается
  sleep: '/mascot/monty-sleep.svg',

  // 8. 📊 Аналитика — показывает графики
  analyze: '/mascot/monty-analyze.svg',

  // 9. 🔍 Поиск — лупа, ищет
  search: '/mascot/monty-search.svg',

  // 10. 🚀 Запуск — ракета, старт
  launch: '/mascot/monty-launch.svg',
} as const;

export type MontyAnimation = keyof typeof MONTY_ANIMATIONS;
