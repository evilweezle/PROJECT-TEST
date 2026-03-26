import React, { useState, useMemo } from 'react';
import type { Client, Operation, Part, WorkOrder, Employee, Team, PartOperation, Skill, Material, EmployeeSkill, NonConformity, NonConformityStatus, NonConformitySeverity } from '../types';

interface ClientFormProps {
  onSubmit: (client: Omit<Client, 'id'> | Client) => void;
  onCancel: () => void;
  initialData?: Client | null;
}

export const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      if (initialData) {
        onSubmit({ ...initialData, name });
      } else {
        onSubmit({ name });
      }
    }
  };

  const submitText = initialData ? 'Save Changes' : 'Add Client';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="clientName" className="block text-sm font-medium text-slate-700">Client Name</label>
        <input
          type="text"
          id="clientName"
          value={name}
          // FIX: Add explicit type to event parameter to resolve type inference issue.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
      </div>
    </form>
  );
};


interface OperationFormProps {
    onSubmit: (operation: Omit<Operation, 'id'> | Operation) => void;
    onCancel: () => void;
    initialData?: Operation | null;
}

export const OperationForm: React.FC<OperationFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [rate, setRate] = useState(initialData?.rate || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && rate >= 0) {
            if (initialData) {
                onSubmit({ ...initialData, name, rate: Number(rate) });
            } else {
                onSubmit({ name, rate: Number(rate) });
            }
        }
    };
    
    const submitText = initialData ? 'Save Changes' : 'Add Operation';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="opName" className="block text-sm font-medium text-slate-700">Operation Name</label>
                <input
                    type="text"
                    id="opName"
                    value={name}
                    // FIX: Add explicit type to event parameter to resolve type inference issue.
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                />
            </div>
            <div>
                <label htmlFor="opRate" className="block text-sm font-medium text-slate-700">Hourly Rate ($)</label>
                <input
                    type="number"
                    id="opRate"
                    value={rate}
                    // FIX: Add explicit type to event parameter to resolve type inference issue.
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRate(parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                    min="0"
                    step="0.01"
                />
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
            </div>
        </form>
    );
};

interface PartFormProps {
    operations: Operation[];
    materials: Material[];
    onSubmit: (part: Omit<Part, 'id'> | Part) => void;
    onCancel: () => void;
    initialData?: Part | null;
}

