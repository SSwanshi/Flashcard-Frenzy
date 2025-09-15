// scripts/seedMongo.js (run with node scripts/seedMongo.js)
import { MongoClient } from 'mongodb.js';
const uri = process.env.MONGODB_URI;

const sample = [
  { question: "Capital of France?", answer: "Paris", tags: ["geo"] },
  { question: "2 + 2", answer: "4", tags: ["math"] },
  // more...
];

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  await db.collection('flashcards').insertMany(sample);
  console.log('seeded');
  await client.close();
}

run().catch(console.error);
