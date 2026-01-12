// src/contexts/AppContext.tsx
"use client";

import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useMemo, useTransition } from 'react';
import { nanoid } from 'nanoid'; 
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, collection, query, where, getDocs, increment, Timestamp } from '@/lib/mongoFirestore';
import { signOut, useSession } from 'next-auth/react';
import { db } from '@/lib/firebase';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AiSpecificationItem } from '@/ai/genkit-schemas';
import { linkTelegramAccount } from '@/actions/telegramActions';
import { z } from 'zod';
import { updateUserPwaStatus, saveProjectVersion } from '@/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from "next-themes";
import { NotificationCenter } from '@/components/NotificationCenter';
import aiConfig from '@/lib/ai-config.json';


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
  phoneVerified?: boolean; // Added verification status
  displayName: string;
  telegramUsername?: string;
  telegramChatId?: number; // Add this
  
  systemRole: SystemRole;
  plan: UserPlan;

  // New boolean attributes
  isTester?: boolean;
  isDebugger?: boolean;
  isPartner?: boolean;
  isEditor?: boolean;
  isPWAUser?: boolean; // New for PWA tracking

  credits: number;
  promoCredits?: number; // New for referral bonus
  promoCreditsExpireAt?: Date | null; // New for referral bonus
  createdAt?: any; // Can be Firebase Timestamp or Date
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
  archivedAt?: any | null; // Firebase Timestamp or null

  // Temporary & Trial Roles
  originalPlan?: UserPlan | null; 
  planExpiresAt?: any | null; // Timestamp
  hasUsedTrial?: boolean;
  
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
}

export type ItemStatus = 'На утверждение' | 'Утверждено' | 'Уточнить';
export type ItemType = 'device' | 'cable' | 'consumable' | 'other';

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
  id: string; // Firestore document ID
  userId: string;
  fileName: string;
  fileUri?: string | null; // URI of the file in Gemini
  mimeType?: string | null;
  fileSha1?: string; // SHA-1 hash of the original file
  status: 'processing' | 'success' | 'failed' | 'reported' | 'draft';
  timestamp: any; // Firebase Timestamp or Date
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

  reportedAt?: any; // Firebase Timestamp or Date
  resolvedAt?: any; // Firebase Timestamp or Date
  resolvedBy?: string; // UID of admin who resolved it
  archivedAt?: any | null; // Firebase Timestamp or null
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
}

export interface Company {
  id: string; // Firestore document ID
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
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
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
  userAvailableModels: any[]; // New: models from user data
  
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
  setUseFileUpload: React.Dispatch<React.SetStateAction<boolean>>;

  // Vercel Proxy Strategy
  useProxy: boolean;
  setUseProxy: React.Dispatch<React.SetStateAction<boolean>>;
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

// Helper to convert Firestore Timestamps to JS Dates in a nested object
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
  const firebaseUser = session?.user ?? null;
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
  const [useFileUpload, setUseFileUpload] = useState(true);
  const [useProxy, setUseProxy] = useState(false); // Default to not using proxy


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

  const userAvailableModels = useMemo(() => {
    if (!user || !user.availableModels) return [];
    let available = (aiConfig.apiModels || []).filter((model: any) => user.availableModels.includes(model.value));
    
    // If proxy is enabled, only show Google models.
    if (useProxy) {
        available = available.filter((model: any) => model.provider === 'google');
    }

    return available;
  }, [user, useProxy]);

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

  useEffect(() => {
    if (authLoading) {
        setIsLoading(true);
        return;
    }
    if (authError || !firebaseUser) {
        setUser(null);
        setIsLoading(false);
        setEffectivePlan('Free');
        setEffectiveRole('User');
        return;
    }

    const userDocRef = doc(db, 'users', firebaseUser.id);
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
            
            setUser(userData);
            checkUserPlan(userData);
            
            if (telegram?.initData && !userData.telegramChatId) {
                linkTelegramAccount({ initData: telegram.initData, userId: userData.uid });
            }

            if (typeof window !== 'undefined') {
                const isPwa = window.matchMedia('(display-mode: standalone)').matches;
                if (isPwa && !userData.isPWAUser) {
                    updateUserPwaStatus({ userId: userData.uid, isPWA: true });
                }
            }

            setIsLoading(false);
        } else {
            console.error("Firestore document not found for authenticated user. Forcing logout.");
            signOut().then(() => setUser(null));
            setIsLoading(false);
        }
    }, (err) => {
        console.error("Error fetching user data from Firestore:", err);
        signOut().then(() => setUser(null));
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser, authLoading, authError, checkUserPlan, telegram]);
  
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
    setActionHistory(prev => [newAction, ...prev].slice(0, 50));
  }, []);

  const value: AppState = {
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
    setUseFileUpload,
    useProxy,
    setUseProxy,
    resetAppContextState,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <NotificationCenter />
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
