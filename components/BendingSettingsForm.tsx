import React, { useState } from 'react';
import { BendingSettings, BendingFactor } from '../types';
import { ChevronDownIcon, ChevronRightIcon } from './icons';
import { motion, AnimatePresence } from 'motion/react';

interface BendingSettingsFormProps {
  settings: BendingSettings;
  onSave: (settings: BendingSettings) => void;
}

export const BendingSettingsForm: React.FC<BendingSettingsFormProps> = ({ settings, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<BendingSettings>({
    hourlyRate: settings.hourlyRate ?? 0,
    rateWithSecondOperator: settings.rateWithSecondOperator ?? 0,
    timePerBend: settings.timePerBend ?? 0,
    timePerFlip: settings.timePerFlip ?? 0,
    setupTimePerSetup: settings.setupTimePerSetup ?? 0,
    neopreneTimePerBend: settings.neopreneTimePerBend ?? 0,
    timePerReverse: settings.timePerReverse ?? 0,
    weightFactors: settings.weightFactors ?? [],
    sizeFactors: settings.sizeFactors ?? [],
  });

  const handleChange = (field: keyof BendingSettings, value: number | BendingFactor[]) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleFactorChange = (type: 'weight' | 'size', index: number, field: keyof BendingFactor, value: number) => {
    const factors = type === 'weight' ? [...localSettings.weightFactors] : [...localSettings.sizeFactors];
    factors[index] = { ...factors[index], [field]: value };
    handleChange(type === 'weight' ? 'weightFactors' : 'sizeFactors', factors);
  };

  const addFactor = (type: 'weight' | 'size') => {
    const factors = type === 'weight' ? [...localSettings.weightFactors] : [...localSettings.sizeFactors];
    factors.push({ min: 0, factor: 1 });
    handleChange(type === 'weight' ? 'weightFactors' : 'sizeFactors', factors);
  };

  const removeFactor = (type: 'weight' | 'size', index: number) => {
    const factors = type === 'weight' ? [...localSettings.weightFactors] : [...localSettings.sizeFactors];
    factors.splice(index, 1);
    handleChange(type === 'weight' ? 'weightFactors' : 'sizeFactors', factors);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors text-left"
      >
        <h3 className="text-xl font-bold text-slate-900">MOTEUR DE CALCUL - PLIAGE</h3>
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
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Paramètres de Temps et Taux</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire ($/hr)</label>
                    <input type="number" value={localSettings.hourlyRate} onChange={e => handleChange('hourlyRate', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire 2e op ($/hr)</label>
                    <input type="number" value={localSettings.rateWithSecondOperator} onChange={e => handleChange('rateWithSecondOperator', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps par pli (min)</label>
                    <input type="number" value={localSettings.timePerBend} onChange={e => handleChange('timePerBend', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps par Flip (min)</label>
                    <input type="number" value={localSettings.timePerFlip} onChange={e => handleChange('timePerFlip', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps Setup (min)</label>
                    <input type="number" value={localSettings.setupTimePerSetup} onChange={e => handleChange('setupTimePerSetup', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps Néoprène (min)</label>
                    <input type="number" value={localSettings.neopreneTimePerBend} onChange={e => handleChange('neopreneTimePerBend', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps par Reverse (min)</label>
                    <input type="number" value={localSettings.timePerReverse} onChange={e => handleChange('timePerReverse', parseFloat(e.target.value))} className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Facteurs de Poids</h4>
                    <button onClick={() => addFactor('weight')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Ajouter</button>
                  </div>
                  <div className="space-y-3">
                    {localSettings.weightFactors.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Min Lbs</label>
                          <input type="number" value={f.min} onChange={e => handleFactorChange('weight', i, 'min', parseFloat(e.target.value))} className="block w-full rounded border-slate-300 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Facteur</label>
                          <input type="number" value={f.factor} onChange={e => handleFactorChange('weight', i, 'factor', parseFloat(e.target.value))} className="block w-full rounded border-slate-300 text-sm" />
                        </div>
                        <button onClick={() => removeFactor('weight', i)} className="text-red-500 hover:text-red-600">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Facteurs de Taille (Area)</h4>
                    <button onClick={() => addFactor('size')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Ajouter</button>
                  </div>
                  <div className="space-y-3">
                    {localSettings.sizeFactors.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Min SqIn</label>
                          <input type="number" value={f.min} onChange={e => handleFactorChange('size', i, 'min', parseFloat(e.target.value))} className="block w-full rounded border-slate-300 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Facteur</label>
                          <input type="number" value={f.factor} onChange={e => handleFactorChange('size', i, 'factor', parseFloat(e.target.value))} className="block w-full rounded border-slate-300 text-sm" />
                        </div>
                        <button onClick={() => removeFactor('size', i)} className="text-red-500 hover:text-red-600">×</button>
                      </div>
                    ))}
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
