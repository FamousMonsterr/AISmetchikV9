// @ts-nocheck
// src/contexts/AppContext.tsx
"use client";

import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useMemo, useTransition, useRef } from 'react';
import { nanoid } from 'nanoid'; 
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, collection, query, where, getDocs, increment, Timestamp } from '@/lib/db-client';
import { signOut, useSession } from 'next-auth/react';
import { db } from '@/lib/db';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AiSpecificationItem } from '@/ai/genkit-schemas';
import { z } from 'zod';
import { updateUserPwaStatus, saveProjectVersion } from '@/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from "next-themes";
import { getPlanModelOptions } from '@/lib/plan-models';
import type { ClassifiedItemType } from '@/lib/item-type-classifier';


export type SystemRole = 'User' | 'Admin' | 'Super Admin';
export const SystemRole = {
    User: 'User' as SystemRole,
    Admin: 'Admin' as SystemRole,
    SuperAdmin: 'Super Admin' as SystemRole,
}

export type UserPlan = 'Free' | 'PRO' | 'Business' | 'Enterprise';
export const UserPlan = {
    Free: 'Free' as UserPlan,
    PRO: 'PRO' as UserPlan,
    Business: 'Business' as UserPlan,
    Enterprise: 'Enterprise' as UserPlan,
}

export type UserRole = SystemRole; // For simplicity, though can be extended

export interface AppUser {
  uid: string;
  email: string | null;
  phone?: string | null; // Added phone number
  phoneNormalized?: string | null;
  phoneVerified?: boolean; // Added verification status
  displayName: string;
  telegramUsername?: string | null;
  telegramChatId?: number | null; // Add this
  telegramLinkedAt?: any | null;
  vkId?: string | null;
  vkUsername?: string | null;
  vkLinkedAt?: any | null;
  vkPhotoUrl?: string | null;
  vkPeerId?: number | null;
  
  systemRole: SystemRole;
  plan: UserPlan;

  // New boolean attributes
  isTester?: boolean;
  isDebugger?: boolean;
  isPartner?: boolean;
  isEditor?: boolean;
  isPWAUser?: boolean; // New for PWA tracking

  credits: number;
  promoCredits?: number; // Legacy referral bonus (migrated to bonusCredits)
  promoCreditsExpireAt?: Date | null; // Legacy referral bonus (migrated)
  bonusCredits?: number;
  purchasedCredits?: number;
  bonusCreditsExpireAt?: Date | null;
  purchasedCreditsExpireAt?: Date | null;
  creditsUpdatedAt?: any;
  createdAt?: any; // Can be database timestamp or Date
  updatedAt?: any;

  // Permissions
  maxCompanies: number;
  maxActiveProjects: number;
  maxDraftsPerProject: number; // New for versioning
  availableModels: string[];
  canShareProjects: boolean;
  canUsePrivatePriceBase: boolean;
  canGroupProjects: boolean; 

  // Status
  status: 'active' | 'blocked';
  archivedAt?: any | null; // database timestamp or null

  // Temporary & Trial Roles
  originalPlan?: UserPlan | null; 
  planExpiresAt?: any | null; // Timestamp
  hasUsedTrial?: boolean;
  planSource?: 'trial' | 'paid' | 'pending_payment' | null;
  pendingProOrderId?: string | null;
  pendingProExpiresAt?: any | null;
  planModelPreferences?: {
    free?: string;
    pro?: string;
  };
  
  // Manager/Partner
  managerId?: string | null;
  managerData?: { // Denormalized for easy display
      displayName: string;
      email: string | null;
  } | null;
  partnerStatus?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  partnerTermsAgreedAt?: any | null;
  referredBy?: string | null;
  
  // Consent logging
  termsAgreedAt?: any; // Timestamp for main consent
  agreedToMarketing?: boolean;
  agreedToThirdParty?: boolean;
  proMonthlyBonusLastGrantedAt?: any | null;
  marketingBonusLastGrantedAt?: any | null;

  // Notifications
  seenNotifications?: string[];

