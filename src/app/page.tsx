import Navbar from "@/components/layout/Navbar";
import Image from "next/image";
import GallerySection from "@/components/home/GallerySection";
export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <>
        <Navbar />

        {/* Hero */}
      </>

      {/* HERO */}
      <section className="relative h-screen overflow-hidden">

        <Image
          src="/hero/wedding.jpg"
          alt="Wedding Background"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/60" />

        {/* Hero Content */}
        <div className="relative z-10 flex h-full items-center justify-center">

          <div className="max-w-4xl px-6 text-center text-white">

            <p className="mb-6 uppercase tracking-[0.4em] text-pink-300">
              Premium Photobooth Platform
            </p>

            <h1 className="text-6xl font-bold md:text-8xl">
              KOKO Memory
            </h1>

            <p className="mt-6 text-2xl text-white/90">
              Every Moment Becomes a Memory
            </p>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
              บริการ Photobooth และ Live Gallery
              สำหรับงานแต่ง งานอีเวนต์ และงานปาร์ตี้
              อัปโหลดภาพสด ดูภาพได้ทันที ดาวน์โหลดภาพ Full HD
            </p>

            <div className="mt-10 flex justify-center gap-4">

              <button className="rounded-full bg-pink-500 px-8 py-4 font-semibold text-white">
                ดูผลงาน
              </button>

              <button className="rounded-full border border-white px-8 py-4 text-white">
                ติดต่อเรา
              </button>

            </div>

          </div>

        </div>

      </section>

      {/* STATISTICS */}
      <section className="bg-white py-20">

        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 md:grid-cols-4">

          <div className="text-center">
            <h2 className="text-5xl font-bold text-pink-500">500+</h2>
            <p className="mt-2 text-gray-500">Events</p>
          </div>

          <div className="text-center">
            <h2 className="text-5xl font-bold text-pink-500">100K+</h2>
            <p className="mt-2 text-gray-500">Photos</p>
          </div>

          <div className="text-center">
            <h2 className="text-5xl font-bold text-pink-500">5+</h2>
            <p className="mt-2 text-gray-500">Years</p>
          </div>

          <div className="text-center">
            <h2 className="text-5xl font-bold text-pink-500">99%</h2>
            <p className="mt-2 text-gray-500">Happy Clients</p>
          </div>

        </div>

      </section>

      {/* SERVICES */}
      <section className="bg-slate-50 py-24">

        <div className="mx-auto max-w-7xl px-6">

          <h2 className="text-center text-5xl font-bold">
            บริการของเรา
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-3xl bg-white p-8 shadow">
              <h3 className="text-2xl font-bold">Wedding</h3>
              <p className="mt-4 text-gray-500">
                Photobooth สำหรับงานแต่ง
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow">
              <h3 className="text-2xl font-bold">Corporate</h3>
              <p className="mt-4 text-gray-500">
                งาน Event และองค์กร
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow">
              <h3 className="text-2xl font-bold">Graduation</h3>
              <p className="mt-4 text-gray-500">
                งานรับปริญญา
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow">
              <h3 className="text-2xl font-bold">Birthday</h3>
              <p className="mt-4 text-gray-500">
                งานวันเกิดและปาร์ตี้
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* CONTACT */}
      <section className="py-24">

        <div className="mx-auto max-w-7xl px-6">

          <h2 className="mb-16 text-center text-5xl font-bold">
            ติดต่อเรา
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-3xl bg-white p-8 shadow-lg">
              <h3 className="text-2xl font-bold">โทรศัพท์</h3>
              <p className="mt-4">080-081-9933 (คุณโก้)</p>
              <p>089-216-1896 (คุณขวัญ)</p>
              <p className="mt-4 text-gray-500">
                09:00 - 18:00
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-lg">
              <h3 className="text-2xl font-bold">LINE</h3>
              <p className="mt-4">@024ppzhh</p>
              <p className="text-gray-500">
                ตอบกลับภายใน 10 นาที
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-lg">
              <h3 className="text-2xl font-bold">Facebook</h3>
              <p className="mt-4">
                KOKO Photobooth Wedding
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-lg">
              <h3 className="text-2xl font-bold">Instagram</h3>
              <p className="mt-4">@photobooth.koko</p>
            </div>

          </div>

        </div>

      </section>

      {/* FOOTER */}
      <footer className="bg-[#243D7A] py-12 text-white">

        <div className="mx-auto max-w-7xl px-6 text-center">

          <h3 className="text-3xl font-bold text-pink-300">
            KOKO Memory
          </h3>

          <p className="mt-4 text-white/80">
            Premium Photobooth Platform
          </p>

          <p className="mt-2 text-white/60">
            Wedding • Event • Live Gallery
          </p>

          <p className="mt-8 text-white/50">
            © 2026 KOKO Memory
          </p>

        </div>

      </footer>

    </main>
  );
}