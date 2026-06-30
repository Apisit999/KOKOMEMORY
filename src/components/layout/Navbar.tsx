import Image from "next/image";

export default function Navbar() {
    return (
        <header
            className="
      fixed
      top-0
      left-0
      z-50
      w-full
      bg-black/60
      backdrop-blur-xl
      border-b
      border-white/10
    "
        >
            <div
                className="
        mx-auto
        flex
        h-20
        max-w-7xl
        items-center
        justify-between
        px-8
      "
            >
                {/* LOGO */}
                <div className="flex items-center gap-4">

                    <div className="relative h-16 w-16 overflow-hidden rounded-full">

                        <Image
                            src="/logo/logo.jpg"
                            alt="KOKO Memory"
                            fill
                            priority
                            className="object-cover"
                        />

                    </div>

                    <div>

                        <p
                            className="
      text-sm
      text-pink-300
      uppercase
      tracking-widest
    "
                        >
                            KOKO
                        </p>

                        <h1
                            className=" text-4xl
      font-black
      tracking-[0.25em]
      text-white"
                        >
                            MEMORY
                        </h1>

                    </div>

                </div>

                {/* MENU */}
                <nav
                    className="
          hidden
          lg:flex
          items-center
          gap-10
          text-white
          font-medium
        "
                >
                    <a href="#">หน้าแรก</a>
                    <a href="#">ผลงาน</a>
                    <a href="#">Gallery</a>
                    <a href="#">แพ็กเกจ</a>
                    <a href="#">ติดต่อ</a>
                </nav>

                {/* BUTTON */}
                <button
                    className="
    rounded-full
    bg-[#EC6AAE]
    px-8
    py-3
    font-semibold
    text-white
    transition-all
    duration-300
    hover:scale-105
    hover:bg-pink-400
  "
                >
                    จองคิว
                </button>
            </div>
        </header>
    );
}