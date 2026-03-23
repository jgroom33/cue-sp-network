interface Props {
  open: boolean;
  onClose: () => void;
}

const shortcuts: [string, string][] = [
  ["Space", "Play / Pause"],
  ["←", "Previous hop"],
  ["→", "Next hop"],
  ["+/=", "Speed up"],
  ["-", "Slow down"],
  ["Esc", "Back to scenarios"],
  ["?", "Toggle this help"],
];

export function KeyboardHelp({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-5 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {shortcuts.map(([key, desc]) => (
            <div key={key} className="contents">
              <kbd className="text-xs font-mono bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-gray-200 text-center">
                {key}
              </kbd>
              <span className="text-xs text-gray-300">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
