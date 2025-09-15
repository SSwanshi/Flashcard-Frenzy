"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function HomePage() {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
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
        } else {
          router.push('/login');
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Create Match
  const handleCreateMatch = async () => {
    setLoading(true);
    try {
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please log in to create a match");
        return;
      }

      const res = await fetch("/api/match/create", { 
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        }
      });
      
      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', errorText);
        alert(`API Error: ${res.status} - ${errorText}`);
        return;
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (data.success) {
        // Show join code and redirect to lobby
        alert(`Match created! Join code: ${data.match.joinCode}\nShare this code with other players to join your match.`);
        router.push(`/lobby/${data.match.lobbyId}`);
      } else {
        alert(data.error || "Failed to create match");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating match");
    } finally {
      setLoading(false);
    }
  };

  // Join Match
  const handleJoinMatch = async () => {
    if (!joinCode.trim()) {
      alert("Please enter a join code");
      return;
    }

    setLoading(true);
    try {
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please log in to join a match");
        return;
      }

      const res = await fetch("/api/match/join", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ joinCode }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.message) {
          alert(data.message);
        }
        router.push(`/lobby/${data.match.lobbyId}`);
      } else {
        alert(data.error || "Failed to join match");
      }
    } catch (err) {
      console.error(err);
      alert("Error joining match");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold text-gray-800 mb-10">⚡ Flashcard Frenzy</h1>

      <div className="flex flex-col gap-6 w-full max-w-sm">
        {/* Create Match */}
        <button
          onClick={handleCreateMatch}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {loading ? "Creating..." : "Create Match"}
        </button>

        {/* Join Match */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter Join Code"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
          />
          <button
            onClick={handleJoinMatch}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl w-full transition-all duration-200"
          >
            {loading ? "Joining..." : "Join Match"}
          </button>
        </div>

        {/* View Results */}
        <button
          onClick={() => window.location.href = '/results'}
          className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          🏆 View Results
        </button>
      </div>
    </div>
  );
}
