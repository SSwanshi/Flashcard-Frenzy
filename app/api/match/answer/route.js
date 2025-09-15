// app/api/match/answer/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Match from "@/modals/Match";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req) {
  try {
    console.log("=== ANSWER API CALLED ===");
    console.log("Timestamp:", new Date().toISOString());

    // Get user from Supabase token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.split(" ")[1];

    let user = null;
    if (token) {
      try {
        const { data: { user: supabaseUser }, error } = await supabaseServer.auth.getUser(token);
        if (error) {
          console.error("Auth error:", error);
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        user = supabaseUser;
      } catch (err) {
        console.error("Token validation error:", err);
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    if (!user) {
      console.log("No user found, using fallback for debugging");
      // Temporary fallback for debugging
      user = { 
        id: `debug-user-${Date.now()}`, 
        email: "debug@example.com",
        user_metadata: { full_name: "Debug User" }
      };
    }

    const body = await req.json();
    console.log("Request body:", body);

    const { matchId, answer } = body || {};
    if (!matchId || typeof answer !== "string") {
      console.log("Bad request - missing matchId or answer");
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    await dbConnect();
    const match = await Match.findOne({ matchId }).exec();
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    console.log("Match found:", {
      matchId: match.matchId,
      status: match.status,
      currentQuestionIndex: match.currentQuestionIndex,
      players: match.players,
      questionsCount: match.questions?.length
    });

    // Check if match is in a state that allows answers
    if (match.status === 'finished' || match.status === 'ended') {
      console.log("Match is finished, cannot accept answers");
      return NextResponse.json({ error: "Match is finished" }, { status: 400 });
    }

    // Set match to in-progress if it's still waiting
    if (match.status === 'waiting') {
      console.log("Setting match status to in-progress");
      await Match.findOneAndUpdate({ matchId }, { status: 'in-progress' });
    }

    const idx = match.currentQuestionIndex ?? 0;
    const q = match.questions?.[idx];
    if (!q) {
      console.log("No current question found at index:", idx);
      console.log("Available questions:", match.questions?.length || 0);
      return NextResponse.json({ error: "No current question" }, { status: 400 });
    }

    console.log("Current question data:", {
      index: idx,
      question: q,
      hasAnswer: !!q.answer,
      answerValue: q.answer,
      questionText: q.questionText,
      flashcardId: q.flashcardId
    });

    // Let's also fetch the full flashcard data to see the options
    try {
      const Flashcard = (await import('@/modals/Flashcard')).default;
      const flashcard = await Flashcard.findById(q.flashcardId).lean();
      console.log("Full flashcard data:", {
        question: flashcard?.question,
        options: flashcard?.options,
        answer: flashcard?.answer
      });
    } catch (err) {
      console.log("Could not fetch flashcard data:", err.message);
    }

    // normalize - be more flexible with answer matching
    const normalizedCorrect = String(q.answer || "").trim().toLowerCase();
    const normalizedGiven = String(answer || "").trim().toLowerCase();
    
    // Also try matching against the first word or key parts
    const correctWords = normalizedCorrect.split(/\s+/);
    const givenWords = normalizedGiven.split(/\s+/);
    
    // Check for exact match first
    const exactMatch = normalizedCorrect === normalizedGiven;
    
    // Check if all correct words are present in the given answer
    const containsAllWords = correctWords.every(word => 
      givenWords.some(givenWord => givenWord.includes(word) || word.includes(givenWord))
    );
    
    const isCorrect = exactMatch || containsAllWords;

    // Debug logging
    console.log("Answer validation debug:", {
      questionIndex: idx,
      correctAnswer: q.answer,
      normalizedCorrect,
      givenAnswer: answer,
      normalizedGiven,
      exactMatch,
      containsAllWords,
      isCorrect,
      correctWords,
      givenWords,
      questionData: q,
      userId: user.id,
      userEmail: user.email,
      currentPlayers: match.players,
      playerUserIds: match.players?.map(p => p.userId)
    });

    // ❌ incorrect
    if (!isCorrect) {
      console.log("Answer is INCORRECT:", {
        correct: normalizedCorrect,
        given: normalizedGiven,
        exactMatch,
        containsAllWords,
        isCorrect
      });
      return NextResponse.json({ correct: false, first: false });
    }

    console.log("Answer is CORRECT! Proceeding with score update...");

    const answeredByPath = `questions.${idx}.answeredBy`;
    const answeredAtPath = `questions.${idx}.answeredAt`;

    let resultResponse;

    // First, check if this question has already been answered
    const freshMatch = await Match.findOne({ matchId }).lean();
    if (freshMatch.questions?.[idx]?.answeredBy) {
      console.log("Question already answered by:", freshMatch.questions[idx].answeredBy);
      resultResponse = { correct: true, first: false };
    } else {
      // Try to be the first to answer this question
      console.log("Attempting to answer question first for user:", user.id);
      
      // Ensure player exists in the match
      const playerExists = freshMatch.players?.some(p => p.userId === user.id);
      if (!playerExists) {
        console.log("Player not in match, adding them first");
        await Match.findOneAndUpdate(
          { matchId },
          {
            $push: {
              players: {
                userId: user.id,
                displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || "Player",
                score: 0,
              },
            },
          }
        );
      }

      // Try to claim this question and get the point
      const updateRes = await Match.findOneAndUpdate(
        { 
          matchId, 
          [answeredByPath]: null  // Only if no one has answered yet
        },
        {
          $set: { 
            [answeredByPath]: user.id, 
            [answeredAtPath]: new Date() 
          },
          $inc: { "players.$[elem].score": 1 }  // Give point to the player
        },
        { 
          arrayFilters: [{ "elem.userId": user.id }],
          new: true 
        }
      ).exec();

      if (updateRes) {
        // Success! This player was first to answer
        const player = updateRes.players.find((p) => p.userId === user.id);
        console.log("SUCCESS: Player answered first and got point");
        console.log("Player score:", player?.score);
        resultResponse = { correct: true, first: true, newScore: player?.score ?? 0 };
      } else {
        // Someone else answered in between
        console.log("FAILED: Someone else answered first");
        resultResponse = { correct: true, first: false };
      }
    }

    // ✅ Broadcast realtime scoreboard update
    console.log("Broadcasting score update for match:", matchId);
    try {
      await supabaseServer.channel(`match:${matchId}`).send({
        type: "broadcast",
        event: "score_update",
        payload: { matchId },
      });
      console.log("Broadcast sent successfully");
    } catch (broadcastError) {
      console.error("Broadcast error:", broadcastError);
    }

    console.log("Final response:", resultResponse);
    return NextResponse.json(resultResponse);
  } catch (err) {
    console.error("/api/match/answer error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
