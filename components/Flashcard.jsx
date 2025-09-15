"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Flashcard({ flashcard, matchId, questionNumber, totalQuestions, onAnswered }) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const submitAnswer = async (option) => {
    if (submitting) return;
    
    setSubmitting(true);
    setSelectedOption(option);
    
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    // Debug authentication
    console.log("Auth debug:", {
      hasSession: !!session,
      hasToken: !!token,
      userId: session?.user?.id
    });
    
    console.log("Making request to /api/match/answer with:", {
      matchId,
      flashcardId: flashcard.flashcardId,
      answer: option,
      hasToken: !!token
    });

    const res = await fetch("/api/match/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` }),
      },
      body: JSON.stringify({ matchId, flashcardId: flashcard.flashcardId, answer: option }),
    });

    const data = await res.json();
    
    // Debug logging
    console.log("Answer submission debug:", {
      selectedOption: option,
      response: data,
      responseStatus: res.status,
      flashcard: flashcard
    });
    
    // Handle error responses
    if (!res.ok) {
      console.error("API Error:", data);
      setIsCorrect(false);
      setShowResult(true);
      setSubmitting(false);
      return;
    }
    
    setIsCorrect(data.correct || false);
    setShowResult(true);
    setSubmitting(false);
    
    // Call onAnswered callback to refresh match data
    if (onAnswered) {
      onAnswered();
    }
    
    // Auto-advance to next question after correct answer
    if (data.correct) {
      setTimeout(async () => {
        try {
          const response = await fetch("/api/match/next", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId }),
          });
          
          if (response.ok) {
            // Refresh match data to show next question
            if (onAnswered) {
              onAnswered();
            }
          }
        } catch (error) {
          console.error("Error advancing to next question:", error);
        }
      }, 2000); // Wait 2 seconds before auto-advancing
    }
    
    // Auto-hide result after 2 seconds
    setTimeout(() => {
      setShowResult(false);
      setSelectedOption(null);
    }, 2000);
  };

  return (
    <div className="relative">
      {/* Question Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium mb-4">
          Question {questionNumber} of {totalQuestions}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-relaxed">
          {flashcard.question}
        </h2>
      </div>

      {/* Answer Options */}
      <div className="space-y-3 max-w-2xl mx-auto">
        {(flashcard.options || []).map((opt, i) => {
          const isSelected = selectedOption === opt;
          const isCorrectAnswer = showResult && isCorrect && isSelected;
          const isWrongAnswer = showResult && !isCorrect && isSelected;
          
          return (
            <button
              key={i}
              disabled={submitting || showResult}
              onClick={() => submitAnswer(opt)}
              className={`
                w-full p-4 text-left rounded-xl font-medium transition-all duration-200 transform
                ${submitting || showResult 
                  ? 'cursor-not-allowed' 
                  : 'hover:scale-105 hover:shadow-lg active:scale-95'
                }
                ${isCorrectAnswer 
                  ? 'bg-green-500 text-white shadow-lg' 
                  : isWrongAnswer 
                    ? 'bg-red-500 text-white shadow-lg'
                    : showResult && !isSelected
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                }
                ${submitting && !isSelected ? 'opacity-50' : ''}
              `}
            >
              <div className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4
                  ${isCorrectAnswer || isWrongAnswer 
                    ? 'bg-white bg-opacity-20' 
                    : 'bg-indigo-100 text-indigo-600'
                  }
                `}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="text-lg">{opt}</span>
                {isCorrectAnswer && (
                  <div className="ml-auto">
                    <span className="text-2xl">✓</span>
                  </div>
                )}
                {isWrongAnswer && (
                  <div className="ml-auto">
                    <span className="text-2xl">✗</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {submitting && (
        <div className="text-center mt-6">
          <div className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
            Checking answer...
          </div>
        </div>
      )}

      {/* Result Message */}
      {showResult && (
        <div className={`
          text-center mt-6 p-4 rounded-xl font-semibold text-lg
          ${isCorrect 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
          }
        `}>
          {isCorrect ? '🎉 Correct! Well done!' : '❌ Incorrect. Try again!'}
        </div>
      )}
    </div>
  );
}
