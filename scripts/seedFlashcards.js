import mongoose from "mongoose";
import dotenv from "dotenv";
import Flashcard from "../modals/Flashcard.js";

dotenv.config({ path: '.env.local' });

async function seedFlashcards() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    await Flashcard.deleteMany({});
    console.log("🧹 Old flashcards removed");

    const flashcards = [
      {
        question: "What is the capital of France?",
        options: ["Berlin", "Madrid", "Paris", "Rome"],
        answer: "Paris",
      },
      {
        question: "Which language runs in a web browser?",
        options: ["Python", "C++", "Java", "JavaScript"],
        answer: "JavaScript",
      },
      {
        question: "What does CSS stand for?",
        options: [
          "Central Style Sheets",
          "Cascading Style Sheets",
          "Computer Style Sheets",
          "Creative Style Sheets",
        ],
        answer: "Cascading Style Sheets",
      },
      {
        question: "Which company developed React?",
        options: ["Google", "Facebook", "Microsoft", "Amazon"],
        answer: "Facebook",
      },
    ];

    await Flashcard.insertMany(flashcards);
    console.log("✅ Flashcards seeded successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding flashcards:", error);
    process.exit(1);
  }
}

seedFlashcards();
