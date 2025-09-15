import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import dbConnect from "@/lib/mongodb";
import Match from "@/modals/Match";
import MatchResult from "@/modals/MatchResult";

export async function POST(req) {
  try {
    await dbConnect();

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    console.log("Save result API - Auth header:", authHeader ? "Present" : "Missing");
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("Save result API - Invalid auth header format");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      console.log("Save result API - Auth error:", authError?.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId } = await req.json();
    
    if (!matchId) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    // Find the match
    const match = await Match.findOne({ matchId }).lean();
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Check if match is finished
    if (match.status !== 'finished') {
      return NextResponse.json({ error: "Match is not finished yet" }, { status: 400 });
    }

    // Check if result already exists
    const existingResult = await MatchResult.findOne({ matchId });
    if (existingResult) {
      return NextResponse.json({ 
        success: true, 
        message: "Match result already saved",
        result: existingResult 
      });
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

    return NextResponse.json({ 
      success: true, 
      message: "Match result saved successfully",
      result: matchResult 
    });

  } catch (err) {
    console.error("Error saving match result:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
