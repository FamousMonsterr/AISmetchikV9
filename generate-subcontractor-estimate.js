#!/usr/bin/env node
/**
 * Расчёт субподрядчика: АПС Космодром «Восточный»
 * МИК КА, РБ и КГЧ (поз. 4А)
 * Документ: 860/2.1-4A-АПС
 * Расценки: датчик 650₽, прибор 1600₽, кабель 110₽/м
 */
const XlsxPopulate = require('xlsx-populate');

async function generateExcel() {
  const wb = await XlsxPopulate.fromBlankAsync();

  // === Лист 1: Расчёт субподрядчика ===
  const ws = wb.sheet(0);
  ws.name("Расчёт субподрядчика");

  ws.cell("A1").value("РАСЧЁТ СТОИМОСТИ МОНТАЖА (СУБПОДРЯД)").style({ bold: true, fontSize: 14 });
  ws.cell("A2").value("Объект: Космодром «Восточный» — МИК КА, РБ и КГЧ (поз. 4А)").style({ bold: true, fontSize: 11 });
  ws.cell("A3").value("Система: Автоматическая пожарная сигнализация (АПС)").style({ fontSize: 10 });
  ws.cell("A4").value("Документ: 860/2.1-4A-АПС | Этап: II | Заказчик: ФКУ «Дирекция космодрома «Восточный»").style({ fontSize: 10 });
  ws.cell("A5").value("Исполнитель: _____________________________ | Дата: " + new Date().toLocaleDateString('ru-RU')).style({ fontSize: 10 });

  let r = 7;
  const hdr = ["№", "Наименование работ", "Ед.", "Кол.", "Цена монтажа (₽/ед.)", "Сумма монтажа (₽)", "Комментарий"];
  hdr.forEach((h, i) => {
    ws.cell(`${String.fromCharCode(65 + i)}${r}`).value(h).style({ bold: true, fill: { type: "solid", color: "4472C4" }, fontColor: "FFFFFF" });
  });
  r++;

  let totalItems = 0;

  // === 1. ПРИБОРЫ УПРАВЛЕНИЯ ===
  ws.cell(`A${r}`).value("1.").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  ws.cell(`B${r}`).value("ПРИБОРЫ УПРАВЛЕНИЯ").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  r++;

  const devices = [
    ["1.1", "ППКУП R3-Рубеж-2ОП (установка, подключение, наладка)", "шт", 22, 1600, "Приёмно-контрольный прибор управления пожарный"],
    ["1.2", "ЦПИУ «Рубеж» исп.2 (установка, настройка мониторинга)", "шт", 1, 1600, "Центральный прибор индикации и управления"],
    ["1.3", "БИУ R3-Рубеж-БИУ (установка, подключение)", "шт", 3, 1600, "Блок индикации и управления"],
    ["1.4", "ПДУ R3-Рубеж-ПДУ-ПТ (установка, пусконаладка)", "шт", 18, 1600, "Пульт дистанционного управления пожаротушением"],
    ["1.5", "ИВЭПР 24/2,5 RS-R3 (установка, подключение к сети I кат.)", "шт", 41, 1600, "Источник вторичного электропитания 24В"],
    ["1.6", "БР 24 (установка, подключение)", "шт", 82, 1600, "Бокс резервного электропитания"],
    ["1.7", "ШУН/В-5,5-00-УПП-R3 (установка, подключение)", "шт", 38, 1600, "Шкаф управления насосом/вентилятором 5,5кВт"],
    ["1.8", "ШУН/В-7,5-00-УПП-R3 (установка, подключение)", "шт", 4, 1600, "Шкаф управления насосом/вентилятором 7,5кВт"],
  ];

  devices.forEach(d => {
    const sum = d[3] * d[4];
    totalItems += sum;
    ws.cell(`A${r}`).value(d[0]);
    ws.cell(`B${r}`).value(d[1]);
    ws.cell(`C${r}`).value(d[2]);
    ws.cell(`D${r}`).value(d[3]);
    ws.cell(`E${r}`).value(d[4]);
    ws.cell(`F${r}`).value(sum);
    ws.cell(`G${r}`).value(d[5]);
    r++;
  });

  // Подитог приборы
  const devicesTotal = devices.reduce((s, d) => s + d[3] * d[4], 0);
  ws.cell(`E${r}`).value("Итого приборы:").style({ bold: true });
  ws.cell(`F${r}`).value(devicesTotal).style({ bold: true, fill: { type: "solid", color: "FFF2CC" } });
  r += 2;

  // === 2. ДАТЧИКИ И ИЗВЕЩАТЕЛИ ===
  ws.cell(`A${r}`).value("2.").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  ws.cell(`B${r}`).value("ДАТЧИКИ И ИЗВЕЩАТЕЛИ").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  r++;

  const sensors = [
    ["2.1", "ИП 212-64-R3 дымовой оптико-электронный (установка, подключение к АЛС)", "шт", 1200, 650, "Адресно-аналоговый, основание W1.02"],
    ["2.2", "ИП 212-64-R3 дымовой оптико-электронный (установка, подключение к АЛС)", "шт", 464, 650, "Адресно-аналоговый, основание W1.03"],
    ["2.3", "ИП 101-29-PR-R3 тепловой максимально-дифференциальный (установка)", "шт", 79, 650, "Адресно-аналоговый"],
    ["2.4", "ИПР 513-11ИКЗ-А-R3 ручной адресный (установка у эвакуационных выходов)", "шт", 1194, 650, "С встроенным изолятором КЗ"],
    ["2.5", "УДП 513-11ИКЗ-R3 устройство дистанционного пуска (установка)", "шт", 174, 650, "С встроенным изолятором КЗ"],
    ["2.6", "ИП 212-1-А-R3 аспирационный (установка, наладка)", "шт", 18, 650, "Класс чувствительности «А»"],
    ["2.7", "ИЗ-1Б-R3 изолятор шлейфа в корпусе W1.02 (установка)", "шт", 1197, 650, "Защита от КЗ в шлейфе"],
    ["2.8", "АМ-1-R3 адресная метка (маркировка точек)", "шт", 865, 650, "Маркировка адресных точек"],
    ["2.9", "ОПОП 1-R3 «Выход» световой оповещатель (установка)", "шт", 200, 650, "Табло эвакуации"],
    ["2.10", "ОПОП 1-R3 «Стрелка влево/вправо» световые оповещатели (установка)", "шт", 100, 650, "Указатели направления эвакуации"],
    ["2.11", "ОПОП 124-7 24В свето-звуковой оповещатель (установка)", "шт", 100, 650, ""],
    ["2.12", "Табло «ГАЗ! Не входи!» / «ГАЗ! Уходи!» (установка)", "шт", 50, 650, "Газоопасная зона"],
    ["2.13", "Извещатель охранный магнитоконтактный (установка)", "шт", 20, 650, "Охранная сигнализация"],
    ["2.14", "ЭДУ-ПТ элемент дистанционного управления (установка)", "шт", 30, 650, ""],
    ["2.15", "Оповещатель «Автоматика пожаротушения отключена» (установка)", "шт", 10, 650, "Табло-предупреждение"],
  ];

  sensors.forEach(s => {
    const sum = s[3] * s[4];
    totalItems += sum;
    ws.cell(`A${r}`).value(s[0]);
    ws.cell(`B${r}`).value(s[1]);
    ws.cell(`C${r}`).value(s[2]);
    ws.cell(`D${r}`).value(s[3]);
    ws.cell(`E${r}`).value(s[4]);
    ws.cell(`F${r}`).value(sum);
    ws.cell(`G${r}`).value(s[5]);
    r++;
  });

  const sensorsTotal = sensors.reduce((s, d) => s + d[3] * d[4], 0);
  ws.cell(`E${r}`).value("Итого датчики:").style({ bold: true });
  ws.cell(`F${r}`).value(sensorsTotal).style({ bold: true, fill: { type: "solid", color: "FFF2CC" } });
  r += 2;

  // === 3. КАБЕЛЬНЫЕ РАБОТЫ ===
  ws.cell(`A${r}`).value("3.").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  ws.cell(`B${r}`).value("КАБЕЛЬНЫЕ РАБОТЫ (включая кабеленесущие конструкции)").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  r++;

  const cables = [
    ["3.1", "Прокладка кабельных трасс (гофра ПВХ, лотки, кабель-каналы)", "м", 20000, 110, "Кабеленесущие конструкции + прокладка"],
    ["3.2", "Прокладка адресных линий связи (АЛС) — негорючий кабель", "м", 15000, 110, "Адресные шлейфы пожарной сигнализации"],
    ["3.3", "Прокладка силовых кабелей электропитания АПС", "м", 3000, 110, "Питание оборудования I категория"],
    ["3.4", "Маркировка кабелей и жил", "м", 20000, 110, "Маркировка по окончании монтажа"],
    ["3.5", "Герметизация проходов через стены/перекрытия (80-200мм)", "шт", 200, 110, "Огнезащитный герметик"],
    ["3.6", "Герметизация проходов через стены/перекрытия (>200мм)", "шт", 50, 110, "Огнезащитный герметик"],
    ["3.7", "Замер сопротивления изоляции кабелей", "м", 20000, 110, "Испытания после монтажа"],
  ];

  cables.forEach(c => {
    const sum = c[3] * c[4];
    totalItems += sum;
    ws.cell(`A${r}`).value(c[0]);
    ws.cell(`B${r}`).value(c[1]);
    ws.cell(`C${r}`).value(c[2]);
    ws.cell(`D${r}`).value(c[3]);
    ws.cell(`E${r}`).value(c[4]);
    ws.cell(`F${r}`).value(sum);
    ws.cell(`G${r}`).value(c[5]);
    r++;
  });

  const cablesTotal = cables.reduce((s, d) => s + d[3] * d[4], 0);
  ws.cell(`E${r}`).value("Итого кабель:").style({ bold: true });
  ws.cell(`F${r}`).value(cablesTotal).style({ bold: true, fill: { type: "solid", color: "FFF2CC" } });
  r += 2;

  // === 4. ПУСКОНАЛАДОЧНЫЕ РАБОТЫ (ПНР) ===
  ws.cell(`A${r}`).value("4.").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  ws.cell(`B${r}`).value("ПУСКОНАЛАДОЧНЫЕ РАБОТЫ (ПНР)").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  r++;

  const pnrBase = devicesTotal + sensorsTotal + cablesTotal;
  const pnr7 = Math.round(pnrBase * 0.07);

  const pnrItems = [
    ["4.1", "Пусконаладка ППКУП (программирование, наладка шлейфов)", "компл", 1, 0, "Входит в ПНР 7%"],
    ["4.2", "Пусконаладка ЦПИУ (настройка мониторинга, сценариев)", "компл", 1, 0, "Входит в ПНР 7%"],
    ["4.3", "Пусконаладка ИВЭПР (настройка режимов электропитания)", "компл", 1, 0, "Входит в ПНР 7%"],
    ["4.4", "Пусконаладка ШУН/В (программирование сценариев пожаротушения)", "компл", 1, 0, "Входит в ПНР 7%"],
    ["4.5", "Пусконаладка системы оповещения (тестирование всех зон)", "компл", 1, 0, "Входит в ПНР 7%"],
    ["4.6", "Пусконаладка модулей автоматики дымоудаления", "компл", 1, 0, "Входит в ПНР 7%"],
    ["4.7", "Испытания СПС (приёмочные испытания, оформление протоколов)", "компл", 1, 0, "Входит в ПНР 7%"],
    ["4.8", "Обучение персонала работе с СПС", "чел", 10, 0, "Входит в ПНР 7%"],
    ["4.9", "Подготовка исполнительной документации", "компл", 1, 0, "Входит в ПНР 7%"],
  ];

  pnrItems.forEach(p => {
    ws.cell(`A${r}`).value(p[0]);
    ws.cell(`B${r}`).value(p[1]);
    ws.cell(`C${r}`).value(p[2]);
    ws.cell(`D${r}`).value(p[3]);
    ws.cell(`E${r}`).value("7% от СМР");
    ws.cell(`G${r}`).value(p[5]);
    r++;
  });

  ws.cell(`E${r}`).value("Итого ПНР (7% от СМР):").style({ bold: true });
  ws.cell(`F${r}`).value(pnr7).style({ bold: true, fill: { type: "solid", color: "FFF2CC" } });
  r += 2;

  // === 5. ИСПОЛНИТЕЛЬНАЯ ДОКУМЕНТАЦИЯ ===
  ws.cell(`A${r}`).value("5.").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  ws.cell(`B${r}`).value("ИСПОЛНИТЕЛЬНАЯ ДОКУМЕНТАЦИЯ").style({ bold: true, fill: { type: "solid", color: "D9E2F3" } });
  r++;

  ws.cell(`A${r}`).value("5.1");
  ws.cell(`B${r}`).value("Исполнительная документация (акты, журналы, схемы)");
  ws.cell(`C${r}`).value("компл");
  ws.cell(`D${r}`).value(1);
  ws.cell(`E${r}`).value(15000);
  ws.cell(`F${r}`).value(15000);
  ws.cell(`G${r}`).value("Фиксированная стоимость");
  totalItems += 15000;
  r += 2;

  // === ИТОГОВЫЕ СТРОКИ ===
  ws.cell(`A${r}`).value("").style({ fill: { type: "solid", color: "C6EFCE" } });
  ws.cell(`B${r}`).value("ИТОГО МОНТАЖНЫЕ РАБОТЫ (СМР)").style({ bold: true, fontSize: 11, fill: { type: "solid", color: "C6EFCE" } });
  ws.cell(`F${r}`).value(pnrBase).style({ bold: true, fontSize: 11, fill: { type: "solid", color: "C6EFCE" } });
  r++;

  ws.cell(`B${r}`).value("ПНР (7% от СМР)").style({ bold: true });
  ws.cell(`F${r}`).value(pnr7).style({ bold: true });
  r++;

  ws.cell(`B${r}`).value("Исполнительная документация").style({ bold: true });
  ws.cell(`F${r}`).value(15000).style({ bold: true });
  r++;

  const totalBeforeTax = pnrBase + pnr7 + 15000;
  ws.cell(`B${r}`).value("ИТОГО ДО НАЛОГА").style({ bold: true, fontSize: 11 });
  ws.cell(`F${r}`).value(totalBeforeTax).style({ bold: true, fontSize: 11 });
  r++;

  const usn6 = Math.round(totalBeforeTax * 0.06);
  ws.cell(`B${r}`).value("УСН 6%").style({ bold: true });
  ws.cell(`F${r}`).value(usn6).style({ bold: true });
  r++;

  const grandTotal = totalBeforeTax + usn6;
  ws.cell(`A${r}`).value("").style({ fill: { type: "solid", color: "C6EFCE" } });
  ws.cell(`B${r}`).value("ИТОГО С УСН 6%").style({ bold: true, fontSize: 12, fill: { type: "solid", color: "C6EFCE" } });
  ws.cell(`F${r}`).value(grandTotal).style({ bold: true, fontSize: 12, fill: { type: "solid", color: "C6EFCE" } });
  r += 3;

  // === ПОДПИСИ ===
  ws.cell(`A${r}`).value("ИСПОЛНИТЕЛЬ:").style({ bold: true });
  ws.cell(`A${r+1}`).value("___________________________");
  ws.cell(`A${r+2}`).value("Дата: ________________");
  ws.cell(`E${r}`).value("ЗАКАЗЧИК:").style({ bold: true });
  ws.cell(`E${r+1}`).value("___________________________");
  ws.cell(`E${r+2}`).value("Дата: ________________");

  // Ширины колонок
  ws.column("A").width(6);
  ws.column("B").width(60);
  ws.column("C").width(6);
  ws.column("D").width(8);
  ws.column("E").width(22);
  ws.column("F").width(20);
  ws.column("G").width(40);

  // === Лист 2: Сводная ведомость ===
  const ws2 = wb.addSheet("Сводная ведомость");
  ws2.cell("A1").value("СВОДНАЯ ВЕДОМОСТЬ РАСЧЁТА").style({ bold: true, fontSize: 14 });
  ws2.cell("A2").value("АПС — Космодром «Восточный», МИК КА, РБ и КГЧ (поз. 4А)").style({ fontSize: 10 });

  let r2 = 4;
  ["№", "Наименование", "Сумма (₽)", "Доля (%)"].forEach((h, i) => {
    ws2.cell(`${String.fromCharCode(65 + i)}${r2}`).value(h).style({ bold: true, fill: { type: "solid", color: "4472C4" }, fontColor: "FFFFFF" });
  });
  r2++;

  const summary = [
    ["1", "Приборы управления (209 шт)", devicesTotal, ""],
    ["2", "Датчики и извещатели (5 601 шт)", sensorsTotal, ""],
    ["3", "Кабельные работы (101 250 м/шт)", cablesTotal, ""],
    ["", "ИТОГО СМР", pnrBase, ""],
    ["4", "ПНР (7%)", pnr7, ""],
    ["5", "Исполнительная документация", 15000, ""],
    ["", "ИТОГО ДО НАЛОГА", totalBeforeTax, ""],
    ["6", "УСН 6%", usn6, ""],
    ["", "ИТОГО С НАЛОГОМ", grandTotal, ""],
  ];

  summary.forEach(s => {
    s.forEach((val, i) => {
      const cell = ws2.cell(`${String.fromCharCode(65 + i)}${r2}`);
      cell.value(val);
      if (s[0] === "" && i === 1) cell.style({ bold: true });
      if (s[0] === "" && i === 2) cell.style({ bold: true });
      // Calculate percentage
      if (i === 3 && s[2] && pnrBase > 0) {
        cell.value(Math.round(s[2] / pnrBase * 100) + "%");
      }
    });
    r2++;
  });

  ws2.column("A").width(5);
  ws2.column("B").width(40);
  ws2.column("C").width(20);
  ws2.column("D").width(12);

  // Сохранение
  const outputPath = '/Users/timofejbruhin/.openclaw/workspace/АПС_Космодром_Расчёт_субподрядчика.xlsx';
  await wb.toFileAsync(outputPath);

  console.log("✅ Excel создан: " + outputPath);
  console.log("");
  console.log("=== СВОДКА ===");
  console.log("Приборы:       " + devicesTotal.toLocaleString('ru-RU') + " ₽");
  console.log("Датчики:       " + sensorsTotal.toLocaleString('ru-RU') + " ₽");
  console.log("Кабель:        " + cablesTotal.toLocaleString('ru-RU') + " ₽");
  console.log("ИТОГО СМР:     " + pnrBase.toLocaleString('ru-RU') + " ₽");
  console.log("ПНР (7%):      " + pnr7.toLocaleString('ru-RU') + " ₽");
  console.log("Исп.док:       15 000 ₽");
  console.log("До налога:     " + totalBeforeTax.toLocaleString('ru-RU') + " ₽");
  console.log("УСН 6%:        " + usn6.toLocaleString('ru-RU') + " ₽");
  console.log("ИТОГО:         " + grandTotal.toLocaleString('ru-RU') + " ₽");
}

generateExcel().catch(console.error);
