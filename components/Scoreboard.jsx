// components/Scoreboard.jsx
'use client';
import React from 'react';

/**
 * Props:
 * - players: [{ userId, displayName, score }]
 */
export default function Scoreboard({ players = [] }) {
  const sorted = [...(players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
  const maxScore = Math.max(...sorted.map(p => p.score || 0), 1); // Avoid division by zero

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center">
          <span className="text-3xl mr-3">🏆</span>
          Leaderboard
        </h3>
        <div className="text-sm text-gray-500">
          {sorted.length} player{sorted.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="space-y-3">
        {sorted.map((player, index) => {
          const isFirst = index === 0;
          const isSecond = index === 1;
          const isThird = index === 2;
          const score = player.score || 0;
          const percentage = (score / maxScore) * 100;
          
          return (
            <div 
              key={player.userId} 
              className={`
                relative p-4 rounded-xl transition-all duration-200 hover:shadow-md
                ${isFirst ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200' : 
                  isSecond ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200' :
                  isThird ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200' :
                  'bg-gray-50 border border-gray-200'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank Badge */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${isFirst ? 'bg-yellow-400 text-yellow-900' :
                      isSecond ? 'bg-gray-400 text-gray-900' :
                      isThird ? 'bg-orange-400 text-orange-900' :
                      'bg-indigo-100 text-indigo-700'
                    }
                  `}>
                    {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : index + 1}
                  </div>
                  
                  {/* Player Info */}
                  <div>
                    <div className="font-semibold text-gray-800 text-lg">
                      {player.displayName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {score} point{score !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                
                {/* Score Bar */}
                <div className="flex-1 max-w-32 ml-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`
                        h-3 rounded-full transition-all duration-500 ease-out
                        ${isFirst ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                          isSecond ? 'bg-gradient-to-r from-gray-400 to-slate-500' :
                          isThird ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                          'bg-gradient-to-r from-indigo-400 to-purple-500'
                        }
                      `}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* Special styling for top 3 */}
              {isFirst && (
                <div className="absolute -top-2 -right-2 text-2xl">👑</div>
              )}
            </div>
          );
        })}
        
        {sorted.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">👥</div>
            <p>No players yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
