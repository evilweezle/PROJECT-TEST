import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import fs from 'fs';

// Read config
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionName = process.argv[2];

async function migrate() {
    const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
    const items = data[collectionName];
    if (!items) {
        console.log(`Collection ${collectionName} not found.`);
        return;
    }
    console.log(`Migrating ${collectionName}...`);
    
    for (let i = 0; i < items.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + 500);
        for (const item of chunk) {
            const id = item.id || Math.random().toString(36).slice(2, 11);
            batch.set(doc(db, collectionName, id), item);
        }
        await batch.commit();
        console.log(`Committed batch ${Math.floor(i / 500) + 1} for ${collectionName}`);
    }
    console.log(`Migration of ${collectionName} complete!`);
}

migrate().catch(console.error);