  // Document settings
  documentTemplates?: {
    proposal?: string;
    invoice?: string;
    contract?: string;
  };
  signatureUrl?: string | null;
  signatureObjectKey?: string | null;
  signatureUrlExpirationTimestamp?: any | null; // number or Timestamp
  stampUrl?: string | null;
  stampObjectKey?: string | null;
  stampUrlExpirationTimestamp?: any | null; // number or Timestamp
  avatarUrl?: string | null;
  avatarObjectKey?: string | null;
  avatarUrlExpirationTimestamp?: any | null; // number or Timestamp
}

export type ItemStatus = 'На утверждение' | 'Утверждено' | 'Уточнить';
export type ItemType = ClassifiedItemType;

// This is the single source of truth for the SpecificationItem type throughout the app.
// It uses full, descriptive names for UI and DB consistency.
// The mapping from AI's short names happens at the API boundary.
export interface SpecificationItem {
  id: string;
  name: string;
  model?: string | null;
  brand?: string | null;
  quantityToInstall: number;
  quantityReserve?: number | null;
  unit: string;
  isInformational?: boolean | null;
  isRecommended?: boolean | null; // New field for AI recommendations
  status: ItemStatus;
  materialPrice?: number; 
  installationPrice?: number; 
  comment?: string;
  // Calculation Markers
  itemType: ItemType;
}


export interface AnalysisDetails {
  systemType?: string;
  objectName?: string;
  projectCode?: string; // New field for project code/cipher
  maxInstallationHeight?: string;
  totalArea?: string;
  projectHashtags?: string[] | null;
}

export type TaxType = 'none' | 'vat_included' | 'vat_added' | 'usn';

export interface QuoteConfig {
  taxType: TaxType;
  // Standard services
  includeCommissioning: boolean; 
  commissioningCost: number;
  commissioningQuantity: number; 
  includeExecutiveDocumentation: boolean; 
  executiveDocumentationTotalCost: number; 
  executiveDocumentationQuantity: number;
  includeMeasurementTrip: boolean;
  measurementTripCost: number;
  measurementTripQuantity: number;

  // New additional works
  includeDismantling: boolean;
  dismantlingCost: number;
  includeWallDrilling: boolean;
  wallDrillingCount: number;
  wallDrillingCost: number;
  includeFloorDrilling: boolean;
  floorDrillingCount: number;
  floorDrillingCost: number;

  // Display options
  showMaterialColumns: boolean;
}

export interface HistoryRequest {
  id: string; // database document ID
  userId: string;
  fileName: string;
  fileUri?: string | null; // URI of the file in Gemini
  mimeType?: string | null;
  fileSha1?: string; // SHA-1 hash of the original file
  status: 'processing' | 'success' | 'failed' | 'reported' | 'draft' | 'cancelled';
  timestamp: any; // database timestamp or Date
  cost: number;
  error?: string; // For failed status
  modelUsed?: string; // The model used for the analysis
  
  // This is the primary data structure used by the app.
  // It always uses the full, descriptive names.
  outputSpecifications: SpecificationItem[];
  
  aiComment?: string | null;
  actionHistory?: ActionLog[] | null;
  importantExtractionNotes?: string[] | null;
  analysisDetails?: AnalysisDetails | null;

  reportedAt?: any; // database timestamp or Date
  resolvedAt?: any; // database timestamp or Date
  resolvedBy?: string; // UID of admin who resolved it
  archivedAt?: any | null; // database timestamp or null
  quoteConfig?: QuoteConfig; // Storing the config used for this request
  
  // Object Grouping
  objectId?: string | null;
  objectName?: string | null;

  // Versioning
  parentProjectId?: string | null; // ID of the main project if this is a draft/version
  isMainVersion?: boolean; // true if this is the "active" project
  version?: number; // Version number

  // New field for AI call limit
  aiCallCount?: number;

  // Server orchestration
  serverJobId?: string | null;
  s3ObjectKey?: string | null;
  pipelineVersion?: 'v1' | 'v2' | 'v3' | 'xiaomi-vision' | null;
  processingStage?: string | null;
  processingStageMessage?: string | null;
  processingStageUpdatedAt?: any;
  analysisSource?: {
    fileUri?: string | null;
    fileSha1?: string | null;
    fileName?: string;
    mimeType?: string | null;
    objectKey?: string | null;
    model?: string | null;
    temperature?: number | null;
    includeThoughts?: boolean | null;
    pipelineVersion?: 'v1' | 'v2' | 'v3' | 'xiaomi-vision' | null;
    objectId?: string | null;
    objectName?: string | null;
  } | null;
}

