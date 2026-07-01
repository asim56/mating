import { LocaleSwitcher } from '../../../../components/locale-switcher';
import { OtpForm } from '../../../../features/auth/otp-form';
import { isLocale, translate, type Locale } from '../../../../lib/i18n/config';

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const t = (key: string) => translate(locale, key);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-4 flex justify-end">
        <LocaleSwitcher label={t('locale.switch')} />
      </div>
      <h1 className="mb-6 text-2xl font-semibold">{t('auth.signIn.title')}</h1>
      <OtpForm
        labels={{
          phoneLabel: t('auth.signIn.phoneLabel'),
          phonePlaceholder: t('auth.signIn.phonePlaceholder'),
          codeLabel: t('auth.signIn.codeLabel'),
          sendCode: t('auth.signIn.sendCode'),
          verify: t('auth.signIn.verify'),
          success: t('auth.signIn.success'),
        }}
      />
    </main>
  );
}
