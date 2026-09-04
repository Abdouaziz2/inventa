import { Button } from '@/components/ui/button';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface LandingNavProps {
  onGetStarted?: () => void;
}

export default function LandingNav({ onGetStarted }: LandingNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Premium Glassmorphic Navbar */}
      <nav
        className="fixed top-0 w-full z-50 transition-all duration-300"
        aria-label="Main navigation"
      >
        {/* Backdrop blur effect */}
        <div className="absolute inset-0 bg-background/90 backdrop-blur-xl border-b border-border -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo section */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <img
                src="/assets/logo.png"
                alt="Inventa Logo"
                className="h-10 sm:h-12 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </div>

            {/* Desktop navigation - centered */}
            <div className="hidden lg:flex items-center justify-center gap-12">
              <a
                href="#features"
                className="text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors duration-300 relative group"
              >
                Fonctionnalités
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold group-hover:w-full transition-all duration-300" />
              </a>
              <a
                href="#pricing"
                className="text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors duration-300 relative group"
              >
                Tarification
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold group-hover:w-full transition-all duration-300" />
              </a>
              <a
                href="#testimonials"
                className="text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors duration-300 relative group"
              >
                Témoignages
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold group-hover:w-full transition-all duration-300" />
              </a>
            </div>

            {/* CTA Button - Desktop */}
            <div className="hidden lg:block">
              <Button
                onClick={onGetStarted}
                className="group relative h-11 px-6 bg-gradient-to-r from-gold to-gold/90 hover:from-gold hover:to-gold !text-gold-dark font-bold rounded-lg shadow-lg hover:shadow-gold/50 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Commencer
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gold/0 via-white/20 to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gold/10 transition-colors duration-300"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>

          {/* Mobile menu - dropdown */}
          {isMenuOpen && (
            <div className="lg:hidden pb-6 space-y-4 animate-fade-in">
              <a
                href="#features"
                className="block text-sm font-semibold text-foreground/80 hover:text-gold transition-colors duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                Fonctionnalités
              </a>
              <a
                href="#pricing"
                className="block text-sm font-semibold text-foreground/80 hover:text-gold transition-colors duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                Tarification
              </a>
              <a
                href="#testimonials"
                className="block text-sm font-semibold text-foreground/80 hover:text-gold transition-colors duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                Témoignages
              </a>
              <Button
                onClick={() => {
                  onGetStarted?.();
                  setIsMenuOpen(false);
                }}
                className="w-full group relative h-10 bg-gradient-to-r from-gold to-gold/90 hover:from-gold hover:to-gold !text-gold-dark font-bold rounded-lg shadow-lg hover:shadow-gold/50 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Commencer
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer to prevent content overlap */}
      <div className="h-16 sm:h-20" />

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
