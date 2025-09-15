import mongoose from "mongoose";

const FlashcardSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  answer: { type: String, required: true },
});

// Prevent model overwrite issues in Next.js hot reload
export default mongoose.models.Flashcard ||
  mongoose.model("Flashcard", FlashcardSchema);
