import { SignUpForm } from '../../../../features/auth/sign-up-form';
import { LocaleSwitcher } from '../../../../components/locale-switcher';
import { isLocale, translate, type Locale } from '../../../../lib/i18n/config';

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const t = (key: string) => translate(locale, key);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-4 flex justify-end">
        <LocaleSwitcher label={t('locale.switch')} />
      </div>
      <h1 className="mb-6 text-2xl font-semibold">{t('auth.signUp.title')}</h1>
      <SignUpForm
        labels={{
          emailLabel: t('auth.signUp.emailLabel'),
          passwordLabel: t('auth.signUp.passwordLabel'),
          submit: t('auth.signUp.submit'),
          success: t('auth.signUp.success'),
        }}
      />
    </main>
  );
}
