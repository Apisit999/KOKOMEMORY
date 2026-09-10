import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import StatsSection from "@/components/home/StatsSection";
import ServiceSection from "@/components/home/ServiceSection";
import GallerySection from "@/components/home/GallerySection";
import ProcessSection from "@/components/home/ProcessSection";
import PackageSection from "@/components/home/PackageSection";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import ReviewSection from "@/components/home/ReviewSection";
import FAQSection from "@/components/home/FAQSection";
import ContactSection from "@/components/home/ContactSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/home/Footer";

export default function Home() {
  return (
    <main className="bg-white">
      <HeroSection />

      <AboutSection />

      <StatsSection />

      <ServiceSection />

      <GallerySection />

      <ProcessSection />

      <PackageSection />

      <WhyChooseUs />

      <ReviewSection />

      <FAQSection />

      <ContactSection />

      <CTASection />

      <Footer />
    </main>
  );
}