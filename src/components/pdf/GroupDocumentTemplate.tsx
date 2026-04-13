// @ts-nocheck
// src/components/pdf/GroupDocumentTemplate.tsx
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Company, SpecificationItem, AnalysisDetails, QuoteConfig } from '@/contexts/AppContext';
import { calculateItemSum } from '@/lib/calculation';
import { getTemplateConfig } from '@/lib/document-constructor';
import type { TemplateStyleConfig } from '@/lib/template-utils';

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Montserrat-Bold.ttf', fontWeight: 'bold' },
  ],
});

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
  colNameSimple: { width: '56%' },
  colQtySimple: { width: '8%' },
  colPriceSimple: { width: '12%' },
  colSumSimple: { width: '12%' },
  colTotalSimple: { width: '12%' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
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
  },
});

interface GroupDocumentSection {
  projectName: string;
  analysisDetails: AnalysisDetails | null;
  specifications: SpecificationItem[];
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

interface GroupDocumentTemplateProps {
  company: Partial<Company>;
  sections: GroupDocumentSection[];
  signatureUrl?: string | null;
  stampUrl?: string | null;
  templateId?: string;
  templateConfig?: TemplateStyleConfig | null;
  includeSummary?: boolean;
}

const GroupDocumentTemplate = ({
  company,
  sections,
  signatureUrl,
  stampUrl,
  templateId,
  templateConfig,
  includeSummary = false,
}: GroupDocumentTemplateProps) => {
  const tpl = getTemplateConfig(templateId || 'base-template-v1');
  const resolved = templateConfig || tpl;
  const accentColor = resolved?.accentColor || '#0f172a';
  const headerStyle = resolved?.headerStyle
    || (templateId === 'pro-template-compact-v1'
      ? 'compact'
      : templateId === 'business-template-modern-v1'
        ? 'modern'
        : 'standard');
  const isCompact = headerStyle === 'compact';
  const isModern = headerStyle === 'modern';
  const showSignature = resolved?.showSignature !== false;
  const showStamp = resolved?.showStamp !== false;

  const pageStyle = [
    baseStyles.page,
    isCompact && { padding: 20, fontSize: 8 },
    isModern && { padding: 28, backgroundColor: '#f8fafc' },
  ];

  const titleStyle = [baseStyles.title, isModern && { color: accentColor }];

  return (
    <Document>
      {includeSummary && (
        <Page size="A4" style={pageStyle}>
          <View style={[baseStyles.header, isModern && { borderBottomColor: accentColor, paddingBottom: 12 }]}>
            <Text style={titleStyle}>Сводная по объекту</Text>
            <View style={baseStyles.headerInfo}>
              <Text>от {format(new Date(), 'dd.MM.yyyy')}</Text>
              <Text>Поставщик: {company.fullName || company.name}</Text>
            </View>
          </View>
          <View style={baseStyles.table}>
            <View style={baseStyles.tableHeaderRow} fixed>
              <Text style={[baseStyles.tableColHeader, { width: '8%' }]}>№</Text>
              <Text style={[baseStyles.tableColHeader, { width: '72%' }]}>Проект</Text>
              <Text style={[baseStyles.tableColHeader, { width: '20%', borderRightWidth: 0 }]}>Итого</Text>
            </View>
            {sections.map((section, index) => {
              const projectLabel = section.analysisDetails?.objectName || section.projectName || `Проект ${index + 1}`;
              return (
                <View key={`summary-${index}`} style={baseStyles.tableRow} wrap={false}>
                  <Text style={[baseStyles.tableCol, { width: '8%', textAlign: 'center' }]}>{index + 1}</Text>
                  <Text style={[baseStyles.tableCol, { width: '72%' }]}>{projectLabel}</Text>
                  <Text style={[baseStyles.tableCol, { width: '20%', borderRightWidth: 0, textAlign: 'right' }]}>{section.totals.finalTotal.toFixed(2)} ₽</Text>
                </View>
              );
            })}
          </View>
          <View style={[baseStyles.totalsContainer, { width: '50%' }]}>
            <View style={[baseStyles.totalRow, { borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 5, marginTop: 5 }]}>
              <Text style={baseStyles.finalTotalLabel}>ИТОГО ПО ОБЪЕКТУ:</Text>
              <Text style={baseStyles.finalTotalValue}>
                {sections.reduce((sum, section) => sum + section.totals.finalTotal, 0).toFixed(2)} ₽
              </Text>
            </View>
          </View>
        </Page>
      )}
      {sections.map((section, index) => {
        const totals = section.totals;
        const commissioningTotal = totals.specItemsTotalSum * (section.quoteConfig.commissioningCost / 100) * (section.quoteConfig.commissioningQuantity || 0);
        const headerObjectName = section.analysisDetails?.objectName || section.projectName || `Проект ${index + 1}`;

        return (
          <Page key={`${section.projectName}-${index}`} size="A4" style={pageStyle}>
            <View style={[baseStyles.header, isModern && { borderBottomColor: accentColor, paddingBottom: 12 }]}
            >
              <Text style={titleStyle}>Коммерческое предложение</Text>
              <View style={baseStyles.headerInfo}>
                <Text>от {format(new Date(), 'dd.MM.yyyy')}</Text>
                <Text>Поставщик: {company.fullName || company.name}</Text>
              </View>
              <Text style={[baseStyles.subtitle, isModern && { color: accentColor }]}>
                Объект: {headerObjectName}
              </Text>
            </View>

            <View style={baseStyles.table}>
              <View style={baseStyles.tableHeaderRow} fixed>
                <Text style={[baseStyles.tableColHeader, baseStyles.colNum]}>№</Text>
                <Text style={[baseStyles.tableColHeader, section.quoteConfig.showMaterialColumns ? baseStyles.colName : baseStyles.colNameSimple]}>Наименование</Text>
                <Text style={[baseStyles.tableColHeader, baseStyles.colUnit]}>Ед.</Text>
                {section.quoteConfig.showMaterialColumns && (
                  <>
                    <Text style={[baseStyles.tableColHeader, baseStyles.colQtyMat]}>Кол-во</Text>
                    <Text style={[baseStyles.tableColHeader, baseStyles.colPriceMat]}>Цена</Text>
                    <Text style={[baseStyles.tableColHeader, baseStyles.colSumMat]}>Сумма</Text>
                  </>
                )}
                <Text style={[baseStyles.tableColHeader, section.quoteConfig.showMaterialColumns ? baseStyles.colQtyInst : baseStyles.colQtySimple]}>Кол-во</Text>
                <Text style={[baseStyles.tableColHeader, section.quoteConfig.showMaterialColumns ? baseStyles.colPriceInst : baseStyles.colPriceSimple]}>Цена</Text>
                <Text style={[baseStyles.tableColHeader, section.quoteConfig.showMaterialColumns ? baseStyles.colSumInst : baseStyles.colSumSimple]}>Сумма</Text>
                <Text style={[baseStyles.tableColHeader, baseStyles.colTotal]}>Итого</Text>
              </View>

              {section.specifications.filter(i => !i.isRecommended).map((item, idx) => {
                if (item.isInformational) {
                  return (
                    <View key={`${item.id}-${idx}`} style={baseStyles.sectionHeader} wrap={false}>
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
                const itemTotal = calculateItemSum(item, section.quoteConfig);

                return (
                  <View key={item.id} style={baseStyles.tableRow} wrap={false}>
                    <Text style={[baseStyles.tableCol, baseStyles.colNum, baseStyles.textCenter]}>{idx + 1}</Text>
                    <Text style={[baseStyles.tableCol, section.quoteConfig.showMaterialColumns ? baseStyles.colName : baseStyles.colNameSimple]}>{`${item.name} ${item.brand || ''} ${item.model || ''}`}</Text>
                    <Text style={[baseStyles.tableCol, baseStyles.colUnit, baseStyles.textCenter]}>{item.unit}</Text>
                    {section.quoteConfig.showMaterialColumns && (
                      <>
                        <Text style={[baseStyles.tableCol, baseStyles.colQtyMat, baseStyles.textRight]}>{qtyMaterial}</Text>
                        <Text style={[baseStyles.tableCol, baseStyles.colPriceMat, baseStyles.textRight]}>{priceMaterial.toFixed(2)}</Text>
                        <Text style={[baseStyles.tableCol, baseStyles.colSumMat, baseStyles.textRight]}>{sumMaterial.toFixed(2)}</Text>
                      </>
                    )}
                    <Text style={[baseStyles.tableCol, section.quoteConfig.showMaterialColumns ? baseStyles.colQtyInst : baseStyles.colQtySimple, baseStyles.textRight]}>{qtyInstall}</Text>
                    <Text style={[baseStyles.tableCol, section.quoteConfig.showMaterialColumns ? baseStyles.colPriceInst : baseStyles.colPriceSimple, baseStyles.textRight]}>{priceInstall.toFixed(2)}</Text>
                    <Text style={[baseStyles.tableCol, section.quoteConfig.showMaterialColumns ? baseStyles.colSumInst : baseStyles.colSumSimple, baseStyles.textRight]}>{sumInstall.toFixed(2)}</Text>
                    <Text style={[baseStyles.tableCol, baseStyles.colTotal, baseStyles.textRight]}>{itemTotal.toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={baseStyles.totalsContainer}>
              {section.quoteConfig.showMaterialColumns !== false && (
                <View style={baseStyles.totalRow}>
                  <Text style={baseStyles.totalLabel}>Итого по спецификации:</Text>
                  <Text style={baseStyles.totalValue}>{totals.specItemsTotalSum.toFixed(2)} ₽</Text>
                </View>
              )}
              {section.quoteConfig.includeCommissioning && (
                <View style={baseStyles.totalRow}>
                  <Text style={baseStyles.totalLabel}>Пуско-наладочные работы:</Text>
                  <Text style={baseStyles.totalValue}>{commissioningTotal.toFixed(2)} ₽</Text>
                </View>
              )}
              {section.quoteConfig.includeExecutiveDocumentation && (
                <View style={baseStyles.totalRow}>
                  <Text style={baseStyles.totalLabel}>Исполнительная документация:</Text>
                  <Text style={baseStyles.totalValue}>{(section.quoteConfig.executiveDocumentationTotalCost * section.quoteConfig.executiveDocumentationQuantity).toFixed(2)} ₽</Text>
                </View>
              )}
              {section.quoteConfig.includeMeasurementTrip && (
                <View style={baseStyles.totalRow}>
                  <Text style={baseStyles.totalLabel}>Выезд для замера:</Text>
                  <Text style={baseStyles.totalValue}>{(section.quoteConfig.measurementTripCost * section.quoteConfig.measurementTripQuantity).toFixed(2)} ₽</Text>
                </View>
              )}
              {section.quoteConfig.includeDismantling && (
                <View style={baseStyles.totalRow}>
                  <Text style={baseStyles.totalLabel}>Демонтаж:</Text>
                  <Text style={baseStyles.totalValue}>{section.quoteConfig.dismantlingCost.toFixed(2)} ₽</Text>
                </View>
              )}
              {section.quoteConfig.includeWallDrilling && (
                <View style={baseStyles.totalRow}>
                  <Text style={baseStyles.totalLabel}>Сверление стен:</Text>
                  <Text style={baseStyles.totalValue}>{(section.quoteConfig.wallDrillingCost * section.quoteConfig.wallDrillingCount).toFixed(2)} ₽</Text>
                </View>
              )}
              {section.quoteConfig.includeFloorDrilling && (
                <View style={baseStyles.totalRow}>
                  <Text style={baseStyles.totalLabel}>Сверление перекрытий:</Text>
                  <Text style={baseStyles.totalValue}>{(section.quoteConfig.floorDrillingCost * section.quoteConfig.floorDrillingCount).toFixed(2)} ₽</Text>
                </View>
              )}

              <View style={[baseStyles.totalRow, { borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 5, marginTop: 5 }]}>
                <Text style={baseStyles.totalLabel}>Подытог:</Text>
                <Text style={baseStyles.totalValue}>{totals.subtotalBeforeTax.toFixed(2)} ₽</Text>
              </View>
              {totals.taxLabel && (
                <View style={baseStyles.totalRow}>
                  <Text style={baseStyles.totalLabel}>{totals.taxLabel}</Text>
                  <Text style={baseStyles.totalValue}>{totals.taxAmount.toFixed(2)} ₽</Text>
                </View>
              )}
              <View style={[baseStyles.totalRow, { marginTop: 5, borderTopWidth: 1.5, borderTopColor: '#333', paddingTop: 5 }]}>
                <Text style={baseStyles.finalTotalLabel}>ИТОГО:</Text>
                <Text style={baseStyles.finalTotalValue}>{totals.finalTotal.toFixed(2)} ₽</Text>
              </View>
            </View>

            {(signatureUrl || stampUrl) && showSignature && (
              <View style={{ marginTop: 20, flexDirection: 'row', gap: 16 }}>
                {signatureUrl && <Image src={signatureUrl} style={{ width: 140, height: 70 }} />}
                {stampUrl && showStamp && <Image src={stampUrl} style={{ width: 120, height: 120 }} />}
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
};

export default GroupDocumentTemplate;
