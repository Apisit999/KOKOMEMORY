export default function FloatingLine() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
        >
            <div className="mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-pink-300 to-transparent opacity-70" />

            <div className="absolute left-1/2 top-0 h-16 w-32 -translate-x-1/2 rounded-full bg-pink-300/10 blur-2xl" />
        </div>
    );
}