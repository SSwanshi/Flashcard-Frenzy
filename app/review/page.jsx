"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ReviewPage() {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
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
        await fetchFlashcards();
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
          await fetchFlashcards();
        } else {
          router.push('/login');
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch flashcards for review
  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please log in to review flashcards");
        return;
      }

      const response = await fetch('/api/seed', {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data = await response.json();
      if (data.success) {
        // For now, we'll use a sample set since we don't have a dedicated review endpoint
        const sampleFlashcards = [
          { question: "What is the capital of France?", answer: "Paris", tags: ["geography", "capitals"] },
          { question: "What is 2 + 2?", answer: "4", tags: ["math", "arithmetic"] },
          { question: "What is the largest planet in our solar system?", answer: "Jupiter", tags: ["science", "astronomy"] },
          { question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci", tags: ["art", "history"] },
          { question: "What is the chemical symbol for gold?", answer: "Au", tags: ["science", "chemistry"] },
          { question: "What is the smallest country in the world?", answer: "Vatican City", tags: ["geography", "countries"] },
          { question: "What is the speed of light?", answer: "299,792,458 meters per second", tags: ["science", "physics"] },
          { question: "Who wrote 'To Kill a Mockingbird'?", answer: "Harper Lee", tags: ["literature", "books"] },
          { question: "What is the largest ocean on Earth?", answer: "Pacific Ocean", tags: ["geography", "oceans"] },
          { question: "What is the currency of Japan?", answer: "Yen", tags: ["geography", "economics"] }
        ];
        setFlashcards(sampleFlashcards);
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      alert("Error loading flashcards");
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const resetReview = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
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
        <div className="text-gray-600 text-lg">Loading flashcards...</div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Flashcards Available</h2>
          <p className="text-gray-600 mb-6">There are no flashcards to review at the moment.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📚 Flashcard Review
          </h1>
          <p className="text-gray-600">Study and review flashcards at your own pace</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Card {currentIndex + 1} of {flashcards.length}
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

        {/* Flashcard */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 min-h-[400px] flex flex-col justify-center">
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {currentCard.question}
              </h2>
              
              {showAnswer && (
                <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Answer:</h3>
                  <p className="text-xl text-green-700 font-medium">
                    {currentCard.answer}
                  </p>
                </div>
              )}

              {currentCard.tags && currentCard.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {currentCard.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {!showAnswer ? (
                <button
                  onClick={toggleAnswer}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  Show Answer
                </button>
              ) : (
                <div className="space-x-4">
                  <button
                    onClick={toggleAnswer}
                    className="bg-gray-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:bg-gray-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  >
                    Hide Answer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={prevCard}
            disabled={currentIndex === 0}
            className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 ${
              currentIndex === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1'
            }`}
          >
            ← Previous
          </button>

          <div className="text-center">
            <button
              onClick={resetReview}
              className="bg-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:bg-purple-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              🔄 Reset Review
            </button>
          </div>

          <button
            onClick={nextCard}
            disabled={currentIndex === flashcards.length - 1}
            className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 ${
              currentIndex === flashcards.length - 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1'
            }`}
          >
            Next →
          </button>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-x-4">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            🏠 Home
          </button>
          <button
            onClick={() => window.location.href = '/results'}
            className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-orange-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            🏆 View Results
          </button>
        </div>
      </div>
    </div>
  );
}
