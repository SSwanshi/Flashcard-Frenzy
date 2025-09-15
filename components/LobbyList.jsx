"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LobbyList() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchMatches();
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
          await fetchMatches();
        } else {
          router.push('/login');
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch available matches
  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please log in to view matches");
        return;
      }

      const response = await fetch('/api/match/list', {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }

      const data = await response.json();
      setMatches(data);
    } catch (error) {
      console.error("Error fetching matches:", error);
      alert("Error loading matches");
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <div className="text-gray-600 text-lg">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎮 Available Matches
          </h1>
          <p className="text-gray-600">Join an existing match or create a new one</p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 text-center space-x-4">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            🏠 Home
          </button>
          <button
            onClick={fetchMatches}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Matches List */}
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Active Matches</h2>
            <p className="text-gray-600 mb-6">There are no active matches at the moment.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              Create New Match
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match, index) => (
              <div key={match.matchId} className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    Match #{index + 1}
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Match ID</p>
                      <p className="text-lg font-bold text-indigo-600 font-mono">
                        {match.matchId?.substring(0, 8)}...
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Players</p>
                      <p className="text-lg font-bold text-green-600">
                        {match.players?.length || 0}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Current Question</p>
                      <p className="text-lg font-bold text-purple-600">
                        {(match.currentIndex || 0) + 1}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-800">Players:</h4>
                    <div className="space-y-1">
                      {match.players?.slice(0, 3).map((player, playerIndex) => (
                        <div key={player.userId} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {playerIndex + 1}. {player.displayName}
                          </span>
                          <span className="text-gray-500">
                            {player.score} pts
                          </span>
                        </div>
                      ))}
                      {match.players?.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{match.players.length - 3} more players
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => window.location.href = `/lobby/${match.matchId}`}
                    className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  >
                    Join Match
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
