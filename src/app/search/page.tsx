import { notFound } from "next/navigation";
import PhotoSearchPage from "./PhotoSearchPage";

export const dynamic = "force-dynamic";

export default function SearchPage() {
    if (process.env.PHOTO_SEARCH_ENABLED !== "true") {
        notFound();
    }

    return <PhotoSearchPage />;
}
