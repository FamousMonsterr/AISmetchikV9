import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate-no-encryption.min.js';
import type { Company, SpecificationItem, AnalysisDetails, QuoteConfig, HistoryRequest } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { calculateProjectTotals } from '@/lib/calculation';

interface GenerateExcelParams {
  company: Partial<Company>;
  specifications: SpecificationItem[];
  analysisDetails: AnalysisDetails | null;
  quoteConfig: QuoteConfig;
  totals: {
    subtotalBeforeTax: number;
    taxAmount: number;
    finalTotal: number;
    taxLabel: string;
    specItemsTotalSum: number;
    servicesSubtotal: number;
  };
}

type XlsxWorkbook = any;
type XlsxSheet = any;
type XlsxCell = any;

const CURRENCY_FORMAT = '#,##0.00 "₽"';
const NUMBER_FORMAT = '#,##0.00';

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?:\[\]]/g, '').trim().slice(0, 31) || 'Лист';
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

function cellAddress(row: number, col: number): string {
  return `${colToLetter(col)}${row}`;
}

function rangeAddress(startRow: number, startCol: number, endRow: number, endCol: number): string {
  return `${cellAddress(startRow, startCol)}:${cellAddress(endRow, endCol)}`;
}

function setCellValue(cell: XlsxCell, value: unknown, styles?: Record<string, unknown>) {
  cell.value(value);
  if (styles) {
    cell.style(styles);
  }
  return cell;
}

function setCurrencyCell(cell: XlsxCell, value: number, bold = false) {
  cell.value(value);
  cell.style({
    numberFormat: CURRENCY_FORMAT,
    horizontalAlignment: 'right',
    bold,
  });
  return cell;
}

function setNumberCell(cell: XlsxCell, value: number, formatCode = NUMBER_FORMAT) {
  cell.value(value);
  cell.style({
    numberFormat: formatCode,
    horizontalAlignment: 'right',
  });
  return cell;
}

function setFormulaCell(cell: XlsxCell, formula: string, formatCode = NUMBER_FORMAT) {
  cell.formula(formula);
  cell.style({
    numberFormat: formatCode,
    horizontalAlignment: 'right',
  });
  return cell;
}

async function createWorkbook(): Promise<XlsxWorkbook> {
  return XlsxPopulate.fromBlankAsync();
}

function buildWorksheet(
  sheet: XlsxSheet,
  company: Partial<Company>,
  specifications: SpecificationItem[],
  analysisDetails: AnalysisDetails | null,
  quoteConfig: QuoteConfig,
  totals: GenerateExcelParams['totals']
) {
  const colHeaders = ['№', 'Наименование работ и материалов', 'Ед. изм.'];
  if (quoteConfig.showMaterialColumns) {
    colHeaders.push('Кол-во (мат.)', 'Цена мат.', 'Сумма мат.');
  }
  colHeaders.push('Кол-во (монт.)', 'Цена монт.', 'Сумма монт.', 'Сумма');

  colHeaders.forEach((header, index) => {
    const width = index === 1 ? 50 : 15;
    sheet.column(index + 1).width(width);
  });

  const totalColIndex = colHeaders.length;
  const endColumn = colToLetter(totalColIndex);

  sheet.cell(1, 1).value(`Коммерческое предложение от ${format(new Date(), 'dd.MM.yyyy')}`);
  sheet.range(rangeAddress(1, 1, 1, totalColIndex)).merged(true);
  sheet.cell(1, 1).style({ bold: true, fontSize: 14 });

  let currentRow = 3;
  setCellValue(sheet.cell(currentRow, 1), 'Поставщик:');
  setCellValue(sheet.cell(currentRow, 2), company.fullName || company.name || '');
  currentRow += 1;

  if (company.inn) {
    setCellValue(sheet.cell(currentRow, 2), `ИНН ${company.inn}${company.kpp ? `/КПП ${company.kpp}` : ''}`);
    currentRow += 1;
  }
  if (analysisDetails?.objectName) {
    setCellValue(sheet.cell(currentRow, 1), 'Объект:');
    setCellValue(sheet.cell(currentRow, 2), analysisDetails.objectName);
    currentRow += 1;
  }
  if (analysisDetails?.systemType) {
    setCellValue(sheet.cell(currentRow, 1), 'Система:');
    setCellValue(sheet.cell(currentRow, 2), analysisDetails.systemType);
    currentRow += 1;
  }

  currentRow += 1;

  for (let i = 0; i < colHeaders.length; i += 1) {
    setCellValue(sheet.cell(currentRow, i + 1), colHeaders[i]);
  }
  sheet.range(rangeAddress(currentRow, 1, currentRow, totalColIndex)).style({
    bold: true,
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    fill: 'EFEFEF',
    wrapText: true,
  });

  currentRow += 1;

  for (const [index, item] of specifications.entries()) {
    const fullName = [item.name, item.brand, item.model].filter(Boolean).join(' ');

    if (item.isInformational) {
      setCellValue(sheet.cell(currentRow, 2), fullName);
      sheet.range(rangeAddress(currentRow, 2, currentRow, totalColIndex)).merged(true);
      sheet.range(rangeAddress(currentRow, 2, currentRow, totalColIndex)).style({
        bold: true,
        fill: 'EFEFEF',
      });
      currentRow += 1;
      continue;
    }

    const qtyInstall = item.quantityToInstall || 0;
    const priceInstall = item.installationPrice || 0;
    const qtyMaterial = qtyInstall + (item.quantityReserve || 0);
    const priceMaterial = item.materialPrice || 0;

    setCellValue(sheet.cell(currentRow, 1), index + 1);
    setCellValue(sheet.cell(currentRow, 2), fullName);
    setCellValue(sheet.cell(currentRow, 3), item.unit || '');

    if (quoteConfig.showMaterialColumns) {
      setNumberCell(sheet.cell(currentRow, 4), qtyMaterial);
      setNumberCell(sheet.cell(currentRow, 5), priceMaterial);
      setFormulaCell(sheet.cell(currentRow, 6), `${colToLetter(4)}${currentRow}*${colToLetter(5)}${currentRow}`);

      setNumberCell(sheet.cell(currentRow, 7), qtyInstall);
      setNumberCell(sheet.cell(currentRow, 8), priceInstall);
      setFormulaCell(sheet.cell(currentRow, 9), `${colToLetter(7)}${currentRow}*${colToLetter(8)}${currentRow}`);

      setFormulaCell(sheet.cell(currentRow, 10), `${colToLetter(6)}${currentRow}+${colToLetter(9)}${currentRow}`);
    } else {
      setNumberCell(sheet.cell(currentRow, 4), qtyInstall);
      setNumberCell(sheet.cell(currentRow, 5), priceInstall);
      setFormulaCell(sheet.cell(currentRow, 6), `${colToLetter(4)}${currentRow}*${colToLetter(5)}${currentRow}`);
      setFormulaCell(sheet.cell(currentRow, 7), `${colToLetter(6)}${currentRow}`);
    }

    currentRow += 1;
  }

  currentRow += 1;

  const labelColIndex = totalColIndex > 2 ? totalColIndex - 2 : 2;
  const addTotalRow = (label: string, value: number, bold = true) => {
    setCellValue(sheet.cell(currentRow, labelColIndex), label, {
      bold,
      horizontalAlignment: 'right',
    });
    setCurrencyCell(sheet.cell(currentRow, totalColIndex), value, bold);
    currentRow += 1;
  };

  addTotalRow('Итого по спецификации:', totals.specItemsTotalSum);
  if (totals.servicesSubtotal > 0) {
    addTotalRow('Дополнительные работы и услуги:', totals.servicesSubtotal);
  }
  addTotalRow('Подытог:', totals.subtotalBeforeTax);
  if (totals.taxLabel) {
    addTotalRow(totals.taxLabel, totals.taxAmount);
  }
  addTotalRow('ИТОГО:', totals.finalTotal, true);

  return sheet;
}

