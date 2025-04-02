'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/competitions/bulk', label: 'Competitions' },
  { path: '/universities/manage', label: 'Universities' },
  { path: '/organizers/manage', label: 'Organizers' },
  { path: '/timeline/manage', label: 'Timeline' },
  { path: '/history/manage', label: 'History' },
  { path: '/gallery/manage', label: 'Gallery' },
  { path: '/resources/manage', label: 'Resources' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-zinc-950 text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 font-bold text-xl">
            CaseComp Admin
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium',
                    pathname === item.path
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'block px-3 py-2 rounded-md text-base font-medium',
                  pathname === item.path
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
