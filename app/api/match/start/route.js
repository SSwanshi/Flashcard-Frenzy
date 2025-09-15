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

    const { matchId } = await req.json();
    if (!matchId) {
      return NextResponse.json({ success: false, error: "Match ID required" }, { status: 400 });
    }

    // Find the match
    const match = await Match.findOne({ matchId });
    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    // Check if user is the host
    if (match.hostUserId !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Only the host can start the game" 
      }, { status: 403 });
    }

    // Check if match is in waiting status
    if (match.status !== 'waiting') {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot start game. Current status: ${match.status}` 
      }, { status: 400 });
    }

    // Check if there are players
    if (!match.players || match.players.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Cannot start game with no players" 
      }, { status: 400 });
    }

    // Update match status to in-progress
    match.status = 'in-progress';
    match.updatedAt = new Date();
    await match.save();

    // Broadcast game started event
    try {
      await supabaseServer
        .channel(`match:${match.matchId}`)
        .send({
          type: 'broadcast',
          event: 'game-started',
          payload: {
            matchId: match.matchId,
            status: 'in-progress',
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
        status: match.status,
        players: match.players
      }
    });
  } catch (err) {
    console.error("Error starting game:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
