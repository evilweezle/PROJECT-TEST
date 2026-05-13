import { LaserSettings, LaserTubeSettings, Material } from '../types';

export const calculateLaserCost = (
  settings: LaserSettings,
  material: Material | undefined,
  params: {
    cutLengthInches: number;
    yieldPercentage: number;
    powerkW: 6 | 12;
    blankAreaSqIn: number;
    numberOfPierces: number;
    quantity: number;
    numberOfSheets?: number;
    setupTimeMinutes?: number;
  }
) => {
  const quantity = params.quantity || 1;
  const advance = params.powerkW === 12 ? (material?.laserAdvance12kW || 0) : (material?.laserAdvance6kW || 0);
  
  // 1. Cutting Time (minutes) per piece
  const cuttingTimeMinutes = advance > 0 ? params.cutLengthInches / advance : 0;
  const totalCuttingTimeMinutes = cuttingTimeMinutes * quantity;

  // 2. Machine Cost
  const machineCost = (totalCuttingTimeMinutes / 60) * settings.machineHourlyRate;

  // 3. Electricity Cost
  const electricityCost = (totalCuttingTimeMinutes / 60) * params.powerkW * settings.electricityCostPerkW;

  // 4. Gas Cost
  const gasConsumptionRate = params.powerkW === 12 ? settings.gasConsumption12kW : settings.gasConsumption6kW;
  const gasCost = (totalCuttingTimeMinutes / 60) * gasConsumptionRate;

  // 5. Piercing Cost
  const piercingCost = params.numberOfPierces * settings.costPerPierce * quantity;

  // 6. Sheet Change Cost
  const defaultSheetArea = 48 * 96; // Standard 4x8 sheet in inches
  const calculatedSheets = Math.ceil((params.blankAreaSqIn * quantity) / defaultSheetArea);
  const sheets = params.numberOfSheets || (calculatedSheets > 0 ? calculatedSheets : 1);
  const sheetChangeCost = sheets * (settings.sheetChangeTimeMinutes / 60) * settings.sheetChangeHourlyRate;
  const totalSheetChangeTimeMinutes = sheets * settings.sheetChangeTimeMinutes;

  // 7. Setup Cost
  const setupTimeMinutes = params.setupTimeMinutes || 0;
  const setupCost = (setupTimeMinutes / 60) * settings.setupHourlyRate;
  
  // Total Operation Cost
  const totalOperationCost = machineCost + electricityCost + gasCost + piercingCost + sheetChangeCost + setupCost;
  const unitPrice = totalOperationCost / quantity;
  
  const totalTimeMinutes = totalCuttingTimeMinutes + totalSheetChangeTimeMinutes + setupTimeMinutes;

  return {
    cuttingTimeMinutes,
    machineCost,
    electricityCost,
    gasCost,
    piercingCost,
    sheetChangeCost,
    setupCost,
    totalOperationCost,
    totalTimeMinutes,
    unitPrice,
    settingsSnapshot: settings
  };
};

export const calculateLaserTubeCost = (
  settings: LaserTubeSettings,
  material: Material | undefined | null,
  params: {
    cutLengthInches: number;
    numberOfBars: number;
    powerkW: number;
    quantity: number;
    setupTimeMinutes?: number;
    numberOfPierces?: number;
  }
) => {
  const quantity = params.quantity || 1;
  const advance = params.powerkW >= 12 ? (material?.laserAdvance12kW || 0) : (material?.laserAdvance6kW || 0);

  // 1. Cutting Time (minutes) per piece
  const rawCuttingTimeMinutesPerPiece = advance > 0 ? (params.cutLengthInches / advance) : 0;
  
  // Le temps minimum est par article (total de la commande pour cette pièce), pas par unité.
  let totalCuttingTimeMinutes = rawCuttingTimeMinutesPerPiece * quantity;
  totalCuttingTimeMinutes = Math.max(settings.minimumTimeMinutes || 0, totalCuttingTimeMinutes);
  const cuttingTimeMinutesPerPiece = totalCuttingTimeMinutes / quantity;

  // 2. Handling Time (Manipulation par barre + par pièce)
  const bars = params.numberOfBars || 1;
  const handlingTimeBarsMinutes = bars * (settings.handlingTimePerBarMinutes || 0);
  const handlingTimePartsMinutes = quantity * (settings.handlingTimePerPartMinutes || 0);
  const totalHandlingTimeMinutes = handlingTimeBarsMinutes + handlingTimePartsMinutes;

  // 3. Setup Time
  const setupTimeMinutes = params.setupTimeMinutes || 0;

  // 4. Total Raw Time
  const totalOperationTimeMinutes = totalCuttingTimeMinutes + totalHandlingTimeMinutes + setupTimeMinutes;

  // 5. Machine Cost (No minimum applied here)
  const actualPaidTimeMinutes = totalOperationTimeMinutes;

  // 6. Machine Cost
  const machineCost = (actualPaidTimeMinutes / 60) * settings.machineHourlyRate;

  // 6b. Setup Cost
  const setupCost = (setupTimeMinutes / 60) * (settings.setupHourlyRate || settings.machineHourlyRate);

  // 7. Electricity Cost
  const electricityCost = (totalCuttingTimeMinutes / 60) * params.powerkW * settings.electricityCostPerkW;

  // 8. Gas Cost
  const gasCost = (totalCuttingTimeMinutes / 60) * settings.gasConsumptionRate;

  // 9. Piercing Cost
  const totalPierces = (params.numberOfPierces || 0) * quantity;
  const piercingCost = totalPierces * (settings.costPerPierce || 0);

  // Total Operation Cost
  const totalOperationCost = machineCost + setupCost + electricityCost + gasCost + piercingCost;
  const unitPrice = totalOperationCost / quantity;

  return {
    cuttingTimeMinutes: cuttingTimeMinutesPerPiece,
    machineCost,
    electricityCost,
    gasCost,
    piercingCost,
    setupCost, // Adding explicitly though we might need to add to type
    sheetChangeCost: totalHandlingTimeMinutes * (settings.machineHourlyRate / 60), 
    totalOperationCost,
    totalTimeMinutes: actualPaidTimeMinutes,
    unitPrice,
    settingsSnapshot: settings
  };
};
