import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import dbConnect from "@/lib/mongodb";
import MatchResult from "@/modals/MatchResult";

export async function GET(req) {
  try {
    await dbConnect();

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    console.log("Results API - Auth header:", authHeader ? "Present" : "Missing");
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("Results API - Invalid auth header format");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      console.log("Results API - Auth error:", authError?.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let query = {};

    // If matchId is provided, get specific match result
    if (matchId) {
      query.matchId = matchId;
    }

    // If userId is provided, get results for that user (as host or player)
    if (userId) {
      query.$or = [
        { hostUserId: userId },
        { 'players.userId': userId }
      ];
    }

    // Get match results
    const results = await MatchResult.find(query)
      .sort({ finishedAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    // Get total count for pagination
    const totalCount = await MatchResult.countDocuments(query);

    console.log("Match results retrieved:", {
      count: results.length,
      totalCount,
      query
    });

    return NextResponse.json({ 
      success: true, 
      results,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (err) {
    console.error("Error retrieving match results:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
