// models/MatchResult.js
import mongoose from 'mongoose';

const playerResultSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  displayName: { type: String, required: true },
  score: { type: Number, required: true },
  rank: { type: Number, required: true }, // 1st, 2nd, 3rd, etc.
  isWinner: { type: Boolean, default: false },
  isTied: { type: Boolean, default: false }
});

const matchResultSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  lobbyId: { type: String, required: true },
  joinCode: { type: String, required: true },
  hostUserId: { type: String, required: true },
  hostDisplayName: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  totalPlayers: { type: Number, required: true },
  players: [playerResultSchema],
  winner: {
    userId: { type: String },
    displayName: { type: String },
    score: { type: Number },
    isTied: { type: Boolean, default: false }
  },
  gameStats: {
    totalPointsAwarded: { type: Number, required: true },
    averageScore: { type: Number, required: true },
    highestScore: { type: Number, required: true },
    lowestScore: { type: Number, required: true }
  },
  gameDuration: { type: Number }, // in minutes
  finishedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
matchResultSchema.index({ matchId: 1 });
matchResultSchema.index({ hostUserId: 1 });
matchResultSchema.index({ finishedAt: -1 });
matchResultSchema.index({ 'winner.userId': 1 });

export default mongoose.models.MatchResult || mongoose.model('MatchResult', matchResultSchema);
