import React, { useState } from 'react';
import { BendingSettings, BendingFactor, Operation } from '../types';
import { ChevronDownIcon, ChevronRightIcon } from './icons';
import { motion, AnimatePresence } from 'motion/react';

interface BendingSettingsFormProps {
  settings: BendingSettings;
  operations: Operation[];
  onSave: (settings: BendingSettings) => void;
}

export const BendingSettingsForm: React.FC<BendingSettingsFormProps> = ({ settings, operations, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'instructions'>('params');
  const [activeTip, setActiveTip] = useState<string | null>(null);

  const bendingOpRate = operations.find(o => o.name.toLowerCase().includes('pli') || o.name.toLowerCase().includes('bend'))?.rate || settings.hourlyRate || 0;

  const [localSettings, setLocalSettings] = useState<BendingSettings>({
    hourlyRate: bendingOpRate,
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

  const tips: Record<string, string> = {
    hourlyRate: "Défini dans la table des opérations. Taux de base appliqué pour le temps de pliage machine.",
    rateWithSecondOperator: "Taux horaire utilisé lorsque le système détermine qu'un 2e opérateur est nécessaire (selon les facteurs).",
    timePerBend: "Temps alloué (en minutes) pour chaque pli de la pièce.",
    timePerFlip: "Temps alloué pour retourner la pièce pendant le processus.",
    setupTimePerSetup: "Temps préparatoire alloué pour chaque configuration (setup) différente requise.",
    neopreneTimePerBend: "Temps supplémentaire ajouté à chaque pli si l'option Néoprène est activée.",
    timePerReverse: "Temps alloué pour chaque inversion de pli définie sur la pièce.",
    weightMin: "Poids minimum (en Lbs) à partir duquel ce facteur s'applique.",
    weightFactor: "Multiplicateur appliqué au temps de base si le poids de la pièce dépasse le minimum (Ex: 1.5 = 50% de temps en plus).",
    sizeMin: "Surface minimum (en pouces carrés) à partir de laquelle ce facteur s'applique.",
    sizeFactor: "Multiplicateur appliqué au temps de base si la surface de la pièce dépasse le minimum défini."
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
            <div className="border-t border-slate-100 flex overflow-x-auto bg-slate-50/50">
              <button 
                onClick={() => setActiveTab('params')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'params' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Paramètres
              </button>
              <button 
                onClick={() => setActiveTab('instructions')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'instructions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Instructions de calcul
              </button>
            </div>

            {activeTab === 'params' ? (
              <div className="p-6 space-y-8 border-t border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Paramètres de Temps et Taux</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire ($/hr)</label>
                    <input type="number" readOnly value={bendingOpRate} 
                           onFocus={() => setActiveTip(tips.hourlyRate)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm bg-slate-100 text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire 2e op ($/hr)</label>
                    <input type="number" value={localSettings.rateWithSecondOperator} 
                           onChange={e => handleChange('rateWithSecondOperator', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.rateWithSecondOperator)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps par pli (min)</label>
                    <input type="number" value={localSettings.timePerBend} 
                           onChange={e => handleChange('timePerBend', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.timePerBend)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps par Flip (min)</label>
                    <input type="number" value={localSettings.timePerFlip} 
                           onChange={e => handleChange('timePerFlip', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.timePerFlip)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps Setup (min)</label>
                    <input type="number" value={localSettings.setupTimePerSetup} 
                           onChange={e => handleChange('setupTimePerSetup', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.setupTimePerSetup)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps Néoprène (min)</label>
                    <input type="number" value={localSettings.neopreneTimePerBend} 
                           onChange={e => handleChange('neopreneTimePerBend', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.neopreneTimePerBend)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps par Reverse (min)</label>
                    <input type="number" value={localSettings.timePerReverse} 
                           onChange={e => handleChange('timePerReverse', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.timePerReverse)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
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
                          <input type="number" value={f.min} 
                                 onChange={e => handleFactorChange('weight', i, 'min', parseFloat(e.target.value))} 
                                 onFocus={() => setActiveTip(tips.weightMin)}
                                 onBlur={() => setActiveTip(null)}
                                 className="block w-full rounded border-slate-300 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Facteur</label>
                          <input type="number" value={f.factor} 
                                 onChange={e => handleFactorChange('weight', i, 'factor', parseFloat(e.target.value))} 
                                 onFocus={() => setActiveTip(tips.weightFactor)}
                                 onBlur={() => setActiveTip(null)}
                                 className="block w-full rounded border-slate-300 text-sm" />
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
                          <input type="number" value={f.min} 
                                 onChange={e => handleFactorChange('size', i, 'min', parseFloat(e.target.value))} 
                                 onFocus={() => setActiveTip(tips.sizeMin)}
                                 onBlur={() => setActiveTip(null)}
                                 className="block w-full rounded border-slate-300 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Facteur</label>
                          <input type="number" value={f.factor} 
                                 onChange={e => handleFactorChange('size', i, 'factor', parseFloat(e.target.value))} 
                                 onFocus={() => setActiveTip(tips.sizeFactor)}
                                 onBlur={() => setActiveTip(null)}
                                 className="block w-full rounded border-slate-300 text-sm" />
                        </div>
                        <button onClick={() => removeFactor('size', i)} className="text-red-500 hover:text-red-600">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <button 
                  onClick={() => onSave({ ...localSettings, hourlyRate: bendingOpRate })} 
                  className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                >
                  Enregistrer les paramètres
                </button>
                
                <AnimatePresence>
                  {activeTip && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-lg shadow-sm flex-1 flex items-start gap-2"
                    >
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{activeTip}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            ) : (
                <div className="p-6 bg-slate-50 text-slate-800 text-sm">
                    <h4 className="font-bold uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Logique de Calcul (Pliage)</h4>
                    
                    <div className="space-y-4 font-mono text-xs">
                        <section>
                            <div className="font-bold text-slate-600 mb-1">1. Calcul des multiplicateurs factoriels</div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p>// On trouve le facteur de poids le plus élevé applicable</p>
                                <p>facteurPoids = weightFactors.findLast(f =&#62; piece.poids {'>'}= f.min)?.factor || 1</p>
                                <br/>
                                <p>// On trouve le facteur de dimension (surface) le plus élevé</p>
                                <p>facteurTaille = sizeFactors.findLast(f =&#62; piece.surface {'>'}= f.min)?.factor || 1</p>
                                <br/>
                                <p>facteurTotal = facteurPoids * facteurTaille</p>
                            </div>
                        </section>
                        
                        <section>
                            <div className="font-bold text-slate-600 mb-1">2. Temps par unité</div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p>tempsPlis = nombreDePlis * timePerBend</p>
                                <p>tempsNéoprène = useNeoprene ? (nombreDePlis * neopreneTimePerBend) : 0</p>
                                <p>tempsReverses = nombreDeReverses * timePerReverse</p>
                                <p>tempsFlips = tempsPlis * timePerFlip</p>
                                <br/>
                                <p>tempsOpeTotal = (tempsPlis + tempsNéoprène + tempsReverses + tempsFlips) * facteurTotal</p>
                            </div>
                        </section>

                        <section>
                            <div className="font-bold text-slate-600 mb-1">3. Taux appliqués</div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p>tauxHoraire = (facteurPoids {'>'} 2 || facteurTaille {'>'} 2) ? rateWithSecondOperator : hourlyRate</p>
                                <br/>
                                <p>coutMachine = (tempsOpeTotal / 60) * tauxHoraire</p>
                                <p>coutSetup = (setupTimePerSetup * numberOfSetups / 60) * tauxHoraire</p>
                                <br/>
                                <p>coutTotal = coutMachine + coutSetup</p>
                            </div>
                        </section>
                    </div>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
