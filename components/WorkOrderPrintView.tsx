import React, { useMemo } from 'react';
import type { WorkOrder, Client, Operation, WorkOrderPart, Employee, Assignment, Material, JobStatus } from '../types';
import { PrinterIcon } from './icons';

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
    <div>
      <div className="printable-area p-4 text-slate-800">
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
              !operation.requiredSkillId || emp.skills.some(s => s.skillId === operation.requiredSkillId)
            );

            // Find common assignment for this operation in this WO
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
              <div key={operation.id} className="border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-slate-100 p-3 border-b border-slate-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Operation: {workOrder.name}-{operation.name}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Total Estimated Time: {Math.floor(totalTime / 60)}h {totalTime % 60}m
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 no-print bg-white p-3 rounded-md border border-slate-200 shadow-inner w-full md:w-auto">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Schedule Date</label>
                      <input 
                        type="date" 
                        className="block w-full text-xs border-slate-200 rounded focus:ring-blue-500 focus:border-blue-500"
                        value={isCommonAssignment ? firstAssignment?.scheduledDate || '' : ''}
                        onChange={(e) => updateOperationAssignment(workOrder.id, operation.id, isCommonAssignment ? firstAssignment?.employeeIds || [] : [], e.target.value)}
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assign to (Skill: {operation.requiredSkillId ? 'Required' : 'Any'})</label>
                      <select
                        multiple
                        className="block w-full text-xs border-slate-200 rounded h-16 focus:ring-blue-500 focus:border-blue-500"
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

                <ul className="divide-y divide-slate-200 bg-white">
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
                      
                      // Calculate completion for this group
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
                        <li key={group.instanceIds[0]} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1 w-full">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-slate-900">{group.name}</p>
                                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    {completedQty}/{group.totalQuantity} Completed
                                  </span>
                                  <span className="text-[10px] bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                    {partOp?.estimatedTimeMinutes} min/unit
                                  </span>
                                  {partOp?.requiresHelper && (
                                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                      Helper: {partOp.helperTimeMinutes}m
                                    </span>
                                  )}
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="mt-2 w-full max-w-md">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Progress</span>
                                    <span className="text-[10px] font-bold text-slate-600">{Math.round(progress)}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>

                                <p className="text-slate-500 text-xs mt-1">
                                  Material: {material?.description || 'N/A'}
                                </p>
                            </div>
                            
                            <div className="flex gap-4 no-print">
                              <div className="w-32">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
                                <input 
                                  type="date" 
                                  className="block w-full text-[10px] border-slate-200 rounded p-1"
                                  value={assignment?.scheduledDate || ''}
                                  onChange={(e) => updateAssignment(workOrder.id, group.instanceIds, operation.id, assignment?.employeeIds || [], e.target.value)}
                                />
                              </div>
                              <div className="w-48">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assign</label>
                                <select
                                  multiple
                                  className="block w-full text-[10px] border-slate-200 rounded h-12 p-1"
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

      <footer className="mt-6 flex justify-between items-center no-print">
        <div className="flex gap-2">
          {onAddDeliveryNote && (
            <button
              onClick={() => onAddDeliveryNote(workOrder.id)}
              className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
            >
              Convertir en BDL
            </button>
          )}
          {onAddInvoice && (
            <button
              onClick={() => onAddInvoice(workOrder.id)}
              className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
            >
              Convertir en Facture
            </button>
          )}
        </div>
        <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#0078d4] rounded-md hover:bg-[#106ebe]"
        >
            <PrinterIcon className="w-5 h-5 mr-2 -ml-1" />
            Print Work Order
        </button>
      </footer>
    </div>
  );
};
