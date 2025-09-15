// app/login/page.jsx
import React from 'react';
import AuthButton from '../../components/AuthButton';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md p-8 rounded-lg bg-white shadow-md">
        <h1 className="text-2xl font-bold mb-4">Flashcard Frenzy — Login</h1>
        <p className="mb-6">Sign in to join or create matches and play in real-time.</p>
        <AuthButton />
      </div>
    </div>
  );
}
