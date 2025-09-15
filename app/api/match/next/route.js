// app/api/match/next/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Match from "@/modals/Match";
import MatchResult from "@/modals/MatchResult";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req) {
  try {
    await dbConnect();

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    console.log("Next API - Auth header:", authHeader ? "Present" : "Missing");
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("Next API - Invalid auth header format");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log("Next API - Token length:", token?.length);

    // Get logged-in user from supabase auth using the token
    try {
      const {
        data: { user },
        error: userError,
      } = await supabaseServer.auth.getUser(token);

      if (userError) {
        console.log("Next API - Auth error details:", {
          message: userError.message,
          status: userError.status,
          name: userError.name
        });
        return NextResponse.json({ success: false, error: "Token validation failed" }, { status: 401 });
      }

      if (!user) {
        console.log("Next API - No user found");
        return NextResponse.json({ success: false, error: "No user found" }, { status: 401 });
      }

      console.log("Next API - User authenticated:", user.id);
    } catch (authError) {
      console.log("Next API - Auth exception:", authError.message);
      return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 401 });
    }

    const { matchId } = await req.json();

    const match = await Match.findOne({ matchId });
    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    console.log("Next question API debug:", {
      currentIndex: match.currentQuestionIndex,
      totalQuestions: match.questions.length,
      shouldEnd: match.currentQuestionIndex >= match.questions.length - 1
    });

    let eventType = "question_update";

    // Move to next question or end
    if (match.currentQuestionIndex < match.questions.length - 1) {
      match.currentQuestionIndex += 1;
      await match.save();
      console.log("Advanced to question:", match.currentQuestionIndex);
      eventType = "question_update";
    } else {
      match.status = "finished";
      await match.save();
      console.log("Game ended, status set to:", match.status);
      eventType = "match_ended";
      
      // Save match result when game finishes
      try {
        await saveMatchResult(match);
        console.log("Match result saved successfully");
      } catch (resultError) {
        console.error("Error saving match result:", resultError);
        // Don't fail the request if result saving fails
      }
    }

    // ✅ Broadcast update to Supabase channel
    try {
      await supabaseServer
        .channel(`match:${matchId}`)
        .send({
          type: "broadcast",
          event: eventType,
          payload: { 
            matchId,
            currentQuestionIndex: match.currentQuestionIndex,
            status: match.status,
            totalQuestions: match.questions.length
          }
        });
      console.log(`Broadcasted ${eventType} event for match ${matchId}`);
    } catch (e) {
      console.warn('Supabase broadcast error:', e.message || e);
    }

    return NextResponse.json({ success: true, match });
  } catch (error) {
    console.error("Next question API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper function to save match result
async function saveMatchResult(match) {
  try {
    // Check if result already exists
    const existingResult = await MatchResult.findOne({ matchId: match.matchId });
    if (existingResult) {
      console.log("Match result already exists for:", match.matchId);
      return existingResult;
    }

    // Calculate game statistics
    const players = match.players || [];
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const totalQuestions = match.questions?.length || 0;
    const totalPointsAwarded = players.reduce((sum, player) => sum + (player.score || 0), 0);
    
    // Determine winner and ties
    const highestScore = sortedPlayers[0]?.score || 0;
    const winners = sortedPlayers.filter(player => player.score === highestScore);
    const isTied = winners.length > 1;
    
    // Calculate ranks
    const playersWithRanks = sortedPlayers.map((player, index) => {
      const rank = index + 1;
      const isWinner = player.score === highestScore;
      const isTied = isWinner && winners.length > 1;
      
      return {
        userId: player.userId,
        displayName: player.displayName,
        score: player.score,
        rank,
        isWinner,
        isTied
      };
    });

    // Calculate game stats
    const averageScore = players.length > 0 ? totalPointsAwarded / players.length : 0;
    const lowestScore = sortedPlayers[sortedPlayers.length - 1]?.score || 0;
    
    // Calculate game duration
    const gameDuration = match.updatedAt ? 
      Math.round((new Date(match.updatedAt) - new Date(match.createdAt)) / (1000 * 60)) : 0;

    // Create match result
    const matchResult = new MatchResult({
      matchId: match.matchId,
      lobbyId: match.lobbyId,
      joinCode: match.joinCode,
      hostUserId: match.hostUserId,
      hostDisplayName: players.find(p => p.userId === match.hostUserId)?.displayName || 'Host',
      totalQuestions,
      totalPlayers: players.length,
      players: playersWithRanks,
      winner: {
        userId: winners[0]?.userId,
        displayName: winners[0]?.displayName,
        score: highestScore,
        isTied
      },
      gameStats: {
        totalPointsAwarded,
        averageScore: Math.round(averageScore * 100) / 100,
        highestScore,
        lowestScore
      },
      gameDuration,
      finishedAt: match.updatedAt || new Date()
    });

    await matchResult.save();
    console.log("Match result saved:", {
      matchId: matchResult.matchId,
      winner: matchResult.winner.displayName,
      totalPlayers: matchResult.totalPlayers,
      totalQuestions: matchResult.totalQuestions
    });

    return matchResult;
  } catch (error) {
    console.error("Error in saveMatchResult:", error);
    throw error;
  }
}
