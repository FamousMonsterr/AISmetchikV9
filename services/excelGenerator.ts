// src/services/excelGenerator.ts
import * as XLSX from 'xlsx';
import type { Company, SpecificationItem, AnalysisDetails, QuoteConfig, HistoryRequest } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { calculateItemSum, calculateProjectTotals } from '@/lib/calculation';

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


function createWorksheetFromData(company: Partial<Company>, specifications: SpecificationItem[], analysisDetails: AnalysisDetails | null, quoteConfig: QuoteConfig, totals: GenerateExcelParams['totals']): XLSX.WorkSheet {
    let ws_data: any[][] = [];

    // --- Header ---
    ws_data.push([`Коммерческое предложение от ${format(new Date(), 'dd.MM.yyyy')}`]);
    ws_data.push([]);
    ws_data.push(["Поставщик:", company.fullName || company.name]);
    if (company.inn) {
       ws_data.push(["", `ИНН ${company.inn}${company.kpp ? '/КПП ' + company.kpp : ''}`]);
    }
    if (analysisDetails?.objectName) ws_data.push(["Объект:", analysisDetails.objectName]);
    if (analysisDetails?.systemType) ws_data.push(["Система:", analysisDetails.systemType]);
    ws_data.push([]);

    // --- Table Headers ---
    const colHeaders = ["№", "Наименование работ и материалов", "Ед. изм."];
    if (quoteConfig.showMaterialColumns) {
        colHeaders.push("Кол-во (мат.)", "Цена мат.", "Сумма мат.");
    }
    colHeaders.push("Кол-во (монт.)", "Цена монт.", "Сумма монт.", "Сумма");
    ws_data.push(colHeaders);
    const tableStartRow = ws_data.length; // This is the first data row (0-indexed)

    // --- Table Body ---
    specifications.forEach((item, index) => {
        const fullName = [item.name, item.brand, item.model].filter(Boolean).join(' ');

        if(item.isInformational) {
            // This is a section header
            const headerRow = Array(colHeaders.length).fill('');
            headerRow[1] = fullName;
            ws_data.push(headerRow);
            // We'll merge and style this later
        } else {
            // This is a regular item row
            const row: any[] = [index + 1, fullName, item.unit];
            
            const qtyInstall = item.quantityToInstall || 0;
            const priceInstall = item.installationPrice || 0;
            const qtyMaterial = qtyInstall + (item.quantityReserve || 0);
            const priceMaterial = item.materialPrice || 0;

            if (quoteConfig.showMaterialColumns) {
                row.push(qtyMaterial, priceMaterial, { f: `${XLSX.utils.encode_col(3)}${ws_data.length + 1}*${XLSX.utils.encode_col(4)}${ws_data.length + 1}` });
            }
            row.push(qtyInstall, priceInstall, { f: `${XLSX.utils.encode_col(quoteConfig.showMaterialColumns ? 6 : 3)}${ws_data.length + 1}*${XLSX.utils.encode_col(quoteConfig.showMaterialColumns ? 7 : 4)}${ws_data.length + 1}` });
            
            const materialSumRef = quoteConfig.showMaterialColumns ? `${XLSX.utils.encode_col(5)}${ws_data.length + 1}` : '0';
            const installSumRef = `${XLSX.utils.encode_col(quoteConfig.showMaterialColumns ? 8 : 5)}${ws_data.length + 1}`;
            row.push({ f: `${materialSumRef}+${installSumRef}` });
            
            ws_data.push(row);
        }
    });
    
    let currentRow = ws_data.length;
    
    // --- Totals Section ---
    const totalColIndex = colHeaders.length - 1;
    const labelColIndex = totalColIndex > 2 ? totalColIndex - 2 : 1;
    
    const itemsTotalRow = Array(colHeaders.length).fill('');
    itemsTotalRow[labelColIndex] = "Итого по спецификации:";
    itemsTotalRow[totalColIndex] = totals.specItemsTotalSum;
    ws_data.push([]);
    ws_data.push(itemsTotalRow);
    currentRow += 2;

    if (totals.servicesSubtotal > 0) {
        const servicesRow = Array(colHeaders.length).fill('');
        servicesRow[labelColIndex] = "Дополнительные работы и услуги:";
        servicesRow[totalColIndex] = totals.servicesSubtotal;
        ws_data.push(servicesRow);
        currentRow++;
    }

    const subtotalRow = Array(colHeaders.length).fill('');
    subtotalRow[labelColIndex] = "Подытог:";
    subtotalRow[totalColIndex] = totals.subtotalBeforeTax;
    ws_data.push(subtotalRow);
    currentRow++;

    if (totals.taxLabel) {
        const taxRow = Array(colHeaders.length).fill('');
        taxRow[labelColIndex] = totals.taxLabel;
        taxRow[totalColIndex] = totals.taxAmount;
        ws_data.push(taxRow);
        currentRow++;
    }

    const finalTotalRow = Array(colHeaders.length).fill('');
    finalTotalRow[labelColIndex] = "ИТОГО:";
    finalTotalRow[totalColIndex] = totals.finalTotal;
    ws_data.push(finalTotalRow);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // --- Formatting ---
    ws['!cols'] = colHeaders.map(h => ({ wch: h === 'Наименование работ и материалов' ? 50 : 15 }));
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalColIndex } }]; // Merge title row

    // Apply styles and formulas row by row
    ws_data.forEach((row, r) => {
        // Style section headers
        if (specifications[r-tableStartRow]?.isInformational) {
             ws['!merges'] = ws['!merges'] || [];
             ws['!merges'].push({ s: { r: r, c: 1 }, e: { r: r, c: totalColIndex } });
             const cell = ws[XLSX.utils.encode_cell({r, c:1})];
             if(cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "EFEFEF" } } };
        } else if (r >= tableStartRow) { // Format number cells in data rows
            for (let c = 3; c <= totalColIndex; c++) {
                 const cell = ws[XLSX.utils.encode_cell({r, c})];
                 if(cell && (typeof cell.v === 'number' || cell.f)) {
                     cell.t = 'n';
                     cell.z = '#,##0.00';
                 }
            }
        }

        // Style total rows
        if (r >= tableStartRow + specifications.length + 1) {
            const labelCell = ws[XLSX.utils.encode_cell({r, c:labelColIndex})];
            if(labelCell) labelCell.s = { font: { bold: true }, alignment: { horizontal: 'right' } };

            const valueCell = ws[XLSX.utils.encode_cell({r, c:totalColIndex})];
            if(valueCell && typeof valueCell.v === 'number') {
                valueCell.t = 'n';
                valueCell.z = '#,##0.00 "₽"';
                valueCell.s = { font: { bold: true } };
            }
        }
    });

    return ws;
}


