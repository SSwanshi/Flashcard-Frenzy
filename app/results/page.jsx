"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, hasMore: false });
  const router = useRouter();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchResults();
      } else {
        router.push('/login');
        return;
      }
      setAuthLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchResults();
        } else {
          router.push('/login');
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please log in to view results");
        return;
      }

      const response = await fetch(`/api/match/results?userId=${user?.id}&limit=${pagination.limit}&offset=${pagination.offset}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch results");
      }

      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      alert("Error loading results");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!pagination.hasMore) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const newOffset = pagination.offset + pagination.limit;
      const response = await fetch(`/api/match/results?userId=${user?.id}&limit=${pagination.limit}&offset=${newOffset}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setResults([...results, ...data.results]);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error loading more results:", error);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  // Only show content if user is authenticated
  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏆 Match Results
          </h1>
          <p className="text-gray-600">Your game history and achievements</p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 mr-4"
          >
            🏠 Home
          </button>
          <button
            onClick={fetchResults}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading results...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Results Yet</h2>
            <p className="text-gray-600 mb-6">You haven't completed any matches yet.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              Start Playing
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((result, index) => (
              <div key={result.matchId} className="bg-white rounded-2xl shadow-xl p-6">
                {/* Match Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Match #{results.length - index}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(result.finishedAt).toLocaleDateString()} at {new Date(result.finishedAt).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {result.totalQuestions} questions • {result.totalPlayers} players • {result.gameDuration} min
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">
                      {result.winner.isTied ? "🤝" : "👑"}
                    </div>
                    <p className="text-sm text-gray-600">
                      {result.winner.isTied ? "Tie!" : "Winner"}
                    </p>
                  </div>
                </div>

                {/* Winner Info */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-yellow-800">
                        {result.winner.isTied ? "Tied Winners" : "Winner"}
                      </h4>
                      <p className="text-yellow-700">
                        {result.winner.displayName} - {result.winner.score} points
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {result.winner.score}
                    </div>
                  </div>
                </div>

                {/* Player Rankings */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800 mb-3">Final Rankings</h4>
                  {result.players.map((player, playerIndex) => {
                    const isCurrentUser = player.userId === user.id;
                    const isWinner = player.isWinner;
                    
                    return (
                      <div
                        key={player.userId}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isWinner
                            ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300'
                            : isCurrentUser
                            ? 'bg-blue-50 border-2 border-blue-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            isWinner
                              ? 'bg-yellow-500 text-white'
                              : playerIndex === 1
                              ? 'bg-gray-400 text-white'
                              : playerIndex === 2
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-300 text-gray-700'
                          }`}>
                            {playerIndex === 0 ? '👑' : playerIndex + 1}
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
                          <p className={`text-xl font-bold ${
                            isWinner ? 'text-yellow-600' : isCurrentUser ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {player.score}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Game Stats */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Total Points</p>
                      <p className="font-bold text-gray-800">{result.gameStats.totalPointsAwarded}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average Score</p>
                      <p className="font-bold text-gray-800">{result.gameStats.averageScore}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Highest Score</p>
                      <p className="font-bold text-gray-800">{result.gameStats.highestScore}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Lowest Score</p>
                      <p className="font-bold text-gray-800">{result.gameStats.lowestScore}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {pagination.hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-gray-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              Load More Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
