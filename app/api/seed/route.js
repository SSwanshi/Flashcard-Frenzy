import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/modals/Flashcard';

export async function GET() {
  try {
    await dbConnect();
    
    // Sample flashcards data
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

    // Clear existing flashcards
    await Flashcard.deleteMany({});
    
    // Insert sample flashcards
    const result = await Flashcard.insertMany(sampleFlashcards);
    
    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${result.length} flashcards`,
      count: result.length
    });
    
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to seed database' 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { 
      error: 'This endpoint only accepts GET requests. Use GET to seed the database.',
      method: 'GET'
    },
    { status: 405 }
  );
}
