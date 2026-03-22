// src/services/docxGenerator.ts
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, VerticalAlign, ImageRun } from 'docx';
import type { Company, SpecificationItem, AnalysisDetails, QuoteConfig } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { calculateItemSum } from '@/lib/calculation';
import { getTemplateConfig } from '@/lib/document-constructor';
import type { TemplateStyleConfig } from '@/lib/template-utils';

type DocxImageType = 'jpg' | 'png' | 'gif' | 'bmp';

const detectDocxImageType = (buffer: ArrayBuffer): DocxImageType => {
    const bytes = new Uint8Array(buffer);

    if (bytes.length >= 4) {
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
            return 'png';
        }
        if (bytes[0] === 0xff && bytes[1] === 0xd8) {
            return 'jpg';
        }
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
            return 'gif';
        }
        if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
            return 'bmp';
        }
    }

    return 'png';
};


interface GenerateDocxParams {
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
    logoBuffer?: ArrayBuffer | null;
    signatureBuffer?: ArrayBuffer | null;
    stampBuffer?: ArrayBuffer | null;
    templateId?: string | null;
    templateConfig?: TemplateStyleConfig | null;
}

export const generateDocx = async ({
    company,
    specifications,
    analysisDetails,
    quoteConfig,
    totals,
    logoBuffer,
    signatureBuffer,
    stampBuffer,
    templateId,
    templateConfig,
}: GenerateDocxParams): Promise<Blob> => {
    const tpl = getTemplateConfig(templateId || 'base-template-v1');
    const resolved = templateConfig || tpl;
    const accentColor = resolved?.accentColor ? resolved.accentColor.replace('#', '').toUpperCase() : '0F172A';
    const isModern = resolved?.headerStyle === 'modern';

    const styles = {
        header: {
            font: "Montserrat",
            bold: true,
            size: isModern ? 32 : 28, // 14-16pt
            color: accentColor,
        },
        subHeader: {
            font: "Montserrat",
            size: 20,
            color: isModern ? accentColor : "808080",
        },
        tableHeader: {
            font: "Montserrat",
            bold: true,
            size: 18, // 9pt
            color: isModern ? accentColor : undefined,
        },
        tableCell: {
            font: "Montserrat",
            size: 18, // 9pt
        },
        totalLabel: {
            font: "Montserrat",
            bold: true,
            size: 20,
        },
        finalTotalLabel: {
            font: "Montserrat",
            bold: true,
            size: 24,
        },
    };

    const headerChildren: Paragraph[] = [
        new Paragraph({
            children: [
                new TextRun({
                    text: `Коммерческое предложение от ${format(new Date(), 'dd.MM.yyyy')}`,
                    ...styles.header,
                }),
            ],
            alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }),
    ];

    if(logoBuffer) {
        headerChildren.unshift(
            new Paragraph({
                children: [
                    new ImageRun({
                        type: detectDocxImageType(logoBuffer),
                        data: logoBuffer,
                        transformation: {
                            width: 150,
                            height: 75,
                        },
                    }),
                ],
            })
        );
    }
    
    headerChildren.push(
        new Paragraph({ text: `Поставщик: ${company.fullName || company.name}`, ...styles.subHeader }),
    );
     if (company.inn) {
       headerChildren.push(new Paragraph({ text: `ИНН ${company.inn}${company.kpp ? '/КПП ' + company.kpp : ''}`, ...styles.subHeader }));
    }
    if (analysisDetails?.objectName) {
        headerChildren.push(new Paragraph({ text: `Объект: ${analysisDetails.objectName}`, ...styles.subHeader }));
    }

    const showMaterials = quoteConfig.showMaterialColumns !== false;
    
    const colHeaders = ["№", "Наименование работ и материалов", "Ед. изм."];
    let colWidths: number[];

    if (showMaterials) {
        colHeaders.push("Кол-во (мат.)", "Цена мат.", "Сумма мат.");
        colHeaders.push("Кол-во (монт.)", "Цена монт.", "Сумма монт.", "Сумма");
        colWidths = [5, 20, 7, 8, 10, 10, 8, 10, 10, 12];
    } else {
        colHeaders.push("Кол-во", "Цена работы", "Сумма");
        colWidths = [5, 60, 10, 12, 13];
    }
    
    const tableHeader = new TableRow({
        children: colHeaders.map((header) => new TableCell({
            children: [new Paragraph({ text: header, ...styles.tableHeader, alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
        })),
        tableHeader: true,
    });
    
    const tableRows = specifications.map((item, index) => {
        if(item.isInformational) {
             return new TableRow({
                children: [new TableCell({
                    children: [new Paragraph({ text: item.name, ...styles.tableHeader })],
                    columnSpan: colHeaders.length,
                })],
            });
        }

        const fullName = [item.name, item.brand, item.model].filter(Boolean).join(' ');
        const rowCells: TableCell[] = [
            new TableCell({ children: [new Paragraph({ text: String(index + 1), ...styles.tableCell, alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: fullName, ...styles.tableCell })] }),
            new TableCell({ children: [new Paragraph({ text: item.unit, ...styles.tableCell, alignment: AlignmentType.CENTER })] }),
        ];
        
        const qtyInstall = item.quantityToInstall || 0;
        const priceInstall = item.installationPrice || 0;
        const sumInstall = qtyInstall * priceInstall;
        const itemTotal = calculateItemSum(item, quoteConfig);
        
        if (showMaterials) {
            const qtyMaterial = qtyInstall + (item.quantityReserve || 0);
            const priceMaterial = item.materialPrice || 0;
            const sumMaterial = qtyMaterial * priceMaterial;
             rowCells.push(
                new TableCell({ children: [new Paragraph({ text: String(qtyMaterial), ...styles.tableCell, alignment: AlignmentType.RIGHT })] }),
                new TableCell({ children: [new Paragraph({ text: priceMaterial.toFixed(2), ...styles.tableCell, alignment: AlignmentType.RIGHT })] }),
                new TableCell({ children: [new Paragraph({ text: sumMaterial.toFixed(2), ...styles.tableCell, alignment: AlignmentType.RIGHT })] })
            );
        }
        
        rowCells.push(
            new TableCell({ children: [new Paragraph({ text: String(qtyInstall), ...styles.tableCell, alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: priceInstall.toFixed(2), ...styles.tableCell, alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: sumInstall.toFixed(2), ...styles.tableCell, alignment: AlignmentType.RIGHT })] }),
        );
        
        // Add final sum only if materials are shown
        if (showMaterials) {
            rowCells.push(new TableCell({ children: [new Paragraph({ text: itemTotal.toFixed(2), ...styles.tableCell, alignment: AlignmentType.RIGHT })] }));
        }


        return new TableRow({ children: rowCells });
    });
    
    const emptyRow = new TableRow({ children: [new TableCell({ children: [new Paragraph('')], columnSpan: colHeaders.length })] });
    const createTotalRow = (label: string, value: number, isFinal: boolean = false) => new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ text: label, ...(isFinal ? styles.finalTotalLabel : styles.totalLabel), alignment: AlignmentType.RIGHT })],
                columnSpan: colHeaders.length - 1,
            }),
            new TableCell({
                children: [new Paragraph({ text: value.toFixed(2), ...(isFinal ? styles.finalTotalLabel : styles.totalLabel), alignment: AlignmentType.RIGHT })],
            }),
        ],
    });
    
    const totalsRows = [emptyRow];
    if (showMaterials) {
        totalsRows.push(createTotalRow("Итого по спецификации:", totals.specItemsTotalSum));
    }
    if (totals.servicesSubtotal > 0) {
        totalsRows.push(createTotalRow("Доп. работы и услуги:", totals.servicesSubtotal));
    }
    totalsRows.push(createTotalRow("Подытог:", totals.subtotalBeforeTax));
    if (totals.taxLabel) {
        totalsRows.push(createTotalRow(totals.taxLabel, totals.taxAmount));
    }
    totalsRows.push(createTotalRow("ИТОГО:", totals.finalTotal, true));
    
    
    const table = new Table({
        rows: [tableHeader, ...tableRows, ...totalsRows],
        width: {
            size: 100,
            type: WidthType.PERCENTAGE,
        },
        columnWidths: colWidths.map(w => w * 100),
    });

    const doc = new Document({
        creator: "AI Smetchik",
        title: "Коммерческое предложение",
        description: `Коммерческое предложение для объекта ${analysisDetails?.objectName || ''}`,
        styles: {
            default: {
                document: {
                    run: {
                        font: "Montserrat",
                    },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: isModern ? 500 : 600,
                        right: isModern ? 500 : 600,
                        bottom: isModern ? 500 : 600,
                        left: isModern ? 500 : 600,
                    },
                },
            },
            children: [
                ...headerChildren,
                new Paragraph({ text: "" }),
                table,
                new Paragraph({ text: "" }),
                ...(resolved?.showSignature === false ? [] : signatureBuffer
                    ? [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Подпись:", ...styles.tableCell }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    type: detectDocxImageType(signatureBuffer),
                                    data: signatureBuffer,
                                    transformation: {
                                        width: 160,
                                        height: 80,
                                    },
                                }),
                            ],
                        }),
                    ]
                    : []),
                ...(resolved?.showStamp === false ? [] : stampBuffer
                    ? [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Печать:", ...styles.tableCell }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    type: detectDocxImageType(stampBuffer),
                                    data: stampBuffer,
                                    transformation: {
                                        width: 140,
                                        height: 140,
                                    },
                                }),
                            ],
                        }),
                    ]
                    : []),
            ],
        }],
    });

    return await Packer.toBlob(doc);
};