export interface Company {
  id: string; // database document ID
  userId: string;
  isDefault: boolean;
  name: string; // Short name for LLC, or Full Name for IE/Self-employed
  type: 'LLC' | 'IE' | 'SelfEmployed'; // Company type
  taxSystem: TaxType; // Default tax system for the company
  
  isClient: boolean; // True if this entity is a client, false if it's one of the user's own companies

  // Optional fields
  fullName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  postalAddress?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bik?: string;
  correspondentAccount?: string;
  checkingAccount?: string;
  ceoName?: string; // Only for LLC
  ceoBasis?: string; // Only for LLC
  createdAt: any; // database timestamp
  updatedAt: any; // database timestamp
}

export interface LegalEntity extends Omit<Company, 'id' | 'userId' | 'isDefault' | 'createdAt' | 'updatedAt' | 'taxSystem' | 'type' | 'isClient'> {
  contactPhone?: string;
  contactEmail?: string;
}

export type PriceBaseItem = {
    id: string;
    userId: string;
    key: string; // unique key for deduplication
    name: string;
    model?: string;
    brand?: string;
    unit: string;
    avgMaterialPrice: number;
    avgInstallationPrice: number;
    section?: string;
    createdAt: any;
    updatedAt: any;
    itemType: ItemType;
};

export type Notification = {
  id: string;
  title: string;
  content: string; // Markdown content
  type: 'informational' | 'important';
  status?: 'draft' | 'published' | 'unread' | 'read';
  createdAt?: any;
  publishedAt?: any | null;
  createdBy?: string; // Admin UID
  userId?: string;
}

// --- Action History ---
export type ActionSnapshot = {
    outputSpecifications: SpecificationItem[];
    quoteConfig?: QuoteConfig;
    analysisDetails?: AnalysisDetails | null;
    aiComment?: string | null;
    importantExtractionNotes?: string[] | null;
    modelUsed?: string;
};

export type ActionLog = {
    id: string;
    timestamp: Date;
    description: string;
    snapshot: ActionSnapshot;
};

interface WebAppUser {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    added_to_attachment_menu?: boolean;
    allows_write_to_pm?: boolean;
    photo_url?: string;
}

interface WebAppInitData {
    query_id?: string;
    user?: WebAppUser;
    receiver?: WebAppUser;
    chat?: any;
    chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
    chat_instance?: string;
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
}


interface WebApp {
    initData: string;
    initDataUnsafe: WebAppInitData;
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: object;
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    isClosingConfirmationEnabled: boolean;
    headerColor: string;
    backgroundColor: string;
    BackButton: {
      isVisible: boolean;
      onClick(callback: () => void): void;
      offClick(callback: () => void): void;
      show(): void;
      hide(): void;
    };
    MainButton: {
      text: string;
      color: string;
      textColor: string;
      isVisible: boolean;
      isActive: boolean;
      isProgressVisible: boolean;
      setText(text: string): void;
      onClick(callback: () => void): void;
      offClick(callback: () => void): void;
      show(): void;
      hide(): void;
      enable(): void;
      disable(): void;
      showProgress(leaveActive?: boolean): void;
      hideProgress(): void;
      setParams(params: object): void;
    };
    HapticFeedback: {
      impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
      notificationOccurred(type: 'error' | 'success' | 'warning'): void;
      selectionChanged(): void;
    };
    isVersionAtLeast(version: string): boolean;
    setHeaderColor(color: string): void;
    setBackgroundColor(color: string): void;
    enableClosingConfirmation(): void;
    disableClosingConfirmation(): void;
    onEvent(eventType: string, eventHandler: (...args: any[]) => void): void;
    offEvent(eventType: string, eventHandler: (...args: any[]) => void): void;
    sendData(data: any): void;
    openLink(url: string, options?: { try_instant_view?: boolean }): void;
    openTelegramLink(url: string): void;
    openInvoice(url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void): void;
    showPopup(params: object, callback?: (id?: string) => void): void;
    showAlert(message: string, callback?: () => void): void;
    showConfirm(message: string, callback?: (ok: boolean) => void): void;
    readTextFromClipboard(callback?: (text: string) => void): void;
}

