import React, { useState, useEffect } from 'react';
import { ProfitSettings } from '../types';

interface ProfitSettingsFormProps {
  settings: ProfitSettings;
  onSave: (settings: ProfitSettings) => void;
}

export const ProfitSettingsForm: React.FC<ProfitSettingsFormProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<ProfitSettings>(settings || {
    materialMargin: 30,
    operationMargin: 10,
    subcontractingUnder1000Margin: 30,
    subcontractingUnder5000Margin: 25,
    subcontractingOver5000Margin: 20
  });

  useEffect(() => {
    if (settings) {
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-xl font-bold text-slate-900 uppercase">MOTEUR DE CALCUL - MARGES DE PROFIT (%)</h3>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Marge Matériel (%)</label>
          <input type="number" name="materialMargin" value={formData.materialMargin} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Marge Opérations (%)</label>
          <input type="number" name="operationMargin" value={formData.operationMargin} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Sous-traitance &amp; Achats (&le; 1000$) (%)</label>
          <input type="number" name="subcontractingUnder1000Margin" value={formData.subcontractingUnder1000Margin} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Sous-traitance &amp; Achats (1001$ à 4999$) (%)</label>
          <input type="number" name="subcontractingUnder5000Margin" value={formData.subcontractingUnder5000Margin} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Sous-traitance &amp; Achats (&ge; 5000$) (%)</label>
          <input type="number" name="subcontractingOver5000Margin" value={formData.subcontractingOver5000Margin} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
      </div>
      <div className="mt-4">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Sauvegarder Marges</button>
      </div>
    </form>
  );
}
