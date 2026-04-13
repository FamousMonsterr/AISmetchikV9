'use server';

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import baseTemplates from '@/lib/quote-templates.json';

export type DocTemplateKind = 'proposal' | 'invoice' | 'contract';
export type UserPlanKey = 'Free' | 'PRO' | 'Business' | 'Enterprise';

export type DocumentTemplate = {
  id: string;
  name: string;
  description?: string;
  docType: DocTemplateKind;
  accentColor?: string;
  headerStyle?: 'standard' | 'compact' | 'modern';
  showSignature?: boolean;
  showStamp?: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string | null;
};

export type DocumentTemplateSettings = {
  defaults: Record<UserPlanKey, Record<DocTemplateKind, string>>;
  availability: Record<'PRO' | 'Business' | 'Enterprise', Record<DocTemplateKind, string[]>>;
};

const templateListFromBase = baseTemplates.map((tpl) => ({
  id: tpl.id,
  name: tpl.name,
  description: tpl.description,
  docType: tpl.docType as DocTemplateKind,
  accentColor: tpl.accentColor,
  headerStyle: tpl.headerStyle as DocumentTemplate['headerStyle'],
  showSignature: tpl.showSignature,
  showStamp: tpl.showStamp,
}));

const TemplateCreateSchema = z.object({
  adminUserId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional().nullable(),
  docType: z.enum(['proposal', 'invoice', 'contract']),
  accentColor: z.string().optional().nullable(),
  headerStyle: z.enum(['standard', 'compact', 'modern']).optional().nullable(),
  showSignature: z.boolean().optional(),
  showStamp: z.boolean().optional(),
});

const TemplateUpdateSchema = z.object({
  adminUserId: z.string().min(1),
  templateId: z.string().min(1),
  updates: z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(240).optional().nullable(),
    docType: z.enum(['proposal', 'invoice', 'contract']).optional(),
    accentColor: z.string().optional().nullable(),
    headerStyle: z.enum(['standard', 'compact', 'modern']).optional().nullable(),
    showSignature: z.boolean().optional(),
    showStamp: z.boolean().optional(),
  }),
});

const TemplateDeleteSchema = z.object({
  adminUserId: z.string().min(1),
  templateId: z.string().min(1),
});

const SettingsSchema = z.object({
  adminUserId: z.string().min(1),
  settings: z.any(),
});

const normalizeTemplates = (templates: any[]): DocumentTemplate[] =>
  templates.map((tpl) => ({
    id: tpl._id || tpl.id,
    name: tpl.name,
    description: tpl.description || '',
    docType: tpl.docType,
    accentColor: tpl.accentColor,
    headerStyle: tpl.headerStyle,
    showSignature: tpl.showSignature,
    showStamp: tpl.showStamp,
    createdAt: tpl.createdAt,
    updatedAt: tpl.updatedAt,
    createdBy: tpl.createdBy || null,
  }));

const isAdmin = async (userId: string) => {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId as any });
  return user?.systemRole === 'Admin' || user?.systemRole === 'Super Admin';
};

const resolveDefaultId = (templates: DocumentTemplate[], docType: DocTemplateKind, fallbackId: string) => {
  return templates.find((tpl) => tpl.id === fallbackId && tpl.docType === docType)?.id
    || templates.find((tpl) => tpl.docType === docType)?.id
    || fallbackId;
};

const buildDefaultSettings = (templates: DocumentTemplate[]): DocumentTemplateSettings => {
  const defaults: Record<UserPlanKey, Record<DocTemplateKind, string>> = {
    Free: {
      proposal: resolveDefaultId(templates, 'proposal', 'base-template-v1'),
      invoice: resolveDefaultId(templates, 'invoice', 'invoice-1c-v1'),
      contract: resolveDefaultId(templates, 'contract', 'contract-base-v1'),
    },
    PRO: {
      proposal: resolveDefaultId(templates, 'proposal', 'base-template-v1'),
      invoice: resolveDefaultId(templates, 'invoice', 'invoice-1c-v1'),
      contract: resolveDefaultId(templates, 'contract', 'contract-base-v1'),
    },
    Business: {
      proposal: resolveDefaultId(templates, 'proposal', 'base-template-v1'),
      invoice: resolveDefaultId(templates, 'invoice', 'invoice-1c-v1'),
      contract: resolveDefaultId(templates, 'contract', 'contract-base-v1'),
    },
    Enterprise: {
      proposal: resolveDefaultId(templates, 'proposal', 'base-template-v1'),
      invoice: resolveDefaultId(templates, 'invoice', 'invoice-1c-v1'),
      contract: resolveDefaultId(templates, 'contract', 'contract-base-v1'),
    },
  };

  const byType = (docType: DocTemplateKind) => templates.filter((tpl) => tpl.docType === docType).map((tpl) => tpl.id);

  const availability = {
    PRO: {
      proposal: byType('proposal'),
      invoice: byType('invoice'),
      contract: byType('contract'),
    },
    Business: {
      proposal: byType('proposal'),
      invoice: byType('invoice'),
      contract: byType('contract'),
    },
    Enterprise: {
      proposal: byType('proposal'),
      invoice: byType('invoice'),
      contract: byType('contract'),
    },
  };

  return { defaults, availability };
};

