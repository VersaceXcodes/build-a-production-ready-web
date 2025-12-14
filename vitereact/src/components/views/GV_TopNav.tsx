import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/main';

const GV_TopNav: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  
  // Router
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  // CRITICAL: Individual Zustand selectors (NO object destructuring)
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );
  const currentUser = useAppStore(
    (state) => state.authentication_state.current_user
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsLoginDropdownOpen(false);
  }, [currentPath]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.login-dropdown-container')) {
        setIsLoginDropdownOpen(false);
      }
    };
    
    if (isLoginDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLoginDropdownOpen]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const handleGetQuoteClick = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect_url=' + encodeURIComponent('/app/quotes/new'));
    } else {
      navigate('/app/quotes/new');
    }
  };
  
  const toggleLoginDropdown = () => {
    setIsLoginDropdownOpen(!isLoginDropdownOpen);
  };
  
  const handleRoleLoginClick = (role: string) => {
    navigate(`/login?role=${role}`);
    setIsLoginDropdownOpen(false);
  };

  // ============================================================================
  // NAVIGATION LINKS DATA
  // ============================================================================
  
  const navigationLinks = [
    { label: 'About Us', path: '/about' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Services', path: '/services' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Contact', path: '/contact' },
  ];
  
  const isActiveLink = (path: string) => {
    return currentPath === path;
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      {/* Main Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center space-x-2 flex-shrink-0"
              aria-label="SultanStamp Home"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-black rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg md:text-xl">SS</span>
              </div>
              <span className="text-black font-bold text-lg md:text-xl hidden sm:block">
                SultanStamp
              </span>
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-base font-semibold transition-all duration-200 hover:opacity-80 ${
                    isActiveLink(link.path)
                      ? 'text-black border-b-2 border-[#FFD300] pb-1'
                      : 'text-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Get a Quote CTA */}
              <button
                onClick={handleGetQuoteClick}
                className="bg-[#FFD300] text-black font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Get a Quote
              </button>
              
              {/* Login Dropdown */}
              {!isAuthenticated && (
                <div className="relative login-dropdown-container">
                  <button
                    onClick={toggleLoginDropdown}
                    className="flex items-center space-x-1 text-gray-700 font-semibold hover:text-black transition-colors"
                    aria-label="Login menu"
                    aria-expanded={isLoginDropdownOpen}
                  >
                    <span>Log in</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isLoginDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isLoginDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                      <button
                        onClick={() => handleRoleLoginClick('customer')}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Customer Login
                      </button>
                      <button
                        onClick={() => handleRoleLoginClick('staff')}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Staff Login
                      </button>
                      <button
                        onClick={() => handleRoleLoginClick('admin')}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Admin Login
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Authenticated User Info */}
              {isAuthenticated && currentUser && (
                <Link
                  to={
                    currentUser.role === 'CUSTOMER'
                      ? '/app'
                      : currentUser.role === 'STAFF'
                      ? '/staff'
                      : '/admin'
                  }
                  className="flex items-center space-x-2 text-gray-700 hover:text-black transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-700">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-semibold">{currentUser.name}</span>
                </Link>
              )}
            </div>
            
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 text-gray-700 hover:text-black transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={toggleMobileMenu}
          />
          
          {/* Menu Panel */}
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-xl transform transition-transform">
            <div className="flex flex-col h-full">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <Link to="/" className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-black rounded flex items-center justify-center">
                    <span className="text-white font-bold text-lg">SS</span>
                  </div>
                  <span className="text-black font-bold text-lg">SultanStamp</span>
                </Link>
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 text-gray-700 hover:text-black transition-colors"
                  aria-label="Close mobile menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto py-6 px-6">
                <div className="space-y-4">
                  {navigationLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`block text-lg font-semibold py-2 transition-colors ${
                        isActiveLink(link.path)
                          ? 'text-black border-l-4 border-[#FFD300] pl-4'
                          : 'text-gray-700 hover:text-black pl-4'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
                
                {/* Mobile CTA Button */}
                <div className="mt-8">
                  <button
                    onClick={handleGetQuoteClick}
                    className="w-full bg-[#FFD300] text-black font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 shadow-md"
                  >
                    Get a Quote
                  </button>
                </div>
                
                {/* Mobile Login Options */}
                {!isAuthenticated && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-gray-600 font-semibold mb-4">Login as:</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleRoleLoginClick('customer')}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                      >
                        Customer
                      </button>
                      <button
                        onClick={() => handleRoleLoginClick('staff')}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                      >
                        Staff
                      </button>
                      <button
                        onClick={() => handleRoleLoginClick('admin')}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Authenticated User Info Mobile */}
                {isAuthenticated && currentUser && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <Link
                      to={
                        currentUser.role === 'CUSTOMER'
                          ? '/app'
                          : currentUser.role === 'STAFF'
                          ? '/staff'
                          : '/admin'
                      }
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-black">{currentUser.name}</p>
                        <p className="text-sm text-gray-600">Go to Dashboard</p>
                      </div>
                    </Link>
                  </div>
                )}
                
                {/* WhatsApp Contact Button */}
                <div className="mt-6">
                  <a
                    href="https://wa.me/353874700356"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 w-full bg-green-500 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>WhatsApp Us</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GV_TopNav;