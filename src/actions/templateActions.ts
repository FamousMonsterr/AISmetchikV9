// src/actions/templateActions.ts
'use server';

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import { logUserAction } from '@/lib/logger';
import { CUSTOM_TEMPLATE_PREFIX, getTemplateLimitForPlan, normalizeHexColor, type TemplateHeaderStyle } from '@/lib/template-utils';

const TemplateCreateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(80),
  docType: z.enum(['proposal']),
  description: z.string().max(240).optional().nullable(),
  accentColor: z.string().optional().nullable(),
  headerStyle: z.enum(['standard', 'compact', 'modern']).optional().nullable(),
  showSignature: z.boolean().optional(),
  showStamp: z.boolean().optional(),
});

const TemplateUpdateSchema = z.object({
  userId: z.string().min(1),
  templateId: z.string().min(1),
  updates: z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(240).optional().nullable(),
    accentColor: z.string().optional().nullable(),
    headerStyle: z.enum(['standard', 'compact', 'modern']).optional().nullable(),
    showSignature: z.boolean().optional(),
    showStamp: z.boolean().optional(),
  }),
});

const TemplateDeleteSchema = z.object({
  userId: z.string().min(1),
  templateId: z.string().min(1),
});

const sanitizeHeaderStyle = (value?: string | null): TemplateHeaderStyle => {
  if (value === 'compact' || value === 'modern') return value;
  return 'standard';
};

const buildTemplateId = () => `${CUSTOM_TEMPLATE_PREFIX}${nanoid(10)}`;

export async function createUserTemplate(data: z.infer<typeof TemplateCreateSchema>): Promise<{ success: boolean; templateId?: string; message: string }> {
  const validation = TemplateCreateSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для шаблона.' };
  }

  const { userId, name, docType, description, accentColor, headerStyle, showSignature, showStamp } = validation.data;
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId as any });
  if (!user) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  const plan = user.plan || 'Free';
  const limit = getTemplateLimitForPlan(plan);
  if (limit <= 0) {
    return { success: false, message: 'Конструктор доступен только на PRO и выше.' };
  }

  const existingCount = await db.collection('user_templates').countDocuments({ userId, docType });
  if (existingCount >= limit) {
    return { success: false, message: `Достигнут лимит: ${limit} шаблон(ов).` };
  }

  const templateId = buildTemplateId();
  const now = new Date();
  const sanitizedColor = normalizeHexColor(accentColor);

  await db.collection('user_templates').insertOne({
    _id: templateId as any,
    userId,
    name,
    docType,
    description: description || '',
    accentColor: sanitizedColor,
    headerStyle: sanitizeHeaderStyle(headerStyle),
    showSignature: showSignature ?? true,
    showStamp: showStamp ?? true,
    createdAt: now,
    updatedAt: now,
  });

  await logUserAction(userId, 'TEMPLATE_CREATED', { templateId, docType, plan });
  return { success: true, templateId, message: 'Шаблон создан.' };
}

export async function updateUserTemplate(data: z.infer<typeof TemplateUpdateSchema>): Promise<{ success: boolean; message: string }> {
  const validation = TemplateUpdateSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для обновления.' };
  }

  const { userId, templateId, updates } = validation.data;
  const db = await getDb();
  const existing = await db.collection('user_templates').findOne({ _id: templateId as any, userId });
  if (!existing) {
    return { success: false, message: 'Шаблон не найден.' };
  }

  const payload: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (typeof updates.name === 'string') payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description || '';
  if (updates.accentColor !== undefined) payload.accentColor = normalizeHexColor(updates.accentColor);
  if (updates.headerStyle !== undefined) payload.headerStyle = sanitizeHeaderStyle(updates.headerStyle);
  if (typeof updates.showSignature === 'boolean') payload.showSignature = updates.showSignature;
  if (typeof updates.showStamp === 'boolean') payload.showStamp = updates.showStamp;

  await db.collection('user_templates').updateOne({ _id: templateId as any, userId }, { $set: payload });
  await logUserAction(userId, 'TEMPLATE_UPDATED', { templateId });

  return { success: true, message: 'Шаблон обновлен.' };
}

export async function deleteUserTemplate(data: z.infer<typeof TemplateDeleteSchema>): Promise<{ success: boolean; message: string }> {
  const validation = TemplateDeleteSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для удаления.' };
  }

  const { userId, templateId } = validation.data;
  const db = await getDb();
  const existing = await db.collection('user_templates').findOne({ _id: templateId as any, userId });
  if (!existing) {
    return { success: false, message: 'Шаблон не найден.' };
  }

  await db.collection('user_templates').deleteOne({ _id: templateId as any, userId });

  const user = await db.collection('users').findOne({ _id: userId as any });
  if (user?.documentTemplates?.proposal === templateId) {
    await db.collection('users').updateOne(
      { _id: userId as any },
      { $set: { 'documentTemplates.proposal': 'base-template-v1', updatedAt: new Date() } },
    );
  }

  await logUserAction(userId, 'TEMPLATE_DELETED', { templateId });
  return { success: true, message: 'Шаблон удален.' };
}
