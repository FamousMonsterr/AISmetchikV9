// src/components/pdf/DocumentTemplate.tsx
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Company, SpecificationItem, AnalysisDetails, QuoteConfig } from '@/contexts/AppContext';
import { calculateItemSum } from '@/lib/calculation';

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
const styles = StyleSheet.create({
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
}


const DocumentTemplate = ({ company, specifications, analysisDetails, quoteConfig, totals, logoBuffer }: DocumentTemplateProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
            {logoBuffer && <Image src={logoBuffer} style={{ width: 150, height: 75, alignSelf: 'flex-start' }} />}
            <Text style={styles.title}>Коммерческое предложение</Text>
            <View style={styles.headerInfo}>
                <Text>от {format(new Date(), 'dd.MM.yyyy')}</Text>
                <Text>Поставщик: {company.fullName || company.name}</Text>
            </View>
             {analysisDetails?.objectName && (
                <Text style={styles.subtitle}>Объект: {analysisDetails.objectName}</Text>
             )}
        </View>
        
        {/* Table */}
        <View style={styles.table}>
            {/* Table Headers */}
            <View style={styles.tableHeaderRow} fixed>
                <Text style={[styles.tableColHeader, styles.colNum, styles.textCenter]}>№</Text>
                <Text style={[styles.tableColHeader, quoteConfig.showMaterialColumns ? styles.colName : styles.colNameSimple]}>Наименование</Text>
                <Text style={[styles.tableColHeader, styles.colUnit, styles.textCenter]}>Ед. изм.</Text>
                {quoteConfig.showMaterialColumns && (
                    <>
                        <Text style={[styles.tableColHeader, styles.colQtyMat, styles.textRight]}>Кол-во (мат)</Text>
                        <Text style={[styles.tableColHeader, styles.colPriceMat, styles.textRight]}>Цена (мат)</Text>
                        <Text style={[styles.tableColHeader, styles.colSumMat, styles.textRight]}>Сумма (мат)</Text>
                    </>
                )}
                <Text style={[styles.tableColHeader, quoteConfig.showMaterialColumns ? styles.colQtyInst : styles.colQtySimple, styles.textRight]}>Кол-во (монт)</Text>
                <Text style={[styles.tableColHeader, quoteConfig.showMaterialColumns ? styles.colPriceInst : styles.colPriceSimple, styles.textRight]}>Цена (монт)</Text>
                <Text style={[styles.tableColHeader, quoteConfig.showMaterialColumns ? styles.colSumInst : styles.colSumSimple, styles.textRight]}>Сумма (монт)</Text>
                <Text style={[styles.tableColHeader, styles.colTotal, styles.textRight]}>Итого</Text>
            </View>

            {/* Table Data */}
            {specifications.map((item, index) => {
                if (item.isInformational) {
                    return (
                        <View key={item.id} style={styles.sectionHeader}>
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
                    <View key={item.id} style={styles.tableRow} wrap={false}>
                        <Text style={[styles.tableCol, styles.colNum, styles.textCenter]}>{index + 1}</Text>
                        <Text style={[styles.tableCol, quoteConfig.showMaterialColumns ? styles.colName : styles.colNameSimple]}>{`${item.name} ${item.brand || ''} ${item.model || ''}`}</Text>
                        <Text style={[styles.tableCol, styles.colUnit, styles.textCenter]}>{item.unit}</Text>
                        {quoteConfig.showMaterialColumns && (
                            <>
                                <Text style={[styles.tableCol, styles.colQtyMat, styles.textRight]}>{qtyMaterial}</Text>
                                <Text style={[styles.tableCol, styles.colPriceMat, styles.textRight]}>{priceMaterial.toFixed(2)}</Text>
                                <Text style={[styles.tableCol, styles.colSumMat, styles.textRight]}>{sumMaterial.toFixed(2)}</Text>
                            </>
                        )}
                        <Text style={[styles.tableCol, quoteConfig.showMaterialColumns ? styles.colQtyInst : styles.colQtySimple, styles.textRight]}>{qtyInstall}</Text>
                        <Text style={[styles.tableCol, quoteConfig.showMaterialColumns ? styles.colPriceInst : styles.colPriceSimple, styles.textRight]}>{priceInstall.toFixed(2)}</Text>
                        <Text style={[styles.tableCol, quoteConfig.showMaterialColumns ? styles.colSumInst : styles.colSumSimple, styles.textRight]}>{sumInstall.toFixed(2)}</Text>
                        <Text style={[styles.tableCol, styles.colTotal, styles.textRight]}>{itemTotal.toFixed(2)}</Text>
                    </View>
                );
            })}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsContainer}>
             {quoteConfig.showMaterialColumns !== false && <View style={styles.totalRow}><Text style={styles.totalLabel}>Итого по спецификации:</Text><Text style={styles.totalValue}>{totals.specItemsTotalSum.toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeCommissioning && <View style={styles.totalRow}><Text style={styles.totalLabel}>Пуско-наладочные работы:</Text><Text style={styles.totalValue}>{(quoteConfig.commissioningCost * quoteConfig.commissioningQuantity).toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeExecutiveDocumentation && <View style={styles.totalRow}><Text style={styles.totalLabel}>Исполнительная документация:</Text><Text style={styles.totalValue}>{(quoteConfig.executiveDocumentationTotalCost * quoteConfig.executiveDocumentationQuantity).toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeMeasurementTrip && <View style={styles.totalRow}><Text style={styles.totalLabel}>Выезд для замера:</Text><Text style={styles.totalValue}>{(quoteConfig.measurementTripCost * quoteConfig.measurementTripQuantity).toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeDismantling && <View style={styles.totalRow}><Text style={styles.totalLabel}>Демонтаж:</Text><Text style={styles.totalValue}>{quoteConfig.dismantlingCost.toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeWallDrilling && <View style={styles.totalRow}><Text style={styles.totalLabel}>Сверление стен:</Text><Text style={styles.totalValue}>{(quoteConfig.wallDrillingCost * quoteConfig.wallDrillingCount).toFixed(2)} ₽</Text></View>}
            {quoteConfig.includeFloorDrilling && <View style={styles.totalRow}><Text style={styles.totalLabel}>Сверление перекрытий:</Text><Text style={styles.totalValue}>{(quoteConfig.floorDrillingCost * quoteConfig.floorDrillingCount).toFixed(2)} ₽</Text></View>}
            
            <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 5, marginTop: 5 }]}>
                <Text style={styles.totalLabel}>Подытог:</Text>
                <Text style={styles.totalValue}>{totals.subtotalBeforeTax.toFixed(2)} ₽</Text>
            </View>
            {totals.taxLabel && (
                <View style={styles.totalRow}><Text style={styles.totalLabel}>{totals.taxLabel}</Text><Text style={styles.totalValue}>{totals.taxAmount.toFixed(2)} ₽</Text></View>
            )}
            <View style={[styles.totalRow, { marginTop: 5, borderTopWidth: 1.5, borderTopColor: '#333', paddingTop: 5 }]}>
                <Text style={styles.finalTotalLabel}>ИТОГО:</Text>
                <Text style={styles.finalTotalValue}>{totals.finalTotal.toFixed(2)} ₽</Text>
            </View>
        </View>
    </Page>
  </Document>
);

export default DocumentTemplate;
