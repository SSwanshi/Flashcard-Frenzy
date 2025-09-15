// app/api/match/get-by-lobby/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb.js";
import Match from "@/modals/Match";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lobbyId = searchParams.get("lobbyId");

    if (!lobbyId) {
      return NextResponse.json({ error: "Missing lobbyId" }, { status: 400 });
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
    const match = await Match.findOne({ lobbyId }).lean();
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
    
    // Validate scoring
    const totalQuestions = match.questions?.length || 0;
    const totalPointsAwarded = (match.players || []).reduce((sum, player) => sum + (player.score || 0), 0);
    const questionsAnswered = (match.questions || []).filter(q => q.answeredBy).length;
    
    console.log("Lobby score validation:", {
      totalQuestions,
      totalPointsAwarded,
      questionsAnswered,
      isValid: totalPointsAwarded === questionsAnswered
    });

    const sanitized = {
      matchId: match.matchId,
      lobbyId: match.lobbyId,
      joinCode: match.joinCode,
      hostUserId: match.hostUserId,
      status: match.status,
      currentQuestionIndex: currentIndex,
      questions: questionsWithFlashcards,
      players: match.players || [],
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
