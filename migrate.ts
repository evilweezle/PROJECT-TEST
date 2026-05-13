import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';

// Read config
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
    const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
    
    for (const collectionName in data) {
        if (Array.isArray(data[collectionName])) {
            console.log(`Migrating ${collectionName}...`);
            let batch = writeBatch(db);
            let count = 0;
            for (const item of data[collectionName]) {
                const id = item.id || Math.random().toString(36).slice(2, 11);
                batch.set(doc(db, collectionName, id), item);
                count++;
                
                if (count === 50) {
                    await batch.commit();
                    console.log(`Committed batch of 50 for ${collectionName}`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Delay 1s
                    batch = writeBatch(db);
                    count = 0;
                }
            }
            if (count > 0) {
                await batch.commit();
                console.log(`Committed final batch of ${count} for ${collectionName}`);
            }
        }
    }
    console.log("Migration complete!");
}

migrate().catch(console.error);
