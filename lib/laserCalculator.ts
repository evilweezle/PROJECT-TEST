import { LaserSettings, Material } from '../types';

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
  const sheets = params.numberOfSheets || 1; // Default to 1 sheet if not specified
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
