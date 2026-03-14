'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'textgolf-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const loaded = useRef(false);

  // Load from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      }
    } catch {
      // private browsing or corrupt data — keep empty
    }
    loaded.current = true;
  }, []);

  // Sync to localStorage when favorites change (but not before initial load)
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // private browsing — silently fail
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (playerId: string) => favorites.includes(playerId),
    [favorites]
  );

  const toggleFavorite = useCallback((playerId: string) => {
    setFavorites((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
