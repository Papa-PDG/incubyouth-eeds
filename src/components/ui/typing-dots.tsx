export function TypingDots({ label = "L'IA réfléchit" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs text-primary">
      <span className="flex">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
      <span>{label}</span>
    </div>
  );
}

export default TypingDots;