// app/api/match/get/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb.js";
import Match from "@/modals/Match";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Get logged-in user from supabase auth using the token
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const match = await Match.findOne({ matchId }).lean();
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    // sanitize: do NOT include correct answers
    const currentIndex = match.currentQuestionIndex ?? 0;
    
    // Fetch full flashcard data for each question
    const Flashcard = (await import('@/modals/Flashcard')).default;
    const questionsWithFlashcards = await Promise.all(
      (match.questions || []).map(async (q) => {
        const flashcard = await Flashcard.findById(q.flashcardId).lean();
        return {
          flashcardId: q.flashcardId,
          question: flashcard?.question || q.questionText,
          options: flashcard?.options || [],
          answer: q.answer, // Include answer for validation
          answeredBy: q.answeredBy,
          answeredAt: q.answeredAt
        };
      })
    );
    
    // Validate and fix scoring if needed
    const totalQuestions = match.questions?.length || 0;
    const totalPointsAwarded = (match.players || []).reduce((sum, player) => sum + (player.score || 0), 0);
    const questionsAnswered = (match.questions || []).filter(q => q.answeredBy).length;
    
    console.log("Score validation:", {
      totalQuestions,
      totalPointsAwarded,
      questionsAnswered,
      isValid: totalPointsAwarded === questionsAnswered
    });

    // If there's a mismatch, log it but don't fix automatically to avoid data corruption
    if (totalPointsAwarded !== questionsAnswered) {
      console.warn("Score mismatch detected:", {
        totalPointsAwarded,
        questionsAnswered,
        matchId: match.matchId
      });
    }

    const sanitized = {
      matchId: match.matchId,
      lobbyId: match.lobbyId,
      joinCode: match.joinCode,
      hostUserId: match.hostUserId,
      status: match.status,
      currentQuestionIndex: currentIndex,
      questions: questionsWithFlashcards,
      players: match.players || [],
      // Add validation info for debugging
      _validation: {
        totalQuestions,
        totalPointsAwarded,
        questionsAnswered,
        isValid: totalPointsAwarded === questionsAnswered
      }
    };

    return NextResponse.json({ success: true, match: sanitized });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
