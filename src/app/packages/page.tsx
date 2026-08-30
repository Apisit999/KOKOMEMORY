/**
 * ============================================================
 * KOKO Memory
 * Packages Page
 * ============================================================
 *
 * URL
 * ------------------------------------------------------------
 * /packages
 *
 * โครงสร้าง
 * ------------------------------------------------------------
 * Navbar
 *      ↓
 * Booking Package
 *      ↓
 * Footer
 *
 * Package ที่แสดงตรงกลาง
 * ใช้หน้าเดียวกับ:
 *
 * /booking/package
 * ============================================================
 */

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import BookingPackagePage from "@/app/booking/package/page";


export default function PackagesPage() {
    return (
        <>
            {/* ==================================================
                NAVBAR
            ================================================== */}

            <Navbar />


            {/* ==================================================
                MAIN
            ================================================== */}

            <main className="min-h-screen bg-white">

                <BookingPackagePage />

            </main>


            {/* ==================================================
                FOOTER
            ================================================== */}

            <Footer />
        </>
    );
}