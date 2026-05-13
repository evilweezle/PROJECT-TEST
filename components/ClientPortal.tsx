import React, { useState, useMemo } from 'react';
import { Client, Part, Assembly, Quote, QuoteItem, Material, Operation, Supplier, Subcontracting, BendingSettings, LaserSettings, TMItem } from '../types';
import { FileTextIcon, SendIcon, SaveIcon, UserGroupIcon, ShieldCheckIcon, AlertCircleIcon, CubeIcon, CheckCircleIcon, PlusIcon } from './icons';
import { PartForm, AssemblyForm } from './Forms';

interface ClientPortalProps {
  clients: Client[];
  parts: Part[];
  assemblies: Assembly[];
  tmItems: TMItem[];
  materials: Material[];
  operations: Operation[];
  suppliers: Supplier[];
  subcontractings: Subcontracting[];
  bendingSettings: BendingSettings;
  laserSettings: LaserSettings;
  quotes: Quote[];
  onAddQuote: (quote: Omit<Quote, 'id' | 'quoteNumber'>) => void;
  onUpdateQuote: (quote: Quote) => void;
  onAddPart: (part: Omit<Part, 'id'>) => void;
  onAddAssembly: (assembly: Omit<Assembly, 'id'>) => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  clients, parts, assemblies, tmItems, materials, operations, suppliers, subcontractings, bendingSettings, laserSettings, quotes, onAddQuote, onUpdateQuote, onAddPart, onAddAssembly
}) => {
  // Demo login selector
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  const client = clients.find(c => c.id === selectedClientId);

  const [activeTab, setActiveTab] = useState<'new' | 'library' | 'saved' | 'create-item'>('new');
  
  // Create item state
  const [newItemType, setNewItemType] = useState<'part' | 'assembly'>('part');

  // Filtered lists: only show items owned by this client
  const clientParts = useMemo(() => {
    if (!client) return [];
    return parts.filter(p => p.ownerId === client.id);
  }, [parts, client]);

  const clientAssemblies = useMemo(() => {
    if (!client) return [];
    return assemblies.filter(a => a.ownerId === client.id);
  }, [assemblies, client]);

  const clientTMItems = useMemo(() => {
    if (!client) return [];
    return (tmItems || []).filter(t => t.clientId === client.id);
  }, [tmItems, client]);

  // Combined for selection: client can select their own items only (strictly following request)
  const availableParts = clientParts;

  const handleCreatePart = (data: Omit<Part, "id">) => {
    if (!client) return;
    onAddPart({
      ...data,
      ownerId: client.id,
      isClientDraft: true
    });
    alert("Pièce créée dans votre banque privée.");
    setActiveTab('library');
  };

  const handleCreateAssembly = (data: Omit<Assembly, "id">) => {
    if (!client) return;
    onAddAssembly({
      ...data,
      ownerId: client.id,
      isClientDraft: true
    });
    alert("Assemblage créé dans votre banque privée.");
    setActiveTab('library');
  };

  const [draftItems, setDraftItems] = useState<{
    id: string;
    type: 'part' | 'assembly';
    quantity: number;
    hasPdf: boolean;
    hasDxf: boolean;
    hasStep: boolean;
  }[]>([]);

  const toggleItem = (itemId: string, type: 'part' | 'assembly') => {
    setDraftItems(prev => {
      const exists = prev.find(i => i.id === itemId);
      if (exists) {
        return prev.filter(i => i.id !== itemId);
      }
      return [...prev, { id: itemId, type, quantity: 1, hasPdf: false, hasDxf: false, hasStep: false }];
    });
  };

  const updateItem = (itemId: string, field: string, value: string | number | boolean) => {
    setDraftItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const submitQuote = (isDraft: boolean) => {
    if (!client || draftItems.length === 0) return;

    const items: QuoteItem[] = draftItems.map(di => {
      const entity = di.type === 'part' ? parts.find(p => p.id === di.id) : assemblies.find(a => a.id === di.id);
      return {
        type: di.type,
        id: di.id,
        quantity: di.quantity,
        unitPrice: 0, // Client doesn't set price
        name: entity?.name || 'Inconnu'
      };
    });

    const isComplete = draftItems.every(di => di.hasPdf && (di.hasDxf || di.hasStep));
    const qualityScore = isComplete ? 100 : 50;

    onAddQuote({
      name: `Soumission ${new Date().toLocaleDateString()}`,
      clientId: client.id,
      status: isDraft ? 'Draft' : 'Pending',
      date: new Date().toISOString().split('T')[0],
      items,
      totalAmount: 0, // Pending calculation
      source: 'client_portal',
      qualityScore,
      notes: isDraft ? 'Brouillon sauvegardé' : `Demande envoyée via le portail (Document complet: ${isComplete ? 'Oui' : 'Non'})`,
      clientDiscountApplied: client.currentDiscount || 0 // Assuming currentDiscount needs to be on client or calculated
    });

    setDraftItems([]);
    alert(isDraft ? 'Brouillon sauvegardé!' : 'Demande envoyée avec succès! Nos experts évalueront votre demande.');
    if (isDraft) setActiveTab('saved');
  };

  if (!client) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center animate-in fade-in">
        <UserGroupIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-800 mb-6">Connexion Portail Client</h2>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 mb-4 font-medium text-sm">Ceci est une simulation. Sélectionnez un client pour agir en son nom.</p>
          <select 
            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-bold"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">Sélectionnez un profil client...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.tier === 'AdvantagePlus' ? 'Avantage+' : 'Régulier'}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  const discount = Math.min(7, Math.floor((client.points || 0) / 100)); // Dynamic up to 7%
  const isAdvantagePlus = client.tier === 'AdvantagePlus';

  return (
    <div 
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in select-none"
      onCopy={e => { e.preventDefault(); alert("La copie est désactivée par mesure de sécurité."); }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header Profile Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheckIcon className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <span className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2 block">Bienvenue,</span>
            <h1 className="text-3xl font-black tracking-tight mb-1">{client.name}</h1>
            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${isAdvantagePlus ? 'bg-amber-400 text-amber-900' : 'bg-white/20 text-white'}`}>
              <ShieldCheckIcon className="w-4 h-4" />
              Membre {isAdvantagePlus ? 'Avantage+' : 'Régulier'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-2">Points Fidélité</div>
          <div className="text-5xl font-black text-slate-800 tracking-tighter">{client.points || 0}</div>
          <div className="text-xs text-slate-400 mt-2">Gagnez des points en fournissant des dossiers complets.</div>
        </div>

        <div className={`rounded-3xl p-6 border flex flex-col justify-center items-center text-center ${discount > 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`font-bold uppercase tracking-wider text-[10px] mb-2 ${discount > 0 ? 'text-green-600' : 'text-slate-500'}`}>Rabais Automatique</div>
          <div className={`text-5xl font-black tracking-tighter ${discount > 0 ? 'text-green-600' : 'text-slate-300'}`}>{discount}%</div>
          <div className={`text-xs mt-2 ${discount > 0 ? 'text-green-600/70' : 'text-slate-400'}`}>
            Applicable sur votre prochaine commande.
          </div>
        </div>
      </div>

      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 md:w-max">
        <button 
          onClick={() => setActiveTab('new')}
          className={`px-6 py-3 rounded-lg text-sm font-black transition-all ${activeTab === 'new' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Nouvelle Demande
        </button>
        <button 
          onClick={() => setActiveTab('library')}
          className={`px-6 py-3 rounded-lg text-sm font-black transition-all ${activeTab === 'library' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Bibliothèque d'items
        </button>
        <button 
          onClick={() => setActiveTab('create-item')}
          className={`px-6 py-3 rounded-lg text-sm font-black transition-all ${activeTab === 'create-item' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <PlusIcon className="w-4 h-4 inline mr-2" />
          Créer un Item
        </button>
        {isAdvantagePlus && (
          <button 
            onClick={() => setActiveTab('saved')}
            className={`px-6 py-3 rounded-lg text-sm font-black transition-all ${activeTab === 'saved' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Brouillons Sauvegardés
          </button>
        )}
      </div>

      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-4">1. Sélectionnez vos pièces</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {availableParts.map(part => {
                  const isSelected = draftItems.some(di => di.id === part.id);
                  return (
                    <div 
                      key={part.id}
                      onClick={() => toggleItem(part.id, 'part')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-800">{part.name}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{part.ownerId && part.ownerId !== 'FMI' ? 'Ma Pièce' : 'Standard'}</div>
                          <div className="text-xs text-slate-500 mt-1">{materials.find(m => m.id === part.materialId)?.description || 'Matériel non spécifié'}</div>
                        </div>
                        {isSelected && <CheckCircleIcon className="w-5 h-5 text-blue-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {draftItems.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-4">2. Complétez vos informations</h3>
                <div className="space-y-4">
                  {draftItems.map((item, idx) => {
                    const entity = item.type === 'part' ? parts.find(p => p.id === item.id) : assemblies.find(a => a.id === item.id);
                    return (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-slate-800">{entity?.name}</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider">{item.type}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* File Checkboxes - Demanding specific files */}
                          <div className="flex gap-2">
                            <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-colors ${item.hasPdf ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                              <FileTextIcon className="w-4 h-4 mb-1" />
                              <span className="text-[9px] font-bold">PDF</span>
                              <input type="checkbox" className="sr-only" checked={item.hasPdf} onChange={e => updateItem(item.id, 'hasPdf', e.target.checked)} />
                            </label>
                            <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-colors ${item.hasDxf ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                              <FileTextIcon className="w-4 h-4 mb-1" />
                              <span className="text-[9px] font-bold">DXF</span>
                              <input type="checkbox" className="sr-only" checked={item.hasDxf} onChange={e => updateItem(item.id, 'hasDxf', e.target.checked)} />
                            </label>
                            <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-colors ${item.hasStep ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                              <CubeIcon className="w-4 h-4 mb-1" />
                              <span className="text-[9px] font-bold">STEP</span>
                              <input type="checkbox" className="sr-only" checked={item.hasStep} onChange={e => updateItem(item.id, 'hasStep', e.target.checked)} />
                            </label>
                          </div>
                          <div className="w-24">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Qte</label>
                            <input 
                              type="number" 
                              min="1" 
                              value={item.quantity} 
                              onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500" 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-slate-800 text-white p-6 rounded-3xl sticky top-8 shadow-xl">
              <h3 className="text-lg font-black mb-4">Sommaire de la demande</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Items sélectionnés</span>
                  <span className="font-bold">{draftItems.length}</span>
                </div>
                
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex gap-2 items-start text-xs text-slate-300">
                    <AlertCircleIcon className="w-4 h-4 shrink-0 text-amber-400" />
                    <p>Fournissez les fichiers requis (PDF, DXF, STEP) pour chaque item afin d'accumuler des points et débloquer des rabais plus élevés.</p>
                  </div>
                </div>
              </div>

              {draftItems.length > 0 ? (
                <div className="space-y-3">
                  <button 
                    onClick={() => submitQuote(false)}
                    className="w-full bg-blue-500 text-white rounded-xl py-4 font-black flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                  >
                    <SendIcon className="w-5 h-5" />
                    Envoyer la demande
                  </button>
                  {isAdvantagePlus && (
                    <button 
                      onClick={() => submitQuote(true)}
                      className="w-full bg-slate-700 text-white rounded-xl py-4 font-black flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors"
                    >
                      <SaveIcon className="w-5 h-5" />
                      Sauvegarder
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-sm text-center italic py-4">
                  Sélectionnez au moins un item pour soumettre.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'create-item' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-800">Ajouter un item au dossier</h2>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              <button 
                type="button"
                onClick={() => setNewItemType('part')}
                className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${newItemType === 'part' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Pièce
              </button>
              <button 
                type="button"
                onClick={() => setNewItemType('assembly')}
                className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${newItemType === 'assembly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Assemblage
              </button>
            </div>
          </div>

          <div className="mt-4">
            {newItemType === 'part' ? (
              <PartForm 
                clients={[client]}
                materials={materials}
                operations={operations}
                suppliers={suppliers}
                subcontractings={subcontractings}
                bendingSettings={bendingSettings}
                laserSettings={laserSettings}
                onSubmit={handleCreatePart}
                onCancel={() => setActiveTab('library')}
              />
            ) : (
              <AssemblyForm 
                clients={[client]}
                parts={parts}
                assemblies={assemblies}
                operations={operations}
                materials={materials}
                suppliers={suppliers}
                subcontractings={subcontractings}
                bendingSettings={bendingSettings}
                laserSettings={laserSettings}
                onAddPart={onAddPart}
                onAddAssembly={onAddAssembly}
                onSubmit={handleCreateAssembly}
                onCancel={() => setActiveTab('library')}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'library' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800">Votre Bibliothèque d'items</h2>
            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase">
              {clientParts.length + clientAssemblies.length + clientTMItems.length} Items Privés
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Mes Pièces</h3>
              {clientParts.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-sm">
                  Aucune pièce privée. Créez-en une pour commencer.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {clientParts.map(p => (
                    <div key={p.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col justify-center items-center text-center group relative">
                      <CubeIcon className="w-8 h-8 text-indigo-300 mb-3" />
                      <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{materials.find(m => m.id === p.materialId)?.description || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Mes Assemblages</h3>
              {clientAssemblies.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-sm">
                  Aucun assemblage privé.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {clientAssemblies.map(a => (
                    <div key={a.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col justify-center items-center text-center group">
                      <UserGroupIcon className="w-8 h-8 text-indigo-300 mb-3" />
                      <div className="font-bold text-slate-800 text-sm">{a.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Mes Pièces Temps-Matériel</h3>
              {clientTMItems.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-sm">
                  Aucune pièce temps-matériel privée.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {clientTMItems.map(t => (
                    <div key={t.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col justify-center items-center text-center group">
                      <FileTextIcon className="w-8 h-8 text-indigo-300 mb-3" />
                      <div className="font-bold text-slate-800 text-sm">{t.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{t.description || 'Sans description'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-800 mb-6">Brouillons Sauvegardés (Avantage+)</h2>
          {quotes.filter(q => q.clientId === client.id && q.status === 'Draft' && q.source === 'client_portal').length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic">Aucun brouillon sauvegardé.</div>
          ) : (
            <div className="space-y-4">
              {quotes.filter(q => q.clientId === client.id && q.status === 'Draft' && q.source === 'client_portal').map(q => (
                <div key={q.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50">
                  <div>
                    <h4 className="font-bold text-slate-800">{q.name}</h4>
                    <p className="text-xs text-slate-500">{new Date(q.date).toLocaleDateString()} - {q.items.length} item(s)</p>
                  </div>
                  <button 
                    onClick={() => {
                      onUpdateQuote({...q, status: 'Pending'});
                      alert("Demande envoyée!");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700"
                  >
                    <SendIcon className="w-4 h-4" /> Envoyer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
