// models/Match.js
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  flashcardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard', required: true },
  questionText: { type: String, required: true },
  answer: { type: String, required: true }, // stored to validate server-side
  answeredBy: { type: String, default: null }, // supabase user id
  answeredAt: { type: Date, default: null }
});

const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  displayName: { type: String, default: 'Player' },
  score: { type: Number, default: 0 }
});

const matchSchema = new mongoose.Schema({
  matchId: { type: String, unique: true, required: true },
  lobbyId: { type: String, unique: true, required: true },
  joinCode: { type: String, unique: true, required: true },
  hostUserId: { type: String, required: true },
  questions: [questionSchema],
  currentQuestionIndex: { type: Number, default: 0 },
  players: [playerSchema],
  status: { type: String, enum: ['waiting', 'in-progress', 'finished', 'ended'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Match || mongoose.model('Match', matchSchema);
