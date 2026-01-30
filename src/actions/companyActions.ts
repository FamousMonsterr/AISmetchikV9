// src/actions/companyActions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, getDocs, serverTimestamp, query, where, orderBy, deleteDoc, writeBatch } from '@/lib/mongoFirestoreServer';
import type { Company } from '@/contexts/AppContext';
import { getEnvSettings } from './adminActions';
import axios from 'axios';

// Schema for validating company data - NOW VERY FLEXIBLE
const CompanySchema = z.object({
    userId: z.string().min(1),
    name: z.string().min(2, "Название/ФИО должно содержать не менее 2 символов.").max(100),
    type: z.enum(['LLC', 'IE', 'SelfEmployed']),
    taxSystem: z.enum(['none', 'vat_included', 'vat_added', 'usn']),
    isClient: z.boolean().optional(),
    
    // Optional fields
    isDefault: z.boolean().optional(),
    fullName: z.string().max(255).optional().or(z.literal('')),
    inn: z.string().regex(/^\d{10,12}$/, "ИНН должен состоять из 10 или 12 цифр.").optional().or(z.literal('')),
    kpp: z.string().regex(/^\d{9}$/, "КПП должен состоять из 9 цифр.").optional().or(z.literal('')),
    ogrn: z.string().regex(/^\d{13,15}$/, "ОГРН/ОГРНИП должен состоять из 13 или 15 цифр.").optional().or(z.literal('')),
    legalAddress: z.string().max(255).optional().or(z.literal('')),
    postalAddress: z.string().max(255).optional().or(z.literal('')),
    phone: z.string().max(20).optional().or(z.literal('')),
    email: z.string().email("Неверный формат email.").max(50).optional().or(z.literal('')),
    bankName: z.string().max(100).optional().or(z.literal('')),
    bik: z.string().regex(/^\d{9}$/, "БИК должен состоять из 9 цифр.").optional().or(z.literal('')),
    correspondentAccount: z.string().regex(/^\d{20}$/, "Корр. счет должен состоять из 20 цифр.").optional().or(z.literal('')),
    checkingAccount: z.string().regex(/^\d{20}$/, "Расчетный счет должен состоять из 20 цифр.").optional().or(z.literal('')),
    ceoName: z.string().max(100).optional().or(z.literal('')),
    ceoBasis: z.string().max(50).optional().or(z.literal('')),
});

const normalizeCompanyKey = (name?: string, inn?: string, type?: string) => {
    const cleanInn = (inn || '').replace(/\D/g, '');
    if (cleanInn) return `inn:${cleanInn}`;
    const cleanName = (name || '')
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, '')
        .trim();
    const cleanType = (type || '').toLowerCase();
    return `name:${cleanName}|type:${cleanType}`;
};

// Create
export const addCompany = async (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    const validation = CompanySchema.safeParse(data);
    if (!validation.success) {
        const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, message: firstError || "Неверные данные." };
    }

    try {
        const isClient = validation.data.isClient ?? false;
        const dedupeKey = normalizeCompanyKey(validation.data.name, validation.data.inn, validation.data.type);
        const duplicatesQuery = query(
            collection(db, 'companies'),
            where('userId', '==', validation.data.userId),
        );
        const duplicatesSnapshot = await getDocs(duplicatesQuery);
        const duplicate = duplicatesSnapshot.docs.find(document => {
            const docData = document.data() as Company;
            if ((docData.isClient ?? false) !== isClient) return false;
            return normalizeCompanyKey(docData.name, docData.inn, docData.type) === dedupeKey;
        });
        if (duplicate) {
            return { success: false, message: 'Компания с такими реквизитами уже существует в этой группе.' };
        }
        const companiesCollection = collection(db, 'companies');
        await addDoc(companiesCollection, {
            ...validation.data,
            isClient,
            dedupeKey,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, message: 'Компания успешно добавлена.' };
    } catch (error) {
        console.error("Error adding company:", error);
        return { success: false, message: 'Ошибка при добавлении компании.' };
    }
};

