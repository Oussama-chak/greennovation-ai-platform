import { levelTiers } from "@/data/community";

type TierBadgeSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

const SIZE_CLASS: Record<TierBadgeSize, string> = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
  hero: "h-24 w-24 sm:h-28 sm:w-28",
};

const RAW_PIXEL_SIZE: Record<TierBadgeSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 80,
  hero: 112,
};

const PEDESTAL_CLASS: Record<"Apprentice" | "Adept" | "Master", string> = {
  Apprentice: "tier-badge-pedestal tier-badge-pedestal--apprentice",
  Adept: "tier-badge-pedestal tier-badge-pedestal--adept",
  Master: "tier-badge-pedestal tier-badge-pedestal--master",
};

/**
 * Renders the rank badge artwork with a faux-3D pedestal + depth stack.
 * `locked` greyscales the badge and dims the glow.
 */
export function TierBadge({
  level,
  size = "md",
  locked = false,
  float = false,
  className = "",
}: {
  level: number;
  size?: TierBadgeSize;
  locked?: boolean;
  /** Gentle bob animation — best on hero / xl badges */
  float?: boolean;
  className?: string;
}) {
  const tier = levelTiers.find((t) => t.level === level) ?? levelTiers[0]!;
  const px = RAW_PIXEL_SIZE[size];
  const shellSize = SIZE_CLASS[size];

  return (
    <div
      className={`tier-badge-shell ${shellSize} ${float ? "tier-badge-float" : ""} ${className}`}
      aria-hidden={false}
    >
      <div className={`tier-badge-stage ${locked ? "tier-badge-stage--locked" : ""}`}>
        {!locked ? <div className={PEDESTAL_CLASS[tier.group]} /> : null}
        <div className="tier-badge-shine" />
        <img
          src={tier.imagePath}
          alt={`${tier.name} (Lv ${tier.level})`}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className={`tier-badge-img ${SIZE_CLASS[size]} object-contain select-none ${
            locked ? "tier-badge-img--locked" : ""
          }`}
          draggable={false}
        />
      </div>
    </div>
  );
}
