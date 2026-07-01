import { RequestActions } from '../../../../../features/breeding-workflow';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RequestDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Request {id}</h1>
      <p className="mb-6 text-sm text-gray-600">Event timeline loads from API.</p>
      <RequestActions requestId={id} status="Requested" />
    </main>
  );
}
