import { useState, useEffect, useCallback, useRef } from 'react';
import type { Client, Operation, Part, WorkOrder, WorkOrderPart, Employee, Team, Assignment, Skill, Material, NonConformity, JobStatus, Quote, Assembly, DeliveryNote, Invoice, TimeEntry, InboundRequest } from '../types';

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 16;

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const extractPartsFromAssembly = (
  assemblyId: string, 
  assemblies: Assembly[], 
  parts: Part[], 
  multiplier: number = 1,
  parentAssemblyId?: string,
  depth: number = 0
): WorkOrderPart[] => {
  if (depth > 12) {
      console.error('Circular assembly detected or depth limit reached for assembly:', assemblyId);
      return [];
  }
  const assembly = assemblies.find(a => a.id === assemblyId);
  if (!assembly) return [];

  let result: WorkOrderPart[] = [];

  assembly.items.forEach(item => {
    if (item.type === 'part') {
      const partTemplate = parts.find(p => p.id === item.id);
      if (partTemplate) {
        for (let i = 0; i < item.quantity * multiplier; i++) {
          result.push({
            ...partTemplate,
            instanceId: Math.random().toString(36).slice(2, 11),
            operations: partTemplate.operations.map(op => ({ ...op, delayDays: 0, dependencies: op.dependencies || [] })),
            partDependencies: [],
            status: 'Pending',
            parentAssemblyId: parentAssemblyId || assemblyId
          });
        }
      }
    } else if (item.type === 'assembly') {
      result = [...result, ...extractPartsFromAssembly(item.id, assemblies, parts, item.quantity * multiplier, parentAssemblyId || assemblyId, depth + 1)];
    }
  });

  if (assembly.operations && assembly.operations.length > 0) {
    result.push({
      id: assembly.id,
      name: `Assemblage: ${assembly.name}`,
      materialId: '',
      operations: assembly.operations.map(op => ({ ...op, delayDays: 0, dependencies: op.dependencies || [] })),
      instanceId: Math.random().toString(36).slice(2, 11),
      partDependencies: [],
      status: 'Pending',
      parentAssemblyId: parentAssemblyId || assemblyId
    });
  }

  return result;
};

const addWorkingTime = (startDate: Date, minutesToAdd: number): Date => {
    const currentDate = new Date(startDate);
    let remainingMinutes = minutesToAdd;

    while (remainingMinutes > 0) {
        const day = currentDate.getDay();
        if (day === 6) { // Saturday
            currentDate.setDate(currentDate.getDate() + 2);
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
            continue;
        }
        if (day === 0) { // Sunday
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
            continue;
        }

        if (currentDate.getHours() >= WORK_END_HOUR) {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
            continue; 
        }

        if (currentDate.getHours() < WORK_START_HOUR) {
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
        }

        const endOfDay = new Date(currentDate);
        endOfDay.setHours(WORK_END_HOUR, 0, 0, 0);

        const minutesLeftInDay = (endOfDay.getTime() - currentDate.getTime()) / (1000 * 60);

        if (remainingMinutes <= minutesLeftInDay) {
            currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
            remainingMinutes = 0;
        } else {
            remainingMinutes -= minutesLeftInDay;
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
        }
    }
    return currentDate;
};

const calculateFinishDate = (startDateString: string, partsForWO: WorkOrderPart[]): string => {
  if (!partsForWO || partsForWO.length === 0 || !startDateString) {
    return startDateString;
  }

  const woStartDate = new Date(startDateString + 'T00:00:00');
  if (isNaN(woStartDate.getTime())) return startDateString;
  woStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
  
  const partFinishDates = new Map<string, Date>();
  let partsToCalculate = [...partsForWO];
  const maxPartIterations = partsToCalculate.length * partsToCalculate.length;
  let partIter = 0;
  let overallLatestEndDate: Date | null = null;

  while (partsToCalculate.length > 0 && partIter < maxPartIterations) {
      const nextBatch = partsToCalculate.filter(part => {
          const dependenciesMet = (part.partDependencies || []).every(depInstanceId => partFinishDates.has(depInstanceId));
          return dependenciesMet;
      });

      if (nextBatch.length === 0) break; // Circular dependency or stuck

      nextBatch.forEach(part => {
          let partBaseStartDate = new Date(woStartDate);
          (part.partDependencies || []).forEach(depInstanceId => {
              const depFinishDate = partFinishDates.get(depInstanceId)!;
              if (depFinishDate > partBaseStartDate) {
                  partBaseStartDate = new Date(depFinishDate);
              }
          });

          const opEndDates = new Map<string, Date>();
          let opsToCalculate = [...(part.operations || [])];
          const maxOpIterations = opsToCalculate.length * opsToCalculate.length;
          let opIter = 0;
          let partLatestEndDate: Date = new Date(partBaseStartDate);

          while(opsToCalculate.length > 0 && opIter < maxOpIterations) {
              opsToCalculate = opsToCalculate.filter(op => {
                  const opDepsMet = (op.dependencies || []).every(depId => opEndDates.has(depId));
                  if (!opDepsMet) return true;

                  let opStartDate = new Date(partBaseStartDate);
                  (op.dependencies || []).forEach(depId => {
                      const prereqEndDate = opEndDates.get(depId)!;
                      if (prereqEndDate > opStartDate) {
                          opStartDate = new Date(prereqEndDate);
                      }
                  });

                  if (op.delayDays > 0) {
                      let delayCounter = op.delayDays;
                      const currentDateForDelay = new Date(opStartDate);
                      while(delayCounter > 0) {
                          currentDateForDelay.setDate(currentDateForDelay.getDate() + 1);
                          const day = currentDateForDelay.getDay();
                          if(day !== 0 && day !== 6) {
                              delayCounter--;
                          }
                      }
                      opStartDate = currentDateForDelay;
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  }

                  const day = opStartDate.getDay();
                  if (day === 6) {
                      opStartDate.setDate(opStartDate.getDate() + 2);
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  } else if (day === 0) {
                      opStartDate.setDate(opStartDate.getDate() + 1);
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  } else if (opStartDate.getHours() >= WORK_END_HOUR) {
                      opStartDate.setDate(opStartDate.getDate() + 1);
                      const nextDay = opStartDate.getDay();
                      if (nextDay === 6) opStartDate.setDate(opStartDate.getDate() + 2);
                      if (nextDay === 0) opStartDate.setDate(opStartDate.getDate() + 1);
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  } else if (opStartDate.getHours() < WORK_START_HOUR) {
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  }

                  const opEndDate = addWorkingTime(new Date(opStartDate), op.estimatedTimeMinutes);
                  opEndDates.set(op.operationId, opEndDate);
                  if (opEndDate > partLatestEndDate) {
                      partLatestEndDate = opEndDate;
                  }
                  return false;
              });
              opIter++;
          }

          partFinishDates.set(part.instanceId, partLatestEndDate);
          if (!overallLatestEndDate || partLatestEndDate > overallLatestEndDate) {
              overallLatestEndDate = partLatestEndDate;
          }
          
          partsToCalculate = partsToCalculate.filter(p => p.instanceId !== part.instanceId);
      });
      partIter++;
  }

  if (!overallLatestEndDate) return startDateString;
  
  return formatDate(overallLatestEndDate);
};

