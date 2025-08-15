'use client';

import { cn } from "@/lib/utils";
import { Dices } from "lucide-react";
import React, { useEffect } from "react";

interface AttackRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
}

export function AttackRing({
  progress = 0,
  size = 180,
  strokeWidth = 12,
  strokeColor = "hsl(var(--primary))",
}: AttackRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((progress || 0) / 100) * circumference;

  const isReady = progress >= 100;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center transition-all",
        "cursor-default"
      )}
      style={{ width: size, height: size }}
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
        {isReady ? (
          <>
            <Dices className={cn("h-8 w-8 text-primary animate-pulse")} />
            <span className={cn("mt-2 text-xs font-bold text-primary")}>
              READY
            </span>
          </>
        ) : (
            <span className={cn("text-xs font-bold text-muted-foreground")}>
                {`${Math.floor(progress)}%`}
            </span>
        )}
      </div>
    </div>
  );
}
