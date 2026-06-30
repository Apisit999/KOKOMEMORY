import Image from "next/image";

const photos = [
    "/gallery/1.jpg",
    "/gallery/2.jpg",
    "/gallery/3.jpg",
    "/gallery/4.jpg",
];

export default function GallerySection() {
    return (
        <section className="bg-white py-24">

            <div className="mx-auto max-w-7xl px-6">

                <div className="mb-12 text-center">

                    <h2 className="text-5xl font-bold text-slate-900">
                        Wedding Gallery
                    </h2>

                    <p className="mt-4 text-gray-500">
                        Capture every beautiful moment
                    </p>

                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

                    {photos.map((photo) => (
                        <div
                            key={photo}
                            className="
                overflow-hidden
                rounded-3xl
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