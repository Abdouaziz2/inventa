import { CheckCircle2, ArrowRight, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface HeroSectionProps {
  onGetStarted?: () => void;
  onViewDemo?: () => void;
}

export default function HeroSection({ onGetStarted, onViewDemo }: HeroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <>
      {/* Ultra-premium gradient background with animated elements */}
      <section className="relative min-h-screen overflow-hidden bg-background scroll-mt-24">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-gold/30 via-gold/10 to-transparent rounded-full blur-3xl opacity-0 animate-fade-in" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }} />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-3xl opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }} />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-8 opacity-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {/* Badge with animation */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/30 backdrop-blur-sm hover:border-gold/50 transition-all duration-300 cursor-default group">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gold animate-pulse" />
                  <span className="text-sm font-semibold text-gold">Déjà 1,200+ bijouteries</span>
                </div>
              </div>

              {/* Main heading with sophisticated styling */}
              <div className="space-y-6">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                  <span className="text-foreground">Gérez votre</span>{' '}
                  <span className="relative">
                    <span className="absolute inset-0 bg-gradient-to-r from-gold via-gold to-gold/70 blur-lg opacity-50" />
                    <span className="relative bg-gradient-to-r from-gold via-gold to-gold/70 bg-clip-text text-transparent">
                      bijouterie
                    </span>
                  </span>{' '}
                  <span className="text-foreground">en toute</span>{' '}
                  <span className="relative inline-block">
                    <span className="text-gold">confiance</span>
                    <span className="absolute bottom-2 left-0 w-full h-1 bg-gradient-to-r from-gold/50 to-transparent rounded-full" />
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                  Centralisez stock, clients, ventes et dépôts en une seule plateforme intuitive. Gagnez 15 heures par semaine et concentrez-vous sur ce qui compte vraiment.
                </p>
              </div>

              {/* CTA Buttons with premium styling */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={onGetStarted}
                  className="group relative h-14 px-8 bg-gradient-to-r from-gold to-gold/90 hover:from-gold hover:to-gold !text-gold-dark font-bold rounded-lg shadow-lg hover:shadow-gold/50 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Essayer gratuitement
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gold/0 via-white/20 to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={onViewDemo}
                  className="h-14 px-8 bg-background/90 border-2 border-gold/50 hover:border-gold text-foreground hover:bg-gold/10 font-semibold rounded-lg transition-all duration-300"
                >
                  Voir la démo
                </Button>
              </div>

              {/* Trust indicators with icons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-border/50">
                {[
                  { icon: '✓', label: '14 jours gratuits' },
                  { icon: '✓', label: 'Sans carte bancaire' },
                  { icon: '✓', label: 'Setup en 5 minutes' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success font-bold text-xs">
                      {item.icon}
                    </div>
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Dashboard preview with macOS window styling */}
            <div className="relative hidden lg:block opacity-0 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              {/* Glow effect behind the dashboard */}
              <div className="absolute -inset-4 bg-gradient-to-r from-gold/40 via-gold/20 to-transparent rounded-2xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

              {/* Browser window container */}
              <div className="relative group">
                {/* macOS window frame */}
                <div className="bg-gradient-to-b from-background to-background/95 rounded-2xl border border-border/60 shadow-2xl overflow-hidden backdrop-blur-xl">
                  {/* Window header (macOS style) */}
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-b from-border/50 to-border/20 border-b border-border/50">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs text-muted-foreground font-medium">Inventa Dashboard</p>
                    </div>
                  </div>

                  {/* Dashboard content */}
                  <div className="relative overflow-hidden bg-black/50">
                    <img
                      src="/assets/dashboard.png"
                      alt="Inventa Dashboard Preview"
                      className="w-full h-auto opacity-95 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    {/* Overlay gradient for premium effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Floating shine effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl blur-xl pointer-events-none" />
              </div>

              {/* Floating cards with stats (optional enhancement) */}
              <div className="absolute -bottom-8 -left-8 w-48 bg-card rounded-xl border border-border/50 shadow-xl p-4 backdrop-blur-sm opacity-0 group-hover:opacity-100 transform group-hover:-translate-y-2 transition-all duration-500">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Performance</p>
                <p className="text-2xl font-bold text-gold mt-2">+42%</p>
                <p className="text-xs text-muted-foreground mt-1">Ventes ce mois</p>
              </div>
            </div>
          </div>

          {/* Bottom accent line */}
          <div className="mt-20 flex justify-center opacity-0 animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-gold to-transparent rounded-full" />
          </div>
        </div>
      </section>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
