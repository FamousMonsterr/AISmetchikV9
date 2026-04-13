// @ts-nocheck
import nodemailer from 'nodemailer';
import { getEnvSettings } from '@/actions/adminActions';

type MailerConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

async function resolveMailerConfig(): Promise<MailerConfig | null> {
  const settings = await getEnvSettings({ allowInternal: true });
  const enabled = settings.smtpEnabled ?? process.env.SMTP_ENABLED === 'true';

  const host = settings.smtpHost || process.env.SMTP_HOST || '';
  const port = settings.smtpPort || Number(process.env.SMTP_PORT || 587);
  const secure = settings.smtpSecure ?? process.env.SMTP_SECURE === 'true';
  const user = settings.smtpUser || process.env.SMTP_USER || '';
  const pass = settings.smtpPass || process.env.SMTP_PASS || '';
  const from = settings.smtpFrom || process.env.SMTP_FROM || user;

  if (!enabled) {
    return null;
  }

  if (!host || !user || !pass) {
    return null;
  }

  return { enabled, host, port, secure, user, pass, from };
}

export async function isMailerConfigured() {
  const config = await resolveMailerConfig();
  return !!config;
}

export async function getMailerFrom() {
  const config = await resolveMailerConfig();
  return config?.from || '';
}

export async function getMailer() {
  const config = await resolveMailerConfig();
  if (!config) {
    throw new Error('SMTP is not configured.');
  }
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}
