'use client';

import { cn } from "@/lib/utils";
import { Dices } from "lucide-react";
import React, { useEffect } from "react";

interface AttackRingProps {
  progress: number;
  onFire: () => void;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
}

export function AttackRing({
  progress,
  onFire,
  size = 180,
  strokeWidth = 12,
  strokeColor = "hsl(var(--primary))",
}: AttackRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const isReady = progress >= 100;

  useEffect(() => {
    // Only bind space/1 for player attacks
    if (onFire.name === "handleAttack" && isReady) {
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === '1' || event.key === ' ') {
          onFire();
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [isReady, onFire]);

  const canClick = isReady && onFire.name === "handleAttack";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center transition-all",
        canClick ? "cursor-pointer transform scale-105" : "cursor-default"
      )}
      style={{ width: size, height: size }}
      onClick={canClick ? onFire : undefined}
      role="button"
      aria-disabled={!canClick}
      aria-label="Attack"
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-100 ease-linear"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
         {canClick && (
          <>
            <Dices className={cn("h-8 w-8", isReady ? "text-primary animate-pulse" : "text-muted-foreground")} />
            <span className={cn("mt-2 text-xs font-bold", isReady ? "text-primary" : "text-muted-foreground")}>
              {isReady ? "READY (1)" : `${Math.floor(progress)}%`}
            </span>
          </>
        )}
        {!canClick && (
             <span className={cn("text-xs font-bold", isReady ? "text-red-400" : "text-muted-foreground")}>
                {`${Math.floor(progress)}%`}
             </span>
        )}
      </div>
    </div>
  );
}
