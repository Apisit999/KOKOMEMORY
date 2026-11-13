import { redirect } from "next/navigation";

// /gallery was a duplicate of the portfolio page without site navigation.
export default function GalleryPage() {
    redirect("/gallery/portfolio");
}
