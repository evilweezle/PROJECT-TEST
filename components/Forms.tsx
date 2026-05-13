import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
import { calculateBendingCost } from '../lib/bendingCalculator';
import { calculateLaserCost, calculateLaserTubeCost } from '../lib/laserCalculator';
import { calculatePartUnitCost, calculateAssemblyUnitCost } from '../lib/costCalculator';
import { extractDataFromDxf } from '../lib/dxfExtractor';
import { DxfViewer } from 'dxf-viewer';
import { PlusIcon } from 'lucide-react';
import { TrashIcon, XIcon, LockIcon, CheckCircleIcon } from './icons';
import { AiQuoteChatbox } from './AiQuoteChatbox';
import { ApprovalDashboard } from './ApprovalDashboard';
import { Client, Operation, Part, Assembly, WorkOrder, Employee, Team, Skill, Material, NonConformity, Quote, BendingSettings, LaserSettings, LaserTubeSettings, Subcontracting, SubcontractingItem, AssemblyItem, PartOperation, QuoteItem, JobStatus, DeliveryNote, Invoice, Supplier, Purchase, PurchaseItem, ContactInfo, SupplierLink } from '../types';
import { UploadIcon } from './icons';

const ContactFields: React.FC<{
  data: ContactInfo;
  onChange: (updates: Partial<ContactInfo>) => void;
}> = ({ data, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Personne de contact</label>
        <input
          type="text"
          value={data.contactPerson || ''}
          onChange={e => onChange({ contactPerson: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          value={data.email || ''}
          onChange={e => onChange({ email: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Téléphone</label>
        <input
          type="text"
          value={data.phone || ''}
          onChange={e => onChange({ phone: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Site Web</label>
        <input
          type="text"
          value={data.website || ''}
          onChange={e => onChange({ website: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700">Adresse</label>
        <input
          type="text"
          value={data.address || ''}
          onChange={e => onChange({ address: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Ville</label>
        <input
          type="text"
          value={data.city || ''}
          onChange={e => onChange({ city: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Province / État</label>
        <input
          type="text"
          value={data.province || ''}
          onChange={e => onChange({ province: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Code Postal</label>
        <input
          type="text"
          value={data.postalCode || ''}
          onChange={e => onChange({ postalCode: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Pays</label>
        <input
          type="text"
          value={data.country || ''}
          onChange={e => onChange({ country: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={data.notes || ''}
          onChange={e => onChange({ notes: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
        />
      </div>
    </div>
  );
};

const SupplierLinksField: React.FC<{
  links: SupplierLink[];
  suppliers: Supplier[];
  onChange: (links: SupplierLink[]) => void;
}> = ({ links, suppliers, onChange }) => {
  const handleAdd = () => {
    onChange([...links, { supplierId: '', price: 0, deliveryDays: 0 }]);
  };

  const handleRemove = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<SupplierLink>) => {
    onChange(links.map((link, i) => i === index ? { ...link, ...updates } : link));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-slate-700">Fournisseurs & Prix</label>
        <button
          type="button"
          onClick={handleAdd}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <PlusIcon className="w-3 h-3" /> Ajouter un fournisseur
        </button>
      </div>
      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-2 rounded-md border border-slate-200">
            <div className="col-span-5">
              <label className="block text-[10px] text-slate-500 uppercase font-bold">Fournisseur</label>
              <select
                value={link.supplierId}
                onChange={e => handleUpdate(index, { supplierId: e.target.value })}
                className="block w-full rounded-md border-slate-300 shadow-sm text-xs"
              >
                <option value="">Sélectionner...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] text-slate-500 uppercase font-bold">Prix ($)</label>
              <input
                type="number"
                step="0.01"
                value={link.price}
                onChange={e => handleUpdate(index, { price: parseFloat(e.target.value) || 0 })}
                className="block w-full rounded-md border-slate-300 shadow-sm text-xs"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] text-slate-500 uppercase font-bold">Délai (jours)</label>
              <input
                type="number"
                value={link.deliveryDays}
                onChange={e => handleUpdate(index, { deliveryDays: parseInt(e.target.value) || 0 })}
                className="block w-full rounded-md border-slate-300 shadow-sm text-xs"
              />
            </div>
            <div className="col-span-1 flex justify-center pb-1">
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-center text-xs text-slate-500 italic py-2">Aucun fournisseur attribué.</p>
        )}
      </div>
    </div>
  );
};

// Subcontracting Items List Component
interface AvailableItem {
    id: string;
    name: string;
    quantity: number;
}

interface SubcontractingItemsListProps {
    items: SubcontractingItem[];
    subcontractings: Subcontracting[];
    onChange: (items: SubcontractingItem[]) => void;
    applyType: 'once' | 'distributed' | 'perUnit';
    availableItems?: AvailableItem[];
}

const SubcontractingItemsList: React.FC<SubcontractingItemsListProps> = ({ items, subcontractings, onChange, applyType, availableItems }) => {
    const [selectedSubId, setSelectedSubId] = useState('');

    const handleAddItem = () => {
        if (!selectedSubId) return;
        const sub = subcontractings.find(s => s.id === selectedSubId);
        if (!sub) return;

        const newItem: SubcontractingItem = {
            id: Math.random().toString(36).substring(2, 9),
            subcontractingId: sub.id,
            description: sub.name,
            cost: sub.defaultCost,
            applyType,
            status: 'Pending',
            targetItemIds: []
        };

        onChange([...items, newItem]);
        setSelectedSubId('');
    };

    const handleRemoveItem = (id: string) => {
        onChange(items.filter(item => item.id !== id));
    };

    const handleUpdateItem = (id: string, updates: Partial<SubcontractingItem>) => {
        onChange(items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const toggleTargetItem = (itemId: string, item: SubcontractingItem) => {
        const currentTargets = item.targetItemIds || [];
        const newTargets = currentTargets.includes(itemId)
            ? currentTargets.filter(id => id !== itemId)
            : [...currentTargets, itemId];
        handleUpdateItem(item.id!, { targetItemIds: newTargets });
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <select
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                >
                    <option value="">Ajouter une sous-traitance...</option>
                    {subcontractings.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (${s.defaultCost})</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedSubId}
                    className="px-3 py-2 bg-[#0078d4] text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-[#106ebe]"
                >
                    Ajouter
                </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
                {items.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md relative group">
                        <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id!)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Description</label>
                                <input
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => handleUpdateItem(item.id!, { description: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Application</label>
                                <select
                                    value={item.applyType}
                                    onChange={(e) => handleUpdateItem(item.id!, { applyType: e.target.value as 'once' | 'distributed' | 'perUnit' })}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs"
                                >
                                    <option value="once">Une fois (Total)</option>
                                    <option value="distributed">Distribué (Total / Qté)</option>
                                    <option value="perUnit">Par Unité (Cout * Qté)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Coût ($)</label>
                                <input
                                    type="number"
                                    value={item.cost}
                                    onChange={(e) => handleUpdateItem(item.id!, { cost: parseFloat(e.target.value) || 0 })}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Date attendue</label>
                                <input
                                    type="date"
                                    value={item.expectedDeliveryDate || ''}
                                    onChange={(e) => handleUpdateItem(item.id!, { expectedDeliveryDate: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Status</label>
                                <select
                                    value={item.status || 'Pending'}
                                    onChange={(e) => handleUpdateItem(item.id!, { status: e.target.value as JobStatus })}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs"
                                >
                                    <option value="Pending">En attente</option>
                                    <option value="In Progress">En cours</option>
                                    <option value="Completed">Terminé</option>
                                    <option value="Blocked">Bloqué</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">No. Bon de Travail</label>
                                <input
                                    type="text"
                                    value={item.workOrderNumber || ''}
                                    placeholder="ex: WO-1234-ST01"
                                    onChange={(e) => handleUpdateItem(item.id!, { workOrderNumber: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs"
                                />
                            </div>

                            {availableItems && availableItems.length > 0 && (
                                <div className="col-span-2 mt-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Items ciblés</label>
                                    <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-200 rounded-md">
                                        {availableItems.map(ai => (
                                            <label key={ai.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={(item.targetItemIds || []).includes(ai.id)}
                                                    onChange={() => toggleTargetItem(ai.id, item)}
                                                    className="rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]"
                                                />
                                                <span>{ai.name} (x{ai.quantity})</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SubcontractingRequirementSelector: React.FC<SubcontractingItemsListProps> = ({ items, subcontractings, onChange, applyType }) => {
    const handleToggle = (sub: Subcontracting) => {
        const existing = items.find(i => i.subcontractingId === sub.id);
        if (existing) {
            onChange(items.filter(i => i.subcontractingId !== sub.id));
        } else {
            onChange([...items, {
                id: `sub-${sub.id}-${items.length}`,
                subcontractingId: sub.id,
                description: '', // used for instructions / color codes
                cost: 0, // determined at quoting stage
                applyType: applyType || 'perUnit',
                status: 'Pending',
                targetItemIds: []
            }]);
        }
    };

    const handleInstructionChange = (subId: string, instructions: string) => {
        onChange(items.map(i => i.subcontractingId === subId ? { ...i, description: instructions } : i));
    };

    return (
        <div className="space-y-3">
            {subcontractings.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Aucune sous-traitance configurée.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subcontractings.map(sub => {
                        const existing = items.find(i => i.subcontractingId === sub.id);
                        const isSelected = !!existing;

                        return (
                            <div key={sub.id} className={`border rounded-xl p-3 transition-colors ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggle(sub)}
                                        className="mt-1 flex-shrink-0 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate" title={sub.name}>{sub.name}</div>
                                        {isSelected && (
                                            <div className="mt-2">
                                                <input
                                                    type="text"
                                                    value={existing.description || ''}
                                                    onChange={e => handleInstructionChange(sub.id, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    placeholder="Instructions (ex: Code couleur...)"
                                                    className="block w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// DXF Viewer Component
const DxfViewerComponent: React.FC<{ data: string }> = ({ data }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<DxfViewer | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;

        if (containerRef.current && data) {
            const initViewer = async () => {
                try {
                    setLoading(true);
                    setError(null);

                    // Convert base64 to Blob manually for better reliability
                    const parts = data.split(',');
                    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/dxf';
                    const bstr = atob(parts[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    const blob = new Blob([u8arr], { type: mime });
                    
                    // Check if it's a binary DXF
                    const text = await blob.slice(0, 100).text();
                    if (text.includes('AutoCAD Binary DXF') || (!text.includes('SECTION') && !text.includes('HEADER'))) {
                        if (isMounted) setError('Le fichier DXF semble être au format binaire, ce qui n\'est pas supporté par le visualiseur web. Veuillez utiliser un format DXF ASCII.');
                        setLoading(false);
                        return;
                    }

                    objectUrl = URL.createObjectURL(blob);

                    if (viewerRef.current) {
                        try {
                            const v = viewerRef.current as unknown as { Destroy?: () => void; destroy?: () => void };
                            if (v && typeof v.Destroy === 'function') v.Destroy();
                            else if (v && typeof v.destroy === 'function') v.destroy();
                        } catch (e) {
                            console.warn('Error destroying DXF viewer:', e);
                        }
                    }

                    viewerRef.current = new DxfViewer(containerRef.current!, {
                        autoResize: true,
                    });

                    await viewerRef.current.Load({
                        url: objectUrl,
                        fonts: [
                            'https://cdn.jsdelivr.net/gh/reza-ali/three-dxf@master/fonts/helvetiker_regular.typeface.json'
                        ]
                    });
                    
                    if (isMounted) setLoading(false);
                } catch (err) {
                    if (!isMounted) return;
                    console.error('Error loading DXF:', err);
                    setLoading(false);
                    const errMsg = err instanceof Error ? err.message : String(err);
                    if (errMsg.includes('Cannot parse group code') || errMsg.includes('AC10')) {
                        setError('Erreur de lecture du DXF : Le format du fichier est peut-être trop récent ou binaire.');
                    } else {
                        setError('Erreur lors du chargement du fichier DXF.');
                    }
                }
            };
            initViewer();
        }
        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            if (viewerRef.current) {
                try {
                    const v = viewerRef.current as unknown as { Destroy?: () => void; destroy?: () => void };
                    if (v && typeof v.Destroy === 'function') v.Destroy();
                    else if (v && typeof v.destroy === 'function') v.destroy();
                } catch (e) {
                    console.warn('Error destroying DXF viewer:', e);
                }
                viewerRef.current = null;
            }
        };
    }, [data]);

    return (
        <div className="w-full h-full relative bg-[#1a1a1a]">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a] z-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
                    <span className="text-white text-sm">Chargement du DXF...</span>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-6 text-center z-20">
                    <svg className="w-12 h-12 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-900 mb-2">Problème d'affichage DXF</span>
                    <p className="text-xs text-slate-500 max-w-xs mb-4">{error}</p>
                    <button 
                        type="button"
                        onClick={() => {
                            const a = document.createElement('a');
                            a.href = data;
                            a.download = 'plan.dxf';
                            a.click();
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium hover:bg-slate-50"
                    >
                        Télécharger pour ouvrir localement
                    </button>
                </div>
            )}
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
};

// STEP Viewer Component
const StepViewerComponent: React.FC<{ data: string }> = ({ data }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let viewer: unknown = null;

        if (data && containerRef.current) {
            const initViewer = async () => {
                try {
                    // Dynamically import to avoid SSR issues if any, and since it's a large library
                    const OV = await import('online-3d-viewer');
                    
                    if (!isMounted) return;

                    viewer = new OV.EmbeddedViewer(containerRef.current!, {
                        backgroundColor: new OV.RGBAColor(248, 250, 252, 255), // slate-50
                        defaultColor: new OV.RGBColor(200, 200, 200),
                        edgeSettings: new OV.EdgeSettings(false, new OV.RGBColor(0, 0, 0), 1),
                        onModelLoaded: () => {
                            if (isMounted) setLoading(false);
                        },
                        onModelLoadFailed: () => {
                            if (isMounted) {
                                setLoading(false);
                                setError('Erreur lors du chargement du fichier STEP.');
                            }
                        }
                    });

                    const parts = data.split(',');
                    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/step';
                    const bstr = atob(parts[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    const blob = new Blob([u8arr], { type: mime });
                    const file = new File([blob], 'model.step');

                    viewer.LoadModelFromFileList([file]);
                } catch (err) {
                    console.error('Error initializing STEP viewer:', err);
                    if (isMounted) {
                        setLoading(false);
                        setError('Erreur d\'initialisation du visualiseur 3D.');
                    }
                }
            };

            initViewer();
        }

        return () => {
            isMounted = false;
            if (viewer && typeof viewer.Destroy === 'function') {
                viewer.Destroy();
            }
        };
    }, [data]);

    return (
        <div className="w-full h-full relative bg-slate-50">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0078d4] mb-4"></div>
                    <span className="text-slate-600 text-sm">Chargement du modèle 3D...</span>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-6 text-center z-20">
                    <svg className="w-12 h-12 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-900 mb-2">Problème d'affichage STEP</span>
                    <p className="text-xs text-slate-500 max-w-xs mb-4">{error}</p>
                    <button 
                        type="button"
                        onClick={() => {
                            const a = document.createElement('a');
                            a.href = data;
                            a.download = 'model.step';
                            a.click();
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium hover:bg-slate-50"
                    >
                        Télécharger pour ouvrir localement
                    </button>
                </div>
            )}
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
};

// PDF Viewer Component
const PdfViewerComponent: React.FC<{ data: string }> = ({ data }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;

        if (data) {
            if (data.startsWith('data:application/pdf')) {
                const renderPdf = async () => {
                    try {
                        const parts = data.split(',');
                        const bstr = atob(parts[1]);
                        let n = bstr.length;
                        const u8arr = new Uint8Array(n);
                        while (n--) {
                            u8arr[n] = bstr.charCodeAt(n);
                        }
                        
                        const blob = new Blob([u8arr], { type: 'application/pdf' });
                        objectUrl = URL.createObjectURL(blob);
                        if (isMounted) setBlobUrl(objectUrl);

                        const pdf = await pdfjsLib.getDocument({ data: u8arr }).promise;
                        const page = await pdf.getPage(1);
                        const viewport = page.getViewport({ scale: 1.5 });
                        
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        if (context) {
                            await page.render({ canvasContext: context, viewport }).promise;
                            const imgUrl = canvas.toDataURL('image/jpeg');
                            if (isMounted) setImageUrl(imgUrl);
                        }
                    } catch (err) {
                        console.error('Error rendering PDF:', err);
                        if (isMounted) setError(true);
                    }
                };
                renderPdf();
            } else {
                // It's an image
                setTimeout(() => {
                    if (isMounted) {
                        setImageUrl(data);
                        setBlobUrl(data);
                    }
                }, 0);
            }
        }
        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [data]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-600 mb-4">Impossible de charger le PDF.</p>
                <button 
                    type="button"
                    onClick={() => {
                        const a = document.createElement('a');
                        a.href = data;
                        a.download = 'plan.pdf';
                        a.click();
                    }}
                    className="px-4 py-2 bg-[#0078d4] text-white rounded-md text-sm"
                >
                    Télécharger le PDF
                </button>
            </div>
        );
    }

    if (!imageUrl || !data) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078d4] mb-2"></div>
                <span>Chargement du document...</span>
            </div>
        );
    }

    if (data?.startsWith('data:application/pdf')) {
        return (
            <div className="w-full h-full flex flex-col">
                <object 
                    data={`${blobUrl}#toolbar=0&navpanes=0`} 
                    type="application/pdf"
                    className="w-full h-full border-none"
                >
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <p className="text-sm text-slate-600 mb-4">Votre navigateur ne peut pas afficher ce PDF directement.</p>
                        <button 
                            type="button"
                            onClick={() => {
                                const a = document.createElement('a');
                                a.href = data;
                                a.download = 'plan.pdf';
                                a.click();
                            }}
                            className="px-4 py-2 bg-[#0078d4] text-white rounded-md text-sm"
                        >
                            Télécharger le PDF
                        </button>
                    </div>
                </object>
            </div>
        );
    }
    
    return <img src={blobUrl} alt="Uploaded plan" className="w-full h-full object-contain" />;
};


const FormContainer: React.FC<{
  isSubForm?: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  className?: string;
  children: React.ReactNode;
  onPaste?: (e: React.ClipboardEvent) => void;
}> = ({ isSubForm, onSubmit, className, children, onPaste }) => {
  if (isSubForm) {
    return <div className={className} onPaste={onPaste}>{children}</div>;
  }
  return <form onSubmit={onSubmit} className={className} onPaste={onPaste}>{children}</form>;
};

interface ClientFormProps {
  onSubmit: (client: Omit<Client, 'id'> | Client) => void;
  onCancel: () => void;
  initialData?: Client | null;
  isSubForm?: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, onCancel, initialData, isSubForm }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [tier, setTier] = useState<"Regular" | "AdvantagePlus">(initialData?.tier || 'Regular');
  const [points, setPoints] = useState<number>(initialData?.points || 0);
  const portalAccess = initialData?.portalAccess || false;
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    contactPerson: initialData?.contactPerson || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    province: initialData?.province || '',
    postalCode: initialData?.postalCode || '',
    country: initialData?.country || '',
    website: initialData?.website || '',
    notes: initialData?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Client name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (validate()) {
      const data = { ...initialData, name: name.trim(), ...contactInfo, tier, portalAccess, points };
      onSubmit(data as Client);
    }
  };

  const submitText = initialData ? 'Save Changes' : 'Add Client';

  return (
    <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="clientName" className="block text-sm font-medium text-slate-700">Client Name</label>
        <input
          type="text"
          id="clientName"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
            if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
          }}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
          }`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Catégorie Client</label>
          <select 
            value={tier}
            onChange={e => setTier(e.target.value as "Regular" | "AdvantagePlus")}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="Regular">Régulier</option>
            <option value="AdvantagePlus">Avantage+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Points Portail</label>
          <input 
            type="number"
            value={points}
            onChange={e => setPoints(parseInt(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-sm font-medium text-slate-800 mb-4">Informations de contact</h3>
        <ContactFields 
          data={contactInfo} 
          onChange={(updates) => setContactInfo(prev => ({ ...prev, ...updates }))} 
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
        <button 
          type={isSubForm ? "button" : "submit"} 
          onClick={isSubForm ? () => handleSubmit() : undefined}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
        >
          {submitText}
        </button>
      </div>
    </FormContainer>
  );
};


interface OperationFormProps {
    skills: Skill[];
    onSubmit: (operation: Omit<Operation, 'id'> | Operation) => void;
    onCancel: () => void;
    initialData?: Operation | null;
    isSubForm?: boolean;
}

export const OperationForm: React.FC<OperationFormProps> = ({ skills, onSubmit, onCancel, initialData, isSubForm }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [rate, setRate] = useState(initialData?.rate || 0);
    const [requiredSkillId, setRequiredSkillId] = useState(initialData?.requiredSkillId || '');
    const [availableIn, setAvailableIn] = useState<('part' | 'assembly' | 'quote')[]>(initialData?.availableIn || ['part', 'assembly', 'quote']);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Operation name is required';
        if (rate < 0) newErrors.rate = 'Rate must be 0 or greater';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAvailableInChange = (type: 'part' | 'assembly' | 'quote', checked: boolean) => {
        if (checked) {
            setAvailableIn(prev => [...prev, type]);
        } else {
            setAvailableIn(prev => prev.filter(t => t !== type));
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (validate()) {
            if (initialData) {
                onSubmit({ ...initialData, name: name.trim(), rate: Number(rate), availableIn, requiredSkillId: requiredSkillId || null });
            } else {
                onSubmit({ name: name.trim(), rate: Number(rate), availableIn, requiredSkillId: requiredSkillId || null });
            }
        }
    };
    
    const submitText = initialData ? 'Save Changes' : 'Add Operation';

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="opName" className="block text-sm font-medium text-slate-700">Operation Name</label>
                <input
                    type="text"
                    id="opName"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setName(e.target.value);
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                    }`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
                <label htmlFor="opRate" className="block text-sm font-medium text-slate-700">Hourly Rate ($)</label>
                <input
                    type="number"
                    id="opRate"
                    value={rate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setRate(parseFloat(e.target.value) || 0);
                        if (errors.rate) setErrors(prev => ({ ...prev, rate: '' }));
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.rate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                    }`}
                    min="0"
                    step="0.01"
                />
                {errors.rate && <p className="mt-1 text-xs text-red-600">{errors.rate}</p>}
            </div>
            <div>
                <label htmlFor="opSkill" className="block text-sm font-medium text-slate-700">Required Skill</label>
                <select
                    id="opSkill"
                    value={requiredSkillId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRequiredSkillId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                >
                    <option value="">No specific skill required</option>
                    {(skills || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Available In</label>
                <div className="flex gap-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={availableIn.includes('part')}
                            onChange={(e) => handleAvailableInChange('part', e.target.checked)}
                            className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                        />
                        <span className="ml-2 text-sm text-slate-600">Pièce</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={availableIn.includes('assembly')}
                            onChange={(e) => handleAvailableInChange('assembly', e.target.checked)}
                            className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                        />
                        <span className="ml-2 text-sm text-slate-600">Assemblage</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={availableIn.includes('quote')}
                            onChange={(e) => handleAvailableInChange('quote', e.target.checked)}
                            className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                        />
                        <span className="ml-2 text-sm text-slate-600">Soumission</span>
                    </label>
                </div>
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button 
                  type={isSubForm ? "button" : "submit"} 
                  onClick={isSubForm ? () => handleSubmit() : undefined}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
                >
                  {submitText}
                </button>
            </div>
        </FormContainer>
    );
};

interface PartFormProps {
    clients?: Client[];
    operations: Operation[];
    materials: Material[];
    suppliers: Supplier[];
    subcontractings: Subcontracting[];
    bendingSettings: BendingSettings;
    laserSettings: LaserSettings;
    laserTubeSettings: LaserTubeSettings;
    onSubmit: (part: Omit<Part, 'id'> | Part) => void;
    onCancel: () => void;
    initialData?: Part | null;
    isSubForm?: boolean;
}

export const PartForm: React.FC<PartFormProps> = ({ clients, operations, materials, suppliers, subcontractings, bendingSettings, laserSettings, laserTubeSettings, onSubmit, onCancel, initialData, isSubForm }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [ownerId, setOwnerId] = useState(initialData?.ownerId || '');
    const [materialId, setMaterialId] = useState(initialData?.materialId || '');
    const [dimensionX, setDimensionX] = useState<number>(initialData?.dimensionX || 0);
    const [dimensionY, setDimensionY] = useState<number>(initialData?.dimensionY || 0);
    const [dimensionZ, setDimensionZ] = useState<number>(initialData?.dimensionZ || 0);
    const [weight, setWeight] = useState<number>(initialData?.weight || 0);
    const quantity = 1;

    const selectedMaterial = useMemo(() => materials.find(m => m.id === materialId), [materialId, materials]);

    const dimensionConfig = useMemo(() => {
        const defaultLabels = { x: 'Dimension X (po)', y: 'Dimension Y (po)', z: 'Dimension Z (po)' };
        if (!selectedMaterial) return { x: true, y: true, z: false, labels: defaultLabels };
        
        const type = selectedMaterial.type?.toLowerCase() || '';
        const matType = selectedMaterial.materialType?.toLowerCase() || '';
        const desc = selectedMaterial.description?.toLowerCase() || '';

        // Buche: X, Y, Z
        if (type.includes('buche') || matType.includes('buche') || desc.includes('buche')) {
            return { x: true, y: true, z: true, labels: { x: 'Largeur (X)', y: 'Profondeur (Y)', z: 'Hauteur (Z)' } };
        }
        
        // Profile/Tube/Barre: Length
        if (type.includes('profile') || type.includes('tube') || type.includes('bar') || type.includes('poutre') || type.includes('angle') || type.includes('channel')) {
            return { x: true, y: false, z: false, labels: { x: 'Longueur (po)' } };
        }

        // Plate/Sheet: X, Y (Default)
        return { x: true, y: true, z: false, labels: { x: 'Largeur (X)', y: 'Longueur (Y)' } };
    }, [selectedMaterial]);

    const [partOps, setPartOps] = useState<PartOperation[]>(() => 
        (initialData?.operations || []).map(po => ({ 
            ...po, 
            id: po.id || `op-${Math.random().toString(36).substring(2, 9)}` 
        }))
    );
    const [subcontractingItems, setSubcontractingItems] = useState<SubcontractingItem[]>(initialData?.subcontractingItems || []);
    const [supplierLinks, setSupplierLinks] = useState<SupplierLink[]>(initialData?.supplierLinks || []);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [expandedOpId, setExpandedOpId] = useState<string | null>(null);
    const [selectedOpToAdd, setSelectedOpToAdd] = useState<string>('');
    const [filePdf, setFilePdf] = useState<string | null>(initialData?.filePdf || null);
    const [filePdfName, setFilePdfName] = useState<string | null>(initialData?.filePdfName || null);
    const [fileDxf, setFileDxf] = useState<string | null>(initialData?.fileDxf || null);
    const [fileDxfName, setFileDxfName] = useState<string | null>(initialData?.fileDxfName || null);
    const [fileStep, setFileStep] = useState<string | null>(initialData?.fileStep || null);
    const [fileStepName, setFileStepName] = useState<string | null>(initialData?.fileStepName || null);
    const [activeView, setActiveView] = useState<'pdf' | 'dxf' | 'step'>(() => {
        if (initialData?.filePdf) return 'pdf';
        if (initialData?.fileDxf) return 'dxf';
        if (initialData?.fileStep) return 'step';
        return 'pdf';
    });
    const [dragActive, setDragActive] = useState<string | null>(null);
    const [dxfAutoFilledFields, setDxfAutoFilledFields] = useState<string[]>(initialData?.dxfData?.autoFilledFields || []);
    const [dxfData, setDxfData] = useState<DxfExtractedData | null>(initialData?.dxfData || null);

    const blankArea = useMemo(() => dimensionX * dimensionY, [dimensionX, dimensionY]);

    useEffect(() => {
        if (blankArea > 0) {
            setTimeout(() => {
                setPartOps(prev => {
                let hasChanges = false;
                const next = prev.map(po => {
                    let poChanged = false;
                    const newPo = { ...po };
                    if (newPo.bendingParams && newPo.bendingParams.areaSqIn !== blankArea) {
                        newPo.bendingParams = { ...newPo.bendingParams, areaSqIn: blankArea };
                        poChanged = true;
                    }
                    if (newPo.laserParams && newPo.laserParams.blankAreaSqIn !== blankArea) {
                        newPo.laserParams = { ...newPo.laserParams, blankAreaSqIn: blankArea };
                        poChanged = true;
                    }
                    if (poChanged) hasChanges = true;
                    return poChanged ? newPo : po;
                });
                return hasChanges ? next : prev;
            });
        }, 0);
        }
    }, [blankArea]);

    // Material Filters
    const [filterType, setFilterType] = useState('');
    const [filterMaterialType, setFilterMaterialType] = useState('');
    const [filterProfile, setFilterProfile] = useState('');
    const [filterThickness, setFilterThickness] = useState('');
    const [showMaterialFilters, setShowMaterialFilters] = useState(false);

    const availableTypes = useMemo(() => Array.from(new Set(materials.map(m => m.type))).filter(Boolean).sort(), [materials]);
    const availableMaterialTypes = useMemo(() => Array.from(new Set(materials.filter(m => !filterType || m.type === filterType).map(m => m.materialType))).filter(Boolean).sort(), [materials, filterType]);
    const availableProfiles = useMemo(() => Array.from(new Set(materials.filter(m => (!filterType || m.type === filterType) && (!filterMaterialType || m.materialType === filterMaterialType)).map(m => m.profileDimensions))).filter(Boolean).sort(), [materials, filterType, filterMaterialType]);
    const availableThicknesses = useMemo(() => Array.from(new Set(materials.filter(m => (!filterType || m.type === filterType) && (!filterMaterialType || m.materialType === filterMaterialType) && (!filterProfile || m.profileDimensions === filterProfile)).map(m => m.thickness.toString()))).filter(Boolean).sort((a, b) => parseFloat(a) - parseFloat(b)), [materials, filterType, filterMaterialType, filterProfile]);

    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            if (filterType && m.type !== filterType) return false;
            if (filterMaterialType && m.materialType !== filterMaterialType) return false;
            if (filterProfile && m.profileDimensions !== filterProfile) return false;
            if (filterThickness && m.thickness.toString() !== filterThickness) return false;
            return true;
        });
    }, [materials, filterType, filterMaterialType, filterProfile, filterThickness]);

    const processFile = (type: 'pdf' | 'dxf' | 'step', file: File) => {
        const fileName = file.name;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'pdf') {
                setFilePdf(reader.result as string);
                setFilePdfName(fileName);
            }
            if (type === 'dxf') {
                setFileDxf(reader.result as string);
                setFileDxfName(fileName);
            }
            if (type === 'step') {
                setFileStep(reader.result as string);
                setFileStepName(fileName);
            }
            setActiveView(type);
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (type: 'pdf' | 'dxf' | 'step', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(type, file);
            e.target.value = '';
        }
    };

    const handleDrag = (e: React.DragEvent, type: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(type);
        } else if (e.type === "dragleave") {
            setDragActive(null);
        }
    };

    const handleDrop = (type: 'pdf' | 'dxf' | 'step', e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(null);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(type, e.dataTransfer.files[0]);
        }
    };

    const [isScanning, setIsScanning] = useState(false);
    
    const handleFillFromDxf = async () => {
        if (!fileDxf) return;
        
        setIsScanning(true);
        // Add a small delay for visual effect as requested ("simulation d'entrée de donnée")
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            // Get material info for weight calculation
            const mat = materials.find(m => m.id === materialId);
            let density = 0.284; // Default steel lb/in3
            if (mat?.materialType?.toLowerCase().includes('alu')) density = 0.098;
            if (mat?.materialType?.toLowerCase().includes('stainless')) density = 0.29;
            
            const thickness = mat?.thickness || 0.125;

            // Extract content from base64
            const base64Content = fileDxf.split(',')[1];
            const dxfString = atob(base64Content);
            
            const data = extractDataFromDxf(dxfString, density, thickness);
            setDxfData(data);
            
            // Auto-fill fields
            setDimensionX(parseFloat(data.blankX.toFixed(3)));
            setDimensionY(parseFloat(data.blankY.toFixed(3)));
            setWeight(parseFloat(data.weight.toFixed(3)));
            
            const filled: string[] = ['dimensionX', 'dimensionY', 'weight'];

            // Update operations if they exist
            setPartOps(prev => prev.map(po => {
                const op = operations.find(o => o.id === po.operationId);
                const isLaser = op?.type === 'laser' || op?.name?.toLowerCase().includes('laser');
                const isBending = op?.type === 'bending' || op?.name?.toLowerCase().includes('pliage') || op?.name?.toLowerCase().includes('bending');

                if (isLaser && po.laserParams) {
                    filled.push('cutLengthInches', 'numberOfPierces', 'realSurfaceAreaSqIn', 'numberOfSharpCorners');
                    return {
                        ...po,
                        laserParams: {
                            ...po.laserParams,
                            cutLengthInches: parseFloat(data.cutLength.toFixed(3)),
                            numberOfPierces: data.pierces,
                            realSurfaceAreaSqIn: parseFloat(data.realSurface.toFixed(3)),
                            numberOfSharpCorners: data.sharpCorners,
                        }
                    };
                }
                if (isBending && po.bendingParams) {
                    filled.push('numberOfBends');
                    return {
                        ...po,
                        bendingParams: {
                            ...po.bendingParams,
                            numberOfBends: data.bends,
                            areaSqIn: parseFloat(data.area.toFixed(3))
                        }
                    };
                }
                return po;
            }));

            setDxfAutoFilledFields(Array.from(new Set([...dxfAutoFilledFields, ...filled])));
            // Silence linter for dxfData if needed
            console.log('DXF extraction complete', dxfData ? 'with geometry' : '');
        } catch (err) {
            console.error("Error filling from DXF:", err);
            setErrors(prev => ({...prev, dxf: "Erreur lors de l'extraction des données DXF"}));
        } finally {
            setIsScanning(false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }
        
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            const file = e.clipboardData.files[0];
            if (file.type?.startsWith('image/') || file.type === 'application/pdf') {
                // Create a new File object with a fallback name if needed
                const newFile = new File([file], file.name || 'pasted_image.png', { type: file.type });
                processFile('pdf', newFile);
            }
        }
    };

    const handleDownload = (fileData: string, defaultName: string) => {
        const a = document.createElement('a');
        a.href = fileData;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleAddOperation = () => {
        if (!selectedOpToAdd) return;
        const op = operations.find(o => o.id === selectedOpToAdd);
        const isBending = op?.name?.toLowerCase().includes('pliage') || op?.name?.toLowerCase().includes('bend');
        const isLaserSheet = (op?.name?.toLowerCase().includes('laser') || op?.name?.toLowerCase().includes('découpe') || op?.name?.toLowerCase().includes('cut')) && !op?.name?.toLowerCase().includes('tube');
        const isLaserTube = (op?.name?.toLowerCase().includes('laser') || op?.name?.toLowerCase().includes('découpe') || op?.name?.toLowerCase().includes('cut')) && op?.name?.toLowerCase().includes('tube');
        
        setPartOps(prev => [...prev, { 
            id: Date.now().toString() + Math.random().toString(),
            operationId: selectedOpToAdd, 
            estimatedTimeMinutes: 60, 
            dependencies: [], 
            delayDays: 0,
            isConfirmed: !isBending && !isLaserSheet && !isLaserTube,
            bendingParams: isBending ? {
                numberOfSetups: 1,
                numberOfBends: 1,
                areaSqIn: blankArea || 0,
                weightLbs: 0,
                useNeoprene: false,
                quantity: quantity,
                numberOfReverses: 0
            } : undefined,
            laserParams: isLaserSheet ? {
                cutLengthInches: 0,
                yieldPercentage: 80,
                powerkW: 6,
                blankAreaSqIn: blankArea || 0,
                numberOfPierces: 0
            } : undefined,
            laserTubeParams: isLaserTube ? {
                cutLengthInches: 0,
                numberOfBars: 1,
                powerkW: 6,
                numberOfPierces: 0
            } : undefined
        }]);
        setSelectedOpToAdd('');
        if (errors.operations) setErrors(prev => ({ ...prev, operations: '' }));
    };

    const handleRemoveOperation = (idToRemove: string) => {
        setPartOps(prev => prev.filter(po => po.id !== idToRemove));
    };

    const moveOperation = (index: number, direction: 'up' | 'down') => {
        setPartOps(prev => {
            const newOps = [...prev];
            if (direction === 'up' && index > 0) {
                [newOps[index - 1], newOps[index]] = [newOps[index], newOps[index - 1]];
            } else if (direction === 'down' && index < newOps.length - 1) {
                [newOps[index + 1], newOps[index]] = [newOps[index], newOps[index + 1]];
            }
            return newOps;
        });
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Part name is required';
        if (!materialId) newErrors.materialId = 'Material selection is required';
        if (partOps.length === 0) newErrors.operations = 'At least one operation must be selected';
        if (quantity <= 0) newErrors.quantity = 'Quantity must be at least 1';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (validate()) {
            if (partOps.some(po => !po.isConfirmed)) {
                setErrors(prev => ({ ...prev, operations: 'Please confirm all operation parameters' }));
                return;
            }
            const processedOps = partOps.map(po => {
                const op = operations.find(o => o.id === po.operationId);
                if (op?.name?.toLowerCase().includes('pliage') && po.bendingParams) {
                    const result = calculateBendingCost(bendingSettings, { ...po.bendingParams, quantity });
                    return { ...po, estimatedTimeMinutes: result.totalTimeMinutes, bendingResult: result };
                }
                if ((op?.name?.toLowerCase().includes('laser') || op?.name?.toLowerCase().includes('découpe') || op?.name?.toLowerCase().includes('cut')) && po.laserParams) {
                    const material = materials.find(m => m.id === materialId);
                    const result = calculateLaserCost(laserSettings, material, { ...po.laserParams, quantity });
                    return { ...po, estimatedTimeMinutes: result.totalTimeMinutes, laserResult: result };
                }
                if (po.laserTubeParams) {
                    const material = materials.find(m => m.id === materialId);
                    const result = calculateLaserTubeCost(laserTubeSettings, material, { ...po.laserTubeParams, quantity });
                    return { ...po, estimatedTimeMinutes: result.totalTimeMinutes, laserTubeResult: result };
                }
                return po;
            });

            if (initialData) {
                onSubmit({ 
                    ...initialData, 
                    name: name.trim(), 
                    materialId, 
                    dimensionX: dimensionConfig.x ? dimensionX : 0, 
                    dimensionY: dimensionConfig.y ? dimensionY : 0, 
                    dimensionZ: dimensionConfig.z ? dimensionZ : 0, 
                    weight,
                    operations: processedOps, 
                    quantity, 
                    filePdf, 
                    filePdfName, 
                    fileDxf, 
                    fileDxfName, 
                    fileStep, 
                    fileStepName, 
                    subcontractingItems, 
                    supplierLinks, 
                    ownerId: ownerId 
                });
            } else {
                onSubmit({ 
                    name: name.trim(), 
                    materialId, 
                    dimensionX: dimensionConfig.x ? dimensionX : 0, 
                    dimensionY: dimensionConfig.y ? dimensionY : 0, 
                    dimensionZ: dimensionConfig.z ? dimensionZ : 0, 
                    weight,
                    operations: processedOps, 
                    quantity, 
                    filePdf, 
                    filePdfName, 
                    fileDxf, 
                    fileDxfName, 
                    fileStep, 
                    fileStepName, 
                    subcontractingItems, 
                    supplierLinks, 
                    ownerId: ownerId 
                });
            }
        }
    };

    const submitText = initialData ? 'Save Changes' : 'Add Part';

    const operationCosts = useMemo(() => {
        return partOps.map(po => {
            const op = operations.find(o => o.id === po.operationId);
            let unitPrice = 0;
            let type = 'standard';
            let details: { totalTimeMinutes?: number; timeMinutes?: number; unitPrice?: number } | null = null;
            if (op?.name?.toLowerCase().includes('pliage') || op?.name?.toLowerCase().includes('bend')) {
                type = 'bending';
                if (po.bendingParams) {
                    const result = calculateBendingCost(bendingSettings, { ...po.bendingParams, quantity });
                    unitPrice = result.unitPrice;
                    details = result;
                }
            } else if (op?.name?.toLowerCase().includes('laser') || op?.name?.toLowerCase().includes('découpe') || op?.name?.toLowerCase().includes('cut')) {
                type = 'laser';
                if (po.laserParams) {
                    const material = materials.find(m => m.id === materialId);
                    const result = calculateLaserCost(laserSettings, material, { ...po.laserParams, quantity });
                    unitPrice = result.unitPrice;
                    details = result;
                } else {
                    unitPrice = ((op?.rate || 0) * (po.estimatedTimeMinutes / 60)) / quantity;
                    details = { timeMinutes: po.estimatedTimeMinutes };
                }
            } else if (po.laserTubeParams) {
                type = 'laserTube';
                const material = materials.find(m => m.id === materialId);
                const result = calculateLaserTubeCost(laserTubeSettings, material, { ...po.laserTubeParams, quantity });
                unitPrice = result.unitPrice;
                details = result;
            } else {
                unitPrice = ((op?.rate || 0) * (po.estimatedTimeMinutes / 60)) / quantity;
                details = { timeMinutes: po.estimatedTimeMinutes };
            }
            return {
                id: po.id,
                name: op?.name || 'Unknown',
                unitPrice,
                type,
                details
            };
        });
    }, [partOps, operations, bendingSettings, laserSettings, laserTubeSettings, quantity, materialId, materials]);

    const totalMachineTimeMinutes = useMemo(() => {
        return operationCosts.reduce((total, oc) => {
            if (oc.type === 'laser' && oc.details) return total + (oc.details.totalTimeMinutes || 0);
            if (oc.type === 'bending' && oc.details) return total + (oc.details.totalTimeMinutes || 0);
            if (oc.type === 'standard' && oc.details) return total + (oc.details.timeMinutes || 0);
            return total;
        }, 0);
    }, [operationCosts]);

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4 h-full flex flex-col">
            <div className={`flex flex-col ${isSubForm ? '' : 'md:flex-row'} gap-6 h-full`}>
                {/* Left Panel: Image Upload (55%) */}
                <div className={`w-full ${isSubForm ? '' : 'md:w-[55%] lg:w-[55%]'} flex flex-col gap-2`}>
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-900">Plan / Dessin</h3>
                    </div>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden relative max-h-[70vh]" style={{ aspectRatio: '11/8.5' }}>
                        <AnimatePresence>
                            {isScanning && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center pointer-events-none"
                                >
                                    <motion.div 
                                        animate={{ y: ['-100%', '100%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-x-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                                    />
                                    <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg border border-blue-200 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Analyse Géométrique...</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {activeView === 'pdf' && filePdf ? (
                            <PdfViewerComponent data={filePdf} />
                        ) : activeView === 'dxf' && fileDxf ? (
                            <DxfViewerComponent data={fileDxf} />
                        ) : activeView === 'step' && fileStep ? (
                            <StepViewerComponent data={fileStep} />
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center">
                                <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Sélectionnez un fichier pour l'afficher</span>
                            </div>
                        )}
                    </div>

                    {/* 3 Upload Boxes */}
                    <div className="grid grid-cols-3 gap-4 mt-2">
                        {/* PDF Box */}
                        <div 
                            className={`border rounded-md p-3 flex flex-col items-center justify-center bg-white transition-colors ${activeView === 'pdf' ? 'border-[#0078d4] ring-1 ring-[#0078d4]' : dragActive === 'pdf' ? 'border-[#0078d4] bg-blue-50' : 'border-slate-200'}`}
                            onDragEnter={(e) => handleDrag(e, 'pdf')}
                            onDragLeave={(e) => handleDrag(e, null)}
                            onDragOver={(e) => handleDrag(e, 'pdf')}
                            onDrop={(e) => handleDrop('pdf', e)}
                        >
                            <span className="text-xs font-bold text-slate-700 mb-2">Plan (PDF/IMG)</span>
                            {filePdf ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-green-600 mb-2 truncate max-w-[80px]" title={filePdfName || ''}>
                                        ✓ {filePdfName || 'Fichier chargé'}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setActiveView('pdf')}
                                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${activeView === 'pdf' ? 'bg-[#0078d4] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            Afficher
                                        </button>
                                        <label className="cursor-pointer px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[10px] hover:bg-slate-200">
                                            Remplacer
                                            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.PDF,.PNG,.JPG,.JPEG" onChange={(e) => handleFileUpload('pdf', e)} />
                                        </label>
                                        <button type="button" onClick={() => handleDownload(filePdf, filePdfName || `${name || 'part'}_plan`)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[10px] hover:bg-blue-100">
                                            DL
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100">
                                    Upload PDF/IMG
                                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.PDF,.PNG,.JPG,.JPEG" onChange={(e) => handleFileUpload('pdf', e)} />
                                </label>
                            )}
                        </div>

                        {/* DXF Box */}
                        <div 
                            className={`border rounded-md p-3 flex flex-col items-center justify-center bg-white transition-colors ${activeView === 'dxf' ? 'border-[#0078d4] ring-1 ring-[#0078d4]' : dragActive === 'dxf' ? 'border-[#0078d4] bg-blue-50' : 'border-slate-200'}`}
                            onDragEnter={(e) => handleDrag(e, 'dxf')}
                            onDragLeave={(e) => handleDrag(e, null)}
                            onDragOver={(e) => handleDrag(e, 'dxf')}
                            onDrop={(e) => handleDrop('dxf', e)}
                        >
                            <span className="text-xs font-bold text-slate-700 mb-2">Fichier DXF</span>
                            {fileDxf ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-green-600 mb-2 truncate max-w-[80px]" title={fileDxfName || ''}>
                                        ✓ {fileDxfName || 'Fichier chargé'}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setActiveView('dxf')}
                                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${activeView === 'dxf' ? 'bg-[#0078d4] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            Afficher
                                        </button>
                                        <label className="cursor-pointer px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[10px] hover:bg-slate-200">
                                            Remplacer
                                            <input type="file" className="hidden" accept=".dxf,.DXF" onChange={(e) => handleFileUpload('dxf', e)} />
                                        </label>
                                        <button type="button" onClick={() => handleDownload(fileDxf, fileDxfName || `${name || 'part'}.dxf`)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[10px] hover:bg-blue-100">
                                            DL
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleFillFromDxf}
                                        disabled={isScanning}
                                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                        {isScanning ? 'Analyse...' : 'Extraire données DXF'}
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100">
                                    Upload DXF
                                    <input type="file" className="hidden" accept=".dxf,.DXF" onChange={(e) => handleFileUpload('dxf', e)} />
                                </label>
                            )}
                        </div>

                        {/* STEP Box */}
                        <div 
                            className={`border rounded-md p-3 flex flex-col items-center justify-center bg-white transition-colors ${activeView === 'step' ? 'border-[#0078d4] ring-1 ring-[#0078d4]' : dragActive === 'step' ? 'border-[#0078d4] bg-blue-50' : 'border-slate-200'}`}
                            onDragEnter={(e) => handleDrag(e, 'step')}
                            onDragLeave={(e) => handleDrag(e, null)}
                            onDragOver={(e) => handleDrag(e, 'step')}
                            onDrop={(e) => handleDrop('step', e)}
                        >
                            <span className="text-xs font-bold text-slate-700 mb-2">Fichier STEP</span>
                            {fileStep ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-green-600 mb-2 truncate max-w-[80px]" title={fileStepName || ''}>
                                        ✓ {fileStepName || 'Fichier chargé'}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setActiveView('step')}
                                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${activeView === 'step' ? 'bg-[#0078d4] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            Afficher
                                        </button>
                                        <label className="cursor-pointer px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[10px] hover:bg-slate-200">
                                            Remplacer
                                            <input type="file" className="hidden" accept=".step,.stp,.STEP,.STP" onChange={(e) => handleFileUpload('step', e)} />
                                        </label>
                                        <button type="button" onClick={() => handleDownload(fileStep, fileStepName || `${name || 'part'}.step`)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[10px] hover:bg-blue-100">
                                            DL
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100">
                                    Upload STEP
                                    <input type="file" className="hidden" accept=".step,.stp,.STEP,.STP" onChange={(e) => handleFileUpload('step', e)} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle Panel: Recapitulatif (20%) */}
                <div className={`w-full ${isSubForm ? '' : 'md:w-[20%] lg:w-[20%]'} flex flex-col gap-4 overflow-y-auto pr-2 max-h-[80vh]`}>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Récapitulatif</h3>
                        <div className="space-y-3">
                            <div className="py-2 border-b border-slate-200">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 font-bold">Matériel</span>
                                </div>
                                {(() => {
                                    const laserOp = partOps.find(po => po.laserParams);
                                    if (laserOp && laserOp.laserParams) {
                                        return (
                                            <>
                                                {/* Pricing selections removed per user request */}
                                                <div className="mt-2 pl-2 border-l-2 border-slate-200">
                                                    <span className="text-[10px] text-slate-400 italic">Détails opérationnels configurés</span>
                                                </div>
                                            </>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            
                            {operationCosts.map(oc => (
                                <div key={oc.id} className="py-2 border-b border-slate-200">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">{oc.name}</span>
                                    </div>
                                </div>
                            ))}

                            {subcontractingItems.length > 0 && (
                                <div className="py-2 border-b border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Sous-traitance</div>
                                    {subcontractingItems.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm py-0.5">
                                            <span className="text-slate-600 truncate max-w-[120px]">{item.description}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Global Subcontracting Links */}
                            {(() => {
                                const globalSubs = subcontractings.filter(s => s.partId === initialData?.id);
                                if (globalSubs.length === 0) return null;
                                return (
                                    <div className="py-2 border-b border-slate-200">
                                        <div className="text-xs font-bold text-blue-500 uppercase tracking-tight mb-1">Sous-traitance Liée</div>
                                        {globalSubs.map(s => (
                                            <div key={s.id} className="flex justify-between text-sm py-0.5">
                                                <span className="text-blue-600 truncate max-w-[120px]">{s.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                            
                            <div className="pt-3 mt-2 border-t-2 border-slate-200">
                                <div className="mt-2 text-[10px] text-slate-400 italic">
                                    Temps total estimé: {totalMachineTimeMinutes.toFixed(1)} min
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Form (25%) */}
                <div className={`w-full ${isSubForm ? '' : 'md:w-[25%] lg:w-[25%]'} flex flex-col gap-4 overflow-y-auto pr-2 max-h-[80vh]`}>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label htmlFor="partName" className="block text-sm font-medium text-slate-700">Part Name</label>
                            <input
                                type="text"
                                id="partName"
                                value={name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                }}
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                                    errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                                }`}
                            />
                            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="ownerId" className="block text-sm font-medium text-slate-700">Client</label>
                            <select
                                id="ownerId"
                                value={ownerId}
                                onChange={(e) => setOwnerId(e.target.value)}
                                className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm sm:text-sm focus:border-[#0078d4] focus:ring-[#0078d4] p-2 bg-slate-50"
                            >
                                <option value="">-- Aucun client (Générique) --</option>
                                {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Subcontracting Addons</label>
                                <p className="text-xs text-slate-500 mt-1">Managed in sub-items or globally.</p>
                            </div>
                        </div>
                <button 
                    type="button" 
                    onClick={() => setShowMaterialFilters(!showMaterialFilters)}
                    className="flex justify-between items-center w-full text-sm font-medium text-slate-700"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matériel</span>
                        <span className="truncate max-w-[180px]">
                            {materialId ? materials.find(m => m.id === materialId)?.description : 'Sélectionner un matériel'}
                        </span>
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${showMaterialFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                {showMaterialFilters && (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                        {/* Material Filters */}
                        <div className="flex flex-col gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Type de profilé</label>
                                <select 
                                    value={filterType} 
                                    onChange={e => {
                                        setFilterType(e.target.value);
                                        setFilterMaterialType('');
                                        setFilterProfile('');
                                        setFilterThickness('');
                                        setMaterialId('');
                                    }} 
                                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-xs"
                                >
                                    <option value="">Tous les types</option>
                                    {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Matière</label>
                                <select 
                                    value={filterMaterialType} 
                                    onChange={e => {
                                        setFilterMaterialType(e.target.value);
                                        setFilterProfile('');
                                        setFilterThickness('');
                                        setMaterialId('');
                                    }} 
                                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-xs"
                                >
                                    <option value="">Toutes les matières</option>
                                    {availableMaterialTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Dimensions du profilé</label>
                                <select 
                                    value={filterProfile} 
                                    onChange={e => {
                                        setFilterProfile(e.target.value);
                                        setFilterThickness('');
                                        setMaterialId('');
                                    }} 
                                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-xs"
                                >
                                    <option value="">Toutes les dimensions</option>
                                    {availableProfiles.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Épaisseur</label>
                                <select 
                                    value={filterThickness} 
                                    onChange={e => {
                                        setFilterThickness(e.target.value);
                                        setMaterialId('');
                                    }} 
                                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-xs"
                                >
                                    <option value="">Toutes les épaisseurs</option>
                                    {availableThicknesses.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#0078d4] uppercase">Sélection finale</label>
                            <select
                                id="partMaterial"
                                value={materialId}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    setMaterialId(e.target.value);
                                    if (errors.materialId) setErrors(prev => ({ ...prev, materialId: '' }));
                                    // Optionally close filters after selection
                                    // setShowMaterialFilters(false);
                                }}
                                className={`block w-full rounded-md shadow-sm sm:text-sm ${
                                    errors.materialId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                                }`}
                            >
                                <option value="" disabled>Choisir le matériel spécifique</option>
                                {filteredMaterials.map(m => <option key={m.id} value={m.id}>{m.description}</option>)}
                            </select>
                            {errors.materialId && <p className="mt-1 text-xs text-red-600">{errors.materialId}</p>}
                            {filteredMaterials.length === 0 && <p className="mt-1 text-[10px] text-slate-500 italic">Aucun matériel ne correspond aux filtres.</p>}
                        </div>

                        <button 
                            type="button"
                            onClick={() => setShowMaterialFilters(false)}
                            className="w-full py-2 text-xs font-bold text-white bg-[#0078d4] rounded hover:bg-[#106ebe] transition-colors"
                        >
                            Confirmer la sélection
                        </button>
                    </div>
                )}
            </div>

            <div className={`grid gap-4 ${dimensionConfig.z ? 'grid-cols-3' : (dimensionConfig.y ? 'grid-cols-2' : 'grid-cols-1')}`}>
                {dimensionConfig.x && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">{dimensionConfig.labels.x}</label>
                        <input
                            type="number"
                            value={dimensionX || ''}
                            onChange={(e) => setDimensionX(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                            placeholder="0.00"
                        />
                    </div>
                )}
                {dimensionConfig.y && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">{dimensionConfig.labels.y}</label>
                        <input
                            type="number"
                            value={dimensionY || ''}
                            onChange={(e) => setDimensionY(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                            placeholder="0.00"
                        />
                    </div>
                )}
                {dimensionConfig.z && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">{dimensionConfig.labels.z}</label>
                        <input
                            type="number"
                            value={dimensionZ || ''}
                            onChange={(e) => setDimensionZ(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                            placeholder="0.00"
                        />
                    </div>
                )}
            </div>

            <div className="border-t border-slate-200 pt-4">
                <SupplierLinksField 
                    links={supplierLinks} 
                    suppliers={suppliers} 
                    onChange={setSupplierLinks} 
                />
            </div>

                     <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Operations</label>
                    <div className="flex gap-2 mb-2">
                        <select
                            value={selectedOpToAdd}
                            onChange={(e) => setSelectedOpToAdd(e.target.value)}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                        >
                            <option value="" disabled>Sélectionner une opération...</option>
                            {operations.filter(op => !op.availableIn || op.availableIn.includes('part')).map(op => (
                                <option key={op.id} value={op.id}>{op.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleAddOperation}
                            disabled={!selectedOpToAdd}
                            className="px-3 py-2 bg-[#0078d4] text-white rounded-md text-sm font-medium hover:bg-[#106ebe] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            Ajouter
                        </button>
                    </div>
                    <div className={`space-y-2 max-h-96 overflow-y-auto border rounded-md p-2 ${
                        errors.operations ? 'border-red-300' : 'border-slate-300'
                    }`}>
                        {partOps.map((currentPartOp, index) => {
                            const op = operations.find(o => o.id === currentPartOp.operationId);
                            if (!op) return null;
                            const isBending = op.name?.toLowerCase().includes('pliage') || op.name?.toLowerCase().includes('bend');
                            const isLaserSheet = (op.name?.toLowerCase().includes('laser') || op.name?.toLowerCase().includes('découpe') || op.name?.toLowerCase().includes('cut')) && !op.name?.toLowerCase().includes('tube');
                            const isLaserTube = (op.name?.toLowerCase().includes('laser') || op.name?.toLowerCase().includes('découpe') || op.name?.toLowerCase().includes('cut')) && op.name?.toLowerCase().includes('tube');

                            return (
                                <div key={currentPartOp.id} className="border rounded-md p-2 bg-white shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <button type="button" onClick={() => moveOperation(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                                </button>
                                                <button type="button" onClick={() => moveOperation(index, 'down')} disabled={index === partOps.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </button>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 w-4">{index + 1}.</span>
                                            <span className="text-sm text-slate-700 font-medium">{op.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(isBending || isLaserSheet || isLaserTube) && (
                                                <button type="button" onClick={() => setExpandedOpId(expandedOpId === currentPartOp.id ? null : currentPartOp.id!)} className="text-xs text-[#0078d4]">
                                                    {expandedOpId === currentPartOp.id ? 'Collapse' : 'Configure'}
                                                </button>
                                            )}
                                            <button type="button" onClick={() => handleRemoveOperation(currentPartOp.id!)} className="text-slate-400 hover:text-red-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    {isBending && expandedOpId === currentPartOp.id && currentPartOp?.bendingParams && (
                                        <div className="mt-2 p-3 bg-slate-50 rounded-md space-y-2 border border-slate-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Setups</label>
                                                    <input type="number" value={currentPartOp.bendingParams.numberOfSetups ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, bendingParams: {...po.bendingParams!, numberOfSetups: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Bends</label>
                                                    <input type="number" value={currentPartOp.bendingParams.numberOfBends ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, bendingParams: {...po.bendingParams!, numberOfBends: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Area (sq in)</label>
                                                    <input 
                                                        type="number" 
                                                        value={currentPartOp.bendingParams.areaSqIn ?? 0} 
                                                        onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, bendingParams: {...po.bendingParams!, areaSqIn: parseFloat(e.target.value) || 0}} : po))} 
                                                        className={`block w-full rounded-md border-slate-300 shadow-sm sm:text-xs ${blankArea > 0 ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                                        disabled={blankArea > 0}
                                                    />
                                                    {blankArea > 0 && <p className="text-[10px] text-slate-400 italic">Calculé via dimensions</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Weight (lbs)</label>
                                                    <input type="number" value={currentPartOp.bendingParams.weightLbs ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, bendingParams: {...po.bendingParams!, weightLbs: parseFloat(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Reverses</label>
                                                    <input type="number" value={currentPartOp.bendingParams.numberOfReverses ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, bendingParams: {...po.bendingParams!, numberOfReverses: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={currentPartOp.bendingParams.useNeoprene} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, bendingParams: {...po.bendingParams!, useNeoprene: e.target.checked}} : po))} className="h-4 w-4 text-[#0078d4] border-slate-300 rounded" />
                                                <label className="text-xs text-slate-600">Néoprène</label>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, isConfirmed: false, bendingResult: null} : po))} className="text-xs text-red-600">Abort</button>
                                                <button type="button" onClick={() => setPartOps(prev => prev.map(po => {
                                                    if (po.id === currentPartOp.id && po.bendingParams) {
                                                        const result = calculateBendingCost(bendingSettings, { ...po.bendingParams, quantity });
                                                        return { ...po, isConfirmed: true, bendingResult: result };
                                                    }
                                                    return po;
                                                }))} className="text-xs text-green-600 font-bold">Confirm</button>
                                            </div>
                                        </div>
                                    )}
                                    {isLaserSheet && expandedOpId === currentPartOp.id && currentPartOp?.laserParams && (
                                        <div className="mt-2 p-3 bg-slate-50 rounded-md space-y-2 border border-slate-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Longueur de coupe (po)</label>
                                                    <input type="number" value={currentPartOp.laserParams.cutLengthInches ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserParams: {...po.laserParams!, cutLengthInches: parseFloat(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Rendement (%)</label>
                                                    <input type="number" value={currentPartOp.laserParams.yieldPercentage ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserParams: {...po.laserParams!, yieldPercentage: parseFloat(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Aire du BLANK CARRÉ (po²)</label>
                                                    <input 
                                                        type="number" 
                                                        value={currentPartOp.laserParams.blankAreaSqIn ?? 0} 
                                                        onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserParams: {...po.laserParams!, blankAreaSqIn: parseFloat(e.target.value) || 0}} : po))} 
                                                        className={`block w-full rounded-md border-slate-300 shadow-sm sm:text-xs ${blankArea > 0 ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                                        disabled={blankArea > 0}
                                                    />
                                                    {blankArea > 0 && <p className="text-[10px] text-slate-400 italic">Calculé via dimensions</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Nombre de perçage</label>
                                                    <input type="number" value={currentPartOp.laserParams.numberOfPierces ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserParams: {...po.laserParams!, numberOfPierces: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Puissance (kW)</label>
                                                    <select value={currentPartOp.laserParams.powerkW} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserParams: {...po.laserParams!, powerkW: parseInt(e.target.value) as 6 | 12}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs">
                                                        <option value={6}>6 kW</option>
                                                        <option value={12}>12 kW</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Nb Feuilles (Nest)</label>
                                                    <input type="number" value={currentPartOp.laserParams.numberOfSheets ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserParams: {...po.laserParams!, numberOfSheets: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Aire Feuille (po²)</label>
                                                    <input type="number" value={currentPartOp.laserParams.sheetAreaSqIn ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserParams: {...po.laserParams!, sheetAreaSqIn: parseFloat(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Temps de setup (min)</label>
                                                    <input type="number" value={currentPartOp.laserParams.setupTimeMinutes ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserParams: {...po.laserParams!, setupTimeMinutes: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button type="button" onClick={() => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, isConfirmed: false, laserResult: null} : po))} className="text-xs text-red-600">Abort</button>
                                                <button type="button" onClick={() => setPartOps(prev => prev.map(po => {
                                                    if (po.id === currentPartOp.id && po.laserParams) {
                                                        const material = materials.find(m => m.id === materialId);
                                                        const result = calculateLaserCost(laserSettings, material, { ...po.laserParams, quantity });
                                                        return { ...po, isConfirmed: true, laserResult: result };
                                                    }
                                                    return po;
                                                }))} className="text-xs text-green-600 font-bold">Confirm</button>
                                            </div>
                                        </div>
                                    )}
                                    {isLaserTube && expandedOpId === currentPartOp.id && currentPartOp?.laserTubeParams && (
                                        <div className="mt-2 p-3 bg-slate-50 rounded-md space-y-2 border border-slate-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Longueur de coupe (po)</label>
                                                    <input type="number" value={currentPartOp.laserTubeParams.cutLengthInches ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserTubeParams: {...po.laserTubeParams!, cutLengthInches: parseFloat(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Nbr Perçages</label>
                                                    <input type="number" value={currentPartOp.laserTubeParams.numberOfPierces ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserTubeParams: {...po.laserTubeParams!, numberOfPierces: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Nombre de Barres</label>
                                                    <input type="number" value={currentPartOp.laserTubeParams.numberOfBars ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserTubeParams: {...po.laserTubeParams!, numberOfBars: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Puissance (kW)</label>
                                                    <input type="number" value={currentPartOp.laserTubeParams.powerkW ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserTubeParams: {...po.laserTubeParams!, powerkW: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700">Temps de setup (min)</label>
                                                    <input type="number" value={currentPartOp.laserTubeParams.setupTimeMinutes ?? 0} onChange={e => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, laserTubeParams: {...po.laserTubeParams!, setupTimeMinutes: parseInt(e.target.value) || 0}} : po))} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button type="button" onClick={() => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, isConfirmed: false, laserTubeResult: null} : po))} className="text-xs text-red-600">Abort</button>
                                                <button type="button" onClick={() => setPartOps(prev => prev.map(po => {
                                                    if (po.id === currentPartOp.id && po.laserTubeParams) {
                                                        const material = materials.find(m => m.id === materialId);
                                                        const result = calculateLaserTubeCost(laserTubeSettings, material, { ...po.laserTubeParams, quantity });
                                                        return { ...po, isConfirmed: true, laserTubeResult: result };
                                                    }
                                                    return po;
                                                }))} className="text-xs text-green-600 font-bold">Confirm</button>
                                            </div>
                                        </div>
                                    )}
                                    {!isBending && !isLaserSheet && !isLaserTube && (
                                        <div className="mt-2 ml-7 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={currentPartOp.estimatedTimeMinutes}
                                                    onChange={(e) => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, estimatedTimeMinutes: parseInt(e.target.value) || 0} : po))}
                                                    className="block w-20 rounded-md border-slate-300 shadow-sm sm:text-xs"
                                                    min="0"
                                                />
                                                <span className="text-xs text-slate-500">min</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={currentPartOp.requiresHelper || false} 
                                                        onChange={(e) => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, requiresHelper: e.target.checked} : po))}
                                                        className="h-3 w-3 text-blue-600 border-slate-300 rounded"
                                                    />
                                                    <span className="text-[10px] font-medium text-slate-600">Requires Helper</span>
                                                </label>
                                                {currentPartOp.requiresHelper && (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={currentPartOp.helperTimeMinutes || 0}
                                                            onChange={(e) => setPartOps(prev => prev.map(po => po.id === currentPartOp.id ? {...po, helperTimeMinutes: parseInt(e.target.value) || 0} : po))}
                                                            className="block w-14 rounded-md border-slate-300 shadow-sm text-[10px]"
                                                            min="0"
                                                        />
                                                        <span className="text-[10px] text-slate-500">helper min</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {partOps.length === 0 && (
                            <div className="text-center py-4 text-sm text-slate-500 italic">
                                Aucune opération ajoutée.
                            </div>
                        )}
                    </div>
                    {errors.operations && <p className="mt-1 text-xs text-red-600">{errors.operations}</p>}
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-900 mb-2">Sous-traitance</label>
                    <SubcontractingRequirementSelector 
                        items={subcontractingItems}
                        subcontractings={subcontractings}
                        onChange={setSubcontractingItems}
                        applyType="perUnit"
                    />
                </div>
            </div>
        </div>

    <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button 
                  type={isSubForm ? "button" : "submit"} 
                  onClick={isSubForm ? () => handleSubmit() : undefined}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
                >
                  {submitText}
                </button>
            </div>
        </FormContainer>
    );
};


interface AssemblyFormProps {
    clients?: Client[];
    parts: Part[];
    assemblies: Assembly[];
    operations: Operation[];
    materials: Material[];
    suppliers: Supplier[];
    subcontractings: Subcontracting[];
    bendingSettings: BendingSettings;
    laserSettings: LaserSettings;
    laserTubeSettings: LaserTubeSettings;
    onSubmit: (assembly: Omit<Assembly, 'id'> | Assembly) => void;
    onCancel: () => void;
    onAddPart?: (part: Omit<Part, 'id'>) => Promise<string>;
    onAddAssembly?: (assembly: Omit<Assembly, 'id'>) => Promise<string>;
    initialData?: Assembly | null;
    isSubForm?: boolean;
}

export const AssemblyForm: React.FC<AssemblyFormProps> = ({ clients, parts, assemblies, operations, materials, suppliers, subcontractings, bendingSettings, laserSettings, laserTubeSettings, onSubmit, onCancel, onAddPart, onAddAssembly, initialData, isSubForm }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [ownerId, setOwnerId] = useState(initialData?.ownerId || '');
    const quantity = 1;
    const [selectedItems, setSelectedItems] = useState<AssemblyItem[]>(() => 
        (initialData?.items || []).map(item => ({ 
            ...item, 
            tempId: item.tempId || `item-${Math.random().toString(36).substring(2, 9)}` 
        }))
    );
    const [assemblyOps, setAssemblyOps] = useState<PartOperation[]>(() => 
        (initialData?.operations || []).map(po => ({ 
            ...po, 
            id: po.id || `op-${Math.random().toString(36).substring(2, 9)}` 
        }))
    );
    const [subcontractingItems, setSubcontractingItems] = useState<SubcontractingItem[]>(initialData?.subcontractingItems || []);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showQuickPart, setShowQuickPart] = useState(false);
    const [showQuickAssembly, setShowQuickAssembly] = useState(false);
    const [expandedOpId, setExpandedOpId] = useState<string | null>(null);
    const [selectedOpToAdd, setSelectedOpToAdd] = useState<string>('');
    const [partSearchTerm, setPartSearchTerm] = useState('');
    const [filePdf, setFilePdf] = useState<string | null>(initialData?.filePdf || null);
    const [filePdfName, setFilePdfName] = useState<string | null>(initialData?.filePdfName || null);
    const [fileDxf, setFileDxf] = useState<string | null>(initialData?.fileDxf || null);
    const [fileDxfName, setFileDxfName] = useState<string | null>(initialData?.fileDxfName || null);
    const [fileStep, setFileStep] = useState<string | null>(initialData?.fileStep || null);
    const [fileStepName, setFileStepName] = useState<string | null>(initialData?.fileStepName || null);
    const [activeView, setActiveView] = useState<'pdf' | 'dxf' | 'step' | null>('pdf');
    const [dragActive, setDragActive] = useState<'pdf' | 'dxf' | 'step' | null>(null);

    const handleDrag = (e: React.DragEvent<HTMLDivElement>, type: 'pdf' | 'dxf' | 'step' | null) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(type);
        } else if (e.type === "dragleave") {
            setDragActive(null);
        }
    };

    const handleItemChange = (type: 'part' | 'assembly', id: string, itemQuantity: number) => {
        if (itemQuantity > 0) {
            setSelectedItems(prev => {
                const existing = prev.find(p => p.id === id && p.type === type);
                if (existing) {
                    return prev.map(p => (p.id === id && p.type === type) ? { ...p, quantity: itemQuantity } : p);
                }
                return [...prev, { type, id, quantity: itemQuantity }];
            });
        } else {
            setSelectedItems(prev => prev.filter(p => !(p.id === id && p.type === type)));
        }
    };

    const handleAddOperation = () => {
        if (!selectedOpToAdd) return;
        const op = operations.find(o => o.id === selectedOpToAdd);
        const isBending = op?.name?.toLowerCase().includes('pliage') || op?.name?.toLowerCase().includes('bend');
        setAssemblyOps(prev => [...prev, { 
            id: Date.now().toString() + Math.random().toString(),
            operationId: selectedOpToAdd, 
            estimatedTimeMinutes: 60, 
            dependencies: [], 
            delayDays: 0,
            isConfirmed: !isBending,
            bendingParams: isBending ? {
                numberOfSetups: 1,
                numberOfBends: 1,
                areaSqIn: 0,
                weightLbs: 0,
                useNeoprene: false,
                quantity: quantity,
                numberOfReverses: 0
            } : undefined
        }]);
        setSelectedOpToAdd('');
        if (errors.operations) setErrors(prev => ({ ...prev, operations: '' }));
    };

    const handleRemoveOperation = (idToRemove: string) => {
        setAssemblyOps(prev => prev.filter(po => po.id !== idToRemove));
    };

    const handleToggleOpDependency = (opId: string, depId: string) => {
        setAssemblyOps(prev => prev.map(op => {
            if (op.id === opId) {
                const isDep = op.dependencies.includes(depId);
                return {
                    ...op,
                    dependencies: isDep 
                        ? op.dependencies.filter(id => id !== depId)
                        : [...op.dependencies, depId]
                };
            }
            return op;
        }));
    };

    const moveOperation = (index: number, direction: 'up' | 'down') => {
        setAssemblyOps(prev => {
            const newOps = [...prev];
            if (direction === 'up' && index > 0) {
                [newOps[index - 1], newOps[index]] = [newOps[index], newOps[index - 1]];
            } else if (direction === 'down' && index < newOps.length - 1) {
                [newOps[index + 1], newOps[index]] = [newOps[index], newOps[index + 1]];
            }
            return newOps;
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'dxf' | 'step') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (type === 'pdf') {
                setFilePdf(base64String);
                setFilePdfName(file.name);
            } else if (type === 'dxf') {
                setFileDxf(base64String);
                setFileDxfName(file.name);
            } else if (type === 'step') {
                setFileStep(base64String);
                setFileStepName(file.name);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'pdf' | 'dxf' | 'step') => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (type === 'pdf') {
                setFilePdf(base64String);
                setFilePdfName(file.name);
            } else if (type === 'dxf') {
                setFileDxf(base64String);
                setFileDxfName(file.name);
            } else if (type === 'step') {
                setFileStep(base64String);
                setFileStepName(file.name);
            }
        };
        reader.readAsDataURL(file);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }
        
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            const file = e.clipboardData.files[0];
            if (file.type?.startsWith('image/') || file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    setFilePdf(base64String);
                    setFilePdfName(file.name || 'pasted_image.png');
                    setActiveView('pdf');
                };
                reader.readAsDataURL(file);
            }
        }
    };


    const handleDownload = (base64Data: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Assembly name is required';
        if (selectedItems.length === 0) newErrors.items = 'At least one item must be selected';
        if (quantity <= 0) newErrors.quantity = 'Quantity must be at least 1';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (validate()) {
            if (assemblyOps.some(po => !po.isConfirmed)) {
                setErrors(prev => ({ ...prev, operations: 'Please confirm all operation parameters' }));
                return;
            }
            const processedOps = assemblyOps.map(po => {
                const op = operations.find(o => o.id === po.operationId);
                if (op?.name?.toLowerCase().includes('pliage') && po.bendingParams) {
                    const result = calculateBendingCost(bendingSettings, { ...po.bendingParams, quantity });
                    return { ...po, estimatedTimeMinutes: result.totalTimeMinutes, bendingResult: result };
                }
                return po;
            });

            if (initialData) {
                onSubmit({ ...initialData, name: name.trim(), items: selectedItems, operations: processedOps, quantity, filePdf: filePdf || null, filePdfName: filePdfName || null, fileDxf: fileDxf || null, fileDxfName: fileDxfName || null, fileStep: fileStep || null, fileStepName: fileStepName || null, subcontractingItems, ownerId: ownerId });
            } else {
                onSubmit({ name: name.trim(), items: selectedItems, operations: processedOps, quantity, filePdf: filePdf || null, filePdfName: filePdfName || null, fileDxf: fileDxf || null, fileDxfName: fileDxfName || null, fileStep: fileStep || null, fileStepName: fileStepName || null, subcontractingItems, ownerId: ownerId });
            }
        }
    };

    const submitText = initialData ? 'Save Changes' : 'Add Assembly';

    const itemCosts = useMemo(() => {
        return selectedItems.map(item => {
            let unitPrice = 0;
            let itemName: string;
            if (item.type === 'part') {
                const part = parts.find(p => p.id === item.id);
                itemName = part?.name || 'Unknown Part';
                if (part) {
                    unitPrice = calculatePartUnitCost(part, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
                }
            } else {
                const subAssembly = assemblies.find(a => a.id === item.id);
                itemName = subAssembly?.name || 'Unknown Assembly';
                if (subAssembly) {
                    unitPrice = calculateAssemblyUnitCost(subAssembly, parts, assemblies, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
                }
            }
            return {
                id: item.tempId || item.id,
                name: itemName,
                quantity: item.quantity,
                unitPrice
            };
        });
    }, [selectedItems, parts, assemblies, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings]);

    const operationCosts = useMemo(() => {
        return assemblyOps.map(po => {
            const op = operations.find(o => o.id === po.operationId);
            let unitPrice = 0;
            if (op?.name?.toLowerCase().includes('pliage') || op?.name?.toLowerCase().includes('bend')) {
                if (po.bendingParams) {
                    const result = calculateBendingCost(bendingSettings, { ...po.bendingParams, quantity });
                    unitPrice = result.unitPrice;
                }
            } else if (op?.name?.toLowerCase().includes('laser') && !op?.name?.toLowerCase().includes('tube')) {
                if (po.laserParams) {
                    const result = calculateLaserCost(laserSettings, null, { ...po.laserParams, quantity });
                    unitPrice = result.unitPrice;
                }
            } else if (op?.name?.toLowerCase().includes('laser') && op?.name?.toLowerCase().includes('tube')) {
                if (po.laserTubeParams) {
                    const result = calculateLaserTubeCost(laserTubeSettings, null, { ...po.laserTubeParams, quantity });
                    unitPrice = result.unitPrice;
                }
            } else {
                unitPrice = ((op?.rate || 0) * (po.estimatedTimeMinutes / 60)) / quantity;
            }
            return {
                id: po.id,
                name: op?.name || 'Unknown',
                unitPrice
            };
        });
    }, [assemblyOps, operations, bendingSettings, laserSettings, laserTubeSettings, quantity]);

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4 h-full flex flex-col">
            <div className={`flex flex-col ${isSubForm ? '' : 'md:flex-row lg:flex-row'} gap-6 h-full`}>
                {/* Left Panel: Image Upload (40%) */}
                <div className={`w-full ${isSubForm ? '' : 'md:w-[40%] lg:w-[40%]'} flex flex-col gap-2`}>
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-900">Plan / Dessin</h3>
                    </div>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden relative max-h-[70vh]" style={{ aspectRatio: '11/8.5' }}>
                        {activeView === 'pdf' && filePdf ? (
                            <PdfViewerComponent data={filePdf} />
                        ) : activeView === 'dxf' && fileDxf ? (
                            <DxfViewerComponent data={fileDxf} />
                        ) : activeView === 'step' && fileStep ? (
                            <StepViewerComponent data={fileStep} />
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center">
                                <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Sélectionnez un fichier pour l'afficher</span>
                            </div>
                        )}
                    </div>

                    {/* 3 Upload Boxes */}
                    <div className="grid grid-cols-3 gap-4 mt-2">
                        {/* PDF Box */}
                        <div 
                            className={`border rounded-md p-3 flex flex-col items-center justify-center bg-white transition-colors ${activeView === 'pdf' ? 'border-[#0078d4] ring-1 ring-[#0078d4]' : dragActive === 'pdf' ? 'border-[#0078d4] bg-blue-50' : 'border-slate-200'}`}
                            onDragEnter={(e) => handleDrag(e, 'pdf')}
                            onDragLeave={(e) => handleDrag(e, null)}
                            onDragOver={(e) => handleDrag(e, 'pdf')}
                            onDrop={(e) => handleDrop(e, 'pdf')}
                        >
                            <span className="text-xs font-bold text-slate-700 mb-2">Plan (PDF/IMG)</span>
                            {filePdf ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-green-600 mb-2 truncate max-w-[80px]" title={filePdfName || ''}>
                                        ✓ {filePdfName || 'Fichier chargé'}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setActiveView('pdf')}
                                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${activeView === 'pdf' ? 'bg-[#0078d4] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            Afficher
                                        </button>
                                        <label className="cursor-pointer px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[10px] hover:bg-slate-200">
                                            Remplacer
                                            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.PDF,.PNG,.JPG,.JPEG" onChange={(e) => handleFileUpload(e, 'pdf')} />
                                        </label>
                                        <button type="button" onClick={() => handleDownload(filePdf, filePdfName || `${name || 'assembly'}_plan`)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[10px] hover:bg-blue-100">
                                            DL
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100">
                                    Upload PDF/IMG
                                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.PDF,.PNG,.JPG,.JPEG" onChange={(e) => handleFileUpload(e, 'pdf')} />
                                </label>
                            )}
                        </div>

                        {/* DXF Box */}
                        <div 
                            className={`border rounded-md p-3 flex flex-col items-center justify-center bg-white transition-colors ${activeView === 'dxf' ? 'border-[#0078d4] ring-1 ring-[#0078d4]' : dragActive === 'dxf' ? 'border-[#0078d4] bg-blue-50' : 'border-slate-200'}`}
                            onDragEnter={(e) => handleDrag(e, 'dxf')}
                            onDragLeave={(e) => handleDrag(e, null)}
                            onDragOver={(e) => handleDrag(e, 'dxf')}
                            onDrop={(e) => handleDrop(e, 'dxf')}
                        >
                            <span className="text-xs font-bold text-slate-700 mb-2">Fichier DXF</span>
                            {fileDxf ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-green-600 mb-2 truncate max-w-[80px]" title={fileDxfName || ''}>
                                        ✓ {fileDxfName || 'Fichier chargé'}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setActiveView('dxf')}
                                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${activeView === 'dxf' ? 'bg-[#0078d4] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            Afficher
                                        </button>
                                        <label className="cursor-pointer px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[10px] hover:bg-slate-200">
                                            Remplacer
                                            <input type="file" className="hidden" accept=".dxf,.DXF" onChange={(e) => handleFileUpload(e, 'dxf')} />
                                        </label>
                                        <button type="button" onClick={() => handleDownload(fileDxf, fileDxfName || `${name || 'assembly'}.dxf`)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[10px] hover:bg-blue-100">
                                            DL
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100">
                                    Upload DXF
                                    <input type="file" className="hidden" accept=".dxf,.DXF" onChange={(e) => handleFileUpload(e, 'dxf')} />
                                </label>
                            )}
                        </div>

                        {/* STEP Box */}
                        <div 
                            className={`border rounded-md p-3 flex flex-col items-center justify-center bg-white transition-colors ${activeView === 'step' ? 'border-[#0078d4] ring-1 ring-[#0078d4]' : dragActive === 'step' ? 'border-[#0078d4] bg-blue-50' : 'border-slate-200'}`}
                            onDragEnter={(e) => handleDrag(e, 'step')}
                            onDragLeave={(e) => handleDrag(e, null)}
                            onDragOver={(e) => handleDrag(e, 'step')}
                            onDrop={(e) => handleDrop(e, 'step')}
                        >
                            <span className="text-xs font-bold text-slate-700 mb-2">Fichier STEP</span>
                            {fileStep ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-green-600 mb-2 truncate max-w-[80px]" title={fileStepName || ''}>
                                        ✓ {fileStepName || 'Fichier chargé'}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setActiveView('step')}
                                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${activeView === 'step' ? 'bg-[#0078d4] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            Afficher
                                        </button>
                                        <label className="cursor-pointer px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[10px] hover:bg-slate-200">
                                            Remplacer
                                            <input type="file" className="hidden" accept=".step,.stp,.STEP,.STP" onChange={(e) => handleFileUpload(e, 'step')} />
                                        </label>
                                        <button type="button" onClick={() => handleDownload(fileStep, fileStepName || `${name || 'assembly'}.step`)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[10px] hover:bg-blue-100">
                                            DL
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100">
                                    Upload STEP
                                    <input type="file" className="hidden" accept=".step,.stp,.STEP,.STP" onChange={(e) => handleFileUpload(e, 'step')} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle Panel: Items & Operations (40%) */}
                <div className={`w-full ${isSubForm ? '' : 'md:w-[40%] lg:w-[40%]'} flex flex-col gap-4 overflow-y-auto pr-2 max-h-[80vh]`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2">
                            <div>
                                <label htmlFor="assemblyName" className="block text-sm font-medium text-slate-700">Assembly Name</label>
                                <input
                                    type="text"
                                    id="assemblyName"
                                    value={name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setName(e.target.value);
                                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                                        errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                                    }`}
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="assemblyOwnerId" className="block text-sm font-medium text-slate-700">Client</label>
                                <select
                                    id="assemblyOwnerId"
                                    value={ownerId}
                                    onChange={(e) => setOwnerId(e.target.value)}
                                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm sm:text-sm focus:border-[#0078d4] focus:ring-[#0078d4] p-2 bg-slate-50"
                                >
                                    <option value="">-- Aucun client (Générique) --</option>
                                    {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Subcontracting Addons</label>
                                <p className="text-xs text-slate-500 mt-1">Managed in sub-items or globally.</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-slate-700">Items (Parts & Sub-assemblies)</label>
                            <div className="flex gap-2">
                                {onAddPart && (
                                    <button 
                                        type="button" 
                                        onClick={() => setShowQuickPart(true)}
                                        className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1"
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                        New Part
                                    </button>
                                )}
                                {onAddAssembly && (
                                    <button 
                                        type="button" 
                                        onClick={() => setShowQuickAssembly(true)}
                                        className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1"
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                        New Assembly
                                    </button>
                                )}
                            </div>
                        </div>

                        {showQuickPart && onAddPart && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Quick Add Part</h4>
                                <PartForm 
                                    clients={clients}
                                    materials={materials} 
                                    operations={operations} 
                                    suppliers={suppliers}
                                    subcontractings={subcontractings}
                                    bendingSettings={bendingSettings}
                                    laserSettings={laserSettings}
                                    laserTubeSettings={laserTubeSettings}
                                    isSubForm={true}
                                    onSubmit={async (data) => {
                                        const newId = await onAddPart(data);
                                        handleItemChange('part', newId, 1);
                                        setShowQuickPart(false);
                                    }} 
                                    onCancel={() => setShowQuickPart(false)} 
                                />
                            </div>
                        )}

                        {showQuickAssembly && onAddAssembly && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Quick Add Assembly</h4>
                                <AssemblyForm 
                                    clients={clients}
                                    parts={parts}
                                    assemblies={assemblies}
                                    operations={operations}
                                    materials={materials}
                                    suppliers={suppliers}
                                    subcontractings={subcontractings}
                                    bendingSettings={bendingSettings}
                                    laserSettings={laserSettings}
                                    laserTubeSettings={laserTubeSettings}
                                    isSubForm={true}
                                    onSubmit={async (data) => {
                                        const newId = await onAddAssembly(data as Omit<Assembly, 'id'>);
                                        handleItemChange('assembly', newId, 1);
                                        setShowQuickAssembly(false);
                                    }}
                                    onCancel={() => setShowQuickAssembly(false)}
                                    onAddPart={onAddPart}
                                    onAddAssembly={onAddAssembly}
                                />
                            </div>
                        )}

                        {!showQuickPart && !showQuickAssembly && (
                            <>
                                <div className="mt-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Rechercher une pièce..."
                                        value={partSearchTerm}
                                        onChange={(e) => setPartSearchTerm(e.target.value)}
                                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                                    />
                                </div>
                                <div className={`space-y-2 max-h-60 overflow-y-auto border rounded-md p-2 ${
                                    errors.items ? 'border-red-300' : 'border-slate-300'
                                }`}>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Parts</div>
                                    {(parts || []).filter(p => p.name.toLowerCase().includes(partSearchTerm.toLowerCase())).map(p => {
                                        const item = selectedItems.find(si => si.id === p.id && si.type === 'part');
                                        return (
                                            <div key={p.id} className="flex items-center justify-between gap-4 py-1 border-b border-slate-100 last:border-0">
                                                <span className="text-sm text-slate-600 flex-1">{p.name}</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item?.quantity || 0}
                                                    onChange={(e) => handleItemChange('part', p.id, parseInt(e.target.value, 10) || 0)}
                                                    className="w-20 rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                                                />
                                            </div>
                                        );
                                    })}
                                    
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">Sub-assemblies</div>
                                    {(assemblies || []).filter(a => initialData ? a.id !== initialData.id : true).map(a => {
                                        const item = selectedItems.find(si => si.id === a.id && si.type === 'assembly');
                                        return (
                                            <div key={a.id} className="flex items-center justify-between gap-4 py-1 border-b border-slate-100 last:border-0">
                                                <span className="text-sm text-slate-600 flex-1">{a.name}</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item?.quantity || 0}
                                                    onChange={(e) => handleItemChange('assembly', a.id, parseInt(e.target.value, 10) || 0)}
                                                    className="w-20 rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                {errors.items && <p className="mt-1 text-xs text-red-600">{errors.items}</p>}
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Assembly Operations (Post-Assembly)</label>
                        <div className="flex gap-2 mb-3">
                            <select
                                value={selectedOpToAdd}
                                onChange={(e) => setSelectedOpToAdd(e.target.value)}
                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                            >
                                <option value="">Sélectionner une opération...</option>
                                {operations.filter(op => !op.availableIn || op.availableIn.includes('assembly')).map(op => (
                                    <option key={op.id} value={op.id}>{op.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleAddOperation}
                                disabled={!selectedOpToAdd}
                                className="px-3 py-2 bg-[#0078d4] text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-[#106ebe] transition-colors"
                            >
                                Ajouter
                            </button>
                        </div>

                        <div className="space-y-2">
                            {assemblyOps.length === 0 && (
                                <p className="text-sm text-slate-500 italic text-center py-4 border border-dashed border-slate-300 rounded-md">
                                    Aucune opération ajoutée.
                                </p>
                            )}
                            {assemblyOps.map((po, index) => {
                                const op = operations.find(o => o.id === po.operationId);
                                if (!op) return null;
                                const isBending = op.name?.toLowerCase().includes('pliage') || op.name?.toLowerCase().includes('bend');

                                return (
                                    <div key={po.id} className="border border-slate-200 bg-white rounded-md p-3 shadow-sm flex flex-col gap-2 relative group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => moveOperation(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                                    </button>
                                                    <button type="button" onClick={() => moveOperation(index, 'down')} disabled={index === assemblyOps.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </button>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">{index + 1}. {op.name}</span>
                                                    {isBending && (
                                                        <span className="text-[10px] text-slate-500">
                                                            {po.isConfirmed ? '✓ Paramètres confirmés' : '⚠️ En attente de configuration'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isBending && (
                                                    <button type="button" onClick={() => setExpandedOpId(expandedOpId === po.id ? null : po.id)} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors">
                                                        {expandedOpId === po.id ? 'Fermer' : 'Configurer'}
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => handleRemoveOperation(po.id!)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>

                                        {isBending && expandedOpId === po.id && po.bendingParams && (
                                            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700">Setups</label>
                                                        <input type="number" value={po.bendingParams.numberOfSetups ?? 0} onChange={e => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, bendingParams: {...p.bendingParams!, numberOfSetups: parseInt(e.target.value) || 0}} : p))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700">Bends</label>
                                                        <input type="number" value={po.bendingParams.numberOfBends ?? 0} onChange={e => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, bendingParams: {...p.bendingParams!, numberOfBends: parseInt(e.target.value) || 0}} : p))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700">Area (sq in)</label>
                                                        <input type="number" value={po.bendingParams.areaSqIn ?? 0} onChange={e => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, bendingParams: {...p.bendingParams!, areaSqIn: parseFloat(e.target.value) || 0}} : p))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700">Weight (lbs)</label>
                                                        <input type="number" value={po.bendingParams.weightLbs ?? 0} onChange={e => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, bendingParams: {...p.bendingParams!, weightLbs: parseFloat(e.target.value) || 0}} : p))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700">Reverses</label>
                                                        <input type="number" value={po.bendingParams.numberOfReverses ?? 0} onChange={e => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, bendingParams: {...p.bendingParams!, numberOfReverses: parseInt(e.target.value) || 0}} : p))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-xs" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={po.bendingParams.useNeoprene} onChange={e => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, bendingParams: {...p.bendingParams!, useNeoprene: e.target.checked}} : p))} className="h-4 w-4 text-[#0078d4] border-slate-300 rounded" />
                                                    <label className="text-xs text-slate-600">Néoprène</label>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                                                    <button type="button" onClick={() => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, isConfirmed: false, bendingResult: null} : p))} className="text-xs text-red-600 hover:text-red-800 px-2 py-1">Annuler</button>
                                                    <button type="button" onClick={() => setAssemblyOps(prev => prev.map(p => {
                                                        if (p.id === po.id && p.bendingParams) {
                                                            const result = calculateBendingCost(bendingSettings, { ...p.bendingParams, quantity });
                                                            return { ...p, isConfirmed: true, bendingResult: result };
                                                        }
                                                        return p;
                                                    }))} className="text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded font-bold transition-colors">Confirmer</button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-slate-100">
                                            {!isBending && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Temps (min)</label>
                                                    <input
                                                        type="number"
                                                        value={po.estimatedTimeMinutes}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10) || 0;
                                                            setAssemblyOps(prev => prev.map(p => p.id === po.id ? { ...p, estimatedTimeMinutes: Math.max(0, val) } : p));
                                                        }}
                                                        className="block w-16 rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-xs py-1"
                                                        min="0"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={po.requiresHelper || false} 
                                                        onChange={(e) => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, requiresHelper: e.target.checked} : p))}
                                                        className="h-3 w-3 text-blue-600 border-slate-300 rounded"
                                                    />
                                                    <span className="text-[10px] font-medium text-slate-600 uppercase">Helper</span>
                                                </label>
                                                {po.requiresHelper && (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={po.helperTimeMinutes || 0}
                                                            onChange={(e) => setAssemblyOps(prev => prev.map(p => p.id === po.id ? {...p, helperTimeMinutes: parseInt(e.target.value) || 0} : p))}
                                                            className="block w-14 rounded-md border-slate-300 shadow-sm text-[10px] py-1"
                                                            min="0"
                                                        />
                                                        <span className="text-[10px] text-slate-500">min</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Délai (jours)</label>
                                                <input
                                                    type="number"
                                                    value={po.delayDays || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value, 10) || 0;
                                                        setAssemblyOps(prev => prev.map(p => p.id === po.id ? { ...p, delayDays: Math.max(0, val) } : p));
                                                    }}
                                                    className="block w-16 rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-xs py-1"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dépendances</label>
                                            <div className="flex flex-wrap gap-1">
                                                {assemblyOps.filter(other => other.id !== po.id).map((other, otherIdx) => {
                                                    const otherOp = operations.find(o => o.id === other.operationId);
                                                    const isDep = po.dependencies.includes(other.id!);
                                                    return (
                                                        <button
                                                            key={other.id}
                                                            type="button"
                                                            onClick={() => handleToggleOpDependency(po.id!, other.id!)}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                                                                isDep 
                                                                    ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            {otherIdx + 1}. {otherOp?.name}
                                                        </button>
                                                    );
                                                })}
                                                {assemblyOps.length <= 1 && (
                                                    <span className="text-[10px] text-slate-400 italic">Aucune autre opération disponible</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {errors.operations && <p className="mt-1 text-xs text-red-600">{errors.operations}</p>}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-900 mb-2">Sous-traitance</label>
                        <SubcontractingRequirementSelector 
                            items={subcontractingItems}
                            subcontractings={subcontractings}
                            onChange={setSubcontractingItems}
                            applyType="perUnit"
                        />
                    </div>
                </div>

                {/* Right Panel: Recapitulatif & Form (20%) */}
                <div className={`w-full ${isSubForm ? '' : 'md:w-[20%] lg:w-[20%]'} flex flex-col gap-4 overflow-y-auto pr-2 max-h-[80vh]`}>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Récapitulatif de l'Assemblage</h3>
                        <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-tight border-b border-slate-200 pb-1">Composants</div>
                            {itemCosts.map(ic => (
                                <div key={ic.id} className="flex justify-between text-sm py-1">
                                    <span className="text-slate-600">{ic.name} (x{ic.quantity})</span>
                                </div>
                            ))}
                            
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-tight border-b border-slate-200 pb-1 mt-4">Opérations d'Assemblage</div>
                            {operationCosts.map(oc => (
                                <div key={oc.id} className="flex justify-between text-sm py-1">
                                    <span className="text-slate-600">{oc.name}</span>
                                </div>
                            ))}

                            {subcontractingItems.length > 0 && (
                                <>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-tight border-b border-slate-200 pb-1 mt-4">Sous-traitance</div>
                                    {subcontractingItems.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm py-1">
                                            <span className="text-slate-600 truncate max-w-[120px]">{item.description}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                            
                            {/* Global Subcontracting Links */}
                            {(() => {
                                const globalSubs = subcontractings.filter(s => s.assemblyId === initialData?.id);
                                if (globalSubs.length === 0) return null;
                                return (
                                    <>
                                        <div className="text-xs font-bold text-blue-500 uppercase tracking-tight border-b border-blue-200 pb-1 mt-4">Sous-traitance Liée</div>
                                        {globalSubs.map(s => (
                                            <div key={s.id} className="flex justify-between text-sm py-1">
                                                <span className="text-blue-600 truncate max-w-[120px]">{s.name}</span>
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}
                            
                            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 italic">
                                * Planification basée sur une quantité de 1 assemblage. La quantité réelle sera définie dans la soumission.
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 mt-auto">
                        <button 
                            type={isSubForm ? "button" : "submit"} 
                            onClick={isSubForm ? () => handleSubmit() : undefined}
                            className="w-full px-4 py-3 text-sm font-bold text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe] shadow-sm transition-colors"
                        >
                            {submitText}
                        </button>
                        <button type="button" onClick={onCancel} className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">Annuler</button>
                    </div>
                </div>
            </div>
        </FormContainer>
    );
};

interface WorkOrderFormItem {
    tempId: string;
    type: 'part' | 'assembly';
    id: string;
    quantity: number;
    dependencies: string[]; // List of tempIds
}

interface WorkOrderFormProps {
    clients: Client[];
    parts: Part[];
    assemblies: Assembly[];
    subcontractings: Subcontracting[];
    onSubmit: (workOrder: Omit<WorkOrder, 'id' | 'parts' | 'finishDate'> & { 
        items?: WorkOrderItem[];
        partItems?: { partId: string; quantity: number; tempId: string; dependencies: string[] }[]; 
        assemblyId?: string;
        id?: string;
        subcontractingItems?: SubcontractingItem[];
    }) => void;
    onCancel: () => void;
    initialData?: WorkOrder | null;
    isSubForm?: boolean;
    onAddDeliveryNote?: (dn: Omit<DeliveryNote, 'id' | 'deliveryNoteNumber'>) => void;
}

export const WorkOrderForm: React.FC<WorkOrderFormProps> = ({ clients, parts, assemblies, subcontractings, onSubmit, onCancel, initialData, isSubForm, onAddDeliveryNote }) => {
    const [clientId, setClientId] = useState(initialData?.clientId || '');
    const [startDate, setStartDate] = useState(initialData?.startDate || '');
    const [status, setStatus] = useState<JobStatus>(initialData?.status || 'Pending');
    const [subcontractingItems, setSubcontractingItems] = useState<SubcontractingItem[]>(initialData?.subcontractingItems || []);
    const [customerPoNumber, setCustomerPoNumber] = useState(initialData?.customerPoNumber || '');
    const [customerPoFile, setCustomerPoFile] = useState(initialData?.customerPoFile || '');
    const [customerPoFileName, setCustomerPoFileName] = useState(initialData?.customerPoFileName || '');
    const [createPurchase, setCreatePurchase] = useState(false);
    const [quoteId] = useState<string | undefined>(
        (initialData as { quoteId?: string; id?: string })?.quoteId || (initialData as { quoteId?: string; id?: string })?.id 
    );
    
    const [selectedItems, setSelectedItems] = useState<WorkOrderFormItem[]>(() => {
        if (initialData?.items) {
            return initialData.items.map(item => ({
                tempId: item.tempId,
                type: item.type,
                id: item.id,
                quantity: item.quantity,
                dependencies: item.dependencies
            }));
        }
        
        // Handle conversion from Quote
        const qItems = (initialData as unknown as { quoteItems?: QuoteItem[] })?.quoteItems;
        if (qItems && Array.isArray(qItems)) {
            return qItems.map(item => ({
                tempId: item.tempId || Math.random().toString(36).slice(2, 11),
                type: item.type,
                id: item.id,
                quantity: item.quantity,
                dependencies: []
            }));
        }

        if (initialData?.parts) {
            // Group instances by their partId and their set of dependencies (instanceIds)
            const groups: { partId: string; dependencies: string[]; instances: string[] }[] = [];
            
            initialData.parts.forEach(p => {
                const deps = (p.partDependencies || []).sort();
                const existingGroup = groups.find(g => 
                    g.partId === p.id && 
                    JSON.stringify(g.dependencies) === JSON.stringify(deps)
                );
                if (existingGroup) {
                    existingGroup.instances.push(p.instanceId);
                } else {
                    groups.push({
                        partId: p.id,
                        dependencies: deps,
                        instances: [p.instanceId]
                    });
                }
            });

            // Map instanceId to the tempId of the group it belongs to
            const instanceIdToTempId = new Map<string, string>();
            groups.forEach(g => {
                const tempId = g.instances[0]; // Use first instanceId as tempId
                g.instances.forEach(id => instanceIdToTempId.set(id, tempId));
            });

            return groups.map(g => ({
                tempId: g.instances[0],
                type: 'part' as const,
                id: g.partId,
                quantity: g.instances.length,
                dependencies: [...new Set(g.dependencies.map(id => instanceIdToTempId.get(id)).filter(Boolean) as string[])]
            }));
        }
        return [];
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const availableItems = useMemo(() => {
        return selectedItems.map(item => {
            let name = 'Unknown';
            if (item.type === 'part') {
                name = parts.find(p => p.id === item.id)?.name || 'Part';
            } else if (item.type === 'assembly') {
                name = assemblies.find(a => a.id === item.id)?.name || 'Assembly';
            }
            return {
                id: item.tempId,
                name,
                quantity: item.quantity
            };
        });
    }, [selectedItems, parts, assemblies]);

    const getSubcontractingAddon = (tempId: string) => {
        let addon = 0;
        
        // Local subcontracting items
        subcontractingItems.forEach(si => {
            if (si.targetItemIds?.includes(tempId)) {
                if (si.applyType === 'perUnit') {
                    addon += si.cost;
                } else if (si.applyType === 'distributed') {
                    const totalQty = selectedItems.filter(it => si.targetItemIds?.includes(it.tempId)).reduce((s, it) => s + it.quantity, 0);
                    if (totalQty > 0) {
                        addon += si.cost / totalQty;
                    }
                }
            }
        });

        // Global subcontracting links
        if (initialData?.id) {
            subcontractings.filter(s => s.workOrderId === initialData.id).forEach(gs => {
                if (!gs.targetItemIds || gs.targetItemIds.length === 0 || gs.targetItemIds.includes(tempId)) {
                    const actualCost = gs.cost ?? gs.defaultCost;
                    if (gs.applyType === 'perUnit') {
                        addon += actualCost;
                    } else if (gs.applyType === 'distributed') {
                        const targetItems = selectedItems.filter(it => !gs.targetItemIds || gs.targetItemIds.length === 0 || gs.targetItemIds.includes(it.tempId));
                        const totalQty = targetItems.reduce((s, it) => s + it.quantity, 0);
                        if (totalQty > 0) {
                            addon += actualCost / totalQty;
                        }
                    }
                }
            });
        }
        
        return addon;
    };

    const handleAddItem = (type: 'part' | 'assembly', id: string) => {
        const tempId = Math.random().toString(36).slice(2, 11);
        setSelectedItems(prev => [...prev, {
            tempId,
            type,
            id,
            quantity: 1,
            dependencies: []
        }]);
        if (errors.parts) setErrors(prev => ({ ...prev, parts: '' }));
    };

    const handleRemoveItem = (tempId: string) => {
        setSelectedItems(prev => {
            const next = prev.filter(item => item.tempId !== tempId);
            // Also remove from dependencies of other items
            return next.map(item => ({
                ...item,
                dependencies: item.dependencies.filter(id => id !== tempId)
            }));
        });
    };

    const handleUpdateItem = (tempId: string, updates: Partial<WorkOrderFormItem>) => {
        setSelectedItems(prev => prev.map(item => 
            item.tempId === tempId ? { ...item, ...updates } : item
        ));
    };

    const handleToggleDependency = (itemTempId: string, depTempId: string) => {
        if (itemTempId === depTempId) return;

        setSelectedItems(prev => {
            const item = prev.find(it => it.tempId === itemTempId);
            if (!item) return prev;

            const isRemoving = item.dependencies.includes(depTempId);
            if (!isRemoving) {
                // Check for circular dependency: if adding depTempId as a dependency of itemTempId,
                // we must ensure itemTempId is not already a dependency of depTempId (directly or indirectly)
                const checkCircular = (startId: string, currentId: string): boolean => {
                    const currentItem = prev.find(it => it.tempId === currentId);
                    if (!currentItem) return false;
                    if (currentItem.dependencies.includes(startId)) return true;
                    return currentItem.dependencies.some(id => checkCircular(startId, id));
                };

                if (checkCircular(itemTempId, depTempId)) {
                    return prev; // Silently prevent or could show a message
                }
            }

            return prev.map(it => {
                if (it.tempId === itemTempId) {
                    return {
                        ...it,
                        dependencies: isRemoving 
                            ? it.dependencies.filter(id => id !== depTempId)
                            : [...it.dependencies, depTempId]
                    };
                }
                return it;
            });
        });
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!clientId) newErrors.clientId = 'Client selection is required';
        if (!startDate) newErrors.startDate = 'Start date is required';
        if (selectedItems.length === 0) newErrors.parts = 'At least one part or assembly must be selected';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            console.warn('WorkOrderForm validation failed:', newErrors);
        }
        return Object.keys(newErrors).length === 0;
    };

    const handleSubcontractingChange = (newItems: SubcontractingItem[]) => {
        const woPrefix = initialData?.name || 'WO-TEMP';
        const updatedItems = newItems.map((item, index) => {
            if (!item.workOrderNumber || item.workOrderNumber.startsWith('WO-TEMP')) {
                const stNumber = (index + 1).toString().padStart(2, '0');
                return { ...item, workOrderNumber: `${woPrefix}-ST${stNumber}` };
            }
            return item;
        });
        setSubcontractingItems(updatedItems);
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (validate()) {
            const submissionData = {
                id: initialData?.id,
                name: initialData?.name || '', 
                clientId,
                startDate,
                status,
                customerPoNumber,
                customerPoFile,
                customerPoFileName,
                createPurchase,
                quoteId,
                items: selectedItems.map(item => ({
                    type: item.type,
                    id: item.id,
                    quantity: item.quantity,
                    tempId: item.tempId,
                    dependencies: item.dependencies
                })),
                subcontractingItems
            };
            onSubmit(submissionData as Parameters<typeof onSubmit>[0]);
        }
    };
    
    const isConversion = initialData && !initialData.id;
    const submitText = initialData?.id ? 'Save Changes' : (isConversion ? 'Save as Work Order' : 'Add Work Order');

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
            {initialData && 'workOrderNumber' in initialData && (
                <div className="bg-blue-50 p-3 rounded-md text-blue-800 font-bold text-lg mb-4">
                    {(initialData as unknown as WorkOrder).workOrderNumber}
                </div>
            )}
            <div>
                <label htmlFor="woClient" className="block text-sm font-medium text-slate-700">Client</label>
                <select
                    id="woClient"
                    value={clientId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setClientId(e.target.value);
                        if (errors.clientId) setErrors(prev => ({ ...prev, clientId: '' }));
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.clientId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                    }`}
                >
                    <option value="" disabled>Select a client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.clientId && <p className="mt-1 text-xs text-red-600">{errors.clientId}</p>}
            </div>
            <div>
                <label htmlFor="woDate" className="block text-sm font-medium text-slate-700">Start Date</label>
                <input
                    type="date"
                    id="woDate"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setStartDate(e.target.value);
                        if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.startDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                    }`}
                />
                {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
            </div>
            <div>
                <label htmlFor="woStatus" className="block text-sm font-medium text-slate-700">Status</label>
                <select
                    id="woStatus"
                    value={status}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as JobStatus)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                </select>
            </div>

            <div className="border-t border-slate-200 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer PO</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="customerPoNumber" className="block text-xs text-slate-500">PO Number</label>
                        <input
                            type="text"
                            id="customerPoNumber"
                            value={customerPoNumber}
                            onChange={e => setCustomerPoNumber(e.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500">PO File (PDF)</label>
                        <div 
                            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-blue-400 transition-colors cursor-pointer"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files[0];
                                if (file && file.type === 'application/pdf') {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        setCustomerPoFile(event.target?.result as string);
                                        setCustomerPoFileName(file.name);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'application/pdf';
                                input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            setCustomerPoFile(event.target?.result as string);
                                            setCustomerPoFileName(file.name);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                };
                                input.click();
                            }}
                        >
                            <div className="space-y-1 text-center">
                                {customerPoFileName ? (
                                    <div className="text-sm text-slate-600">
                                        <p className="font-medium text-blue-600">{customerPoFileName}</p>
                                        <p className="text-xs">Click or drag to replace</p>
                                    </div>
                                ) : (
                                    <>
                                        <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                        <div className="flex text-sm text-slate-600">
                                            <span>Upload a file or drag and drop</span>
                                        </div>
                                        <p className="text-xs text-slate-500">PDF up to 10MB</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {!initialData && (
                    <div className="mt-4 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="createPurchase"
                            checked={createPurchase}
                            onChange={e => setCreatePurchase(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="createPurchase" className="text-sm text-slate-700">Créer un achat automatique pour ce Work Order</label>
                    </div>
                )}
            </div>

            {(initialData?.deliveryNoteNumber || initialData?.invoiceNumber) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    {initialData?.deliveryNoteNumber && (
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase">Bon de Livraison (BDL)</label>
                            <p className="text-sm font-bold text-slate-800">{initialData.deliveryNoteNumber}</p>
                        </div>
                    )}
                    {initialData?.invoiceNumber && (
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase">Facture (INV)</label>
                            <p className="text-sm font-bold text-slate-800">{initialData.invoiceNumber}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-bold text-slate-900 mb-2">Items du Work Order</label>
                {errors.parts && <p className="mb-2 text-sm text-red-600 font-medium p-2 bg-red-50 rounded border border-red-100">{errors.parts}</p>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                        onChange={(e) => {
                            if (e.target.value) {
                                handleAddItem('assembly', e.target.value);
                                e.target.value = '';
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>Select an assembly...</option>
                        {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Add Individual Part</label>
                    <select
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                        onChange={(e) => {
                            if (e.target.value) {
                                handleAddItem('part', e.target.value);
                                e.target.value = '';
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>Select a part...</option>
                        {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            {selectedItems.length > 0 && (
                <div className="space-y-4">
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-20">Qty</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-24">Sous-traitance</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dependencies</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {selectedItems.map((item) => {
                                    const itemName = item.type === 'part' 
                                        ? parts.find(p => p.id === item.id)?.name || 'Part'
                                        : assemblies.find(a => a.id === item.id)?.name || 'Assembly';
                                    const itemTypeLabel = item.type === 'part' ? 'P' : 'A';
                                    
                                    const otherItems = selectedItems.filter(i => i.tempId !== item.tempId);
                                    
                                    return (
                                        <tr key={item.tempId}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mr-2 ${item.type === 'part' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {itemTypeLabel}
                                                </span>
                                                {itemName}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateItem(item.tempId, { quantity: parseInt(e.target.value) || 1 })}
                                                    className="w-16 rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                                                />
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-blue-600 font-bold">
                                                {getSubcontractingAddon(item.tempId) > 0 ? `+${getSubcontractingAddon(item.tempId).toFixed(2)} $` : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-slate-900">
                                                <div className="flex flex-wrap gap-1">
                                                    {otherItems.length > 0 ? (
                                                        otherItems.map(other => {
                                                            const otherName = other.type === 'part'
                                                                ? parts.find(p => p.id === other.id)?.name || 'Part'
                                                                : assemblies.find(a => a.id === other.id)?.name || 'Assembly';
                                                            const isDep = item.dependencies.includes(other.tempId);
                                                            return (
                                                                <button
                                                                    key={other.tempId}
                                                                    type="button"
                                                                    onClick={() => handleToggleDependency(item.tempId, other.tempId)}
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                                                        isDep 
                                                                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                                                            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                                                    }`}
                                                                >
                                                                    {otherName}
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">No other items</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(item.tempId)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-900 mb-2">Sous-traitance</label>
                <SubcontractingItemsList 
                    items={subcontractingItems}
                    subcontractings={subcontractings}
                    onChange={handleSubcontractingChange}
                    applyType="perUnit"
                    availableItems={availableItems}
                />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                {initialData && onAddDeliveryNote && (
                    <button 
                        type="button" 
                        onClick={() => onAddDeliveryNote({ workOrderId: initialData.id, date: new Date().toISOString().split('T')[0], items: [] })}
                        className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                    >
                        Convert to BDL
                    </button>
                )}
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button 
                  type={isSubForm ? "button" : "submit"} 
                  onClick={isSubForm ? () => handleSubmit() : undefined}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
                >
                  {submitText}
                </button>
            </div>
        </FormContainer>
    );
};

interface DeliveryNoteFormProps {
    workOrders: WorkOrder[];
    parts: Part[];
    assemblies: Assembly[];
    onSubmit: (dn: Omit<DeliveryNote, 'id' | 'deliveryNoteNumber'>) => void;
    onCancel: () => void;
    initialData?: DeliveryNote | null;
    isSubForm?: boolean;
    onAddInvoice?: (inv: Omit<Invoice, 'id' | 'invoiceNumber'>) => void;
}

export const DeliveryNoteForm: React.FC<DeliveryNoteFormProps> = ({ workOrders, parts, assemblies, onSubmit, onCancel, initialData, isSubForm, onAddInvoice }) => {
    const [workOrderId, setWorkOrderId] = useState(initialData?.workOrderId || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [trackingNumber, setTrackingNumber] = useState(initialData?.trackingNumber || '');
    const [carrier, setCarrier] = useState(initialData?.carrier || '');
    const [isCustomerPickup, setIsCustomerPickup] = useState(initialData?.isCustomerPickup || false);
    const [selectedItems, setSelectedItems] = useState<{ type: 'part' | 'assembly'; id: string; quantity: number }[]>(initialData?.items || []);
    
    const selectedWO = useMemo(() => workOrders.find(wo => wo.id === workOrderId), [workOrderId, workOrders]);

    const woItems = useMemo(() => {
        if (!selectedWO) return [];
        return selectedWO.items || [];
    }, [selectedWO]);

    const handleItemQuantityChange = (type: 'part' | 'assembly', id: string, quantity: number) => {
        setSelectedItems(prev => {
            const existing = prev.find(i => i.type === type && i.id === id);
            if (existing) {
                if (quantity <= 0) return prev.filter(i => !(i.type === type && i.id === id));
                return prev.map(i => (i.type === type && i.id === id) ? { ...i, quantity } : i);
            } else {
                if (quantity <= 0) return prev;
                return [...prev, { type, id, quantity }];
            }
        });
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!workOrderId || selectedItems.length === 0) return;
        onSubmit({ 
            workOrderId, 
            date, 
            items: selectedItems,
            trackingNumber: isCustomerPickup ? undefined : trackingNumber,
            carrier: isCustomerPickup ? 'Pickup' : carrier,
            isCustomerPickup
        });
    };

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
            {initialData && 'deliveryNoteNumber' in initialData && (
                <div className="bg-blue-50 p-3 rounded-md text-blue-800 font-bold text-lg mb-4">
                    {initialData.deliveryNoteNumber}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Work Order</label>
                    <select 
                        value={workOrderId} 
                        onChange={(e) => {
                            setWorkOrderId(e.target.value);
                            setSelectedItems([]);
                        }} 
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                        disabled={!!initialData}
                    >
                        <option value="">Select Work Order</option>
                        {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.workOrderNumber} - {wo.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm" />
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input 
                            type="checkbox" 
                            checked={isCustomerPickup} 
                            onChange={(e) => setIsCustomerPickup(e.target.checked)}
                            className="rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]"
                        />
                        Ramassage par le client
                    </label>
                </div>

                {!isCustomerPickup && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Transporteur</label>
                            <input 
                                type="text" 
                                value={carrier} 
                                onChange={(e) => setCarrier(e.target.value)} 
                                placeholder="ex: FedEx, UPS, etc."
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Numéro de Tracking</label>
                            <input 
                                type="text" 
                                value={trackingNumber} 
                                onChange={(e) => setTrackingNumber(e.target.value)} 
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm" 
                            />
                        </div>
                    </div>
                )}
            </div>

            {workOrderId && (
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">Items à livrer</label>
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase w-24">Total WO</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase w-32">Qté à livrer</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {woItems.map((woItem) => {
                                    const name = woItem.type === 'part' 
                                        ? parts.find(p => p.id === woItem.id)?.name || 'Part'
                                        : assemblies.find(a => a.id === woItem.id)?.name || 'Assembly';
                                    
                                    const selected = selectedItems.find(i => i.type === woItem.type && i.id === woItem.id);
                                    const currentQty = selected?.quantity || 0;

                                    return (
                                        <tr key={`${woItem.type}-${woItem.id}`}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mr-2 ${woItem.type === 'part' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {woItem.type === 'part' ? 'P' : 'A'}
                                                </span>
                                                {name}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500 text-center">
                                                {woItem.quantity}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={woItem.quantity}
                                                    value={currentQty}
                                                    onChange={(e) => handleItemQuantityChange(woItem.type, woItem.id, parseInt(e.target.value) || 0)}
                                                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm text-center"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
                {initialData && onAddInvoice && (
                    <button 
                        type="button" 
                        onClick={() => {
                            // Find the quote associated with this WO
                            onAddInvoice({ 
                                workOrderId: initialData.workOrderId, 
                                deliveryNoteId: initialData.id,
                                date: new Date().toISOString().split('T')[0], 
                                items: initialData.items.map(item => ({ ...item, unitPrice: 0 })), // Price will be set in InvoiceForm
                                totalAmount: 0 
                            });
                        }}
                        className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                    >
                        Convert to Invoice
                    </button>
                )}
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">Save</button>
            </div>
        </FormContainer>
    );
};

interface InvoiceFormProps {
    workOrders: WorkOrder[];
    quotes: Quote[];
    deliveryNotes: DeliveryNote[];
    parts: Part[];
    assemblies: Assembly[];
    onSubmit: (inv: Omit<Invoice, 'id' | 'invoiceNumber'>) => void;
    onCancel: () => void;
    initialData?: Invoice | null;
    isSubForm?: boolean;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ workOrders, quotes, deliveryNotes, parts, assemblies, onSubmit, onCancel, initialData, isSubForm }) => {
    const [workOrderId, setWorkOrderId] = useState(initialData?.workOrderId || '');
    const [deliveryNoteId, setDeliveryNoteId] = useState(initialData?.deliveryNoteId || '');
    const [quoteId, setQuoteId] = useState(initialData?.quoteId || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<{ type: 'part' | 'assembly'; id: string; quantity: number; unitPrice: number }[]>(initialData?.items || []);
    
    const selectedDN = useMemo(() => deliveryNotes.find(dn => dn.id === deliveryNoteId), [deliveryNoteId, deliveryNotes]);
    
    // When DN changes, update items and prices
    useEffect(() => {
        if (selectedDN) {
            const wo = workOrders.find(w => w.id === selectedDN.workOrderId);
            const quote = quotes.find(q => q.id === wo?.quoteId);
            
            const newItems = selectedDN.items.map(dnItem => {
                const quoteItem = quote?.items.find(qi => qi.type === dnItem.type && qi.id === dnItem.id);
                return {
                    ...dnItem,
                    unitPrice: quoteItem?.unitPrice || 0
                };
            });
            
            setTimeout(() => {
                setItems(newItems);
                setWorkOrderId(selectedDN.workOrderId);
                if (wo?.quoteId) setQuoteId(wo.quoteId);
            }, 0);
        }
    }, [selectedDN, workOrders, quotes]);

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    }, [items]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        onSubmit({ 
            workOrderId: workOrderId || null, 
            deliveryNoteId: deliveryNoteId || null,
            quoteId: quoteId || null, 
            date, 
            items,
            totalAmount 
        });
    };

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
            {initialData && 'invoiceNumber' in initialData && (
                <div className="bg-blue-50 p-3 rounded-md text-blue-800 font-bold text-lg mb-4">
                    {initialData.invoiceNumber}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Delivery Note (BDL)</label>
                    <select 
                        value={deliveryNoteId} 
                        onChange={(e) => setDeliveryNoteId(e.target.value)} 
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    >
                        <option value="">Select BDL</option>
                        {deliveryNotes.map(dn => {
                            const wo = workOrders.find(w => w.id === dn.workOrderId);
                            return <option key={dn.id} value={dn.id}>{dn.deliveryNoteNumber} ({wo?.workOrderNumber})</option>;
                        })}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm" />
                </div>
            </div>

            {items.length > 0 && (
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">Items à facturer</label>
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase w-24">Qté</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase w-32">Prix Unitaire</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase w-32">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {items.map((item, idx) => {
                                    const name = item.type === 'part' 
                                        ? parts.find(p => p.id === item.id)?.name || 'Part'
                                        : assemblies.find(a => a.id === item.id)?.name || 'Assembly';
                                    
                                    return (
                                        <tr key={`${item.type}-${item.id}-${idx}`}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mr-2 ${item.type === 'part' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {item.type === 'part' ? 'P' : 'A'}
                                                </span>
                                                {name}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500 text-center">
                                                {item.quantity}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900 text-right">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.unitPrice}
                                                    onChange={(e) => {
                                                        const newPrice = parseFloat(e.target.value) || 0;
                                                        setItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: newPrice } : it));
                                                    }}
                                                    className="w-24 rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm text-right"
                                                />
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                                                {(item.quantity * item.unitPrice).toFixed(2)} $
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-slate-50">
                                    <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-slate-900">Total</td>
                                    <td className="px-3 py-2 text-right text-sm font-bold text-[#0078d4]">
                                        {totalAmount.toFixed(2)} $
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">Save</button>
            </div>
        </FormContainer>
    );
};

interface EmployeeFormProps {
    skills: Skill[];
    onSubmit: (employee: Omit<Employee, 'id'> | Employee) => void;
    onCancel: () => void;
    initialData?: Employee | null;
    isSubForm?: boolean;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ skills: allSkills, onSubmit, onCancel, initialData, isSubForm }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [role, setRole] = useState(initialData?.role || '');
    const [employeeNumber, setEmployeeNumber] = useState(initialData?.employeeNumber || '');
    const [isManager, setIsManager] = useState(initialData?.isManager || false);
    const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>(initialData?.skills || []);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSkillChange = (skillId: string, checked: boolean) => {
        if (checked) {
            setEmployeeSkills(prev => [...prev, { skillId, certified: false }]);
        } else {
            setEmployeeSkills(prev => prev.filter(s => s.skillId !== skillId));
        }
    };

    const handleCertificationChange = (skillId: string, certified: boolean) => {
        setEmployeeSkills(prev => prev.map(s => s.skillId === skillId ? { ...s, certified } : s));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Employee name is required';
        if (!role.trim()) newErrors.role = 'Role is required';
        if (!employeeNumber.trim()) newErrors.employeeNumber = 'Employee number (3-digit code) is required';
        else if (!/^\d{3}$/.test(employeeNumber)) newErrors.employeeNumber = 'Employee number must be exactly 3 digits';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (validate()) {
            const dataToSubmit = {
                name: name.trim(),
                role: role.trim(),
                employeeNumber: employeeNumber.trim(),
                isManager,
                skills: employeeSkills
            };
            if (initialData) {
                onSubmit({ ...initialData, ...dataToSubmit });
            } else {
                onSubmit(dataToSubmit);
            }
        }
    };

    const submitText = initialData ? 'Save Changes' : 'Add Employee';

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="employeeName" className="block text-sm font-medium text-slate-700">Employee Name</label>
                <input
                    type="text"
                    id="employeeName"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setName(e.target.value);
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                    }`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
                <label htmlFor="employeeNumber" className="block text-sm font-medium text-slate-700">Code Employé (3 chiffres)</label>
                <input
                    type="text"
                    id="employeeNumber"
                    maxLength={3}
                    placeholder="ex: 123"
                    value={employeeNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setEmployeeNumber(val);
                        if (errors.employeeNumber) setErrors(prev => ({ ...prev, employeeNumber: '' }));
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.employeeNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                    }`}
                />
                {errors.employeeNumber && <p className="mt-1 text-xs text-red-600">{errors.employeeNumber}</p>}
            </div>
            <div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isManager}
                        onChange={(e) => setIsManager(e.target.checked)}
                        className="rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]"
                    />
                    <span className="text-sm font-medium text-slate-700">Accès Gestionnaire</span>
                </label>
            </div>
            <div>
                <label htmlFor="employeeRole" className="block text-sm font-medium text-slate-700">Role</label>
                <input
                    type="text"
                    id="employeeRole"
                    value={role}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setRole(e.target.value);
                        if (errors.role) setErrors(prev => ({ ...prev, role: '' }));
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.role ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                    }`}
                />
                {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Skills</label>
                <div className="mt-2 space-y-3 max-h-60 overflow-y-auto border border-slate-300 rounded-md p-3">
                    {allSkills.map(skill => {
                        const currentEmployeeSkill = employeeSkills.find(s => s.skillId === skill.id);
                        const isSkillAssigned = !!currentEmployeeSkill;
                        
                        return (
                            <div key={skill.id} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id={`skill-assign-${skill.id}`}
                                        type="checkbox"
                                        checked={isSkillAssigned}
                                        onChange={(e) => handleSkillChange(skill.id, e.target.checked)}
                                        className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                                    />
                                    <label htmlFor={`skill-assign-${skill.id}`} className="ml-3 text-sm text-slate-700">{skill.name}</label>
                                </div>
                                {isSkillAssigned && (
                                    <div className="flex items-center">
                                        <input
                                            id={`skill-cert-${skill.id}`}
                                            type="checkbox"
                                            checked={currentEmployeeSkill?.certified || false}
                                            onChange={(e) => handleCertificationChange(skill.id, e.target.checked)}
                                            disabled={!isSkillAssigned}
                                            className="h-4 w-4 text-green-600 border-slate-300 rounded focus:ring-green-500 disabled:opacity-50"
                                        />
                                        <label htmlFor={`skill-cert-${skill.id}`} className="ml-2 text-sm text-slate-500">Certified</label>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button 
                  type={isSubForm ? "button" : "submit"} 
                  onClick={isSubForm ? () => handleSubmit() : undefined}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
                >
                  {submitText}
                </button>
            </div>
        </FormContainer>
    );
};


interface TeamFormProps {
    employees: Employee[];
    onSubmit: (team: Omit<Team, 'id'> | Team) => void;
    onCancel: () => void;
    initialData?: Team | null;
}

export const TeamForm: React.FC<TeamFormProps> = ({ employees, onSubmit, onCancel, initialData, isSubForm }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>(initialData?.employeeIds || []);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleEmployeeChange = (empId: string) => {
        setSelectedEmployees(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Team name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (validate()) {
            if (initialData) {
                onSubmit({ ...initialData, name: name.trim(), employeeIds: selectedEmployees });
            } else {
                onSubmit({ name: name.trim(), employeeIds: selectedEmployees });
            }
        }
    };

    const submitText = initialData ? 'Save Changes' : 'Add Team';

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="teamName" className="block text-sm font-medium text-slate-700">Team Name</label>
                <input
                    type="text"
                    id="teamName"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setName(e.target.value);
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                    }`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Members</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-slate-300 rounded-md p-2">
                    {employees.map(emp => (
                        <div key={emp.id} className="flex items-center">
                            <input
                                id={`emp-${emp.id}`}
                                type="checkbox"
                                checked={selectedEmployees.includes(emp.id)}
                                onChange={() => handleEmployeeChange(emp.id)}
                                className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                            />
                            <label htmlFor={`emp-${emp.id}`} className="ml-3 text-sm text-slate-600">{emp.name}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button 
                  type={isSubForm ? "button" : "submit"} 
                  onClick={isSubForm ? () => handleSubmit() : undefined}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
                >
                  {submitText}
                </button>
            </div>
        </FormContainer>
    );
};

interface SkillFormProps {
  onSubmit: (skill: Omit<Skill, 'id'> | Skill) => void;
  onCancel: () => void;
  initialData?: Skill | null;
}

export const SkillForm: React.FC<SkillFormProps> = ({ onSubmit, onCancel, initialData, isSubForm }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Skill name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (validate()) {
      if (initialData) {
        onSubmit({ ...initialData, name: name.trim() });
      } else {
        onSubmit({ name: name.trim() });
      }
    }
  };

  const submitText = initialData ? 'Save Changes' : 'Add Skill';

  return (
    <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="skillName" className="block text-sm font-medium text-slate-700">Skill Name</label>
        <input
          type="text"
          id="skillName"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
            if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
          }}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
          }`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
        <button 
          type={isSubForm ? "button" : "submit"} 
          onClick={isSubForm ? () => handleSubmit() : undefined}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
        >
          {submitText}
        </button>
      </div>
    </FormContainer>
  );
};

interface MaterialFormProps {
  onSubmit: (material: Omit<Material, 'id'> | Material) => void;
  onCancel: () => void;
  initialData?: Material | null;
  onDuplicate?: (material: Omit<Material, 'id'>) => void;
  isSubForm?: boolean;
}

export const MaterialForm: React.FC<MaterialFormProps> = ({ onSubmit, onCancel, initialData, onDuplicate, isSubForm }) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [type, setType] = useState(initialData?.type || '');
  const [materialType, setMaterialType] = useState(initialData?.materialType || '');
  const [profileDimensions, setProfileDimensions] = useState(initialData?.profileDimensions || '');
  const [thickness, setThickness] = useState(initialData?.thickness || 0);
  const [densityLbs, setDensityLbs] = useState(initialData?.densityLbs || 0);
  const [weightPerLinearFt, setWeightPerLinearFt] = useState(initialData?.weightPerLinearFt || 0);
  const [weightPerSqFt, setWeightPerSqFt] = useState(initialData?.weightPerSqFt || 0);
  const [costPerLb, setCostPerLb] = useState(initialData?.costPerLb || 0);
  const [costPerSqFt, setCostPerSqFt] = useState(initialData?.costPerSqFt || 0);
  const [costPerLinearFt, setCostPerLinearFt] = useState(initialData?.costPerLinearFt || 0);
  const [laserAdvance6kW, setLaserAdvance6kW] = useState(initialData?.laserAdvance6kW || 0);
  const [laserAdvance12kW, setLaserAdvance12kW] = useState(initialData?.laserAdvance12kW || 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'Description is required';
    if (thickness < 0) newErrors.thickness = 'Thickness must be non-negative';
    if (densityLbs < 0) newErrors.densityLbs = 'Density must be non-negative';
    if (weightPerLinearFt < 0) newErrors.weightPerLinearFt = 'Weight must be non-negative';
    if (weightPerSqFt < 0) newErrors.weightPerSqFt = 'Weight must be non-negative';
    if (costPerLb < 0) newErrors.costPerLb = 'Cost must be non-negative';
    if (costPerSqFt < 0) newErrors.costPerSqFt = 'Cost must be non-negative';
    if (costPerLinearFt < 0) newErrors.costPerLinearFt = 'Cost must be non-negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (validate()) {
      const materialData = {
        description: description.trim(),
        type: type.trim(),
        materialType: materialType.trim(),
        profileDimensions: profileDimensions.trim(),
        thickness: Number(thickness),
        densityLbs: Number(densityLbs),
        weightPerLinearFt: Number(weightPerLinearFt),
        weightPerSqFt: Number(weightPerSqFt),
        costPerLb: Number(costPerLb),
        costPerSqFt: Number(costPerSqFt),
        costPerLinearFt: Number(costPerLinearFt),
        laserAdvance6kW: Number(laserAdvance6kW),
        laserAdvance12kW: Number(laserAdvance12kW),
      };

      if (initialData) {
        onSubmit({ ...initialData, ...materialData });
      } else {
        onSubmit(materialData);
      }
    }
  };

  const submitText = initialData ? 'Save Changes' : 'Add Material';

  return (
    <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="matDesc" className="block text-sm font-medium text-slate-700">Description</label>
          <input
            type="text"
            id="matDesc"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>
        <div>
          <label htmlFor="matType" className="block text-sm font-medium text-slate-700">Type</label>
          <input
            type="text"
            id="matType"
            value={type}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setType(e.target.value)}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="matGrade" className="block text-sm font-medium text-slate-700">Matière</label>
          <input
            type="text"
            id="matGrade"
            value={materialType}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialType(e.target.value)}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="matProfileDimensions" className="block text-sm font-medium text-slate-700">Dimensions du profilé</label>
          <input
            type="text"
            id="matProfileDimensions"
            value={profileDimensions}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileDimensions(e.target.value)}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
            placeholder="ex: 2x2x0.25"
          />
        </div>
        <div>
          <label htmlFor="matThick" className="block text-sm font-medium text-slate-700">Épaisseur</label>
          <input
            type="number"
            id="matThick"
            value={thickness}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setThickness(parseFloat(e.target.value) || 0);
                if (errors.thickness) setErrors(prev => ({ ...prev, thickness: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.thickness ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            step="0.001"
          />
          {errors.thickness && <p className="mt-1 text-xs text-red-600">{errors.thickness}</p>}
        </div>
        <div>
          <label htmlFor="matDensity" className="block text-sm font-medium text-slate-700">Densité (lbs)</label>
          <input
            type="number"
            id="matDensity"
            value={densityLbs}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setDensityLbs(parseFloat(e.target.value) || 0);
                if (errors.densityLbs) setErrors(prev => ({ ...prev, densityLbs: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.densityLbs ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            step="0.001"
          />
          {errors.densityLbs && <p className="mt-1 text-xs text-red-600">{errors.densityLbs}</p>}
        </div>
        <div>
          <label htmlFor="matWeightLin" className="block text-sm font-medium text-slate-700">Poids/pied linéaire</label>
          <input
            type="number"
            id="matWeightLin"
            value={weightPerLinearFt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setWeightPerLinearFt(parseFloat(e.target.value) || 0);
                if (errors.weightPerLinearFt) setErrors(prev => ({ ...prev, weightPerLinearFt: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.weightPerLinearFt ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            step="0.001"
          />
          {errors.weightPerLinearFt && <p className="mt-1 text-xs text-red-600">{errors.weightPerLinearFt}</p>}
        </div>
        <div>
          <label htmlFor="matWeightSq" className="block text-sm font-medium text-slate-700">Poids/pied carré</label>
          <input
            type="number"
            id="matWeightSq"
            value={weightPerSqFt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setWeightPerSqFt(parseFloat(e.target.value) || 0);
                if (errors.weightPerSqFt) setErrors(prev => ({ ...prev, weightPerSqFt: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.weightPerSqFt ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            step="0.001"
          />
          {errors.weightPerSqFt && <p className="mt-1 text-xs text-red-600">{errors.weightPerSqFt}</p>}
        </div>
        <div>
          <label htmlFor="matCostLb" className="block text-sm font-medium text-slate-700">Coutant à la livre ($)</label>
          <input
            type="number"
            id="matCostLb"
            value={costPerLb}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCostPerLb(parseFloat(e.target.value) || 0);
                if (errors.costPerLb) setErrors(prev => ({ ...prev, costPerLb: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.costPerLb ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            step="0.01"
          />
          {errors.costPerLb && <p className="mt-1 text-xs text-red-600">{errors.costPerLb}</p>}
        </div>
        <div>
          <label htmlFor="matCostSq" className="block text-sm font-medium text-slate-700">Coutant au pied carré ($)</label>
          <input
            type="number"
            id="matCostSq"
            value={costPerSqFt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCostPerSqFt(parseFloat(e.target.value) || 0);
                if (errors.costPerSqFt) setErrors(prev => ({ ...prev, costPerSqFt: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.costPerSqFt ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            step="0.01"
          />
          {errors.costPerSqFt && <p className="mt-1 text-xs text-red-600">{errors.costPerSqFt}</p>}
        </div>
        <div>
          <label htmlFor="matCostLin" className="block text-sm font-medium text-slate-700">Coutant au pied linéaire ($)</label>
          <input
            type="number"
            id="matCostLin"
            value={costPerLinearFt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCostPerLinearFt(parseFloat(e.target.value) || 0);
                if (errors.costPerLinearFt) setErrors(prev => ({ ...prev, costPerLinearFt: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.costPerLinearFt ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            step="0.01"
          />
          {errors.costPerLinearFt && <p className="mt-1 text-xs text-red-600">{errors.costPerLinearFt}</p>}
        </div>
        <div>
          <label htmlFor="laser6kW" className="block text-sm font-medium text-slate-700">Avance Laser 6kW (IPM)</label>
          <input
            type="number"
            id="laser6kW"
            value={laserAdvance6kW}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLaserAdvance6kW(parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="laser12kW" className="block text-sm font-medium text-slate-700">Avance Laser 12kW (IPM)</label>
          <input
            type="number"
            id="laser12kW"
            value={laserAdvance12kW}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLaserAdvance12kW(parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
            min="0"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
        {initialData && onDuplicate && (
          <button 
            type="button" 
            onClick={() => {
              if (validate()) {
                const materialData = {
                  description: description.trim() + " (copy)",
                  type: type.trim(),
                  materialType: materialType.trim(),
                  profileDimensions: profileDimensions.trim(),
                  thickness: Number(thickness),
                  densityLbs: Number(densityLbs),
                  weightPerLinearFt: Number(weightPerLinearFt),
                  weightPerSqFt: Number(weightPerSqFt),
                  costPerLb: Number(costPerLb),
                  costPerSqFt: Number(costPerSqFt),
                  costPerLinearFt: Number(costPerLinearFt),
                  laserAdvance6kW: Number(laserAdvance6kW),
                  laserAdvance12kW: Number(laserAdvance12kW),
                };
                onDuplicate(materialData);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
          >
            Duplicate
          </button>
        )}
        <button 
          type={isSubForm ? "button" : "submit"} 
          onClick={isSubForm ? () => handleSubmit() : undefined}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
        >
          {submitText}
        </button>
      </div>
    </FormContainer>
  );
};

interface NonConformityFormProps {
  workOrders: WorkOrder[];
  operations: Operation[];
  onSubmit: (nonConformity: Omit<NonConformity, 'id'> | NonConformity) => void;
  onCancel: () => void;
  initialData?: NonConformity | null;
}

export const NonConformityForm: React.FC<NonConformityFormProps> = ({ workOrders, operations, onSubmit, onCancel, initialData, isSubForm }) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [workOrderId, setWorkOrderId] = useState(initialData?.workOrderId || '');
  const [partInstanceId, setPartInstanceId] = useState(initialData?.partInstanceId || '');
  const [operationId, setOperationId] = useState(initialData?.operationId || '');
  const [status, setStatus] = useState<NonConformityStatus>(initialData?.status || 'Open');
  const [severity, setSeverity] = useState<NonConformitySeverity>(initialData?.severity || 'Medium');
  const [dateReported, setDateReported] = useState(initialData?.dateReported || new Date().toISOString().split('T')[0]);
  const [actionsTaken, setActionsTaken] = useState(initialData?.actionsTaken || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableParts = useMemo(() => {
    if (!workOrderId) return [];
    const wo = workOrders.find(w => w.id === workOrderId);
    return wo ? wo.parts : [];
  }, [workOrderId, workOrders]);

  const availableOperations = useMemo(() => {
    if (!partInstanceId) return [];
    const part = availableParts.find(p => p.instanceId === partInstanceId);
    if (!part) return [];
    return (part.operations || []).map(op => operations.find(o => o.id === op.operationId)).filter((o): o is Operation => !!o);
  }, [partInstanceId, availableParts, operations]);

  const handleWorkOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setWorkOrderId(e.target.value);
    setPartInstanceId('');
    setOperationId('');
    if (errors.workOrderId) setErrors(prev => ({ ...prev, workOrderId: '' }));
  };

  const handlePartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPartInstanceId(e.target.value);
    setOperationId('');
    if (errors.partInstanceId) setErrors(prev => ({ ...prev, partInstanceId: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!workOrderId) newErrors.workOrderId = 'Work order selection is required';
    if (!partInstanceId) newErrors.partInstanceId = 'Part selection is required';
    if (!operationId) newErrors.operationId = 'Operation selection is required';
    if (!dateReported) newErrors.dateReported = 'Date reported is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (validate()) {
      if (initialData) {
        onSubmit({
          ...initialData,
          description: description.trim(),
          workOrderId,
          partInstanceId,
          operationId,
          status,
          severity,
          dateReported,
          actionsTaken
        });
      } else {
        onSubmit({
          description: description.trim(),
          workOrderId,
          partInstanceId,
          operationId,
          status,
          severity,
          dateReported,
          actionsTaken
        });
      }
    }
  };

  const submitText = initialData ? 'Save Changes' : 'Add Non-Conformity';

  return (
    <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ncWorkOrder" className="block text-sm font-medium text-slate-700">Work Order</label>
          <select
            id="ncWorkOrder"
            value={workOrderId}
            onChange={handleWorkOrderChange}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.workOrderId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
          >
            <option value="" disabled>Select Work Order</option>
            {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.name}</option>)}
          </select>
          {errors.workOrderId && <p className="mt-1 text-xs text-red-600">{errors.workOrderId}</p>}
        </div>
        <div>
          <label htmlFor="ncPart" className="block text-sm font-medium text-slate-700">Part</label>
          <select
            id="ncPart"
            value={partInstanceId}
            onChange={handlePartChange}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.partInstanceId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            disabled={!workOrderId}
          >
            <option value="" disabled>Select Part</option>
            {availableParts.map(p => <option key={p.instanceId} value={p.instanceId}>{p.name}</option>)}
          </select>
          {errors.partInstanceId && <p className="mt-1 text-xs text-red-600">{errors.partInstanceId}</p>}
        </div>
        <div>
          <label htmlFor="ncOperation" className="block text-sm font-medium text-slate-700">Operation</label>
          <select
            id="ncOperation"
            value={operationId}
            onChange={e => {
                setOperationId(e.target.value);
                if (errors.operationId) setErrors(prev => ({ ...prev, operationId: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.operationId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
            disabled={!partInstanceId}
          >
            <option value="" disabled>Select Operation</option>
            {availableOperations.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
          </select>
          {errors.operationId && <p className="mt-1 text-xs text-red-600">{errors.operationId}</p>}
        </div>
         <div>
          <label htmlFor="ncDate" className="block text-sm font-medium text-slate-700">Date Reported</label>
          <input
            type="date"
            id="ncDate"
            value={dateReported}
            onChange={e => {
                setDateReported(e.target.value);
                if (errors.dateReported) setErrors(prev => ({ ...prev, dateReported: '' }));
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.dateReported ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
          />
          {errors.dateReported && <p className="mt-1 text-xs text-red-600">{errors.dateReported}</p>}
        </div>
        <div>
          <label htmlFor="ncStatus" className="block text-sm font-medium text-slate-700">Status</label>
          <select id="ncStatus" value={status} onChange={e => setStatus(e.target.value as NonConformityStatus)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm">
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
        </div>
        <div>
          <label htmlFor="ncSeverity" className="block text-sm font-medium text-slate-700">Severity</label>
          <select id="ncSeverity" value={severity} onChange={e => setSeverity(e.target.value as NonConformitySeverity)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm">
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ncDescription" className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
            id="ncDescription"
            value={description}
            onChange={e => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
            }}
            rows={3}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
            }`}
        ></textarea>
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>
       <div>
        <label htmlFor="ncActions" className="block text-sm font-medium text-slate-700">Actions Taken</label>
        <textarea id="ncActions" value={actionsTaken} onChange={e => setActionsTaken(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"></textarea>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
        <button 
          type={isSubForm ? "button" : "submit"} 
          onClick={isSubForm ? () => handleSubmit() : undefined}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
        >
          {submitText}
        </button>
      </div>
    </FormContainer>
  );
};

interface QuoteFormProps {
    clients: Client[];
    parts: Part[];
    assemblies: Assembly[];
    tmItems?: TMItem[];
    profitSettings?: ProfitSettings;
    materials: Material[];
    operations: Operation[];
    subcontractings: Subcontracting[];
    bendingSettings: BendingSettings;
    laserSettings: LaserSettings;
    laserTubeSettings: LaserTubeSettings;
    suppliers: Supplier[];
    onSubmit: (quote: Omit<Quote, 'id'> | Quote) => void;
    onCancel: () => void;
    onAddPart?: (part: Omit<Part, 'id'>) => Promise<string>;
    onAddAssembly?: (assembly: Omit<Assembly, 'id'>) => Promise<string>;
    onUpdatePart?: (part: Part) => void;
    onUpdateAssembly?: (assembly: Assembly) => void;
    initialData?: Quote | null;
    isSubForm?: boolean;
}

interface BatchItem {
    id: string;
    type: 'part' | 'assembly';
    name: string;
    quantity: number;
    materialId?: string;
    filePdf?: string;
    filePdfName?: string;
    fileDxf?: string;
    fileDxfName?: string;
    fileStep?: string;
    fileStepName?: string;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ clients, parts, assemblies, tmItems = [], profitSettings, materials, operations, subcontractings, suppliers, bendingSettings, laserSettings, laserTubeSettings, onSubmit, onCancel, onAddPart, onAddAssembly, onUpdatePart, onUpdateAssembly, initialData, isSubForm }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [clientId, setClientId] = useState(initialData?.clientId || '');
    const [status, setStatus] = useState<QuoteStatus>(initialData?.status || 'Draft');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<QuoteItem[]>(() => 
        (initialData?.items || []).map(item => ({ 
            ...item, 
            tempId: item.tempId || `qitem-${Math.random().toString(36).substring(2, 9)}` 
        }))
    );
    const [subcontractingItems, setSubcontractingItems] = useState<SubcontractingItem[]>(initialData?.subcontractingItems || []);
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showQuickPart, setShowQuickPart] = useState(false);
    const [showQuickAssembly, setShowQuickAssembly] = useState(false);
    const [editingItem, setEditingItem] = useState<{ type: 'part' | 'assembly', id: string } | null>(null);
    const [showBatchImport, setShowBatchImport] = useState(false);
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);

    const handleAiUpdate = (newItems: QuoteItem[]) => {
        setItems(prev => [...prev, ...newItems]);
    };

    const handleApproveAiItem = (tempId: string) => {
        setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, aiStatus: 'Approved' } : item));
    };

    const handleRejectAiItem = (tempId: string) => {
        setItems(prev => prev.filter(item => item.tempId !== tempId));
    };

    const isLocked = initialData?.isLocked || false;

    const handleBatchFileUpload = (index: number, type: 'pdf' | 'dxf' | 'step', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const newItems = [...batchItems];
            if (type === 'pdf') {
                newItems[index].filePdf = base64;
                newItems[index].filePdfName = file.name;
            } else if (type === 'dxf') {
                newItems[index].fileDxf = base64;
                newItems[index].fileDxfName = file.name;
            } else if (type === 'step') {
                newItems[index].fileStep = base64;
                newItems[index].fileStepName = file.name;
            }
            setBatchItems(newItems);
        };
        reader.readAsDataURL(file);
    };

    const handleProcessBatch = async () => {
        if (!onAddPart || !onAddAssembly) return;
        
        if (!name.trim() || !clientId) {
            alert("Veuillez remplir le nom de la soumission et sélectionner un client avant de confirmer le lot.");
            return;
        }

        setIsProcessingBatch(true);
        
        try {
            const newQuoteItems: QuoteItem[] = [];
            
            for (const item of batchItems) {
                if (!item.name.trim()) continue;
                
                if (item.type === 'part') {
                    const partData = {
                        name: item.name,
                        quantity: item.quantity,
                        materialId: item.materialId || '',
                        operations: [],
                        filePdf: item.filePdf || null,
                        filePdfName: item.filePdfName || null,
                        fileDxf: item.fileDxf || null,
                        fileDxfName: item.fileDxfName || null,
                        fileStep: item.fileStep || null,
                        fileStepName: item.fileStepName || null
                    };
                    const newId = await onAddPart(partData);
                    const unitPrice = calculatePartUnitCost({ ...partData, id: newId }, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
                    newQuoteItems.push({ 
                        tempId: `qitem-${Math.random().toString(36).substring(2, 9)}`,
                        type: 'part', 
                        id: newId, 
                        quantity: item.quantity, 
                        unitPrice 
                    });
                } else {
                    const assemblyData = {
                        name: item.name,
                        quantity: item.quantity,
                        items: [],
                        operations: [],
                        filePdf: item.filePdf || null,
                        filePdfName: item.filePdfName || null,
                        fileDxf: item.fileDxf || null,
                        fileDxfName: item.fileDxfName || null,
                        fileStep: item.fileStep || null,
                        fileStepName: item.fileStepName || null
                    };
                    const newId = await onAddAssembly(assemblyData);
                    const unitPrice = calculateAssemblyUnitCost({ ...assemblyData, id: newId }, parts, assemblies, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
                    newQuoteItems.push({ 
                        tempId: `qitem-${Math.random().toString(36).substring(2, 9)}`,
                        type: 'assembly', 
                        id: newId, 
                        quantity: item.quantity, 
                        unitPrice 
                    });
                }
            }
            
            const allItems = [...items, ...newQuoteItems];
            const newTotalAmount = allItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            
            const quoteData = {
                name: name.trim(),
                clientId,
                status,
                date,
                items: allItems,
                totalAmount: newTotalAmount,
                notes: notes.trim()
            };
            
            if (initialData) {
                onSubmit({ ...initialData, ...quoteData });
            } else {
                onSubmit(quoteData);
            }
            
        } catch (error) {
            console.error("Error processing batch:", error);
            alert("Une erreur est survenue lors de l'importation en lot.");
            setIsProcessingBatch(false);
        }
    };

    const handleAddItem = (type: 'part' | 'assembly' | 'tm-item', id: string) => {
        const tempId = Math.random().toString(36).substring(2, 9);
        let quantity = 1;
        let unitPrice = 0;
        
        if (type === 'part') {
            const part = parts.find(p => p.id === id);
            if (part) {
                quantity = part.quantity || 1;
                unitPrice = calculatePartUnitCost(part, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
            }
        } else if (type === 'assembly') {
            const assembly = assemblies.find(a => a.id === id);
            if (assembly) {
                quantity = assembly.quantity || 1;
                unitPrice = calculateAssemblyUnitCost(assembly, parts, assemblies, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
            }
        } else if (type === 'tm-item') {
            const tmItem = tmItems?.find(t => t.id === id);
            if (tmItem) {
                // Calculate sell price
                const getSubMargin = (cost: number) => {
                    if (cost <= 1000) return (profitSettings?.subcontractingUnder1000Margin || 30) / 100;
                    if (cost <= 4999) return (profitSettings?.subcontractingUnder5000Margin || 25) / 100;
                    return (profitSettings?.subcontractingOver5000Margin || 20) / 100;
                };
                
                let totalSell = 0;
                // materials
                let matCost = 0;
                for (const m of tmItem.materials) {
                    const mat = materials.find(x => x.id === m.materialId);
                    if (mat) {
                        const qty = m.quantity || 1;
                        if (mat.type?.toLowerCase().includes('plaque') || mat.type?.toLowerCase().includes('sheet')) {
                             matCost += qty * ((m.width || 0) * (m.length || 0) / 144) * mat.costPerSqFt;
                        } else if (mat.type?.toLowerCase().includes('tube') || mat.type?.toLowerCase().includes('profile')) {
                             matCost += qty * ((m.length || 0) / 12) * mat.costPerLinearFt;
                        } else if (m.weight) {
                             matCost += qty * m.weight * mat.costPerLb;
                        }
                    }
                }
                totalSell += matCost * (1 + (profitSettings?.materialMargin || 30) / 100);
                
                // ops
                let opCost = 0;
                for (const o of tmItem.operations) {
                    const op = operations.find(x => x.id === o.operationId);
                    if (op) opCost += o.estimatedTimeHours * op.rate;
                }
                totalSell += opCost * (1 + (profitSettings?.operationMargin || 10) / 100);
                
                // subs
                let subSell = 0;
                for (const s of tmItem.subcontractings) {
                    subSell += s.globalPrice * (1 + getSubMargin(s.globalPrice));
                }
                totalSell += subSell;
                
                // purchases
                let purSell = 0;
                for (const p of tmItem.purchases) {
                    purSell += p.globalPrice * (1 + getSubMargin(p.globalPrice));
                }
                totalSell += purSell;
                
                unitPrice = totalSell;
            }
        }
        
        setItems(prev => [...prev, { tempId, type, id, quantity, unitPrice }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const availableItems = useMemo(() => items.map(item => {
        let name = 'Item';
        if (item.type === 'part') name = parts.find(p => p.id === item.id)?.name || 'Part';
        else if (item.type === 'assembly') name = assemblies.find(a => a.id === item.id)?.name || 'Assembly';
        else if (item.type === 'tm-item') name = tmItems?.find(t => t.id === item.id)?.name || 'T-M Item';
        else if (item.type === 'project') name = item.name || 'Project';
        return {
            id: item.tempId!,
            name,
            quantity: item.quantity
        };
    }), [items, parts, assemblies, tmItems]);

    const getItemEffectivePrice = useCallback((item: QuoteItem) => {
        let effectivePrice = item.unitPrice;
        subcontractingItems.forEach(si => {
            if (si.targetItemIds?.includes(item.tempId!)) {
                if (si.applyType === 'perUnit') {
                    effectivePrice += si.cost;
                } else if (si.applyType === 'distributed') {
                    const totalQty = items.filter(it => si.targetItemIds?.includes(it.tempId!)).reduce((s, it) => s + it.quantity, 0);
                    if (totalQty > 0) {
                        effectivePrice += si.cost / totalQty;
                    }
                }
            }
        });

        // Global subcontracting links
        if (initialData?.id) {
            subcontractings.filter(s => s.quoteId === initialData.id).forEach(gs => {
                if (!gs.targetItemIds || gs.targetItemIds.length === 0 || gs.targetItemIds.includes(item.tempId!)) {
                    const actualCost = gs.cost ?? gs.defaultCost;
                    if (gs.applyType === 'perUnit') {
                        effectivePrice += actualCost;
                    } else if (gs.applyType === 'distributed') {
                        const targetItems = items.filter(it => !gs.targetItemIds || gs.targetItemIds.length === 0 || gs.targetItemIds.includes(it.tempId!));
                        const totalQty = targetItems.reduce((s, it) => s + it.quantity, 0);
                        if (totalQty > 0) {
                            effectivePrice += actualCost / totalQty;
                        }
                    }
                }
            });
        }
        
        return effectivePrice;
    }, [items, subcontractingItems, subcontractings, initialData]);

    const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            
            const updatedItem = { ...item, [field]: value };
            
            // Recalculate unit price if quantity changes
            if (field === 'quantity') {
                const newQuantity = value as number;
                if (item.type === 'part') {
                    const part = parts.find(p => p.id === item.id);
                    if (part) {
                        updatedItem.unitPrice = calculatePartUnitCost({ ...part, quantity: newQuantity }, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
                    }
                } else {
                    const assembly = assemblies.find(a => a.id === item.id);
                    if (assembly) {
                        updatedItem.unitPrice = calculateAssemblyUnitCost({ ...assembly, quantity: newQuantity }, parts, assemblies, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
                    }
                }
            }
            
            return updatedItem;
        }));
    };

    const totalAmount = useMemo(() => {
        let total = 0;
        items.forEach(item => {
            total += getItemEffectivePrice(item) * item.quantity;
        });
        
        // Add subcontracting costs that are 'once' type (local)
        subcontractingItems.forEach(si => {
            if (si.applyType === 'once') {
                total += si.cost;
            }
        });

        // Add subcontracting costs that are 'once' type (global)
        if (initialData?.id) {
            subcontractings.filter(s => s.quoteId === initialData.id).forEach(gs => {
                if (gs.applyType === 'once' || !gs.applyType) {
                    total += gs.cost ?? gs.defaultCost;
                }
            });
        }
        
        return total;
    }, [items, subcontractingItems, subcontractings, initialData, getItemEffectivePrice]);

    const materialSummary = useMemo(() => {
        const summary: { [key: string]: number } = {};
        
        const processItem = (type: 'part' | 'assembly', id: string, qty: number) => {
            if (type === 'part') {
                const part = parts.find(p => p.id === id);
                if (part && part.materialId) {
                    const laserOp = part.operations.find(op => op.laserParams);
                    let area = 0;
                    if (laserOp && laserOp.laserParams) {
                        const selection = laserOp.laserParams.materialCostSelection || 'blank';
                        if (selection === 'blank') area = laserOp.laserParams.blankAreaSqIn;
                        else if (selection === 'real') area = laserOp.laserParams.blankAreaSqIn * (laserOp.laserParams.yieldPercentage / 100);
                        else if (selection === 'nest') area = laserOp.laserParams.blankAreaSqIn;
                    } else {
                        area = (part.dimensionX || 0) * (part.dimensionY || 0);
                    }
                    const areaSqFt = (area * qty) / 144;
                    summary[part.materialId] = (summary[part.materialId] || 0) + areaSqFt;
                }
            } else {
                const assembly = assemblies.find(a => a.id === id);
                if (assembly) {
                    assembly.items.forEach(item => processItem(item.type, item.id, item.quantity * qty));
                }
            }
        };

        items.forEach(item => processItem(item.type, item.id, item.quantity));
        return Object.entries(summary).map(([materialId, totalSqFt]) => ({ materialId, totalSqFt }));
    }, [items, parts, assemblies]);

    const tubeMaterialSummary = useMemo(() => {
        interface TubeSummary {
            materialId: string;
            totalCutLengthInches: number;
            totalPieces: number;
            totalPierces: number;
        }
        const summary: { [key: string]: TubeSummary } = {};
        
        const processItem = (type: 'part' | 'assembly', id: string, qty: number) => {
            if (type === 'part') {
                const part = parts.find(p => p.id === id);
                if (part && part.materialId) {
                    const tubeOp = part.operations.find(op => op.laserTubeParams);
                    if (tubeOp && tubeOp.laserTubeParams) {
                        const matId = part.materialId;
                        if (!summary[matId]) {
                            summary[matId] = { materialId: matId, totalCutLengthInches: 0, totalPieces: 0, totalPierces: 0 };
                        }
                        const pQty = qty;
                        summary[matId].totalPieces += pQty;
                        summary[matId].totalCutLengthInches += (tubeOp.laserTubeParams.cutLengthInches || 0) * pQty;
                        summary[matId].totalPierces += (tubeOp.laserTubeParams.numberOfPierces || 0) * pQty;
                    }
                }
            } else {
                const assembly = assemblies.find(a => a.id === id);
                if (assembly) {
                    assembly.items.forEach(item => processItem(item.type, item.id, item.quantity * qty));
                }
            }
        };

        items.forEach(item => processItem(item.type, item.id, item.quantity));
        return Object.values(summary);
    }, [items, parts, assemblies]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Quote name is required';
        if (!clientId) newErrors.clientId = 'Client is required';
        if (items.length === 0) newErrors.items = 'At least one item is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (validate()) {
            const quoteData = {
                name: name.trim(),
                clientId,
                status,
                date,
                items,
                totalAmount,
                notes: notes.trim(),
                subcontractingItems
            };
            if (initialData) {
                onSubmit({ ...initialData, ...quoteData });
            } else {
                onSubmit(quoteData);
            }
        }
    };

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            {initialData && 'quoteNumber' in initialData && (
                <div className="bg-blue-50 p-3 rounded-md text-blue-800 font-bold text-lg mb-4">
                    {(initialData as unknown as Quote).quoteNumber}
                </div>
            )}

            {initialData?.isAiGenerated && initialData.aiSuggestions && (
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h4 className="text-sm font-bold text-purple-800 uppercase tracking-wider">Suggestions de l'IA</h4>
                    </div>
                    <div className="text-xs text-purple-700 leading-relaxed italic mb-3">
                        {JSON.parse(initialData.aiSuggestions).notes}
                    </div>
                    {status === 'AI_Draft' && (
                        <button 
                            type="button"
                            onClick={() => setStatus('Draft')}
                            className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1 shadow-sm"
                        >
                            <CheckCircleIcon className="w-3 h-3" />
                            Approuver et Convertir en Brouillon
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                <div className="space-y-4 flex flex-col h-[75vh]">
                    <h3 className="text-lg font-bold text-slate-800">Chat AI</h3>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <AiQuoteChatbox quoteId={initialData?.id || 'new'} onUpdateQuote={handleAiUpdate} />
                    </div>
                    {items.some(i => i.isAiGenerated && i.aiStatus === 'Pending') && (
                        <div className="h-48 overflow-y-auto">
                            <ApprovalDashboard items={items} onApprove={handleApproveAiItem} onReject={handleRejectAiItem} />
                        </div>
                    )}
                </div>
                <div className="space-y-4 flex flex-col h-[75vh] overflow-y-auto pr-2">
                    <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-2 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800">Détails de la soumission</h3>
                    </div>
                {isLocked && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-center gap-3 mb-4">
                        <LockIcon className="w-5 h-5 text-amber-500" />
                        <p className="text-sm text-amber-700 font-medium">
                            Cette soumission est verrouillée car une copie client a été générée. 
                            Pour la modifier, créez une révision.
                        </p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="quoteName" className="block text-sm font-medium text-slate-700">Quote Name / Reference</label>
                        <input
                            type="text"
                            id="quoteName"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            disabled={isLocked}
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.name ? 'border-red-300' : 'border-slate-300'} ${isLocked ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="quoteClient" className="block text-sm font-medium text-slate-700">Client</label>
                        <select
                            id="quoteClient"
                            value={clientId}
                            onChange={e => setClientId(e.target.value)}
                            disabled={isLocked}
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.clientId ? 'border-red-300' : 'border-slate-300'} ${isLocked ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                        >
                            <option value="">Select Client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {errors.clientId && <p className="mt-1 text-xs text-red-600">{errors.clientId}</p>}
                    </div>
                    <div>
                        <label htmlFor="quoteDate" className="block text-sm font-medium text-slate-700">Date</label>
                        <input
                            type="date"
                            id="quoteDate"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            disabled={isLocked}
                            className={`mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm ${isLocked ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="quoteStatus" className="block text-sm font-medium text-slate-700">Status</label>
                        <select
                            id="quoteStatus"
                            value={status}
                            onChange={e => setStatus(e.target.value as QuoteStatus)}
                            disabled={isLocked}
                            className={`mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm ${isLocked ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                        >
                            <option value="Draft">Draft</option>
                            <option value="AI_Draft">Brouillon IA</option>
                            <option value="Sent">Sent</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Locked">Verrouillé</option>
                        </select>
                    </div>
                </div>

            <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-700">Quote Items</label>
                    {!isLocked && (
                        <div className="flex gap-2 items-center">
                            {onAddPart && (
                                <button 
                                    type="button" 
                                    onClick={() => setShowQuickPart(true)}
                                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1"
                                >
                                    <PlusIcon className="w-3 h-3" />
                                    New Part
                                </button>
                            )}
                            {onAddAssembly && (
                                <button 
                                    type="button" 
                                    onClick={() => setShowQuickAssembly(true)}
                                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1"
                                >
                                    <PlusIcon className="w-3 h-3" />
                                    New Assembly
                                </button>
                            )}
                            {(onAddPart || onAddAssembly) && (
                                <button 
                                    type="button" 
                                    onClick={() => setShowBatchImport(!showBatchImport)}
                                    className="text-[10px] text-purple-600 hover:text-purple-700 font-bold uppercase tracking-wider flex items-center gap-1 ml-2"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                    Batch Import
                                </button>
                            )}
                            <select 
                                className="text-xs border border-slate-300 rounded px-2 py-1"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const [type, id] = e.target.value.split(':');
                                        handleAddItem(type as 'part' | 'assembly' | 'tm-item', id);
                                        e.target.value = '';
                                    }
                                }}
                            >
                                <option value="">Add Existing...</option>
                                <optgroup label="T-M (Temps-Matériel)">
                                    {tmItems && tmItems.map(t => <option key={t.id} value={`tm-item:${t.id}`}>{t.name}</option>)}
                                </optgroup>
                                <optgroup label="Parts">
                                    {parts.map(p => <option key={p.id} value={`part:${p.id}`}>{p.name}</option>)}
                                </optgroup>
                                <optgroup label="Assemblies">
                                    {assemblies.map(a => <option key={a.id} value={`assembly:${a.id}`}>{a.name}</option>)}
                                </optgroup>
                            </select>
                        </div>
                    )}
                </div>

                {showQuickPart && onAddPart && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Quick Add Part</h4>
                        <PartForm 
                            clients={clients}
                            materials={materials} 
                            operations={operations} 
                            suppliers={suppliers}
                            bendingSettings={bendingSettings}
                            laserSettings={laserSettings}
                            subcontractings={subcontractings}
                            isSubForm={true}
                            onSubmit={async (data) => {
                                const newId = await onAddPart(data);
                                handleAddItem('part', newId);
                                setShowQuickPart(false);
                            }} 
                            onCancel={() => setShowQuickPart(false)} 
                        />
                    </div>
                )}

                {showQuickAssembly && onAddAssembly && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Quick Add Assembly</h4>
                        <AssemblyForm 
                            clients={clients}
                            parts={parts} 
                            assemblies={assemblies} 
                            operations={operations} 
                            materials={materials}
                            suppliers={suppliers}
                            bendingSettings={bendingSettings}
                            laserSettings={laserSettings}
                            subcontractings={subcontractings}
                            isSubForm={true}
                            onSubmit={async (data) => {
                                const newId = await onAddAssembly(data as Omit<Assembly, 'id'>);
                                handleAddItem('assembly', newId);
                                setShowQuickAssembly(false);
                            }} 
                            onCancel={() => setShowQuickAssembly(false)} 
                            onAddPart={onAddPart}
                            onAddAssembly={onAddAssembly}
                        />
                    </div>
                )}

                {editingItem && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-blue-200 mb-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-blue-700 uppercase">Modifier {editingItem.type === 'part' ? 'Pièce' : 'Assemblage'}</h4>
                            <button type="button" onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {editingItem.type === 'part' ? (
                            <PartForm 
                                clients={clients}
                                materials={materials} 
                                operations={operations} 
                                suppliers={suppliers}
                                bendingSettings={bendingSettings}
                                laserSettings={laserSettings}
                                laserTubeSettings={laserTubeSettings}
                                subcontractings={subcontractings}
                                isSubForm={true}
                                initialData={parts.find(p => p.id === editingItem.id)}
                                onSubmit={(data) => {
                                    if (onUpdatePart) onUpdatePart(data as Part);
                                    // Update unit price in quote items if it was changed
                                    const updatedPart = data as Part;
                                    const newPrice = calculatePartUnitCost(updatedPart, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
                                    setItems(prev => prev.map(item => 
                                        (item.type === 'part' && item.id === updatedPart.id) 
                                            ? { ...item, unitPrice: newPrice } 
                                            : item
                                    ));
                                    setEditingItem(null);
                                }} 
                                onCancel={() => setEditingItem(null)} 
                            />
                        ) : (
                            <AssemblyForm 
                                clients={clients}
                                parts={parts} 
                                assemblies={assemblies} 
                                operations={operations} 
                                materials={materials}
                                suppliers={suppliers}
                                bendingSettings={bendingSettings}
                                laserSettings={laserSettings}
                                laserTubeSettings={laserTubeSettings}
                                subcontractings={subcontractings}
                                isSubForm={true}
                                initialData={assemblies.find(a => a.id === editingItem.id)}
                                onSubmit={(data) => {
                                    if (onUpdateAssembly) onUpdateAssembly(data as Assembly);
                                    // Update unit price in quote items if it was changed
                                    const updatedAssembly = data as Assembly;
                                    const newPrice = calculateAssemblyUnitCost(updatedAssembly, parts, assemblies, operations, materials, bendingSettings, laserSettings, laserTubeSettings, subcontractings);
                                    setItems(prev => prev.map(item => 
                                        (item.type === 'assembly' && item.id === updatedAssembly.id) 
                                            ? { ...item, unitPrice: newPrice } 
                                            : item
                                    ));
                                    setEditingItem(null);
                                }} 
                                onCancel={() => setEditingItem(null)} 
                                onAddPart={onAddPart}
                                onAddAssembly={onAddAssembly}
                            />
                        )}
                    </div>
                )}

                {showBatchImport && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 overflow-x-auto">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase">Batch Import</h4>
                            <button type="button" onClick={() => setBatchItems([...batchItems, { id: Date.now().toString(), type: 'part', name: '', quantity: 1 }])} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-medium">
                                + Ajouter Ligne
                            </button>
                        </div>
                        
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-2 py-2">Type</th>
                                    <th className="px-2 py-2">Nom</th>
                                    <th className="px-2 py-2 w-20">Qté</th>
                                    <th className="px-2 py-2">Matériel</th>
                                    <th className="px-2 py-2">Fichiers (PDF/DXF/STEP)</th>
                                    <th className="px-2 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {batchItems.map((item, index) => (
                                    <tr key={item.id} className="border-b border-slate-200">
                                        <td className="px-2 py-1">
                                            <select value={item.type} onChange={(e) => {
                                                const newItems = [...batchItems];
                                                newItems[index].type = e.target.value as 'part' | 'assembly';
                                                setBatchItems(newItems);
                                            }} className="w-full text-xs border-slate-300 rounded py-1">
                                                <option value="part">Pièce</option>
                                                <option value="assembly">Assemblage</option>
                                            </select>
                                        </td>
                                        <td className="px-2 py-1">
                                            <input type="text" value={item.name} onChange={(e) => {
                                                const newItems = [...batchItems];
                                                newItems[index].name = e.target.value;
                                                setBatchItems(newItems);
                                            }} className="w-full text-xs border-slate-300 rounded py-1" placeholder="Nom..." />
                                        </td>
                                        <td className="px-2 py-1">
                                            <input type="number" value={item.quantity} onChange={(e) => {
                                                const newItems = [...batchItems];
                                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                                setBatchItems(newItems);
                                            }} className="w-full text-xs border-slate-300 rounded py-1" min="1" />
                                        </td>
                                        <td className="px-2 py-1">
                                            <select value={item.materialId || ''} onChange={(e) => {
                                                const newItems = [...batchItems];
                                                newItems[index].materialId = e.target.value;
                                                setBatchItems(newItems);
                                            }} className="w-full text-xs border-slate-300 rounded py-1" disabled={item.type === 'assembly'}>
                                                <option value="">-</option>
                                                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-2 py-1">
                                            <div className="flex gap-1">
                                                <label className={`cursor-pointer px-2 py-1 text-[10px] font-bold rounded border transition-colors ${item.filePdf ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`} title={item.filePdfName || 'Upload PDF'}>
                                                    PDF
                                                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleBatchFileUpload(index, 'pdf', e)} />
                                                </label>
                                                <label className={`cursor-pointer px-2 py-1 text-[10px] font-bold rounded border transition-colors ${item.fileDxf ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`} title={item.fileDxfName || 'Upload DXF'}>
                                                    DXF
                                                    <input type="file" className="hidden" accept=".dxf" onChange={(e) => handleBatchFileUpload(index, 'dxf', e)} />
                                                </label>
                                                <label className={`cursor-pointer px-2 py-1 text-[10px] font-bold rounded border transition-colors ${item.fileStep ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`} title={item.fileStepName || 'Upload STEP'}>
                                                    STEP
                                                    <input type="file" className="hidden" accept=".step,.stp" onChange={(e) => handleBatchFileUpload(index, 'step', e)} />
                                                </label>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1 text-right">
                                            <button type="button" onClick={() => setBatchItems(batchItems.filter((_, i) => i !== index))} className="text-slate-400 hover:text-red-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {batchItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-6 text-xs text-slate-400 italic bg-white rounded-b-lg">
                                            Aucune ligne. Cliquez sur "+ Ajouter Ligne" pour commencer.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        
                        {batchItems.length > 0 && (
                            <div className="mt-4 flex justify-end">
                                <button type="button" onClick={handleProcessBatch} disabled={isProcessingBatch} className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-md hover:bg-purple-700 disabled:opacity-50 shadow-sm transition-colors">
                                    {isProcessingBatch ? 'Création en cours...' : 'Confirmer & Créer Soumission'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="space-y-2">
                    {items.map((item, index) => {
                        let label = 'Unknown';
                        if (item.type === 'part') label = parts.find(p => p.id === item.id)?.name || 'Part';
                        else if (item.type === 'assembly') label = assemblies.find(a => a.id === item.id)?.name || 'Assembly';
                        else if (item.type === 'tm-item') label = tmItems.find(t => t.id === item.id)?.name || 'T-M Item';
                        else if (item.type === 'project') label = item.name || 'Project';
                        
                        const effectivePrice = getItemEffectivePrice(item);
                        const hasSubcontracting = subcontractingItems.some(si => si.targetItemIds?.includes(item.tempId!));
                        
                        return (
                            <div key={item.tempId || `${item.type}-${item.id}-${index}`} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-900 truncate">{label}</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setEditingItem({ type: item.type, id: item.id })}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Modifier la pièce/assemblage"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase">{item.type}</p>
                                </div>
                                <div className="w-20">
                                    <label className="block text-[10px] text-slate-500 uppercase">Qty</label>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                        disabled={isLocked}
                                        className={`w-full text-sm border-slate-300 rounded px-2 py-1 ${isLocked ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                        min="1"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-[10px] text-slate-500 uppercase">Unit Price ($)</label>
                                    <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                        disabled={isLocked}
                                        className={`w-full text-sm border-slate-300 rounded px-2 py-1 ${isLocked ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                        step="0.01"
                                    />
                                    {hasSubcontracting && (
                                        <p className="text-[9px] text-blue-600 font-bold">Eff: ${(effectivePrice || 0).toFixed(2)} $</p>
                                    )}
                                </div>
                                <div className="w-24 text-right">
                                    <label className="block text-[10px] text-slate-500 uppercase">Total</label>
                                    <p className="text-sm font-semibold text-slate-900">${((item.quantity || 0) * (effectivePrice || 0)).toFixed(2)}</p>
                                </div>
                                {!isLocked && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {items.length === 0 && (
                        <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                            No items added to this quote yet.
                        </div>
                    )}
                </div>
                {errors.items && <p className="mt-1 text-xs text-red-600">{errors.items}</p>}
            </div>

            <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-900 mb-2">Sous-traitance</label>
                <SubcontractingItemsList 
                    items={subcontractingItems}
                    subcontractings={subcontractings}
                    onChange={setSubcontractingItems}
                    applyType="perUnit"
                    availableItems={availableItems}
                />
            </div>

            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <span className="text-sm font-bold text-blue-900 uppercase tracking-wider">Total Amount</span>
                <span className="text-2xl font-black text-blue-600">${(totalAmount || 0).toFixed(2)}</span>
            </div>

            <div>
                <label htmlFor="quoteNotes" className="block text-sm font-medium text-slate-700">Notes / Terms</label>
                <textarea
                    id="quoteNotes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
                    placeholder="Enter any additional notes or terms..."
                ></textarea>
            </div>

            <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Sommaire des Matériaux</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {materialSummary.map(ms => (
                        <div key={ms.materialId} className="bg-slate-50 p-2 rounded border border-slate-200 flex justify-between items-center">
                            <span className="text-xs text-slate-600 font-medium">
                                {materials.find(m => m.id === ms.materialId)?.name || 'Matériel inconnu'}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                                {ms.totalSqFt.toFixed(2)} pi²
                            </span>
                        </div>
                    ))}
                    {materialSummary.length === 0 && (
                        <p className="text-xs text-slate-400 italic">Aucun matériel requis.</p>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Sommaire Laser Tube</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tubeMaterialSummary.map(ts => {
                        const mat = materials.find(m => m.id === ts.materialId);
                        const matThickness = mat?.thickness || 0.125;
                        const totalLengthWithSpacing = ts.totalCutLengthInches + (ts.totalPieces * matThickness);
                        
                        // Calculation for 20ft and 24ft bars (240 and 288 inches)
                        const bar20 = 240;
                        const bar24 = 288;
                        const bars20Needed = Math.ceil(totalLengthWithSpacing / bar20);
                        const bars24Needed = Math.ceil(totalLengthWithSpacing / bar24);

                        return (
                        <div key={ts.materialId} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2 shadow-sm">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-sm font-bold text-slate-800">
                                    {mat?.description || mat?.name || 'Matériel inconnu'}
                                </span>
                                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-lg font-medium">
                                    {ts.totalPieces} pcs | {ts.totalPierces} perçages
                                </span>
                            </div>
                            
                            <div className="text-xs text-slate-600 flex justify-between">
                                <span>Longueur totale (avec espacement):</span>
                                <span className="font-medium">{(totalLengthWithSpacing / 12).toFixed(1)} pi</span>
                            </div>
                            
                            <div className="mt-2 space-y-1">
                                <div className="text-xs flex justify-between items-center bg-white border border-slate-200 p-1.5 rounded">
                                    <span className="text-slate-500">Barres de 20 pi:</span>
                                    <span className="font-bold text-[#0078d4]">{bars20Needed}</span>
                                </div>
                                <div className="text-xs flex justify-between items-center bg-white border border-slate-200 p-1.5 rounded">
                                    <span className="text-slate-500">Barres de 24 pi:</span>
                                    <span className="font-bold text-[#0078d4]">{bars24Needed}</span>
                                </div>
                            </div>
                            
                            <button
                                type="button"
                                className="mt-2 w-full flex justify-center items-center gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 py-2 rounded-lg text-xs font-bold transition-colors"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert('Nesting IA en cours de développement...');
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                                Optimiser Nesting (IA)
                            </button>
                        </div>
                    )})}
                    {tubeMaterialSummary.length === 0 && (
                        <p className="text-xs text-slate-400 italic">Aucun matériel tube requis.</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 sticky bottom-0 bg-white z-10 pb-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                    {isLocked ? 'Fermer' : 'Annuler'}
                </button>
                {!isLocked && (
                    <button 
                      type={isSubForm ? "button" : "submit"} 
                      onClick={isSubForm ? () => handleSubmit() : undefined}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
                    >
                      {initialData ? 'Update Quote' : 'Create Quote'}
                    </button>
                )}
            </div>
            </div>
            </div>
        </FormContainer>
    );
};

interface SubcontractingFormProps {
    onSubmit: (data: Omit<Subcontracting, 'id'>) => void;
    onCancel: () => void;
    initialData?: Subcontracting;
    isSubForm?: boolean;
    workOrders?: WorkOrder[];
    quotes?: Quote[];
    parts?: Part[];
    assemblies?: Assembly[];
    suppliers: Supplier[];
}

export const SubcontractingForm: React.FC<SubcontractingFormProps> = ({ 
    onSubmit, onCancel, initialData, isSubForm,
    workOrders = [], quotes = [], parts = [], assemblies = [], suppliers = []
}) => {
    const [name, setName] = useState(initialData?.name || '');
    const [defaultCost, setDefaultCost] = useState(initialData?.defaultCost || 0);
    const [cost, setCost] = useState(initialData?.cost || initialData?.defaultCost || 0);
    const [supplierLinks, setSupplierLinks] = useState<SupplierLink[]>(initialData?.supplierLinks || []);
    
    const [linkType, setLinkType] = useState<'none' | 'workOrder' | 'quote' | 'part' | 'assembly'>(() => {
        if (initialData?.workOrderId) return 'workOrder';
        if (initialData?.quoteId) return 'quote';
        if (initialData?.partId) return 'part';
        if (initialData?.assemblyId) return 'assembly';
        return 'none';
    });
    
    const [linkId, setLinkId] = useState(() => {
        return initialData?.workOrderId || initialData?.quoteId || initialData?.partId || initialData?.assemblyId || '';
    });
    
    const [targetItemIds, setTargetItemIds] = useState<string[]>(initialData?.targetItemIds || []);
    const [applyType, setApplyType] = useState<'once' | 'distributed' | 'perUnit'>(initialData?.applyType || 'once');
    
    const [errors, setErrors] = useState<Record<string, string>>({});

    const availableItems = useMemo(() => {
        if (linkType === 'workOrder') {
            const wo = workOrders.find(w => w.id === linkId);
            if (!wo) return [];
            return wo.parts.map(p => ({ id: p.instanceId, name: p.name, quantity: 1 }));
        }
        if (linkType === 'quote') {
            const quote = quotes.find(q => q.id === linkId);
            if (!quote) return [];
            return quote.items.map(item => ({
                id: item.tempId || item.id,
                name: (item.type === 'part' ? parts.find(p => p.id === item.id)?.name : assemblies.find(a => a.id === item.id)?.name) || 'Item',
                quantity: item.quantity
            }));
        }
        return [];
    }, [linkType, linkId, workOrders, quotes, parts, assemblies]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Description is required';
        if (defaultCost < 0) newErrors.defaultCost = 'Default cost must be positive';
        if (linkType !== 'none' && !linkId) newErrors.linkId = 'Selection is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (validate()) {
            const data: Partial<Subcontracting> = {
                name: name.trim(),
                defaultCost,
                cost: linkType !== 'none' ? cost : null,
                applyType: (linkType === 'workOrder' || linkType === 'quote') ? applyType : null,
                targetItemIds: (linkType === 'workOrder' || linkType === 'quote') ? targetItemIds : null,
                supplierLinks
            };
            
            if (linkType === 'workOrder') data.workOrderId = linkId;
            if (linkType === 'quote') data.quoteId = linkId;
            if (linkType === 'part') data.partId = linkId;
            if (linkType === 'assembly') data.assemblyId = linkId;
            
            onSubmit(data as Subcontracting);
        }
    };

    const toggleTargetItem = (id: string) => {
        setTargetItemIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <FormContainer isSubForm={isSubForm} onSubmit={handleSubmit} className="space-y-4">
            {initialData && 'subcontractingNumber' in initialData && (
                <div className="bg-blue-50 p-3 rounded-md text-blue-800 font-bold text-lg mb-4">
                    {(initialData as unknown as Subcontracting).subcontractingNumber}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="subName" className="block text-sm font-medium text-slate-700">Description</label>
                    <input
                        type="text"
                        id="subName"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                        }}
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                            errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                        }`}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="subCost" className="block text-sm font-medium text-slate-700">Default Cost ($)</label>
                    <input
                        type="number"
                        id="subCost"
                        min="0"
                        step="0.01"
                        value={defaultCost}
                        onChange={(e) => {
                            setDefaultCost(parseFloat(e.target.value) || 0);
                            if (errors.defaultCost) setErrors(prev => ({ ...prev, defaultCost: '' }));
                        }}
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                            errors.defaultCost ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                        }`}
                    />
                    {errors.defaultCost && <p className="mt-1 text-xs text-red-600">{errors.defaultCost}</p>}
                </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
                <SupplierLinksField 
                    links={supplierLinks} 
                    suppliers={suppliers} 
                    onChange={setSupplierLinks} 
                />
            </div>

            <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-bold text-slate-900 mb-2">Lien vers</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                        value={linkType}
                        onChange={(e) => {
                            setLinkType(e.target.value as 'none' | 'workOrder' | 'quote' | 'part' | 'assembly');
                            setLinkId('');
                            setTargetItemIds([]);
                        }}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    >
                        <option value="none">Aucun (Service Maître)</option>
                        <option value="workOrder">Bon de Travail</option>
                        <option value="quote">Soumission</option>
                        <option value="part">Pièce</option>
                        <option value="assembly">Assemblage</option>
                    </select>

                    {linkType !== 'none' && (
                        <select
                            value={linkId}
                            onChange={(e) => setLinkId(e.target.value)}
                            className={`block w-full rounded-md shadow-sm sm:text-sm ${
                                errors.linkId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#0078d4] focus:ring-[#0078d4]'
                            }`}
                        >
                            <option value="">Sélectionner...</option>
                            {linkType === 'workOrder' && workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.name}</option>)}
                            {linkType === 'quote' && quotes.map(q => <option key={q.id} value={q.id}>{q.quoteNumber} - {q.name}</option>)}
                            {linkType === 'part' && parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            {linkType === 'assembly' && assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                </div>
                {errors.linkId && <p className="mt-1 text-xs text-red-600">{errors.linkId}</p>}
            </div>

            {linkType !== 'none' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Coût Réel ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cost}
                            onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                        />
                    </div>
                    {(linkType === 'workOrder' || linkType === 'quote') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Application</label>
                            <select
                                value={applyType}
                                onChange={(e) => setApplyType(e.target.value as 'once' | 'distributed' | 'perUnit')}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                            >
                                <option value="once">Une fois (Total)</option>
                                <option value="distributed">Distribué (Total / Qté)</option>
                                <option value="perUnit">Par Unité (Cout * Qté)</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            {(linkType === 'workOrder' || linkType === 'quote') && availableItems.length > 0 && (
                <div className="pt-4">
                    <label className="block text-sm font-bold text-slate-900 mb-2">Items ciblés</label>
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-200 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-2">
                            {availableItems.map(item => (
                                <label key={item.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={targetItemIds.includes(item.id)}
                                        onChange={() => toggleTargetItem(item.id)}
                                        className="rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]"
                                    />
                                    <span className="text-sm text-slate-700">{item.name} <span className="text-slate-400 text-xs">(x{item.quantity})</span></span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 italic">Si aucun item n'est sélectionné, le coût s'applique à l'ensemble du document.</p>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]"
                >
                    {initialData ? 'Enregistrer les modifications' : 'Ajouter la sous-traitance'}
                </button>
            </div>
        </FormContainer>
    );
};

export const SupplierForm: React.FC<{
    initialData?: Supplier | null;
    onSubmit: (data: Omit<Supplier, 'id'>) => void;
    onCancel: () => void;
}> = ({ initialData, onSubmit, onCancel }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [contactInfo, setContactInfo] = useState<ContactInfo>({
        contactPerson: initialData?.contactPerson || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        city: initialData?.city || '',
        province: initialData?.province || '',
        postalCode: initialData?.postalCode || '',
        country: initialData?.country || '',
        website: initialData?.website || '',
        notes: initialData?.notes || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, ...contactInfo });
    };

    return (
        <FormContainer onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Nom du fournisseur</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm"
                />
            </div>

            <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-medium text-slate-800 mb-4">Informations de contact</h3>
                <ContactFields 
                    data={contactInfo} 
                    onChange={(updates) => setContactInfo(prev => ({ ...prev, ...updates }))} 
                />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] rounded-md hover:bg-[#106ebe]">{initialData ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
        </FormContainer>
    );
};

export const PurchaseForm: React.FC<{
    suppliers: Supplier[];
    quotes: Quote[];
    workOrders: WorkOrder[];
    materials: Material[];
    parts: Part[];
    subcontractings: Subcontracting[];
    initialData?: Purchase | null;
    onSubmit: (data: Omit<Purchase, 'id' | 'purchaseNumber'>) => void;
    onCancel: () => void;
}> = ({ suppliers, quotes, workOrders, materials, parts, subcontractings, initialData, onSubmit, onCancel }) => {
    const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
    const [quoteId, setQuoteId] = useState(initialData?.quoteId || '');
    const [workOrderId, setWorkOrderId] = useState(initialData?.workOrderId || '');
    const [items, setItems] = useState<PurchaseItem[]>(initialData?.items || []);
    const [isSent, setIsSent] = useState(initialData?.isSent || false);
    const [sentDate, setSentDate] = useState(initialData?.sentDate || new Date().toISOString().split('T')[0]);
    const [isReceived, setIsReceived] = useState(initialData?.isReceived || false);
    const [receivedDate, setReceivedDate] = useState(initialData?.receivedDate || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(initialData?.notes || '');

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const handleAddItem = () => {
        setItems([...items, { type: 'material', id: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleUpdateItem = (index: number, updates: Partial<PurchaseItem>) => {
        setItems(items.map((item, i) => i === index ? { ...item, ...updates } : item));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            supplierId,
            quoteId: quoteId || null,
            workOrderId: workOrderId || null,
            items,
            isSent,
            sentDate: isSent ? sentDate : null,
            isReceived,
            receivedDate: isReceived ? receivedDate : null,
            totalAmount,
            notes
        });
    };

    return (
        <FormContainer onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            {initialData && (
                <div className="bg-blue-50 p-3 rounded-md text-blue-800 font-bold text-lg mb-4">
                    {initialData.purchaseNumber}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Fournisseur</label>
                    <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm">
                        <option value="">Sélectionner un fournisseur</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Lier à Soumission</label>
                        <select value={quoteId} onChange={e => { setQuoteId(e.target.value); if(e.target.value) setWorkOrderId(''); }} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm">
                            <option value="">Aucune</option>
                            {quotes.map(q => <option key={q.id} value={q.id}>{q.quoteNumber}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Lier à Work Order</label>
                        <select value={workOrderId} onChange={e => { setWorkOrderId(e.target.value); if(e.target.value) setQuoteId(''); }} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm">
                            <option value="">Aucun</option>
                            {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.workOrderNumber}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-slate-700">Items de l'achat</h3>
                    <button type="button" onClick={handleAddItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                        <PlusIcon className="w-3 h-3" /> Ajouter Item
                    </button>
                </div>
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-2 rounded-md border border-slate-200">
                            <div className="col-span-3">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold">Type</label>
                                <select value={item.type} onChange={e => handleUpdateItem(index, { type: e.target.value as 'material' | 'part' | 'subcontracting' | 'other', id: '' })} className="block w-full rounded-md border-slate-300 shadow-sm text-xs">
                                    <option value="material">Matériel</option>
                                    <option value="part">Pièce</option>
                                    <option value="subcontracting">Sous-traitance</option>
                                    <option value="other">Autre</option>
                                </select>
                            </div>
                            <div className="col-span-4">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold">Référence / Description</label>
                                {item.type === 'material' ? (
                                    <select value={item.id} onChange={e => handleUpdateItem(index, { id: e.target.value })} className="block w-full rounded-md border-slate-300 shadow-sm text-xs">
                                        <option value="">Sélectionner Matériel</option>
                                        {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                ) : item.type === 'part' ? (
                                    <select value={item.id} onChange={e => {
                                        const part = parts.find(p => p.id === e.target.value);
                                        const link = part?.supplierLinks?.find(l => l.supplierId === supplierId);
                                        handleUpdateItem(index, { 
                                            id: e.target.value, 
                                            description: part?.name || '',
                                            unitPrice: link?.price || 0
                                        });
                                    }} className="block w-full rounded-md border-slate-300 shadow-sm text-xs">
                                        <option value="">Sélectionner Pièce</option>
                                        {parts.filter(p => !supplierId || p.supplierLinks?.some(l => l.supplierId === supplierId)).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                ) : item.type === 'subcontracting' ? (
                                    <select value={item.id} onChange={e => {
                                        const sub = subcontractings.find(s => s.id === e.target.value);
                                        const link = sub?.supplierLinks?.find(l => l.supplierId === supplierId);
                                        handleUpdateItem(index, { 
                                            id: e.target.value, 
                                            description: sub?.name || '',
                                            unitPrice: link?.price || sub?.defaultCost || 0
                                        });
                                    }} className="block w-full rounded-md border-slate-300 shadow-sm text-xs">
                                        <option value="">Sélectionner Sous-traitance</option>
                                        {subcontractings.filter(s => !supplierId || s.supplierLinks?.some(l => l.supplierId === supplierId)).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input type="text" value={item.description || ''} onChange={e => handleUpdateItem(index, { description: e.target.value })} placeholder="Description" className="block w-full rounded-md border-slate-300 shadow-sm text-xs" />
                                )}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold">Qté</label>
                                <input type="number" value={item.quantity} onChange={e => handleUpdateItem(index, { quantity: Number(e.target.value) })} className="block w-full rounded-md border-slate-300 shadow-sm text-xs" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold">Prix Unitaire</label>
                                <input type="number" step="0.01" value={item.unitPrice} onChange={e => handleUpdateItem(index, { unitPrice: Number(e.target.value) })} className="block w-full rounded-md border-slate-300 shadow-sm text-xs" />
                            </div>
                            <div className="col-span-1 flex justify-center pb-1">
                                <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-2 text-right font-bold text-slate-800">
                    Total: ${totalAmount.toFixed(2)}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isSent" checked={isSent} onChange={e => setIsSent(e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                        <label htmlFor="isSent" className="text-sm font-medium text-slate-700">Achat envoyé</label>
                    </div>
                    {isSent && (
                        <input type="date" value={sentDate} onChange={e => setSentDate(e.target.value)} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-sm" />
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isReceived" checked={isReceived} onChange={e => setIsReceived(e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                        <label htmlFor="isReceived" className="text-sm font-medium text-slate-700">Achat reçu</label>
                    </div>
                    {isReceived && (
                        <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-sm" />
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm" rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] rounded-md hover:bg-[#106ebe]">{initialData ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
        </FormContainer>
    );
};
