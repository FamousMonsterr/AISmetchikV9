// @ts-nocheck
// src/components/pdf/ActTemplate.tsx
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Company, SpecificationItem, QuoteConfig } from '@/contexts/AppContext';
import { calculateItemSum } from '@/lib/calculation';

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Montserrat-Bold.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Montserrat',
    fontSize: 9,
    padding: 40,
    color: '#000',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 12,
  },
  section: {
    marginBottom: 10,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCol: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#000',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  signatureSection: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
  },
  bold: { fontWeight: 'bold' },
});

interface ActSection {
  projectName: string;
  specifications: SpecificationItem[];
  quoteConfig: QuoteConfig;
  totals: { finalTotal: number };
}

interface ActTemplateProps {
  contractor: Company;
  client: Company;
  sections: ActSection[];
  contractNumber?: string;
  contractDate?: string | Date;
}

const formatContractDate = (value?: string | Date) => {
  if (!value) return '___';
  if (value instanceof Date) return format(value, 'dd.MM.yyyy');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'dd.MM.yyyy');
};

const ActTemplate = ({ contractor, client, sections, contractNumber, contractDate }: ActTemplateProps) => {
  return (
    <Document>
      {sections.map((section, index) => {
        const rows = section.specifications.filter(item => !item.isInformational);
        const total = section.totals?.finalTotal ?? 0;

        return (
          <Page key={`${section.projectName}-${index}`} size="A4" style={styles.page}>
            <Text style={styles.title}>Акт выполненных работ</Text>
            <Text style={styles.subtitle}>
              Договор № {contractNumber || '___'} от {formatContractDate(contractDate)}
            </Text>

            <View style={styles.section}>
              <Text>Объект: {section.projectName}</Text>
              <Text>Исполнитель: {contractor.fullName || contractor.name}</Text>
              <Text>Заказчик: {client.fullName || client.name}</Text>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeaderRow} fixed>
                <Text style={[styles.tableColHeader, { width: '5%' }]}>№</Text>
                <Text style={[styles.tableColHeader, { width: '55%' }]}>Наименование работ</Text>
                <Text style={[styles.tableColHeader, { width: '10%' }]}>Кол-во</Text>
                <Text style={[styles.tableColHeader, { width: '10%' }]}>Ед.</Text>
                <Text style={[styles.tableColHeader, { width: '20%', borderRightWidth: 0 }]}>Сумма</Text>
              </View>
              {rows.map((item, rowIndex) => (
                <View key={item.id} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableCol, { width: '5%', textAlign: 'center' }]}>{rowIndex + 1}</Text>
                  <Text style={[styles.tableCol, { width: '55%' }]}>{`${item.name} ${item.brand || ''} ${item.model || ''}`}</Text>
                  <Text style={[styles.tableCol, { width: '10%', textAlign: 'center' }]}>{item.quantityToInstall}</Text>
                  <Text style={[styles.tableCol, { width: '10%', textAlign: 'center' }]}>{item.unit}</Text>
                  <Text style={[styles.tableCol, { width: '20%', textAlign: 'right', borderRightWidth: 0 }]}>{calculateItemSum(item, section.quoteConfig).toLocaleString('ru-RU')}</Text>
                </View>
              ))}
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.bold}>Итого:</Text>
              <Text style={styles.bold}>{total.toLocaleString('ru-RU')} ₽</Text>
            </View>

            <View style={styles.signatureSection}>
              <View style={styles.signatureBlock}>
                <Text style={styles.bold}>Заказчик</Text>
                <Text>________________ / {client.ceoName || '____________'} /</Text>
              </View>
              <View style={styles.signatureBlock}>
                <Text style={styles.bold}>Исполнитель</Text>
                <Text>________________ / {contractor.ceoName || '____________'} /</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default ActTemplate;
