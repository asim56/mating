import { RecoverForm } from '../../../../features/auth/recover-form';
import { SessionsList } from '../../../../features/auth/sessions-list';
import { isLocale, translate, type Locale } from '../../../../lib/i18n/config';

export default async function RecoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const t = (key: string) => translate(locale, key);

  return (
    <main className="mx-auto max-w-md space-y-10 px-4 py-12">
      <section>
        <h1 className="mb-6 text-2xl font-semibold">{t('auth.recover.title')}</h1>
        <RecoverForm
          labels={{
            identifierLabel: t('auth.recover.identifierLabel'),
            submit: t('auth.recover.submit'),
            success: t('auth.recover.success'),
          }}
        />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('auth.sessions.title')}</h2>
        <SessionsList
          labels={{
            title: t('auth.sessions.title'),
            revoke: t('auth.sessions.revoke'),
            current: t('auth.sessions.current'),
          }}
        />
      </section>
    </main>
  );
}
