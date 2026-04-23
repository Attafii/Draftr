interface BrandMarkProps {
  size?: number;
  variant?: "dark" | "light";
  className?: string;
}

export function BrandMark({ size = 40, variant = "dark", className }: BrandMarkProps) {
  const surface = variant === "light" ? "#f5f5f5" : "#101010";
  const border = variant === "light" ? "rgba(9, 9, 11, 0.14)" : "rgba(255, 255, 255, 0.14)";
  const ink = variant === "light" ? "#09090b" : "#f8fafc";
  const muted = variant === "light" ? "rgba(9, 9, 11, 0.3)" : "rgba(255, 255, 255, 0.28)";

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="2" y="2" width="60" height="60" rx="18" fill={surface} stroke={border} strokeWidth="2" />
      <rect x="17" y="14" width="30" height="36" rx="9" stroke={muted} strokeWidth="1.5" />
      <path d="M37 14h10v10" stroke={ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 39l20-16" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M25 24h8" stroke={muted} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25 30h14" stroke={muted} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25 36h10" stroke={muted} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}