interface ProjectData {
  clients: Client[];
  operations: Operation[];
  parts: Part[];
  assemblies: Assembly[];
  workOrders: WorkOrder[];
  employees: Employee[];
  teams: Team[];
  assignments: Assignment[];
  skills: Skill[];
  materials: Material[];
  nonConformities: NonConformity[];
  quotes: Quote[];
  deliveryNotes: DeliveryNote[];
  invoices: Invoice[];
  suppliers: Supplier[];
  purchases: Purchase[];
  timeEntries: TimeEntry[];
  inboundRequests: InboundRequest[];
  bendingSettings: BendingSettings;
  laserSettings: LaserSettings;
  subcontractings: Subcontracting[];
}

export const useProjectData = () => {
  const [data, setData] = useState<ProjectData>({
    clients: [],
    operations: [],
    parts: [],
    assemblies: [],
    workOrders: [],
    employees: [],
    teams: [],
    assignments: [],
    skills: [],
    materials: [],
    nonConformities: [],
    quotes: [],
    subcontractings: [],
    deliveryNotes: [],
    invoices: [],
    suppliers: [],
    purchases: [],
    timeEntries: [],
    inboundRequests: [],
    bendingSettings: {
      hourlyRate: 85,
      rateWithSecondOperator: 150,
      timePerBend: 1,
      timePerFlip: 0.5,
      setupTimePerSetup: 30,
      neopreneTimePerBend: 1,
      timePerReverse: 0
    },
    laserSettings: {
      machineHourlyRate: 325,
      setupHourlyRate: 65,
      electricityCostPerkW: 0.47,
      gasConsumption6kW: 5,
      gasConsumption12kW: 7,
      costPerPierce: 0.1,
      sheetChangeTimeMinutes: 10,
      sheetChangeHourlyRate: 65
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/data');
      const fetchedData = await response.json();
      setData({
        clients: fetchedData.clients || [],
        operations: fetchedData.operations || [],
        parts: fetchedData.parts || [],
        assemblies: fetchedData.assemblies || [],
        workOrders: fetchedData.workOrders || [],
        employees: fetchedData.employees || [],
        teams: fetchedData.teams || [],
        assignments: fetchedData.assignments || [],
        skills: fetchedData.skills || [],
        materials: fetchedData.materials || [],
        nonConformities: fetchedData.nonConformities || [],
        quotes: fetchedData.quotes || [],
        subcontractings: fetchedData.subcontractings || [],
        deliveryNotes: fetchedData.deliveryNotes || [],
        invoices: fetchedData.invoices || [],
        suppliers: fetchedData.suppliers || [],
        purchases: fetchedData.purchases || [],
        timeEntries: fetchedData.timeEntries || [],
        inboundRequests: fetchedData.inboundRequests || [],
        bendingSettings: fetchedData.bendingSettings ? {
          ...fetchedData.bendingSettings,
          timePerReverse: fetchedData.bendingSettings.timePerReverse ?? 0
        } : {
          hourlyRate: 85,
          rateWithSecondOperator: 150,
          timePerBend: 1,
          timePerFlip: 0.5,
          setupTimePerSetup: 30,
          neopreneTimePerBend: 1,
          timePerReverse: 0
        },
        laserSettings: fetchedData.laserSettings || {
          machineHourlyRate: 325,
          setupHourlyRate: 65,
          electricityCostPerkW: 0.47,
          gasConsumption6kW: 5,
          gasConsumption12kW: 7,
          costPerPierce: 0.1,
          sheetChangeTimeMinutes: 10,
          sheetChangeHourlyRate: 65
        }
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveData = useCallback(async (newData: ProjectData) => {
    try {
      let body;
      try {
        body = JSON.stringify(newData);
      } catch (stringifyError) {
        console.error("Critical error: Failed to stringify data for saving. Data might be too large.", stringifyError);
        const errorMsg = stringifyError instanceof Error ? stringifyError.message : String(stringifyError);
        // Alert user if stringification fails (usually "Invalid string length")
        alert(`Erreur: Les données sont trop volumineuses pour être sauvegardées (${errorMsg}). Essayez de supprimer d'anciens fichiers joints ou demandes.`);
        return;
      }

      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateAll = useCallback(async (updates: Partial<ProjectData> | ((prev: ProjectData) => Partial<ProjectData>)) => {
    console.log('updateAll called');
    setData(prev => {
      const actualUpdates = typeof updates === 'function' ? updates(prev) : updates;
      const next = { ...prev, ...actualUpdates };
      console.log('State updating. WorkOrders count:', next.workOrders.length);
      return next;
    });
  }, []);

  // Save data whenever it changes, but skip the initial load
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isLoading) {
      console.log('Auto-saving data to server...');
      saveData(data);
    }
  }, [data, isLoading, saveData]);

  // Add functions
  const addClient = (client: Omit<Client, 'id'>) => {
    const newClient = { ...client, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => ({ clients: [...prev.clients, newClient] }));
  };

  const addOperation = (operation: Omit<Operation, 'id'>) => {
    const newOp = { ...operation, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => ({ operations: [...prev.operations, newOp] }));
  };
  
  const addPart = (part: Omit<Part, 'id'>) => {
    const newId = Math.random().toString(36).slice(2, 11);
    const newPart = { ...part, id: newId };
    updateAll(prev => ({ parts: [...prev.parts, newPart] }));
    return newId;
  };

  const addAssembly = (assembly: Omit<Assembly, 'id'>) => {
    const newId = Math.random().toString(36).slice(2, 11);
    const newAssembly = { ...assembly, id: newId };
    updateAll(prev => ({ assemblies: [...prev.assemblies, newAssembly] }));
    return newId;
  };

  const addWorkOrder = (workOrder: Omit<WorkOrder, 'id' | 'parts' | 'finishDate' | 'workOrderNumber'> & { 
      partItems?: { partId: string; quantity: number; tempId: string; dependencies: string[] }[]; 
      items?: WorkOrderItem[];
      assemblyId?: string;
      quoteId?: string;
      quoteItems?: { type: 'part' | 'assembly'; id: string; quantity: number }[];
      status?: JobStatus;
      customerPoNumber?: string;
      customerPoFile?: string;
      customerPoFileName?: string;
      createPurchase?: boolean;
  }) => {
    console.log('addWorkOrder called with:', workOrder);
    updateAll(prev => {
      console.log('addWorkOrder updateAll callback triggered');
      let workOrderParts: WorkOrderPart[] = [];
      
      if (workOrder.items) {
        const tempIdToInstanceIds = new Map<string, string[]>();

        // First pass: create all instances
        workOrder.items.forEach(item => {
          if (item.type === 'part') {
            const partTemplate = prev.parts.find(p => p.id === item.id);
            if (!partTemplate) return;
            
            const instanceIds: string[] = [];
            for (let i = 0; i < item.quantity; i++) {
              const instanceId = Math.random().toString(36).slice(2, 11);
              instanceIds.push(instanceId);
              workOrderParts.push({
                ...partTemplate,
                instanceId,
                operations: partTemplate.operations.map(op => ({ ...op, delayDays: 0, dependencies: op.dependencies || [] })),
                partDependencies: [],
                status: 'Pending'
              });
            }
            tempIdToInstanceIds.set(item.tempId, instanceIds);
          } else if (item.type === 'assembly') {
            const assemblyParts = extractPartsFromAssembly(item.id, prev.assemblies, prev.parts, item.quantity);
            const instanceIds = assemblyParts.map(p => p.instanceId);
            workOrderParts.push(...assemblyParts);
            tempIdToInstanceIds.set(item.tempId, instanceIds);
          }
        });

        // Second pass: apply dependencies
        workOrder.items.forEach(item => {
          if (item.dependencies && item.dependencies.length > 0) {
            const currentInstances = tempIdToInstanceIds.get(item.tempId) || [];
            const depInstanceIds: string[] = [];
            item.dependencies.forEach(depTempId => {
              const ids = tempIdToInstanceIds.get(depTempId) || [];
              depInstanceIds.push(...ids);
            });

            currentInstances.forEach(instanceId => {
              const part = workOrderParts.find(p => p.instanceId === instanceId);
              if (part) {
                part.partDependencies = [...(part.partDependencies || []), ...depInstanceIds];
              }
            });
          }
        });
      } else if (workOrder.quoteItems) {
        workOrder.quoteItems.forEach(item => {
          if (item.type === 'part') {
            const partTemplate = prev.parts.find(p => p.id === item.id);
            if (partTemplate) {
              for (let i = 0; i < item.quantity; i++) {
                workOrderParts.push({
                  ...partTemplate,
                  instanceId: Math.random().toString(36).slice(2, 11),
                  operations: partTemplate.operations.map(op => ({ ...op, delayDays: 0, dependencies: op.dependencies || [] })),
                  partDependencies: [],
                  status: 'Pending'
                });
              }
            }
          } else if (item.type === 'assembly') {
            workOrderParts = [...workOrderParts, ...extractPartsFromAssembly(item.id, prev.assemblies, prev.parts, item.quantity)];
          }
        });
      } else if (workOrder.assemblyId) {
        workOrderParts = extractPartsFromAssembly(workOrder.assemblyId, prev.assemblies, prev.parts);
      } else if (workOrder.partItems) {
        const tempIdToInstanceIds = new Map<string, string[]>();
        
        // First pass: create all instances
        workOrder.partItems.forEach(item => {
          const partTemplate = prev.parts.find(p => p.id === item.partId);
          if (!partTemplate) return;
          
          const instanceIds: string[] = [];
          for (let i = 0; i < item.quantity; i++) {
            const instanceId = Math.random().toString(36).slice(2, 11);
            instanceIds.push(instanceId);
            workOrderParts.push({
              ...partTemplate,
              instanceId,
              operations: partTemplate.operations.map(op => ({ ...op, delayDays: 0, dependencies: op.dependencies || [] })),
              partDependencies: [],
              status: 'Pending'
            });
          }
          tempIdToInstanceIds.set(item.tempId, instanceIds);
        });

        // Second pass: apply dependencies
        workOrder.partItems.forEach(item => {
          if (item.dependencies && item.dependencies.length > 0) {
            const currentInstances = tempIdToInstanceIds.get(item.tempId) || [];
            const depInstanceIds: string[] = [];
            item.dependencies.forEach(depTempId => {
              const ids = tempIdToInstanceIds.get(depTempId) || [];
              depInstanceIds.push(...ids);
            });

            currentInstances.forEach(instanceId => {
              const part = workOrderParts.find(p => p.instanceId === instanceId);
              if (part) {
                part.partDependencies = depInstanceIds;
              }
            });
          }
        });
      }

      const newWOId = Math.random().toString(36).slice(2, 11);

      // Group laser operations by material
      const laserPartsByMaterial = new Map<string, { materialId: string; parts: WorkOrderPart[] }>();
      
      workOrderParts.forEach(p => {
        if (!p.materialId) return;
        const hasLaser = p.operations.some(op => op.laserParams);
        if (hasLaser) {
          if (!laserPartsByMaterial.has(p.materialId)) {
            laserPartsByMaterial.set(p.materialId, { materialId: p.materialId, parts: [] });
          }
          laserPartsByMaterial.get(p.materialId)!.parts.push(p);
        }
      });

      const groupedLaserParts: WorkOrderPart[] = [];
      const updatedNormalParts = [...workOrderParts];

      laserPartsByMaterial.forEach(({ materialId, parts: partsWithLaser }) => {
        const material = prev.materials.find(m => m.id === materialId);
        const materialName = material?.description || 'Unknown Material';
        
        const groupedInstanceId = Math.random().toString(36).slice(2, 11);
        
        // Sum up laser times and parameters
        let totalLaserTime = 0;
        const consolidatedLaserParams = { cutLengthInches: 0, piercingCount: 0 };

        partsWithLaser.forEach(p => {
          const laserOps = p.operations.filter(op => op.laserParams);
          laserOps.forEach(op => {
            totalLaserTime += op.estimatedTimeMinutes;
            if (op.laserParams) {
              consolidatedLaserParams.cutLengthInches += op.laserParams.cutLengthInches || 0;
            }
          });

          // Remove laser operations from the original part
          p.operations = p.operations.filter(op => !op.laserParams);
          p.partDependencies = [...(p.partDependencies || []), groupedInstanceId];
        });

        // Create the grouped laser part
        const laserOpTemplate = prev.operations.find(op => op.name.toLowerCase().includes('laser') || op.name.toLowerCase().includes('découpe'));

        groupedLaserParts.push({
          id: `grouped-laser-${materialId}`,
          instanceId: groupedInstanceId,
          name: `Découpe Laser: ${materialName}`,
          materialId,
          quantity: 1,
          status: 'Pending',
          operations: [
            {
              operationId: laserOpTemplate?.id || 'laser-op-id',
              estimatedTimeMinutes: totalLaserTime,
              dependencies: [],
              delayDays: 0,
              laserParams: consolidatedLaserParams
            }
          ],
          partDependencies: []
        });
      });

      const finalWorkOrderParts = [...updatedNormalParts, ...groupedLaserParts];
      const finalFinishDate = calculateFinishDate(workOrder.startDate, finalWorkOrderParts);
      
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
      let workOrderNumber = `WO-${dateStr}-01`;
      
      if (workOrder.quoteId) {
        const quote = prev.quotes.find(q => q.id === workOrder.quoteId);
        if (quote && quote.quoteNumber) {
          workOrderNumber = quote.quoteNumber.replace(/^RFQ-/, 'WO-');
        }
      } else {
        const todayPrefix = `WO-${dateStr}-`;
        const todayWOs = prev.workOrders.filter(wo => wo.workOrderNumber?.startsWith(todayPrefix));
        const nextNumber = (todayWOs.length + 1).toString().padStart(2, '0');
        workOrderNumber = `${todayPrefix}${nextNumber}`;
      }

      const newWO: WorkOrder = {
        id: newWOId,
        workOrderNumber,
        name: workOrderNumber,
        clientId: workOrder.clientId,
        startDate: workOrder.startDate,
        finishDate: finalFinishDate,
        parts: finalWorkOrderParts,
        items: workOrder.items,
        assemblyId: workOrder.assemblyId,
        quoteId: workOrder.quoteId,
        status: workOrder.status || 'Pending',
        customerPoNumber: workOrder.customerPoNumber,
        customerPoFile: workOrder.customerPoFile,
        customerPoFileName: workOrder.customerPoFileName,
        subcontractingItems: workOrder.subcontractingItems
      };

      const updates: Partial<ProjectData> = { workOrders: [...prev.workOrders, newWO] };

      if (workOrder.createPurchase) {
        const refSegment = workOrderNumber.split('-')[2] || '000';
        const todayPrefix = `ACH-${dateStr}-${refSegment}-`;
        const todayPurchases = (prev.purchases || []).filter(p => p.purchaseNumber?.startsWith(todayPrefix));
        const nextNumber = (todayPurchases.length + 1).toString().padStart(2, '0');
        const purchaseNumber = `${todayPrefix}${nextNumber}`;

        const newPurchase: Purchase = {
          id: Math.random().toString(36).slice(2, 11),
          purchaseNumber,
          workOrderId: newWOId,
          quoteId: workOrder.quoteId,
          supplierId: '', // To be filled by user later
          items: [], // To be filled by user later
          isSent: false,
          isReceived: false,
          totalAmount: 0
        };
        updates.purchases = [...(prev.purchases || []), newPurchase];
      }

      return updates;
    });
  };

  const addEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmp = { ...employee, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => ({ employees: [...prev.employees, newEmp] }));
  };

  const addTeam = (team: Omit<Team, 'id'>) => {
    const newTeam = { ...team, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => ({ teams: [...prev.teams, newTeam] }));
  };
  
  const addSkill = (skill: Omit<Skill, 'id'>) => {
    const newSkill = { ...skill, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => ({ skills: [...prev.skills, newSkill] }));
  };

  const addMaterial = (material: Omit<Material, 'id'>) => {
    const newMat = { ...material, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => ({ materials: [...prev.materials, newMat] }));
  };

  const addSubcontracting = (subcontracting: Omit<Subcontracting, 'id' | 'subcontractingNumber'>) => {
    updateAll(prev => {
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
      let baseNumber = '001';
      
      if (subcontracting.quoteId) {
        const quote = prev.quotes.find(q => q.id === subcontracting.quoteId);
        if (quote && quote.quoteNumber) {
          baseNumber = quote.quoteNumber.replace(/^RFQ-/, '').replace(/-\d{3}$/, '');
        }
      } else if (subcontracting.workOrderId) {
        const wo = prev.workOrders.find(wo => wo.id === subcontracting.workOrderId);
        if (wo && wo.workOrderNumber) {
          baseNumber = wo.workOrderNumber.replace(/^WO-/, '').replace(/-\d{3}$/, '');
        }
      }
      
      const todayPrefix = `RST-${dateStr}-${baseNumber}-`;
      const todaySubcontractings = (prev.subcontractings || []).filter(s => s.subcontractingNumber?.startsWith(todayPrefix));
      const nextNumber = (todaySubcontractings.length + 1).toString().padStart(2, '0');
      const subcontractingNumber = `${todayPrefix}${nextNumber}`;
      
      const newSub = { ...subcontracting, id: Math.random().toString(36).slice(2, 11), subcontractingNumber };
      return { subcontractings: [...(prev.subcontractings || []), newSub] };
    });
  };

  const addNonConformity = (nonConformity: Omit<NonConformity, 'id'>) => {
    const newNC = { ...nonConformity, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => ({ nonConformities: [...prev.nonConformities, newNC] }));
  };

  const addDeliveryNote = (deliveryNote: Omit<DeliveryNote, 'id' | 'deliveryNoteNumber'>) => {
    updateAll(prev => {
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
      const todayPrefix = `BDL-${dateStr}-`;
      const todayDNs = (prev.deliveryNotes || []).filter(dn => dn.deliveryNoteNumber?.startsWith(todayPrefix));
      const nextNumber = (todayDNs.length + 1).toString().padStart(3, '0');
      const deliveryNoteNumber = `${todayPrefix}${nextNumber}`;
      
      const newDN = { ...deliveryNote, id: Math.random().toString(36).slice(2, 11), deliveryNoteNumber };
      
      // Update WorkOrder with BDL number
      const updatedWorkOrders = prev.workOrders.map(wo => 
        wo.id === deliveryNote.workOrderId ? { ...wo, deliveryNoteNumber } : wo
      );

      return { 
        deliveryNotes: [...(prev.deliveryNotes || []), newDN],
        workOrders: updatedWorkOrders
      };
    });
  };

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => {
    updateAll(prev => {
      let invoiceNumber = '';
      
      if (invoice.deliveryNoteId) {
        const dn = prev.deliveryNotes.find(d => d.id === invoice.deliveryNoteId);
        if (dn && dn.deliveryNoteNumber) {
          invoiceNumber = dn.deliveryNoteNumber.replace(/^BDL-/, 'INV-');
        }
      }

      if (!invoiceNumber) {
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
        const todayPrefix = `INV-${dateStr}-`;
        const todayInvoices = (prev.invoices || []).filter(inv => inv.invoiceNumber?.startsWith(todayPrefix));
        const nextNumber = (todayInvoices.length + 1).toString().padStart(3, '0');
        invoiceNumber = `${todayPrefix}${nextNumber}`;
      }
      
      const newInv = { ...invoice, id: Math.random().toString(36).slice(2, 11), invoiceNumber };
      
      // Update WorkOrder with Invoice number
      const updatedWorkOrders = prev.workOrders.map(wo => 
        wo.id === invoice.workOrderId ? { ...wo, invoiceNumber } : wo
      );

      return { 
        invoices: [...(prev.invoices || []), newInv],
        workOrders: updatedWorkOrders
      };
    });
  };

  const addTimeEntry = (entry: Omit<TimeEntry, 'id'>) => {
    const newEntry = { ...entry, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => ({ timeEntries: [...(prev.timeEntries || []), newEntry] }));
    return newEntry.id;
  };

  const addQuote = (quote: Omit<Quote, 'id' | 'quoteNumber'> & { isAiGenerated?: boolean }) => {
    updateAll(prev => {
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
      const prefix = quote.isAiGenerated ? `GEM-${dateStr}-` : `RFQ-${dateStr}-`;
      const todayPrefix = prefix;
      
      const todayQuotes = prev.quotes.filter(q => q.quoteNumber?.startsWith(todayPrefix));
      const nextNumber = (todayQuotes.length + 1).toString().padStart(2, '0');
      const quoteNumber = `${todayPrefix}${nextNumber}`;
      
      const materialSummary: { [key: string]: number } = {};
      
      const processItem = (type: 'part' | 'assembly', id: string, qty: number) => {
          if (type === 'part') {
              const part = prev.parts.find(p => p.id === id);
              if (part && part.materialId) {
                  const laserOp = part.operations.find(op => op.laserParams);
                  let area = 0;
                  if (laserOp && laserOp.laserParams) {
                      const selection = laserOp.laserParams.materialCostSelection || 'blank';
                      if (selection === 'blank') {
                          area = laserOp.laserParams.blankAreaSqIn;
                      } else if (selection === 'real') {
                          area = laserOp.laserParams.blankAreaSqIn * (laserOp.laserParams.yieldPercentage / 100);
                      } else if (selection === 'nest') {
                          area = laserOp.laserParams.blankAreaSqIn;
                      }
                  } else {
                      area = (part.dimensionX || 0) * (part.dimensionY || 0);
                  }
                  const areaSqFt = (area * qty) / 144;
                  materialSummary[part.materialId] = (materialSummary[part.materialId] || 0) + areaSqFt;
              }
          } else {
              const assembly = prev.assemblies.find(a => a.id === id);
              if (assembly) {
                  assembly.items.forEach(item => processItem(item.type, item.id, item.quantity * qty));
              }
          }
      };

      quote.items.forEach(item => processItem(item.type, item.id, item.quantity));
      
      const summaryArray = Object.entries(materialSummary).map(([materialId, totalSqFt]) => ({ materialId, totalSqFt }));
      
      const newQuote = { ...quote, id: Math.random().toString(36).slice(2, 11), quoteNumber, materialSummary: summaryArray };
      return { ...prev, quotes: [...prev.quotes, newQuote] };
    });
  };

  const updateBendingSettings = (settings: BendingSettings) => {
    updateAll(prev => ({ ...prev, bendingSettings: settings }));
  };

  const updateLaserSettings = (settings: LaserSettings) => {
    updateAll(prev => ({ ...prev, laserSettings: settings }));
  };

  // Delete functions
  const deleteClient = (id: string) => {
    updateAll(prev => ({ clients: prev.clients.filter(c => c.id !== id) }));
  };

  const deleteOperation = (id: string) => {
    updateAll(prev => ({ operations: prev.operations.filter(o => o.id !== id) }));
  };
  
  const deletePart = (id: string) => {
    updateAll(prev => ({ parts: prev.parts.filter(p => p.id !== id) }));
  };

  const deleteAssembly = (id: string) => {
    updateAll(prev => ({ assemblies: prev.assemblies.filter(a => a.id !== id) }));
  };

  const deleteWorkOrder = (id: string) => {
    updateAll(prev => ({ 
      workOrders: prev.workOrders.filter(wo => wo.id !== id),
      assignments: prev.assignments.filter(a => a.workOrderId !== id)
    }));
  };

  const deleteEmployee = (id: string) => {
    updateAll(prev => ({ employees: prev.employees.filter(e => e.id !== id) }));
  };

  const deleteTeam = (id: string) => {
    updateAll(prev => ({ teams: prev.teams.filter(t => t.id !== id) }));
  };

  const deleteSkill = (id: string) => {
    updateAll(prev => ({ skills: prev.skills.filter(s => s.id !== id) }));
  };

  const deleteMaterial = (id: string) => {
    updateAll(prev => ({ materials: prev.materials.filter(m => m.id !== id) }));
  };

  const deleteSubcontracting = (id: string) => {
    updateAll(prev => ({ subcontractings: (prev.subcontractings || []).filter(s => s.id !== id) }));
  };

  const deleteNonConformity = (id: string) => {
    updateAll(prev => ({ nonConformities: prev.nonConformities.filter(nc => nc.id !== id) }));
  };

  const deleteQuote = (id: string) => {
    updateAll(prev => ({ quotes: prev.quotes.filter(q => q.id !== id) }));
  };

  const deleteDeliveryNote = (id: string) => {
    updateAll(prev => ({ deliveryNotes: (prev.deliveryNotes || []).filter(dn => dn.id !== id) }));
  };

  const deleteInvoice = (id: string) => {
    updateAll(prev => ({ invoices: (prev.invoices || []).filter(inv => inv.id !== id) }));
  };

  const deleteTimeEntry = (id: string) => {
    updateAll(prev => ({ timeEntries: (prev.timeEntries || []).filter(te => te.id !== id) }));
  };

  // Update functions
  const updateClient = (updatedClient: Client) => {
    updateAll(prev => ({ clients: prev.clients.map(c => c.id === updatedClient.id ? updatedClient : c) }));
  };

  const updateOperation = (updatedOperation: Operation) => {
    updateAll(prev => ({ operations: prev.operations.map(o => o.id === updatedOperation.id ? updatedOperation : o) }));
  };

  const updatePart = (updatedPart: Part) => {
    updateAll(prev => ({ parts: prev.parts.map(p => p.id === updatedPart.id ? updatedPart : p) }));
  };

  const updateAssembly = (updatedAssembly: Assembly) => {
    updateAll(prev => ({ assemblies: prev.assemblies.map(a => a.id === updatedAssembly.id ? updatedAssembly : a) }));
  };

  const updateWorkOrder = (updatedWorkOrderData: Omit<WorkOrder, 'parts' | 'finishDate'> & { 
      partItems?: { partId: string; quantity: number; tempId: string; dependencies: string[] }[]; 
      items?: WorkOrderItem[];
      assemblyId?: string;
      status?: JobStatus;
   }) => {
    updateAll(prev => {
      const wo = prev.workOrders.find(w => w.id === updatedWorkOrderData.id);
      if (!wo) return {};

      let workOrderParts: WorkOrderPart[] = [];

      if (updatedWorkOrderData.items) {
        const tempIdToInstanceIds = new Map<string, string[]>();

        // Reconstruct or create instances
        updatedWorkOrderData.items.forEach(item => {
          if (item.type === 'part') {
            const partTemplate = prev.parts.find(p => p.id === item.id);
            if (!partTemplate) return;
            
            // Find all existing instances that belong to this group
            const firstInstance = wo.parts.find(p => p.instanceId === item.tempId);
            const existingInstances = firstInstance 
              ? wo.parts.filter(p => p.id === item.id && !p.parentAssemblyId && JSON.stringify((p.partDependencies || []).sort()) === JSON.stringify((firstInstance.partDependencies || []).sort()))
              : [];

            const instanceIds: string[] = [];
            for (let i = 0; i < item.quantity; i++) {
              const existingPart = existingInstances[i];
              const instanceId = existingPart?.instanceId || Math.random().toString(36).slice(2, 11);
              instanceIds.push(instanceId);
              
              workOrderParts.push({
                ...partTemplate,
                instanceId,
                operations: partTemplate.operations.map(opTemplate => {
                  const existingOp = existingPart?.operations.find(o => o.operationId === opTemplate.operationId);
                  return { ...opTemplate, delayDays: existingOp?.delayDays || 0, dependencies: opTemplate.dependencies || [] };
                }),
                partDependencies: [],
                status: existingPart?.status || 'Pending'
              });
            }
            tempIdToInstanceIds.set(item.tempId, instanceIds);
          } else if (item.type === 'assembly') {
            const assemblyParts = extractPartsFromAssembly(item.id, prev.assemblies, prev.parts, item.quantity);
            const instanceIds = assemblyParts.map(p => p.instanceId);
            workOrderParts.push(...assemblyParts);
            tempIdToInstanceIds.set(item.tempId, instanceIds);
          }
        });

        // Apply dependencies
        updatedWorkOrderData.items.forEach(item => {
          if (item.dependencies && item.dependencies.length > 0) {
            const currentInstances = tempIdToInstanceIds.get(item.tempId) || [];
            const depInstanceIds: string[] = [];
            item.dependencies.forEach(depTempId => {
              const ids = tempIdToInstanceIds.get(depTempId) || [];
              depInstanceIds.push(...ids);
            });

            currentInstances.forEach(instanceId => {
              const part = workOrderParts.find(p => p.instanceId === instanceId);
              if (part) {
                part.partDependencies = [...(part.partDependencies || []), ...depInstanceIds];
              }
            });
          }
        });
      } else if (updatedWorkOrderData.assemblyId && updatedWorkOrderData.assemblyId !== wo.assemblyId) {
        // Legacy assembly handling
        workOrderParts = extractPartsFromAssembly(updatedWorkOrderData.assemblyId, prev.assemblies, prev.parts);
      } else if (updatedWorkOrderData.partItems) {
        const tempIdToInstanceIds = new Map<string, string[]>();
        
        // Reconstruct or create instances
        updatedWorkOrderData.partItems.forEach(item => {
          const partTemplate = prev.parts.find(p => p.id === item.partId);
          if (!partTemplate) return;
          
          const firstInstance = wo.parts.find(p => p.instanceId === item.tempId);
          const existingInstances = firstInstance 
            ? wo.parts.filter(p => p.id === item.partId && JSON.stringify((p.partDependencies || []).sort()) === JSON.stringify((firstInstance.partDependencies || []).sort()))
            : [];

          const instanceIds: string[] = [];
          for (let i = 0; i < item.quantity; i++) {
            const existingPart = existingInstances[i];
            const instanceId = existingPart?.instanceId || Math.random().toString(36).slice(2, 11);
            instanceIds.push(instanceId);
            
            workOrderParts.push({
              ...partTemplate,
              instanceId,
              operations: partTemplate.operations.map(opTemplate => {
                const existingOp = existingPart?.operations.find(o => o.operationId === opTemplate.operationId);
                return { ...opTemplate, delayDays: existingOp?.delayDays || 0, dependencies: opTemplate.dependencies || [] };
              }),
              partDependencies: [],
              status: existingPart?.status || 'Pending'
            });
          }
          tempIdToInstanceIds.set(item.tempId, instanceIds);
        });

        // Apply dependencies
        updatedWorkOrderData.partItems.forEach(item => {
          if (item.dependencies && item.dependencies.length > 0) {
            const currentInstances = tempIdToInstanceIds.get(item.tempId) || [];
            const depInstanceIds: string[] = [];
            item.dependencies.forEach(depTempId => {
              const ids = tempIdToInstanceIds.get(depTempId) || [];
              depInstanceIds.push(...ids);
            });

            currentInstances.forEach(instanceId => {
              const part = workOrderParts.find(p => p.instanceId === instanceId);
              if (part) {
                part.partDependencies = depInstanceIds;
              }
            });
          }
        });
      } else {
          workOrderParts = wo.parts;
      }

      const finishDate = calculateFinishDate(updatedWorkOrderData.startDate, workOrderParts);
      const updatedWO: WorkOrder = {
        ...wo,
        ...updatedWorkOrderData,
        finishDate: finishDate,
        parts: workOrderParts,
        status: updatedWorkOrderData.status || wo.status || 'Pending'
      };
      return { workOrders: prev.workOrders.map(w => w.id === updatedWO.id ? updatedWO : w) };
    });
  };

  const updateEmployee = (updatedEmployee: Employee) => {
    updateAll(prev => ({ employees: prev.employees.map(e => e.id === updatedEmployee.id ? updatedEmployee : e) }));
  };

  const updateTeam = (updatedTeam: Team) => {
    updateAll(prev => ({ teams: prev.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t) }));
  };
  
  const updateSkill = (updatedSkill: Skill) => {
    updateAll(prev => ({ skills: prev.skills.map(s => s.id === updatedSkill.id ? updatedSkill : s) }));
  };
  
  const updateMaterial = (updatedMaterial: Material) => {
    updateAll(prev => ({ materials: prev.materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m) }));
  };

  const updateSubcontracting = (updatedSubcontracting: Subcontracting) => {
    updateAll(prev => ({ subcontractings: (prev.subcontractings || []).map(s => s.id === updatedSubcontracting.id ? updatedSubcontracting : s) }));
  };

  const updateNonConformity = (updatedNonConformity: NonConformity) => {
    updateAll(prev => ({ nonConformities: prev.nonConformities.map(nc => nc.id === updatedNonConformity.id ? updatedNonConformity : nc) }));
  };

  const updateQuote = (updatedQuote: Quote) => {
    updateAll(prev => ({ quotes: prev.quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q) }));
  };

  const updateDeliveryNote = (deliveryNote: DeliveryNote) => {
    updateAll(prev => ({ 
      deliveryNotes: (prev.deliveryNotes || []).map(dn => dn.id === deliveryNote.id ? deliveryNote : dn) 
    }));
  };

  const updateInvoice = (invoice: Invoice) => {
    updateAll(prev => ({ 
      invoices: (prev.invoices || []).map(inv => inv.id === invoice.id ? invoice : inv) 
    }));
  };

  const updateTimeEntry = (entry: TimeEntry) => {
    updateAll(prev => ({ 
      timeEntries: (prev.timeEntries || []).map(te => te.id === entry.id ? entry : te) 
    }));
  };

  const addInboundRequest = (request: Omit<InboundRequest, 'id'>) => {
    const newRequest = { ...request, id: Math.random().toString(36).slice(2, 11) };
    updateAll(prev => {
      const currentRequests = prev.inboundRequests || [];
      // Keep only the most recent 30 requests to maintain performance and data limits
      const limitedRequests = [newRequest, ...currentRequests].slice(0, 30);
      return { inboundRequests: limitedRequests };
    });
  };

  const updateInboundRequest = (id: string, updates: Partial<InboundRequest>) => {
    updateAll(prev => ({ 
      inboundRequests: (prev.inboundRequests || []).map(e => e.id === id ? { ...e, ...updates } : e) 
    }));
  };

  const deleteInboundRequest = (id: string) => {
    updateAll(prev => ({ 
      inboundRequests: (prev.inboundRequests || []).filter(e => e.id !== id) 
    }));
  };

  const updateAssignment = (workOrderId: string, partInstanceIds: string | string[], operationId: string, employeeIds: string[], scheduledDate?: string, status?: JobStatus, splitId?: string, isLocked?: boolean) => {
    const ids = Array.isArray(partInstanceIds) ? partInstanceIds : [partInstanceIds];
    updateAll(prev => {
      const currentAssignments = [...prev.assignments];
      
      ids.forEach(partInstanceId => {
        const existingIndex = currentAssignments.findIndex(a =>
          a.workOrderId === workOrderId &&
          a.partInstanceId === partInstanceId &&
          a.operationId === operationId
        );

        if (employeeIds.length === 0 && !scheduledDate && !status && !splitId && isLocked === undefined) {
          if (existingIndex >= 0) {
            currentAssignments.splice(existingIndex, 1);
          }
        } else if (existingIndex >= 0) {
          currentAssignments[existingIndex] = { 
            ...currentAssignments[existingIndex], 
            employeeIds: employeeIds.length > 0 ? employeeIds : currentAssignments[existingIndex].employeeIds, 
            scheduledDate: scheduledDate || currentAssignments[existingIndex].scheduledDate,
            status: status || currentAssignments[existingIndex].status,
            splitId: splitId !== undefined ? splitId : currentAssignments[existingIndex].splitId,
            isLocked: isLocked !== undefined ? isLocked : currentAssignments[existingIndex].isLocked
          };
        } else {
          const wo = prev.workOrders.find(w => w.id === workOrderId);
          const op = prev.operations.find(o => o.id === operationId);
          const opName = op?.name.toUpperCase().replace(/\s+/g, '') || 'OP';
          
          const woNumber = wo?.workOrderNumber || 'WO-XXXXXX-XX';
          const sameOpAssignments = currentAssignments.filter(a => a.workOrderId === workOrderId && a.operationId === operationId);
          const nextSeq = (sameOpAssignments.length + 1).toString().padStart(2, '0');
          const assignmentNumber = `${woNumber}-${opName}-${nextSeq}`;

          currentAssignments.push({
            id: Math.random().toString(36).slice(2, 11),
            assignmentNumber,
            workOrderId,
            partInstanceId,
            operationId,
            employeeIds,
            scheduledDate,
            status: status || 'Pending',
            splitId,
            isLocked: isLocked || false
          });
        }
      });
      
      return { assignments: currentAssignments };
    });
  };

  const updateOperationAssignment = (workOrderId: string, operationId: string, employeeIds: string[], scheduledDate?: string) => {
    updateAll(prev => {
      const wo = prev.workOrders.find(w => w.id === workOrderId);
      if (!wo) return {};

      const partsInOp = wo.parts.filter(p => p.operations.some(op => op.operationId === operationId));
      
      const currentAssignments = [...prev.assignments];

      partsInOp.forEach(part => {
        const existingIndex = currentAssignments.findIndex(a =>
          a.workOrderId === workOrderId &&
          a.partInstanceId === part.instanceId &&
          a.operationId === operationId
        );

        if (existingIndex >= 0) {
          if (employeeIds.length === 0 && !scheduledDate) {
            currentAssignments.splice(existingIndex, 1);
          } else {
            currentAssignments[existingIndex] = {
              ...currentAssignments[existingIndex],
              employeeIds,
              scheduledDate: scheduledDate || currentAssignments[existingIndex].scheduledDate
            };
          }
          const op = prev.operations.find(o => o.id === operationId);
          const opName = op?.name.toUpperCase().replace(/\s+/g, '') || 'OP';
          const woNumber = wo.workOrderNumber || 'WO-XXXXXX-XX';
          const sameOpAssignments = currentAssignments.filter(a => a.workOrderId === workOrderId && a.operationId === operationId);
          const nextSeq = (sameOpAssignments.length + 1).toString().padStart(2, '0');
          const assignmentNumber = `${woNumber}-${opName}-${nextSeq}`;

          currentAssignments.push({
            id: Math.random().toString(36).slice(2, 11),
            assignmentNumber,
            workOrderId,
            partInstanceId: part.instanceId,
            operationId,
            employeeIds,
            scheduledDate,
            status: 'Pending'
          });
        }
      });

      return { assignments: currentAssignments };
    });
  };

  const updateWorkOrderObject = useCallback((updatedWorkOrder: WorkOrder) => {
    console.log('updateWorkOrderObject called for:', updatedWorkOrder.id, 'new status:', updatedWorkOrder.status);
    updateAll(prev => ({
      workOrders: prev.workOrders.map(wo => wo.id === updatedWorkOrder.id ? updatedWorkOrder : wo)
    }));
  }, [updateAll]);

  const updateAssignmentObject = useCallback((updatedAssignment: Assignment) => {
    console.log('updateAssignmentObject called for:', updatedAssignment.id);
    updateAll(prev => ({ 
      assignments: prev.assignments.map(a => a.id === updatedAssignment.id ? updatedAssignment : a) 
    }));
  }, [updateAll]);

  return {
    ...data,
    isLoading,
    addClient,
    addOperation,
    addPart,
    addWorkOrder,
    addEmployee,
    addTeam,
    addSkill,
    addMaterial,
    addSubcontracting,
    addNonConformity,
    addAssembly,
    addQuote,
    addDeliveryNote,
    addInvoice,
    addTimeEntry,
    addSupplier: (supplier: Omit<Supplier, 'id'>) => {
      const newSupplier = { ...supplier, id: Math.random().toString(36).slice(2, 11) };
      updateAll(prev => ({ suppliers: [...(prev.suppliers || []), newSupplier] }));
    },
    addPurchase: (purchase: Omit<Purchase, 'id' | 'purchaseNumber'>) => {
      updateAll(prev => {
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
        let refSegment = '000';
        
        if (purchase.quoteId) {
          const quote = prev.quotes.find(q => q.id === purchase.quoteId);
          if (quote && quote.quoteNumber) {
            refSegment = quote.quoteNumber.split('-')[2] || '000';
          }
        } else if (purchase.workOrderId) {
          const wo = prev.workOrders.find(wo => wo.id === purchase.workOrderId);
          if (wo && wo.workOrderNumber) {
            refSegment = wo.workOrderNumber.split('-')[2] || '000';
          }
        }
        
        const todayPrefix = `ACH-${dateStr}-${refSegment}-`;
        const todayPurchases = (prev.purchases || []).filter(p => p.purchaseNumber?.startsWith(todayPrefix));
        const nextNumber = (todayPurchases.length + 1).toString().padStart(2, '0');
        const purchaseNumber = `${todayPrefix}${nextNumber}`;
        
        const newPurchase = { ...purchase, id: Math.random().toString(36).slice(2, 11), purchaseNumber };
        return { purchases: [...(prev.purchases || []), newPurchase] };
      });
    },
    deleteClient,
    deleteOperation,
    deletePart,
    deleteWorkOrder,
    deleteEmployee,
    deleteTeam,
    deleteSkill,
    deleteMaterial,
    deleteSubcontracting,
    deleteNonConformity,
    deleteAssembly,
    deleteQuote,
    deleteDeliveryNote,
    deleteInvoice,
    deleteTimeEntry,
    deleteSupplier: (id: string) => {
      updateAll(prev => ({ suppliers: (prev.suppliers || []).filter(s => s.id !== id) }));
    },
    deletePurchase: (id: string) => {
      updateAll(prev => ({ purchases: (prev.purchases || []).filter(p => p.id !== id) }));
    },
    updateClient,
    updateOperation,
    updatePart,
    updateWorkOrder,
    updateWorkOrderObject,
    updateEmployee,
    updateTeam,
    updateSkill,
    updateMaterial,
    updateSubcontracting,
    updateNonConformity,
    updateAssembly,
    updateQuote,
    updateDeliveryNote,
    updateInvoice,
    updateTimeEntry,
    addInboundRequest,
    updateInboundRequest,
    deleteInboundRequest,
    updateSupplier: (supplier: Supplier) => {
      updateAll(prev => ({ suppliers: (prev.suppliers || []).map(s => s.id === supplier.id ? supplier : s) }));
    },
    updatePurchase: (purchase: Purchase) => {
      updateAll(prev => ({ purchases: (prev.purchases || []).map(p => p.id === purchase.id ? purchase : p) }));
    },
    updateAssignment,
    updateOperationAssignment,
    updateAssignmentObject,
    updateBendingSettings,
    updateLaserSettings,
    updateAll,
    refreshData: fetchData
  };
};
