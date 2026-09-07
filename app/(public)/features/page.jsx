'use client';
import Features from '../../../components/Features/features';
import Navbar from '../../../components/Navbar/navbar';
 import HeroSection from "../../../components/Hero/HeroSection";
import Footer from '../../../components/Footer/footer';
import CTA from '../../../components/CTA/cta';
import { BarChart, PieChart, DollarSign, FileText, Layers } from "lucide-react";

export default function FeaturesPage() {
  return (
         <div className="marketing w-full bg-[var(--bg-card)] min-h-screen font-sans text-foreground">
               {/* Navbar Placeholder if needed - assuming layout handles it or user adds it */}
                <Navbar />
               <main className="pt-20">
        {/* Was "Plans That Fit Your Business" / "Choose the option that supports
            your growth" — pricing-page copy left on the features page. There is
            no pricing page and nothing on this page mentions a plan. */}
        <HeroSection
          title="Every module, in detail"
          subtitle="What each part of the platform actually does — from purchase contracts and warehouse stock through to cashflow, margins and final settlement."
        />


    
      

{/* Detailed Features */}
<section className="py-12 bg-[var(--bg-card)]">
  <div className="container mx-auto px-4">

    {/* SECTION TITLE */}
    <h2 className="responsiveTextDisplay font-bold text-center text-[var(--chathams-blue)] mb-12 leading-tight">
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
            <h4 className="responsiveTextPage font-semibold text-[var(--endeavour)] mb-2">Contracts Overview</h4>
            <div className="flex items-center justify-between w-full mb-4">
              <span className="responsiveTextTitle text-[var(--ink-secondary)]">Active Contracts</span>
              <span className="responsiveTextTitle font-bold text-[var(--ink)]">128</span>
            </div>
            <div className="h-2 w-full bg-[var(--bg-subtle)] rounded-full mb-2">
              <div className="h-2 w-3/4 bg-[var(--endeavour)] rounded-full"></div>
            </div>
            <div className="flex items-center justify-between w-full mb-2">
              <span className="responsiveTextTitle text-[var(--ink-secondary)]">Pending Approvals</span>
              <span className="responsiveTextTitle font-bold text-[var(--ink)]">24</span>
            </div>
            <div className="h-2 w-full bg-[var(--bg-subtle)] rounded-full mb-2">
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
            <h4 className="responsiveTextPage font-semibold text-[var(--endeavour)] mb-2">Invoices Status</h4>
            {/* Settled/Outstanding on the --ok-* and --warn-* families: these are
                REAL statuses, which is the one thing status colour is for. The
                raw green-600/yellow-500 they replace never inverted and were
                also the bright hues the 2026-08-08 revision removed. */}
            <div className="flex items-center justify-between w-full mb-4">
              <span className="responsiveTextTitle text-[var(--ink-secondary)]">Settled</span>
              <span className="responsiveTextTitle font-bold text-[var(--ink)] tabular-nums">340</span>
            </div>
            <div className="h-2 w-full bg-[var(--ok-bg)] rounded-full mb-2">
              <div className="h-2 w-3/4 bg-[var(--ok-figure)] rounded-full"></div>
            </div>
            <div className="flex items-center justify-between w-full mb-2">
              <span className="responsiveTextTitle text-[var(--ink-secondary)]">Outstanding</span>
              <span className="responsiveTextTitle font-bold text-[var(--ink)] tabular-nums">54</span>
            </div>
            <div className="h-2 w-full bg-[var(--warn-bg)] rounded-full mb-2">
              <div className="h-2 w-1/4 bg-[var(--warn-text)] rounded-full"></div>
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
            <h4 className="responsiveTextPage font-semibold text-[var(--endeavour)] mb-2">Expenses Overview</h4>
            {/* Was "Operational $12,450 / Marketing $7,320" — a marketing budget
                is not a cost line a metals trader carries. Freight and storage
                are, and they are what the expenses module actually tracks. */}
            <div className="flex items-center justify-between w-full mb-4">
              <span className="responsiveTextTitle text-[var(--ink-secondary)]">Freight</span>
              <span className="responsiveTextTitle font-bold text-[var(--ink)] tabular-nums">12,450 EUR</span>
            </div>
            <div className="h-2 w-full bg-[var(--violet-bg)] rounded-full mb-2">
              <div className="h-2 w-1/2 bg-[var(--endeavour)] rounded-full"></div>
            </div>
            <div className="flex items-center justify-between w-full mb-2">
              <span className="responsiveTextTitle text-[var(--ink-secondary)]">Storage</span>
              <span className="responsiveTextTitle font-bold text-[var(--ink)] tabular-nums">7,320 EUR</span>
            </div>
            {/* purple-600 is not in the tailwind.config colour map, so it stayed
                raw Tailwind violet — the one bright thing on either theme. */}
            <div className="h-2 w-full bg-[var(--violet-bg)] rounded-full mb-2">
              <div className="h-2 w-1/3 bg-[var(--violet-text)] rounded-full"></div>
            </div>
            <div className="flex justify-center mt-4 w-full">
              <PieChart className="w-6 h-6 text-[var(--endeavour)]" />
            </div>
          </div>
        ),
      },
    ].map((feature, index) => (
      <div key={index} className="mb-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {index % 2 === 0 ? (
            <>
              {/* TEXT BLOCK */}
              <div>
                <h3 className="responsiveTextPage font-bold text-[var(--chathams-blue)] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[var(--ink-secondary)] responsiveTextPage leading-relaxed mb-6">
                  {feature.description}
                </p>

                <ul className="space-y-4">
                  {feature.features.map((feat, i) => (
                    <li key={i} className="flex items-center">
                      <svg
                        className="w-5 h-5 text-[var(--ok-text)] mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="responsiveTextTitle text-[var(--ink)]">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* PREVIEW BOX */}
              <div
                className="
                  relative h-80 w-full rounded-2xl
                  bg-gradient-to-br from-[var(--bg-subtle)] to-[var(--bg-card)]
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
                  bg-gradient-to-br from-[var(--bg-subtle)] to-[var(--bg-card)]
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
                <h3 className="responsiveTextPage font-bold text-[var(--chathams-blue)] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[var(--ink-secondary)] responsiveTextPage leading-relaxed mb-6">
                  {feature.description}
                </p>

                <ul className="space-y-4">
                  {feature.features.map((feat, i) => (
                    <li key={i} className="flex items-center">
                      <svg
                        className="w-5 h-5 text-[var(--ok-text)] mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="responsiveTextTitle text-[var(--ink)]">{feat}</span>
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
