import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import StatsSection from "@/components/home/StatsSection";
import ServiceSection from "@/components/home/ServiceSection";
import GallerySection from "@/components/home/GallerySection";
import PackageSection from "@/components/home/PackageSection";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import ContactSection from "@/components/home/ContactSection";
import ProcessSection from "@/components/home/ProcessSection";
import ReviewSection from "@/components/home/ReviewSection";
import FAQSection from "@/components/home/FAQSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/home/Footer";

export default function Home() {
  return (
    <main className="bg-white">
      <HeroSection />

      <AboutSection />

      <CTASection />

      <ServiceSection />

      <PackageSection />

      <WhyChooseUs />

      <ReviewSection />

      <ContactSection />

      <Footer />


    </main>
  );
}