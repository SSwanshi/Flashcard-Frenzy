import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/modals/Match';
import Flashcard from '@/modals/Flashcard';
import { v4 as uuidv4 } from 'uuid';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  return NextResponse.json(
    {
      error: 'This endpoint only accepts POST requests. Use POST to create a new match.',
      method: 'POST',
      example: {
        url: '/api/match/create',
        method: 'POST',
        body: {
          hostName: 'Player Name',
          numQuestions: 5
        }
      }
    },
    { status: 405 }
  );
}

export async function POST(req) {
  try {
    console.log('Create match API called');
    await dbConnect();
    console.log('Database connected');

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth header found');
      return NextResponse.json({ error: 'Unauthorized: please log in' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted');

    // ✅ get logged-in user from supabase auth using the token
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser(token);

    if (userError || !user) {
      console.log('User auth failed:', userError);
      return NextResponse.json({ error: 'Unauthorized: please log in' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // If no body is sent, use defaults
      body = {};
    }
    const { hostName = 'Host', numQuestions = 5 } = body;

    // ✅ sample random flashcards
    console.log('Sampling flashcards, numQuestions:', numQuestions);
    const sampled = await Flashcard.aggregate([
      { $sample: { size: Number(numQuestions) } },
    ]);
    console.log('Sampled flashcards:', sampled.length);

    // build questions snapshot (with answers stored internally)
    const questions = sampled.map((f) => ({
      flashcardId: f._id,
      questionText: f.question,
      answer: f.answer,
      answeredBy: null,
      answeredAt: null,
    }));

    // Generate join code (6 characters, alphanumeric)
    const generateJoinCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Generate lobby ID (8 characters, alphanumeric)
    const generateLobbyId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const joinCode = generateJoinCode();
    const lobbyId = generateLobbyId();

    // ✅ create match
    console.log('Creating match...');
    const match = await Match.create({
      matchId: uuidv4(),
      lobbyId: lobbyId,
      joinCode: joinCode,
      hostUserId: user.id, // real user id from Supabase
      questions,
      players: [{ userId: user.id, displayName: hostName, score: 0 }],
      status: 'waiting',
    });
    console.log('Match created:', match.matchId);

    // ✅ broadcast match-created (non-blocking)
    try {
      await supabaseServer
        .channel(`match:${match.matchId}`)
        .send({
          type: 'broadcast',
          event: 'match-created',
          payload: {
            matchId: match.matchId,
            host: { userId: user.id, displayName: hostName },
            numQuestions: questions.length,
          },
        });
    } catch (e) {
      console.warn('Supabase broadcast error:', e.message || e);
    }

    const response = {
      success: true,
      match: {
        matchId: match.matchId,
        lobbyId: match.lobbyId,
        joinCode: match.joinCode,
        numQuestions: questions.length,
        players: match.players,
        status: match.status
      }
    };
    console.log('Returning response:', response);
    return NextResponse.json(response);
  } catch (err) {
    console.error('create match error', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