const normalizeSettings = (settings: any, templates: DocumentTemplate[]): DocumentTemplateSettings => {
  const fallback = buildDefaultSettings(templates);
  if (!settings) return fallback;
  const defaults = settings.defaults || {};
  const availability = settings.availability || {};

  return {
    defaults: {
      Free: { ...fallback.defaults.Free, ...(defaults.Free || {}) },
      PRO: { ...fallback.defaults.PRO, ...(defaults.PRO || {}) },
      Business: { ...fallback.defaults.Business, ...(defaults.Business || {}) },
      Enterprise: { ...fallback.defaults.Enterprise, ...(defaults.Enterprise || {}) },
    },
    availability: {
      PRO: { ...fallback.availability.PRO, ...(availability.PRO || {}) },
      Business: { ...fallback.availability.Business, ...(availability.Business || {}) },
      Enterprise: { ...fallback.availability.Enterprise, ...(availability.Enterprise || {}) },
    },
  };
};

export async function getDocumentTemplatesBundle(): Promise<{ templates: DocumentTemplate[]; settings: DocumentTemplateSettings }> {
  const db = await getDb();
  const templatesRaw = await db.collection('document_templates').find({}).sort({ createdAt: -1 }).toArray();
  const templates = templatesRaw.length ? normalizeTemplates(templatesRaw) : normalizeTemplates(templateListFromBase as any[]);
  const settingsDoc = await db.collection('document_template_settings').findOne({ _id: 'default' as any });
  const settings = normalizeSettings(settingsDoc?.settings, templates);
  return { templates, settings };
}

export async function createDocumentTemplate(data: z.infer<typeof TemplateCreateSchema>) {
  const validation = TemplateCreateSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для шаблона.' };
  }
  if (!(await isAdmin(validation.data.adminUserId))) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  const { adminUserId, name, description, docType, accentColor, headerStyle, showSignature, showStamp } = validation.data;
  const db = await getDb();
  const templateId = nanoid();
  const now = new Date();

  await db.collection('document_templates').insertOne({
    _id: templateId as any,
    name,
    description: description || '',
    docType,
    accentColor: accentColor || null,
    headerStyle: headerStyle || 'standard',
    showSignature: showSignature ?? true,
    showStamp: showStamp ?? true,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUserId,
  });

  return { success: true, templateId, message: 'Шаблон создан.' };
}

export async function updateDocumentTemplate(data: z.infer<typeof TemplateUpdateSchema>) {
  const validation = TemplateUpdateSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для обновления.' };
  }
  if (!(await isAdmin(validation.data.adminUserId))) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  await db.collection('document_templates').updateOne(
    { _id: validation.data.templateId as any },
    { $set: { ...validation.data.updates, updatedAt: new Date() } },
  );

  return { success: true, message: 'Шаблон обновлен.' };
}

export async function deleteDocumentTemplate(data: z.infer<typeof TemplateDeleteSchema>) {
  const validation = TemplateDeleteSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для удаления.' };
  }
  if (!(await isAdmin(validation.data.adminUserId))) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  await db.collection('document_templates').deleteOne({ _id: validation.data.templateId as any });
  return { success: true, message: 'Шаблон удален.' };
}

export async function updateDocumentTemplateSettings(data: z.infer<typeof SettingsSchema>) {
  const validation = SettingsSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  if (!(await isAdmin(validation.data.adminUserId))) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  const db = await getDb();
  await db.collection('document_template_settings').updateOne(
    { _id: 'default' as any },
    { $set: { settings: validation.data.settings, updatedAt: new Date(), updatedBy: validation.data.adminUserId } },
    { upsert: true },
  );

  return { success: true, message: 'Настройки шаблонов сохранены.' };
}
