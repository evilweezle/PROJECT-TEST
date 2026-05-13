import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserIcon, 
  XIcon, 
  DeleteIcon, 
  MicIcon, 
  ClockIcon, 
  FileTextIcon, 
  SparklesIcon, 
  CheckCircle2Icon, 
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  ClipboardListIcon,
  AlertCircleIcon,
  ShieldCheckIcon
} from 'lucide-react';
import type { Employee, Assignment, WorkOrder, Operation } from '../types';

interface KioskModeProps {
  employees: Employee[];
  assignments: Assignment[];
  workOrders: WorkOrder[];
  operations: Operation[];
  onLogin: (employee: Employee) => void;
  onClose: () => void;
}

export const KioskMode: React.FC<KioskModeProps> = ({ employees, onLogin, onClose }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const verifyCode = (enteredCode: string) => {
    const employee = employees.find(e => e.employeeNumber === enteredCode);
    if (employee) {
      onLogin(employee);
    } else {
      setError(true);
      setTimeout(() => {
        setCode('');
        setError(false);
      }, 1000);
    }
  };

  const handleNumberClick = (num: string) => {
    if (error || code.length >= 3) return;
    const newCode = code + num;
    setCode(newCode);
    if (newCode.length === 3) {
      verifyCode(newCode);
    }
  };

  const handleBackspace = () => {
    if (!error) {
      setCode(prev => prev.slice(0, -1));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-fmi-red p-8 text-center text-white">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
            <UserIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">ACCÈS EMPLOYÉ</h2>
          <p className="text-white/70 font-medium italic">Entrez votre code à 3 chiffres</p>
          <p className="text-[10px] text-white/50 mt-2">Retrouvez votre code dans l'onglet "Employees" du panneau d'administration.</p>
        </div>

        <div className="p-8">
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2].map((i) => (
              <div 
                key={i}
                className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black transition-all ${
                  error ? 'border-red-500 bg-red-50 text-red-600 animate-shake' : 
                  code[i] ? 'border-fmi-red bg-red-50 text-fmi-red' : 'border-slate-100 bg-slate-50 text-slate-300'
                }`}
              >
                {code[i] ? '•' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleNumberClick(num); }}
                onClick={() => handleNumberClick(num)}
                className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-2xl font-black text-slate-700 shadow-sm select-none"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); handleNumberClick('0'); }}
              onClick={() => handleNumberClick('0')}
              className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-2xl font-black text-slate-700 shadow-sm select-none"
            >
              0
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); handleBackspace(); }}
              onClick={handleBackspace}
              className="h-16 rounded-2xl bg-slate-50 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all flex items-center justify-center text-slate-400 shadow-sm select-none"
            >
              <DeleteIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Technologie JARVISS</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const EmployeeDailyView: React.FC<{
  employee: Employee;
  assignments: Assignment[];
  workOrders: WorkOrder[];
  operations: Operation[];
  onLogout: () => void;
  onOpenJarviss: (assignment: Assignment) => void;
  onPunchIn?: (employeeId: string) => void;
  onPunchOut?: (employeeId: string) => void;
  onToggleAssignmentTimer?: (assignmentId: string) => void;
  onCompleteAssignment?: (assignmentId: string, comment?: string, materialQuantity?: number, materialDimensions?: string, returnedToStock?: { dimension: string, location: string }) => void;
}> = ({ employee, assignments, workOrders, operations, onLogout, onOpenJarviss, onPunchIn, onPunchOut, onToggleAssignmentTimer, onCompleteAssignment }) => {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [closingAssignment, setClosingAssignment] = useState<Assignment | null>(null);
  const [closeComment, setCloseComment] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [materialDimensions, setMaterialDimensions] = useState('');
  const [returnedToStock, setReturnedToStock] = useState('');
  const [returnedToStockLoc, setReturnedToStockLoc] = useState('');
  
  const myAssignments = assignments.filter(a => a.employeeIds.includes(employee.id) && a.status !== 'Completed');
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getJobDetails = (a: Assignment) => {
    const wo = workOrders.find(w => w.id === a.workOrderId);
    const op = operations.find(o => o.id === a.operationId);
    const part = wo?.parts.find(p => p.instanceId === a.partInstanceId);
    
    // Estimate retrieval
    let estimate = a.estimatedMinutes || 0;
    if (!estimate && part && op) {
        const partOp = part.operations.find(pop => pop.operationId === op.id);
        if (partOp) estimate = partOp.estimatedTimeMinutes;
    }

    const actual = a.totalActualMinutes || 0;
    const progress = estimate > 0 ? (actual / estimate) * 100 : 0;
    
    // Alert logic
    const isOverBudget = actual >= estimate && estimate > 0;
    const isApproachingBudget = actual >= estimate * 0.75 && actual < estimate && estimate > 0;

    return { wo, op, part, estimate, actual, progress, isOverBudget, isApproachingBudget };
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    const s = Math.floor((mins * 60) % 60);
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-100 z-[100] flex overflow-hidden"
    >
      {/* Sidebar / Left Panel */}
      <div className={`${selectedAssignment ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 bg-white border-r border-slate-200 flex-col shadow-xl animate-in slide-in-from-left duration-500`}>
        <div className="p-8 border-b border-slate-100">
           <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-fmi-red flex items-center justify-center text-white border-4 border-white shadow-lg overflow-hidden">
                   {employee.photo ? <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" /> : <UserIcon className="w-8 h-8" />}
                </div>
                {employee.punchIn && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                   <h2 className="text-xl font-black text-slate-800 tracking-tight">{employee.name}</h2>
                   {employee.isManager && <ShieldCheckIcon className="w-4 h-4 text-indigo-500" title="Manager" />}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{employee.role}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onPunchIn?.(employee.id)}
                disabled={!!employee.punchIn}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase transition-all ${
                  employee.punchIn ? 'bg-slate-50 text-slate-300 border border-slate-100' : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100 active:scale-95'
                }`}
              >
                <PlayIcon className="w-3 h-3" /> Punch In
              </button>
              <button 
                onClick={() => onPunchOut?.(employee.id)}
                disabled={!employee.punchIn}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase transition-all ${
                  !employee.punchIn ? 'bg-slate-50 text-slate-300 border border-slate-100' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 active:scale-95'
                }`}
              >
                <PauseIcon className="w-3 h-3" /> Punch Out
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mes Assignations</h3>
          {myAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
               <ClipboardListIcon className="w-12 h-12 opacity-20 mb-2" />
               <p className="text-sm font-medium">Rien à l'horaire</p>
            </div>
          ) : (
            myAssignments.map((a) => {
              const { wo, op, isOverBudget, isApproachingBudget } = getJobDetails(a);
              const isSelected = selectedAssignment?.id === a.id;
              
              let bgColor = 'bg-white';
              let borderColor = 'border-slate-100';
              let textColor = 'text-slate-600';
              
              if (isSelected) {
                bgColor = 'bg-indigo-600';
                borderColor = 'border-indigo-700';
                textColor = 'text-white';
              } else if (isOverBudget) {
                bgColor = 'bg-red-50';
                borderColor = 'border-red-200';
                textColor = 'text-red-700';
              } else if (isApproachingBudget) {
                bgColor = 'bg-amber-50';
                borderColor = 'border-amber-200';
                textColor = 'text-amber-700';
              }

              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssignment(a)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border shadow-sm ${bgColor} ${borderColor} ${textColor} ${!isSelected && 'hover:bg-slate-50'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-[10px] font-black ${isSelected ? 'text-indigo-200' : (isOverBudget ? 'text-red-500' : (isApproachingBudget ? 'text-amber-500' : 'text-fmi-red'))}`}>
                        {wo?.workOrderNumber}
                    </p>
                    {a.isTimerRunning && (
                        <div className="flex items-center gap-1">
                           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                           <span className="text-[8px] font-black uppercase tracking-widest">Actif</span>
                        </div>
                    )}
                  </div>
                  <h4 className="font-bold tracking-tight">{op?.name}</h4>
                  <p className={`text-xs truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{wo?.name}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
           <div className="flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-2">
                 <ClockIcon className="w-4 h-4" />
                 <span className="text-sm font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <button onClick={onLogout} className="text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest">Déconnexion</button>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${selectedAssignment ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-slate-50 overflow-y-auto`}>
         {selectedAssignment && (
           <button 
             onClick={() => setSelectedAssignment(null)}
             className="lg:hidden p-4 text-fmi-red font-black flex items-center gap-2 border-b border-slate-200 bg-white sticky top-0 z-20"
           >
              <XIcon className="w-4 h-4" /> RETOUR À LA LISTE
           </button>
         )}
         <AnimatePresence mode="wait">
            {!selectedAssignment ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-12 text-center"
              >
                 <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg mb-8 text-slate-200">
                    <UserIcon className="w-16 h-16" />
                 </div>
                 <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-4">Salut {employee.name.split(' ')[0]}!</h2>
                 <p className="text-xl text-slate-400 font-medium italic mb-12">Prêt à dominer la production aujourd'hui?</p>
                 
                 <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left">
                       <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-500">
                          <ClockIcon className="w-6 h-6" />
                       </div>
                       <h3 className="text-lg font-black text-slate-800 mb-1">Temps du jour</h3>
                       <p className="text-sm text-slate-400 font-medium">Tes temps sont enregistrés en temps réel par tâche.</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left">
                       <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-500">
                          <CheckCircle2Icon className="w-6 h-6" />
                       </div>
                       <h3 className="text-lg font-black text-slate-800 mb-1">Objectifs</h3>
                       <p className="text-sm text-slate-400 font-medium">Sélectionne une tâche pour démarrer ton compteur.</p>
                    </div>
                 </div>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedAssignment.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col p-8 overflow-y-auto"
              >
                 <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
                   <div>
                     <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-fmi-red text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                          {getJobDetails(selectedAssignment).wo?.workOrderNumber}
                        </span>
                        <ChevronRightIcon className="w-4 h-4 text-slate-300" />
                        <span className="text-slate-400 text-sm font-bold italic">
                          {getJobDetails(selectedAssignment).wo?.name}
                        </span>
                     </div>
                     <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                        {getJobDetails(selectedAssignment).op?.name}
                     </h2>
                   </div>

                   <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                      <button 
                        onClick={() => onToggleAssignmentTimer?.(selectedAssignment.id)}
                        className={`flex-1 lg:flex-none flex items-center gap-3 px-8 lg:px-12 py-5 rounded-3xl font-black shadow-xl transition-all active:scale-95 border-b-4 ${
                            selectedAssignment.isTimerRunning 
                            ? 'bg-amber-500 text-white border-amber-700 hover:bg-amber-600' 
                            : 'bg-green-600 text-white border-green-800 hover:bg-green-700'
                        }`}
                      >
                        {selectedAssignment.isTimerRunning ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                        <div className="text-left">
                           <p className="text-[10px] opacity-70 uppercase tracking-widest">{selectedAssignment.isTimerRunning ? 'Arrêter' : 'Démarrer'}</p>
                           <p className="text-xl uppercase">{selectedAssignment.isTimerRunning ? 'PAUSE' : 'DEBUT'}</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => onOpenJarviss(selectedAssignment)}
                        className="flex-1 lg:flex-none flex items-center gap-3 px-8 lg:px-10 py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl border-b-4 border-indigo-800 hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        <MicIcon className="w-8 h-8" />
                        <div className="text-left">
                           <p className="text-[10px] opacity-70 uppercase tracking-widest">Appeler</p>
                           <p className="text-xl">JARVISS</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => setClosingAssignment(selectedAssignment)}
                        className="flex-1 lg:flex-none flex items-center gap-3 px-8 py-5 bg-white text-slate-800 border-2 border-slate-200 border-b-4 rounded-3xl font-black shadow-lg hover:bg-slate-50 transition-all active:scale-95"
                      >
                        <CheckCircle2Icon className="w-8 h-8 text-green-500" />
                        <span>FINIR JOB</span>
                      </button>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Documentation Section */}
                    <div className="lg:col-span-8 space-y-8">
                       {/* Real-time stats header */}
                       <div className="grid grid-cols-3 gap-4">
                          <div className={`p-6 rounded-3xl border-2 flex flex-col ${getJobDetails(selectedAssignment).isOverBudget ? 'bg-red-50 border-red-100' : (getJobDetails(selectedAssignment).isApproachingBudget ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100')}`}>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Temps Écoulé</p>
                             <h4 className={`text-2xl font-black ${getJobDetails(selectedAssignment).isOverBudget ? 'text-red-600' : (getJobDetails(selectedAssignment).isApproachingBudget ? 'text-amber-600' : 'text-slate-800')}`}>
                                {formatMinutes(getJobDetails(selectedAssignment).actual)}
                             </h4>
                          </div>
                          <div className="p-6 rounded-3xl bg-white border-2 border-slate-100 flex flex-col">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Temps Éstimé</p>
                             <h4 className="text-2xl font-black text-slate-800">
                                {formatMinutes(getJobDetails(selectedAssignment).estimate)}
                             </h4>
                          </div>
                          <div className="p-6 rounded-3xl bg-white border-2 border-slate-100 flex flex-col relative overflow-hidden">
                             <div className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${getJobDetails(selectedAssignment).isOverBudget ? 'bg-red-500' : (getJobDetails(selectedAssignment).isApproachingBudget ? 'bg-amber-200' : 'bg-green-500')}`} style={{ width: `${Math.min(100, getJobDetails(selectedAssignment).progress)}%` }} />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance</p>
                             <h4 className={`text-2xl font-black ${getJobDetails(selectedAssignment).isOverBudget ? 'text-red-500' : (getJobDetails(selectedAssignment).isApproachingBudget ? 'text-amber-500' : 'text-green-600')}`}>
                                {getJobDetails(selectedAssignment).progress.toFixed(0)}%
                             </h4>
                          </div>
                       </div>

                       <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px] lg:min-h-[500px] flex flex-col">
                          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-blue-50 rounded-xl text-blue-500">
                                  <FileTextIcon className="w-5 h-5" />
                               </div>
                               <h3 className="text-lg font-black text-slate-800">Dessin & Documentation</h3>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">PDF - Page 1 de 3</span>
                          </div>
                          <div className="flex-1 bg-slate-200 flex items-center justify-center p-4 lg:p-12">
                             {/* MOCK PDF VIEWER */}
                             <div className="w-full h-full bg-white shadow-2xl rounded-lg border border-slate-300 flex flex-col">
                                <div className="h-12 border-b border-slate-200 bg-slate-50 flex items-center px-4 gap-4">
                                   <div className="w-4 h-4 rounded-full bg-slate-200" />
                                   <div className="w-20 h-2 bg-slate-200 rounded" />
                                   <div className="flex-1" />
                                   <div className="flex gap-2">
                                      {[1,2,3].map(i => <div key={i} className="w-4 h-4 bg-slate-200 rounded" />)}
                                   </div>
                                </div>
                                <div className="flex-1 p-8 overflow-hidden">
                                   {/* Content */}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Right Panel: Tasks and Suggestions */}
                    <div className="lg:col-span-4 space-y-6">
                       {getJobDetails(selectedAssignment).isOverBudget && (
                         <div className="bg-red-600 rounded-3xl p-6 text-white shadow-xl shadow-red-200 animate-pulse">
                            <div className="flex items-center gap-3 mb-2">
                               <AlertCircleIcon className="w-6 h-6" />
                               <h4 className="font-black text-xl">ALERTE DÉPASSEMENT</h4>
                            </div>
                            <p className="text-sm font-medium italic opacity-90">Attention, tu as dépassé l'estimé prévu de {formatMinutes(getJobDetails(selectedAssignment).actual - getJobDetails(selectedAssignment).estimate)}.</p>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest bg-white/20 p-2 rounded-xl text-center">Jarviss va documenter la raison</p>
                         </div>
                       )}

                       <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
                          <div className="flex items-center gap-2 mb-6">
                             <SparklesIcon className="w-4 h-4 text-indigo-500" />
                             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Suggestions JARVISS</h3>
                          </div>
                          
                          <div className="space-y-4 relative">
                             {(employee.aiSuggestions?.length && employee.aiSuggestions.length > 0 ? employee.aiSuggestions : ["Manque de données pour vous conseiller, prenez l'habitude de commenter vos fermeture de jobs!"]).map((s, i) => (
                               <div key={i} className="flex gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                                  <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100">
                                     {i + 1}
                                  </div>
                                  <p className="text-xs font-semibold text-indigo-900 leading-relaxed italic">"{s}"</p>
                               </div>
                             ))}
                          </div>
                       </div>
                       
                       <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                          <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Détails de l'assignation</p>
                             <div className="flex items-center gap-2">
                                <ClockIcon className="w-3 h-3 text-slate-400" />
                                <span className="text-xs font-bold text-slate-700">Démarré le: {selectedAssignment.startTime ? new Date(selectedAssignment.startTime).toLocaleDateString() : 'Aujourd\'hui'}</span>
                             </div>
                             <div className="flex items-center gap-2 mt-1">
                                <UserIcon className="w-3 h-3 text-slate-400" />
                                <span className="text-xs font-bold text-slate-700">Collaborateurs: {selectedAssignment.employeeIds.length}</span>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-6">
                             <AlertCircleIcon className="w-4 h-4 text-red-500" />
                             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Points de Vigilance</h3>
                          </div>
                          <ul className="space-y-3">
                             {["Finition grain 120 requise", "Éviter les bavures sur le bord A", "Validation première pièce par chef"].map((v, i) => (
                               <li key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{v}</span>
                                </li>
                             ))}
                          </ul>
                       </div>

                       <div className="bg-fmi-red rounded-3xl shadow-xl p-8 text-white relative overflow-hidden group">
                          <div className="absolute inset-0 bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                          <MicIcon className="w-20 h-20 absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform" />
                          <h4 className="text-2xl font-black mb-2 relative">Tu as fini?</h4>
                          <p className="text-sm text-white/70 mb-6 font-medium relative italic">Parle à Jarviss pour rapporter tes commentaires et fermer ta job.</p>
                          <button 
                            onClick={() => onOpenJarviss(selectedAssignment)}
                            className="w-full py-4 bg-white text-fmi-red rounded-2xl font-black shadow-lg hover:bg-slate-50 transition-all active:scale-95 relative"
                          >
                            DISCUTER AVEC JARVISS
                          </button>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}
         </AnimatePresence>
      </div>

      <AnimatePresence>
        {closingAssignment && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8"
            >
              <h3 className="text-xl font-black text-slate-800 mb-2">Fermeture de la tâche</h3>
              <p className="text-sm text-slate-500 mb-6">Avez-vous des commentaires ou incidents à signaler pour cette opération ? Ces notes aideront Jarviss à formuler de meilleurs conseils pour la suite.</p>
              
              <textarea 
                value={closeComment}
                onChange={e => setCloseComment(e.target.value)}
                placeholder="Ex: 'Difficulté avec le retrait laser', 'Le pliage a craqué', 'Outil manquant'..."
                className="w-full p-4 border-2 border-slate-200 rounded-xl min-h-[100px] mb-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all resize-none text-slate-700"
              />

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-800">Consommation Matériel (Optionnel)</h4>
                {closingAssignment && getJobDetails(closingAssignment).op?.name?.toLowerCase().match(/coupe|usinage|laser|scie|cut|machin/i) && (
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheckIcon className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-600">Opération de coupe détectée : Saisissez les chutes</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantité (ex: Feuilles/Barres)</label>
                    <input 
                      type="number" 
                      value={materialQuantity}
                      onChange={e => setMaterialQuantity(e.target.value)}
                      placeholder="Ex: 2"
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Dimensions utilisées (Pouces/Pi, Réelles)</label>
                    <input 
                      type="text" 
                      value={materialDimensions}
                      onChange={e => setMaterialDimensions(e.target.value)}
                      placeholder="Ex: 48x96 ou 120"
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                {closingAssignment && getJobDetails(closingAssignment).op?.name?.toLowerCase().match(/coupe|usinage|laser|scie|cut|machin/i) && (
                  <div className="mt-2 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ce qui est remis en stock (Chute)</label>
                      <input 
                        type="text" 
                        value={returnedToStock}
                        onChange={e => setReturnedToStock(e.target.value)}
                        placeholder="Ex: 24x96"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Localisation de la chute</label>
                      <input 
                        type="text" 
                        value={returnedToStockLoc}
                        onChange={e => setReturnedToStockLoc(e.target.value)}
                        placeholder="Ex: Rack A-04"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setClosingAssignment(null);
                    setCloseComment('');
                    setMaterialQuantity('');
                    setMaterialDimensions('');
                    setReturnedToStock('');
                    setReturnedToStockLoc('');
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                >
                  ANNULER
                </button>
                <button 
                  onClick={() => {
                    if (closingAssignment) {
                      onCompleteAssignment?.(
                        closingAssignment.id, 
                        closeComment, 
                        materialQuantity ? parseInt(materialQuantity, 10) : undefined, 
                        materialDimensions,
                        returnedToStock ? { dimension: returnedToStock, location: returnedToStockLoc } : undefined
                      );
                      setClosingAssignment(null);
                      setCloseComment('');
                      setMaterialQuantity('');
                      setMaterialDimensions('');
                      setReturnedToStock('');
                      setReturnedToStockLoc('');
                    }
                  }}
                  className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors"
                >
                  CONFIRMER
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
