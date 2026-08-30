import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import ContactHero from "@/components/contact/ContactHero";
import ContactInfo from "@/components/contact/ContactInfo";

export default function ContactPage() {
    return (
        <>
            <Navbar />

            <main className="bg-white">
                <ContactHero />
                <ContactInfo />
            </main>

            <Footer />
        </>
    );
}