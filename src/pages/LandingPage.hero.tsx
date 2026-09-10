import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetStarted?: () => void;
  onViewDemo?: () => void;
}

export default function HeroSection({ onGetStarted, onViewDemo }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(200,155,60,0.06)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(11,31,51,0.03)_0%,_transparent_50%)]" />

      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8 pt-16 sm:pt-24 lg:pt-32 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E7E7EA] bg-[#F7F7F8]">
              <Zap className="h-3.5 w-3.5 text-[#C89B3C]" />
              <span className="text-[13px] font-medium text-[#55555C]">Déjà 1 200+ bijouteries nous font confiance</span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-[44px] sm:text-[52px] lg:text-[60px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#171717]">
                Gérez votre{' '}
                <span className="text-[#C89B3C]">bijouterie</span>{' '}
                en toute{' '}
                <span className="relative inline-block">
                  confiance
                  <span className="absolute bottom-1 left-0 w-full h-[3px] bg-[#C89B3C]/40 rounded-full" />
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-[17px] leading-[1.6] text-[#55555C] max-w-[480px]">
              Centralisez stock, clients, ventes et dépôts en une seule plateforme intuitive. Gagnez 15 heures par semaine et concentrez-vous sur ce qui compte vraiment.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onGetStarted}
                className="group h-12 px-7 bg-[#C89B3C] hover:bg-[#A87920] text-white font-semibold text-[15px] rounded-[11px] transition-colors duration-200 shadow-none"
              >
                Essayer gratuitement
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Button>
              <Button
                variant="outline"
                onClick={onViewDemo}
                className="h-12 px-7 border-[#E7E7EA] text-[#171717] hover:bg-[#F7F7F8] font-semibold text-[15px] rounded-[11px] transition-colors duration-200"
              >
                Voir la démo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-2">
              {[
                '14 jours gratuits',
                'Sans carte bancaire',
                'Setup en 5 minutes',
              ].map((label, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C89B3C]/10">
                    <svg className="h-3 w-3 text-[#C89B3C]" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[13px] font-medium text-[#55555C]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard preview */}
          <div className="relative hidden lg:block">
            {/* Glow behind */}
            <div className="absolute -inset-6 bg-gradient-to-br from-[#C89B3C]/15 via-[#C89B3C]/5 to-transparent rounded-3xl blur-2xl" />

            {/* Browser frame */}
            <div className="relative">
              <div className="bg-white rounded-2xl border border-[#E7E7EA] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F7F7F8] border-b border-[#E7E7EA]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                    <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-[#E7E7EA]">
                      <span className="text-[12px] text-[#55555C] font-medium">app.inventa.fr/dashboard</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard image */}
                <div className="relative bg-[#0A1628]">
                  <img
                    src="/assets/dashboard.png"
                    alt="Aperçu du tableau de bord Inventa"
                    className="w-full h-auto block"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/20 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl border border-[#E7E7EA] shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] p-4 animate-float">
                <p className="text-[11px] font-medium text-[#55555C] uppercase tracking-wider">Performance</p>
                <p className="text-[24px] font-bold text-[#C89B3C] leading-tight mt-0.5">+42%</p>
                <p className="text-[12px] text-[#55555C] mt-0.5">Ventes ce mois</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
