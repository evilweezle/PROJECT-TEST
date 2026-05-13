import { Material } from '../types';

export const INDUSTRIAL_MATERIALS: Omit<Material, 'id'>[] = [
  // Stainless Steel Sheets - Base 1.85/lb
  ...generateSheets('SS304-2B', 'ss304-2b', 1.85, 0.29, false),
  ...generateSheets('SS304-2B (SPV)', 'ss304-2b-spv', 1.85, 0.29, true),
  ...generateSheets('SS304 #4', 'ss304-4', 1.85, 0.29, false),
  ...generateSheets('SS304 #4 (SPV)', 'ss304-4-spv', 1.85, 0.29, true),
  ...generateSheets('SS316', 'ss316', 1.85, 0.30, false),
  ...generateSheets('SS316 (SPV)', 'ss316-spv', 1.85, 0.30, true),

  // Stainless Steel Plates - Base 1.85/lb
  ...generatePlates('SS304-MF', 'ss304-mf', 1.85, 0.29),
  ...generatePlates('SS316-MF', 'ss316-mf', 1.85, 0.30),

  // Steel 44W/50W - Sheets 0.75/lb
  ...generateSheets('Acier 44W/50W', 'steel-44w', 0.75, 0.28, false),
  ...generatePlates('Acier 44W/50W (Plate)', 'steel-44w-plate', 0.75, 0.28, true), // Including 1" to 1.5"

  // Aluminum 5052-H32 - Base 3.12/lb
  ...generateSheets('AL 5052-H32', 'al-5052', 3.12, 0.098, false),
  ...generateSheets('AL 5052-H32 (SPV)', 'al-5052-spv', 3.12, 0.098, true),
  ...generatePlates('AL 5052-H32 (Plate)', 'al-5052-plate', 3.12, 0.098),

  // Checker Plates
  ...generateCheckerPlates('Checker Plate AL 3003-H22', 'checker-al-3003-h22', 3.0, 0.098),
  ...generateCheckerPlates('Checker Plate SS304', 'checker-ss304', 2.0, 0.29),

  // Structural Profiles (Channels C3-C15) - Steel 44W base
  ...generateChannels(),
  
  // Tubes - 2x4 to 10x10, thicknesses 0.062 to 1/2
  ...generateTubes()
];

function generateChannels(): Omit<Material, 'id'>[] {
    const sizes = [3, 4, 5, 6, 8, 10, 12, 15];
    const density = 0.283;
    const items: Omit<Material, 'id'>[] = [];

    sizes.forEach(s => {
        items.push({
            description: `Channel C${s} Standard`,
            type: 'profile',
            materialType: 'steel-44w',
            thickness: 0,
            profileDimensions: `C${s}`,
            densityLbs: density,
            weightPerLinearFt: s * 1.5, // Simplified weight
            weightPerSqFt: 0,
            costPerLb: 0.85,
            costPerSqFt: 0,
            costPerLinearFt: (s * 1.5) * 0.85,
            stockQuantity: 0,
            allocatedQuantity: 0
        });
    });
    return items;
}

function generateTubes(): Omit<Material, 'id'>[] {
    const sizes = [
        "2x4", "2x5", "2x6", "3x6", "3x8", "3x10", "4x6", "4x8", "4x10", "4x4", "5x5", "6x6", "8x8", "10x10", "3x3"
    ];
    const thicknesses = [
        { label: "0.062", val: 0.062 },
        { label: "1/8", val: 0.125 },
        { label: "3/16", val: 0.1875 },
        { label: "1/4", val: 0.25 },
        { label: "3/8", val: 0.375 },
        { label: "1/2", val: 0.5 }
    ];
    const density = 0.283;
    const items: Omit<Material, 'id'>[] = [];

    sizes.forEach(size => {
        const [w, h] = size.split('x').map(Number);
        thicknesses.forEach(t => {
            const perimeter = (w + h) * 2;
            const weightPerFt = perimeter * t.val * 12 * density;
            items.push({
                description: `Tube ${size} x ${t.label}`,
                type: 'tube',
                materialType: 'steel-44w',
                thickness: t.val,
                profileDimensions: size,
                densityLbs: density,
                weightPerLinearFt: weightPerFt,
                weightPerSqFt: 0,
                costPerLb: 0.95,
                costPerSqFt: 0,
                costPerLinearFt: weightPerFt * 0.95,
                stockQuantity: 0,
                allocatedQuantity: 0
            });
        });
    });
    return items;
}

