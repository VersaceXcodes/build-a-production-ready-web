import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { MessageCircle, Mail, Phone, ExternalLink, Linkedin, Instagram, Facebook } from 'lucide-react';

const GV_Footer: React.FC = () => {
  // CRITICAL: Individual selectors to prevent infinite loops
  const companyInfo = useAppStore(state => state.system_config.company_info);

  // Static social links (can be made dynamic via API if needed)
  const socialLinks = {
    linktree: 'https://linktr.ee/Sultanstamp',
    instagram: 'https://www.instagram.com/sultanstamp/',
    linkedin: 'https://ie.linkedin.com/company/sultanstamp',
    tiktok: 'https://www.tiktok.com/@sultanstamp',
    facebook: 'https://www.facebook.com/share/19zEdk2zbW/',
    website: 'https://sultanstamp.com/'
  };

  const currentYear = new Date().getFullYear();

  // WhatsApp handler with pre-filled message
  const handleWhatsAppClick = () => {
    const phone = companyInfo.phone.replace(/\s+/g, '');
    const message = encodeURIComponent('Hi! I would like to inquire about your services.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  // Email handler
  const handleEmailClick = () => {
    window.location.href = `mailto:${companyInfo.email}`;
  };

  // Phone handler
  const handlePhoneClick = () => {
    window.location.href = `tel:${companyInfo.phone}`;
  };

  // Social link handler with analytics tracking (optional)
  const handleSocialClick = (platform: string, url: string) => {
    // Optional: Track social clicks for analytics
    console.log(`Social click: ${platform}`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <footer className="bg-black text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Column 1: Brand Identity */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {companyInfo.name}
                </h2>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Disciplined Premium Print, Signage, and Branding
                </p>
              </div>
              <div className="pt-4 border-t border-gray-800">
                <p className="text-gray-500 text-xs">
                  © {currentYear} {companyInfo.name}. All rights reserved.
                </p>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                Quick Links
              </h3>
              <nav className="space-y-3">
                <Link 
                  to="/services" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  Services
                </Link>
                <Link 
                  to="/pricing" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  Pricing
                </Link>
                <Link 
                  to="/gallery" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  Gallery
                </Link>
                <Link 
                  to="/about" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  About Us
                </Link>
                <Link 
                  to="/contact" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  Contact
                </Link>
              </nav>
            </div>

            {/* Column 3: Legal & Policies */}
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                Legal
              </h3>
              <nav className="space-y-3">
                <Link 
                  to="/policies#payment" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  Payment Terms
                </Link>
                <Link 
                  to="/policies#privacy" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
                <Link 
                  to="/policies#refunds" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  Refund Policy
                </Link>
                <Link 
                  to="/policies#files" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  File Requirements
                </Link>
                <Link 
                  to="/policies" 
                  className="block text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200"
                >
                  Terms & Conditions
                </Link>
              </nav>
            </div>

            {/* Column 4: Connect With Us */}
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                Connect With Us
              </h3>
              
              {/* WhatsApp CTA - Primary Contact Method */}
              <button
                onClick={handleWhatsAppClick}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl mb-4"
                aria-label="Contact us on WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
                <span>WhatsApp Us</span>
              </button>

              {/* Contact Links */}
              <div className="space-y-3 mb-4">
                <button
                  onClick={handleEmailClick}
                  className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200 w-full text-left"
                  aria-label={`Email us at ${companyInfo.email}`}
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{companyInfo.email}</span>
                </button>
                <button
                  onClick={handlePhoneClick}
                  className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-200 w-full text-left"
                  aria-label={`Call us at ${companyInfo.phone}`}
                >
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>{companyInfo.phone}</span>
                </button>
                {companyInfo.address && (
                  <div className="flex items-start gap-2 text-gray-400 text-sm">
                    <ExternalLink className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{companyInfo.address}</span>
                  </div>
                )}
              </div>

              {/* Social Media Icons */}
              <div className="pt-4 border-t border-gray-800">
                <p className="text-gray-400 text-xs mb-3 uppercase tracking-wider">Follow Us</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSocialClick('Linktree', socialLinks.linktree)}
                    className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
                    aria-label="Visit our Linktree"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleSocialClick('Instagram', socialLinks.instagram)}
                    className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
                    aria-label="Follow us on Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleSocialClick('LinkedIn', socialLinks.linkedin)}
                    className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
                    aria-label="Connect on LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleSocialClick('TikTok', socialLinks.tiktok)}
                    className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
                    aria-label="Follow us on TikTok"
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleSocialClick('Facebook', socialLinks.facebook)}
                    className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
                    aria-label="Like us on Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar - Mobile Copyright (hidden on desktop as it's in brand column) */}
          <div className="lg:hidden mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-xs">
              © {currentYear} {companyInfo.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;