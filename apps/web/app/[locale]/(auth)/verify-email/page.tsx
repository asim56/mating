import { VerifyEmailForm } from '../../../../features/auth/verify-email-form';
import { isLocale, translate, type Locale } from '../../../../lib/i18n/config';

export default async function VerifyEmailPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const t = (key: string) => translate(locale, key);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">{t('auth.verifyEmail.title')}</h1>
      <VerifyEmailForm
        labels={{
          tokenLabel: t('auth.verifyEmail.tokenLabel'),
          submit: t('auth.verifyEmail.submit'),
          success: t('auth.verifyEmail.success'),
        }}
      />
    </main>
  );
}
