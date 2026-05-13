import React, { useState, useRef, useEffect } from 'react';
import { TMItem, TMItemMaterial, TMItemOperation, Material, Operation, Subcontracting, ProfitSettings, Supplier, Client } from '../types';
import { JarvissVisionScanner } from './JarvissVisionScanner';

interface TMItemFormProps {
  initialData: TMItem | null;
  materials: Material[];
  operations: Operation[];
  subcontractings: Subcontracting[];
  suppliers: Supplier[];
  clients: Client[];
  profitSettings: ProfitSettings;
  onSave: (data: Omit<TMItem, 'id'>) => void;
  onCancel: () => void;
}

export const TMItemForm: React.FC<TMItemFormProps> = ({ initialData, materials, operations, subcontractings, suppliers, clients, profitSettings, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<TMItem, 'id'>>(initialData || {
    name: '',
    description: '',
    notes: '',
    materials: [],
    operations: [],
    subcontractings: [],
    purchases: [],
    files: []
  });

  const [isMobileRecapExpanded, setIsMobileRecapExpanded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      setFormData(prev => {
        const next = { ...prev };
        if (data.name) next.name = data.name;
        if (data.description) next.description = data.description;
        
        if (data.add_materials) {
           const newMaterials = data.add_materials.map((m: {materialId?: string, quantity?: number, type?: string}) => ({
             id: Math.random().toString(),
             materialId: m.materialId || '',
             quantity: m.quantity || 1,
             type: m.type || ''
           }));
           next.materials = [...next.materials, ...newMaterials];
        }

        if (data.add_operations) {
           const newOperations = data.add_operations.map((o: {operationId?: string, estimatedTimeHours?: number}) => ({
             id: Math.random().toString(),
             operationId: o.operationId || '',
             estimatedTimeHours: o.estimatedTimeHours || 1
           }));
           next.operations = [...next.operations, ...newOperations];
        }

        return next;
      });
    };

    window.addEventListener('update_tm_form', handleUpdate);
    return () => window.removeEventListener('update_tm_form', handleUpdate);
  }, []);

  // Helper to calculate material cost based on dimensions
  const calcMaterialCost = (m: TMItemMaterial) => {
    const mat = materials.find(x => x.id === m.materialId);
    if (!mat) return 0;

    const qty = m.quantity || 1;
    if (mat.type?.toLowerCase().includes('plaque') || mat.type?.toLowerCase().includes('sheet')) {
      const w = m.width || 0;
      const l = m.length || 0;
      return qty * (w * l / 144) * mat.costPerSqFt;
    } else if (mat.type?.toLowerCase().includes('tube') || mat.type?.toLowerCase().includes('profile')) {
      const l = m.length || 0;
      return qty * (l / 12) * mat.costPerLinearFt;
    } else if (m.weight) {
      return qty * m.weight * mat.costPerLb;
    }
    return 0;
  };

  const calcOperationCost = (o: TMItemOperation) => {
    const op = operations.find(x => x.id === o.operationId);
    return op ? o.estimatedTimeHours * op.rate : 0;
  };

  const getSubPurchaseMargin = (cost: number) => {
    if (cost <= 1000) return (profitSettings?.subcontractingUnder1000Margin || 30) / 100;
    if (cost <= 4999) return (profitSettings?.subcontractingUnder5000Margin || 25) / 100;
    return (profitSettings?.subcontractingOver5000Margin || 20) / 100;
  };

  // Summaries
  const totalMaterialCost = formData.materials.reduce((sum, m) => sum + calcMaterialCost(m), 0);
  const totalMaterialSell = totalMaterialCost * (1 + (profitSettings?.materialMargin || 30) / 100);

  const totalOperationCost = formData.operations.reduce((sum, o) => sum + calcOperationCost(o), 0);
  const totalOperationSell = totalOperationCost * (1 + (profitSettings?.operationMargin || 10) / 100);

  const totalSubCost = formData.subcontractings.reduce((sum, s) => sum + s.globalPrice, 0);
  const totalSubSell = formData.subcontractings.reduce((sum, s) => sum + s.globalPrice * (1 + getSubPurchaseMargin(s.globalPrice)), 0);

  const totalPurCost = formData.purchases.reduce((sum, p) => sum + p.globalPrice, 0);
  const totalPurSell = formData.purchases.reduce((sum, p) => sum + p.globalPrice * (1 + getSubPurchaseMargin(p.globalPrice)), 0);

  const totalCost = totalMaterialCost + totalOperationCost + totalSubCost + totalPurCost;
  const totalSell = totalMaterialSell + totalOperationSell + totalSubSell + totalPurSell;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setFormData(prev => ({
          ...prev,
          files: [...prev.files, { id: Math.random().toString(), name: file.name, base64, type: file.type }]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden">
      {/* Editor Side */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Éditeur Temps-Matériel (T-M)
            <button 
              onClick={() => {
                const materialsList = materials.map(m => ({id: m.id, desc: m.description, type: m.type})).slice(0, 50); // limit payload size slightly if too big
                const operationsList = operations.map(o => ({id: o.id, name: o.name}));
                window.dispatchEvent(new CustomEvent('openGeminiLive', { detail: { 
                  toggle: true, 
                  instruction: `Tu es Jarviss, un expert sénior en ingénierie mécanique et en soumission de type Temps-Matériel (T-M). 
AUCUN HUMOUR N'EST TOLÉRÉ. RÉPONSES CONCRÈTES, CLAIRES ET PROFESSIONNELLES.
L'utilisateur est en train de créer une soumission Budgétaire T-M. 
Conseille-le sur les informations manquantes (matière, traitement de surface, tolérance). 
Fais des suggestions mécaniques concrètes sans rien inventer.
Tu as accès à l'outil 'update_tm_form' pour AJUSTER EN TEMPS RÉEL le formulaire de l'utilisateur. 
Lorsqu'il te donne des détails comme 'ajoute du stainless 304', 'j'ai besoin d'une plaque d'acier', ou 'ajoute l'opération soudure 2 heures', UTILISE L'OUTIL update_tm_form pour mettre à jour sa vue ! 

Liste d'opérations disponibles (ID et Nom. Utilise ces ID exacts): ${JSON.stringify(operationsList)}.
Liste partielle de matières dispo (ID et Description et Type. Utilise ces ID/Type exacts): ${JSON.stringify(materialsList)}` 
                }}));
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold gap-2 shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              Jarviss Expert T-M
            </button>
          </h2>
          <div className="space-x-4">
            <button onClick={onCancel} className="text-slate-500 hover:text-slate-800">Retour</button>
            <button onClick={() => onSave(formData)} className="bg-blue-600 text-white px-4 py-2 rounded">Sauvegarder</button>
          </div>
        </div>

        <div className="bg-white p-4 shadow-sm rounded-lg space-y-4">
          <input className="w-full text-xl font-bold border-b border-slate-200 focus:outline-none focus:border-blue-500 pb-2" placeholder="Nom du projet/article" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">MÉTA-DONNÉES</label>
              <textarea className="w-full text-sm border p-2 rounded focus:outline-none focus:border-blue-500" placeholder="Description courte" rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">CLIENT ASSOCIÉ</label>
              <select className="w-full text-sm border p-2 rounded focus:outline-none focus:border-blue-500 bg-slate-50 appearance-none" value={formData.clientId || ''} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                <option value="">-- Aucun client (Générique) --</option>
                {clients?.map((c: Client) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Matériaux */}
        <div className="bg-white p-4 shadow-sm rounded-lg">
          <h3 className="font-bold border-b pb-2 mb-4">Matière Première</h3>
          {formData.materials.map((m, idx) => {
             const selectedMat = materials.find(x => x.id === m.materialId);
             
             // Cascading logic:
             // 1. Types available
             const availableTypes = Array.from(new Set(materials.map(mat => mat.type))).sort();
             
             // 2. Families available for selected type
             const availableFamilies = Array.from(new Set(
               materials
                .filter(mat => !m.type || mat.type === m.type)
                .map(mat => mat.materialType)
             )).sort();

             // 3. Specific materials available for selected type + family
             // Better: if we haven't picked a material yet, we use the active filters
             // Let's use a local mapping or just derive from current materialId if set
             const currentMatFamily = selectedMat?.materialType || '';
             
             const specs = materials.filter(mat => 
                (!m.type || mat.type === m.type) && 
                (!currentMatFamily || mat.materialType === currentMatFamily)
             ).sort((a,b) => a.thickness - b.thickness || a.description.localeCompare(b.description));

             const isSheet = selectedMat?.type?.toLowerCase().includes('plaque') || selectedMat?.type?.toLowerCase().includes('sheet');
             const isProfile = selectedMat?.type?.toLowerCase().includes('tube') || selectedMat?.type?.toLowerCase().includes('profile');
             const isVolume = !isSheet && !isProfile && selectedMat;

             return (
               <div key={m.id} className="bg-slate-50 p-3 rounded mb-4 border-l-4 border-l-blue-500 border border-slate-200 shadow-sm transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">1. Type de format</label>
                      <select className="w-full border p-1.5 rounded text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={m.type || ''} onChange={e => {
                        const newM = [...formData.materials];
                        newM[idx].type = e.target.value;
                        newM[idx].materialId = '';
                        setFormData({...formData, materials: newM});
                      }}>
                        <option value="">-- Choisir Type --</option>
                        {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">2. Famille / Matière</label>
                      <select 
                        disabled={!m.type}
                        className="w-full border p-1.5 rounded text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={currentMatFamily} 
                        onChange={e => {
                          const newM = [...formData.materials];
                          // To "select" a family without selecting an ID yet, we just filter the next list.
                          // But materialId must point to a real material. 
                          // We'll just reset the materialId if they change family.
                          newM[idx].materialId = ''; 
                          // We might need to store family in the state if we want better UX
                          // For now, if they pick a family, the 3rd box will show only that family.
                          // Let's use a "fake" material selection or just rely on the 3rd box filtering.
                          const firstInFamily = specs.find(s => s.materialType === e.target.value);
                          if (firstInFamily) newM[idx].materialId = ''; // force re-selection
                          setFormData({...formData, materials: newM});
                        }}
                      >
                        <option value="">{m.type ? '-- Choisir Famille --' : '(Sélectionner Type d\'abord)'}</option>
                        {availableFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">3. Spécification / Épaisseur</label>
                      <select 
                        disabled={!m.type}
                        className="w-full border p-1.5 rounded text-xs bg-white disabled:bg-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={m.materialId} 
                        onChange={e => {
                          const newM = [...formData.materials];
                          newM[idx].materialId = e.target.value;
                          setFormData({...formData, materials: newM});
                        }}
                      >
                        <option value="">{m.type ? '-- Choisir Spécification --' : '(Sélectionner Type d\'abord)'}</option>
                        {specs.map(mat => (
                          <option key={mat.id} value={mat.id}>{mat.description} {mat.thickness > 0 ? `(${mat.thickness}")` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedMat && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-200">
                      <div className="col-span-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Quantité (Unités)</label>
                        <input type="number" className="w-full border p-1.5 rounded text-xs font-mono" value={m.quantity} onChange={e => {
                          const newM = [...formData.materials]; newM[idx].quantity = parseFloat(e.target.value) || 0; setFormData({...formData, materials: newM});
                        }} />
                      </div>
                      
                      {isSheet && (
                        <>
                          <div className="col-span-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Largeur (in)</label>
                            <input type="number" className="w-full border p-1.5 rounded text-xs font-mono" value={m.width || ''} placeholder="Ex: 48" onChange={e => {
                              const newM = [...formData.materials]; newM[idx].width = parseFloat(e.target.value) || 0; setFormData({...formData, materials: newM});
                            }} />
                          </div>
                          <div className="col-span-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Longueur (in)</label>
                            <input type="number" className="w-full border p-1.5 rounded text-xs font-mono" value={m.length || ''} placeholder="Ex: 96" onChange={e => {
                              const newM = [...formData.materials]; newM[idx].length = parseFloat(e.target.value) || 0; setFormData({...formData, materials: newM});
                            }} />
                          </div>
                        </>
                      )}

                      {isProfile && (
                        <div className="col-span-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Longueur (in)</label>
                          <input type="number" className="w-full border p-1.5 rounded text-xs font-mono" value={m.length || ''} placeholder="Ex: 240" onChange={e => {
                            const newM = [...formData.materials]; newM[idx].length = parseFloat(e.target.value) || 0; setFormData({...formData, materials: newM});
                          }} />
                        </div>
                      )}

                      {isVolume && (
                        <div className="col-span-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Poids (lb)</label>
                          <input type="number" className="w-full border p-1.5 rounded text-xs font-mono" value={m.weight || ''} onChange={e => {
                            const newM = [...formData.materials]; newM[idx].weight = parseFloat(e.target.value) || 0; setFormData({...formData, materials: newM});
                          }} />
                        </div>
                      )}

                      <div className="md:col-span-1 flex flex-col justify-end">
                        <div className="text-[10px] text-slate-500 italic mb-1">Estimation Poids</div>
                        <div className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-1.5 rounded text-center">
                          {(() => {
                            const qty = m.quantity || 0;
                            if (isSheet) {
                              const lbs = qty * ((m.width || 0) * (m.length || 0) / 144) * (selectedMat.weightPerSqFt || 0);
                              return lbs.toFixed(2) + ' lbs';
                            }
                            if (isProfile) {
                              const lbs = qty * ((m.length || 0) / 12) * (selectedMat.weightPerLinearFt || 0);
                              return lbs.toFixed(2) + ' lbs';
                            }
                            if (isVolume) {
                              return (qty * (m.weight || 0)).toFixed(2) + ' lbs';
                            }
                            return '0.00 lbs';
                          })()}
                        </div>
                      </div>

                      <div className="col-span-2 md:col-span-1 flex items-end justify-end">
                        <button onClick={() => setFormData({...formData, materials: formData.materials.filter(x => x.id !== m.id)})} className="bg-red-50 text-red-600 border border-red-200 py-1.5 px-3 rounded text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Retirer
                        </button>
                      </div>
                    </div>
                  )}
               </div>
             );
          })}
          <button onClick={() => setFormData({...formData, materials: [...formData.materials, { id: Math.random().toString(), materialId: '', quantity: 1 }]})} className="text-sm text-blue-600 mt-2 font-bold">+ Ajouter matière</button>
        </div>

        {/* Opérations */}
        <div className="bg-white p-4 shadow-sm rounded-lg">
          <h3 className="font-bold border-b pb-2 mb-4">Opérations Estimées</h3>
          {formData.operations.map((o, idx) => (
             <div key={o.id} className="flex gap-2 mb-2 items-center">
                <select className="flex-1 border p-1 rounded text-sm" value={o.operationId} onChange={e => {
                  const newO = [...formData.operations]; newO[idx].operationId = e.target.value; setFormData({...formData, operations: newO});
                }}>
                  <option value="">Sélectionner</option>
                  {operations.map(op => <option key={op.id} value={op.id}>{op.name} ({op.rate}$/h)</option>)}
                </select>
                <input type="number" step="0.1" className="w-32 border p-1 rounded text-sm" placeholder="Temps (h)" value={o.estimatedTimeHours} onChange={e => {
                  const newO = [...formData.operations]; newO[idx].estimatedTimeHours = parseFloat(e.target.value) || 0; setFormData({...formData, operations: newO});
                }} />
                <button onClick={() => setFormData({...formData, operations: formData.operations.filter(x => x.id !== o.id)})} className="text-red-500">&times;</button>
             </div>
          ))}
          <button onClick={() => setFormData({...formData, operations: [...formData.operations, { id: Math.random().toString(), operationId: '', estimatedTimeHours: 1 }]})} className="text-sm text-blue-600">+ Ajouter opération</button>
        </div>

        {/* Sous-traitance */}
        <div className="bg-white p-4 shadow-sm rounded-lg">
          <h3 className="font-bold border-b pb-2 mb-4">Sous-traitance</h3>
          {formData.subcontractings.map((s, idx) => (
             <div key={s.id} className="flex gap-2 mb-2 items-center">
                <select className="flex-1 border p-1 rounded text-sm" value={s.subcontractingId} onChange={e => {
                  const newS = [...formData.subcontractings]; newS[idx].subcontractingId = e.target.value; setFormData({...formData, subcontractings: newS});
                }}>
                  <option value="">Sélectionner service</option>
                  {subcontractings.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </select>
                <input type="number" className="w-32 border p-1 rounded text-sm" placeholder="Budget $" value={s.globalPrice} onChange={e => {
                  const newS = [...formData.subcontractings]; newS[idx].globalPrice = parseFloat(e.target.value) || 0; setFormData({...formData, subcontractings: newS});
                }} />
                <button onClick={() => setFormData({...formData, subcontractings: formData.subcontractings.filter(x => x.id !== s.id)})} className="text-red-500">&times;</button>
             </div>
          ))}
          <button onClick={() => setFormData({...formData, subcontractings: [...formData.subcontractings, { id: Math.random().toString(), subcontractingId: '', globalPrice: 0 }]})} className="text-sm text-blue-600">+ Ajouter sous-traitance</button>
        </div>

        {/* Achats */}
        <div className="bg-white p-4 shadow-sm rounded-lg">
          <h3 className="font-bold border-b pb-2 mb-4">Achats Divers</h3>
          {formData.purchases.map((p, idx) => (
             <div key={p.id} className="bg-slate-50 p-3 rounded mb-3 border border-slate-200">
                <div className="grid grid-cols-2 gap-2 mb-2">
                   <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Fournisseur</label>
                    <select className="w-full border p-1 rounded text-xs" value={p.supplierId} onChange={e => {
                      const newP = [...formData.purchases]; newP[idx].supplierId = e.target.value; setFormData({...formData, purchases: newP});
                    }}>
                      <option value="">Sélectionner Fournisseur</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                   </div>
                   <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Prix Global $</label>
                    <input type="number" className="w-full border p-1 rounded text-xs" value={p.globalPrice} onChange={e => {
                      const newP = [...formData.purchases]; newP[idx].globalPrice = parseFloat(e.target.value) || 0; setFormData({...formData, purchases: newP});
                    }} />
                   </div>
                </div>
                <input className="w-full border p-1 rounded text-xs" placeholder="Description de l'achat" value={p.description} onChange={e => {
                  const newP = [...formData.purchases]; newP[idx].description = e.target.value; setFormData({...formData, purchases: newP});
                }} />
                <div className="text-right mt-1">
                  <button onClick={() => setFormData({...formData, purchases: formData.purchases.filter(x => x.id !== p.id)})} className="text-red-500 text-[10px] hover:underline">Supprimer achat</button>
                </div>
             </div>
          ))}
          <button onClick={() => setFormData({...formData, purchases: [...formData.purchases, { id: Math.random().toString(), description: '', globalPrice: 0, supplierId: '' }]})} className="text-sm text-blue-600 font-bold">+ Ajouter achat</button>
        </div>

        {/* Fichiers / Photos */}
        <div className="bg-white p-4 shadow-sm rounded-lg">
          <h3 className="font-bold border-b pb-2 mb-4">Média / Fichiers joints</h3>
          <div className="mb-6">
            <JarvissVisionScanner 
              initialSessions={formData.scans}
              onChange={(scans) => setFormData(prev => ({ ...prev, scans }))}
              onSelectBox={(box) => {
                setFormData(prev => ({
                   ...prev,
                   purchases: [...prev.purchases, {
                      id: Math.random().toString(),
                      description: `${box.label}: ${box.description}`,
                      globalPrice: 0,
                      supplierId: ''
                   }]
                }));
                window.dispatchEvent(new CustomEvent('openGeminiLive', { detail: { 
                  toggle: true, 
                  instruction: `L'utilisateur vient de scanner une boîte via JarvissVisionScanner. Il s'agit de: "${box.label} - ${box.description}". Ajoute-le ou aide-le à estimer son prix.` 
                }}));
              }}
            />
          </div>
          <div className="flex gap-4 mb-4">
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
             <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileUpload} />
             <button onClick={() => fileInputRef.current?.click()} className="bg-slate-200 px-3 py-1 text-sm rounded hover:bg-slate-300">📁 Téléverser</button>
             <button onClick={() => cameraInputRef.current?.click()} className="bg-blue-100 text-blue-700 px-3 py-1 text-sm rounded hover:bg-blue-200 md:hidden flex gap-1 items-center">📷 Capture mobile</button>
          </div>
          <div className="flex gap-2 flex-wrap">
             {formData.files.map(f => (
                <div key={f.id} className="relative w-24 h-24 border rounded overflow-hidden shadow-sm">
                   {f.type?.startsWith('image') ? <img src={f.base64} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-100 text-xs text-center p-1">{f.name}</div>}
                   <button onClick={() => setFormData({...formData, files: formData.files.filter(x => x.id !== f.id)})} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs shadow-md">&times;</button>
                </div>
             ))}
          </div>
        </div>

        <div className="h-28 md:h-20"></div>
      </div>

      {/* Overlay for mobile when expanded */}
      {isMobileRecapExpanded && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsMobileRecapExpanded(false)}
        />
      )}

      {/* Recapitulatif Side (Bottom Sheet on Mobile, Sidebar on Desktop) */}
      <div className={`
        fixed bottom-0 left-0 w-full z-50 transition-all duration-300 md:relative md:w-96 md:flex-shrink-0 md:transform-none md:z-auto
        bg-slate-800 text-white flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.3)] md:shadow-none
        ${isMobileRecapExpanded ? 'h-[80vh] rounded-t-3xl p-6 md:h-auto md:rounded-none md:p-6' : 'h-[4.5rem] px-6 py-3 cursor-pointer md:cursor-auto md:h-auto md:p-6'}
      `}
      >
        {/* Mobile Header (Only visible on Mobile when collapsed or top of sheet) */}
        <div 
          className="md:hidden flex justify-between items-center h-full max-h-12"
          onClick={() => !isMobileRecapExpanded && setIsMobileRecapExpanded(true)}
        >
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total</span>
            <span className="text-xl font-black text-green-400 leading-tight">${totalSell.toFixed(2)}</span>
          </div>
          <button 
             className="flex items-center gap-2 text-slate-300 hover:text-white"
             onClick={(e) => {
               e.stopPropagation();
               setIsMobileRecapExpanded(!isMobileRecapExpanded);
             }}
          >
            <span className="text-sm font-medium">{isMobileRecapExpanded ? 'Fermer' : 'Détails'}</span>
            <svg className={`w-5 h-5 transition-transform ${isMobileRecapExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
        </div>

        {/* Content - Hidden on mobile unless expanded */}
        <div className={`${isMobileRecapExpanded ? 'flex flex-col flex-1 overflow-y-auto mt-4' : 'hidden md:flex md:flex-col md:flex-1'}`}>
          <h3 className="hidden md:flex text-xl font-bold text-yellow-400 mb-6 uppercase tracking-wider border-b border-slate-700 pb-2 items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Récapitulatif T-M
          </h3>
          
          <div className="space-y-4 text-sm flex-1">
             <div className="flex justify-between font-bold text-slate-400 pb-1 border-b border-slate-700 text-[10px] uppercase">
                <span>Catégorie</span>
                <div className="flex text-right gap-4"><span className="w-16">Coûtant</span><span className="w-16">Vendant</span></div>
             </div>

             <div className="flex justify-between items-center text-slate-200">
                <div className="flex flex-col">
                  <span>Matières</span>
                  <span className="text-[10px] text-slate-500">Marge: {profitSettings?.materialMargin}%</span>
                </div>
                <div className="flex text-right gap-4 font-mono"><span className="w-16">${totalMaterialCost.toFixed(2)}</span><span className="w-16 text-green-400 font-bold">${totalMaterialSell.toFixed(2)}</span></div>
             </div>

             <div className="flex justify-between items-center text-slate-200">
                <div className="flex flex-col">
                  <span>Opérations</span>
                  <span className="text-[10px] text-slate-500">Marge: {profitSettings?.operationMargin}%</span>
                </div>
                <div className="flex text-right gap-4 font-mono"><span className="w-16">${totalOperationCost.toFixed(2)}</span><span className="w-16 text-green-400 font-bold">${totalOperationSell.toFixed(2)}</span></div>
             </div>

             <div className="flex justify-between items-center text-slate-200">
                <div className="flex flex-col">
                  <span>Sous-trai.</span>
                  <span className="text-[10px] text-slate-500">Marge Variable</span>
                </div>
                <div className="flex text-right gap-4 font-mono"><span className="w-16">${totalSubCost.toFixed(2)}</span><span className="w-16 text-green-400 font-bold">${totalSubSell.toFixed(2)}</span></div>
             </div>

             <div className="flex justify-between items-center text-slate-200">
                <div className="flex flex-col">
                  <span>Achats</span>
                  <span className="text-[10px] text-slate-500">Marge Variable</span>
                </div>
                <div className="flex text-right gap-4 font-mono"><span className="w-16">${totalPurCost.toFixed(2)}</span><span className="w-16 text-green-400 font-bold">${totalPurSell.toFixed(2)}</span></div>
             </div>
          </div>

          <div className="bg-slate-900 -mx-6 -mb-6 p-6 mt-8 border-t border-slate-700">
             <div className="flex justify-between text-xs text-slate-400 mb-1 uppercase font-bold tracking-tighter">
                <span>Total Coût de Revient</span>
                <span className="font-mono text-sm">${totalCost.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase font-bold tracking-tighter">
                <span>Profit Total</span>
                <span className="font-mono text-sm text-blue-400">${(totalSell - totalCost).toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-3xl font-black text-green-400 border-t border-slate-800 pt-4">
                <span>Grd Total</span>
                <span className="font-mono">${totalSell.toFixed(2)}</span>
             </div>
             <div className="text-[10px] text-slate-500 mt-4 leading-tight italic">
               * Facteurs de marge sur achats: &le;1k: 30% | &le;5k: 25% | &gt;5k: 20%. Calculé automatiquement selon le montant.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
