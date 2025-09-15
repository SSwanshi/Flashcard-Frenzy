"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'success', 'error', 'info'
  const router = useRouter();

  // Check for existing session on component mount
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push('/');
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          router.push('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    try {
      let result;
      if (mode === "signup") {
        result = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (result.error) {
          setMessageType("error");
          setMessage("Error: " + result.error.message);
        } else if (result.data.user && !result.data.session) {
          // User needs to verify email
          setMessageType("success");
          setMessage("🎉 Signup successful! Please check your email and click the verification link to complete your registration. Comeback here and signin again with the same email and password to get redirected to the homepage.");
        } else {
          // User is immediately signed in
          setMessageType("success");
          setMessage("Welcome! Redirecting to home page...");
          setTimeout(() => router.push('/'), 2000);
        }
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (result.error) {
          setMessageType("error");
          setMessage("Error: " + result.error.message);
        } else {
          setMessageType("success");
          setMessage("Welcome back! Redirecting to home page...");
          setTimeout(() => router.push('/'), 1500);
        }
      }
    } catch (error) {
      setMessageType("error");
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getMessageStyles = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚡</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Flashcard Frenzy</h1>
          <p className="text-gray-600">Join the ultimate flashcard gaming experience</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {mode === "signin" ? "Welcome Back!" : "Create Account"}
            </h2>
            <p className="text-gray-600">
              {mode === "signin" 
                ? "Sign in to continue your learning journey" 
                : "Join thousands of players worldwide"
              }
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl border-2 ${getMessageStyles()}`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {messageType === 'success' && <span className="text-green-500 text-xl">✅</span>}
                  {messageType === 'error' && <span className="text-red-500 text-xl">❌</span>}
                  {messageType === 'info' && <span className="text-blue-500 text-xl">ℹ️</span>}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
              />
              {mode === "signup" && (
                <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transform transition-all duration-200 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : mode === "signin"
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                mode === "signin" ? "Sign In" : "Create Account"
              )}
            </button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setMessage("");
                setMessageType("");
              }}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {mode === "signup" 
                ? "Already have an account? Sign in" 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">What you'll get:</p>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Real-time multiplayer
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Instant feedback
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Progress tracking
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Leaderboards
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
