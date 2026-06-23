'use client';

import { MontyMascot, MontyAvatar } from '@/components/mascot';
import { MONTY_ANIMATIONS, type MontyAnimation } from '@/components/mascot/animations';

const ANIMATION_NAMES: Record<MontyAnimation, { ru: string; emoji: string }> = {
  wave: { ru: 'Приветствие', emoji: '👋' },
  idea: { ru: 'Идея', emoji: '💡' },
  work: { ru: 'Работа', emoji: '🔧' },
  done: { ru: 'Готово', emoji: '✅' },
  think: { ru: 'Размышление', emoji: '🤔' },
  celebrate: { ru: 'Празднование', emoji: '🎉' },
  sleep: { ru: 'Сон', emoji: '😴' },
  analyze: { ru: 'Аналитика', emoji: '📊' },
  search: { ru: 'Поиск', emoji: '🔍' },
  launch: { ru: 'Запуск', emoji: '🚀' },
};

export default function MascotDemoPage() {
  const animations = Object.keys(MONTY_ANIMATIONS) as MontyAnimation[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <MontyAvatar size={64} />
            <h1 className="text-4xl font-bold text-gray-900">
              Масскод Монти
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Маскот Montage HUB — 10 анимаций
          </p>
        </div>

        {/* Auto-rotating hero */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 text-center">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            Автосмена анимаций
          </h2>
          <MontyMascot
            size={200}
            autoRotate
            rotateInterval={2500}
            showLabel
          />
        </div>

        {/* Animation grid */}
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
          Все анимации
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {animations.map((anim) => (
            <div
              key={anim}
              className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow hover:scale-105 transition-transform"
            >
              <MontyMascot
                animation={anim}
                size={100}
              />
              <div className="mt-3">
                <span className="text-2xl">{ANIMATION_NAMES[anim].emoji}</span>
                <p className="text-sm font-medium text-gray-700 mt-1">
                  {ANIMATION_NAMES[anim].ru}
                </p>
                <code className="text-xs text-gray-400 mt-1 block">
                  {anim}
                </code>
              </div>
            </div>
          ))}
        </div>

        {/* Usage examples */}
        <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            Примеры использования
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="font-medium mb-3 text-gray-700">Загрузка</h3>
              <MontyMascot animation="work" size={80} showLabel />
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-3 text-gray-700">Успех</h3>
              <MontyMascot animation="done" size={80} showLabel />
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-3 text-gray-700">Приветствие</h3>
              <MontyMascot animation="wave" size={80} showLabel />
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            Размеры
          </h2>
          <div className="flex items-end justify-center gap-8">
            <MontyAvatar size={32} />
            <MontyAvatar size={48} />
            <MontyAvatar size={64} />
            <MontyAvatar size={96} />
            <MontyAvatar size={128} />
          </div>
        </div>
      </div>
    </div>
  );
}
