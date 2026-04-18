import { BendingSettings } from '../types';

export const calculateBendingCost = (
  settings: BendingSettings,
  params: {
    numberOfSetups: number;
    numberOfBends: number;
    areaSqIn: number; // Blank surface area in sq inches
    weightLbs: number;
    useNeoprene: boolean;
    quantity: number;
    numberOfReverses: number;
  }
) => {
  // 1. Calculate bend time factor based on weight or size from settings
  let bendTimeFactor = 1;
  
  // Weight factors
  if (settings.weightFactors && settings.weightFactors.length > 0) {
    const sortedWeightFactors = [...settings.weightFactors].sort((a, b) => b.min - a.min);
    for (const wf of sortedWeightFactors) {
      if (params.weightLbs >= wf.min) {
        bendTimeFactor = Math.max(bendTimeFactor, wf.factor);
        break;
      }
    }
  }

  // Size factors (Area in sq inches)
  if (settings.sizeFactors && settings.sizeFactors.length > 0) {
    const sortedSizeFactors = [...settings.sizeFactors].sort((a, b) => b.min - a.min);
    for (const sf of sortedSizeFactors) {
      if (params.areaSqIn >= sf.min) {
        bendTimeFactor = Math.max(bendTimeFactor, sf.factor);
        break;
      }
    }
  }

  // 2. Determine if 2nd operator is required (if factor is >= 2)
  const isSecondOperatorRequired = bendTimeFactor >= 2;

  // 3. Determine hourly rates
  const baseHourlyRate = settings.hourlyRate || 0;
  // Apply factor to the hourly rate for the bending operation
  const bendingHourlyRate = baseHourlyRate * bendTimeFactor;

  // 4. Calculate time per piece (Machine operation/use time)
  // Apply factor to all time components of the operation
  const bendTimePerBend = ((settings.timePerBend || 0) + (params.useNeoprene ? (settings.neopreneTimePerBend || 0) : 0)) * bendTimeFactor;
  const timePerFlip = (settings.timePerFlip || 0) * bendTimeFactor;
  const timePerReverse = (settings.timePerReverse || 0) * bendTimeFactor;
  
  const bendingTimePerPiece = ((params.numberOfBends || 0) * bendTimePerBend) + timePerFlip + ((params.numberOfReverses || 0) * timePerReverse);

  // 5. Calculate total times (in minutes)
  const totalBendingTime = bendingTimePerPiece * (params.quantity || 0);
  const totalSetupTime = (params.numberOfSetups || 0) * (settings.setupTimePerSetup || 0);
  const totalTimeMinutes = totalBendingTime + totalSetupTime;

  // 6. Calculate total cost
  // Setup cost: Second operator is NOT included in the setup time/fees
  const setupCost = (totalSetupTime / 60) * baseHourlyRate;
  
  // Bending cost: Uses the adjusted hourly rate
  const bendingCost = (totalBendingTime / 60) * bendingHourlyRate;
  
  const totalCost = setupCost + bendingCost;
  const unitPrice = params.quantity > 0 ? totalCost / params.quantity : 0;

  return {
    bendingTimePerPiece,
    totalSetupTime,
    secondOperatorRequired: isSecondOperatorRequired,
    totalTimeMinutes,
    totalCost,
    unitPrice,
    settingsSnapshot: settings
  };
};
