import React, { useState, useMemo, useEffect } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragOverlay,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'motion/react';
import type { Employee, WorkOrder, Assignment, Operation, Skill, JobStatus } from '../types';
import { 
  SearchIcon, 
  CalendarIcon, 
  ClockIcon, 
  Maximize2Icon,
  ScissorsIcon,
  CheckCircleIcon,
  LockIcon,
  UnlockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from './icons';
import { SparklesIcon, BotIcon, MessageSquareIcon, CheckIcon, XIcon as LucideXIcon, Loader2Icon, RefreshCwIcon as RefreshIcon } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface EmployeeScheduleDashboardProps {
  employees: Employee[];
  workOrders: WorkOrder[];
  assignments: Assignment[];
  operations: Operation[];
  skills: Skill[];
  updateAssignment: (workOrderId: string, partInstanceId: string | string[], operationId: string, employeeIds: string[], scheduledDate?: string, status?: JobStatus, splitId?: string, isLocked?: boolean) => void;
}

interface UnassignedOp {
  id: string; // unique id for dnd: woId-partId-opId-depsHash-splitId
  workOrderId: string;
  workOrderName: string;
  partId: string;
  partName: string;
  partInstanceIds: string[];
  quantity: number;
  totalQuantity: number;
  operationId: string;
  operationName: string;
  estimatedTimeMinutes: number;
  requiredSkillId?: string;
  status: JobStatus;
  splitId?: string;
  isLocked?: boolean;
}

interface AiProposal {
  workOrderId: string;
  partInstanceIds: string[];
  operationId: string;
  employeeIds: string[];
  scheduledDate: string;
}

const DraggableOp: React.FC<{ 
  op: UnassignedOp; 
  isAssigned?: boolean;
  isQualified?: boolean;
  onSplit?: (op: UnassignedOp) => void;
  onDone?: (op: UnassignedOp) => void;
  onToggleLock?: (op: UnassignedOp) => void;
}> = ({ op, isAssigned, isQualified = true, onSplit, onDone, onToggleLock }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: op.id,
    data: op
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const isCompleted = op.status === 'Completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2 mb-2 bg-white border border-slate-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors ${isDragging ? 'opacity-50' : ''} ${isAssigned ? 'p-1.5 text-[10px]' : ''} ${isCompleted ? 'bg-green-50 border-green-200' : ''} ${!isQualified && isAssigned ? 'border-red-300 bg-red-50' : ''}`}
    >
      <div {...listeners} {...attributes}>
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-bold text-blue-600 uppercase truncate max-w-[120px]">{op.workOrderName}</span>
          <div className="flex items-center gap-1">
            {!isQualified && isAssigned && (
              <div className="p-0.5 bg-red-100 text-red-600 rounded" title="Compétence manquante!">
                 <XIcon className="w-3 h-3" />
              </div>
            )}
            {isAssigned && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLock?.(op); }}
                className={`p-0.5 rounded transition-colors ${op.isLocked ? 'text-blue-600 bg-blue-50' : 'text-slate-300 hover:text-slate-500'}`}
                title={op.isLocked ? "Unlock Assignment" : "Lock Assignment"}
              >
                {op.isLocked ? <LockIcon className="w-3.5 h-3.5" /> : <UnlockIcon className="w-3.5 h-3.5" />}
              </button>
            )}
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded font-bold">
              {op.quantity}/{op.totalQuantity}
            </span>
            <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{op.estimatedTimeMinutes}m</span>
          </div>
        </div>
        <p className={`${isAssigned ? 'text-[10px]' : 'text-xs'} font-medium text-slate-900 truncate`}>
          {op.partName} {op.splitId ? `-${op.splitId}` : ''}
        </p>
        <p className="text-[10px] text-slate-500">{op.operationName}</p>
      </div>

      {isAssigned && !isCompleted && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
          <button
            onClick={(e) => { e.stopPropagation(); onSplit?.(op); }}
            className="flex-1 flex items-center justify-center gap-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
            title="Split Operation"
          >
            <ScissorsIcon className="w-3 h-3" />
            <span>Split</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDone?.(op); }}
            className="flex-1 flex items-center justify-center gap-1 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
            title="Mark as Done"
          >
            <CheckCircleIcon className="w-3 h-3" />
            <span>Done</span>
          </button>
        </div>
      )}
      {isCompleted && (
        <div className="mt-1 flex items-center gap-1 text-green-600 font-bold text-[8px] uppercase">
          <CheckCircleIcon className="w-2.5 h-2.5" />
          Completed
        </div>
      )}
    </div>
  );
};