// Define the shape of the context state
interface AppState {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  isLoading: boolean; // Add a loading state
  effectivePlan: UserPlan; // Calculated plan including trial
  effectiveRole: UserRole;
  userAvailableModels: any[]; // Models available for current plan
  
  resetAppContextState: () => void;
  
  // Single project state (for new analysis)
  currentProject: HistoryRequest | null; 
  setCurrentProject: (project: HistoryRequest | null | ((prevState: HistoryRequest | null) => HistoryRequest | null)) => void;

  // Group project state (for editing an object)
  currentGroup: HistoryRequest[] | null;
  setCurrentGroup: (group: HistoryRequest[] | null) => void;
  
  // For timeout warning
  showTimeoutWarning: boolean;
  setShowTimeoutWarning: (show: boolean) => void;

  // Telegram Web App object
  telegram?: WebApp;
  telegramUser?: WebAppUser;
  isNavigating: boolean;
  setNavigating: (isNavigating: boolean) => void;
  
  // Action History for Undo
  actionHistory: ActionLog[];
  logAction: (description: string, snapshot: ActionSnapshot) => void;
  
  // AI Accuracy Tracking
  changeCounter: number;
  incrementChangeCounter: () => void;
  resetChangeCounter: () => void;

  // File Upload Strategy
  useFileUpload: boolean;
}


export const initialQuoteConfig: QuoteConfig = {
  taxType: 'usn',
  includeCommissioning: true,
  commissioningCost: 7, 
  commissioningQuantity: 1,
  includeMeasurementTrip: false,
  measurementTripCost: 0,
  measurementTripQuantity: 1,
  includeExecutiveDocumentation: true,
  executiveDocumentationTotalCost: 15000, 
  executiveDocumentationQuantity: 1,
  includeDismantling: false,
  dismantlingCost: 0,
  includeWallDrilling: false,
  wallDrillingCount: 0,
  wallDrillingCost: 0,
  includeFloorDrilling: false,
  floorDrillingCount: 0,
  floorDrillingCost: 0,
  showMaterialColumns: true,
};

const AppContext = createContext<AppState | undefined>(undefined);