export const PartForm: React.FC<PartFormProps> = ({ operations, materials, onSubmit, onCancel, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [materialId, setMaterialId] = useState(initialData?.materialId || '');
    const [partOps, setPartOps] = useState<PartOperation[]>(initialData?.operations || []);

    const handleOpChange = (opId: string, checked: boolean) => {
        if (checked) {
            // FIX: Add missing `dependencies` and `delayDays` properties to satisfy the `PartOperation` type.
            setPartOps(prev => [...prev, { operationId: opId, estimatedTimeMinutes: 60, dependencies: [], delayDays: 0 }]);
        } else {
            setPartOps(prev => prev.filter(po => po.operationId !== opId));
        }
    };

    const handleTimeChange = (opId: string, time: number) => {
        setPartOps(prev => prev.map(po => 
            po.operationId === opId ? { ...po, estimatedTimeMinutes: Math.max(0, time) } : po
        ));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && materialId && partOps.length > 0) {
            if (initialData) {
                onSubmit({ ...initialData, name, materialId, operations: partOps });
            } else {
                onSubmit({ name, materialId, operations: partOps });
            }
        }
    };

    const submitText = initialData ? 'Save Changes' : 'Add Part';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="partName" className="block text-sm font-medium text-slate-700">Part Name</label>
                <input
                    type="text"
                    id="partName"
                    value={name}
                    // FIX: Add explicit type to event parameter to resolve type inference issue.
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                />
            </div>
            <div>
                <label htmlFor="partMaterial" className="block text-sm font-medium text-slate-700">Material</label>
                <select
                    id="partMaterial"
                    value={materialId}
                    // FIX: Add explicit type to event parameter to resolve type inference issue.
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMaterialId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                >
                    <option value="" disabled>Select a material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Operations</label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-slate-300 rounded-md p-2">
                    {operations.map(op => {
                        const currentPartOp = partOps.find(po => po.operationId === op.id);
                        const isChecked = !!currentPartOp;
                        return (
                            <div key={op.id}>
                                <div className="flex items-center">
                                    <input
                                        id={`op-${op.id}`}
                                        type="checkbox"
                                        checked={isChecked}
                                        // FIX: Add explicit type to event parameter to resolve type inference issue.
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOpChange(op.id, e.target.checked)}
                                        className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                                    />
                                    <label htmlFor={`op-${op.id}`} className="ml-3 text-sm text-slate-600 flex-1">{op.name}</label>
                                </div>
                                {isChecked && (
                                    <div className="mt-1 ml-7 flex items-center">
                                        <input
                                            type="number"
                                            value={currentPartOp.estimatedTimeMinutes}
                                            // FIX: Add explicit type to event parameter to resolve type inference issue.
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange(op.id, parseInt(e.target.value, 10) || 0)}
                                            className="block w-24 rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                                            min="0"
                                            step="15"
                                        />
                                        <span className="ml-2 text-sm text-slate-500">minutes</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
             <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
            </div>
        </form>
    );
};


interface WorkOrderFormProps {
    clients: Client[];
    parts: Part[];
    onSubmit: (workOrder: Omit<WorkOrder, 'id' | 'parts' | 'finishDate'> & { 
        partIds: string[]; 
        partDependencies?: Record<string, string[]>;
        id?: string 
    }) => void;
    onCancel: () => void;
    initialData?: WorkOrder | null;
}

export const WorkOrderForm: React.FC<WorkOrderFormProps> = ({ clients, parts, onSubmit, onCancel, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [clientId, setClientId] = useState(initialData?.clientId || '');
    const [startDate, setStartDate] = useState(initialData?.startDate || '');
    const [selectedParts, setSelectedParts] = useState<string[]>(initialData?.parts.map(p => p.id) || []);
    const [partDeps, setPartDeps] = useState<Record<string, string[]>>(() => {
        if (initialData?.parts) {
            const deps: Record<string, string[]> = {};
            initialData.parts.forEach(p => {
                if (p.partDependencies && p.partDependencies.length > 0) {
                    deps[p.id] = p.partDependencies.map(depInstanceId => {
                        const depPart = initialData.parts.find(dp => dp.instanceId === depInstanceId);
                        return depPart ? depPart.id : '';
                    }).filter(id => id !== '');
                }
            });
            return deps;
        }
        return {};
    });

    const handlePartChange = (partId: string) => {
        setSelectedParts(prev => {
            const isSelected = prev.includes(partId);
            if (isSelected) {
                // Remove part and its dependencies
                const newSelected = prev.filter(id => id !== partId);
                const newDeps = { ...partDeps };
                delete newDeps[partId];
                // Also remove it as a dependency from others
                Object.keys(newDeps).forEach(key => {
                    newDeps[key] = newDeps[key].filter(id => id !== partId);
                });
                setPartDeps(newDeps);
                return newSelected;
            } else {
                return [...prev, partId];
            }
        });
    };

    const handleDepChange = (partId: string, depId: string) => {
        setPartDeps(prev => {
            const currentDeps = prev[partId] || [];
            const newDeps = currentDeps.includes(depId)
                ? currentDeps.filter(id => id !== depId)
                : [...currentDeps, depId];
            return { ...prev, [partId]: newDeps };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && clientId && startDate && selectedParts.length > 0) {
            if (initialData) {
                onSubmit({
                    ...initialData,
                    name,
                    clientId,
                    startDate,
                    partIds: selectedParts,
                    partDependencies: partDeps
                });
            } else {
                onSubmit({
                    name,
                    clientId,
                    startDate,
                    partIds: selectedParts,
                    partDependencies: partDeps
                });
            }
        }
    };
    
    const submitText = initialData ? 'Save Changes' : 'Add Work Order';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="woName" className="block text-sm font-medium text-slate-700">Work Order Name</label>
                <input
                    type="text"
                    id="woName"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                />
            </div>
            <div>
                <label htmlFor="woClient" className="block text-sm font-medium text-slate-700">Client</label>
                <select
                    id="woClient"
                    value={clientId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                >
                    <option value="" disabled>Select a client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="woDate" className="block text-sm font-medium text-slate-700">Start Date</label>
                <input
                    type="date"
                    id="woDate"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Select Parts</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-slate-300 rounded-md p-2">
                    {parts.map(p => (
                        <div key={p.id} className="flex items-center">
                            <input
                                id={`part-${p.id}`}
                                type="checkbox"
                                checked={selectedParts.includes(p.id)}
                                onChange={() => handlePartChange(p.id)}
                                className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                            />
                            <label htmlFor={`part-${p.id}`} className="ml-3 text-sm text-slate-600">{p.name}</label>
                        </div>
                    ))}
                </div>
            </div>

            {selectedParts.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-slate-700">Define Part Dependencies</label>
                    <p className="text-xs text-slate-500 mb-2">Specify which parts must be finished before another part can start.</p>
                    <div className="space-y-3 border border-slate-200 rounded-md p-3 bg-slate-50">
                        {selectedParts.map(partId => {
                            const part = parts.find(p => p.id === partId);
                            if (!part) return null;
                            const otherParts = selectedParts.filter(id => id !== partId);
                            
                            return (
                                <div key={partId} className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                                    <div className="text-sm font-medium text-slate-800 mb-1">{part.name} depends on:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {otherParts.length > 0 ? (
                                            otherParts.map(otherId => {
                                                const otherPart = parts.find(p => p.id === otherId);
                                                return (
                                                    <label key={otherId} className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs text-slate-700 cursor-pointer hover:bg-slate-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={(partDeps[partId] || []).includes(otherId)}
                                                            onChange={() => handleDepChange(partId, otherId)}
                                                            className="h-3 w-3 text-[#0078d4] border-slate-300 rounded mr-1"
                                                        />
                                                        {otherPart?.name}
                                                    </label>
                                                );
                                            })
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">No other parts selected</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
            </div>
        </form>
    );
};

interface EmployeeFormProps {
    skills: Skill[];
    onSubmit: (employee: Omit<Employee, 'id'> | Employee) => void;
    onCancel: () => void;
    initialData?: Employee | null;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ skills: allSkills, onSubmit, onCancel, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [role, setRole] = useState(initialData?.role || '');
    const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>(initialData?.skills || []);

    const handleSkillChange = (skillId: string, checked: boolean) => {
        if (checked) {
            setEmployeeSkills(prev => [...prev, { skillId, certified: false }]);
        } else {
            setEmployeeSkills(prev => prev.filter(s => s.skillId !== skillId));
        }
    };

    const handleCertificationChange = (skillId: string, certified: boolean) => {
        setEmployeeSkills(prev => prev.map(s => s.skillId === skillId ? { ...s, certified } : s));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && role) {
            if (initialData) {
                onSubmit({ ...initialData, name, role, skills: employeeSkills });
            } else {
                onSubmit({ name, role, skills: employeeSkills });
            }
        }
    };

    const submitText = initialData ? 'Save Changes' : 'Add Employee';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="employeeName" className="block text-sm font-medium text-slate-700">Employee Name</label>
                <input
                    type="text"
                    id="employeeName"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                />
            </div>
            <div>
                <label htmlFor="employeeRole" className="block text-sm font-medium text-slate-700">Role</label>
                <input
                    type="text"
                    id="employeeRole"
                    value={role}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRole(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Skills</label>
                <div className="mt-2 space-y-3 max-h-60 overflow-y-auto border border-slate-300 rounded-md p-3">
                    {allSkills.map(skill => {
                        const currentEmployeeSkill = employeeSkills.find(s => s.skillId === skill.id);
                        const isSkillAssigned = !!currentEmployeeSkill;
                        
                        return (
                            <div key={skill.id} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id={`skill-assign-${skill.id}`}
                                        type="checkbox"
                                        checked={isSkillAssigned}
                                        onChange={(e) => handleSkillChange(skill.id, e.target.checked)}
                                        className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                                    />
                                    <label htmlFor={`skill-assign-${skill.id}`} className="ml-3 text-sm text-slate-700">{skill.name}</label>
                                </div>
                                {isSkillAssigned && (
                                    <div className="flex items-center">
                                        <input
                                            id={`skill-cert-${skill.id}`}
                                            type="checkbox"
                                            checked={currentEmployeeSkill?.certified || false}
                                            onChange={(e) => handleCertificationChange(skill.id, e.target.checked)}
                                            disabled={!isSkillAssigned}
                                            className="h-4 w-4 text-green-600 border-slate-300 rounded focus:ring-green-500 disabled:opacity-50"
                                        />
                                        <label htmlFor={`skill-cert-${skill.id}`} className="ml-2 text-sm text-slate-500">Certified</label>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
            </div>
        </form>
    );
};


interface TeamFormProps {
    employees: Employee[];
    onSubmit: (team: Omit<Team, 'id'> | Team) => void;
    onCancel: () => void;
    initialData?: Team | null;
}

export const TeamForm: React.FC<TeamFormProps> = ({ employees, onSubmit, onCancel, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>(initialData?.employeeIds || []);

    const handleEmployeeChange = (empId: string) => {
        setSelectedEmployees(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name) {
            if (initialData) {
                onSubmit({ ...initialData, name, employeeIds: selectedEmployees });
            } else {
                onSubmit({ name, employeeIds: selectedEmployees });
            }
        }
    };

    const submitText = initialData ? 'Save Changes' : 'Add Team';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="teamName" className="block text-sm font-medium text-slate-700">Team Name</label>
                <input
                    type="text"
                    id="teamName"
                    value={name}
                    // FIX: Add explicit type to event parameter to resolve type inference issue.
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Members</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-slate-300 rounded-md p-2">
                    {employees.map(emp => (
                        <div key={emp.id} className="flex items-center">
                            <input
                                id={`emp-${emp.id}`}
                                type="checkbox"
                                checked={selectedEmployees.includes(emp.id)}
                                onChange={() => handleEmployeeChange(emp.id)}
                                className="h-4 w-4 text-[#0078d4] border-slate-300 rounded focus:ring-[#0078d4]"
                            />
                            <label htmlFor={`emp-${emp.id}`} className="ml-3 text-sm text-slate-600">{emp.name}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
            </div>
        </form>
    );
};

interface SkillFormProps {
  onSubmit: (skill: Omit<Skill, 'id'> | Skill) => void;
  onCancel: () => void;
  initialData?: Skill | null;
}

export const SkillForm: React.FC<SkillFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      if (initialData) {
        onSubmit({ ...initialData, name });
      } else {
        onSubmit({ name });
      }
    }
  };

  const submitText = initialData ? 'Save Changes' : 'Add Skill';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="skillName" className="block text-sm font-medium text-slate-700">Skill Name</label>
        <input
          type="text"
          id="skillName"
          value={name}
          // FIX: Add explicit type to event parameter to resolve type inference issue.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
      </div>
    </form>
  );
};

interface MaterialFormProps {
  onSubmit: (material: Omit<Material, 'id'> | Material) => void;
  onCancel: () => void;
  initialData?: Material | null;
}

export const MaterialForm: React.FC<MaterialFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [grade, setGrade] = useState(initialData?.grade || '');
  const [thicknessGauge, setThicknessGauge] = useState(initialData?.thicknessGauge || 0);
  const [pricePerLbs, setPricePerLbs] = useState(initialData?.pricePerLbs || 0);
  const [pricePerSqFt, setPricePerSqFt] = useState(initialData?.pricePerSqFt || 0);
  const [cost, setCost] = useState(initialData?.cost || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && grade) {
      if (initialData) {
        onSubmit({ 
          ...initialData,
          name,
          grade,
          thicknessGauge: Number(thicknessGauge),
          pricePerLbs: Number(pricePerLbs),
          pricePerSqFt: Number(pricePerSqFt),
          cost: Number(cost),
        });
      } else {
        onSubmit({ 
          name,
          grade,
          thicknessGauge: Number(thicknessGauge),
          pricePerLbs: Number(pricePerLbs),
          pricePerSqFt: Number(pricePerSqFt),
          cost: Number(cost),
        });
      }
    }
  };

  const submitText = initialData ? 'Save Changes' : 'Add Material';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <label htmlFor="matName" className="block text-sm font-medium text-slate-700">Material Name</label>
        <input
          type="text"
          id="matName"
          value={name}
          // FIX: Add explicit type to event parameter to resolve type inference issue.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          required
        />
      </div>
      <div>
        <label htmlFor="matGrade" className="block text-sm font-medium text-slate-700">Grade</label>
        <input
          type="text"
          id="matGrade"
          value={grade}
          // FIX: Add explicit type to event parameter to resolve type inference issue.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGrade(e.target.value)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          required
        />
      </div>
      <div>
        <label htmlFor="matThick" className="block text-sm font-medium text-slate-700">Thickness (Gauge)</label>
        <input
          type="number"
          id="matThick"
          value={thicknessGauge}
          // FIX: Add explicit type to event parameter to resolve type inference issue.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setThicknessGauge(parseInt(e.target.value, 10) || 0)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          min="0"
        />
      </div>
      <div>
        <label htmlFor="matPriceLbs" className="block text-sm font-medium text-slate-700">Price ($/lbs)</label>
        <input
          type="number"
          id="matPriceLbs"
          value={pricePerLbs}
          // FIX: Add explicit type to event parameter to resolve type inference issue.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPricePerLbs(parseFloat(e.target.value) || 0)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          min="0"
          step="0.01"
        />
      </div>
      <div>
        <label htmlFor="matPriceSqFt" className="block text-sm font-medium text-slate-700">Price ($/sq. ft.)</label>
        <input
          type="number"
          id="matPriceSqFt"
          value={pricePerSqFt}
          // FIX: Add explicit type to event parameter to resolve type inference issue.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPricePerSqFt(parseFloat(e.target.value) || 0)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          min="0"
          step="0.01"
        />
      </div>
      <div>
        <label htmlFor="matCost" className="block text-sm font-medium text-slate-700">Cost ($/unit)</label>
        <input
          type="number"
          id="matCost"
          value={cost}
          // FIX: Add explicit type to event parameter to resolve type inference issue.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCost(parseFloat(e.target.value) || 0)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-[#0078d4] focus:ring-[#0078d4] sm:text-sm"
          min="0"
          step="0.01"
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
      </div>
    </form>
  );
};

interface NonConformityFormProps {
  workOrders: WorkOrder[];
  operations: Operation[];
  onSubmit: (nonConformity: Omit<NonConformity, 'id'> | NonConformity) => void;
  onCancel: () => void;
  initialData?: NonConformity | null;
}

export const NonConformityForm: React.FC<NonConformityFormProps> = ({ workOrders, operations, onSubmit, onCancel, initialData }) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [workOrderId, setWorkOrderId] = useState(initialData?.workOrderId || '');
  const [partInstanceId, setPartInstanceId] = useState(initialData?.partInstanceId || '');
  const [operationId, setOperationId] = useState(initialData?.operationId || '');
  const [status, setStatus] = useState<NonConformityStatus>(initialData?.status || 'Open');
  const [severity, setSeverity] = useState<NonConformitySeverity>(initialData?.severity || 'Medium');
  const [dateReported, setDateReported] = useState(initialData?.dateReported || new Date().toISOString().split('T')[0]);
  const [actionsTaken, setActionsTaken] = useState(initialData?.actionsTaken || '');

  const availableParts = useMemo(() => {
    if (!workOrderId) return [];
    const wo = workOrders.find(w => w.id === workOrderId);
    return wo ? wo.parts : [];
  }, [workOrderId, workOrders]);

  const availableOperations = useMemo(() => {
    if (!partInstanceId) return [];
    const part = availableParts.find(p => p.instanceId === partInstanceId);
    if (!part) return [];
    return part.operations.map(op => operations.find(o => o.id === op.operationId)).filter((o): o is Operation => !!o);
  }, [partInstanceId, availableParts, operations]);

  const handleWorkOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setWorkOrderId(e.target.value);
    setPartInstanceId('');
    setOperationId('');
  };

  const handlePartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPartInstanceId(e.target.value);
    setOperationId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description && workOrderId && partInstanceId && operationId && dateReported) {
      if (initialData) {
        onSubmit({
          ...initialData,
          description,
          workOrderId,
          partInstanceId,
          operationId,
          status,
          severity,
          dateReported,
          actionsTaken
        });
      } else {
        onSubmit({
          description,
          workOrderId,
          partInstanceId,
          operationId,
          status,
          severity,
          dateReported,
          actionsTaken
        });
      }
    }
  };

  const submitText = initialData ? 'Save Changes' : 'Add Non-Conformity';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ncWorkOrder" className="block text-sm font-medium text-slate-700">Work Order</label>
          <select id="ncWorkOrder" value={workOrderId} onChange={handleWorkOrderChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required>
            <option value="" disabled>Select Work Order</option>
            {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ncPart" className="block text-sm font-medium text-slate-700">Part</label>
          <select id="ncPart" value={partInstanceId} onChange={handlePartChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required disabled={!workOrderId}>
            <option value="" disabled>Select Part</option>
            {availableParts.map(p => <option key={p.instanceId} value={p.instanceId}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ncOperation" className="block text-sm font-medium text-slate-700">Operation</label>
          <select id="ncOperation" value={operationId} onChange={e => setOperationId(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required disabled={!partInstanceId}>
            <option value="" disabled>Select Operation</option>
            {availableOperations.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
          </select>
        </div>
         <div>
          <label htmlFor="ncDate" className="block text-sm font-medium text-slate-700">Date Reported</label>
          <input type="date" id="ncDate" value={dateReported} onChange={e => setDateReported(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required />
        </div>
        <div>
          <label htmlFor="ncStatus" className="block text-sm font-medium text-slate-700">Status</label>
          <select id="ncStatus" value={status} onChange={e => setStatus(e.target.value as NonConformityStatus)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
        </div>
        <div>
          <label htmlFor="ncSeverity" className="block text-sm font-medium text-slate-700">Severity</label>
          <select id="ncSeverity" value={severity} onChange={e => setSeverity(e.target.value as NonConformitySeverity)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ncDescription" className="block text-sm font-medium text-slate-700">Description</label>
        <textarea id="ncDescription" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required></textarea>
      </div>
       <div>
        <label htmlFor="ncActions" className="block text-sm font-medium text-slate-700">Actions Taken</label>
        <textarea id="ncActions" value={actionsTaken} onChange={e => setActionsTaken(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"></textarea>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#0078d4] border border-transparent rounded-md hover:bg-[#106ebe]">{submitText}</button>
      </div>
    </form>
  );
};
