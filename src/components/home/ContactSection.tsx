export default function ContactSection() {
    return (
        <section className="bg-white py-16 sm:py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="mx-auto max-w-3xl rounded-3xl bg-slate-50 p-6 text-center sm:p-10 lg:p-14">
                    {/* Stack content on small screens and keep text widths fluid. */}
                    <span className="rounded-full bg-pink-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink-500 sm:px-5 sm:text-sm sm:tracking-[0.3em]">
                        CONTACT
                    </span>
                    <h2 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
                        ติดต่อ KOKO Memory
                    </h2>
                    <p className="mt-5 text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
                        สอบถามรายละเอียดแพ็กเกจ วันว่าง และบริการต่าง ๆ ได้เลย
                    </p>
                </div>
            </div>
        </section>
    );
}
