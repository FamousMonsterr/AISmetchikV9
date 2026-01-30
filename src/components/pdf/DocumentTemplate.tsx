// @ts-nocheck
// src/components/pdf/DocumentTemplate.tsx
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Company, SpecificationItem, AnalysisDetails, QuoteConfig } from '@/contexts/AppContext';
import { calculateItemSum } from '@/lib/calculation';
import { getTemplateConfig } from '@/lib/document-constructor';

// --- Font Registration ---
// Register fonts by URL. This is more reliable than Base64 for some environments.
// The fonts must be publicly accessible, so they are placed in the /public folder.
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Montserrat-Bold.ttf', fontWeight: 'bold' },
  ],
});


// --- Styles ---
const baseStyles = StyleSheet.create({
  page: {
    fontFamily: 'Montserrat',
    fontSize: 9,
    padding: 30,
    color: '#333',
  },
  bold: { fontWeight: 'bold' },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 9,
    color: '#555',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#555',
    marginBottom: 10,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  tableHeaderRow: {
    backgroundColor: '#f2f2f2',
    flexDirection: 'row',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1.5,
  },
  tableColHeader: {
    padding: 5,
    fontWeight: 'bold',
  },
  tableCol: {
    padding: 4,
  },
  // Column Widths
  colNum: { width: '5%' },
  colName: { width: '28%' },
  colUnit: { width: '5%' },
  colQtyMat: { width: '8%' },
  colPriceMat: { width: '9%' },
  colSumMat: { width: '10%' },
  colQtyInst: { width: '8%' },
  colPriceInst: { width: '9%' },
  colSumInst: { width: '10%' },
  colTotal: { width: '8%' },
  // Simple widths
  colNameSimple: { width: '56%' },
  colQtySimple: { width: '8%' },
  colPriceSimple: { width: '12%' },
  colSumSimple: { width: '12%' },
  colTotalSimple: { width: '12%' },
  // Alignment
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  // Total Section
  totalsContainer: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  finalTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  finalTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeader: {
    backgroundColor: '#f2f2f2',
    padding: 5,
    fontWeight: 'bold',
    marginTop: 5,
  }
});

interface DocumentTemplateProps {
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
    signatureUrl?: string | null;
    stampUrl?: string | null;
    templateId?: string;
}


