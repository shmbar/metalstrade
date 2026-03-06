'use client';
import Features from '../../../components/Features/features';
import Navbar from '../../../components/Navbar/navbar';
 import HeroSection from "../../../components/Hero/HeroSection";
import Footer from '../../../components/Footer/footer';
import CTA from '../../../components/CTA/cta';
import { BarChart, PieChart, DollarSign, FileText, Layers } from "lucide-react";

export default function FeaturesPage() {
  return (
         <div className="w-full bg-white min-h-screen font-sans text-foreground">
               {/* Navbar Placeholder if needed - assuming layout handles it or user adds it */}
                <Navbar />
               <main className="pt-15">
        <HeroSection
  title="Plans That Fit Your Business"
  subtitle="Choose the option that supports your growth and helps you move forward."
/>


    
      

{/* Detailed Features */}
<section className="py-24 bg-white">
  <div className="container mx-auto px-4">

    {/* SECTION TITLE */}
    <h2 className="text-4xl font-bold text-center text-[var(--port-gore)] mb-20 leading-tight">
      Powerful Tools to Streamline Your Workflow
    </h2>

    {[
      {
        title: "Contract Management",
        description:
          "Handle all your contracts from a unified dashboard. Track progress, set smart reminders, and analyze data efficiently.",
        features: [
          "Full contract lifecycle management",
          "Smart deadline & renewal reminders",
          "Advanced filtering & global search",
          "Export & share structured reports",
          "Custom fields for workflows",
        ],
        preview: (
          <div className="flex flex-col items-start justify-center w-full h-full p-6">
            <h4 className="text-lg font-semibold text-[var(--endeavour)] mb-2">Contracts Overview</h4>
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-gray-500">Active Contracts</span>
              <span className="font-bold text-gray-700">128</span>
            </div>
            <div className="h-2 w-full bg-[var(--selago)] rounded-full mb-2">
              <div className="h-2 w-3/4 bg-[var(--endeavour)] rounded-full"></div>
            </div>
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-gray-500">Pending Approvals</span>
              <span className="font-bold text-gray-700">24</span>
            </div>
            <div className="h-2 w-full bg-[var(--selago)] rounded-full mb-2">
              <div className="h-2 w-1/3 bg-[var(--endeavour)] rounded-full"></div>
            </div>
            <div className="flex justify-center mt-4 w-full">
              <BarChart className="w-6 h-6 text-[var(--endeavour)]" />
            </div>
          </div>
        ),
      },
      {
        title: "Invoice Processing",
        description:
          "Automate invoicing with fast generation, clean templates, and real-time tracking built for accuracy and efficiency.",
        features: [
          "Auto-generated invoice numbering",
          "Bulk invoice creation",
          "Real-time payment tracking",
          "Fully customizable templates",
          "Multi-currency invoice support",
        ],
        preview: (
          <div className="flex flex-col items-start justify-center w-full h-full p-6">
            <h4 className="text-lg font-semibold text-[var(--endeavour)] mb-2">Invoices Status</h4>
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-gray-500">Paid</span>
              <span className="font-bold text-gray-700">340</span>
            </div>
            <div className="h-2 w-full bg-green-100 rounded-full mb-2">
              <div className="h-2 w-3/4 bg-green-600 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-gray-500">Pending</span>
              <span className="font-bold text-gray-700">54</span>
            </div>
            <div className="h-2 w-full bg-yellow-100 rounded-full mb-2">
              <div className="h-2 w-1/4 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="flex justify-center mt-4 w-full">
              <DollarSign className="w-6 h-6 text-[var(--endeavour)]" />
            </div>
          </div>
        ),
      },
      {
        title: "Expense Management",
        description:
          "Track expenses effortlessly with categorization, receipt uploads, and real-time insights to maintain control.",
        features: [
          "Instant expense tracking",
          "Smart category detection",
          "Upload receipts & documents",
          "Budget monitoring with alerts",
          "Detailed spending analytics",
        ],
        preview: (
          <div className="flex flex-col items-start justify-center w-full h-full p-6">
            <h4 className="text-lg font-semibold text-[var(--endeavour)] mb-2">Expenses Overview</h4>
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-gray-500">Operational</span>
              <span className="font-bold text-gray-700">$12,450</span>
            </div>
            <div className="h-2 w-full bg-red-100 rounded-full mb-2">
              <div className="h-2 w-1/2 bg-red-600 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-gray-500">Marketing</span>
              <span className="font-bold text-gray-700">$7,320</span>
            </div>
            <div className="h-2 w-full bg-purple-100 rounded-full mb-2">
              <div className="h-2 w-1/3 bg-purple-600 rounded-full"></div>
            </div>
            <div className="flex justify-center mt-4 w-full">
              <PieChart className="w-6 h-6 text-[var(--endeavour)]" />
            </div>
          </div>
        ),
      },
    ].map((feature, index) => (
      <div key={index} className="mb-28">
        <div className="grid md:grid-cols-2 gap-20 items-center">

          {index % 2 === 0 ? (
            <>
              {/* TEXT BLOCK */}
              <div>
                <h3 className="text-3xl font-bold text-[var(--port-gore)] mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {feature.description}
                </p>

                <ul className="space-y-4">
                  {feature.features.map((feat, i) => (
                    <li key={i} className="flex items-center">
                      <svg
                        className="w-5 h-5 text-green-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* PREVIEW BOX */}
              <div
                className="
                  relative h-80 w-full rounded-2xl
                  bg-gradient-to-br from-[var(--selago)] to-white
                  shadow-xl shadow-[var(--selago)]
                  border border-[var(--rock-blue)]/40
                  flex items-center justify-center
                  overflow-hidden
                  transition-all duration-300
                  hover:scale-[1.03]
                  hover:shadow-2xl
                "
              >
                {feature.preview}
              </div>
            </>
          ) : (
            <>
              {/* PREVIEW BOX */}
              <div
                className="
                  relative h-80 w-full rounded-2xl
                  bg-gradient-to-br from-[var(--selago)] to-white
                  shadow-xl shadow-[var(--selago)]
                  border border-[var(--rock-blue)]/40
                  flex items-center justify-center
                  overflow-hidden
                  transition-all duration-300
                  hover:scale-[1.03]
                  hover:shadow-2xl
                "
              >
                {feature.preview}
              </div>

              {/* TEXT BLOCK */}
              <div>
                <h3 className="text-3xl font-bold text-[var(--port-gore)] mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {feature.description}
                </p>

                <ul className="space-y-4">
                  {feature.features.map((feat, i) => (
                    <li key={i} className="flex items-center">
                      <svg
                        className="w-5 h-5 text-green-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    ))}
  </div>
</section>


            {/* Features Grid */}
           <Features />
        {/* CTA */}
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