export const generateExcel = async (params: GenerateExcelParams): Promise<Blob> => {
  const workbook = await createWorkbook();
  const worksheet = workbook.sheet(0).name('Коммерческое предложение');
  buildWorksheet(
    worksheet,
    params.company,
    params.specifications,
    params.analysisDetails,
    params.quoteConfig,
    params.totals
  );

  return workbook.outputAsync('blob');
};

export const generateObjectSummaryExcel = async (projects: HistoryRequest[], company: Partial<Company>): Promise<Blob> => {
  const workbook = await createWorkbook();
  const summarySheet = workbook.sheet(0).name('Сводная по Объекту');

  summarySheet.column(1).width(40);
  summarySheet.column(2).width(24);

  const objectName = projects[0]?.objectName || 'Без названия';
  summarySheet.cell(1, 1).value(`Сводный отчет по Объекту: ${objectName}`);
  summarySheet.range('A1:B1').merged(true);
  summarySheet.cell(1, 1).style({ bold: true, fontSize: 14 });
  summarySheet.cell(3, 1).value('Проект');
  summarySheet.cell(3, 2).value('Итоговая стоимость');
  summarySheet.range('A3:B3').style({
    bold: true,
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    fill: 'EFEFEF',
  });

  let totalObjectSum = 0;
  let currentRow = 4;
  for (const project of projects) {
    const totals = calculateProjectTotals(project.outputSpecifications, project.quoteConfig || ({} as QuoteConfig));
    totalObjectSum += totals.finalTotal;
    summarySheet.cell(currentRow, 1).value(project.fileName);
    summarySheet.cell(currentRow, 2).value(totals.finalTotal);
    summarySheet.cell(currentRow, 2).style({
      numberFormat: CURRENCY_FORMAT,
      horizontalAlignment: 'right',
    });
    currentRow += 1;
  }

  currentRow += 1;
  summarySheet.cell(currentRow, 1).value('ИТОГО ПО ОБЪЕКТУ:');
  summarySheet.cell(currentRow, 1).style({ bold: true });
  summarySheet.cell(currentRow, 2).value(totalObjectSum);
  summarySheet.cell(currentRow, 2).style({
    bold: true,
    numberFormat: CURRENCY_FORMAT,
    horizontalAlignment: 'right',
  });

  for (const project of projects) {
    if (!project.outputSpecifications || !project.quoteConfig) continue;

    const totals = calculateProjectTotals(project.outputSpecifications, project.quoteConfig);
    const sheetName = sanitizeSheetName(project.fileName || 'Проект');
    const worksheet = workbook.addSheet(sheetName);

    buildWorksheet(
      worksheet,
      company,
      project.outputSpecifications,
      project.analysisDetails || null,
      project.quoteConfig,
      totals
    );
  }

  return workbook.outputAsync('blob');
};
