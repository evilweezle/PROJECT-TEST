import React from 'react';
import type { WorkOrder, Assignment, Employee, Operation, NonConformity, JobStatus, Material, ProductionFeedback } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardListIcon, 
  UserGroupIcon, 
  ExclamationCircleIcon, 
  CheckCircleIcon,
  Loader2Icon,
  RefreshIcon
} from './icons';

interface ShopfloorDashboardProps {
  workOrders: WorkOrder[];
  assignments: Assignment[];
  employees: Employee[];
  operations: Operation[];
  nonConformities: NonConformity[];
  timeEntries: TimeEntry[];
  onUpdateAssignment: (assignment: Assignment) => void;
  onUpdateWorkOrder: (workOrder: WorkOrder) => void;
  onReportNonConformity: () => void;
  onViewWorkOrderDetails: (workOrder: WorkOrder) => void;
  onAddDeliveryNote: (workOrderId: string) => void;
  onAddInvoice: (workOrderId: string) => void;
  onRefresh: () => void;
  materials?: Material[];
}

export const ShopfloorDashboard: React.FC<ShopfloorDashboardProps> = ({
  workOrders = [],
  assignments = [],
  employees = [],
  operations = [],
  nonConformities = [],
  timeEntries = [],
  onUpdateAssignment,
  onUpdateWorkOrder,
  onReportNonConformity,
  onViewWorkOrderDetails,
  onAddDeliveryNote,
  onAddInvoice,
  onRefresh,
  materials = []
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('ShopfloorDashboard data update:', {
      workOrdersCount: (workOrders || []).length,
      assignmentsCount: (assignments || []).length,
      inProgressCount: (workOrders || []).filter(wo => wo.status === 'In Progress').length,
      firstWO: (workOrders || [])[0] ? { id: workOrders[0].id, status: workOrders[0].status } : 'none'
    });
  }, [workOrders, assignments]);

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-50 border-green-100';
      case 'In Progress': return 'text-fmi-red bg-red-50 border-red-100';
      case 'Blocked': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const activeWorkOrders = (workOrders || []).filter(wo => wo.status !== 'Completed');
  const activeAssignments = (assignments || []).filter(a => a.status !== 'Completed');
  const openNonConformities = (nonConformities || []).filter(nc => nc.status !== 'Closed' && nc.status !== 'Resolved');

  const [isScanModalOpen, setIsScanModalOpen] = React.useState(false);
  const [scanResult, setScanResult] = React.useState('');

  const handleScanSimulation = () => {
    if (scanResult) {
      alert(`Simulation: Réception de la commande ${scanResult}. L'inventaire sera ajusté et les opérations débloquées.`);
    }
    setIsScanModalOpen(false);
    setScanResult('');
  };

  const [closingAssignment, setClosingAssignment] = React.useState<{ assignment: Assignment; wo: WorkOrder; op: Operation } | null>(null);
  const [closureData, setClosureData] = React.useState({
    materialId: '',
    dimensions: '',
    quantity: 0,
    comment: ''
  });

  const handleFinishAssignment = (assignment: Assignment, wo: WorkOrder, op: Operation) => {
    // Check if it's a "coupe" (cut) or "usinage" (machining) operation
    const name = op.name.toLowerCase();
    if (name.includes('coupe') || name.includes('laser') || name.includes('usinage')) {
      setClosingAssignment({ assignment, wo, op });
      // Default material if possible
      const partInstance = wo.parts.find(p => p.instanceId === assignment.partInstanceId);
      setClosureData({
        materialId: partInstance?.materialId || '',
        dimensions: '',
        quantity: 1,
        comment: ''
      });
    } else {
      onUpdateAssignment({ ...assignment, status: 'Completed', endTime: new Date().toISOString() });
    }
  };

  const submitClosure = () => {
    if (!closingAssignment) return;
    
    const { assignment, wo } = closingAssignment;
    
    // Create feedback
    const feedback: ProductionFeedback = {
      id: Date.now().toString(),
      employeeId: assignment.employeeIds[0] || 'System',
      date: new Date().toISOString(),
      comment: closureData.comment,
      operationId: assignment.operationId,
      partInstanceId: assignment.partInstanceId,
      materialConsumedId: closureData.materialId,
      materialConsumedQuantity: closureData.quantity,
      materialConsumedDimensions: closureData.dimensions
    };

    // Update assignment
    onUpdateAssignment({ 
      ...assignment, 
      status: 'Completed', 
      endTime: new Date().toISOString(),
      completionComment: closureData.comment
    });

    // Update Work Order with feedback
    const updatedWo = { ...wo };
    const partIdx = updatedWo.parts.findIndex(p => p.instanceId === assignment.partInstanceId);
    if (partIdx !== -1) {
      const part = { ...updatedWo.parts[partIdx] };
      part.productionFeedback = [...(part.productionFeedback || []), feedback];
      updatedWo.parts[partIdx] = part;
      onUpdateWorkOrder(updatedWo);
    }

    setClosingAssignment(null);
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto h-full custom-scrollbar">
      <AnimatePresence>
        {closingAssignment && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="bg-indigo-600 p-6 text-white">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6" />
                  Clôture d'Opération: {closingAssignment.op.name}
                </h3>
                <p className="text-indigo-100 text-sm mt-1 font-medium italic">
                  Veuillez spécifier le matériel utilisé et les retailles.
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Matériel Utilisé</label>
                    <select 
                      value={closureData.materialId}
                      onChange={e => setClosureData(prev => ({ ...prev, materialId: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                    >
                      <option value="">Sélectionner un matériel</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.description}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Dimensions Réelles (po)</label>
                      <input 
                        type="text"
                        value={closureData.dimensions}
                        onChange={e => setClosureData(prev => ({ ...prev, dimensions: e.target.value }))}
                        placeholder="ex: 48x48"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Quantité Consommée</label>
                      <input 
                        type="number"
                        value={closureData.quantity}
                        onChange={e => setClosureData(prev => ({ ...prev, quantity: parseFloat(e.target.value) }))}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Note / Retours au Stock</label>
                    <textarea 
                      value={closureData.comment}
                      onChange={e => setClosureData(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Indiquez ce qui est retourné en stock ou des notes de prod..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all h-24 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setClosingAssignment(null)}
                    className="flex-1 py-4 text-sm font-black text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={submitClosure}
                    className="flex-2 bg-indigo-600 text-white py-4 rounded-xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    Compléter l'Opération
                    <CheckCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-6 relative">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight shrink-0">Gestion du Plancher</h1>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-3">
              <button 
                  onClick={() => setIsScanModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium flex items-center gap-2 whitespace-nowrap"
              >
                  <ClipboardListIcon className="w-4 h-4" />
                  Scanner Réception BDL
              </button>
              <button 
                  onClick={onRefresh}
                  className="p-2 text-slate-500 hover:text-fmi-red hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Afficher les dernières données"
              >
                  <RefreshIcon className="w-5 h-5" />
              </button>
              <button 
                  onClick={() => onReportNonConformity()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm text-sm font-medium shrink-0 whitespace-nowrap"
              >
                  <ExclamationCircleIcon className="w-4 h-4" />
                  Report Non-Conformity
              </button>
          </div>

          {/* Mobile Actions Dropdown */}
          <div className="sm:hidden relative">
            <button 
              onClick={(e) => {
                const target = e.currentTarget;
                const menu = target.nextElementSibling as HTMLElement;
                if (menu) {
                  menu.classList.toggle('hidden');
                }
              }}
              className="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            <div className="hidden absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2">
              <button 
                  onClick={(e) => {
                    setIsScanModalOpen(true);
                    (e.currentTarget.parentElement as HTMLElement).classList.add('hidden');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-indigo-600 font-medium text-sm flex items-center gap-3"
              >
                  <ClipboardListIcon className="w-4 h-4" />
                  Scanner Réception BDL
              </button>
              <button 
                  onClick={(e) => {
                    onRefresh();
                    (e.currentTarget.parentElement as HTMLElement).classList.add('hidden');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center gap-3 border-t border-slate-100"
              >
                  <RefreshIcon className="w-4 h-4" />
                  Actualiser les données
              </button>
              <button 
                  onClick={(e) => {
                    onReportNonConformity();
                    (e.currentTarget.parentElement as HTMLElement).classList.add('hidden');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 font-medium text-sm flex items-center gap-3 border-t border-slate-100"
              >
                  <ExclamationCircleIcon className="w-4 h-4" />
                  Report Non-Conformity
              </button>
            </div>
          </div>
      </div>

      <AnimatePresence>
        {isScanModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardListIcon className="w-5 h-5 text-indigo-600" />
                Scanner un BDL de Matériel
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Dans un environnement réel, la caméra s'ouvrirait ici. Pour cette démo, entrez le numéro de commande/facture associée.
              </p>
              <input
                type="text"
                value={scanResult}
                onChange={(e) => setScanResult(e.target.value)}
                placeholder="Ex: REQ-123456"
                className="w-full p-3 border border-slate-200 rounded-lg mb-6"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsScanModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Annuler</button>
                <button onClick={handleScanSimulation} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700">Confirmer la Réception</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-fmi-red">
            <ClipboardListIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium italic">Commandes Actives</p>
            <p className="text-2xl font-black text-slate-800">{activeWorkOrders.length}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Loader2Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Jobs In Progress</p>
            <p className="text-2xl font-bold text-slate-800">
              {activeAssignments.filter(a => a.status === 'In Progress').length}
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <ExclamationCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Open NCs</p>
            <p className="text-2xl font-bold text-slate-800">{openNonConformities.length}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Completed Today</p>
            <p className="text-2xl font-bold text-slate-800">
              {(assignments || []).filter(a => {
                if (a.status !== 'Completed' || !a.endTime) return false;
                const end = new Date(a.endTime);
                const today = new Date();
                return end.getDate() === today.getDate() &&
                       end.getMonth() === today.getMonth() &&
                       end.getFullYear() === today.getFullYear();
              }).length}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Assignments */}
        <div className="card flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-blue-600" />
              Active Assignments
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
              {activeAssignments.length} running
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {activeAssignments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <UserGroupIcon className="w-12 h-12 opacity-20" />
                <p>No active assignments</p>
              </div>
            ) : (
              activeAssignments.map((assignment) => {
                const wo = workOrders.find(w => w.id === assignment.workOrderId);
                const op = operations.find(o => o.id === assignment.operationId);
                const assignedEmployees = (employees || []).filter(e => (assignment.employeeIds || []).includes(e.id));
                
                const partInstance = wo?.parts.find(p => p.instanceId === assignment.partInstanceId);
                const partOp = partInstance?.operations.find(o => o.operationId === assignment.operationId);

                // Check Part Dependencies
                const unmetPartDeps = (partInstance?.partDependencies || []).filter(depId => {
                  const depPart = wo?.parts.find(p => p.instanceId === depId);
                  return depPart?.status !== 'Completed';
                });

                // Check Operation Dependencies
                const unmetOpDeps = (partOp?.dependencies || []).filter(depOpId => {
                  const depAssignment = assignments.find(a => 
                    a.workOrderId === assignment.workOrderId && 
                    a.partInstanceId === assignment.partInstanceId && 
                    a.operationId === depOpId &&
                    a.status === 'Completed'
                  );
                  return !depAssignment;
                });

                const isBlockedByDeps = unmetPartDeps.length > 0 || unmetOpDeps.length > 0;
                
                const spentMinutes = (timeEntries || [])
                  .filter(te => te.workOrderId === assignment.workOrderId && te.partInstanceId === assignment.partInstanceId && te.operationId === assignment.operationId)
                  .reduce((total, te) => {
                    if (te.endTime) return total + (te.totalMinutes || 0);
                    const start = new Date(te.startTime);
                    const diff = (new Date().getTime() - start.getTime()) / (1000 * 60);
                    return total + diff;
                  }, 0);

                const estimatedMinutes = partOp?.estimatedTimeMinutes || 0;
                const progress = estimatedMinutes > 0 ? Math.min(100, (spentMinutes / estimatedMinutes) * 100) : 0;

                return (
                  <div key={assignment.id} className={`p-4 border rounded-xl transition-colors ${isBlockedByDeps ? 'bg-slate-100 border-slate-200 opacity-75' : 'bg-slate-50/50 border-slate-100 hover:border-blue-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">{assignment.assignmentNumber || wo?.workOrderNumber || wo?.name || 'Unknown WO'}</p>
                        <h4 className="font-bold text-slate-800">{op?.name || 'Unknown Operation'}</h4>
                        {isBlockedByDeps && (
                          <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                            <ExclamationCircleIcon className="w-3 h-3" />
                            Waiting for: {unmetPartDeps.length > 0 ? `${unmetPartDeps.length} part(s)` : ''} {unmetPartDeps.length > 0 && unmetOpDeps.length > 0 ? '& ' : ''} {unmetOpDeps.length > 0 ? `${unmetOpDeps.length} op(s)` : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {Math.floor(spentMinutes)}m / {estimatedMinutes}m
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-200 rounded-full h-1 mb-3 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-red-500' : progress >= 75 ? 'bg-amber-200' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-2">
                        {assignedEmployees.map(emp => (
                          <div key={emp.id} className="w-8 h-8 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-xs font-bold text-slate-600" title={emp.name}>
                            {emp.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        {assignedEmployees.length} assigned
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {assignment.status === 'Pending' && (
                        <button 
                          onClick={() => onUpdateAssignment({ ...assignment, status: 'In Progress', startTime: new Date().toISOString() })}
                          disabled={isBlockedByDeps}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            isBlockedByDeps 
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isBlockedByDeps ? 'Locked' : 'Start Job'}
                        </button>
                      )}
                      {assignment.status === 'In Progress' && (
                        <>
                          <button 
                            onClick={() => {
                              if (op) {
                                handleFinishAssignment(assignment, wo!, op);
                              } else {
                                onUpdateAssignment({ ...assignment, status: 'Completed', endTime: new Date().toISOString() });
                              }
                            }}
                            className="flex-1 bg-green-600 text-white hover:bg-green-700 rounded-lg py-1.5 text-xs font-bold transition-colors"
                          >
                            Finish
                          </button>
                          <button 
                            onClick={() => onUpdateAssignment({ ...assignment, status: 'Blocked' })}
                            className="flex-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg py-1.5 text-xs font-bold transition-colors"
                          >
                            Block
                          </button>
                        </>
                      )}
                      {assignment.status === 'Blocked' && (
                        <button 
                          onClick={() => onUpdateAssignment({ ...assignment, status: 'In Progress' })}
                          className="flex-1 btn-primary py-1.5 text-xs"
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Work Order Progress */}
        <div className="card flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ClipboardListIcon className="w-5 h-5 text-blue-600" />
              Work Order Progress
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {activeWorkOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <ClipboardListIcon className="w-12 h-12 opacity-20" />
                <p>No active work orders</p>
              </div>
            ) : (
              activeWorkOrders.map((wo) => {
                const woAssignments = (assignments || []).filter(a => a.workOrderId === wo.id);
                const completedCount = woAssignments.filter(a => a.status === 'Completed').length;
                const totalCount = woAssignments.length;
                const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                
                // Check if any operations are blocked due to missing material
                const missingMaterialOps = wo.parts.flatMap(p => p.operations || []).filter(op => op.status === 'Blocked' && op.blockedReason === 'Manque de matériel' && p.status !== 'Completed');

                return (
                  <div key={wo.id} className="space-y-2 p-3 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors bg-slate-50/30">
                    <div className="flex justify-between items-end">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-slate-800">{wo.name}</h4>
                          <button 
                            onClick={() => onViewWorkOrderDetails(wo)}
                            className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                          >
                            View Details
                          </button>
                        </div>
                        {missingMaterialOps.length > 0 && (
                          <div className="text-[10px] font-bold text-red-600 bg-red-50 inline-block px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 mb-1">
                            Alèrte: Manque de Matériel
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <button 
                            onClick={() => onAddDeliveryNote(wo.id)}
                            className="text-[9px] font-bold text-slate-500 hover:text-blue-600 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded"
                          >
                            + BDL
                          </button>
                          <button 
                            onClick={() => onAddInvoice(wo.id)}
                            className="text-[9px] font-bold text-slate-500 hover:text-green-600 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded"
                          >
                            + INV
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Due: {wo.finishDate}</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{completedCount} / {totalCount} Operations</span>
                      <select 
                        value={wo.status || 'Pending'} 
                        onChange={(e) => {
                          const newStatus = e.target.value as JobStatus;
                          console.log(`Changing Work Order ${wo.id} status to: ${newStatus}`);
                          onUpdateWorkOrder({ ...wo, status: newStatus });
                        }}
                        className={`bg-transparent border-none p-0 focus:ring-0 cursor-pointer ${getStatusColor(wo.status || 'Pending').split(' ')[0]}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Non-Conformities */}
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600" />
            Recent Non-Conformities
          </h3>
          <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-3 border-b border-slate-100">Description</th>
                <th className="px-6 py-3 border-b border-slate-100">Work Order</th>
                <th className="px-6 py-3 border-b border-slate-100">Severity</th>
                <th className="px-6 py-3 border-b border-slate-100">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {openNonConformities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No open non-conformities
                  </td>
                </tr>
              ) : (
                openNonConformities.slice(0, 5).map((nc) => {
                  const wo = workOrders.find(w => w.id === nc.workOrderId);
                  return (
                    <tr key={nc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 border-b border-slate-100 font-medium text-slate-700">{nc.description}</td>
                      <td className="px-6 py-4 border-b border-slate-100 text-slate-500">{wo?.name || 'N/A'}</td>
                      <td className="px-6 py-4 border-b border-slate-100">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          nc.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                          nc.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                          nc.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {nc.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100">
                        <span className="text-xs text-slate-600">{nc.status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
