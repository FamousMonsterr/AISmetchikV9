'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where, doc, updateDoc } from '@/lib/db-server';
import { getDb } from '@/lib/mongodb';

export type ServiceRequestType =
  | 'plan_upgrade'
  | 'estimate_department'
  | 'crm_connector'
  | 's3_storage'
  | 'partner_status';

export type ServiceRequestStatus = 'new' | 'in_progress' | 'approved' | 'rejected';

const CreateRequestSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  type: z.enum(['plan_upgrade', 'estimate_department', 'crm_connector', 's3_storage', 'partner_status']),
  payload: z.record(z.string(), z.any()).optional(),
});

const GetRequestsSchema = z.object({
  adminUserId: z.string().min(1),
  status: z.enum(['new', 'in_progress', 'approved', 'rejected']).optional(),
  type: z.enum(['plan_upgrade', 'estimate_department', 'crm_connector', 's3_storage', 'partner_status']).optional(),
});

const UpdateStatusSchema = z.object({
  adminUserId: z.string().min(1),
  requestId: z.string().min(1),
  status: z.enum(['new', 'in_progress', 'approved', 'rejected']),
});

async function isAdmin(userId: string) {
  const dbClient = await getDb();
  const user = await dbClient.collection('users').findOne({ _id: userId as any });
  return user?.systemRole === 'Admin' || user?.systemRole === 'Super Admin';
}

export async function createServiceRequest(data: z.infer<typeof CreateRequestSchema>) {
  const validation = CreateRequestSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для заявки.' };
  }

  const payload = validation.data.payload || {};
  await addDoc(collection(db, 'service_requests'), {
    ...validation.data,
    payload,
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true, message: 'Заявка отправлена.' };
}

export async function getServiceRequests(data: z.infer<typeof GetRequestsSchema>) {
  const validation = GetRequestsSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные параметры.', requests: [] as any[] };
  }
  const { adminUserId, status, type } = validation.data;
  if (!(await isAdmin(adminUserId))) {
    return { success: false, message: 'Недостаточно прав.', requests: [] as any[] };
  }

  const filters = [];
  if (status) filters.push(where('status', '==', status));
  if (type) filters.push(where('type', '==', type));
  const q = query(collection(db, 'service_requests'), ...filters, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return { success: true, requests: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) };
}

export async function updateServiceRequestStatus(data: z.infer<typeof UpdateStatusSchema>) {
  const validation = UpdateStatusSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  const { adminUserId, requestId, status } = validation.data;
  if (!(await isAdmin(adminUserId))) {
    return { success: false, message: 'Недостаточно прав.' };
  }

  await updateDoc(doc(db, 'service_requests', requestId), {
    status,
    updatedAt: serverTimestamp(),
    handledBy: adminUserId,
  });

  return { success: true, message: 'Статус обновлен.' };
}