const DocumentTemplate = ({
    company,
    specifications,
    analysisDetails,
    quoteConfig,
    totals,
    logoBuffer,
    signatureUrl,
    stampUrl,
    templateId,
}: DocumentTemplateProps) => {
  const tpl = getTemplateConfig(templateId || 'base-template-v1');
  const accentColor = tpl?.accentColor || '#0f172a';
  const headerStyle = tpl?.headerStyle || 'standard';
  const isCompact = headerStyle === 'compact' || templateId === 'pro-template-compact-v1';
  const isModern = headerStyle === 'modern' || templateId === 'business-template-modern-v1';

  const pageStyle = [
    baseStyles.page,
    isCompact && { padding: 20, fontSize: 8 },
    isModern && { padding: 28, backgroundColor: '#f8fafc' },
  ];

  const titleStyle = [baseStyles.title, isModern && { color: accentColor }];

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        {/* Header */}
        <View style={[baseStyles.header, isModern && { borderBottomColor: accentColor, paddingBottom: 12 }]}>
            {logoBuffer && (
              <Image
                src={logoBuffer}
                style={{ width: 150, height: 75, alignSelf: 'flex-start', marginBottom: 6 }}
              />
            )}
            <Text style={titleStyle}>Коммерческое предложение</Text>
            <View style={baseStyles.headerInfo}>
                <Text>от {format(new Date(), 'dd.MM.yyyy')}</Text>
                <Text>Поставщик: {company.fullName || company.name}</Text>
            </View>
             {analysisDetails?.objectName && (
                <Text style={[baseStyles.subtitle, isModern && { color: accentColor }]}>Объект: {analysisDetails.objectName}</Text>
             )}
             {isModern && (
              <View style={{ marginTop: 8, padding: 8, backgroundColor: '#e2e8f0', borderRadius: 6 }}>
                <Text style={{ fontWeight: 'bold', color: accentColor }}>Резюме</Text>
                <Text>Итого: {totals.finalTotal.toFixed(2)} ₽ · Позиции: {specifications.length}</Text>
              </View>
             )}
        </View>
        
        {/* Table */}
        <View style={baseStyles.table}>
            {/* Table Headers */}
            <View style={baseStyles.tableHeaderRow} fixed>
                <Text style={[baseStyles.tableColHeader, baseStyles.colNum, baseStyles.textCenter]}>№</Text>
                <Text style={[baseStyles.tableColHeader, quoteConfig.showMaterialColumns ? baseStyles.colName : baseStyles.colNameSimple]}>Наименование</Text>
                <Text style={[baseStyles.tableColHeader, baseStyles.colUnit, baseStyles.textCenter]}>Ед. изм.</Text>
                {quoteConfig.showMaterialColumns && (
                    <>
                        <Text style={[baseStyles.tableColHeader, baseStyles.colQtyMat, baseStyles.textRight]}>Кол-во (мат)</Text>
                        <Text style={[baseStyles.tableColHeader, baseStyles.colPriceMat, baseStyles.textRight]}>Цена (мат)</Text>
                        <Text style={[baseStyles.tableColHeader, baseStyles.colSumMat, baseStyles.textRight]}>Сумма (мат)</Text>
                    </>
                )}
                <Text style={[baseStyles.tableColHeader, quoteConfig.showMaterialColumns ? baseStyles.colQtyInst : baseStyles.colQtySimple, baseStyles.textRight]}>Кол-во (монт)</Text>
                <Text style={[baseStyles.tableColHeader, quoteConfig.showMaterialColumns ? baseStyles.colPriceInst : baseStyles.colPriceSimple, baseStyles.textRight]}>Цена (монт)</Text>
                <Text style={[baseStyles.tableColHeader, quoteConfig.showMaterialColumns ? baseStyles.colSumInst : baseStyles.colSumSimple, baseStyles.textRight]}>Сумма (монт)</Text>
                <Text style={[baseStyles.tableColHeader, baseStyles.colTotal, baseStyles.textRight]}>Итого</Text>
            </View>

            {/* Table Data */}
            {specifications.map((item, index) => {
                if (item.isInformational) {
                    return (
                        <View key={item.id} style={baseStyles.sectionHeader}>
                            <Text>{item.name}</Text>
                        </View>
                    );
                }

                const qtyInstall = item.quantityToInstall || 0;
                const priceInstall = item.installationPrice || 0;
                const sumInstall = qtyInstall * priceInstall;
                const qtyMaterial = qtyInstall + (item.quantityReserve || 0);
                const priceMaterial = item.materialPrice || 0;
                const sumMaterial = qtyMaterial * priceMaterial;
                const itemTotal = calculateItemSum(item, quoteConfig);
                
                return (
                    <View key={item.id} style={baseStyles.tableRow} wrap={false}>
                        <Text style={[baseStyles.tableCol, baseStyles.colNum, baseStyles.textCenter]}>{index + 1}</Text>
                        <Text style={[baseStyles.tableCol, quoteConfig.showMaterialColumns ? baseStyles.colName : baseStyles.colNameSimple]}>{`${item.name} ${item.brand || ''} ${item.model || ''}`}</Text>
                        <Text style={[baseStyles.tableCol, baseStyles.colUnit, baseStyles.textCenter]}>{item.unit}</Text>
                        {quoteConfig.showMaterialColumns && (
                            <>
                                <Text style={[baseStyles.tableCol, baseStyles.colQtyMat, baseStyles.textRight]}>{qtyMaterial}</Text>
                                <Text style={[baseStyles.tableCol, baseStyles.colPriceMat, baseStyles.textRight]}>{priceMaterial.toFixed(2)}</Text>
                                <Text style={[baseStyles.tableCol, baseStyles.colSumMat, baseStyles.textRight]}>{sumMaterial.toFixed(2)}</Text>
                            </>
                        )}
                        <Text style={[baseStyles.tableCol, quoteConfig.showMaterialColumns ? baseStyles.colQtyInst : baseStyles.colQtySimple, baseStyles.textRight]}>{qtyInstall}</Text>
                        <Text style={[baseStyles.tableCol, quoteConfig.showMaterialColumns ? baseStyles.colPriceInst : baseStyles.colPriceSimple, baseStyles.textRight]}>{priceInstall.toFixed(2)}</Text>
                        <Text style={[baseStyles.tableCol, quoteConfig.showMaterialColumns ? baseStyles.colSumInst : baseStyles.colSumSimple, baseStyles.textRight]}>{sumInstall.toFixed(2)}</Text>
                        <Text style={[baseStyles.tableCol, baseStyles.colTotal, baseStyles.textRight]}>{itemTotal.toFixed(2)}</Text>
                    </View>
                );
            })}
        </View>

        {/* Totals Section */}
        <View style={baseStyles.totalsContainer}>
             {quoteConfig.showMaterialColumns !== false && <View style={baseStyles.totalRow}><Text style={baseStyles.totalLabel}>Итого по спецификации:</Text><Text style={baseStyles.totalValue}>{totals.specItemsTotalSum.toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeCommissioning && <View style={baseStyles.totalRow}><Text style={baseStyles.totalLabel}>Пуско-наладочные работы:</Text><Text style={baseStyles.totalValue}>{(quoteConfig.commissioningCost * quoteConfig.commissioningQuantity).toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeExecutiveDocumentation && <View style={baseStyles.totalRow}><Text style={baseStyles.totalLabel}>Исполнительная документация:</Text><Text style={baseStyles.totalValue}>{(quoteConfig.executiveDocumentationTotalCost * quoteConfig.executiveDocumentationQuantity).toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeMeasurementTrip && <View style={baseStyles.totalRow}><Text style={baseStyles.totalLabel}>Выезд для замера:</Text><Text style={baseStyles.totalValue}>{(quoteConfig.measurementTripCost * quoteConfig.measurementTripQuantity).toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeDismantling && <View style={baseStyles.totalRow}><Text style={baseStyles.totalLabel}>Демонтаж:</Text><Text style={baseStyles.totalValue}>{quoteConfig.dismantlingCost.toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeWallDrilling && <View style={baseStyles.totalRow}><Text style={baseStyles.totalLabel}>Сверление стен:</Text><Text style={baseStyles.totalValue}>{(quoteConfig.wallDrillingCost * quoteConfig.wallDrillingCount).toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeFloorDrilling && <View style={baseStyles.totalRow}><Text style={baseStyles.totalLabel}>Сверление перекрытий:</Text><Text style={baseStyles.totalValue}>{(quoteConfig.floorDrillingCost * quoteConfig.floorDrillingCount).toFixed(2)} ₽</Text></View>}
            
            <View style={[baseStyles.totalRow, { borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 5, marginTop: 5 }]}>
                <Text style={baseStyles.totalLabel}>Подытог:</Text>
                <Text style={baseStyles.totalValue}>{totals.subtotalBeforeTax.toFixed(2)} ₽</Text>
            </View>
            {totals.taxLabel && (
                <View style={baseStyles.totalRow}><Text style={baseStyles.totalLabel}>{totals.taxLabel}</Text><Text style={baseStyles.totalValue}>{totals.taxAmount.toFixed(2)} ₽</Text></View>
            )}
            <View style={[baseStyles.totalRow, { marginTop: 5, borderTopWidth: 1.5, borderTopColor: '#333', paddingTop: 5 }]}>
                <Text style={baseStyles.finalTotalLabel}>ИТОГО:</Text>
                <Text style={baseStyles.finalTotalValue}>{totals.finalTotal.toFixed(2)} ₽</Text>
            </View>
        </View>

        {(signatureUrl || stampUrl) && tpl?.showSignature !== false && (
            <View style={{ marginTop: 20, flexDirection: 'row', gap: 16 }}>
                {signatureUrl && <Image src={signatureUrl} style={{ width: 140, height: 70 }} />}
                {stampUrl && tpl?.showStamp !== false && <Image src={stampUrl} style={{ width: 120, height: 120 }} />}
            </View>
        )}
    </Page>
  </Document>
  );
};

export default DocumentTemplate;
