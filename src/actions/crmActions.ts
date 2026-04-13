// @ts-nocheck
'use server';

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

type CrmRole = 'manager' | 'team_lead' | 'admin';
type DealStatus = 'new' | 'qualified' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed_lost';
type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

function isCrmRoleAllowed(user: any) {
  return (
    user?.systemRole === 'Admin' ||
    user?.systemRole === 'Super Admin' ||
    user?.crmRole === 'manager' ||
    user?.crmRole === 'team_lead' ||
    user?.crmRole === 'admin'
  );
}

async function requireCrmActor(): Promise<{ userId: string; role: CrmRole | 'super_admin'; user: any }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new Error('Требуется аутентификация.');

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: userId as any });
  if (!isCrmRoleAllowed(user)) {
    throw new Error('Недостаточно прав CRM.');
  }

  if (user?.systemRole === 'Super Admin') return { userId, role: 'super_admin', user };
  if (user?.systemRole === 'Admin') return { userId, role: 'admin', user };
  return { userId, role: (user?.crmRole as CrmRole) || 'manager', user };
}

function computeSlaDates(createdAt: Date, firstResponseMinutes = 60, resolutionHours = 24) {
  const firstResponseDueAt = new Date(createdAt.getTime() + firstResponseMinutes * 60_000);
  const resolutionDueAt = new Date(createdAt.getTime() + resolutionHours * 3_600_000);
  return { firstResponseDueAt, resolutionDueAt };
}

const UpdateDealSchema = z.object({
  dealId: z.string().min(1),
  status: z.enum(['new', 'qualified', 'in_progress', 'waiting_client', 'resolved', 'closed_lost']).optional(),
  managerId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  note: z.string().max(3000).optional(),
});

const CreateTaskSchema = z.object({
  dealId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().max(3000).optional(),
  assigneeId: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dueAt: z.string().datetime().optional(),
});

const UpdateTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'done', 'cancelled']),
});

const UpsertRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(100),
  enabled: z.boolean().default(true),
  trigger: z.enum(['service_request_created', 'support_message_created', 'sla_breach']),
  config: z.record(z.any()).default({}),
});

async function appendActivity(db: any, payload: any) {
  await db.collection('crm_activity_log').insertOne({
    _id: nanoid(),
    ...payload,
    createdAt: new Date(),
  });
}

export async function syncServiceRequestsToDeals(): Promise<{ success: boolean; message: string; synced?: number }> {
  const actor = await requireCrmActor();
  const db = await getDb();
  const requests = await db.collection('service_requests').find({}).sort({ createdAt: -1 }).toArray();
  let synced = 0;

  for (const request of requests) {
    const existing = await db.collection('crm_deals').findOne({ sourceRequestId: request._id });
    if (existing) continue;

    const createdAt = request.createdAt ? new Date(request.createdAt) : new Date();
    const { firstResponseDueAt, resolutionDueAt } = computeSlaDates(createdAt);
    await db.collection('crm_deals').insertOne({
      _id: nanoid(),
      sourceRequestId: request._id,
      type: request.type || 'unknown',
      userId: request.userId || null,
      userName: request.userName || null,
      userEmail: request.userEmail || null,
      status: 'new',
      priority: 'medium',
      managerId: request.handledBy || null,
      title: `Заявка ${request.type || 'service'}`,
      description: request.payload?.comment || '',
      firstResponseAt: null,
      firstResponseDueAt,
      resolutionDueAt,
      resolvedAt: null,
      createdAt,
      updatedAt: new Date(),
    });
    synced += 1;
  }

  await appendActivity(db, {
    type: 'sync_service_requests',
    actorId: actor.userId,
    meta: { synced },
  });

  return { success: true, message: `Синхронизировано сделок: ${synced}.`, synced };
}

