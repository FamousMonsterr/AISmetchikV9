import type { Company, SpecificationItem, QuoteConfig } from '@/contexts/AppContext';
import templateCatalog from '@/lib/quote-templates.json';

export type DocTemplateKind = 'proposal' | 'invoice' | 'contract';

export type ConstructorTemplateConfig = {
  id: string;
  name: string;
  description?: string;
  docType: DocTemplateKind;
  status: 'free' | 'pro' | 'business';
  accentColor?: string;
  headerStyle?: 'standard' | 'compact' | 'modern';
  showStamp?: boolean;
  showSignature?: boolean;
};

export type PreviewData = {
  contractor: Company;
  client: Company;
  specifications: SpecificationItem[];
  quoteConfig: QuoteConfig;
  objectName: string;
};

export const templateMap: Record<string, ConstructorTemplateConfig> = Object.fromEntries(
  templateCatalog.map((tpl) => [
    tpl.id,
    {
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      docType: tpl.docType as DocTemplateKind,
      status: (tpl.status as 'free' | 'pro' | 'business') ?? 'free',
      accentColor: tpl.accentColor,
      headerStyle: tpl.headerStyle as ConstructorTemplateConfig['headerStyle'],
      showStamp: tpl.showStamp,
      showSignature: tpl.showSignature,
    },
  ]),
);

export const getTemplateConfig = (id: string | undefined | null): ConstructorTemplateConfig | null => {
  if (!id) return null;
  return templateMap[id] || null;
};

export const getTemplatesByType = (docType: DocTemplateKind, allowed: Array<'free' | 'pro' | 'business'>) =>
  templateCatalog.filter((tpl) => tpl.docType === docType && allowed.includes(tpl.status as any));

export const demoPreviewData: PreviewData = {
  contractor: {
    id: 'contractor-demo',
    userId: 'demo',
    isDefault: true,
    name: 'ООО "Демо Подрядчик"',
    type: 'LLC',
    taxSystem: 'usn',
    isClient: false,
    inn: '7701234567',
    kpp: '770101001',
    legalAddress: 'г. Москва, ул. Примерная, д. 1',
    checkingAccount: '40702810000000000001',
    correspondentAccount: '30101810400000000225',
    bankName: 'ПАО Банк Демо',
    bik: '044525225',
    ceoName: 'Иванов И.И.',
    ceoBasis: 'Устава',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  client: {
    id: 'client-demo',
    userId: 'demo',
    isDefault: true,
    name: 'ООО "Демо Заказчик"',
    type: 'LLC',
    taxSystem: 'usn',
    isClient: true,
    inn: '7723456789',
    kpp: '772301001',
    legalAddress: 'г. Москва, ул. Клиентская, д. 2',
    checkingAccount: '40702810000000000002',
    correspondentAccount: '30101810400000000225',
    bankName: 'ПАО Банк Клиент',
    bik: '044525225',
    ceoName: 'Петров П.П.',
    ceoBasis: 'Доверенности',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  specifications: [
    {
      id: 'spec-1',
      name: 'Камера наблюдения',
      model: 'DemoCam 4MP',
      brand: 'DemoVision',
      quantityToInstall: 8,
      quantityReserve: 1,
      unit: 'шт',
      isInformational: false,
      isRecommended: false,
      status: 'Утверждено',
      materialPrice: 9500,
      installationPrice: 2500,
    },
    {
      id: 'spec-2',
      name: 'Видеорегистратор',
      model: 'DemoRec 16ch',
      brand: 'DemoVision',
      quantityToInstall: 1,
      quantityReserve: 0,
      unit: 'шт',
      isInformational: false,
      isRecommended: false,
      status: 'Утверждено',
      materialPrice: 32000,
      installationPrice: 5000,
    },
  ] as SpecificationItem[],
  quoteConfig: {
    taxType: 'none',
    includeCommissioning: true,
    commissioningCost: 15000,
    commissioningQuantity: 1,
    includeExecutiveDocumentation: false,
    executiveDocumentationTotalCost: 0,
    executiveDocumentationQuantity: 0,
    includeMeasurementTrip: false,
    measurementTripCost: 0,
    measurementTripQuantity: 0,
    includeDismantling: false,
    dismantlingCost: 0,
    includeWallDrilling: false,
    wallDrillingCount: 0,
    wallDrillingCost: 0,
    includeFloorDrilling: false,
    floorDrillingCount: 0,
    floorDrillingCost: 0,
    showMaterialColumns: true,
  },
  objectName: 'Офисное помещение, 450 м²',
};
