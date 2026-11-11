// KOKO Memory wordmark — Pure White Luxe.
// Text-based so it stays sharp at any size and uses the self-hosted display font.

type Props = {
    tone?: "color" | "ink" | "white";
    size?: "sm" | "md" | "lg";
    tagline?: boolean;
    className?: string;
};

const sizes = {
    sm: { mark: "text-[20px]", sub: "text-[8px]" },
    md: { mark: "text-[26px]", sub: "text-[9px]" },
    lg: { mark: "text-[40px]", sub: "text-[11px]" },
};

export default function BrandLogo({ tone = "color", size = "md", tagline = false, className = "" }: Props) {
    const s = sizes[size];
    const mark = tone === "color" ? "text-gradient" : tone === "white" ? "text-white" : "text-[#151515]";
    const sub = tone === "white" ? "text-white/60" : "text-[#5c5c5c]";
    return (
        <span className={`inline-flex flex-col items-center leading-none ${className}`}>
            <span className={`font-display font-medium tracking-[0.26em] -mr-[0.26em] ${s.mark} ${mark}`}>KOKO</span>
            <span className={`mt-1.5 font-sans font-light uppercase tracking-[0.7em] -mr-[0.7em] ${s.sub} ${sub}`}>
                {tagline ? "Memory · Photobooth & Event" : "Memory"}
            </span>
        </span>
    );
}
