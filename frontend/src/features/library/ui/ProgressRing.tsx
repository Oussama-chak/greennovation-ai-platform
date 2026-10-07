type Props = {
  current: number;
  total: number;
  size?: number;
};

export function ProgressRing({ current, total, size = 64 }: Props) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, current / total) : 0;
  const offset = c * (1 - pct);

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      aria-label={`${current} of ${total} awakened`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(241,230,204,0.2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f2b660"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-tight">
        <span className="font-[Fraunces,serif] text-sm font-bold text-[#f1e6cc]">
          {current}
          <span className="text-[10px] font-normal text-[#f1e6cc]/70">/{total}</span>
        </span>
      </div>
    </div>
  );
}
