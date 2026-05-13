import React, { useState } from 'react';
import { TMItem, Material, Operation, Subcontracting, ProfitSettings, Supplier, Client } from '../types';
import { TMItemForm } from './TMItemForm';

interface TMItemsManagerProps {
  items: TMItem[];
  materials: Material[];
  operations: Operation[];
  subcontractings: Subcontracting[];
  suppliers: Supplier[];
  clients: Client[];
  profitSettings: ProfitSettings;
  onAdd: (t: Omit<TMItem, 'id'>) => void;
  onUpdate: (t: TMItem) => void;
  onDelete: (id: string) => void;
}

export const TMItemsManager: React.FC<TMItemsManagerProps> = ({ items, materials, operations, subcontractings, suppliers, clients, profitSettings, onAdd, onUpdate, onDelete }) => {
  const [editingItem, setEditingItem] = useState<TMItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  const handleCreate = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: TMItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  if (isFormOpen) {
    return (
      <TMItemForm
        initialData={editingItem}
        materials={materials}
        operations={operations}
        subcontractings={subcontractings}
        suppliers={suppliers}
        clients={clients}
        profitSettings={profitSettings}
        onSave={(data) => {
          if (editingItem) {
            onUpdate({ ...data, id: editingItem.id });
          } else {
            onAdd(data);
          }
          setIsFormOpen(false);
        }}
        onCancel={() => setIsFormOpen(false)}
      />
    );
  }

  const filteredItems = (items || []).filter(item => 
    selectedClientId === 'all' || item.clientId === selectedClientId
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Soumissions Temps-Matériel (Budgétaires)</h2>
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">Créer T-M</button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Filtrer par Client</label>
        <select 
          className="border p-2 rounded" 
          value={selectedClientId} 
          onChange={e => setSelectedClientId(e.target.value)}
        >
          <option value="all">Tous les clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{item.name}</td>
                <td className="px-6 py-4 truncate max-w-xs">{item.description}</td>
                <td className="px-6 py-4 truncate text-sm text-slate-500">{clients.find(c => c.id === item.clientId)?.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900 mr-4">Modifier</button>
                  <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && <div className="p-6 text-center text-slate-500">Aucun élément trouvé.</div>}
      </div>
    </div>
  );
}
