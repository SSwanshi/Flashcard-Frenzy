"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthButton() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on component mount
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        router.push('/');
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          router.push('/');
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router]); 

  const handleAuth = async () => {
    setLoading(true);
    let result;
    if (mode === "signup") {
      result = await supabase.auth.signUp({
        email,
        password,
      });
    } else {
      result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }

    if (result.error) {
      alert("Error: " + result.error.message);
    }
    // Success is handled by the auth state change listener
    setLoading(false);
  };

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

  return (
    <div className="p-4 space-y-2">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 rounded w-full"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <button
        onClick={handleAuth}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded w-full disabled:opacity-50"
      >
        {loading ? "Processing..." : (mode === "signup" ? "Sign Up" : "Sign In")}
      </button>

      <button
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        disabled={loading}
        className="px-4 py-2 bg-gray-500 text-white rounded w-full disabled:opacity-50"
      >
        Switch to {mode === "signup" ? "Sign In" : "Sign Up"}
      </button>
    </div>
  );
}
