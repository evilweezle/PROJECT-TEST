import React, { useMemo } from 'react';
import type { WorkOrder, Client, Operation, WorkOrderPart, Employee, Assignment, Material } from '../types';
import { PrinterIcon } from './icons';

interface WorkOrderDetailsViewProps {
  workOrder: WorkOrder;
  clients: Client[];
  materials: Material[];
  operations: Operation[];
  employees: Employee[];
  assignments: Assignment[];
  updateAssignment: (workOrderId: string, partInstanceId: string, operationId: string, employeeIds: string[]) => void;
}

export const WorkOrderDetailsView: React.FC<WorkOrderDetailsViewProps> = ({ workOrder, clients, materials, operations, employees, assignments, updateAssignment }) => {
  const client = clients.find(c => c.id === workOrder.clientId);

  const operationsWithParts = useMemo(() => {
    const opMap = new Map<string, { operation: Operation; parts: WorkOrderPart[] }>();

    workOrder.parts.forEach(part => {
      part.operations.forEach(partOp => {
        const opId = partOp.operationId;
        if (!opMap.has(opId)) {
          const operationDetails = operations.find(o => o.id === opId);
          if (operationDetails) {
            opMap.set(opId, { operation: operationDetails, parts: [] });
          }
        }
        const entry = opMap.get(opId);
        if (entry) {
            entry.parts.push(part);
        }
      });
    });

    // FIX: Explicitly type `allOpIdsInOrder` as string[] to fix type inference issue with flatMap.
    const allOpIdsInOrder: string[] = workOrder.parts.flatMap(p => p.operations.map(op => op.operationId));
    const uniqueOpIds = [...new Set(allOpIdsInOrder)];
    
    return uniqueOpIds.map(opId => opMap.get(opId)).filter((item): item is { operation: Operation; parts: WorkOrderPart[] } => !!item);

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
        
        <main className="space-y-6">
          {operationsWithParts.map(({ operation, parts }) => (
            <div key={operation.id}>
              <h2 className="text-xl font-bold bg-slate-100 p-2 rounded-t-md border-b-2 border-slate-300">
                Operation: {operation.name}
              </h2>
              <ul className="divide-y divide-slate-200 border border-t-0 border-slate-300 rounded-b-md">
                {parts.map(part => {
                  const material = materials.find(m => m.id === part.materialId);
                  
                  const materialCost = material?.cost || 0;
                  
                  const laborCost = part.operations.reduce((acc, partOp) => {
                    const opDetails = operations.find(o => o.id === partOp.operationId);
                    if (opDetails) {
                      const opCost = (partOp.estimatedTimeMinutes / 60) * opDetails.rate;
                      return acc + opCost;
                    }
                    return acc;
                  }, 0);
                  
                  const totalPartCost = materialCost + laborCost;

                  return (
                    <li key={part.instanceId} className="px-4 py-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex-1">
                            <p className="font-medium">{part.name}</p>
                            <p className="text-slate-500 text-sm">
                              Material: {material?.name || 'N/A'} - Est. Total Cost: ${totalPartCost.toFixed(2)}
                            </p>
                        </div>
                        <div className="w-full sm:w-72 no-print">
                            <label htmlFor={`assign-${part.instanceId}-${operation.id}`} className="block text-xs font-medium text-slate-500 mb-1">Assign Employees</label>
                            <select
                              multiple
                              id={`assign-${part.instanceId}-${operation.id}`}
                              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm h-24"
                              value={
                                assignments.find(a => 
                                  a.workOrderId === workOrder.id && 
                                  a.partInstanceId === part.instanceId && 
                                  a.operationId === operation.id
                                )?.employeeIds || []
                              }
                              // FIX: Add explicit type to event parameter to resolve type inference issue.
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                // FIX: Explicitly type `option` to resolve type inference issue with `Array.from`.
                                const selectedIds = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                                updateAssignment(workOrder.id, part.instanceId, operation.id, selectedIds);
                              }}
                            >
                              {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                              ))}
                            </select>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </main>
      </div>

      <footer className="mt-6 flex justify-end no-print">
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
