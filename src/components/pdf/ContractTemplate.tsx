// @ts-nocheck
// src/components/pdf/ContractTemplate.tsx
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Company, LegalEntity, SpecificationItem, QuoteConfig } from '@/contexts/AppContext';
import { calculateItemSum } from '@/lib/calculation';
import { getTemplateConfig } from '@/lib/document-constructor';

// Font Registration
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Montserrat-Bold.ttf', fontWeight: 'bold' },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Montserrat',
    fontSize: 10,
    padding: 50,
    color: '#000',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    fontSize: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  paragraph: {
    marginBottom: 5,
    textAlign: 'justify',
    lineHeight: 1.5,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2'
  },
  tableColHeader: {
    backgroundColor: '#f2f2f2',
    padding: 4,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#bfbfbf',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCol: {
    padding: 4,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#bfbfbf',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
  },
  bold: {
      fontWeight: 'bold',
  }
});

// Component Props
interface ContractTemplateProps {
  contractNumber: string;
  contractDate: Date;
  contractor: LegalEntity;
  client: Company;
  objectAddress: string;
  totalAmount: number;
  advanceAmount: number;
  workStartDate: Date;
  workEndDate: Date;
  specifications: SpecificationItem[];
  quoteConfig: QuoteConfig;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  templateId?: string;
  appendices?: {
    title: string;
    projectName: string;
    specifications: SpecificationItem[];
    quoteConfig: QuoteConfig;
  }[];
}

// A very simplified number to words for demonstration purposes.
const numberToWordsRu = (num: number): string => {
  const roundedNum = Math.floor(num);
  return roundedNum.toLocaleString('ru-RU');
};

