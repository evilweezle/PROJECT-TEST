import React, { useState, useEffect } from 'react';
import { Quote, Client, WorkOrder } from '../types';
import { FileTextIcon, PlusIcon, SparklesIcon, CalendarIcon, UserGroupIcon, CheckCircleIcon, MicIcon, FilterIcon, SearchIcon, TrashIcon } from './icons';

interface SalesPortalViewProps {
  quotes: Quote[];
  clients: Client[];
  workOrders: WorkOrder[];
  onCreateQuote: () => void;
  onEditQuote: (q: Quote) => void;
  onOpenVoiceChat: () => void;
  onOpenAiQuoteGenerator: () => void;
}

export const SalesPortalView: React.FC<SalesPortalViewProps> = ({
  quotes,
  clients,
  // workOrders, // kept in props for future expansion
  onCreateQuote,
  onEditQuote,
  onOpenVoiceChat,
  onOpenAiQuoteGenerator
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  
  const [tasks, setTasks] = useState<{id: string, title: string, completed: boolean}[]>(() => {
    const saved = localStorage.getItem('sales_portal_tasks');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', title: "Relancer Acme Corp pour Soumission #1004", completed: false },
      { id: '2', title: "Vérifier prix Inox 304 chez fournisseur", completed: false },
      { id: '3', title: "Appel avec Jean de TechFab à 14:00", completed: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem('sales_portal_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const handleAdd = (e: CustomEvent) => {
      setTasks(prev => [...prev, { id: Date.now().toString(), title: e.detail.text, completed: false }]);
    };
    const handleRemove = (e: CustomEvent) => {
      setTasks(prev => prev.filter(t => t.id !== e.detail.id && !t.title.toLowerCase().includes(e.detail.text?.toLowerCase())));
    };
    const handleComplete = (e: CustomEvent) => {
       setTasks(prev => prev.map(t => t.id === e.detail.id || t.title.toLowerCase().includes(e.detail.text?.toLowerCase()) ? { ...t, completed: true } : t));
    }
    
    window.addEventListener('add_task', handleAdd as EventListener);
    window.addEventListener('remove_task', handleRemove as EventListener);
    window.addEventListener('complete_task', handleComplete as EventListener);
    return () => {
      window.removeEventListener('add_task', handleAdd as EventListener);
      window.removeEventListener('remove_task', handleRemove as EventListener);
      window.removeEventListener('complete_task', handleComplete as EventListener);
    };
  }, []);
  
  // In a real app we'd filter by quotes.salesPersonId === currentSalesPersonId, 
  // but for now let's assume we show the active user's quotes.
  // Note: a Sales Director view would not have this restriction.
  const activeQuotes = quotes.filter(q => q.status !== 'Approved' && q.status !== 'Rejected');
  
  const filteredQuotes = activeQuotes.filter(q => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (q.quoteNumber || '').toLowerCase().includes(searchLower) || 
                          (q.name || '').toLowerCase().includes(searchLower);
    const matchesClient = selectedClientId === 'all' || q.clientId === selectedClientId;
    return matchesSearch && matchesClient;
  });
  
  const totalPipeline = filteredQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const recentQuotes = filteredQuotes.slice(0, 10);
  
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 w-full h-full md:h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 mt-14 md:mt-0">
          <div className="mb-4 md:mb-0">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
              Tableau de bord Vendeur
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">Gérez vos propres soumissions, vos clients et vos KPIs de vente.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <button
              onClick={onOpenVoiceChat}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto text-sm md:text-base"
            >
              <MicIcon className="w-4 h-4 md:w-5 md:h-5" />
              Jarviss Vendeur AI
            </button>
            <button
              onClick={onOpenAiQuoteGenerator}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto text-sm md:text-base"
            >
              <SparklesIcon className="w-4 h-4 md:w-5 md:h-5" />
              Soumission IA
            </button>
            <button
              onClick={onCreateQuote}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto text-sm md:text-base"
            >
              <PlusIcon className="w-4 h-4 md:w-5 md:h-5" />
              Nouvelle
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-96 text-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher par # de job, description..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative w-full md:w-64 text-sm">
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            >
              <option value="all">Tous les clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <FilterIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Dashboard KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-xs md:text-sm font-medium">Vos Soumissions</div>
             <div className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{filteredQuotes.length}</div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-xs md:text-sm font-medium">Votre Pipeline</div>
             <div className="text-2xl md:text-3xl font-bold text-indigo-600 mt-1">${totalPipeline.toFixed(0)}</div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-xs md:text-sm font-medium">Clients Actifs</div>
             <div className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{clients.length}</div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-xs md:text-sm font-medium">Conversion</div>
             <div className="text-2xl md:text-3xl font-bold text-emerald-600 mt-1">
               {quotes.length > 0 ? Math.round((quotes.filter(q => q.status === 'Approved').length / quotes.length) * 100) : 0}%
             </div>
          </div>
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quotes List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileTextIcon className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  Soumissions en cours
                </h2>
                <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-md hover:bg-slate-100 transition-colors">Voir tout</button>
              </div>
              <div className="divide-y divide-slate-100">
                {recentQuotes.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">Aucune soumission active.</div>
                ) : (
                  recentQuotes.map(quote => {
                    const client = clients.find(c => c.id === quote.clientId);
                    return (
                      <div key={quote.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 hover:underline transition-colors" onClick={() => onEditQuote(quote)}>
                              {quote.quoteNumber || quote.name || 'Soumission sans nom'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200`}>
                              {quote.status}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <span>Client: {client?.name || 'Inconnu'}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">Modifié: {new Date(quote.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end w-full sm:w-auto justify-between sm:justify-start">
                          <div className="font-bold text-slate-800 text-lg sm:text-base">${(quote.totalAmount || 0).toFixed(2)}</div>
                          <button 
                            onClick={() => onEditQuote(quote)}
                            className="text-indigo-600 text-sm font-medium hover:text-indigo-800 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 sm:bg-transparent px-3 py-1 sm:px-0 sm:py-0 rounded-md sm:rounded-none mt-0 sm:mt-1 border border-indigo-100 sm:border-transparent"
                          >
                            Ouvrir &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* Quick Actions / Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => {}}
                className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex items-start gap-4 group"
              >
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors"><UserGroupIcon className="w-5 h-5 md:w-6 md:h-6" /></div>
                <div>
                  <div className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">Nouveau Client</div>
                  <div className="text-sm text-slate-500 mt-1">Créer un profil</div>
                </div>
              </button>
              <button 
                onClick={() => {}}
                className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all text-left flex items-start gap-4 group"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors"><CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6" /></div>
                <div>
                  <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">Relances</div>
                  <div className="text-sm text-slate-500 mt-1">Soumissions en attente</div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Sidebar - AI Assistant */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-5 md:p-6 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                 <MicIcon className="w-24 h-24 md:w-32 md:h-32 text-indigo-900" />
               </div>
               <h3 className="font-bold text-indigo-900 text-lg md:text-xl relative z-10">Jarviss Vendeur</h3>
               <p className="text-sm text-indigo-700 mt-2 relative z-10 max-w-[200px] md:max-w-none leading-relaxed">
                 Je suis conçu pour vous aider à rédiger des soumissions, chercher des prix de matières et structurer des pièces complexes.
               </p>
               <button 
                 onClick={onOpenVoiceChat}
                 className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg text-white py-3 px-4 rounded-xl font-medium shadow-md flex items-center justify-center gap-2 relative z-10 transition-all active:scale-[0.98]"
               >
                 <MicIcon className="w-5 h-5"/> Démarrer Voice Chat
               </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-slate-500"/>
                  Rappels & Tâches
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-4">Aucune tâche ou rappel pour le moment.</div>
                ) : tasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-3 group">
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        checked={task.completed}
                        onChange={(e) => {
                          if(e.target.checked) setTasks(prev => prev.map(t => t.id === task.id ? {...t, completed: true} : t));
                          else setTasks(prev => prev.map(t => t.id === task.id ? {...t, completed: false} : t));
                        }}
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0" 
                      />
                      <span className={`text-sm cursor-pointer ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-slate-900'}`}>{task.title}</span>
                    </div>
                    <button 
                      onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem('newTask') as HTMLInputElement;
                    if (input.value.trim()) {
                      setTasks(prev => [...prev, { id: Date.now().toString(), title: input.value.trim(), completed: false }]);
                      input.value = '';
                    }
                  }}
                  className="mt-4 pt-4 border-t border-slate-100 flex gap-2"
                >
                  <input 
                    name="newTask"
                    type="text" 
                    placeholder="Ajouter une tâche..." 
                    className="flex-1 text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button type="submit" className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors">
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
