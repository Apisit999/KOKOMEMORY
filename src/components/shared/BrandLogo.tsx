// KOKO Memory wordmark — Pure White Luxe.
// Text-based so it stays sharp at any size and uses the self-hosted display font.

type Props = {
    tone?: "color" | "ink" | "white";
    size?: "sm" | "md" | "lg";
    tagline?: boolean;
    className?: string;
};

const sizes = {
    sm: { mark: "text-[21px]", sub: "text-[9px]" },
    md: { mark: "text-[27px]", sub: "text-[10px]" },
    lg: { mark: "text-[40px]", sub: "text-[11px]" },
};

export default function BrandLogo({ tone = "color", size = "md", tagline = false, className = "" }: Props) {
    const s = sizes[size];
    const mark = tone === "color" ? "text-gradient" : tone === "white" ? "text-white" : "text-[#151515]";
    const sub = tone === "white" ? "text-white/75" : "text-[#3d3d3d]";
    return (
        <span className={`inline-flex flex-col items-center leading-none ${className}`}>
            <span className={`font-display font-semibold tracking-[0.22em] -mr-[0.22em] ${s.mark} ${mark}`}>KOKO</span>
            <span className={`mt-1.5 font-sans font-medium uppercase tracking-[0.5em] -mr-[0.5em] ${s.sub} ${sub}`}>
                {tagline ? "Memory · Photobooth & Event" : "Memory"}
            </span>
        </span>
    );
}
