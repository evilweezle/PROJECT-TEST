import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CubeIcon, ClipboardListIcon, UserGroupIcon, CogIcon, UserIcon, ShieldCheckIcon, TagIcon, LayersIcon, ExclamationCircleIcon, FileSpreadsheetIcon, XIcon, ChartBarIcon, CalendarIcon, ClockIcon, MailIcon, SparklesIcon } from './icons';
import { UserProfile } from '../types';

type View = 'shopfloor' | 'schedule' | 'mindmap' | 'client-portal' | 'employee-portal' | 'app-structure' | 'work-orders' | 'quotes' | 'timesheets' | 'parts' | 'assemblies' | 'clients' | 'operations' | 'employees' | 'teams' | 'skills' | 'materials' | 'non-conformities' | 'import' | 'settings' | 'subcontractings' | 'delivery-notes' | 'invoices' | 'purchases' | 'suppliers' | 'inbox' | 'showcase' | 'ia-config' | 'users' | 'tm-items' | 'production-dashboard' | 'performance-dashboard' | 'inventory';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  profile?: UserProfile | null;
  simulatedRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, setIsOpen, profile, simulatedRole }) => {
  const role = profile?.roleLevel || 100;
  
  const isSales = role === 200 || role === 201 || simulatedRole === 'sales' || simulatedRole === 'sales-director';

  // Simulated Roles override logic
  if (isSales) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden" />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col shadow-xl md:shadow-none md:relative"
            >
              <div className="h-16 flex items-center px-6 border-b border-slate-200 flex-shrink-0 justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-3 flex flex-col leading-none">
                    <span className="text-xs font-black text-indigo-600 tracking-tighter">ÉQUIPE</span>
                    <span className="text-xl font-black text-slate-900 tracking-tighter">VENTES</span>
                  </div>
                </div>
              </div>
              <nav className="flex-1 px-4 py-4 overflow-y-auto">
                <ul className="space-y-1">
                  {(role >= 201 || simulatedRole === 'sales-director') && (
                    <li>
                      <button onClick={() => { setCurrentView('sales-director'); setIsOpen(false); }} className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${currentView === 'sales-director' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <UserGroupIcon className={`w-5 h-5 mr-3 ${currentView === 'sales-director' ? 'text-white' : 'text-slate-400'}`} /> Directeur des Ventes
                      </button>
                    </li>
                  )}
                  <li>
                    <button onClick={() => { setCurrentView('sales-portal'); setIsOpen(false); }} className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${currentView === 'sales-portal' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <ChartBarIcon className={`w-5 h-5 mr-3 ${currentView === 'sales-portal' ? 'text-white' : 'text-slate-400'}`} /> Dashboard Ventes
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { setCurrentView('quotes'); setIsOpen(false); }} className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${currentView === 'quotes' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <ClipboardListIcon className={`w-5 h-5 mr-3 ${currentView === 'quotes' ? 'text-white' : 'text-slate-400'}`} /> Soumissions
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { setCurrentView('parts'); setIsOpen(false); }} className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${currentView === 'parts' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <CubeIcon className={`w-5 h-5 mr-3 ${currentView === 'parts' ? 'text-white' : 'text-slate-400'}`} /> Pièces
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { setCurrentView('assemblies'); setIsOpen(false); }} className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${currentView === 'assemblies' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <LayersIcon className={`w-5 h-5 mr-3 ${currentView === 'assemblies' ? 'text-white' : 'text-slate-400'}`} /> Assemblages
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { setCurrentView('tm-items'); setIsOpen(false); }} className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${currentView === 'tm-items' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <ClipboardListIcon className={`w-5 h-5 mr-3 ${currentView === 'tm-items' ? 'text-white' : 'text-slate-400'}`} /> Items T-M
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { setCurrentView('clients'); setIsOpen(false); }} className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${currentView === 'clients' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <UserGroupIcon className={`w-5 h-5 mr-3 ${currentView === 'clients' ? 'text-white' : 'text-slate-400'}`} /> Clients
                    </button>
                  </li>
                </ul>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  const isProductionOnly = role === 300 || simulatedRole === 'shopfloor';

  const dashboardItems = isProductionOnly ? [
    { id: 'production-dashboard', label: 'Mon Espace Web', icon: ChartBarIcon },
  ] : [
    { id: 'shopfloor', label: 'Shopfloor Dashboard', icon: ChartBarIcon },
    { id: 'schedule', label: 'Employee Schedule', icon: CalendarIcon },
    { id: 'mindmap', label: 'Data Mindmap', icon: LayersIcon },
    { id: 'app-structure', label: 'App Structure', icon: LayersIcon },
    { id: 'client-portal', label: 'Portail Client', icon: UserGroupIcon },
    { id: 'employee-portal', label: 'Portail Employé', icon: UserIcon },
    ...(role >= 400 ? [{ id: 'performance-dashboard', label: 'Efficacité (Gestion)', icon: ChartBarIcon }] : []),
  ];

  const navItems = isProductionOnly ? [] : [
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardListIcon },
    { id: 'quotes', label: 'Soumissions', icon: ClipboardListIcon },
    { id: 'inbox', label: 'AI Inbound', icon: MailIcon },
    { id: 'timesheets', label: 'Feuilles de temps', icon: ClockIcon },
    { id: 'parts', label: 'Parts', icon: CubeIcon },
    { id: 'assemblies', label: 'Assemblages', icon: LayersIcon },
    { id: 'tm-items', label: 'Soumissions T-M', icon: ClipboardListIcon },
    { id: 'subcontractings', label: 'Sous-traitance', icon: LayersIcon },
    { id: 'delivery-notes', label: 'Bons de livraison', icon: ClipboardListIcon },
    { id: 'invoices', label: 'Factures', icon: ClipboardListIcon },
    { id: 'purchases', label: 'Achats', icon: ClipboardListIcon },
    { id: 'suppliers', label: 'Fournisseurs', icon: UserGroupIcon },
    { id: 'clients', label: 'Clients', icon: UserGroupIcon },
    { id: 'operations', label: 'Operations', icon: CogIcon },
  ];

  const resourceItems = isProductionOnly ? [] : [
    { id: 'inventory', label: 'Inventaire', icon: LayersIcon },
    { id: 'materials', label: 'Materials', icon: LayersIcon },
  ];

  const qualityItems = isProductionOnly ? [] : [
    { id: 'non-conformities', label: 'Non-Conformities', icon: ExclamationCircleIcon },
  ];

  const orgItems = isProductionOnly ? [] : [
    { id: 'employees', label: 'Employees', icon: UserIcon },
    { id: 'teams', label: 'Teams', icon: ShieldCheckIcon },
    { id: 'skills', label: 'Skills', icon: TagIcon },
  ];

  const toolItems = isProductionOnly ? [] : [
    { id: 'import', label: 'Import Data', icon: FileSpreadsheetIcon },
    { id: 'showcase', label: 'Showcase IA', icon: SparklesIcon },
    { id: 'ia-config', label: 'Configuration IA', icon: CogIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon },
    { id: 'users', label: 'Utilisateurs / Accès', icon: UserGroupIcon },
  ];

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
            />
            
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col shadow-xl md:shadow-none md:relative"
            >
              <div className="h-16 flex items-center px-6 border-b border-slate-200 flex-shrink-0 justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-fmi-red rounded-lg flex items-center justify-center shadow-lg shadow-red-200">
                    <ShieldCheckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-3 flex flex-col leading-none">
                    <span className="text-xs font-black text-fmi-red tracking-tighter">GROUPE</span>
                    <span className="text-xl font-black text-slate-900 tracking-tighter">FMI</span>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 overflow-y-auto custom-scrollbar">
                <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dashboard</p>
                <ul className="space-y-1">
                  {dashboardItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.id as View)}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          currentView === item.id
                            ? 'bg-fmi-red text-white shadow-md shadow-red-200'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-white' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Planning</p>
                <ul className="space-y-1">
                  {navItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.id as View)}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          currentView === item.id
                            ? 'bg-fmi-red text-white shadow-md shadow-red-200'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-white' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Resources</p>
                <ul className="space-y-1">
                  {resourceItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.id as View)}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          currentView === item.id
                            ? 'bg-fmi-red text-white shadow-md shadow-red-200'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-white' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quality</p>
                <ul className="space-y-1">
                  {qualityItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.id as View)}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          currentView === item.id
                            ? 'bg-fmi-red text-white shadow-md shadow-red-200'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-white' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</p>
                <ul className="space-y-1">
                  {orgItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.id as View)}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          currentView === item.id
                            ? 'bg-fmi-red text-white shadow-md shadow-red-200'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-white' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tools</p>
                <ul className="space-y-1">
                  {toolItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.id as View)}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          currentView === item.id
                            ? 'bg-fmi-red text-white shadow-md shadow-red-200'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-white' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</p>
                <div className="px-4 py-2 text-[10px] text-slate-500 leading-relaxed font-mono">
                  8640, avenue Émilien-Letarte<br/>
                  St-Hyacinthe (Québec) J2R 0A3
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
