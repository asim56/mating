import { SearchListings } from '../../../features/discovery/search/search-list';

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Find breeding partners</h1>
      <SearchListings />
    </main>
  );
}
