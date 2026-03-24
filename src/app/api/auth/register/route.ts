// @ts-nocheck
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import modelsConfig from '@/lib/ai-config.json';
import promoConfig from '@/lib/promo-config.json';
import { grantCredits } from '@/services/credits';
import { normalizeEmail, normalizePhone } from '@/lib/auth-identifiers';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password);
  const phone = String(body.phone || '').trim();
  const phoneNormalized = normalizePhone(phone);
  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const db = await getDb();
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    return NextResponse.json({ message: 'Email already registered.' }, { status: 409 });
  }
  if (phoneNormalized) {
    const existingByPhone = await db.collection('users').findOne({ phoneNormalized });
    if (existingByPhone) {
      return NextResponse.json({ message: 'Телефон уже зарегистрирован.' }, { status: 409 });
    }
  }

  const { apiModels } = modelsConfig as any;
  const defaultModel = apiModels.find((m: any) => m.isDefault) || apiModels[0];
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const isSuperAdmin = !!superAdminEmail && email === superAdminEmail.toLowerCase();
  const systemRole = isSuperAdmin ? 'Super Admin' : 'User';
  const plan = isSuperAdmin ? 'Enterprise' : 'Free';

  const userId = nanoid();
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const userData: any = {
    _id: userId,
    email,
    passwordHash,
    phone,
    phoneNormalized,
    phoneVerified: false,
    displayName: email.split('@')[0] || 'Пользователь',
    telegramUsername: '',
    telegramChatId: null,
    telegramLinkedAt: null,
    vkId: null,
    vkUsername: '',
    vkLinkedAt: null,
    vkPhotoUrl: null,
    vkPeerId: null,
    authProvider: 'credentials',
    systemRole,
    plan,
    isTester: isSuperAdmin,
    isDebugger: false,
    isPartner: false,
    isEditor: false,
    credits: isSuperAdmin ? 99999 : 10,
    projectCount: 0,
    createdAt: now,
    termsAgreedAt: now,
    agreedToMarketing: !!body.agreedToMarketing,
    agreedToThirdParty: !!body.agreedToThirdParty,
    maxCompanies: isSuperAdmin ? 100 : 1,
    maxActiveProjects: isSuperAdmin ? 1000 : 10,
    maxDraftsPerProject: isSuperAdmin ? 100 : 3,
    availableModels: isSuperAdmin ? apiModels.map((m: any) => m.value) : [defaultModel.value],
    canShareProjects: isSuperAdmin,
    canUsePrivatePriceBase: isSuperAdmin,
    canGroupProjects: isSuperAdmin,
    status: 'active',
    archivedAt: null,
  };

  if (body.promoCode) {
    userData.referredBy = body.promoCode;
  }
  if (body.referralCode) {
    const trialDays = promoConfig?.referralProgram?.refereeBonus?.proTrialDays || 30;
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);
    userData.originalPlan = 'Free';
    userData.plan = 'PRO';
    userData.planExpiresAt = trialExpiresAt;
    userData.planSource = 'trial';
    userData.hasUsedTrial = true;
  }

  await db.collection('users').insertOne(userData);

  if (body.promoCode) {
    const referrer = await db.collection('users').findOne({ _id: body.promoCode });
    if (referrer?._id) {
      try {
        await grantCredits({
          userId: referrer._id,
          amount: promoConfig?.referralProgram?.referrerBonus?.credits || 10,
          type: 'bonus',
          source: 'referral_bonus',
          metadata: { refereeId: userId },
        });
      } catch (error) {
        console.warn('Failed to grant referral bonus', error);
      }
    }
  }

  return NextResponse.json({ id: userId });
}
