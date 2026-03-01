import ExcelJS from 'exceljs';
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

function moneyCell(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '#,##0.00 "₽"';
}

function buildWorksheet(
  worksheet: ExcelJS.Worksheet,
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

  worksheet.columns = colHeaders.map((header) => ({
    header,
    width: header === 'Наименование работ и материалов' ? 50 : 15,
  }));

  worksheet.addRow([`Коммерческое предложение от ${format(new Date(), 'dd.MM.yyyy')}`]);
  worksheet.mergeCells(1, 1, 1, colHeaders.length);
  worksheet.getCell(1, 1).font = { bold: true, size: 14 };

  worksheet.addRow([]);
  worksheet.addRow(['Поставщик:', company.fullName || company.name || '']);
  if (company.inn) {
    worksheet.addRow(['', `ИНН ${company.inn}${company.kpp ? `/КПП ${company.kpp}` : ''}`]);
  }
  if (analysisDetails?.objectName) worksheet.addRow(['Объект:', analysisDetails.objectName]);
  if (analysisDetails?.systemType) worksheet.addRow(['Система:', analysisDetails.systemType]);
  worksheet.addRow([]);

  const headerRow = worksheet.addRow(colHeaders);
  headerRow.font = { bold: true };

  for (const [index, item] of specifications.entries()) {
    const fullName = [item.name, item.brand, item.model].filter(Boolean).join(' ');

    if (item.isInformational) {
      const infoRow = worksheet.addRow(new Array(colHeaders.length).fill(''));
      infoRow.getCell(2).value = fullName;
      infoRow.getCell(2).font = { bold: true };
      infoRow.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      };
      worksheet.mergeCells(infoRow.number, 2, infoRow.number, colHeaders.length);
      continue;
    }

    const qtyInstall = item.quantityToInstall || 0;
    const priceInstall = item.installationPrice || 0;
    const qtyMaterial = qtyInstall + (item.quantityReserve || 0);
    const priceMaterial = item.materialPrice || 0;

    const row = worksheet.addRow([]);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = fullName;
    row.getCell(3).value = item.unit || '';

    if (quoteConfig.showMaterialColumns) {
      row.getCell(4).value = qtyMaterial;
      row.getCell(5).value = priceMaterial;
      row.getCell(6).value = { formula: `${colToLetter(4)}${row.number}*${colToLetter(5)}${row.number}` };
      row.getCell(6).numFmt = '#,##0.00';

      row.getCell(7).value = qtyInstall;
      row.getCell(8).value = priceInstall;
      row.getCell(9).value = { formula: `${colToLetter(7)}${row.number}*${colToLetter(8)}${row.number}` };
      row.getCell(9).numFmt = '#,##0.00';

      row.getCell(10).value = { formula: `${colToLetter(6)}${row.number}+${colToLetter(9)}${row.number}` };
      row.getCell(10).numFmt = '#,##0.00';
    } else {
      row.getCell(4).value = qtyInstall;
      row.getCell(5).value = priceInstall;
      row.getCell(6).value = { formula: `${colToLetter(4)}${row.number}*${colToLetter(5)}${row.number}` };
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(7).value = { formula: `${colToLetter(6)}${row.number}` };
      row.getCell(7).numFmt = '#,##0.00';
    }
  }

  const totalColIndex = colHeaders.length;
  const labelColIndex = totalColIndex > 2 ? totalColIndex - 2 : 2;

  worksheet.addRow([]);

  const addTotalRow = (label: string, value: number, bold = true) => {
    const row = worksheet.addRow(new Array(colHeaders.length).fill(''));
    row.getCell(labelColIndex).value = label;
    row.getCell(labelColIndex).font = { bold };
    row.getCell(labelColIndex).alignment = { horizontal: 'right' };
    const valueCell = row.getCell(totalColIndex);
    moneyCell(valueCell, value);
    valueCell.font = { bold };
    return row;
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
}

export const generateExcel = async (params: GenerateExcelParams): Promise<Blob> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Коммерческое предложение');
  buildWorksheet(
    worksheet,
    params.company,
    params.specifications,
    params.analysisDetails,
    params.quoteConfig,
    params.totals
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const generateObjectSummaryExcel = async (projects: HistoryRequest[], company: Partial<Company>): Promise<Blob> => {
  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('Сводная по Объекту');
  summarySheet.columns = [
    { header: 'Проект', width: 40 },
    { header: 'Итоговая стоимость', width: 24 },
  ];

  const objectName = projects[0]?.objectName || 'Без названия';
  summarySheet.addRow([`Сводный отчет по Объекту: ${objectName}`]);
  summarySheet.mergeCells(1, 1, 1, 2);
  summarySheet.getCell(1, 1).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Проект', 'Итоговая стоимость']).font = { bold: true };

  let totalObjectSum = 0;
  for (const project of projects) {
    const totals = calculateProjectTotals(project.outputSpecifications, project.quoteConfig || ({} as QuoteConfig));
    totalObjectSum += totals.finalTotal;
    const row = summarySheet.addRow([project.fileName, totals.finalTotal]);
    row.getCell(2).numFmt = '#,##0.00 "₽"';
  }

  summarySheet.addRow([]);
  const totalRow = summarySheet.addRow(['ИТОГО ПО ОБЪЕКТУ:', totalObjectSum]);
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(2).font = { bold: true };
  totalRow.getCell(2).numFmt = '#,##0.00 "₽"';

  for (const project of projects) {
    if (!project.outputSpecifications || !project.quoteConfig) continue;

    const totals = calculateProjectTotals(project.outputSpecifications, project.quoteConfig);
    const sheetName = sanitizeSheetName(project.fileName || 'Проект');
    const worksheet = workbook.addWorksheet(sheetName);

    buildWorksheet(
      worksheet,
      company,
      project.outputSpecifications,
      project.analysisDetails || null,
      project.quoteConfig,
      totals
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
