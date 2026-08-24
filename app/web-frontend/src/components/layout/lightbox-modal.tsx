"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeLightbox, setLightboxIndex } from "@/store/slices/uiSlice";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function LightboxModal() {
  const dispatch = useAppDispatch();
  const { isOpen, images, currentIndex } = useAppSelector((state) => state.ui.lightbox);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") dispatch(closeLightbox());
      if (e.key === "ArrowLeft" && images.length > 1) {
        dispatch(setLightboxIndex((currentIndex - 1 + images.length) % images.length));
      }
      if (e.key === "ArrowRight" && images.length > 1) {
        dispatch(setLightboxIndex((currentIndex + 1) % images.length));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images, dispatch]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <button
        onClick={() => dispatch(closeLightbox())}
        className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={() =>
              dispatch(setLightboxIndex((currentIndex - 1 + images.length) % images.length))
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => dispatch(setLightboxIndex((currentIndex + 1) % images.length))}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div className="relative max-w-4xl max-h-[85vh] p-2 flex flex-col items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentIndex]}
          alt={`Preview ${currentIndex + 1}`}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        {images.length > 1 && (
          <div className="mt-3 px-3 py-1 rounded-full bg-slate-800/90 text-xs text-slate-300 font-medium border border-slate-700">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
