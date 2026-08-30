import Image from "next/image";


const photos = [
    "/gallery/1.jpg",
    "/gallery/2.jpg",
    "/gallery/3.jpg",
    "/gallery/4.jpg",
];

export default function GallerySection() {
    return (
        <section className="bg-white py-16 sm:py-20 lg:py-24">

            <div className="mx-auto max-w-7xl px-4 sm:px-6">

                <div className="mb-8 sm:mb-12 text-center">

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
                        Wedding Gallery
                    </h2>

                    <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-500">
                        Capture every beautiful moment
                    </p>

                </div>

                <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">

                    {photos.map((photo) => (
                        <div
                            key={photo}
                            className="
                overflow-hidden
                rounded-2xl sm:rounded-3xl
                shadow-lg
              "
                        >
                            <Image
                                src={photo}
                                alt="Wedding"
                                width={500}
                                height={700}
                                className="
                  h-full
                  w-full
                  object-cover
                  transition
                  duration-500
                  hover:scale-110
                "
                            />
                        </div>
                    ))}

                </div>

            </div>

        </section>
    );
}