export const generateExcel = async (params: GenerateExcelParams): Promise<Blob> => {
    const wb = XLSX.utils.book_new();
    const ws = createWorksheetFromData(params.company, params.specifications, params.analysisDetails, params.quoteConfig, params.totals);
    XLSX.utils.book_append_sheet(wb, ws, "Коммерческое предложение");
    const wbout = await XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};


export const generateObjectSummaryExcel = async (projects: HistoryRequest[], company: Partial<Company>): Promise<Blob> => {
    const wb = XLSX.utils.book_new();

    // --- 1. Summary Sheet ---
    const summary_data: any[][] = [
        [`Сводный отчет по Объекту: ${projects[0]?.objectName || 'Без названия'}`],
        [],
        ["Проект", "Итоговая стоимость"]
    ];
    let totalObjectSum = 0;
    
    const projectTotals = projects.map(project => {
        const totals = calculateProjectTotals(project.outputSpecifications, project.quoteConfig || {} as QuoteConfig);
        totalObjectSum += totals.finalTotal;
        return {
            name: project.fileName,
            total: totals.finalTotal
        };
    });

    projectTotals.forEach(pt => {
        summary_data.push([pt.name, pt.total]);
    });

    summary_data.push([]);
    const totalRow = ["ИТОГО ПО ОБЪЕКТУ:", totalObjectSum];
    summary_data.push(totalRow);

    const summary_ws = XLSX.utils.aoa_to_sheet(summary_data);
    summary_ws['!cols'] = [{wch: 40}, {wch: 20}];
    summary_ws[XLSX.utils.encode_cell({r: 0, c: 0})].s = { font: { bold: true, sz: 14 } };
    const totalRowNum = summary_data.length - 1;
    summary_ws[XLSX.utils.encode_cell({r: totalRowNum, c: 0})].s = { font: { bold: true } };
    const totalCell = summary_ws[XLSX.utils.encode_cell({r: totalRowNum, c: 1})];
    if(totalCell) {
        totalCell.t = 'n';
        totalCell.s = { font: { bold: true }, numFmt: "#,##0.00 ₽" };
    }
    
    XLSX.utils.book_append_sheet(wb, summary_ws, "Сводная по Объекту");

    // --- 2. Individual Project Sheets ---
    for (const project of projects) {
        if(project.outputSpecifications && project.quoteConfig) {
             const projectTotalsFull = calculateProjectTotals(project.outputSpecifications, project.quoteConfig);
             // Ensure all required fields for GenerateExcelParams are present
             const paramsForSheet: GenerateExcelParams = {
                 company: company, // Note: a single company is used for the whole group report
                 specifications: project.outputSpecifications,
                 analysisDetails: project.analysisDetails || null,
                 quoteConfig: project.quoteConfig,
                 totals: projectTotalsFull
             };
             const ws = createWorksheetFromData(paramsForSheet.company, paramsForSheet.specifications, paramsForSheet.analysisDetails, paramsForSheet.quoteConfig, paramsForSheet.totals);
             // Sanitize sheet name
             let sheetName = project.fileName.replace(/[\\/*?:]/g, '').substring(0, 31);
             XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    }

    const wbout = await XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};
