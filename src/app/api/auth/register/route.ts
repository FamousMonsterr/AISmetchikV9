import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import modelsConfig from '@/lib/ai-config.json';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
  }

  const email = String(body.email).toLowerCase();
  const password = String(body.password);
  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const db = await getDb();
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    return NextResponse.json({ message: 'Email already registered.' }, { status: 409 });
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
    phone: body.phone || '',
    phoneVerified: false,
    displayName: email.split('@')[0] || 'Пользователь',
    telegramUsername: '',
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
    if (body.referralCode) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 90);
      userData.promoCredits = 100;
      userData.promoCreditsExpireAt = expirationDate;
    }
  }

  await db.collection('users').insertOne(userData);

  return NextResponse.json({ id: userId });
}
