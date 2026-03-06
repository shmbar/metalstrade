import Navbar from '../../../../components/Navbar/navbar';
import Footer from '../../../../components/Footer/footer';
import { notFound } from 'next/navigation';
import { FaRegNewspaper, FaChartLine, FaCogs, FaUserTie, FaLightbulb, FaGlobe } from 'react-icons/fa';

const blogPosts = [
  {
    slug: 'digitalization-metal-trading',
    title: 'How Digitalization is Transforming Metal Trading',
    content: 'Explore how digital tools are revolutionizing the metals trade industry, improving efficiency and transparency.\n\nFull article content goes here...'
    ,date: 'December 1, 2025',
    author: 'Admin',
    icon: <FaRegNewspaper size={36} className="text-[var(--endeavour)] mb-4" />,
  },
  {
    slug: 'managing-inventory-2025',
    title: '5 Tips for Managing Inventory in 2025',
    content: 'Learn the best practices for inventory management in the modern era, tailored for metal traders.\n\nFull article content goes here...'
    ,date: 'November 20, 2025',
    author: 'Team IMS',
    icon: <FaChartLine size={36} className="text-[var(--endeavour)] mb-4" />,
  },
  {
    slug: 'contract-automation',
    title: 'Understanding Contract Automation',
    content: 'A deep dive into how contract automation can save time and reduce errors in your trading operations.\n\nFull article content goes here...'
    ,date: 'November 10, 2025',
    author: 'Guest Author',
    icon: <FaCogs size={36} className="text-[var(--endeavour)] mb-4" />,
  },
  {
    slug: 'future-of-metals',
    title: 'Expert Interview: The Future of Metals',
    content: 'Industry leaders share their insights on what the future holds for metals trading and technology.\n\nFull article content goes here...'
    ,date: 'October 28, 2025',
    author: 'Industry Expert',
    icon: <FaUserTie size={36} className="text-[var(--endeavour)] mb-4" />,
  },
  {
    slug: 'innovations-logistics',
    title: 'Innovations in Logistics',
    content: 'Discover the latest innovations in logistics that are streamlining the metals supply chain.\n\nFull article content goes here...'
    ,date: 'October 15, 2025',
    author: 'IMS Team',
    icon: <FaLightbulb size={36} className="text-[var(--endeavour)] mb-4" />,
  },
  {
    slug: 'global-market-trends-2025',
    title: 'Global Market Trends 2025',
    content: 'A comprehensive look at the global market trends affecting the metals industry this year.\n\nFull article content goes here...'
    ,date: 'October 1, 2025',
    author: 'Market Analyst',
    icon: <FaGlobe size={36} className="text-[var(--endeavour)] mb-4" />,
  },
];

export default function BlogPostPage({ params }) {
  const { slug } = params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) return notFound();

  return (
    <div className="w-full bg-white min-h-screen font-sans text-foreground">
      <Navbar />
      <main className="pt-15">
        <section className="py-20 bg-[var(--selago)] text-center">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="flex flex-col items-center mb-6">{post.icon}</div>
            <h1 className="text-4xl font-extrabold mb-2 text-[var(--port-gore)]">{post.title}</h1>
            <div className="text-xs text-gray-400 mb-6">{post.date} &middot; {post.author}</div>
            <article className="text-lg text-gray-700 whitespace-pre-line text-left mx-auto">{post.content}</article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
