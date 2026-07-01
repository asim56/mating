import { ProfileForm } from '../../../../features/profile/profile-form';
import { LocaleSwitcher } from '../../../../components/locale-switcher';
import { isLocale, translate, type Locale } from '../../../../lib/i18n/config';

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const t = (key: string) => translate(locale, key);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-4 flex justify-end">
        <LocaleSwitcher label={t('locale.switch')} />
      </div>
      <h1 className="mb-6 text-2xl font-semibold">{t('profile.title')}</h1>
      <ProfileForm
        labels={{
          displayName: t('profile.displayName'),
          region: t('profile.region'),
          locale: t('profile.locale'),
          role: t('profile.role'),
          submit: t('profile.submit'),
          success: t('profile.success'),
        }}
      />
    </main>
  );
}
