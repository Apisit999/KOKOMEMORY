import { ArrowRight, Phone, MessageCircle } from "lucide-react";

export default function CTASection() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-r from-[#243D7A] via-[#3157a5] to-[#EC6AAE] py-16 sm:py-20 lg:py-28">

            {/* Background Blur */}
            <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-pink-400/30 blur-[120px]" />
            <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blue-300/30 blur-[120px]" />

            <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 sm:px-6 text-center text-white">

                <span className="rounded-full border border-white/30 bg-white/10 px-4 sm:px-4 sm:px-6 py-2 text-sm uppercase tracking-[0.3em] backdrop-blur-xl">
                    BOOK NOW
                </span>

                <h2 className="mt-8 max-w-4xl text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight">
                    ให้ KOKO Memory
                    <br />
                    สร้างความทรงจำที่ดีที่สุดในงานของคุณ
                </h2>

                <p className="mt-8 max-w-3xl text-base sm:text-lg lg:text-xl leading-7 sm:leading-8 lg:leading-9 text-white/80">
                    พร้อมให้บริการ Photobooth งานแต่ง งานเลี้ยง งานบริษัท
                    งานรับปริญญา และงานอีเวนต์ทั่วประเทศ
                </p>

                <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">

                    <button
                        className="
            flex
            items-center
            gap-3
            rounded-full
            bg-white
            w-full sm:w-auto px-6 sm:px-10
            py-4
            font-semibold
            text-[#243D7A]
            transition
            hover:scale-105
          "
                    >
                        จองคิวตอนนี้

                        <ArrowRight size={20} />

                    </button>

                    <button
                        className="
            flex
            items-center
            gap-3
            rounded-full
            border
            border-white/40
            bg-white/10
            w-full sm:w-auto px-6 sm:px-10
            py-4
            font-semibold
            text-white
            backdrop-blur-xl
            transition
            hover:bg-white
            hover:text-[#243D7A]
          "
                    >

                        <MessageCircle size={20} />

                        LINE Official

                    </button>

                </div>

                <div className="mt-12 sm:mt-16 lg:mt-20 grid w-full gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-3">

                    <div className="rounded-3xl bg-white/10 p-6 sm:p-8 backdrop-blur-xl">

                        <h3 className="text-4xl sm:text-5xl font-bold">
                            500+
                        </h3>

                        <p className="mt-3 text-white/80">
                            Events
                        </p>

                    </div>

                    <div className="rounded-3xl bg-white/10 p-6 sm:p-8 backdrop-blur-xl">

                        <h3 className="text-4xl sm:text-5xl font-bold">
                            100K+
                        </h3>

                        <p className="mt-3 text-white/80">
                            Photos
                        </p>

                    </div>

                    <div className="rounded-3xl bg-white/10 p-6 sm:p-8 backdrop-blur-xl">

                        <h3 className="text-4xl sm:text-5xl font-bold">
                            ★★★★★
                        </h3>

                        <p className="mt-3 text-white/80">
                            Customer Reviews
                        </p>

                    </div>

                </div>

                <div className="mt-12 sm:mt-16 lg:mt-20 flex flex-wrap items-center justify-center gap-3 text-base sm:text-xl">

                    <Phone size={22} />

                    <span>080-081-9933</span>

                </div>

            </div>

        </section>
    );
}