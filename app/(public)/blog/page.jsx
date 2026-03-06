import HeroSection from "../../../components/Hero/HeroSection";
import Navbar from '../../../components/Navbar/navbar';
import Footer from '../../../components/Footer/footer';
import Link from 'next/link';
import { FaRegNewspaper, FaChartLine, FaCogs, FaUserTie, FaLightbulb, FaGlobe } from 'react-icons/fa';

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
    <div className="w-full bg-white min-h-screen font-sans text-foreground">
      <Navbar />
      <main className="pt-15">
        {/* Hero Section - text customized for Blog page */}
        <HeroSection
          title="MetalsTrade Blog"
          subtitle="Insights, tips, and news for modern metal traders. Stay updated with the latest trends and best practices in the industry."
        />

        {/* Blog Posts List */}
        <section className="py-24 bg-[var(--selago)]">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-4xl font-bold text-[var(--port-gore)] mb-12 text-center">
              Latest Blog Posts
            </h2>
            <div className="grid md:grid-cols-3 gap-10">
              {blogPosts.map((post, idx) => (
                <Link key={idx} href={`/blog/${post.slug}`} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col items-center p-8 hover:shadow-2xl transition no-underline">
                  {post.icon}
                  <h3 className="text-2xl font-bold text-[var(--port-gore)] mb-2 text-center">{post.title}</h3>
                  <p className="text-gray-600 mb-4 text-center">{post.excerpt}</p>
                  <div className="text-xs text-gray-400 mb-4">{post.date} &middot; {post.author}</div>
                  <span className="inline-block mt-auto px-4 py-2 bg-[var(--endeavour)] text-white rounded-lg font-semibold hover:bg-[var(--port-gore)] transition">Read More</span>
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