const DroppableCell: React.FC<{ 
  id: string; 
  children: React.ReactNode; 
  loadMinutes: number;
  employeeSkills: { skillId: string }[];
}> = ({ id, children, loadMinutes, employeeSkills }) => {
  const { setNodeRef, isOver, active } = useDroppable({
    id: id,
  });

  const activeOp = active?.data?.current as UnassignedOp | undefined;
  const hasRequiredSkill = !activeOp?.requiredSkillId || employeeSkills.some(s => s.skillId === activeOp.requiredSkillId);
  
  const canDrop = isOver && hasRequiredSkill;
  const isBlocked = isOver && !hasRequiredSkill;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] p-2 rounded-lg border-2 transition-all ${
        canDrop ? 'border-blue-400 bg-blue-50' : 
        isBlocked ? 'border-red-400 bg-red-50 cursor-not-allowed' :
        'border-transparent bg-slate-50/50'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Load</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          loadMinutes > 480 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {Math.floor(loadMinutes / 60)}h {loadMinutes % 60}m
        </span>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};

export const EmployeeScheduleDashboard: React.FC<EmployeeScheduleDashboardProps> = ({ 
  employees, 
  workOrders, 
  assignments, 
  operations, 
  skills,
  updateAssignment 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showExtendedView, setShowExtendedView] = useState(false);
  const [splittingOp, setSplittingOp] = useState<UnassignedOp | null>(null);
  const [splitValue, setSplitValue] = useState<number>(1);
  const [isAiPlanning, setIsAiPlanning] = useState(false);
  const [aiProposal, setAiProposal] = useState<AiProposal[] | null>(null);
  const [aiJustification, setAiJustification] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'schedule' | 'unassigned'>('schedule');
  const [assigningOp, setAssigningOp] = useState<UnassignedOp | null>(null);
  const [assignDate, setAssignDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMobileDate, setSelectedMobileDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const toggleEmployeeExpansion = (empId: string) => {
    const newSet = new Set(expandedEmployees);
    if (newSet.has(empId)) newSet.delete(empId);
    else newSet.add(empId);
    setExpandedEmployees(newSet);
  };

  const navigateMobileDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedMobileDate);
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedMobileDate(current.toISOString().split('T')[0]);
  };

  const handleToggleLock = (op: UnassignedOp) => {
    updateAssignment(op.workOrderId, op.partInstanceIds, op.operationId, [], undefined, undefined, undefined, !op.isLocked);
  };

  const handleAiPlan = async (mode: 'assign' | 'resort') => {
    setIsAiLoading(true);
    try {
      const context = {
        mode,
        employees: employees.map(e => ({ id: e.id, name: e.name, skills: e.skills })),
        workOrders: workOrders.map(wo => ({ 
          id: wo.id, 
          name: wo.name, 
          parts: wo.parts.map(p => ({ 
            id: p.id, 
            instanceId: p.instanceId, 
            operations: p.operations.map(o => ({ 
              operationId: o.operationId, 
              estimatedTimeMinutes: o.estimatedTimeMinutes,
              dependencies: o.dependencies 
            })) 
          })) 
        })),
        assignments: assignments.map(a => ({
          workOrderId: a.workOrderId,
          partInstanceId: a.partInstanceId,
          operationId: a.operationId,
          employeeIds: a.employeeIds,
          scheduledDate: a.scheduledDate,
          isLocked: a.isLocked || false
        })),
        unassignedOps: unassignedOps.map(o => ({
          workOrderId: o.workOrderId,
          partInstanceIds: o.partInstanceIds,
          operationId: o.operationId,
          estimatedTimeMinutes: o.estimatedTimeMinutes,
          requiredSkillId: o.requiredSkillId
        })),
        dates: (showExtendedView ? extendedDays : days).map(d => d.toISOString().split('T')[0])
      };

      const prompt = `
        Assistant Planificateur avec "Smart Lock"
        Rôle : Expert en architecture ERP et optimisation de flux de production.
        Objectif : Optimiser le planning de production.
        
        Mode: ${mode === 'assign' ? 'Assignation des tâches non assignées' : 'Réorganisation globale (Resort)'}
        
        Contraintes:
        1. Système de Verrouillage (Smart Lock): Les opérations avec isLocked: true NE DOIVENT PAS être déplacées.
        2. Logique d'Ordonnancement: Respecter l'ordre des opérations (Opé 1 -> 2 -> 3) autant que possible.
        3. Justification: Si tu enfreins l'ordre pour optimiser, explique pourquoi.
        4. Compétences (CRITIQUE): Vérifier que l'employé a EXACTEMENT la compétence requise (requiredSkillId). Un employé sans la compétence ne peut PAS faire la tâche.
        5. Charge de travail: Équilibrer la charge entre les employés qualifiés.
        
        Données: ${JSON.stringify(context)}
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      let response;
      let retries = 3;
      let delay = 1000;

      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        justification: { type: Type.STRING },
                        proposals: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    workOrderId: { type: Type.STRING },
                                    partInstanceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    operationId: { type: Type.STRING },
                                    employeeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    scheduledDate: { type: Type.STRING }
                                },
                            }
                        }
                    },
                    required: ["justification", "proposals"]
                }
            }
          });
          break; // success
        } catch (error: unknown) {
          const errorStr = error instanceof Error ? error.message : String(error);
          if (errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || errorStr.includes('high demand')) {
            retries--;
            if (retries === 0) throw error;
            console.warn(`Retry ${retries} after ${delay}ms due to 503 error.`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          } else {
            throw error;
          }
        }
      }

      if (!response || !response.text) {
        throw new Error('No response from AI');
      }

      const json = JSON.parse(response.text.trim());
      
      setAiProposal(json.proposals);
      setAiJustification(json.justification || '');
      setIsAiPlanning(true);
    } catch (error: unknown) {
      console.error("AI Planning Error:", error);
      alert("Erreur lors de la planification IA: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyAiProposal = () => {
    if (!aiProposal) return;
    aiProposal.forEach((p: AiProposal) => {
      updateAssignment(p.workOrderId, p.partInstanceIds, p.operationId, p.employeeIds, p.scheduledDate);
    });
    setAiProposal(null);
    setAiJustification('');
    setIsAiPlanning(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, [today]);

  const extendedDays = useMemo(() => {
    return Array.from({ length: 21 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, [today]);

  const unassignedOps = useMemo(() => {
    const groups = new Map<string, UnassignedOp>();
    
    workOrders.forEach(wo => {
      if (wo.status === 'Completed') return;
      wo.parts.forEach(part => {
        const depsHash = JSON.stringify((part.partDependencies || []).sort());
        const totalPartQty = wo.parts.filter(p => p.id === part.id).length;
        
        part.operations.forEach(partOp => {
          const isAssigned = assignments.some(a => 
            a.workOrderId === wo.id && 
            a.partInstanceId === part.instanceId && 
            a.operationId === partOp.operationId
          );
          
          if (!isAssigned) {
            const opDetails = operations.find(o => o.id === partOp.operationId);
            const key = `${wo.id}-${part.id}-${partOp.operationId}-${depsHash}`;
            
            if (groups.has(key)) {
              const existing = groups.get(key)!;
              existing.partInstanceIds.push(part.instanceId);
              existing.quantity += 1;
            } else {
              groups.set(key, {
                id: key,
                workOrderId: wo.id,
                workOrderName: wo.name,
                partId: part.id,
                partName: part.name,
                partInstanceIds: [part.instanceId],
                quantity: 1,
                totalQuantity: totalPartQty,
                operationId: partOp.operationId,
                operationName: `${wo.name}-${opDetails?.name || 'Unknown'}`,
                estimatedTimeMinutes: partOp.estimatedTimeMinutes,
                requiredSkillId: opDetails?.requiredSkillId,
                status: 'Pending'
              });
            }
          }
        });
      });
    });
    return Array.from(groups.values());
  }, [workOrders, assignments, operations]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSkill = !selectedSkillId || (emp.skills || []).some(s => s.skillId === selectedSkillId);
      return matchesSearch && matchesSkill;
    });
  }, [employees, searchTerm, selectedSkillId]);

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && over.id) {
      const [empId, dateStr] = (over.id as string).split('|');
      const op = (active.data.current as UnassignedOp);
      
      if (op) {
        // Validate skill before update
        const targetEmployee = employees.find(e => e.id === empId);
        const hasSkill = !op.requiredSkillId || targetEmployee?.skills?.some(s => s.skillId === op.requiredSkillId);
        
        if (hasSkill) {
          updateAssignment(op.workOrderId, op.partInstanceIds, op.operationId, [empId], dateStr, 'In Progress');
        }
      }
    }
  };

  const handleSplit = () => {
    if (!splittingOp || splitValue <= 0 || splitValue >= splittingOp.quantity) return;

    const instancesToMove = splittingOp.partInstanceIds.slice(0, splitValue);
    const nextSplitNum = assignments
      .filter(a => a.workOrderId === splittingOp.workOrderId && a.operationId === splittingOp.operationId)
      .reduce((max, a) => {
        const num = parseInt(a.splitId || '0');
        return isNaN(num) ? max : Math.max(max, num);
      }, 0) + 1;

    const splitId = nextSplitNum.toString().padStart(2, '0');
    
    updateAssignment(
      splittingOp.workOrderId, 
      instancesToMove, 
      splittingOp.operationId, 
      [], // Keep same employee? No, splitting creates a new group that can be moved.
      undefined, // Keep same date?
      splittingOp.status,
      splitId
    );

    setSplittingOp(null);
    setSplitValue(1);
  };

  const handleDone = (op: UnassignedOp) => {
    updateAssignment(op.workOrderId, op.partInstanceIds, op.operationId, [], undefined, 'Completed');
  };

  const activeOp = activeId ? (unassignedOps.find(o => o.id === activeId) || 
    (() => {
      // Look in assigned ops if not in unassigned
      for (const emp of employees) {
        for (const day of (showExtendedView ? extendedDays : days)) {
          const dateStr = day.toISOString().split('T')[0];
          const empAssignments = assignments.filter(a => a.employeeIds.includes(emp.id) && a.scheduledDate === dateStr);
          const grouped = Array.from(empAssignments.reduce((acc, a) => {
            const wo = workOrders.find(w => w.id === a.workOrderId);
            const part = wo?.parts.find(p => p.instanceId === a.partInstanceId);
            if (!wo || !part) return acc;
            const depsHash = JSON.stringify((part.partDependencies || []).sort());
            const totalPartQty = wo.parts.filter(p => p.id === part.id).length;
            const key = `${wo.id}-${part.id}-${a.operationId}-${depsHash}-${a.splitId || ''}`;
            if (!acc.has(key)) {
              const opDetails = operations.find(o => o.id === a.operationId);
              acc.set(key, {
                id: key,
                workOrderId: wo.id,
                workOrderName: wo.name,
                partId: part.id,
                partName: part.name,
                partInstanceIds: [],
                quantity: 0,
                totalQuantity: totalPartQty,
                operationId: a.operationId,
                operationName: `${wo.name}-${opDetails?.name || 'Unknown'}`,
                estimatedTimeMinutes: part.operations.find(o => o.operationId === a.operationId)?.estimatedTimeMinutes || 0,
                requiredSkillId: opDetails?.requiredSkillId,
                status: a.status,
                splitId: a.splitId
              });
            }
            const group = acc.get(key)!;
            group.partInstanceIds.push(a.partInstanceId);
            group.quantity += 1;
            return acc;
          }, new Map<string, UnassignedOp>()).values());
          const found = grouped.find(o => o.id === activeId);
          if (found) return found;
        }
      }
      return null;
    })()
  ) : null;

  const renderSchedule = (targetDays: Date[]) => {
    const displayDays = isMobile ? [new Date(selectedMobileDate)] : targetDays;

    return (
      <div className="overflow-x-auto">
        {/* Mobile Date Navigation */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
            <button 
              onClick={() => navigateMobileDate('prev')}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center">
              <input 
                type="date"
                value={selectedMobileDate}
                onChange={(e) => setSelectedMobileDate(e.target.value)}
                className="text-sm font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 text-center"
              />
              <span className="text-[10px] text-slate-500 font-medium">
                {new Date(selectedMobileDate).toLocaleDateString('fr-FR', { weekday: 'long' })}
              </span>
            </div>
            <button 
              onClick={() => navigateMobileDate('next')}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        <table className="min-w-full border-collapse">
          <thead>
            <tr className={isMobile ? 'hidden' : ''}>
              <th className="sticky left-0 z-10 bg-white p-4 text-left text-xs font-bold text-slate-400 uppercase border-b border-slate-200 min-w-[200px]">Employee</th>
              {displayDays.map(day => (
                <th key={day.toISOString()} className="p-4 text-center border-b border-slate-200 min-w-[200px]">
                  <div className="text-sm font-bold text-slate-900">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-xs text-slate-500">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={isMobile ? 'flex flex-col' : ''}>
            {filteredEmployees.map(emp => {
              const isExpanded = expandedEmployees.has(emp.id) || !isMobile;
              
              return (
                <React.Fragment key={emp.id}>
                  {/* Employee Header Row (Mobile) */}
                  {isMobile && (
                    <tr 
                      className="bg-slate-50 border-b border-slate-100 cursor-pointer"
                      onClick={() => toggleEmployeeExpansion(emp.id)}
                    >
                      <td className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="text-sm font-bold text-slate-900">{emp.name}</div>
                        </div>
                        {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
                      </td>
                    </tr>
                  )}

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr 
                        initial={isMobile ? { height: 0, opacity: 0 } : false}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`group hover:bg-slate-50/50 transition-colors ${isMobile ? 'flex flex-col' : ''}`}
                      >
                        <td className={`sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 p-4 border-b border-slate-100 ${isMobile ? 'hidden' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{emp.name}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(emp.skills || []).slice(0, 2).map(s => {
                                  const skill = skills.find(sk => sk.id === s.skillId);
                                  return (
                                    <span key={s.skillId} className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded uppercase font-bold">
                                      {skill?.name}
                                    </span>
                                  );
                                })}
                                {(emp.skills || []).length > 2 && <span className="text-[8px] text-slate-400">+{(emp.skills || []).length - 2}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        {displayDays.map(day => {
                          const dateStr = day.toISOString().split('T')[0];
                          const empAssignments = assignments.filter(a => 
                            a.employeeIds.includes(emp.id) && a.scheduledDate === dateStr
                          );
                          
                          const loadMinutes = empAssignments.reduce((acc, a) => {
                            const wo = workOrders.find(w => w.id === a.workOrderId);
                            const part = wo?.parts.find(p => p.instanceId === a.partInstanceId);
                            const op = part?.operations.find(o => o.operationId === a.operationId);
                            return acc + (op?.estimatedTimeMinutes || 0);
                          }, 0);

                          // Group assignments for dragging
                          const groupedAssignments = Array.from(empAssignments.reduce((acc, a) => {
                            const wo = workOrders.find(w => w.id === a.workOrderId);
                            const part = wo?.parts.find(p => p.instanceId === a.partInstanceId);
                            if (!wo || !part) return acc;
                            
                            const depsHash = JSON.stringify((part.partDependencies || []).sort());
                            const totalPartQty = wo.parts.filter(p => p.id === part.id).length;
                            const key = `${wo.id}-${part.id}-${a.operationId}-${depsHash}-${a.splitId || ''}`;
                            
                            if (!acc.has(key)) {
                              const opDetails = operations.find(o => o.id === a.operationId);
                              acc.set(key, {
                                id: key,
                                workOrderId: wo.id,
                                workOrderName: wo.name,
                                partId: part.id,
                                partName: part.name,
                                partInstanceIds: [],
                                quantity: 0,
                                totalQuantity: totalPartQty,
                                operationId: a.operationId,
                                operationName: opDetails?.name || 'Unknown',
                                estimatedTimeMinutes: part.operations.find(o => o.operationId === a.operationId)?.estimatedTimeMinutes || 0,
                                requiredSkillId: opDetails?.requiredSkillId,
                                status: a.status,
                                splitId: a.splitId,
                                isLocked: a.isLocked
                              });
                            }
                            const group = acc.get(key)!;
                            group.partInstanceIds.push(a.partInstanceId);
                            group.quantity += 1;
                            return acc;
                          }, new Map<string, UnassignedOp>()).values());

                          return (
                            <td key={dateStr} className={`p-2 border-b border-slate-100 border-l border-slate-50 ${isMobile ? 'w-full' : ''}`}>
                              <DroppableCell 
                                id={`${emp.id}|${dateStr}`} 
                                loadMinutes={loadMinutes}
                                employeeSkills={emp.skills || []}
                              >
                                <div className={isMobile ? 'grid grid-cols-1 gap-2' : ''}>
                                  {groupedAssignments.map(op => (
                                    <DraggableOp 
                                      key={op.id} 
                                      op={op} 
                                      isAssigned 
                                      isQualified={!op.requiredSkillId || (emp.skills || []).some(s => s.skillId === op.requiredSkillId)}
                                      onSplit={(op) => { setSplittingOp(op); setSplitValue(Math.floor(op.quantity / 2) || 1); }}
                                      onDone={handleDone}
                                      onToggleLock={handleToggleLock}
                                    />
                                  ))}
                                  {isMobile && groupedAssignments.length === 0 && (
                                    <div className="py-4 text-center text-[10px] text-slate-300 italic">Aucune tâche assignée</div>
                                  )}
                                </div>
                              </DroppableCell>
                            </td>
                          );
                        })}
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center justify-between w-full md:w-auto">
              <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Schedule
                </h1>
                <p className="hidden md:block text-sm text-slate-500">Manage daily assignments and workload balance</p>
              </div>
              
              <div className="md:hidden flex items-center gap-2 bg-purple-50 p-1 rounded-xl border border-purple-100">
                <button
                  onClick={() => handleAiPlan('assign')}
                  disabled={isAiLoading}
                  className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  title="Assigner Auto"
                >
                  {isAiLoading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="hidden md:flex items-center gap-2 bg-purple-50 p-1 rounded-xl border border-purple-100">
                <button
                  onClick={() => handleAiPlan('assign')}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <SparklesIcon className="w-3.5 h-3.5" />}
                  Assigner Auto
                </button>
                <button
                  onClick={() => handleAiPlan('resort')}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white text-purple-600 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <RefreshIcon className="w-3.5 h-3.5" />
                  Réorganiser
                </button>
              </div>

              <div className="relative flex-1 md:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="w-full pl-9 pr-4 py-2 text-sm border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="text-sm border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
              >
                <option value="">All Skills</option>
                {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button
                onClick={() => setShowExtendedView(!showExtendedView)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  showExtendedView 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Maximize2Icon className="w-4 h-4" />
                {showExtendedView ? 'Back to 5-Day' : 'More (3 Weeks)'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile Tab Switcher */}
          <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex bg-white rounded-full shadow-2xl border border-slate-200 p-1">
            <button
              onClick={() => setActiveMobileTab('schedule')}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeMobileTab === 'schedule' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
            >
              Horaire
            </button>
            <button
              onClick={() => setActiveMobileTab('unassigned')}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeMobileTab === 'unassigned' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
            >
              Non-attribués ({unassignedOps.length})
            </button>
          </div>

          {/* Main Grid */}
          <div className={`flex-1 overflow-auto bg-white ${activeMobileTab === 'unassigned' ? 'hidden md:block' : 'block'}`}>
            {showExtendedView ? renderSchedule(extendedDays) : renderSchedule(days)}
          </div>

          {/* Sidebar: Unassigned Operations */}
          {!showExtendedView && (
            <div className={`w-full md:w-80 bg-slate-50 border-l border-slate-200 flex flex-col ${activeMobileTab === 'schedule' ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-slate-200 bg-white">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-amber-500" />
                  Unassigned Operations
                  <span className="ml-auto bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                    {unassignedOps.length}
                  </span>
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
                <AnimatePresence>
                  {unassignedOps.map(op => (
                    <motion.div
                      key={op.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        if (isMobile) {
                          setAssigningOp(op);
                        }
                      }}
                    >
                      <DraggableOp op={op} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {unassignedOps.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ClockIcon className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400">All operations are assigned!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Planning Modal */}
      <AnimatePresence>
        {isAiPlanning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-purple-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BotIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Proposition du Planificateur IA</h3>
                    <p className="text-xs text-purple-600 font-medium">Analyse et optimisation terminées</p>
                  </div>
                </div>
                <button onClick={() => setIsAiPlanning(false)} className="p-2 hover:bg-purple-100 rounded-full transition-colors">
                  <LucideXIcon className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <MessageSquareIcon className="w-4 h-4 text-blue-500" />
                    Justification Stratégique
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "{aiJustification}"
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Modifications Proposées ({aiProposal?.length})</h4>
                  <div className="space-y-2">
                    {aiProposal?.map((p: AiProposal, idx: number) => {
                      const wo = workOrders.find(w => w.id === p.workOrderId);
                      const op = operations.find(o => o.id === p.operationId);
                      const emp = employees.find(e => e.id === p.employeeIds[0]);
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-purple-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{wo?.name} - {op?.name}</p>
                              <p className="text-[10px] text-slate-500">Assigné à: <span className="font-bold text-purple-600">{emp?.name}</span> le {p.scheduledDate}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold">Nouveau</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setIsAiPlanning(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Rejeter
                </button>
                <button
                  onClick={applyAiProposal}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckIcon className="w-4 h-4" />
                  Confirmer la modification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Quick Assign Modal */}
      <AnimatePresence>
        {assigningOp && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assignation Rapide</h3>
                  <p className="text-xs text-slate-500">{assigningOp.workOrderName} - {assigningOp.operationName}</p>
                </div>
                <button onClick={() => setAssigningOp(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <LucideXIcon className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Date d'exécution</label>
                  <input 
                    type="date" 
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    Choisir un opérateur 
                    {assigningOp.requiredSkillId && (
                      <span className="ml-2 text-blue-600 font-bold">
                        (Requis: {skills.find(s => s.id === assigningOp.requiredSkillId)?.name})
                      </span>
                    )}
                  </label>
                  <div className="space-y-2">
                    {employees
                      .filter(emp => !assigningOp.requiredSkillId || emp.skills.some(s => s.skillId === assigningOp.requiredSkillId))
                      .map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => {
                            updateAssignment(
                              assigningOp.workOrderId,
                              assigningOp.partInstanceIds,
                              assigningOp.operationId,
                              [emp.id],
                              assignDate,
                              assigningOp.status,
                              assigningOp.splitId
                            );
                            setAssigningOp(null);
                            setActiveMobileTab('schedule');
                          }}
                          className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{emp.name}</p>
                              <p className="text-[10px] text-slate-500">{emp.role}</p>
                            </div>
                          </div>
                          <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-blue-500 group-hover:bg-blue-500 flex items-center justify-center transition-all">
                            <CheckIcon className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DragOverlay>
        {activeId && activeOp ? (
          <div className="p-2 bg-white border-2 border-blue-500 rounded-lg shadow-xl cursor-grabbing w-64 rotate-3">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase truncate">{activeOp.workOrderName}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded font-bold">
                  {activeOp.quantity}/{activeOp.totalQuantity}
                </span>
                <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{activeOp.estimatedTimeMinutes}m</span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-900 truncate">
              {activeOp.partName} {activeOp.splitId ? `-${activeOp.splitId}` : ''}
            </p>
            <p className="text-[10px] text-slate-500">{activeOp.operationName}</p>
          </div>
        ) : null}
      </DragOverlay>

      {/* Split Modal */}
      <AnimatePresence>
        {splittingOp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Split Operation</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Select quantity to split from the current group of {splittingOp.quantity}.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Quantity to Split</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max={splittingOp.quantity - 1}
                        value={splitValue}
                        onChange={(e) => setSplitValue(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <span className="text-lg font-bold text-blue-600 w-12 text-center">{splitValue}</span>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                      <span>Original: {splittingOp.quantity - splitValue}</span>
                      <span>New Group: {splitValue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setSplittingOp(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSplit}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-200 transition-colors"
                  >
                    Confirm Split
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DndContext>
  );
};
