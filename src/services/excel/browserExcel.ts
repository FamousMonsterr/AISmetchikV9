import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate-no-encryption.min.js';

type PriceBaseExportRow = {
  'Наименование': string;
  'Модель/Артикул': string;
  'Бренд': string;
  'Ед. изм.': string;
  'Цена материала (средняя)': number;
  'Цена монтажа (средняя)': number;
  'Раздел': string;
};

const EXCEL_COLUMNS: (keyof PriceBaseExportRow)[] = [
  'Наименование',
  'Модель/Артикул',
  'Бренд',
  'Ед. изм.',
  'Цена материала (средняя)',
  'Цена монтажа (средняя)',
  'Раздел',
];

function normalizeCellValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object' && value && typeof (value as any).text === 'function') {
    return String((value as any).text() || '');
  }
  if (typeof value === 'object' && value && 'text' in (value as any)) {
    return String((value as any).text || '');
  }
  return String(value);
}

function toMatrix(value: unknown): unknown[][] {
  if (!Array.isArray(value)) {
    return value === undefined ? [] : [[value]];
  }
  if (value.length === 0) {
    return [];
  }
  if (Array.isArray(value[0])) {
    return value as unknown[][];
  }
  return [value as unknown[]];
}

function colToLetter(col: number): string {
  let result = '';
  let n = col;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
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
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0).name('База цен');

  EXCEL_COLUMNS.forEach((header, index) => {
    const cell = sheet.cell(1, index + 1);
    cell.value(header);
    cell.style({ bold: true });
    sheet.column(index + 1).width(index === 0 ? 40 : index === 1 ? 24 : index === 2 ? 20 : index === 3 ? 12 : 22);
  });

  sheet.range(`A1:${colToLetter(EXCEL_COLUMNS.length)}1`).style({
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    fill: 'EFEFEF',
  });

  rows.forEach((row, rowIndex) => {
    const excelRow = rowIndex + 2;
    EXCEL_COLUMNS.forEach((column, columnIndex) => {
      const value = row[column];
      const cell = sheet.cell(excelRow, columnIndex + 1);
      cell.value(value ?? '');
    });
  });

  const blob = await workbook.outputAsync('blob');
  triggerDownload(blob as Blob, fileName);
}

export async function parseExcelRowsFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);
  const sheet = workbook.sheet(0);
  if (!sheet) {
    throw new Error('Файл пуст.');
  }

  const usedRange = sheet.usedRange();
  if (!usedRange) {
    throw new Error('Файл пуст.');
  }

  const matrix = toMatrix(usedRange.value());
  const headerValues = matrix[0] || [];
  const headers = headerValues.map((value, index) => {
    const normalized = normalizeCellValue(value).trim();
    return normalized || `column_${index + 1}`;
  });

  if (headers.length === 0) {
    throw new Error('В файле отсутствуют заголовки.');
  }

  const data: Record<string, string>[] = [];
  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    const rowObject: Record<string, string> = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      const value = normalizeCellValue(row[index]).trim();
      if (value) hasValue = true;
      rowObject[header] = value;
    });

    if (hasValue) {
      data.push(rowObject);
    }
  }

  return { headers, data };
}
