export const ITEM_TYPES = ['device', 'cable', 'cable_support', 'consumable', 'other'] as const;

export type ClassifiedItemType = (typeof ITEM_TYPES)[number];

const CABLE_SUPPORT_KEYWORDS = [
  'гофра',
  'гофротруба',
  'металлорукав',
  'кабель канал',
  'кабель-канал',
  'лоток',
  'перфорированный лоток',
  'проволочный лоток',
  'лестничный лоток',
  'короб',
  'труба пвх',
  'пвх труба',
  'труба пнд',
  'пнд труба',
  'труба',
  'шланг',
  'короб монтажный',
  'короб напольный',
  'кабельная трасса',
  'кабельная линия в гофре',
];

const CABLE_KEYWORDS = [
  'кабель',
  'провод',
  'витая пара',
  'силовой провод',
  'контрольный кабель',
  'огнестойкий кабель',
  'кабельная линия',
];

const CABLE_ABBREVIATION_REGEX =
  /\b(шввп|кпснг|кпсэнг|кпсэв|кспв|квк|utp|ftp|sftp|stp|cat5e|cat6|cat6a|cat7|ввг|ввгнг|пвс|rg-?6)\b/i;

const CABLE_SECTION_REGEX =
  /\b\d+\s*[xх]\s*\d+(?:[.,]\d+)?(?:\s*[xх]\s*\d+(?:[.,]\d+)?)?\b/i;

const CABLE_PAIRS_REGEX = /\b\d+\s*пар(?:а|ы)?\b/i;

const CONSUMABLE_KEYWORDS = [
  'стяжка',
  'дюбель',
  'саморез',
  'огнезащита',
  'огнеза',
  'мастика',
  'перчатки',
  'перчатка',
  'изолента',
  'клемма',
  'наконечник',
  'термоусадка',
  'термоусадочная трубка',
  'крепеж',
  'шайба',
  'гайка',
  'болт',
  'анкер',
  'аксессуар',
  'аксессуары',
  'бирка',
  'маркер',
  'скоба',
];

const DEVICE_KEYWORDS = [
  'прибор',
  'датчик',
  'табличка',
  'устройство',
  'сервер',
  'камера',
  'извещатель',
  'контроллер',
  'считыватель',
  'коммутатор',
  'регистратор',
  'терминал',
  'панель',
  'шкаф',
  'блок питания',
  'источник питания',
  'ибп',
  'монитор',
  'кнопка выхода',
  'роутер',
  'маршрутизатор',
  'модем',
];

const METER_UNITS = new Set(['м', 'метр', 'метры', 'м.п', 'мп', 'п.м', 'пм']);
const DEVICE_UNITS = new Set(['шт', 'компл', 'комплект']);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я\s.-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (source: string, keywords: string[]) =>
  keywords.some((keyword) => source.includes(keyword));

const hasCableSignal = (normalizedName: string, lowerName: string, normalizedUnit: string) => {
  if (includesAny(normalizedName, CABLE_KEYWORDS)) return true;
  if (CABLE_ABBREVIATION_REGEX.test(lowerName)) return true;
  if (CABLE_SECTION_REGEX.test(lowerName)) return true;
  if (CABLE_PAIRS_REGEX.test(lowerName)) return true;
  return METER_UNITS.has(normalizedUnit);
};

export function classifyItemType(name?: string | null, unit?: string | null): ClassifiedItemType {
  const lowerName = (name || '').toLowerCase();
  const normalizedName = normalize(name || '');
  const normalizedUnit = normalize(unit || '');

  if (includesAny(normalizedName, CABLE_SUPPORT_KEYWORDS)) {
    return 'cable_support';
  }

  if (hasCableSignal(normalizedName, lowerName, normalizedUnit)) {
    return 'cable';
  }

  if (includesAny(normalizedName, CONSUMABLE_KEYWORDS)) {
    return 'consumable';
  }

  if (includesAny(normalizedName, DEVICE_KEYWORDS)) {
    return 'device';
  }

  if (DEVICE_UNITS.has(normalizedUnit)) {
    return 'device';
  }

  return 'other';
}
