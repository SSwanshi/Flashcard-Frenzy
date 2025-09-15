"use client";
import { useEffect, useState, useCallback } from "react";
import Flashcard from "@/components/Flashcard";
import Scoreboard from "@/components/Scoreboard";
import { supabase } from "@/lib/supabaseClient";
import { useMatchRealtime } from "@/components/useMatchRealtime";

export default function GamePage({ params }) {
  const matchId = params.matchId;
  const [match, setMatch] = useState(null);
  const [userId, setUserId] = useState(null);

  // Get logged-in user ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    };
    fetchUser();
  }, []);

  // Fetch match data
  const fetchMatch = useCallback(async () => {
    try {
      console.log("Fetching match data for:", matchId);
      
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error("No access token found");
        return;
      }

      const res = await fetch(`/api/match/get?matchId=${matchId}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch match");
      const data = await res.json();
      if (data.success) {
        console.log("Match data received:", {
          players: data.match.players,
          scores: data.match.players?.map(p => ({ userId: p.userId, score: p.score, displayName: p.displayName })),
          validation: data.match._validation
        });
        
        // Log each player's score individually
        data.match.players?.forEach((player, index) => {
          console.log(`Player ${index + 1}:`, {
            userId: player.userId,
            displayName: player.displayName,
            score: player.score
          });
        });
        setMatch(data.match);
      }
    } catch (err) {
      console.error("Fetch match error:", err);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // ✅ Realtime updates via hook
  useMatchRealtime(matchId, {
    onQuestionUpdate: (payload) => {
      console.log("Realtime: question updated", payload);
      console.log("Question update payload:", {
        matchId: payload.matchId,
        currentQuestionIndex: payload.currentQuestionIndex,
        status: payload.status,
        totalQuestions: payload.totalQuestions
      });
      fetchMatch();
    },
    onScoreUpdate: (payload) => {
      console.log("Realtime: score updated", payload);
      console.log("Refreshing match data after score update...");
      fetchMatch();
    },
    onMatchEnded: (payload) => {
      console.log("Realtime: match ended", payload);
      fetchMatch();
    },
    onGameStarted: (payload) => {
      console.log("Realtime: game started", payload);
      fetchMatch();
    },
    onCustom: (payload) => {
      // Handle any other events that might affect the game state
      console.log("Realtime: custom event", payload);
      if (payload.event === 'match_update' || payload.event === 'question_update') {
        fetchMatch();
      }
    },
  });

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading match...</p>
        </div>
      </div>
    );
  }

  // If match is still waiting, redirect to lobby
  if (match.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Not Started</h2>
          <p className="text-gray-600 mb-4">The game is still in the lobby. Please wait for the host to start the game.</p>
          <button
            onClick={() => window.location.href = `/lobby/${matchId}`}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Go to Lobby
          </button>
        </div>
      </div>
    );
  }

  const currentFlashcard = match.questions?.[match.currentQuestionIndex];
  const totalQuestions = match.questions?.length || 0;
  const currentQuestionNumber = (match.currentQuestionIndex || 0) + 1;
  const progress =
    totalQuestions > 0
      ? (currentQuestionNumber / totalQuestions) * 100
      : 0;


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Flashcard Frenzy
          </h1>
          <p className="text-gray-600">Match ID: {match.matchId}</p>
        </div>

        {/* Scoreboard */}
        <div className="mb-8">
          <Scoreboard
            players={match.players || []}
          />
        </div>


        {/* Main Game Area */}
        {match.status !== "finished" && match.currentQuestionIndex < totalQuestions && (
          <>
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Question {currentQuestionNumber} of {totalQuestions}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              {currentFlashcard ? (
                <Flashcard
                  flashcard={currentFlashcard}
                  matchId={match.matchId}
                  onAnswered={fetchMatch}
                  questionNumber={currentQuestionNumber}
                  totalQuestions={totalQuestions}
                  userId={userId}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <p className="text-xl font-semibold text-gray-600">
                    No flashcards available
                  </p>
                  <p className="text-gray-500 mt-2">
                    Please check back later or create a new match
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Show leaderboard when no questions left but game not finished */}
        {match.status !== "finished" && 
         ((match.currentQuestionIndex >= totalQuestions) || 
          (match.currentQuestionIndex === totalQuestions - 1 && match.questions?.[match.currentQuestionIndex]?.answeredBy)) && 
         totalQuestions > 0 && (
          <div className="text-center">
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">
              All Questions Completed!
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Waiting for host to finish the game...
            </p>
            
            {/* Current Leaderboard */}
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Current Leaderboard</h3>
              <div className="space-y-3">
                {[...(match.players || [])]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => {
                    const isCurrentUser = player.userId === userId;
                    const isLeader = index === 0;
                    
                    return (
                      <div
                        key={player.userId}
                        className={`flex items-center justify-between p-4 rounded-xl ${
                          isLeader
                            ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300'
                            : isCurrentUser
                            ? 'bg-blue-50 border-2 border-blue-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            isLeader
                              ? 'bg-yellow-500 text-white'
                              : index === 1
                              ? 'bg-gray-400 text-white'
                              : index === 2
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-300 text-gray-700'
                          }`}>
                            {index === 0 ? '👑' : index + 1}
                          </div>
                          <div>
                            <p className={`font-semibold ${
                              isLeader ? 'text-yellow-800' : isCurrentUser ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                              {player.displayName}
                              {isCurrentUser && ' (You)'}
                              {isLeader && ' 🏆'}
                            </p>
                            <p className={`text-sm ${
                              isLeader ? 'text-yellow-600' : isCurrentUser ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {player.score} point{player.score !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            isLeader ? 'text-yellow-600' : isCurrentUser ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {player.score}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-8 space-x-4">
              <button
                onClick={() => window.location.href = '/'}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                🏠 Home
              </button>
              
              {/* Finish Game Button for Host */}
              {(userId === match.hostUserId || !match.hostUserId) && (
                <button
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  onClick={async () => {
                    try {
                      console.log("Finishing game:", match.matchId);
                      
                      // Get the current session to get the access token
                      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
                      
                      if (!session?.access_token) {
                        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
                        if (refreshedSession?.access_token) {
                          session = refreshedSession;
                        } else {
                          console.error("Failed to refresh session:", refreshError?.message);
                          alert("Please log in again to continue");
                          return;
                        }
                      }

                      const response = await fetch("/api/match/next", {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({ matchId: match.matchId }),
                      });
                      
                      const data = await response.json();
                      console.log("Finish game response:", data);
                      
                      if (data.success) {
                        console.log("Game finished successfully");
                        await fetchMatch(); // Refresh the match data
                      } else {
                        console.error("Failed to finish game:", data.error);
                        alert(data.error || "Failed to finish game");
                      }
                    } catch (err) {
                      console.error("Error finishing game:", err);
                      alert("Error finishing game");
                    }
                  }}
                >
                  Finish Game
                </button>
              )}
            </div>
          </div>
        )}

        {/* Game Controls */}
        <div className="text-center">
          {(userId === match.hostUserId || !match.hostUserId) &&
            match.status !== "finished" &&
            match.currentQuestionIndex < totalQuestions - 1 && (
              <button
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                onClick={async () => {
                  try {
                    console.log("Moving to next question:", match.matchId);
                    
                    // Get the current session to get the access token
                    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
                    
                    console.log("Session debug:", {
                      hasSession: !!session,
                      sessionError: sessionError?.message,
                      hasToken: !!session?.access_token,
                      tokenLength: session?.access_token?.length,
                      userId: session?.user?.id,
                      sessionKeys: session ? Object.keys(session) : 'no session'
                    });
                    
                    // If no session, try to refresh
                    if (!session?.access_token) {
                      console.log("No session found, trying to refresh...");
                      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
                      
                      if (refreshedSession?.access_token) {
                        session = refreshedSession;
                        console.log("Session refreshed successfully");
                      } else {
                        console.error("Failed to refresh session:", refreshError?.message);
                        alert("Please log in again to continue");
                        return;
                      }
                    }

                    const headers = { 
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${session.access_token}`
                    };
                    
                    console.log("Request headers:", headers);
                    
                    const response = await fetch("/api/match/next", {
                      method: "POST",
                      headers: headers,
                      body: JSON.stringify({ matchId: match.matchId }),
                    });

                    console.log("Next question response status:", response.status);
                    
                    if (!response.ok) {
                      const err = await response.json();
                      console.error("Next question error:", err);
                      alert(`Error: ${err.error || 'Failed to move to next question'}`);
                    } else {
                      const responseData = await response.json();
                      console.log("Successfully moved to next question");
                      console.log("Response data:", responseData);
                      // Refresh match data to show the next question
                      fetchMatch();
                    }
                  } catch (error) {
                    console.error("Failed to move next:", error);
                  }
                }}
              >
                Next Question →
              </button>
            )}

          {match.status === "finished" && (
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-4xl font-bold text-gray-800 mb-2">
                Game Over!
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Great job completing all the questions!
              </p>
              
              {/* Winner Announcement */}
              {(() => {
                const sortedPlayers = [...(match.players || [])].sort((a, b) => b.score - a.score);
                const winner = sortedPlayers[0];
                const isTie = sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score;
                
                return (
                  <div className="mb-8">
                    {isTie ? (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
                        <div className="text-2xl mb-2">🤝</div>
                        <h3 className="text-2xl font-bold text-yellow-800 mb-2">It's a Tie!</h3>
                        <p className="text-lg text-yellow-700">
                          Multiple players tied with {winner?.score || 0} points!
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
                        <div className="text-4xl mb-3">👑</div>
                        <h3 className="text-3xl font-bold text-yellow-800 mb-2">Winner!</h3>
                        <p className="text-2xl font-semibold text-orange-700 mb-1">
                          {winner?.displayName || 'Unknown Player'}
                        </p>
                        <p className="text-lg text-yellow-600">
                          with {winner?.score || 0} points
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Leaderboard */}
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Final Leaderboard</h3>
                <div className="space-y-3">
                  {[...(match.players || [])]
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => {
                      const isCurrentUser = player.userId === userId;
                      const isWinner = index === 0;
                      
                      return (
                        <div
                          key={player.userId}
                          className={`flex items-center justify-between p-4 rounded-xl ${
                            isWinner
                              ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300'
                              : isCurrentUser
                              ? 'bg-blue-50 border-2 border-blue-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              isWinner
                                ? 'bg-yellow-500 text-white'
                                : index === 1
                                ? 'bg-gray-400 text-white'
                                : index === 2
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-300 text-gray-700'
                            }`}>
                              {index === 0 ? '👑' : index + 1}
                            </div>
                            <div>
                              <p className={`font-semibold ${
                                isWinner ? 'text-yellow-800' : isCurrentUser ? 'text-blue-800' : 'text-gray-800'
                              }`}>
                                {player.displayName}
                                {isCurrentUser && ' (You)'}
                                {isWinner && ' 🏆'}
                              </p>
                              <p className={`text-sm ${
                                isWinner ? 'text-yellow-600' : isCurrentUser ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                                {player.score} point{player.score !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              isWinner ? 'text-yellow-600' : isCurrentUser ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {player.score}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-8 space-x-4">
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  🏠 Home
                </button>
                {(userId === match.hostUserId || !match.hostUserId) && (
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  >
                    Play Again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