const ContractTemplate = ({
  contractNumber,
  contractDate,
  contractor,
  client,
  objectAddress,
  totalAmount,
  advanceAmount,
  workStartDate,
  workEndDate,
  specifications,
  quoteConfig,
  signatureUrl,
  stampUrl,
  templateId,
  appendices,
}: ContractTemplateProps) => {
  const tpl = getTemplateConfig(templateId || 'contract-base-v1');
  const accentColor = tpl?.accentColor || '#0f172a';
  const isModern = tpl?.headerStyle === 'modern' || templateId === 'contract-modern-v1';

  const pageStyle = [
    styles.page,
    isModern && { padding: 40, backgroundColor: '#f8fafc' },
  ];

  const appendixPages = appendices && appendices.length > 0 ? appendices : null;

  return (
  <Document>
    <Page size="A4" style={pageStyle}>
      <Text style={[styles.title, isModern && { color: accentColor }]}>ДОГОВОР ПОДРЯДА № {contractNumber}</Text>
      
      <View style={styles.headerRow}>
        <Text>{client.legalAddress || 'г. ____________'}</Text>
        <Text>{format(contractDate, 'd MMMM yyyy г.', { locale: ru })}</Text>
      </View>

      <Text style={[styles.paragraph, isModern && { color: '#111' }]}>
        {client.fullName || client.name}, именуемое в дальнейшем «Заказчик», в лице {client.ceoName || '____________'}, действующего на основании {client.ceoBasis || '____________'}, с одной стороны, и {contractor.name}, именуемое в дальнейшем «Подрядчик», в лице {contractor.ceoName}, действующего на основании {contractor.ceoBasis || 'Свидетельства о государственной регистрации'}, с другой стороны, заключили настоящий Договор о нижеследующем:
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Предмет Договора</Text>
        <Text style={styles.paragraph}>
          1.1. Подрядчик обязуется выполнить по заданию Заказчика комплекс работ по монтажу и пуско-наладке слаботочных систем (далее – «Работы») на объекте, расположенном по адресу: {objectAddress}, в соответствии с Приложением №1 (Спецификация), являющимся неотъемлемой частью настоящего Договора, а Заказчик обязуется принять результат Работ и оплатить его.
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Стоимость Работ и порядок расчетов</Text>
        <Text style={styles.paragraph}>2.1. Общая стоимость Работ по настоящему Договору составляет {totalAmount.toLocaleString('ru-RU')} ({numberToWordsRu(totalAmount)}) рублей, НДС не облагается.</Text>
        <Text style={styles.paragraph}>2.2. Заказчик выплачивает Подрядчику аванс в размере {advanceAmount.toLocaleString('ru-RU')} рублей в течение 3 (трех) банковских дней с момента подписания настоящего Договора.</Text>
        <Text style={styles.paragraph}>2.3. Окончательный расчет производится в течение 5 (пяти) банковских дней после подписания Акта сдачи-приемки выполненных работ.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Сроки выполнения Работ</Text>
        <Text style={styles.paragraph}>3.1. Срок начала Работ: {format(workStartDate, 'dd.MM.yyyy')}.</Text>
        <Text style={styles.paragraph}>3.2. Срок окончания Работ: {format(workEndDate, 'dd.MM.yyyy')}.</Text>
      </View>
      
      <View style={{flexGrow: 1}} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Реквизиты и подписи Сторон</Text>
      </View>

      <View style={styles.signatureSection}>
        <View style={styles.signatureBlock}>
          <Text style={styles.bold}>ЗАКАЗЧИК:</Text>
          <Text>{client.fullName || client.name}</Text>
          <Text>ИНН: {client.inn}</Text>
          <Text style={{marginTop: 30}}>________________ / {client.ceoName || '____________'} /</Text>
        </View>
        <View style={styles.signatureBlock}>
          <Text style={styles.bold}>ПОДРЯДЧИК:</Text>
          <Text>{contractor.name}</Text>
          <Text>ИНН: {contractor.inn}</Text>
          {tpl?.showSignature !== false && signatureUrl ? (
            <Image src={signatureUrl} style={{ width: 140, height: 70, marginTop: 10 }} />
          ) : (
            <Text style={{marginTop: 30}}>________________ / {contractor.ceoName} /</Text>
          )}
          {tpl?.showStamp !== false && stampUrl && <Image src={stampUrl} style={{ width: 120, height: 120, marginTop: 8 }} />}
        </View>
      </View>
    </Page>

    {appendixPages ? (
      appendixPages.map((appendix, index) => (
        <Page key={`${appendix.projectName}-${index}`} size="A4" style={styles.page}>
          <Text style={styles.title}>{appendix.title} к Договору подряда № {contractNumber}</Text>
          <Text style={{textAlign: 'center', marginBottom: 8}}>Спецификация оборудования и работ</Text>
          <Text style={{textAlign: 'center', marginBottom: 16}}>Проект: {appendix.projectName}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow} fixed>
              <Text style={[styles.tableColHeader, {width: '5%'}]}>№</Text>
              <Text style={[styles.tableColHeader, {width: '55%'}]}>Наименование</Text>
              <Text style={[styles.tableColHeader, {width: '10%'}]}>Кол-во</Text>
              <Text style={[styles.tableColHeader, {width: '10%'}]}>Ед.</Text>
              <Text style={[styles.tableColHeader, {width: '20%', borderRightWidth: 0}]}>Сумма</Text>
            </View>
            {appendix.specifications.filter(i => !i.isInformational).map((item, rowIndex) => (
              <View key={item.id} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableCol, {width: '5%', textAlign: 'center'}]}>{rowIndex + 1}</Text>
                <Text style={[styles.tableCol, {width: '55%'}]}>{`${item.name} ${item.brand || ''} ${item.model || ''}`}</Text>
                <Text style={[styles.tableCol, {width: '10%', textAlign: 'center'}]}>{item.quantityToInstall}</Text>
                <Text style={[styles.tableCol, {width: '10%', textAlign: 'center'}]}>{item.unit}</Text>
                <Text style={[styles.tableCol, {width: '20%', textAlign: 'right', borderRightWidth: 0}]}>{calculateItemSum(item, appendix.quoteConfig).toLocaleString('ru-RU')}</Text>
              </View>
            ))}
          </View>
        </Page>
      ))
    ) : (
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Приложение №1 к Договору подряда № {contractNumber}</Text>
        <Text style={{textAlign: 'center', marginBottom: 20}}>Спецификация оборудования и работ</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            <Text style={[styles.tableColHeader, {width: '5%'}]}>№</Text>
            <Text style={[styles.tableColHeader, {width: '55%'}]}>Наименование</Text>
            <Text style={[styles.tableColHeader, {width: '10%'}]}>Кол-во</Text>
            <Text style={[styles.tableColHeader, {width: '10%'}]}>Ед.</Text>
            <Text style={[styles.tableColHeader, {width: '20%', borderRightWidth: 0}]}>Сумма</Text>
          </View>
          {specifications.filter(i => !i.isInformational).map((item, index) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCol, {width: '5%', textAlign: 'center'}]}>{index + 1}</Text>
              <Text style={[styles.tableCol, {width: '55%'}]}>{`${item.name} ${item.brand || ''} ${item.model || ''}`}</Text>
              <Text style={[styles.tableCol, {width: '10%', textAlign: 'center'}]}>{item.quantityToInstall}</Text>
              <Text style={[styles.tableCol, {width: '10%', textAlign: 'center'}]}>{item.unit}</Text>
              <Text style={[styles.tableCol, {width: '20%', textAlign: 'right', borderRightWidth: 0}]}>{calculateItemSum(item, quoteConfig).toLocaleString('ru-RU')}</Text>
            </View>
          ))}
        </View>
      </Page>
    )}
  </Document>
);

};

export default ContractTemplate;
