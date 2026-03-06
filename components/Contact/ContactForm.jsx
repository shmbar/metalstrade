'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const to = 'sharon@ims-tech.io';
    const subject = encodeURIComponent(formData.subject || 'Contact Form Inquiry');
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
    >
      <div className="bg-white p-10 sm:p-12 lg:p-16 rounded-3xl shadow-2xl">
        {submitted && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md text-center font-medium">
            Thank you! Your message has been sent.
          </div>
        )}

        <h2 className="text-3xl md:text-4xl font-bold text-[var(--port-gore)] mb-10 text-center">
          Get in Touch
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Name"
              className="w-full p-5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[var(--endeavour)] focus:outline-none shadow-sm transition-all duration-300"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="Your Email"
              className="w-full p-5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[var(--endeavour)] focus:outline-none shadow-sm transition-all duration-300"
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-gray-700 font-medium mb-2">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              id="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              placeholder="Subject"
              className="w-full p-5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[var(--endeavour)] focus:outline-none shadow-sm transition-all duration-300"
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-gray-700 font-medium mb-2">
              Message
            </label>
            <textarea
              name="message"
              id="message"
              rows="6"
              required
              value={formData.message}
              onChange={handleChange}
              placeholder="Your Message"
              className="w-full p-5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[var(--endeavour)] focus:outline-none shadow-sm transition-all duration-300"
            />
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              className="px-10 py-4 bg-[var(--endeavour)] text-white font-bold rounded-xl shadow-lg hover:bg-[var(--port-gore)] transition-colors duration-300"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