export async function getCrmWorkspaceData(): Promise<{
  success: boolean;
  message?: string;
  actor?: { id: string; role: string; email?: string | null };
  deals?: any[];
  tasks?: any[];
  activity?: any[];
  slaEvents?: any[];
  rules?: any[];
  metrics?: Record<string, number>;
}> {
  const actor = await requireCrmActor();
  const db = await getDb();

  const [deals, tasks, activity, slaEvents, rules] = await Promise.all([
    db.collection('crm_deals').find({}).sort({ updatedAt: -1 }).limit(400).toArray(),
    db.collection('crm_tasks').find({}).sort({ updatedAt: -1 }).limit(400).toArray(),
    db.collection('crm_activity_log').find({}).sort({ createdAt: -1 }).limit(300).toArray(),
    db.collection('crm_sla_events').find({}).sort({ createdAt: -1 }).limit(200).toArray(),
    db.collection('crm_automation_rules').find({}).sort({ createdAt: -1 }).toArray(),
  ]);

  const metrics = deals.reduce(
    (acc, deal) => {
      const key = String(deal.status || 'new');
      acc.total += 1;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  return {
    success: true,
    actor: { id: actor.userId, role: actor.role, email: actor.user?.email || null },
    deals,
    tasks,
    activity,
    slaEvents,
    rules,
    metrics,
  };
}

export async function updateCrmDeal(data: z.infer<typeof UpdateDealSchema>): Promise<{ success: boolean; message: string }> {
  const actor = await requireCrmActor();
  const parsed = UpdateDealSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Неверные данные сделки.' };

  const db = await getDb();
  const deal = await db.collection('crm_deals').findOne({ _id: parsed.data.dealId });
  if (!deal) return { success: false, message: 'Сделка не найдена.' };

  const update: Record<string, any> = { updatedAt: new Date() };
  if (parsed.data.status) {
    update.status = parsed.data.status;
    if (!deal.firstResponseAt && ['qualified', 'in_progress', 'waiting_client', 'resolved'].includes(parsed.data.status)) {
      update.firstResponseAt = new Date();
    }
    if (parsed.data.status === 'resolved') {
      update.resolvedAt = new Date();
    }
  }
  if (parsed.data.managerId) update.managerId = parsed.data.managerId;
  if (parsed.data.priority) update.priority = parsed.data.priority;

  await db.collection('crm_deals').updateOne({ _id: parsed.data.dealId }, { $set: update });

  await appendActivity(db, {
    type: 'deal_updated',
    actorId: actor.userId,
    dealId: parsed.data.dealId,
    meta: parsed.data,
  });

  if (parsed.data.note) {
    await db.collection('crm_activity_log').insertOne({
      _id: nanoid(),
      type: 'deal_note',
      actorId: actor.userId,
      dealId: parsed.data.dealId,
      note: parsed.data.note,
      createdAt: new Date(),
    });
  }

  return { success: true, message: 'Сделка обновлена.' };
}

export async function createCrmTask(data: z.infer<typeof CreateTaskSchema>): Promise<{ success: boolean; message: string }> {
  const actor = await requireCrmActor();
  const parsed = CreateTaskSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Неверные данные задачи.' };

  const db = await getDb();
  const now = new Date();
  await db.collection('crm_tasks').insertOne({
    _id: nanoid(),
    ...parsed.data,
    status: 'open',
    createdBy: actor.userId,
    createdAt: now,
    updatedAt: now,
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
  });

  await appendActivity(db, {
    type: 'task_created',
    actorId: actor.userId,
    dealId: parsed.data.dealId,
    meta: { title: parsed.data.title, assigneeId: parsed.data.assigneeId, priority: parsed.data.priority },
  });

  return { success: true, message: 'Задача создана.' };
}

export async function updateCrmTaskStatus(data: z.infer<typeof UpdateTaskSchema>): Promise<{ success: boolean; message: string }> {
  const actor = await requireCrmActor();
  const parsed = UpdateTaskSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Неверные данные задачи.' };

  const db = await getDb();
  const task = await db.collection('crm_tasks').findOne({ _id: parsed.data.taskId });
  if (!task) return { success: false, message: 'Задача не найдена.' };

  await db.collection('crm_tasks').updateOne(
    { _id: parsed.data.taskId },
    {
      $set: {
        status: parsed.data.status,
        updatedAt: new Date(),
        doneAt: parsed.data.status === 'done' ? new Date() : null,
      },
    }
  );

  await appendActivity(db, {
    type: 'task_status_changed',
    actorId: actor.userId,
    dealId: task.dealId,
    taskId: parsed.data.taskId,
    meta: { status: parsed.data.status },
  });

  return { success: true, message: 'Статус задачи обновлен.' };
}

export async function upsertCrmAutomationRule(data: z.infer<typeof UpsertRuleSchema>): Promise<{ success: boolean; message: string; id?: string }> {
  const actor = await requireCrmActor();
  if (actor.role !== 'admin' && actor.role !== 'super_admin') {
    return { success: false, message: 'Недостаточно прав для изменения automation rules.' };
  }

  const parsed = UpsertRuleSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Неверные данные automation rule.' };

  const db = await getDb();
  const id = parsed.data.id || nanoid();
  const now = new Date();
  await db.collection('crm_automation_rules').updateOne(
    { _id: id },
    {
      $set: {
        name: parsed.data.name,
        enabled: parsed.data.enabled,
        trigger: parsed.data.trigger,
        config: parsed.data.config,
        updatedAt: now,
        updatedBy: actor.userId,
      },
      $setOnInsert: { createdAt: now, createdBy: actor.userId },
    },
    { upsert: true }
  );

  await appendActivity(db, {
    type: 'automation_rule_upserted',
    actorId: actor.userId,
    meta: { id, trigger: parsed.data.trigger, enabled: parsed.data.enabled },
  });

  return { success: true, message: 'Automation rule сохранено.', id };
}

export async function runCrmSlaSweep(): Promise<{ success: boolean; message: string; breaches?: number }> {
  const actor = await requireCrmActor();
  const db = await getDb();
  const now = new Date();

  const deals = await db
    .collection('crm_deals')
    .find({ status: { $nin: ['resolved', 'closed_lost'] } })
    .toArray();

  let breaches = 0;
  for (const deal of deals) {
    const firstResponseDueAt = deal.firstResponseDueAt ? new Date(deal.firstResponseDueAt) : null;
    const resolutionDueAt = deal.resolutionDueAt ? new Date(deal.resolutionDueAt) : null;

    if (firstResponseDueAt && !deal.firstResponseAt && now > firstResponseDueAt) {
      await db.collection('crm_sla_events').insertOne({
        _id: nanoid(),
        dealId: deal._id,
        type: 'first_response_breach',
        severity: 'high',
        createdAt: now,
      });
      breaches += 1;
    }
    if (resolutionDueAt && now > resolutionDueAt) {
      await db.collection('crm_sla_events').insertOne({
        _id: nanoid(),
        dealId: deal._id,
        type: 'resolution_breach',
        severity: 'critical',
        createdAt: now,
      });
      breaches += 1;
    }
  }

  await appendActivity(db, {
    type: 'sla_sweep',
    actorId: actor.userId,
    meta: { breaches },
  });

  return { success: true, message: `SLA sweep завершен. Нарушений: ${breaches}.`, breaches };
}
