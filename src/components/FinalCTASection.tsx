import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinalCTAProps {
  onGetStarted?: () => void;
  onScheduleDemo?: () => void;
}

export default function FinalCTASection({ onGetStarted, onScheduleDemo }: FinalCTAProps) {
  return (
    <section className="py-[100px] lg:py-[140px] bg-[#0B1F33]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="max-w-[680px] mx-auto text-center">
          <h2 className="text-[36px] sm:text-[44px] font-bold leading-[1.1] tracking-[-0.02em] text-white mb-5">
            Prêt à simplifier votre gestion ?
          </h2>
          <p className="text-[17px] leading-[1.6] text-white/60 mb-10">
            Essayez Inventa gratuitement pendant 14 jours. Aucune carte bancaire requise, annulation possible en 1 clic.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button
              onClick={onGetStarted}
              className="group h-12 px-7 bg-[#C89B3C] hover:bg-[#A87920] text-white font-semibold text-[15px] rounded-[11px] transition-colors duration-200 shadow-none"
            >
              Démarrer mon essai gratuit
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Button>
            <Button
              variant="outline"
              onClick={onScheduleDemo}
              className="h-12 px-7 border-white/20 text-white hover:bg-white/10 font-semibold text-[15px] rounded-[11px] transition-colors duration-200"
            >
              Calendrier de démo
            </Button>
          </div>

          <p className="text-[13px] text-white/40">
            Aucune installation requise · Support français · Données sécurisées
          </p>
        </div>
      </div>
    </section>
  );
}
