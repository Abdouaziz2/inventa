import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinalCTAProps {
  onGetStarted?: () => void;
  onScheduleDemo?: () => void;
}

export default function FinalCTASection({ onGetStarted, onScheduleDemo }: FinalCTAProps) {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="mx-auto max-w-4xl px-6">
        <div className="rounded-2xl bg-gradient-to-r from-primary via-primary/80 to-primary/60 p-12 text-center">
          <h2 className="text-4xl font-display font-bold text-primary-foreground mb-4">
            Prêt à simplifier votre gestion ?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Essayez Inventa gratuitement pendant 14 jours. Aucune carte bancaire requise, annulation possible en 1 clic.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button 
              size="lg" 
              className="bg-gold hover:bg-gold/90 text-gold-dark font-semibold"
              onClick={onGetStarted}
            >
              Démarrer mon essai gratuit <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
              onClick={onScheduleDemo}
            >
              Calendrier de démo
            </Button>
          </div>

          <p className="text-sm text-primary-foreground/60">
            Aucune installation requise • Support français • Données sécurisées
          </p>
        </div>
      </div>
    </section>
  );
}
