import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Match from "@/modals/Match";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req) {
  try {
    await dbConnect();

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Get logged-in user from supabase auth using the token
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { joinCode } = await req.json();
    if (!joinCode) {
      return NextResponse.json({ success: false, error: "Join code required" }, { status: 400 });
    }

    const match = await Match.findOne({ joinCode });
    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    // Check if match is still joinable
    if (match.status !== 'waiting') {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot join match. Status: ${match.status}. Only matches with status 'waiting' can be joined.` 
      }, { status: 400 });
    }

    // Check if user is already in the match
    const existingPlayer = match.players.find(p => p.userId === user.id);
    if (existingPlayer) {
      return NextResponse.json({ 
        success: true, 
        match,
        message: "You are already in this match" 
      });
    }

    // Add player to match
    match.players.push({ userId: user.id, displayName: user.email?.split('@')[0] || 'Player', score: 0 });
    await match.save();

    // Broadcast player joined event
    try {
      await supabaseServer
        .channel(`match:${match.matchId}`)
        .send({
          type: 'broadcast',
          event: 'player_joined',
          payload: {
            matchId: match.matchId,
            lobbyId: match.lobbyId,
            player: { userId: user.id, displayName: user.email?.split('@')[0] || 'Player', score: 0 },
            players: match.players
          },
        });
    } catch (e) {
      console.warn('Supabase broadcast error:', e.message || e);
    }

    return NextResponse.json({ 
      success: true, 
      match: {
        matchId: match.matchId,
        lobbyId: match.lobbyId,
        joinCode: match.joinCode,
        hostUserId: match.hostUserId,
        players: match.players,
        status: match.status,
        questions: match.questions
      }
    });
  } catch (err) {
    console.error("Error joining match:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
