import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Employee, Assignment, TimeEntry, WorkOrder, NonConformity } from '../types';
import { ChartBarIcon, ClockIcon, ExclamationCircleIcon, CheckCircleIcon, UserIcon } from './icons';

interface PerformanceDashboardProps {
  employees: Employee[];
  assignments: Assignment[];
  timeEntries: TimeEntry[];
  workOrders: WorkOrder[];
  nonConformities: NonConformity[];
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  employees,
  assignments,
  timeEntries,
  workOrders,
  nonConformities
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    return employees.map(emp => {
      // 1. Total Wrench Time (Logged minutes)
      const empTimeEntries = timeEntries.filter(te => te.employeeId === emp.id);
      const totalWrenchTimeMinutes = empTimeEntries.reduce((sum, te) => sum + (te.totalMinutes || 0), 0);
      const wrenchTimeHours = (totalWrenchTimeMinutes / 60).toFixed(1);

      // 2. Completed Assignments & Efficiency
      const empCompletedAssignments = assignments.filter(a => a.employeeIds.includes(emp.id) && a.status === 'Completed');
      
      let totalEstimatedMinutes = 0;
      let totalActualMinutesCompleted = 0;
      let successfulAssignments = 0;

      for (const a of empCompletedAssignments) {
        const wo = workOrders.find(w => w.id === a.workOrderId);
        const part = wo?.parts.find(p => p.instanceId === a.partInstanceId);
        const op = part?.operations.find(o => o.operationId === a.operationId);
        
        // Apportion estimated time if multiple employees were assigned
        const numAssignees = a.employeeIds.length || 1;
        const estMinutes = op?.estimatedTimeMinutes ? (op.estimatedTimeMinutes * (part?.quantity || 1)) / numAssignees : 0;
        totalEstimatedMinutes += estMinutes;

        // Actual time logged by THIS employee on THIS assignment
        const actualMinutes = empTimeEntries
          .filter(te => te.workOrderId === a.workOrderId && te.partInstanceId === a.partInstanceId && te.operationId === a.operationId)
          .reduce((sum, te) => sum + (te.totalMinutes || 0), 0);
        
        totalActualMinutesCompleted += actualMinutes;

        if (actualMinutes <= estMinutes && estMinutes > 0) {
          successfulAssignments++;
        }
      }

      const efficiencyScore = totalActualMinutesCompleted > 0 
        ? Math.round((totalEstimatedMinutes / totalActualMinutesCompleted) * 100) 
        : (totalEstimatedMinutes > 0 ? 100 : 0);

      const successRate = empCompletedAssignments.length > 0
        ? Math.round((successfulAssignments / empCompletedAssignments.length) * 100)
        : 0;

      // 3. Non conformities
      // Find NCs where the operation was assigned to this employee
      const empNonConformities = nonConformities.filter(nc => 
        assignments.some(a => 
          a.workOrderId === nc.workOrderId && 
          a.partInstanceId === nc.partInstanceId && 
          a.operationId === nc.operationId && 
          a.employeeIds.includes(emp.id)
        )
      );

      return {
        ...emp,
        wrenchTimeHours,
        completedCount: empCompletedAssignments.length,
        efficiencyScore,
        successRate,
        nonConformitiesCount: empNonConformities.length,
        totalEstimatedHours: (totalEstimatedMinutes / 60).toFixed(1),
        totalActualHoursCompleted: (totalActualMinutesCompleted / 60).toFixed(1)
      };
    }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }, [employees, assignments, timeEntries, workOrders, nonConformities]);

  const filteredStats = stats.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.employeeNumber.includes(searchTerm)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ChartBarIcon className="w-8 h-8 text-fmi-red" />
            Tableau d'Efficacité
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ml-2">Gestion 400+</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Analyse des performances, wrench time et conformité par employé.</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Rechercher un employé..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-white border-0 focus:ring-2 focus:ring-fmi-red rounded-lg px-4 py-2 text-sm font-medium transition-shadow"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredStats.map((empStat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={empStat.id} 
            className="bg-white border text-slate-800 border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-6 flex flex-col lg:flex-row gap-6 lg:items-center">
              {/* Profile Block */}
              <div className="flex items-center gap-4 lg:w-1/4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-inner">
                  {empStat.photo ? (
                    <img src={empStat.photo} alt={empStat.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-indigo-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{empStat.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">#{empStat.employeeNumber}</span>
                    <span className="text-xs font-semibold text-slate-400">{empStat.role}</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                {/* Wrench Time */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <ClockIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Wrench Time</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-700">{empStat.wrenchTimeHours}</span>
                    <span className="text-sm font-semibold text-slate-400"> / hrs</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-medium">Temps total enregistré sur des tâches.</div>
                </div>

                {/* Efficiency */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between ${empStat.efficiencyScore >= 100 ? 'bg-green-50 border-green-100' : empStat.efficiencyScore >= 80 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${empStat.efficiencyScore >= 100 ? 'text-green-600' : empStat.efficiencyScore >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                    <ChartBarIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Efficacité</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${empStat.efficiencyScore >= 100 ? 'text-green-700' : empStat.efficiencyScore >= 80 ? 'text-amber-700' : 'text-red-700'}`}>{empStat.efficiencyScore}</span>
                    <span className={`text-sm font-bold ${empStat.efficiencyScore >= 100 ? 'text-green-500/50' : empStat.efficiencyScore >= 80 ? 'text-amber-500/50' : 'text-red-500/50'}`}>%</span>
                  </div>
                  <div className={`text-[10px] mt-2 font-medium ${empStat.efficiencyScore >= 100 ? 'text-green-600/70' : empStat.efficiencyScore >= 80 ? 'text-amber-600/70' : 'text-red-600/70'}`}>
                    Est. {empStat.totalEstimatedHours}h / Réel {empStat.totalActualHoursCompleted}h
                  </div>
                </div>

                {/* Success */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-blue-500 mb-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Réussite</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-blue-700">{empStat.successRate}</span>
                    <span className="text-sm font-bold text-blue-400/50">%</span>
                  </div>
                  <div className="text-[10px] text-blue-600/70 mt-2 font-medium">Tâches sous le temps prévu. ({empStat.completedCount} fermées)</div>
                </div>

                {/* Qualité */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between ${empStat.nonConformitiesCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${empStat.nonConformitiesCount > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                    <ExclamationCircleIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Non-Conformités</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${empStat.nonConformitiesCount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{empStat.nonConformitiesCount}</span>
                  </div>
                  <div className={`text-[10px] mt-2 font-medium ${empStat.nonConformitiesCount > 0 ? 'text-orange-600/70' : 'text-slate-400'}`}>Incidents associés aux tâches.</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredStats.length === 0 && (
          <div className="text-center py-20 bg-white border border-slate-200 border-dashed rounded-3xl">
            <UserIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Aucun employé trouvé</h3>
            <p className="text-slate-500">Ajustez votre recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
};
