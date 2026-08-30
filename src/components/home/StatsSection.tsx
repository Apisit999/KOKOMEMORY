export default function StatsSection() {
    return (
        <section className="bg-white py-12 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {/* Responsive stats grid: 2 columns on mobile, 4 on larger screens. */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-5 text-center sm:p-7">
                        <p className="text-3xl font-black text-pink-500 sm:text-4xl">500+</p>
                        <p className="mt-2 text-sm text-slate-500 sm:text-base">Events</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-5 text-center sm:p-7">
                        <p className="text-3xl font-black text-pink-500 sm:text-4xl">100K+</p>
                        <p className="mt-2 text-sm text-slate-500 sm:text-base">Photos</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-5 text-center sm:p-7">
                        <p className="text-3xl font-black text-pink-500 sm:text-4xl">5+</p>
                        <p className="mt-2 text-sm text-slate-500 sm:text-base">Years</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-5 text-center sm:p-7">
                        <p className="text-3xl font-black text-pink-500 sm:text-4xl">★★★★★</p>
                        <p className="mt-2 text-sm text-slate-500 sm:text-base">Reviews</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
