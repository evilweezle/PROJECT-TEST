
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const firebaseConfig = JSON.parse(readFileSync(join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const STAINLESS_DENSITY = 0.29; // lbs/in^3
const STEEL_DENSITY = 0.284; // lbs/in^3
const ALUMINUM_DENSITY = 0.098; // lbs/in^3

const GA_TO_INCH_STEEL: Record<number, number> = {
  6: 0.1943, 7: 0.1793, 8: 0.1644, 10: 0.1345, 11: 0.1196, 12: 0.1046, 14: 0.0747, 16: 0.0598, 18: 0.0478, 20: 0.0359, 22: 0.0299, 24: 0.0239
};

const GA_TO_INCH_SS: Record<number, number> = {
  6: 0.2031, 7: 0.1875, 8: 0.1719, 10: 0.1406, 11: 0.1250, 12: 0.1094, 14: 0.0781, 16: 0.0625, 18: 0.0500, 20: 0.0375, 22: 0.0313, 24: 0.0250
};

const GA_TO_INCH_ALU: Record<number, number> = {
  6: 0.1620, 8: 0.1285, 10: 0.1019, 12: 0.0808, 14: 0.0641, 16: 0.0508, 18: 0.0403, 20: 0.0321, 22: 0.0253, 24: 0.0201
};

const PLATES_SS_ALU = [0.125, 0.1875, 0.25, 0.3125, 0.375, 0.5, 0.625, 0.75];
const PLATES_STEEL = [...PLATES_SS_ALU, 1.0, 1.25, 1.5];

function getLaserSpeed(thickness: number): number {
  if (thickness <= 0.05) return 800;
  if (thickness <= 0.08) return 500;
  if (thickness <= 0.11) return 350;
  if (thickness <= 0.15) return 250;
  if (thickness <= 0.2) return 150;
  if (thickness <= 0.26) return 110;
  if (thickness <= 0.38) return 60;
  if (thickness <= 0.51) return 40;
  if (thickness <= 0.76) return 20;
  if (thickness <= 1.01) return 12;
  return 8;
}

async function seed() {
  const materials: Record<string, unknown>[] = [];

  const types = [
    { name: 'SS304-2B', sub: ['sans SPV', 'avec SPV 1 face'], basePrice: 1.85, density: STAINLESS_DENSITY, gas: 'Oxygen/Nitrogen', gaMap: GA_TO_INCH_SS },
    { name: 'SS304 #4', sub: ['sans SPV', 'avec SPV 1 face'], basePrice: 1.85, density: STAINLESS_DENSITY, gas: 'Oxygen/Nitrogen', gaMap: GA_TO_INCH_SS },
    { name: 'SS316', sub: ['sans SPV', 'avec SPV 1 face'], basePrice: 1.85, density: STAINLESS_DENSITY, gas: 'Oxygen/Nitrogen', gaMap: GA_TO_INCH_SS },
    { name: 'Acier 44W/50W', sub: [''], basePrice: 0.75, density: STEEL_DENSITY, gas: 'Oxygen', gaMap: GA_TO_INCH_STEEL },
    { name: 'Aluminium 5052-H32', sub: ['sans SPV', 'avec SPV 1 face'], basePrice: 3.12, density: ALUMINUM_DENSITY, gas: 'Nitrogen/Air', gaMap: GA_TO_INCH_ALU }
  ];

  for (const t of types) {
    for (const sub of t.sub) {
      const spvAdd = sub.includes('avec SPV') ? 0.1 : 0;
      
      // GA Sheets
      for (const ga in t.gaMap) {
        const thickness = t.gaMap[ga];
        const weightSqFt = thickness * 144 * t.density;
        const costLb = t.basePrice;
        const costSqFt = (costLb * weightSqFt) + spvAdd;
        
        materials.push({
          id: `m_${t.name.replace(/[^a-z0-9]/gi, '_')}_${ga}_ga_${sub.replace(/[^a-z0-9]/gi, '_')}`.toLowerCase().slice(0, 32),
          description: `${t.name} ${ga}ga (${thickness.toFixed(4)}") ${sub}`.trim(),
          type: 'Sheet',
          materialType: t.name,
          thickness,
          profileDimensions: '',
          densityLbs: t.density,
          weightPerLinearFt: 0,
          weightPerSqFt: parseFloat(weightSqFt.toFixed(3)),
          costPerLb: costLb,
          costPerSqFt: parseFloat(costSqFt.toFixed(2)),
          costPerLinearFt: 0,
          laserAdvance6kW: getLaserSpeed(thickness),
          laserAdvance12kW: getLaserSpeed(thickness) * 1.8,
          stockQuantity: 0,
          allocatedQuantity: 0
        });
      }
      
      // Plates
      const plateList = t.name.includes('Acier') ? PLATES_STEEL : PLATES_SS_ALU;
      if (sub === '' || sub === 'sans SPV') {
         // Plates usually are SS304-MF or SS316-MF as requested
         let matName = t.name;
         if (t.name.includes('SS304')) matName = 'SS304-MF';
         if (t.name.includes('SS316')) matName = 'SS316-MF';

         for (const thick of plateList) {
            const weightSqFt = thick * 144 * t.density;
            const costLb = t.basePrice;
            const costSqFt = costLb * weightSqFt;
            
            materials.push({
              id: `m_${matName.replace(/[^a-z0-9]/gi, '_')}_${thick.toString().replace('.', '_')}`.toLowerCase().slice(0, 32),
              description: `${matName} ${thick}" Plate`,
              type: 'Plate',
              materialType: matName,
              thickness: thick,
              profileDimensions: '',
              densityLbs: t.density,
              weightPerLinearFt: 0,
              weightPerSqFt: parseFloat(weightSqFt.toFixed(3)),
              costPerLb: costLb,
              costPerSqFt: parseFloat(costSqFt.toFixed(2)),
              costPerLinearFt: 0,
              laserAdvance6kW: getLaserSpeed(thick),
              laserAdvance12kW: getLaserSpeed(thick) * 1.8,
              stockQuantity: 0,
              allocatedQuantity: 0
            });
         }
      }
    }
  }

  // Checker Plates
  const checkerMats = [
    { name: 'Checker Plate Aluminium 3003-H22', type: 'Checker Plate', materialType: 'Aluminium 3003-H22', basePrice: 3.0, dens: ALUMINUM_DENSITY },
    { name: 'Checker Plate SS304', type: 'Checker Plate', materialType: 'SS304', basePrice: 2.0, dens: STAINLESS_DENSITY }
  ];
  const checkerThicknesses = [
    { label: '1/16', val: 0.063 },
    { label: '.100', val: 0.100 },
    { label: '1/8', val: 0.125 },
    { label: '3/16', val: 0.1875 },
    { label: '1/4', val: 0.25 }
  ];

  for (const cm of checkerMats) {
    for (const ct of checkerThicknesses) {
      const weightSqFt = ct.val * 144 * cm.dens;
      const costSqFt = cm.basePrice * weightSqFt;

      materials.push({
        id: `m_checker_${cm.materialType.replace(/[^a-z0-9]/gi, '_')}_${ct.val.toString().replace('.', '_')}`.toLowerCase().slice(0, 32),
        description: `${cm.name} ${ct.label}"`,
        type: cm.type,
        materialType: cm.materialType,
        thickness: ct.val,
        profileDimensions: '',
        densityLbs: cm.dens,
        weightPerLinearFt: 0,
        weightPerSqFt: parseFloat(weightSqFt.toFixed(3)),
        costPerLb: cm.basePrice,
        costPerSqFt: parseFloat(costSqFt.toFixed(2)),
        costPerLinearFt: 0,
        laserAdvance6kW: getLaserSpeed(ct.val),
        laserAdvance12kW: getLaserSpeed(ct.val) * 1.8,
        stockQuantity: 0,
        allocatedQuantity: 0
      });
    }
  }

  // Structural Profiles
  const channels = [
    { name: 'C3', weight: 4.1 }, { name: 'C4', weight: 5.4 }, { name: 'C5', weight: 6.7 }, 
    { name: 'C6', weight: 8.2 }, { name: 'C8', weight: 11.5 }, { name: 'C10', weight: 15.3 },
    { name: 'C12', weight: 20.7 }, { name: 'C15', weight: 33.9 }
  ];
  for (const c of channels) {
    materials.push({
      id: `m_channel_${c.name.toLowerCase()}`,
      description: `Channel ${c.name} (Standard Steel)`,
      type: 'Structural',
      materialType: 'Acier 44W',
      thickness: 0,
      profileDimensions: c.name,
      densityLbs: STEEL_DENSITY,
      weightPerLinearFt: c.weight,
      weightPerSqFt: 0,
      costPerLb: 0.85,
      costPerSqFt: 0,
      costPerLinearFt: parseFloat((0.85 * c.weight).toFixed(2)),
      stockQuantity: 0,
      allocatedQuantity: 0
    });
  }

  // Tubes
  const tubeSizes = [
    { w: 0.5, h: 0.5 }, { w: 1.0, h: 1.0 }, { w: 1.5, h: 1.5 }, { w: 2.0, h: 2.0 },
    { w: 2.0, h: 4.0 }, { w: 2.0, h: 5.0 }, { w: 2.0, h: 6.0 }, { w: 3.0, h: 3.0 },
    { w: 3.0, h: 6.0 }, { w: 3.0, h: 8.0 }, { w: 3.0, h: 10.0 }, { w: 4.0, h: 4.0 },
    { w: 4.0, h: 6.0 }, { w: 4.0, h: 8.0 }, { w: 4.0, h: 10.0 }, { w: 5.0, h: 5.0 },
    { w: 6.0, h: 6.0 }, { w: 8.0, h: 8.0 }, { w: 10.0, h: 10.0 }
  ];
  const tubeThicknesses = [0.062, 0.125, 0.1875, 0.25, 0.375, 0.5];
  const tubeMats = [
    { name: 'Acier 44W/50S', base: 0.85, dens: STEEL_DENSITY },
    { name: 'SS316', base: 2.2, dens: STAINLESS_DENSITY },
    { name: 'Alu 6061-T6', base: 3.5, dens: ALUMINUM_DENSITY }
  ];

  for (const tm of tubeMats) {
    for (const size of tubeSizes) {
      for (const wall of tubeThicknesses) {
        // Perimeter = 2 * (w + h)
        // Weight Lin Ft = Perimeter * wall * density * 12
        const perimeter = 2 * (size.w + size.h);
        const weightLinFt = perimeter * wall * tm.dens * 12;
        
        const sizeStr = size.w === size.h ? `${size.w}"` : `${size.w}"x${size.h}"`;
        const profileStr = size.w === size.h ? `${size.w}x${size.h}` : `${size.w}x${size.h}`;

        materials.push({
          id: `m_tube_${tm.name.replace(/[^a-z]/gi, '_')}_${size.w}_${size.h}_${wall.toString().replace('.', '_')}`.toLowerCase().slice(0, 32),
          description: `Tube ${size.w === size.h ? 'Carré' : 'Rectangulaire'} ${tm.name} ${sizeStr} x ${wall}"`,
          type: 'Tube',
          materialType: tm.name,
          thickness: wall,
          profileDimensions: profileStr,
          densityLbs: tm.dens,
          weightPerLinearFt: parseFloat(weightLinFt.toFixed(3)),
          weightPerSqFt: 0,
          costPerLb: tm.base,
          costPerSqFt: 0,
          costPerLinearFt: parseFloat((tm.base * weightLinFt).toFixed(2)),
          stockQuantity: 0,
          allocatedQuantity: 0
        });
      }
    }
  }

  console.log(`Uploading ${materials.length} materials...`);
  
  // Batch upload
  let count = 0;
  for(let i = 0; i < materials.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = materials.slice(i, i + 500);
    chunk.forEach(m => {
      const ref = doc(db, 'materials', m.id);
      batch.set(ref, m, { merge: true });
    });
    await batch.commit();
    count += chunk.length;
    console.log(`Uploaded ${count}/${materials.length}`);
  }
  
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
