import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LandingNavProps {
  onGetStarted?: () => void;
}

export default function LandingNav({ onGetStarted }: LandingNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-[#E7E7EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'bg-transparent'
        }`}
        aria-label="Navigation principale"
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer">
              <img
                src="/assets/logo.png"
                alt="Inventa"
                className="h-8 sm:h-9 w-auto"
              />
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-10">
              <a
                href="#features"
                className="text-[14px] font-medium text-[#55555C] hover:text-[#171717] transition-colors duration-200"
              >
                Fonctionnalités
              </a>
              <a
                href="#demo"
                className="text-[14px] font-medium text-[#55555C] hover:text-[#171717] transition-colors duration-200"
              >
                Démo
              </a>
              <a
                href="#testimonials"
                className="text-[14px] font-medium text-[#55555C] hover:text-[#171717] transition-colors duration-200"
              >
                Témoignages
              </a>
              <a
                href="#pricing"
                className="text-[14px] font-medium text-[#55555C] hover:text-[#171717] transition-colors duration-200"
              >
                Tarification
              </a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={onGetStarted}
                className="text-[14px] font-medium text-[#55555C] hover:text-[#171717] hover:bg-transparent h-10 px-4"
              >
                Connexion
              </Button>
              <Button
                onClick={onGetStarted}
                className="h-10 px-5 bg-[#C89B3C] hover:bg-[#A87920] text-white font-semibold text-[14px] rounded-[10px] transition-colors duration-200 shadow-none"
              >
                Commencer
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-[#F7F7F8] transition-colors duration-200"
              aria-label="Ouvrir le menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-[#171717]" />
              ) : (
                <Menu className="h-5 w-5 text-[#171717]" />
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden pb-5 pt-2 space-y-1 border-t border-[#E7E7EA]">
              <a
                href="#features"
                className="block py-2.5 text-[14px] font-medium text-[#55555C] hover:text-[#171717] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Fonctionnalités
              </a>
              <a
                href="#demo"
                className="block py-2.5 text-[14px] font-medium text-[#55555C] hover:text-[#171717] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Démo
              </a>
              <a
                href="#testimonials"
                className="block py-2.5 text-[14px] font-medium text-[#55555C] hover:text-[#171717] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Témoignages
              </a>
              <a
                href="#pricing"
                className="block py-2.5 text-[14px] font-medium text-[#55555C] hover:text-[#171717] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Tarification
              </a>
              <div className="pt-3 space-y-2">
                <Button
                  variant="outline"
                  onClick={() => { onGetStarted?.(); setIsMenuOpen(false); }}
                  className="w-full h-11 border-[#E7E7EA] text-[14px] font-medium text-[#171717] rounded-[10px]"
                >
                  Connexion
                </Button>
                <Button
                  onClick={() => { onGetStarted?.(); setIsMenuOpen(false); }}
                  className="w-full h-11 bg-[#C89B3C] hover:bg-[#A87920] text-white font-semibold text-[14px] rounded-[10px]"
                >
                  Commencer gratuitement
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="h-16" />
    </>
  );
}
