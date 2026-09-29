"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Database, GitGraph, FileText, Activity, Users, Settings, Search, MapPin } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Activity },
  { name: 'Epistemic Health', href: '/dashboard/health', icon: Activity },
  { name: 'Spatial Map', href: '/dashboard/map', icon: MapPin },
  { name: 'Knowledge Explorer', href: '/dashboard/explorer', icon: Search },
  { name: 'Entities', href: '/dashboard/entities', icon: Database },
  { name: 'Observations', href: '/dashboard/observations', icon: FileText },
  { name: 'Events', href: '/dashboard/events', icon: Activity },
  { name: 'Agents', href: '/dashboard/agents', icon: Users },
  { name: 'Agent Chat', href: '/dashboard/chat', icon: Users },
  { name: 'Agent Runs', href: '/dashboard/runs', icon: Settings },
  { name: 'Agent Reviews', href: '/dashboard/agents/review', icon: Activity },
  { name: 'Visual Labeling', href: '/dashboard/visual', icon: FileText },
  { name: 'Satellite Agent', href: '/dashboard/satellite', icon: MapPin },
];

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Top Bar (Visible only on mobile) */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center">
          <GitGraph className="w-6 h-6 text-blue-500 mr-2" />
          <span className="font-bold text-lg tracking-tight text-white">ArqTech</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-300 hover:text-white p-2"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Off-Canvas Menu */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          <div className="relative flex flex-col w-64 max-w-sm h-full bg-gray-900 border-r border-gray-800">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
              <div className="flex items-center">
                <GitGraph className="w-6 h-6 text-blue-500 mr-2" />
                <span className="font-bold text-lg tracking-tight text-white">ArqTech</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                          isActive 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
