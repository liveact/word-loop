import { useEffect } from "react";

interface KeyHandlers {
  onPrev?: () => void;
  onNext?: () => void;
  onSpeak?: () => void;
}

/** Global keys: ArrowLeft/f prev, ArrowRight/j next, Space pronounce. */
export function useKeyboard({ onPrev, onNext, onSpeak }: KeyHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
        case "f":
        case "F":
          e.preventDefault();
          onPrev?.();
          break;
        case "ArrowRight":
        case "j":
        case "J":
          e.preventDefault();
          onNext?.();
          break;
        case " ":
          e.preventDefault();
          onSpeak?.();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrev, onNext, onSpeak]);
}
