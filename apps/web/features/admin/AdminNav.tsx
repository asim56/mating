import Link from 'next/link';

const links = [
  { href: '/verifications', label: 'Verifications' },
  { href: '/disputes', label: 'Disputes' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/moderation', label: 'Moderation' },
  { href: '/audit', label: 'Audit' },
  { href: '/dashboard', label: 'Dashboard' },
] as const;

export function AdminNav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-3 border-b pb-4 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded px-3 py-1 text-gray-700 hover:bg-gray-100"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
