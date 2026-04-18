import React, { useState } from 'react';
import { LaserSettings } from '../types';
import { ChevronDownIcon, ChevronRightIcon } from './icons';
import { motion, AnimatePresence } from 'motion/react';

interface LaserSettingsFormProps {
  settings: LaserSettings;
  onSave: (settings: LaserSettings) => void;
}

export const LaserSettingsForm: React.FC<LaserSettingsFormProps> = ({ settings, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<LaserSettings>({
    machineHourlyRate: settings.machineHourlyRate ?? 0,
    setupHourlyRate: settings.setupHourlyRate ?? 0,
    electricityCostPerkW: settings.electricityCostPerkW ?? 0,
    gasConsumption6kW: settings.gasConsumption6kW ?? 0,
    gasConsumption12kW: settings.gasConsumption12kW ?? 0,
    costPerPierce: settings.costPerPierce ?? 0,
    sheetChangeTimeMinutes: settings.sheetChangeTimeMinutes ?? 0,
    sheetChangeHourlyRate: settings.sheetChangeHourlyRate ?? 0,
  });

  const handleChange = (field: keyof LaserSettings, value: number) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors text-left"
      >
        <h3 className="text-xl font-bold text-slate-900 uppercase">MOTEUR DE CALCUL - LASER PLAQUE</h3>
        {isOpen ? (
          <ChevronDownIcon className="w-6 h-6 text-slate-500" />
        ) : (
          <ChevronRightIcon className="w-6 h-6 text-slate-500" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-6 pt-0 space-y-8 border-t border-slate-100">
              <div className="mt-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Paramètres de Taux et Coûts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire machine ($/hr)</label>
                    <input type="number" value={localSettings.machineHourlyRate} onChange={e => handleChange('machineHourlyRate', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire setup ($/hr)</label>
                    <input type="number" value={localSettings.setupHourlyRate} onChange={e => handleChange('setupHourlyRate', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coût électricité ($/kW)</label>
                    <input type="number" step="0.01" value={localSettings.electricityCostPerkW} onChange={e => handleChange('electricityCostPerkW', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Consommation gaz 6kW ($/hr)</label>
                    <input type="number" value={localSettings.gasConsumption6kW} onChange={e => handleChange('gasConsumption6kW', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Consommation gaz 12kW ($/hr)</label>
                    <input type="number" value={localSettings.gasConsumption12kW} onChange={e => handleChange('gasConsumption12kW', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coût par perçage ($)</label>
                    <input type="number" step="0.01" value={localSettings.costPerPierce} onChange={e => handleChange('costPerPierce', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps changement feuille (min)</label>
                    <input type="number" value={localSettings.sheetChangeTimeMinutes} onChange={e => handleChange('sheetChangeTimeMinutes', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux changement feuille ($/hr)</label>
                    <input type="number" value={localSettings.sheetChangeHourlyRate} onChange={e => handleChange('sheetChangeHourlyRate', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <button 
                  onClick={() => onSave(localSettings)} 
                  className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  Enregistrer les paramètres
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
