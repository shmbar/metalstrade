import HeroSection from "../../../components/Hero/HeroSection";
import Navbar from '../../../components/Navbar/navbar';
import Footer from '../../../components/Footer/footer';
import Link from 'next/link';
import { FaRegNewspaper, FaChartLine, FaCogs, FaUserTie, FaLightbulb, FaGlobe } from 'react-icons/fa';
import { ArrowRight } from 'lucide-react';

const blogPosts = [
  {
    slug: 'digitalization-metal-trading',
    title: 'How Digitalization is Transforming Metal Trading',
    excerpt: 'Explore how digital tools are revolutionizing the metals trade industry, improving efficiency and transparency.',
    date: 'December 1, 2025',
    author: 'Admin',
    icon: <FaRegNewspaper size={36} className="text-[var(--endeavour)] mx-auto mb-4" />,
  },
  {
    slug: 'managing-inventory-2025',
    title: '5 Tips for Managing Inventory in 2025',
    excerpt: 'Learn the best practices for inventory management in the modern era, tailored for metal traders.',
    date: 'November 20, 2025',
    author: 'Team IMS',
    icon: <FaChartLine size={36} className="text-[var(--endeavour)] mx-auto mb-4" />,
  },
  {
    slug: 'contract-automation',
    title: 'Understanding Contract Automation',
    excerpt: 'A deep dive into how contract automation can save time and reduce errors in your trading operations.',
    date: 'November 10, 2025',
    author: 'Guest Author',
    icon: <FaCogs size={36} className="text-[var(--endeavour)] mx-auto mb-4" />,
  },
  {
    slug: 'future-of-metals',
    title: 'Expert Interview: The Future of Metals',
    excerpt: 'Industry leaders share their insights on what the future holds for metals trading and technology.',
    date: 'October 28, 2025',
    author: 'Industry Expert',
    icon: <FaUserTie size={36} className="text-[var(--endeavour)] mx-auto mb-4" />,
  },
  {
    slug: 'innovations-logistics',
    title: 'Innovations in Logistics',
    excerpt: 'Discover the latest innovations in logistics that are streamlining the metals supply chain.',
    date: 'October 15, 2025',
    author: 'IMS Team',
    icon: <FaLightbulb size={36} className="text-[var(--endeavour)] mx-auto mb-4" />,
  },
  {
    slug: 'global-market-trends-2025',
    title: 'Global Market Trends 2025',
    excerpt: 'A comprehensive look at the global market trends affecting the metals industry this year.',
    date: 'October 1, 2025',
    author: 'Market Analyst',
    icon: <FaGlobe size={36} className="text-[var(--endeavour)] mx-auto mb-4" />,
  },
];

export default function BlogPage() {
  return (
    <div className="marketing w-full bg-[var(--bg-card)] min-h-screen font-sans text-foreground">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section - text customized for Blog page */}
        <HeroSection
          title="IMS Blog"
          subtitle="Insights, tips, and news for modern metal traders. Stay updated with the latest trends and best practices in the industry."
        />

        {/* Blog Posts List */}
        <section className="py-12 bg-[var(--bg-subtle)]">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="responsiveTextDisplay font-bold text-[var(--chathams-blue)] mb-8 text-center">
              Latest Blog Posts
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {blogPosts.map((post, idx) => (
                <Link key={idx} href={`/blog/${post.slug}`} className="group bg-[var(--bg-card)] shadow-card rounded-2xl border border-[var(--line)] overflow-hidden flex flex-col items-center p-6 hover:shadow-md hover:border-[var(--endeavour)] transition no-underline">
                  {post.icon}
                  <h3 className="responsiveTextPage font-bold text-[var(--chathams-blue)] mb-2 text-center">{post.title}</h3>
                  <p className="text-[var(--ink-secondary)] responsiveTextTitle mb-4 text-center">{post.excerpt}</p>
                  <div className="responsiveTextInput text-[var(--ink-muted)] mb-4">{post.date} &middot; {post.author}</div>
                  {/* A quiet text affordance, not a filled button. The whole card
                      is already the <Link>, so a solid --endeavour block was a
                      second call-to-action competing with its own container —
                      and three of them in a row made the violet the loudest
                      thing on a page of grey cards. */}
                  <span className="responsiveTextInput inline-flex items-center gap-1.5 mt-auto font-semibold text-[var(--endeavour)] group-hover:gap-2.5 transition-all">
                    Read more
                    <ArrowRight size={13} strokeWidth={2.5} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
