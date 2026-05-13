import React from 'react';
import { Material, Part, Assembly } from '../types';
import { LayersIcon, CubeIcon } from './icons';

interface InventoryDashboardProps {
  materials: Material[];
  parts: Part[];
  assemblies: Assembly[];
  onOpenMaterials: () => void;
  onOpenParts: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ 
  materials, 
  parts, 
  onOpenMaterials, 
  onOpenParts 
}) => {
  const totalMaterialValue = materials.reduce((acc, m) => acc + ((m.stockQuantity || 0) * m.costPerLb), 0);
  const totalMaterialsInStock = materials.reduce((acc, m) => acc + (m.stockQuantity || 0), 0);
  const lowStockMaterials = materials.filter(m => (m.stockQuantity || 0) < 10);

  const totalParts = parts.length;

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 border-l-4 border-slate-900 pl-4">Inventaire</h1>
          <p className="text-sm text-slate-500 mt-2 pl-5">Aperçu et gestion des stocks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-slate-500 tracking-wide uppercase">Valeur Matières</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <LayersIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">${totalMaterialValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-slate-500 tracking-wide uppercase">Qté Matières</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <LayersIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalMaterialsInStock}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-slate-500 tracking-wide uppercase">Stock Faible</h3>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <LayersIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600">{lowStockMaterials.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-slate-500 tracking-wide uppercase">Pièces Uniques</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CubeIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalParts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Materials Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LayersIcon className="w-5 h-5 text-slate-500" />
              Matières Premières
            </h2>
            <button 
              onClick={onOpenMaterials}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Gérer
            </button>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-4">
              {materials.slice(0, 5).map(m => (
                <div key={m.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900">{m.description}</p>
                    <p className="text-xs text-slate-500">{m.type} • {m.materialType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{m.stockQuantity || 0}</p>
                    <p className="text-xs text-slate-500">en stock</p>
                  </div>
                </div>
              ))}
              {materials.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">Aucune matière enregistrée</p>
              )}
            </div>
          </div>
        </div>

        {/* Parts Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-slate-500" />
              Base de Pièces
            </h2>
            <button 
              onClick={onOpenParts}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Gérer
            </button>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-4">
              {parts.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.materialId ? materials.find(m => m.id === p.materialId)?.description : 'Pas de matériel'}</p>
                  </div>
                </div>
              ))}
              {parts.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">Aucune pièce enregistrée</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
