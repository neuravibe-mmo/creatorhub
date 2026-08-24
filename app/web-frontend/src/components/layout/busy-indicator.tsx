"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { Loader2 } from "lucide-react";

export function BusyIndicator() {
  const inFlight = useAppSelector((state) => state.ui.inFlight);
  const busyLabel = useAppSelector((state) => state.ui.busyLabel);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (inFlight <= 0) {
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [inFlight]);

  if (inFlight <= 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-blue-600/90 border border-blue-400/30 text-white text-xs font-medium shadow-lg backdrop-blur-md animate-fade-in">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      <span>
        {busyLabel} {seconds > 0 ? `(${seconds}s)` : ""}
      </span>
      {inFlight > 1 && (
        <span className="px-1.5 py-0.5 rounded-full bg-blue-700/80 text-[10px]">
          ×{inFlight}
        </span>
      )}
    </div>
  );
}
