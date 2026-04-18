const fs = require('fs');

const DATA_FILE = './data.json';
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const newMaterials = [
    // ACIER / STEEL
    {
        description: "Acier Ga.(0.250\")",
        type: "Plate",
        materialType: "Acier",
        thickness: 0.250,
        densityLbs: 0.284,
        weightPerSqFt: 10.2,
        costPerLb: 0.8,
        costPerSqFt: 8.16,
        laserAdvance6kW: 120,
        laserAdvance12kW: 240
    },
    {
        description: "HRS Ga.(0.1875\")",
        type: "Plate",
        materialType: "HRS",
        thickness: 0.1875,
        densityLbs: 0.284,
        weightPerSqFt: 7.657,
        costPerLb: 0.7,
        costPerSqFt: 5.32,
        laserAdvance6kW: 386,
        laserAdvance12kW: 772
    },
    {
        description: "HRS Ga.(0.135\") (10 Ga)",
        type: "Plate",
        materialType: "HRS",
        thickness: 0.135,
        densityLbs: 0.284,
        weightPerSqFt: 5.63,
        costPerLb: 0.6,
        costPerSqFt: 3.38,
        laserAdvance6kW: 800,
        laserAdvance12kW: 1600
    },
    {
        description: "HRS Ga.(0.120\") (11 Ga)",
        type: "Plate",
        materialType: "HRS",
        thickness: 0.120,
        densityLbs: 0.284,
        weightPerSqFt: 5.16,
        costPerLb: 0.6,
        costPerSqFt: 3.10,
        laserAdvance6kW: 669,
        laserAdvance12kW: 1338
    },
    {
        description: "CRS Ga.(0.135\") (10 Ga)",
        type: "Plate",
        materialType: "CRS",
        thickness: 0.135,
        densityLbs: 0.284,
        weightPerSqFt: 5.63,
        costPerLb: 0.74,
        costPerSqFt: 4.16,
        laserAdvance6kW: 800,
        laserAdvance12kW: 1600
    },
    {
        description: "CRS Ga.(0.120\") (11 Ga)",
        type: "Plate",
        materialType: "CRS",
        thickness: 0.120,
        densityLbs: 0.284,
        weightPerSqFt: 5.16,
        costPerLb: 0.74,
        costPerSqFt: 3.82,
        laserAdvance6kW: 669,
        laserAdvance12kW: 1338
    },
    {
        description: "GALV Ga.(0.135\") (10 Ga)",
        type: "Plate",
        materialType: "GALV",
        thickness: 0.135,
        densityLbs: 0.284,
        weightPerSqFt: 5.81,
        costPerLb: 1.15,
        costPerSqFt: 6.68,
        laserAdvance6kW: 800,
        laserAdvance12kW: 1600
    },
    {
        description: "SATIN Ga.(0.135\") (10 Ga)",
        type: "Plate",
        materialType: "SATIN",
        thickness: 0.135,
        densityLbs: 0.284,
        weightPerSqFt: 5.81,
        costPerLb: 0.77,
        costPerSqFt: 4.47,
        laserAdvance6kW: 800,
        laserAdvance12kW: 1600
    },
    
    // ALUMINUM
    {
        description: "Aluminium Ga.(0.125\")",
        type: "Sheet",
        materialType: "Aluminium",
        thickness: 0.125,
        densityLbs: 0.098,
        weightPerSqFt: 1.76,
        costPerLb: 2.5,
        costPerSqFt: 4.4,
        laserAdvance6kW: 400,
        laserAdvance12kW: 800
    },
    {
        description: "ALU 3003-H14 Ga.(0.250\")",
        type: "Plate",
        materialType: "ALU 3003",
        thickness: 0.250,
        densityLbs: 0.098,
        weightPerSqFt: 3.52,
        costPerLb: 2.07,
        costPerSqFt: 7.29,
        laserAdvance6kW: 182,
        laserAdvance12kW: 364
    },
    {
        description: "ALU 3003-H14 Ga.(0.100\") (10 Ga)",
        type: "Plate",
        materialType: "ALU 3003",
        thickness: 0.100,
        densityLbs: 0.098,
        weightPerSqFt: 1.44,
        costPerLb: 2.07,
        costPerSqFt: 2.98,
        laserAdvance6kW: 267,
        laserAdvance12kW: 534
    },

    // STAINLESS
    {
        description: "SS304 Ga.(0.141\") (10 Ga) #4",
        type: "Plate",
        materialType: "SS304",
        thickness: 0.141,
        densityLbs: 0.29,
        weightPerSqFt: 5.73,
        costPerLb: 2.18,
        costPerSqFt: 12.49,
        laserAdvance6kW: 500,
        laserAdvance12kW: 1000
    },
    {
        description: "SS304 Ga.(0.125\") (11 Ga) #4",
        type: "Plate",
        materialType: "SS304",
        thickness: 0.125,
        densityLbs: 0.29,
        weightPerSqFt: 5.09,
        costPerLb: 2.18,
        costPerSqFt: 11.10,
        laserAdvance6kW: 709,
        laserAdvance12kW: 1418
    },
    {
        description: "SS316L Ga.(0.141\") (10 Ga) #4",
        type: "Plate",
        materialType: "SS316L",
        thickness: 0.141,
        densityLbs: 0.29,
        weightPerSqFt: 5.73,
        costPerLb: 2.50, // Higher for 316
        costPerSqFt: 14.32,
        laserAdvance6kW: 500,
        laserAdvance12kW: 1000
    },

    // FLAT BAR / BARRE PLATE
    {
        description: "Flat Acier Ga.(0.500\") 2.5\" wide",
        type: "Flat Bar",
        materialType: "Acier",
        thickness: 0.500,
        densityLbs: 0.284,
        weightPerLinearFt: 4.25,
        costPerLb: 0.18,
        costPerLinearFt: 0.75
    },
    {
        description: "Flat Alum Ga.(0.500\") 2.5\" wide",
        type: "Flat Bar",
        materialType: "Aluminium",
        thickness: 0.500,
        densityLbs: 0.098,
        weightPerLinearFt: 1.47,
        costPerLb: 1.10, // Approx
        costPerLinearFt: 1.62 // Approx
    },

    // ANGLE
    {
        description: "Angle Acier Ga.(0.250\") 2x2",
        type: "Angle",
        materialType: "Acier",
        thickness: 0.250,
        densityLbs: 0.284,
        weightPerLinearFt: 3.19,
        costPerLb: 0.61,
        costPerLinearFt: 1.93
    }
].map(m => ({
    profileDimensions: "",
    weightPerLinearFt: 0,
    weightPerSqFt: 0,
    costPerLb: 0,
    costPerSqFt: 0,
    costPerLinearFt: 0,
    laserAdvance6kW: 0,
    laserAdvance12kW: 0,
    ...m,
    id: 'm_' + Math.random().toString(36).substr(2, 9)
}));

data.materials = newMaterials;

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('Materials updated successfully');
