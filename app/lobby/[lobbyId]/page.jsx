"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useMatchRealtime } from "@/components/useMatchRealtime";

export default function LobbyPage({ params }) {
  const lobbyId = params.lobbyId;
  const [match, setMatch] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Get logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        router.push('/login');
      }
    };
    fetchUser();
  }, [router]);

  // Fetch match data by lobbyId
  const fetchMatch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please log in to view match");
        return;
      }

      const res = await fetch(`/api/match/get-by-lobby?lobbyId=${lobbyId}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMatch(data.match);
        } else {
          alert(data.error || "Match not found");
          router.push('/');
        }
      } else {
        alert("Failed to fetch match");
        router.push('/');
      }
    } catch (err) {
      console.error("Error fetching match:", err);
      alert("Error fetching match");
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchMatch();
    }
  }, [userId, lobbyId]);

  // Real-time updates for lobby
  useMatchRealtime(match?.matchId, {
    onPlayerJoined: (payload) => {
      console.log("Player joined:", payload);
      fetchMatch();
    },
    onGameStarted: (payload) => {
      console.log("Game started:", payload);
      if (payload.matchId) {
        router.push(`/game/${payload.matchId}`);
      } else if (match?.matchId) {
        router.push(`/game/${match.matchId}`);
      }
    },
    onMatchEnded: (payload) => {
      console.log("Match ended:", payload);
      fetchMatch();
    },
  });

  // Start game function
  const startGame = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please log in to start game");
        return;
      }

      const res = await fetch("/api/match/start", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ matchId: match?.matchId }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/game/${match?.matchId}`);
      } else {
        alert(data.error || "Failed to start game");
      }
    } catch (err) {
      console.error("Error starting game:", err);
      alert("Error starting game");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading lobby...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lobby Not Found</h2>
          <p className="text-gray-600 mb-4">The lobby you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isHost = userId === match.hostUserId;
  const canStart = isHost && match.status === 'waiting' && match.players.length >= 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ⚡ Flashcard Frenzy
          </h1>
          <p className="text-gray-600">Match Lobby</p>
        </div>

        {/* Match Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Match Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Join Code</p>
                <p className="text-2xl font-bold text-indigo-600">{match.joinCode}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Questions</p>
                <p className="text-2xl font-bold text-green-600">{match.questions?.length || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold text-purple-600 capitalize">{match.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Players ({match.players?.length || 0})</h3>
          <div className="space-y-3">
            {match.players?.map((player, index) => (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.userId === match.hostUserId
                    ? 'bg-yellow-50 border-2 border-yellow-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {player.displayName}
                      {player.userId === match.hostUserId && (
                        <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                          HOST
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">Score: {player.score}</p>
                  </div>
                </div>
                {player.userId === userId && (
                  <span className="text-sm text-indigo-600 font-medium">You</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Game Controls */}
        <div className="text-center">
          {match.status === 'waiting' && (
            <>
              {isHost ? (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Share the join code <span className="font-bold text-indigo-600">{match.joinCode}</span> with other players
                  </p>
                  <button
                    onClick={startGame}
                    disabled={!canStart}
                    className={`px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 ${
                      canStart
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-xl transform hover:-translate-y-1'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {canStart ? 'Start Game' : 'Waiting for players...'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Waiting for host to start the game...
                  </p>
                  <button
                    onClick={fetchMatch}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </>
          )}

          {match.status === 'in-progress' && (
            <div className="space-y-4">
              <p className="text-green-600 font-semibold">Game in progress!</p>
              <button
                onClick={() => router.push(`/game/${match.matchId}`)}
                className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                Join Game
              </button>
            </div>
          )}

          {match.status === 'finished' && (
            <div className="space-y-4">
              <p className="text-gray-600">This match has ended.</p>
              <button
                onClick={() => router.push('/')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Go Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
