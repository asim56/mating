type RequestSummary = {
  id: string;
  status: string;
  breedingMethod: string;
  createdAt: string;
};

type Props = {
  requests?: RequestSummary[];
};

export function RequestsList({ requests = [] }: Props) {
  if (requests.length === 0) {
    return <p className="text-sm text-gray-600">No breeding requests yet.</p>;
  }

  return (
    <ul className="divide-y rounded border">
      {requests.map((r) => (
        <li key={r.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium">{r.status}</p>
            <p className="text-sm text-gray-600">{r.breedingMethod}</p>
          </div>
          <a href={`requests/${r.id}`} className="text-sm text-blue-600 hover:underline">
            View
          </a>
        </li>
      ))}
    </ul>
  );
}
