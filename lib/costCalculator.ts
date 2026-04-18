import { Part, Assembly, Operation, Material, BendingSettings, LaserSettings, Subcontracting } from '../types';
import { calculateBendingCost } from './bendingCalculator';
import { calculateLaserCost } from './laserCalculator';

export function calculatePartUnitCost(
  part: Part | Omit<Part, 'id'>,
  operations: Operation[],
  materials: Material[],
  bendingSettings: BendingSettings,
  laserSettings: LaserSettings,
  subcontractings: Subcontracting[] = []
): number {
  const material = materials.find(m => m.id === part.materialId);
  const quantity = part.quantity || 1;

  // Calculate material cost per unit
  // This is a simplified calculation. In a real app, you'd have more precise logic.
  let materialCostPerUnit = 0;
  if (material) {
    // Try to find a bending operation to get area/weight if not explicitly provided
    const bendingOp = part.operations.find(po => {
      const op = operations.find(o => o.id === po.operationId);
      return op?.name?.toLowerCase().includes('pliage') || op?.name?.toLowerCase().includes('bend');
    });

    if (bendingOp?.bendingParams) {
      const { areaSqIn, weightLbs } = bendingOp.bendingParams;
      if (areaSqIn > 0) {
        materialCostPerUnit = (areaSqIn / 144) * material.costPerSqFt;
      } else if (weightLbs > 0) {
        materialCostPerUnit = weightLbs * material.costPerLb;
      }
    } else {
      // Check for laser operation
      const laserOp = part.operations.find(po => {
        const op = operations.find(o => o.id === po.operationId);
        return op?.name?.toLowerCase().includes('laser') || op?.name?.toLowerCase().includes('découpe') || op?.name?.toLowerCase().includes('cut');
      });

      if (laserOp?.laserParams) {
        const { blankAreaSqIn, yieldPercentage, numberOfSheets, sheetAreaSqIn, materialCostSelection } = laserOp.laserParams;
        const selection = materialCostSelection || 'blank';
        
        if (selection === 'blank') {
          if (blankAreaSqIn > 0) {
            materialCostPerUnit = (blankAreaSqIn / 144) * material.costPerSqFt;
          }
        } else if (selection === 'real') {
          if (blankAreaSqIn > 0) {
            const realArea = blankAreaSqIn * (yieldPercentage / 100);
            materialCostPerUnit = (realArea / 144) * material.costPerSqFt;
          }
        } else if (selection === 'nest') {
          if (numberOfSheets && sheetAreaSqIn && quantity > 0) {
            const totalMaterialCost = (numberOfSheets * sheetAreaSqIn / 144) * material.costPerSqFt;
            materialCostPerUnit = totalMaterialCost / quantity;
          }
        }
      }
    }
  }

  // Calculate operation costs per unit
  const operationCosts = part.operations.reduce((acc, po) => {
    const op = operations.find(o => o.id === po.operationId);
    if (!op) return acc;

    let unitPrice = 0;
    if (op.name?.toLowerCase().includes('pliage') || op.name?.toLowerCase().includes('bend')) {
      if (po.bendingParams) {
        const result = calculateBendingCost(bendingSettings, { ...po.bendingParams, quantity });
        unitPrice = result.unitPrice;
      }
    } else if (op.name?.toLowerCase().includes('laser') || op.name?.toLowerCase().includes('découpe') || op.name?.toLowerCase().includes('cut')) {
      if (po.laserParams && material) {
        const result = calculateLaserCost(laserSettings, material, { ...po.laserParams, quantity });
        unitPrice = result.unitPrice;
      } else {
        unitPrice = (op.rate * (po.estimatedTimeMinutes / 60)) / quantity;
      }
    } else {
      unitPrice = (op.rate * (po.estimatedTimeMinutes / 60)) / quantity;
    }
    return acc + unitPrice;
  }, 0);

  // Calculate subcontracting costs per unit
  const subcontractingCosts = (part.subcontractingItems || []).reduce((acc, item) => {
    if (item.applyType === 'perUnit') {
      return acc + item.cost;
    }
    return acc + (item.cost / quantity);
  }, 0);

  // Calculate global subcontracting costs per unit
  const globalSubcontractingCosts = subcontractings
    .filter(s => 'id' in part && s.partId === part.id)
    .reduce((acc, s) => acc + (s.cost ?? s.defaultCost), 0);

  return materialCostPerUnit + operationCosts + subcontractingCosts + globalSubcontractingCosts;
}

export function calculateAssemblyUnitCost(
  assembly: Assembly | Omit<Assembly, 'id'>,
  parts: Part[],
  assemblies: Assembly[],
  operations: Operation[],
  materials: Material[],
  bendingSettings: BendingSettings,
  laserSettings: LaserSettings,
  subcontractings: Subcontracting[] = []
): number {
  const quantity = assembly.quantity || 1;

  // Calculate item costs (parts and sub-assemblies)
  const itemCosts = assembly.items.reduce((acc, item) => {
    let unitPrice = 0;
    if (item.type === 'part') {
      const part = parts.find(p => p.id === item.id);
      if (part) {
        unitPrice = calculatePartUnitCost(part, operations, materials, bendingSettings, laserSettings, subcontractings);
      }
    } else {
      const subAssembly = assemblies.find(a => a.id === item.id);
      if (subAssembly) {
        unitPrice = calculateAssemblyUnitCost(subAssembly, parts, assemblies, operations, materials, bendingSettings, laserSettings, subcontractings);
      }
    }
    return acc + (unitPrice * item.quantity);
  }, 0);

  // Calculate assembly operation costs per unit
  const operationCosts = assembly.operations.reduce((acc, po) => {
    const op = operations.find(o => o.id === po.operationId);
    if (!op) return acc;

    let unitPrice = 0;
    if (op.name?.toLowerCase().includes('pliage') || op.name?.toLowerCase().includes('bend')) {
      if (po.bendingParams) {
        const result = calculateBendingCost(bendingSettings, { ...po.bendingParams, quantity });
        unitPrice = result.unitPrice;
      }
    } else {
      unitPrice = (op.rate * (po.estimatedTimeMinutes / 60)) / quantity;
    }
    return acc + unitPrice;
  }, 0);

  // Calculate subcontracting costs per unit
  const subcontractingCosts = (assembly.subcontractingItems || []).reduce((acc, item) => {
    if (item.applyType === 'perUnit') {
      return acc + item.cost;
    }
    return acc + (item.cost / quantity);
  }, 0);

  // Calculate global subcontracting costs per unit
  const globalSubcontractingCosts = subcontractings
    .filter(s => 'id' in assembly && s.assemblyId === assembly.id)
    .reduce((acc, s) => acc + (s.cost ?? s.defaultCost), 0);

  return itemCosts + operationCosts + subcontractingCosts + globalSubcontractingCosts;
}
