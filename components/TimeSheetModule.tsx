import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Assignment, WorkOrder, Operation, TimeEntry, JobStatus, Client } from '../types';
import { ClockIcon, PlayIcon, SquareIcon, DownloadIcon, RefreshCwIcon, UserIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TimeSheetModuleProps {
    employees: Employee[];
    assignments: Assignment[];
    workOrders: WorkOrder[];
    operations: Operation[];
    clients: Client[];
    timeEntries: TimeEntry[];
    addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => string;
    updateTimeEntry: (entry: TimeEntry) => void;
    updateAssignment: (workOrderId: string, partInstanceIds: string | string[], operationId: string, employeeIds: string[], scheduledDate?: string, status?: JobStatus, splitId?: string, isLocked?: boolean) => void;
}

export const TimeSheetModule: React.FC<TimeSheetModuleProps> = ({
    employees, assignments, workOrders, operations, clients, timeEntries,
    addTimeEntry, updateTimeEntry, updateAssignment
}) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString());
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second for active timers
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Automated refresh every 15 minutes
    useEffect(() => {
        const refreshTimer = setInterval(() => {
            setLastUpdate(new Date().toLocaleTimeString());
            // Here we could trigger a data refresh if needed, 
            // but since we are using React state from props, it's already "live"
        }, 15 * 60 * 1000);
        return () => clearInterval(refreshTimer);
    }, []);

    const todayAssignments = useMemo(() => {
        if (!selectedEmployeeId) return [];
        const today = new Date().toISOString().split('T')[0];
        return assignments.filter(a => 
            a.employeeIds.includes(selectedEmployeeId) && 
            a.scheduledDate === today
        );
    }, [assignments, selectedEmployeeId]);

    const getJobDetails = (assignment: Assignment) => {
        const wo = workOrders.find(w => w.id === assignment.workOrderId);
        const client = clients.find(c => c.id === wo?.clientId);
        const part = wo?.parts.find(p => p.instanceId === assignment.partInstanceId);
        const op = operations.find(o => o.id === assignment.operationId);
        
        // Find the estimated time from the part template or assembly
        const partOp = part?.operations.find(po => po.operationId === assignment.operationId);
        const estimatedMinutes = partOp?.estimatedTimeMinutes || 0;

        return {
            woNumber: wo?.workOrderNumber || 'N/A',
            clientName: client?.name || 'Inconnu',
            partName: part?.name || 'N/A',
            operationName: op?.name || 'N/A',
            estimatedMinutes
        };
    };

    const getActiveEntry = (assignment: Assignment) => {
        return timeEntries.find(te => 
            te.employeeId === selectedEmployeeId && 
            te.workOrderId === assignment.workOrderId &&
            te.partInstanceId === assignment.partInstanceId &&
            te.operationId === assignment.operationId &&
            !te.endTime
        );
    };

    const getTotalSpentMinutes = (assignment: Assignment) => {
        const entries = timeEntries.filter(te => 
            te.employeeId === selectedEmployeeId && 
            te.workOrderId === assignment.workOrderId &&
            te.partInstanceId === assignment.partInstanceId &&
            te.operationId === assignment.operationId
        );

        return entries.reduce((total, te) => {
            if (te.endTime) {
                return total + (te.totalMinutes || 0);
            } else {
                const start = new Date(te.startTime);
                const diff = (currentTime.getTime() - start.getTime()) / (1000 * 60);
                return total + diff;
            }
        }, 0);
    };

    const handleStartTimer = (assignment: Assignment) => {
        if (!selectedEmployeeId) return;
        
        // Check if there's already an active timer for this employee
        const existingActive = timeEntries.find(te => te.employeeId === selectedEmployeeId && !te.endTime);
        if (existingActive) {
            alert("Vous avez déjà un minuteur en cours. Veuillez l'arrêter avant d'en commencer un nouveau.");
            return;
        }

        addTimeEntry({
            employeeId: selectedEmployeeId,
            workOrderId: assignment.workOrderId,
            partInstanceId: assignment.partInstanceId,
            operationId: assignment.operationId,
            startTime: new Date().toISOString()
        });

        // Update assignment status to In Progress if it was Pending
        if (assignment.status === 'Pending') {
            updateAssignment(
                assignment.workOrderId,
                assignment.partInstanceId,
                assignment.operationId,
                assignment.employeeIds,
                assignment.scheduledDate,
                'In Progress'
            );
        }
    };

    const handleStopTimer = (entry: TimeEntry) => {
        const endTime = new Date().toISOString();
        const start = new Date(entry.startTime);
        const end = new Date(endTime);
        const totalMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

        updateTimeEntry({
            ...entry,
            endTime,
            totalMinutes
        });
    };

    const exportToExcel = () => {
        const filteredEntries = timeEntries.filter(te => {
            const date = te.startTime.split('T')[0];
            return date >= startDate && date <= endDate;
        });

        const data = filteredEntries.map(te => {
            const wo = workOrders.find(w => w.id === te.workOrderId);
            const client = clients.find(c => c.id === wo?.clientId);
            const op = operations.find(o => o.id === te.operationId);
            const employee = employees.find(e => e.id === te.employeeId);
            
            return {
                'Employé': employee?.name || 'N/A',
                '#Job': wo?.workOrderNumber || 'N/A',
                'Client': client?.name || 'N/A',
                'Opération': op?.name || 'N/A',
                'Temps Début': new Date(te.startTime).toLocaleString(),
                'Temps Fin': te.endTime ? new Date(te.endTime).toLocaleString() : 'En cours',
                'Total (Minutes)': te.totalMinutes || (te.endTime ? 0 : 'En cours')
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Feuille de Temps');
        XLSX.writeFile(wb, `Feuille_Temps_${startDate}_au_${endDate}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <ClockIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Gestion des Feuilles de Temps</h2>
                            <p className="text-sm text-slate-500">Dernière mise à jour: {lastUpdate}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <span className="text-xs font-medium text-slate-500">Période:</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)}
                                className="text-xs border-none bg-transparent focus:ring-0"
                            />
                            <span className="text-slate-300">à</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)}
                                className="text-xs border-none bg-transparent focus:ring-0"
                            />
                            <button 
                                onClick={exportToExcel}
                                className="ml-2 p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                title="Exporter en Excel"
                            >
                                <DownloadIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sélectionner un employé</label>
                    <div className="relative max-w-xs">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedEmployeeId}
                            onChange={e => setSelectedEmployeeId(e.target.value)}
                            className="pl-10 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                            <option value="">Choisir un employé...</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedEmployeeId ? (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <RefreshCwIcon className="w-4 h-4 text-blue-500" />
                        Travaux prévus pour aujourd'hui
                    </h3>
                    
                    {todayAssignments.length > 0 ? (
                        todayAssignments.map(assignment => {
                            const details = getJobDetails(assignment);
                            const activeEntry = getActiveEntry(assignment);
                            const spentMinutes = getTotalSpentMinutes(assignment);
                            const progress = details.estimatedMinutes > 0 
                                ? Math.min(100, (spentMinutes / details.estimatedMinutes) * 100) 
                                : 0;

                            return (
                                <div key={assignment.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                                    {details.woNumber}
                                                </span>
                                                <span className="text-sm font-bold text-slate-900">{details.clientName}</span>
                                            </div>
                                            <h4 className="text-lg font-medium text-slate-800">{details.partName}</h4>
                                            <p className="text-sm text-blue-600 font-medium">{details.operationName}</p>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Temps</div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-lg font-mono font-bold ${spentMinutes > details.estimatedMinutes ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {Math.floor(spentMinutes)}m
                                                    </span>
                                                    <span className="text-slate-300">/</span>
                                                    <span className="text-sm text-slate-500 font-mono">{details.estimatedMinutes}m</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {activeEntry ? (
                                                    <button
                                                        onClick={() => handleStopTimer(activeEntry)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-bold text-sm"
                                                    >
                                                        <SquareIcon className="w-4 h-4 fill-current" />
                                                        STOP
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStartTimer(assignment)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-bold text-sm"
                                                    >
                                                        <PlayIcon className="w-4 h-4 fill-current" />
                                                        START
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                                            <span>Progression</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-red-500' : progress >= 75 ? 'bg-amber-200' : 'bg-green-500'}`}
                                                style={{ width: `${Math.min(100, progress)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                            <p className="text-slate-500">Aucun travail prévu pour cet employé aujourd'hui.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-12 text-center">
                    <UserIcon className="w-12 h-12 text-blue-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-blue-900">Sélectionnez un employé pour commencer</h3>
                    <p className="text-blue-600 text-sm mt-1">Vous pourrez ensuite voir les travaux assignés et gérer les temps.</p>
                </div>
            )}
        </div>
    );
};
