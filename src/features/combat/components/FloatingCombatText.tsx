'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { FloatingTextType } from '@/lib/types';

interface FloatingCombatTextProps {
  text: string;
  type: FloatingTextType;
  onAnimationEnd: () => void;
}

const typeColors: Record<FloatingTextType, string> = {
  damage: 'text-red-500',
  crit: 'text-yellow-400 font-bold text-lg',
  heal: 'text-green-400',
  dodge: 'text-white font-bold',
  miss: 'text-gray-400',
  buff: 'text-blue-400',
  debuff: 'text-orange-400',
};

export function FloatingCombatText({ text, type, onAnimationEnd }: FloatingCombatTextProps) {
  return (
    <div
      onAnimationEnd={onAnimationEnd}
      className={cn(
        'absolute animate-float-up text-sm font-bold pointer-events-none whitespace-nowrap',
        typeColors[type]
      )}
    >
      {text}
    </div>
  );
}
