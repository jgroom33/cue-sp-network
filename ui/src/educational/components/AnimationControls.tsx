import type { AnimationState, AnimationSpeed, EducationalAction } from "../types";

interface Props {
  animation: AnimationState;
  maxHop: number;
  dispatch: React.Dispatch<EducationalAction>;
}

const speeds: AnimationSpeed[] = [0.5, 1, 2, 4];

export function AnimationControls({ animation, maxHop, dispatch }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 border-t border-gray-700">
      {/* Step backward */}
      <button
        onClick={() => dispatch({ type: "STEP_BACKWARD" })}
        disabled={animation.currentHop === 0}
        className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300 transition-colors"
        title="Step backward (←)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        onClick={() =>
          dispatch({ type: animation.playing ? "PAUSE" : "PLAY" })
        }
        className="p-1.5 rounded hover:bg-gray-700 text-white transition-colors"
        title="Play/Pause (Space)"
      >
        {animation.playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Step forward */}
      <button
        onClick={() => dispatch({ type: "STEP_FORWARD" })}
        disabled={animation.currentHop >= maxHop}
        className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300 transition-colors"
        title="Step forward (→)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </button>

      {/* Hop counter */}
      <span className="text-xs text-gray-400 mx-1 min-w-[60px] text-center">
        Hop {animation.currentHop + 1} / {maxHop + 1}
      </span>

      {/* Speed selector */}
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-[10px] text-gray-500">Speed:</span>
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => dispatch({ type: "SET_SPEED", speed: s })}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              animation.speed === s
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
