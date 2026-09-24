import Link from 'next/link';
import { Database, GitGraph, FileText, Activity, Users, Settings, Search } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Activity },
  { name: 'Knowledge Explorer', href: '/dashboard/explorer', icon: Search },
  { name: 'Entities', href: '/dashboard/entities', icon: Database },
  { name: 'Observations', href: '/dashboard/observations', icon: FileText },
  { name: 'Events', href: '/dashboard/events', icon: Activity },
  { name: 'Agents', href: '/dashboard/agents', icon: Users },
  { name: 'Agent Runs', href: '/dashboard/runs', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900 hidden md:flex md:flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <GitGraph className="w-6 h-6 text-blue-500 mr-2" />
          <span className="font-bold text-lg tracking-tight">ArqTech Engine</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <h1 className="text-xl font-semibold">Workspace</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
