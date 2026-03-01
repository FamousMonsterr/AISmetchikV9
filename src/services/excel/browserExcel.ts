import ExcelJS from 'exceljs';

type PriceBaseExportRow = {
  'Наименование': string;
  'Модель/Артикул': string;
  'Бренд': string;
  'Ед. изм.': string;
  'Цена материала (средняя)': number;
  'Цена монтажа (средняя)': number;
  'Раздел': string;
};

function normalizeCellValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object' && value && 'text' in (value as any)) {
    return String((value as any).text || '');
  }
  return String(value);
}

function triggerDownload(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export async function exportPriceBaseToExcel(rows: PriceBaseExportRow[], fileName: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('База цен');

  sheet.columns = [
    { header: 'Наименование', key: 'Наименование', width: 40 },
    { header: 'Модель/Артикул', key: 'Модель/Артикул', width: 24 },
    { header: 'Бренд', key: 'Бренд', width: 20 },
    { header: 'Ед. изм.', key: 'Ед. изм.', width: 12 },
    { header: 'Цена материала (средняя)', key: 'Цена материала (средняя)', width: 22 },
    { header: 'Цена монтажа (средняя)', key: 'Цена монтажа (средняя)', width: 22 },
    { header: 'Раздел', key: 'Раздел', width: 20 },
  ];

  rows.forEach((row) => sheet.addRow(row));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, fileName);
}

export async function parseExcelRowsFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Файл пуст.');
  }

  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
  const headers = headerValues
    .map((value: unknown, index: number) => {
      const normalized = normalizeCellValue(value).trim();
      return normalized || `column_${index + 1}`;
    });

  if (headers.length === 0) {
    throw new Error('В файле отсутствуют заголовки.');
  }

  const data: Record<string, string>[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rowObject: Record<string, string> = {};
    let hasValue = false;

    headers.forEach((header: string, index: number) => {
      const value = normalizeCellValue(row.getCell(index + 1).value).trim();
      if (value) hasValue = true;
      rowObject[header] = value;
    });

    if (hasValue) {
      data.push(rowObject);
    }
  }

  return { headers, data };
}
