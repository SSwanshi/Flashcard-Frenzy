// components/useMatchRealtime.js
'use client';
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * useMatchRealtime(matchId, handlers)
 * handlers: { 
 *   onMatchCreated, 
 *   onPlayerJoined, 
 *   onQuestionUpdate, 
 *   onScoreUpdate, 
 *   onMatchEnded,
 *   onCustom 
 * }
 */
export function useMatchRealtime(matchId, handlers = {}) {
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase.channel(`match:${matchId}`);

    // Event handlers
    const createdHandler = (payload) => {
      handlers.onMatchCreated?.(payload);
    };

    const joinedHandler = (payload) => {
      handlers.onPlayerJoined?.(payload);
    };

    const questionHandler = (payload) => {
      handlers.onQuestionUpdate?.(payload);
    };

    const scoreHandler = (payload) => {
      console.log("Realtime: score update received", payload);
      handlers.onScoreUpdate?.(payload);
    };

    const endedHandler = (payload) => {
      handlers.onMatchEnded?.(payload);
    };

    const gameStartedHandler = (payload) => {
      handlers.onGameStarted?.(payload);
    };

    const genericHandler = (payload) => {
      handlers.onCustom?.(payload);
    };

    // Subscribe to events (use snake_case to match backend broadcasts)
    channel.on('broadcast', { event: 'match_created' }, createdHandler);
    channel.on('broadcast', { event: 'player_joined' }, joinedHandler);
    channel.on('broadcast', { event: 'question_update' }, questionHandler);
    channel.on('broadcast', { event: 'score_update' }, scoreHandler);
    channel.on('broadcast', { event: 'match_ended' }, endedHandler);
    channel.on('broadcast', { event: 'game_started' }, gameStartedHandler);

    // Optional: catch-all (listens to any broadcast event)
    channel.on('broadcast', {}, genericHandler);

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log('Realtime status:', status);
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to match:${matchId} channel`);
      }
    });

    // Cleanup when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, handlers]);
}
