import React from 'react';
import { CubeIcon, ClipboardListIcon, UserGroupIcon, CogIcon, UserIcon, ShieldCheckIcon, TagIcon, LayersIcon, ExclamationCircleIcon } from './icons';

type View = 'work-orders' | 'parts' | 'clients' | 'operations' | 'employees' | 'teams' | 'skills' | 'materials' | 'non-conformities';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, setIsOpen }) => {
  const navItems = [
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardListIcon },
    { id: 'parts', label: 'Parts', icon: CubeIcon },
    { id: 'clients', label: 'Clients', icon: UserGroupIcon },
    { id: 'operations', label: 'Operations', icon: CogIcon },
  ];

  const resourceItems = [
    { id: 'materials', label: 'Materials', icon: LayersIcon },
  ];

  const qualityItems = [
    { id: 'non-conformities', label: 'Non-Conformities', icon: ExclamationCircleIcon },
  ];

  const orgItems = [
    { id: 'employees', label: 'Employees', icon: UserIcon },
    { id: 'teams', label: 'Teams', icon: ShieldCheckIcon },
    { id: 'skills', label: 'Skills', icon: TagIcon },
  ];

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    setIsOpen(false);
  };

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:translate-x-0 md:flex-shrink-0`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold ml-3 text-slate-800">Hub Lists</h1>
        </div>
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Planning</p>
          <ul>
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id as View)}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Resources</p>
          <ul>
            {resourceItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id as View)}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quality</p>
          <ul>
            {qualityItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id as View)}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</p>
          <ul>
            {orgItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id as View)}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};