// Helper to convert database timestamps to JS Dates in a nested object
const convertTimestampsToDates = (obj: any): any => {
    if (!obj) return obj;
    if (Array.isArray(obj)) {
        return obj.map(convertTimestampsToDates);
    }
    if (obj instanceof Timestamp) {
        return obj.toDate();
    }
    if (typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            newObj[key] = convertTimestampsToDates(obj[key]);
        }
        return newObj;
    }
    return obj;
};


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [effectivePlan, setEffectivePlan] = useState<UserPlan>('Free');
  const [effectiveRole, setEffectiveRole] = useState<UserRole>('User');
  const { data: session, status } = useSession();
  const sessionUser = session?.user ?? null;
  const sessionUserId = useMemo(() => {
    const idValue = (sessionUser as any)?.id;
    if (typeof idValue === 'string') return idValue;
    if (idValue == null) return '';
    if (typeof idValue?.toString === 'function') return idValue.toString();
    return String(idValue);
  }, [sessionUser]);
  const authLoading = status === 'loading';
  const authError = null;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [currentProject, setCurrentProject] = useState<HistoryRequest | null>(null);
  const [currentGroup, setCurrentGroup] = useState<HistoryRequest[] | null>(null);

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [actionHistory, setActionHistory] = useState<ActionLog[]>([]);
  
  // --- VERSIONING & ACCURACY STATE ---
  const [changeCounter, setChangeCounter] = useState(0);
  const [useFileUpload] = useState(true);


  const incrementChangeCounter = () => setChangeCounter(prev => prev + 1);
  const resetChangeCounter = () => setChangeCounter(0);
  
  const telegram = useMemo(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      return (window as any).Telegram.WebApp as WebApp;
    }
    return undefined;
  }, []);
  
  const telegramUser = useMemo(() => {
    if (telegram?.initDataUnsafe?.user) {
        return telegram.initDataUnsafe.user;
    }
    return undefined;
  }, [telegram]);

  const [isNavigating, setNavigating] = useState(false);
  const [isTransitioning, startTransition] = useTransition();
  const userRef = useRef<AppUser | null>(null);

  const userAvailableModels = useMemo(() => {
    if (!user) return [];
    return getPlanModelOptions(effectivePlan);
  }, [user, effectivePlan]);

  const shouldForceSignOutOnRealtimeError = useCallback((error: any): boolean => {
    const code = typeof error?.code === 'string' ? error.code : '';
    const message = String(error?.message || '').toLowerCase();

    // Realtime transport can legitimately fall back from SSE to polling.
    // This should never force user logout.
    if (code === 'realtime/connection-failed') {
      return false;
    }

    // Force logout only when backend clearly reports auth/session problems.
    if (message.includes('401') || message.includes('unauthorized') || message.includes('forbidden')) {
      return true;
    }

    return false;
  }, []);

  const checkUserPlan = useCallback(async (userToCheck: AppUser) => {
    let changed = false;
    const now = new Date();
    const userRef = doc(db, 'users', userToCheck.uid);
    let tempPlan = userToCheck.plan;
    
    // Check if a temporary plan has expired
    if (userToCheck.planExpiresAt && userToCheck.planExpiresAt < now) {
        if (userToCheck.originalPlan) {
            tempPlan = userToCheck.originalPlan;
            changed = true;
            await updateDoc(userRef, {
                plan: tempPlan,
                originalPlan: null,
                planExpiresAt: null,
                planSource: null,
                updatedAt: serverTimestamp()
            });
        }
    }
    
    if (!changed) {
        setEffectivePlan(tempPlan);
        setEffectiveRole(userToCheck.systemRole);
    }
  }, []);

  const resetAppContextState = useCallback(() => {
    setCurrentProject(null);
    setCurrentGroup(null);
    setShowTimeoutWarning(false);
    setActionHistory([]);
    resetChangeCounter();
  }, []);

  const toComparableTime = useCallback((value: any): number | null => {
    if (!value) return null;
    if (value instanceof Date) return value.getTime();
    if (typeof value?.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date ? d.getTime() : null;
    }
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }, []);

  const isSameUserSnapshot = useCallback((prev: AppUser | null, next: AppUser): boolean => {
    if (!prev) return false;
    if (prev.uid !== next.uid) return false;

    const prevUpdatedAt = toComparableTime(prev.updatedAt);
    const nextUpdatedAt = toComparableTime(next.updatedAt);
    const prevCreditsUpdatedAt = toComparableTime(prev.creditsUpdatedAt);
    const nextCreditsUpdatedAt = toComparableTime(next.creditsUpdatedAt);

    if (prevUpdatedAt !== null && nextUpdatedAt !== null && prevUpdatedAt !== nextUpdatedAt) return false;
    if (prevCreditsUpdatedAt !== null && nextCreditsUpdatedAt !== null && prevCreditsUpdatedAt !== nextCreditsUpdatedAt) return false;

    // Fast-path fields that most often change and should immediately update UI.
    if (prev.plan !== next.plan) return false;
    if (prev.systemRole !== next.systemRole) return false;
    if (prev.status !== next.status) return false;
    if (prev.displayName !== next.displayName) return false;
    if (prev.email !== next.email) return false;
    if ((prev.credits || 0) !== (next.credits || 0)) return false;
    if ((prev.bonusCredits || 0) !== (next.bonusCredits || 0)) return false;
    if ((prev.purchasedCredits || 0) !== (next.purchasedCredits || 0)) return false;
    if ((prev.telegramChatId || null) !== (next.telegramChatId || null)) return false;
    if ((prev.isPWAUser || false) !== (next.isPWAUser || false)) return false;

    return true;
  }, [toComparableTime]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (authLoading) {
        setIsLoading(true);
        return;
    }
    if (authError || !sessionUser) {
        setUser(null);
        setIsLoading(false);
        setEffectivePlan('Free');
        setEffectiveRole('User');
        return;
    }
    if (!sessionUserId) {
        console.error("Authenticated session has no user id. Forcing logout.");
        signOut().then(() => setUser(null));
        setIsLoading(false);
        return;
    }

    const userDocRef = doc(db, 'users', sessionUserId);
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const rawData = { uid: docSnap.id, ...docSnap.data() };
            const userData = convertTimestampsToDates(rawData) as AppUser;
            
            if (userData.managerId) {
                const managerDocRef = doc(db, 'users', userData.managerId);
                const managerDoc = await getDoc(managerDocRef);
                if (managerDoc.exists()) {
                    const managerData = managerDoc.data();
                    userData.managerData = {
                        displayName: managerData.displayName,
                        email: managerData.email
                    };
                }
            } else {
                userData.managerData = null;
            }
            
            const userChanged = !isSameUserSnapshot(userRef.current, userData);
            if (userChanged) {
                setUser(userData);

                // Only check plan expiry if user has a temporary plan
                if (userData.planExpiresAt) {
                    checkUserPlan(userData);
                }

                if (typeof window !== 'undefined') {
                    const isPwa = window.matchMedia('(display-mode: standalone)').matches;
                    if (isPwa && !userData.isPWAUser) {
                        updateUserPwaStatus({ userId: userData.uid, isPWA: true });
                    }
                }
            }

            setIsLoading(false);
        } else {
            console.error("User document not found for authenticated session. Forcing logout.");
            signOut().then(() => setUser(null));
            setIsLoading(false);
        }
    }, (err) => {
        if (shouldForceSignOutOnRealtimeError(err)) {
            console.error("Auth error while fetching user data. Forcing logout:", err);
            signOut().then(() => setUser(null));
            setIsLoading(false);
            return;
        }
        console.warn("Non-auth realtime error while fetching user data:", err);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [sessionUser, sessionUserId, authLoading, authError, checkUserPlan, telegram, isSameUserSnapshot, shouldForceSignOutOnRealtimeError]);
  
   useEffect(() => {
    if (telegram) {
        telegram.ready();
        telegram.expand();

        const handleThemeChange = () => {
          const root = document.documentElement;
          Object.entries(telegram.themeParams).forEach(([key, value]) => {
              const cssVar = `--tg-theme-${key.replace(/_/g, '-')}`;
              root.style.setProperty(cssVar, value as string);
          });
          document.body.className = telegram.colorScheme;
        };

        const handleBackButton = () => {
            startTransition(() => {
                router.back();
            });
        };

        telegram.onEvent('themeChanged', handleThemeChange);
        if (telegram.isVersionAtLeast('6.1')) {
            telegram.BackButton.onClick(handleBackButton);
        }
        handleThemeChange(); // Initial setup

        return () => {
            telegram.offEvent('themeChanged', handleThemeChange);
            if (telegram.isVersionAtLeast('6.1')) {
                telegram.BackButton.offClick(handleBackButton);
            }
        };
    }
   }, [telegram, router]);
  
  useEffect(() => {
    if (telegram && telegram.isVersionAtLeast('6.1')) {
      if (pathname !== '/dashboard') {
        telegram.BackButton.show();
      } else {
        telegram.BackButton.hide();
      }
    }
  }, [pathname, telegram]);

  useEffect(() => {
    if (isNavigating) {
      setNavigating(false);
    }
  }, [pathname, searchParams, isNavigating]);

  const logAction = useCallback((description: string, snapshot: ActionSnapshot) => {
    const newAction: ActionLog = { id: nanoid(), timestamp: new Date(), description, snapshot };
    setActionHistory(prev => [newAction, ...prev].slice(0, 10));
  }, []);

  const value = useMemo<AppState>(() => ({
    user,
    setUser,
    isLoading,
    effectivePlan,
    effectiveRole,
    userAvailableModels,
    currentProject,
    setCurrentProject,
    currentGroup,
    setCurrentGroup,
    showTimeoutWarning,
    setShowTimeoutWarning,
    telegram,
    telegramUser,
    isNavigating,
    setNavigating,
    actionHistory,
    logAction,
    changeCounter,
    incrementChangeCounter,
    resetChangeCounter,
    useFileUpload,
    resetAppContextState,
  }), [
    user, isLoading, effectivePlan, effectiveRole, userAvailableModels,
    currentProject, currentGroup, showTimeoutWarning, telegram, telegramUser,
    isNavigating, actionHistory, changeCounter,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};


export const useAppContext = (): AppState => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