function generateSheets(description: string, type: string, costPerLb: number, density: number, hasSpv: number | boolean): Omit<Material, 'id'>[] {
  const gauges = [
    { ga: 6, thick: 0.1943 },
    { ga: 7, thick: 0.1793 },
    { ga: 8, thick: 0.1644 },
    { ga: 9, thick: 0.1495 },
    { ga: 10, thick: 0.1345 },
    { ga: 11, thick: 0.1196 },
    { ga: 12, thick: 0.1046 },
    { ga: 13, thick: 0.0897 },
    { ga: 14, thick: 0.0747 },
    { ga: 15, thick: 0.0673 },
    { ga: 16, thick: 0.0598 },
    { ga: 18, thick: 0.0478 },
    { ga: 20, thick: 0.0359 },
    { ga: 22, thick: 0.0299 },
    { ga: 24, thick: 0.0239 }
  ];

  return gauges.map(g => {
    const weightPerSqFt = g.thick * 12 * 12 * density;
    const baseCostPerSqFt = weightPerSqFt * costPerLb;
    const costPerSqFt = hasSpv ? baseCostPerSqFt + 0.1 : baseCostPerSqFt;

    return {
      description: `${description} ${g.ga}ga (${g.thick}")`,
      type: 'sheet',
      materialType: type,
      thickness: g.thick,
      densityLbs: density,
      weightPerLinearFt: 0,
      weightPerSqFt,
      costPerLb,
      costPerSqFt,
      costPerLinearFt: 0,
      stockQuantity: 0,
      allocatedQuantity: 0
    };
  });
}

function generatePlates(description: string, type: string, costPerLb: number, density: number, extended: boolean = false): Omit<Material, 'id'>[] {
  const thicknesses = [0.125, 0.1875, 0.25, 0.3125, 0.375, 0.5, 0.625, 0.75];
  if (extended) thicknesses.push(1.0, 1.25, 1.5);

  return thicknesses.map(t => {
    const weightPerSqFt = t * 12 * 12 * density;
    return {
      description: `${description} ${t}"`,
      type: 'plate',
      materialType: type,
      thickness: t,
      densityLbs: density,
      weightPerLinearFt: 0,
      weightPerSqFt,
      costPerLb,
      costPerSqFt: weightPerSqFt * costPerLb,
      costPerLinearFt: 0,
      stockQuantity: 0,
      allocatedQuantity: 0
    };
  });
}

function generateCheckerPlates(description: string, type: string, costPerLb: number, density: number): Omit<Material, 'id'>[] {
  const thicknesses = [0.063, 0.100, 0.125, 0.1875, 0.25];
  const labels = ['1/16', '.100', '1/8', '3/16', '1/4'];

  return thicknesses.map((t, idx) => {
    const weightPerSqFt = t * 12 * 12 * density; // Adding pattern weight usually makes it slightly heavier, but using base volume weight here
    return {
      description: `${description} ${labels[idx]}"`,
      type: 'plate', // Or 'checker_plate' if needed, but 'plate' groups them nicely
      materialType: type,
      thickness: t,
      densityLbs: density,
      weightPerLinearFt: 0,
      weightPerSqFt,
      costPerLb,
      costPerSqFt: weightPerSqFt * costPerLb,
      costPerLinearFt: 0,
      stockQuantity: 0,
      allocatedQuantity: 0
    };
  });
}
