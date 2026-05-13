import React, { useMemo, useState } from 'react';
import type { WorkOrder, Client, Operation, WorkOrderPart, Employee, Assignment, Material, JobStatus } from '../types';
import { PrinterIcon, ClipboardListIcon, MessageSquareIcon, SparklesIcon, UserIcon } from './icons';

interface WorkOrderDetailsViewProps {
  workOrder: WorkOrder;
  clients: Client[];
  materials: Material[];
  operations: Operation[];
  employees: Employee[];
  assignments: Assignment[];
  updateAssignment: (workOrderId: string, partInstanceId: string | string[], operationId: string, employeeIds: string[], scheduledDate?: string, status?: JobStatus, splitId?: string) => void;
  updateOperationAssignment: (workOrderId: string, operationId: string, employeeIds: string[], scheduledDate?: string) => void;
  onAddDeliveryNote?: (workOrderId: string) => void;
  onAddInvoice?: (workOrderId: string) => void;
}

export const WorkOrderDetailsView: React.FC<WorkOrderDetailsViewProps> = ({ 
  workOrder, clients, materials, operations, employees, assignments, 
  updateAssignment, updateOperationAssignment, onAddDeliveryNote, onAddInvoice 
}) => {
  const [activeTab, setActiveTab] = useState<'planning' | 'post-fab'>('planning');
  const client = clients.find(c => c.id === workOrder.clientId);

  const operationsWithParts = useMemo(() => {
    const opMap = new Map<string, { operation: Operation; parts: WorkOrderPart[]; totalTime: number }>();

    (workOrder.parts || []).forEach(part => {
      (part.operations || []).forEach(partOp => {
        const opId = partOp.operationId;
        if (!opMap.has(opId)) {
          const operationDetails = operations.find(o => o.id === opId);
          if (operationDetails) {
            opMap.set(opId, { operation: operationDetails, parts: [], totalTime: 0 });
          }
        }
        const entry = opMap.get(opId);
        if (entry) {
            entry.parts.push(part);
            entry.totalTime += partOp.estimatedTimeMinutes;
        }
      });
    });

    // FIX: Explicitly type `allOpIdsInOrder` as string[] to fix type inference issue with flatMap.
    const allOpIdsInOrder: string[] = (workOrder.parts || []).flatMap(p => (p.operations || []).map(op => op.operationId));
    const uniqueOpIds = [...new Set(allOpIdsInOrder)];
    
    return uniqueOpIds.map(opId => opMap.get(opId)).filter((item): item is { operation: Operation; parts: WorkOrderPart[]; totalTime: number } => !!item);

  }, [workOrder, operations]);
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="no-print bg-white p-4 border-b border-slate-200 flex gap-4">
        <button
          onClick={() => setActiveTab('planning')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'planning' ? 'bg-fmi-red text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ClipboardListIcon className="w-4 h-4" />
          Planning & Détails
        </button>
        <button
          onClick={() => setActiveTab('post-fab')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'post-fab' ? 'bg-fmi-red text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          Gestion Post Fabrication
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'planning' ? (
          <div className="printable-area p-4 text-slate-800 bg-white shadow-sm rounded-b-xl mx-4 my-2">
            <header className="border-b-2 border-slate-800 pb-4 mb-6">
              <h1 className="text-3xl font-bold">{workOrder.name}</h1>
              <div className="flex justify-between mt-2 text-sm">
                <div>
                  <span className="font-semibold">Client: </span>
                  <span>{client?.name || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <div>
                    <span className="font-semibold">Start Date: </span>
                    <span>{new Date(workOrder.startDate + 'T00:00:00').toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Finish Date: </span>
                    <span>{new Date(workOrder.finishDate + 'T00:00:00').toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </header>
            
            <main className="space-y-8">
              {operationsWithParts.map(({ operation, parts, totalTime }) => {
                const filteredEmployees = employees.filter(emp => 
                  !operation.requiredSkillId || (emp.skills || []).some(s => s.skillId === operation.requiredSkillId)
                );

                const firstPart = parts[0];
                const firstAssignment = assignments.find(a => 
                  a.workOrderId === workOrder.id && 
                  a.partInstanceId === firstPart.instanceId && 
                  a.operationId === operation.id
                );

                const isCommonAssignment = parts.every(p => {
                  const a = assignments.find(as => 
                    as.workOrderId === workOrder.id && 
                    as.partInstanceId === p.instanceId && 
                    as.operationId === operation.id
                  );
                  return JSON.stringify(a?.employeeIds || []) === JSON.stringify(firstAssignment?.employeeIds || []) &&
                         a?.scheduledDate === firstAssignment?.scheduledDate;
                });

                return (
                  <div key={operation.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                             {operation.name.charAt(0)}
                          </span>
                          Operation: {workOrder.name}-{operation.name}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium ml-10">
                          Total Temps Estimé: {Math.floor(totalTime / 60)}h {totalTime % 60}m
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-4 no-print bg-white p-3 rounded-xl border border-slate-200 w-full md:w-auto">
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Date Planifiée</label>
                          <input 
                            type="date" 
                            className="block w-full text-xs border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={isCommonAssignment ? firstAssignment?.scheduledDate || '' : ''}
                            onChange={(e) => updateOperationAssignment(workOrder.id, operation.id, isCommonAssignment ? firstAssignment?.employeeIds || [] : [], e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Assignation ({operation.requiredSkillId ? 'Compétence Requise' : 'Libre'})</label>
                          <select
                            multiple
                            className="block w-full text-xs border-slate-200 rounded-lg h-16 focus:ring-blue-500 focus:border-blue-500"
                            value={isCommonAssignment ? firstAssignment?.employeeIds || [] : []}
                            onChange={(e) => {
                              const selectedIds = Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value);
                              updateOperationAssignment(workOrder.id, operation.id, selectedIds, isCommonAssignment ? firstAssignment?.scheduledDate : undefined);
                            }}
                          >
                            {filteredEmployees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <ul className="divide-y divide-slate-100 bg-white">
                      {(() => {
                        const groupedParts = Array.from(parts.reduce((acc, p) => {
                          const key = `${p.id}-${JSON.stringify((p.partDependencies || []).sort())}`;
                          if (!acc.has(key)) {
                            acc.set(key, { 
                              ...p, 
                              totalQuantity: 0, 
                              instanceIds: [] 
                            });
                          }
                          const group = acc.get(key);
                          if (group) {
                            group.totalQuantity += (p.quantity || 1);
                            group.instanceIds.push(p.instanceId);
                          }
                          return acc;
                        }, new Map<string, WorkOrderPart & { totalQuantity: number; instanceIds: string[] } >()).values());

                        return groupedParts.map(group => {
                          const material = materials.find(m => m.id === group.materialId);
                          const partOp = group.operations.find(o => o.operationId === operation.id);
                          
                          const completedQty = group.instanceIds.reduce((sum, instanceId) => {
                            const a = assignments.find(as => 
                              as.workOrderId === workOrder.id && 
                              as.partInstanceId === instanceId && 
                              as.operationId === operation.id
                            );
                            return sum + (a?.status === 'Completed' ? 1 : 0);
                          }, 0);

                          const progress = (completedQty / group.totalQuantity) * 100;

                          const assignment = assignments.find(a => 
                            a.workOrderId === workOrder.id && 
                            a.partInstanceId === group.instanceIds[0] && 
                            a.operationId === operation.id
                          );

                          return (
                            <li key={group.instanceIds[0]} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                <div className="flex-1 w-full opacity-90">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <p className="font-bold text-slate-900">{group.name}</p>
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${progress === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {completedQty}/{group.totalQuantity} Complétés
                                      </span>
                                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase">
                                        {partOp?.estimatedTimeMinutes} min/u
                                      </span>
                                    </div>
                                    
                                    <div className="mt-3 w-full max-w-sm">
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Progression</span>
                                        <span className="text-[10px] font-black text-slate-600 tracking-widest">{Math.round(progress)}%</span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div 
                                          className={`h-full transition-all duration-1000 ease-out-expo ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                    </div>

                                    <p className="text-slate-400 text-[10px] mt-2 font-medium uppercase tracking-tight">
                                      Matériel: {material?.description || 'N/A'}
                                    </p>
                                </div>
                                
                                <div className="flex gap-4 no-print bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="w-32">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Date</label>
                                    <input 
                                      type="date" 
                                      className="block w-full text-[10px] border-slate-200 rounded-lg p-1 font-bold"
                                      value={assignment?.scheduledDate || ''}
                                      onChange={(e) => updateAssignment(workOrder.id, group.instanceIds, operation.id, assignment?.employeeIds || [], e.target.value)}
                                    />
                                  </div>
                                  <div className="w-48">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Assignation Individuelle</label>
                                    <select
                                      multiple
                                      className="block w-full text-[10px] border-slate-200 rounded-lg h-12 p-1 font-bold"
                                      value={assignment?.employeeIds || []}
                                      onChange={(e) => {
                                        const selectedIds = Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value);
                                        updateAssignment(workOrder.id, group.instanceIds, operation.id, selectedIds, assignment?.scheduledDate);
                                      }}
                                    >
                                      {filteredEmployees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  </div>
                );
              })}
            </main>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-fmi-red flex items-center justify-center text-white shadow-lg shadow-fmi-red/20">
                  <SparklesIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Analyse Post-Fabrication</h2>
                  <p className="text-sm text-slate-500">Retours employés et analyse critique JARVISS</p>
                </div>
              </div>

              {/* Jarviss Recommendation Section */}
              <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 mb-8">
                 <div className="flex items-center gap-2 mb-3">
                   <SparklesIcon className="w-4 h-4 text-blue-500" />
                   <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest">Analyse IA Jarviss</h3>
                 </div>
                 <div className="p-4 bg-white rounded-xl border border-blue-100 text-sm text-slate-700 leading-relaxed shadow-sm italic">
                   {workOrder.aiPostFabAnalysis || "Jarviss analyse actuellement les données de fabrication pour ce bon de travail. Les suggestions apparaîtront ici une fois les opérations terminées."}
                 </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">Commentaires et Feedback Shopfloor</h3>
                
                {(workOrder.parts || []).some(p => p.productionFeedback && p.productionFeedback.length > 0) ? (
                  <div className="grid gap-4">
                    {(workOrder.parts || []).map(part => (
                      (part.productionFeedback || []).map((feedback, idx) => {
                        const employee = employees.find(e => e.id === feedback.employeeId);
                        const operation = operations.find(o => o.id === feedback.operationId);
                        return (
                          <div key={`${part.id}-${idx}`} className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-fmi-red/30 transition-all hover:shadow-md">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 overflow-hidden">
                                  {employee?.photo ? <img src={employee.photo} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{employee?.name || "Employé inconnu"}</p>
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                                    {operation?.name} • {part.name}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                {new Date(feedback.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="ml-13 pl-1 border-l-2 border-slate-100">
                               <p className="text-sm text-slate-700 leading-relaxed">{feedback.comment}</p>
                            </div>
                            
                            {/* JARVISS INSIGHT ON SPECIFIC COMMENT */}
                            <div className="mt-3 ml-13 flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-lg border border-blue-100">
                               <SparklesIcon className="w-3 h-3" />
                               Analyse JARVISS: Point critique identifié
                            </div>
                          </div>
                        );
                      })
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <MessageSquareIcon className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">Aucun feedback enregistré</p>
                    <p className="text-slate-400 text-xs text-center max-w-[250px] mt-1">L'assistant JARVISS collectera les retours des opérateurs sur le plancher de production.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-auto p-4 flex justify-between items-center no-print bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex gap-2">
          {onAddDeliveryNote && (
            <button
              onClick={() => onAddDeliveryNote(workOrder.id)}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-sm transition-all active:scale-95"
            >
              Convertir en BDL
            </button>
          )}
          {onAddInvoice && (
            <button
              onClick={() => onAddInvoice(workOrder.id)}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 shadow-sm transition-all active:scale-95"
            >
              Convertir en Facture
            </button>
          )}
        </div>
        <button
            onClick={handlePrint}
            className="flex items-center px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-fmi-red rounded-xl hover:bg-fmi-red/90 shadow-lg shadow-fmi-red/20 transition-all active:scale-95"
        >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Imprimer Bon de Travail
        </button>
      </footer>
    </div>
  );
};
