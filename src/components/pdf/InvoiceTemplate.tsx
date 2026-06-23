// @ts-nocheck
// src/components/pdf/InvoiceTemplate.tsx
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Company, LegalEntity } from '@/contexts/AppContext';
import { getTemplateConfig } from '@/lib/document-constructor';

// --- Font Registration ---
// Use dynamic import for server components, but for client-side PDF generation,
// we need a different approach or ensure fonts are loaded.
// For simplicity, assuming fonts are registered globally in the layout.
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
    padding: 40,
    color: '#000',
  },
  bold: { fontWeight: 'bold' },
  header: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    backgroundColor: '#f2f2f2',
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
  totalsContainer: {
    marginTop: 10,
    alignSelf: 'flex-end',
    width: '60%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 2,
  },
  footerText: {
    fontSize: 8,
    color: '#555',
    marginTop: 20,
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginTop: 30,
    width: '70%',
  }
});


// --- Component Props ---
interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

interface InvoiceTemplateProps {
  invoiceNumber: string;
  invoiceDate: Date;
  seller: LegalEntity;
  buyer: Company;
  items: InvoiceItem[];
  signatureUrl?: string | null;
  stampUrl?: string | null;
  templateId?: string;
}

// --- Number to Words Helper ---
const numberToWordsRu = (num: number): string => {
    // A very simplified version for demonstration. A full library would be needed for production.
    const words = ["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
    return String(num).split('').map(digit => words[parseInt(digit)]).join(' ');
};

const InvoiceTemplate = ({
    invoiceNumber,
    invoiceDate,
    seller,
    buyer,
    items,
    signatureUrl,
    stampUrl,
    templateId = 'invoice-1c-v1',
}: InvoiceTemplateProps) => {
    
    const tpl = getTemplateConfig(templateId);
    const accentColor = tpl?.accentColor || '#0f172a';
    const isModern = tpl?.headerStyle === 'modern' || templateId === 'invoice-modern-v1';
    const isCompact = tpl?.headerStyle === 'compact';
    const showSignature = tpl?.showSignature !== false;
    const showStamp = tpl?.showStamp !== false;
    const styles = isModern || isCompact
      ? {
          ...baseStyles,
          header: { ...baseStyles.header, color: accentColor, fontSize: isCompact ? 13 : 16 },
          page: { ...baseStyles.page, padding: isCompact ? 28 : 32, backgroundColor: isModern ? '#f8fafc' : '#fff' },
          tableHeaderRow: { ...baseStyles.tableHeaderRow, backgroundColor: isCompact ? '#f3f4f6' : '#e2e8f0' },
          section: { ...baseStyles.section, padding: isCompact ? 0 : 6, backgroundColor: isModern ? '#e2e8f0' : '#fff', borderRadius: isModern ? 6 : 0 },
        }
      : baseStyles;

    const totalSum = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const taxAmount = 0; // Assuming no VAT for simplicity for now. Can be extended.
    const finalTotal = totalSum + taxAmount;
    
    // Simple logic for total in words.
    const totalInWords = `${Math.floor(finalTotal)} руб. ${String((finalTotal % 1).toFixed(2)).substring(2)} коп.`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Seller Info */}
                <View style={styles.section}>
                    <Text style={styles.bold}>{seller.name}</Text>
                    <Text>Адрес: {seller.legalAddress}</Text>
                    <Text>ИНН/КПП: {seller.inn}{seller.kpp ? `/${seller.kpp}` : ''}</Text>
                    <Text>Р/с: {seller.checkingAccount} в {seller.bankName}</Text>
                    <Text>К/с: {seller.correspondentAccount}, БИК: {seller.bik}</Text>
                </View>

                <View style={{borderBottomWidth: 2, borderBottomColor: '#000', marginVertical: 10}} />

                {/* Header */}
                <Text style={styles.header}>
                    Счет-оферта № {invoiceNumber} от {format(invoiceDate, 'd MMMM yyyy г.', { locale: ru })}
                </Text>
                
                {/* Buyer Info */}
                <View style={styles.section}>
                    <Text><Text style={styles.bold}>Плательщик:</Text> {buyer.fullName || buyer.name}</Text>
                    <Text><Text style={styles.bold}>Адрес:</Text> {buyer.legalAddress}</Text>
                    <Text><Text style={styles.bold}>ИНН/КПП:</Text> {buyer.inn}{buyer.kpp ? `/${buyer.kpp}` : ''}</Text>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    {/* Headers */}
                    <View style={styles.tableHeaderRow} fixed>
                        <Text style={[styles.tableColHeader, {width: '5%'}]}>№</Text>
                        <Text style={[styles.tableColHeader, {width: '45%'}]}>Товары (работы, услуги)</Text>
                        <Text style={[styles.tableColHeader, {width: '10%'}]}>Кол-во</Text>
                        <Text style={[styles.tableColHeader, {width: '10%'}]}>Ед.</Text>
                        <Text style={[styles.tableColHeader, {width: '15%'}]}>Цена</Text>
                        <Text style={[styles.tableColHeader, {width: '15%', borderRightWidth: 0}]}>Сумма</Text>
                    </View>
                    {/* Items */}
                    {items.map((item, index) => (
                        <View key={index} style={[styles.tableRow, {borderBottomWidth: (index === items.length - 1) ? 0 : 1}]}>
                             <Text style={[styles.tableCol, {width: '5%', textAlign: 'center'}]}>{index + 1}</Text>
                             <Text style={[styles.tableCol, {width: '45%'}]}>{item.name}</Text>
                             <Text style={[styles.tableCol, {width: '10%', textAlign: 'right'}]}>{item.quantity}</Text>
                             <Text style={[styles.tableCol, {width: '10%', textAlign: 'center'}]}>{item.unit}</Text>
                             <Text style={[styles.tableCol, {width: '15%', textAlign: 'right'}]}>{item.price.toFixed(2)}</Text>
                             <Text style={[styles.tableCol, {width: '15%', borderRightWidth: 0, textAlign: 'right'}]}>{(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalsContainer}>
                    <View style={styles.totalRow}><Text>Итого:</Text><Text style={styles.bold}>{totalSum.toFixed(2)}</Text></View>
                    <View style={styles.totalRow}><Text>Без налога (НДС)</Text><Text style={styles.bold}>-</Text></View>
                    <View style={styles.totalRow}><Text style={styles.bold}>Всего к оплате:</Text><Text style={styles.bold}>{finalTotal.toFixed(2)}</Text></View>
                </View>
                
                <Text>Всего наименований {items.length}, на сумму {finalTotal.toFixed(2)} руб.</Text>
                <Text style={styles.bold}>{totalInWords}</Text>

                <View style={{flexGrow: 1}} />

                {/* Footer and Signatures */}
                <View>
                <Text style={styles.footerText}>
                        Настоящий счет является офертой (предложением заключить договор) в соответствии со ст. 435 ГК РФ.
                        Оплата данного счета является акцептом оферты (согласием заключить договор) в соответствии со ст. 438 ГК РФ на условиях, указанных на сайте по адресу: https://montagehub.ru/legal/license.
                        Счет действителен в течение 5 (пяти) банковских дней.
                        Подписывая данный документ, вы даете согласие на подключение к системе ЭДО "Контур.Диадок".
                    </Text>
                     <View style={styles.signatureSection}>
                        <View style={styles.signatureBlock}>
                            <Text style={styles.bold}>Исполнитель</Text>
                             {showSignature && signatureUrl ? (
                                <Image src={signatureUrl} style={{ width: 120, height: 60, marginTop: 10 }} />
                             ) : (
                                <View style={styles.signatureLine} />
                             )}
                             <Text style={{fontSize: 8, textAlign: 'center'}}>({seller.ceoName || seller.name})</Text>
                        </View>
                        <View style={styles.signatureBlock}>
                            <Text style={styles.bold}>Заказчик</Text>
                             <View style={styles.signatureLine} />
                        </View>
                     </View>
                     {showStamp && stampUrl && (
                        <View style={{ marginTop: 10 }}>
                            <Image src={stampUrl} style={{ width: 120, height: 120 }} />
                        </View>
                     )}
                </View>

            </Page>
        </Document>
    );
}

export default InvoiceTemplate;
