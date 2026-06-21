import { Button } from '@mating/ui';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
        Foundation ready
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Animal Breeding Marketplace</h1>
      <p className="max-w-xl text-lg text-stone-600">
        Monorepo scaffold for a Pakistan-first breeding platform. Business features are implemented
        in subsequent checkpoints.
      </p>
      <Button>Get started</Button>
    </main>
  );
}
