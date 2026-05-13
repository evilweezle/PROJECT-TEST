import React, { useState, useMemo } from 'react';
import { Quote, Client, WorkOrder } from '../types';
import { FileTextIcon, PlusIcon, UserGroupIcon, MicIcon, FilterIcon, SearchIcon, SparklesIcon, ChartBarIcon, AlertCircleIcon } from './icons';

interface SalesDirectorPortalViewProps {
  quotes: Quote[];
  clients: Client[];
  workOrders: WorkOrder[];
  onCreateQuote: () => void;
  onEditQuote: (q: Quote) => void;
  onOpenVoiceChat: () => void;
  onOpenAiQuoteGenerator: () => void;
}

export const SalesDirectorPortalView: React.FC<SalesDirectorPortalViewProps> = ({
  quotes,
  clients,
  onCreateQuote,
  onEditQuote,
  onOpenVoiceChat,
  onOpenAiQuoteGenerator
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string>('all');
  
  const activeQuotes = quotes.filter(q => q.status !== 'Rejected'); // Include approved ones for director's overview or general tracking
  
  // Get unique salespersons (assuming salesPersonId is just a string or name for now, in a real app this would be a user object)
  const salesPersons = useMemo(() => {
    const ids = Array.from(new Set(quotes.map(q => q.salesPersonId).filter(Boolean))) as string[];
    return ids.map(id => ({ id, name: id === 'user_1' ? "Karl Lecours" : `Vendeur ${id}` }));
  }, [quotes]);
  
  const filteredQuotes = activeQuotes.filter(q => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (q.quoteNumber || '').toLowerCase().includes(searchLower) || 
                          (q.name || '').toLowerCase().includes(searchLower);
    const matchesClient = selectedClientId === 'all' || q.clientId === selectedClientId;
    const matchesSalesPerson = selectedSalesPersonId === 'all' || q.salesPersonId === selectedSalesPersonId;
    return matchesSearch && matchesClient && matchesSalesPerson;
  });
  
  const activeOnlyForPipeline = filteredQuotes.filter(q => q.status !== 'Approved');
  const totalPipeline = activeOnlyForPipeline.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  
  // Total sales this month (approved)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const wonQuotes = filteredQuotes.filter(q => {
    const d = new Date(q.date);
    return q.status === 'Approved' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalWonThisMonth = wonQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

  const recentQuotes = filteredQuotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  
  const [now] = useState(() => Date.now());
  
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 w-full h-full md:h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 mt-14 md:mt-0">
          <div className="mb-4 md:mb-0">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
              Directeur des Ventes
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">Gérez le département, surveillez les pipelines des vendeurs et la conversion globale.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <button
              onClick={onOpenVoiceChat}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto text-sm md:text-base"
            >
              <MicIcon className="w-4 h-4 md:w-5 md:h-5" />
              Jarviss Manager AI
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
          <div className="relative w-full md:w-80 text-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher par # de job, description..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative w-full md:w-56 text-sm">
            <select
              value={selectedSalesPersonId}
              onChange={e => setSelectedSalesPersonId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            >
              <option value="all">Tous les Vendeurs</option>
              {salesPersons.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
            <FilterIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative w-full md:w-56 text-sm">
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
             <div className="text-slate-500 text-xs md:text-sm font-medium">Pipeline (Actif)</div>
             <div className="text-2xl md:text-3xl font-bold text-indigo-600 mt-1">${totalPipeline.toFixed(0)}</div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-xs md:text-sm font-medium">Ventes (Ce mois)</div>
             <div className="text-2xl md:text-3xl font-bold text-emerald-600 mt-1">${totalWonThisMonth.toFixed(0)}</div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-xs md:text-sm font-medium">Soumissions Actives</div>
             <div className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{activeOnlyForPipeline.length}</div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-xs md:text-sm font-medium">Conversion {selectedSalesPersonId !== 'all' && '(Vendeur)'}</div>
             <div className="text-2xl md:text-3xl font-bold text-emerald-600 mt-1">
               {filteredQuotes.length > 0 ? Math.round((wonQuotes.length / filteredQuotes.length) * 100) : 0}%
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
                  Activité Récente
                </h2>
                <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-md hover:bg-slate-100 transition-colors">Voir tout</button>
              </div>
              <div className="divide-y divide-slate-100">
                {recentQuotes.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">Aucune soumission.</div>
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
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                              ${quote.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'} border`}>
                              {quote.status}
                            </span>
                            {quote.salesPersonId && selectedSalesPersonId === 'all' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {quote.salesPersonId === 'user_1' ? "Karl Lecours" : `Vendeur ${quote.salesPersonId}`}
                              </span>
                            )}
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
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <UserGroupIcon className="w-4 h-4 md:w-5 md:h-5 text-slate-500"/>
                  Performance Équipe (Mois)
                </h3>
              </div>
              <div className="p-4 space-y-4">
                 {salesPersons.map(sp => {
                   const qs = wonQuotes.filter(q => q.salesPersonId === sp.id && q.status === 'Approved'); // Focus on this month's won
                   const won = qs.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
                   const pipeQs = activeOnlyForPipeline.filter(q => q.salesPersonId === sp.id);
                   const pipe = pipeQs.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
                   const target = 50000; // Objectif par vendeur
                   const progress = Math.min((won / target) * 100, 100);
                   return (
                     <div key={sp.id} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-800">{sp.name}</span>
                          <span className="text-xs font-medium text-emerald-600">${won.toFixed(0)} / ${target.toFixed(0)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                           <div className={`h-full ${progress >= 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>Pipeline cible: ${pipe.toFixed(0)}</span>
                          <span>{progress.toFixed(0)}% de l'obj.</span>
                        </div>
                     </div>
                   );
                 })}
                 {salesPersons.length === 0 && (
                   <span className="text-sm text-slate-500">Aucune donnée de performance.</span>
                 )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4 md:w-5 md:h-5 text-slate-500"/>
                  Top Clients (Actifs)
                </h3>
              </div>
              <div className="p-4 divide-y divide-slate-100">
                {Object.entries(
                  activeOnlyForPipeline.reduce((acc, q) => {
                    const c = clients.find(cl => cl.id === q.clientId);
                    const name = c ? c.name : 'Inconnu';
                    acc[name] = (acc[name] || 0) + (q.totalAmount || 0);
                    return acc;
                  }, {} as Record<string, number>)
                )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, amount], idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center">
                    <span className="text-sm text-slate-700 truncate mr-2">{name}</span>
                    <span className="text-sm font-bold text-slate-800 whitespace-nowrap">${amount.toFixed(0)}</span>
                  </div>
                ))}
                {activeOnlyForPipeline.length === 0 && (
                  <span className="text-sm text-slate-500">Aucun client actif.</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-t-4 border-t-amber-400">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 md:w-5 md:h-5 text-amber-500"/>
                  Alertes / Dormantes
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {activeOnlyForPipeline
                  .filter(q => (now - new Date(q.date).getTime()) > 30 * 24 * 60 * 60 * 1000)
                  .slice(0, 4)
                  .map(q => (
                    <div key={q.id} className="text-sm flex flex-col gap-1 border border-amber-100 bg-amber-50 rounded p-2">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-800 cursor-pointer hover:underline" onClick={() => onEditQuote(q)}>{q.quoteNumber || q.name}</span>
                        <span className="text-xs font-bold text-amber-700">${(q.totalAmount || 0).toFixed(0)}</span>
                      </div>
                      <span className="text-xs text-slate-500">Sans réponse depuis &gt; 30 jours ({q.salesPersonId === 'user_1' ? 'Karl' : q.salesPersonId})</span>
                    </div>
                ))}
                {activeOnlyForPipeline.filter(q => (now - new Date(q.date).getTime()) > 30 * 24 * 60 * 60 * 1000).length === 0 && (
                  <span className="text-sm text-slate-500">Aucune soumission dormante.</span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
