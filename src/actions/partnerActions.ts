// src/actions/partnerActions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp, addDoc } from '@/lib/mongoFirestoreServer';
import type { AppUser } from '@/contexts/AppContext';
import { z } from 'zod';

export async function getReferredUsers(partnerId: string): Promise<AppUser[]> {
    if (!partnerId) {
        throw new Error("Необходимо указать ID партнера.");
    }

    try {
        const usersRef = collection(db, 'users');
        // Simplified query to avoid composite index dependency. Sorting will be handled client-side.
        const q = query(usersRef, where('referredBy', '==', partnerId));

        const querySnapshot = await getDocs(q);
        const referredUsers = querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        })) as AppUser[];
        
        // Sort by creation date descending on the server-side logic before returning
        return referredUsers.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));

    } catch (error: any) {
        console.error("Error fetching referred users:", error);
        throw new Error("Не удалось получить список привлеченных пользователей.");
    }
}

export async function agreeToPartnerTerms({ userId }: { userId: string }): Promise<{success: boolean; message: string}> {
    if (!userId) {
        return { success: false, message: "Необходимо указать ID пользователя." };
    }
    
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            isPartner: true,
            partnerStatus: 'Bronze', // Set initial status to Bronze
            partnerTermsAgreedAt: serverTimestamp(),
        });
        return { success: true, message: "Вы успешно стали партнером!" };
    } catch (error: any) {
        console.error("Error agreeing to partner terms:", error);
        return { success: false, message: "Не удалось сохранить ваше согласие. Попробуйте позже." };
    }
}

const HighTierApplicationSchema = z.object({
  userId: z.string().min(1),
  userName: z.string(),
  userEmail: z.string(),
  desiredTier: z.enum(['Gold', 'Platinum']),
});

export const submitHighTierApplication = async (data: z.infer<typeof HighTierApplicationSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = HighTierApplicationSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для заявки.' };
  }

  try {
    await addDoc(collection(db, 'partner_requests'), {
      ...validation.data,
      status: 'new',
      createdAt: serverTimestamp(),
    });
    
    // In a real application, you'd also send a notification to admins here.
    // For now, they will see it in the new admin panel.

    return { success: true, message: 'Ваша заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.' };
  } catch (error) {
    console.error("Error submitting high-tier application:", error);
    return { success: false, message: 'Не удалось отправить заявку. Пожалуйста, попробуйте позже или свяжитесь с поддержкой.' };
  }
};


export const getPartnerRequests = async () => {
    try {
        const q = query(collection(db, 'partner_requests'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            throw new Error("Базе данных требуется время для создания индекса для заявок. Пожалуйста, попробуйте снова через несколько минут.");
        }
        console.error("Error fetching partner requests:", error);
        throw new Error("Не удалось загрузить заявки партнеров.");
    }
};

const UpdateRequestStatusSchema = z.object({
  requestId: z.string(),
  status: z.enum(['new', 'contacted', 'approved', 'rejected']),
});

export const updatePartnerRequestStatus = async (data: z.infer<typeof UpdateRequestStatusSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = UpdateRequestStatusSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные.' };
  }
  try {
    const docRef = doc(db, 'partner_requests', validation.data.requestId);
    await updateDoc(docRef, { status: validation.data.status, updatedAt: serverTimestamp() });
    return { success: true, message: 'Статус заявки обновлен.' };
  } catch (error) {
    console.error("Error updating partner request status:", error);
    return { success: false, message: 'Не удалось обновить статус.' };
  }
}
