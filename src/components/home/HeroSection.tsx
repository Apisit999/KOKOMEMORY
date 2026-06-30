import Navbar from "../layout/Navbar";
export default function HeroSection() {
    return (
        <section className="relative h-screen overflow-hidden">

            <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
            >
                <source src="/hero.mp4" type="video/mp4" />
            </video>

            <div className="absolute inset-0 bg-black/60" />

            <div className="relative z-10 flex h-full items-center justify-center">

                <div className="max-w-4xl px-6 text-center text-white">

                    <h1 className="text-6xl font-bold md:text-8xl">
                        KOKO Memory
                    </h1>

                    <p className="mt-8 text-xl text-white/80">
                        Every Moment Becomes a Memory
                    </p>

                    <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
                        บริการ Photobooth และ Live Gallery
                        สำหรับงานแต่ง งานอีเวนต์ และงานปาร์ตี้
                        อัปโหลดภาพสด ดูภาพได้ทันที
                        ค้นหารูป ดาวน์โหลด และเก็บความทรงจำได้ตลอดไป
                    </p>

                    <div className="mt-10 flex justify-center gap-4">

                        <button className="rounded-full bg-pink-500 px-8 py-4 font-semibold text-white hover:bg-pink-400">
                            ดูผลงาน
                        </button>

                        <button className="rounded-full border border-white px-8 py-4 text-white hover:bg-white hover:text-black">
                            ติดต่อเรา
                        </button>

                    </div>

                </div>

            </div>

        </section>
    )
}