// Update
export const updateCompany = async (companyId: string, data: Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>) => {
     const partialSchema = CompanySchema.partial();
     const validation = partialSchema.safeParse(data);
     if (!validation.success) {
        const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, message: firstError || "Неверные данные." };
    }

    try {
        const companyRef = doc(db, 'companies', companyId);
        const existingSnap = await getDoc(companyRef);
        const existingData = existingSnap.exists() ? (existingSnap.data() as Company) : undefined;
        const mergedData = {
            ...existingData,
            ...validation.data,
        } as Company;
        const isClient = mergedData.isClient ?? false;
        const dedupeKey = normalizeCompanyKey(mergedData.name, mergedData.inn, mergedData.type);
        const duplicatesQuery = query(
            collection(db, 'companies'),
            where('userId', '==', mergedData.userId),
        );
        const duplicatesSnapshot = await getDocs(duplicatesQuery);
        const duplicate = duplicatesSnapshot.docs.find(document => {
            if (document.id === companyId) return false;
            const docData = document.data() as Company;
            if ((docData.isClient ?? false) !== isClient) return false;
            return normalizeCompanyKey(docData.name, docData.inn, docData.type) === dedupeKey;
        });
        if (duplicate) {
            return { success: false, message: 'Компания с такими реквизитами уже существует в этой группе.' };
        }
        await updateDoc(companyRef, {
            ...validation.data,
            isClient,
            dedupeKey,
            updatedAt: serverTimestamp(),
        });
        return { success: true, message: 'Данные компании обновлены.' };
    } catch (error) {
        console.error("Error updating company:", error);
        return { success: false, message: 'Ошибка при обновлении данных.' };
    }
};

// Delete
export const deleteCompany = async (companyId: string) => {
    try {
        await deleteDoc(doc(db, 'companies', companyId));
        return { success: true, message: 'Компания удалена.' };
    } catch (error) {
        console.error("Error deleting company:", error);
        return { success: false, message: 'Ошибка при удалении компании.' };
    }
};

// Set as Default
export const setDefaultCompany = async (userId: string, companyIdToSet: string, isClient: boolean) => {
    try {
        const batch = writeBatch(db);
        const companiesRef = collection(db, 'companies');
        const q = query(companiesRef, where('userId', '==', userId));
        
        const querySnapshot = await getDocs(q);
        
        // Reset all other companies for this user to isDefault: false
        querySnapshot.forEach(document => {
            const docData = document.data() as Company;
            if ((docData.isClient ?? false) !== isClient) return;
            const companyRef = doc(db, 'companies', document.id);
            if (document.id === companyIdToSet) {
                 batch.update(companyRef, { isDefault: true });
            } else {
                 batch.update(companyRef, { isDefault: false });
            }
        });

        await batch.commit();
        return { success: true, message: 'Компания по умолчанию установлена.' };

    } catch (error) {
        console.error("Error setting default company:", error);
        return { success: false, message: 'Ошибка при установке компании по умолчанию.' };
    }
};

// --- DaData Integration ---
export interface DadataSuggestion {
  value: string; // "ООО 'Ромашка'"
  unrestricted_value: string;
  data: {
    kpp: string | null;
    inn: string | null;
    ogrn: string | null;
    address: {
      value: string;
      unrestricted_value: string;
      data: any;
    } | null;
    management?: {
      name: string | null;
      post: string | null;
    };
    name: {
      full_with_opf: string | null;
      short_with_opf: string | null;
    }
  }
}

export const suggestCompanyDetails = async (query: string): Promise<{ success: boolean; message?: string; suggestions?: DadataSuggestion[] }> => {
    // DaData API call is only triggered for potential INN
    if (!/^\d{10,12}$/.test(query)) {
        return { success: false, message: "Запрос отправляется только для ИНН из 10 или 12 цифр.", suggestions: [] };
    }
    
    try {
        const envSettings = await getEnvSettings({ allowInternal: true });
        const apiKey = envSettings.dadataApiKey;
        const secretKey = envSettings.dadataApiSecret;

        if (!apiKey || !secretKey) {
            throw new Error("Ключи API для DaData не настроены в админ-панели.");
        }

        const response = await axios.post(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
            { query: query },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Token ${apiKey}`,
                    'X-Secret': secretKey,
                },
            }
        );

        return { success: true, suggestions: response.data.suggestions };

    } catch (error: any) {
        console.error("DaData API error:", error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message || "Не удалось получить подсказки от DaData.";
        return { success: false, message: errorMessage };
    }
};
