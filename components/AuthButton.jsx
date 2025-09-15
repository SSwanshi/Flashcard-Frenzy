"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthButton() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on component mount
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []); 

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // Logout is handled by the auth state change listener
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, show logout button
  if (user) {
    return (
      <div className="p-4 space-y-2">
        <div className="text-green-600 mb-4">
          Welcome back! You are signed in.
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded w-full disabled:opacity-50"
        >
          {loading ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  return (
    <div className="p-4 space-y-2">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Please sign in to continue</p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-indigo-600 text-white rounded w-full hover:bg-indigo-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}
