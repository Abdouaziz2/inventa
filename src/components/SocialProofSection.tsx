import { Star } from 'lucide-react';

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
}

const testimonials: Testimonial[] = [
  {
    id: 'sophie',
    quote: 'Inventa a complètement changé ma façon de travailler. Plus besoin de chercher les fiches clients, je gagne 3 heures par jour. L\'équipe a adopté l\'outil immédiatement.',
    author: 'Sophie Martin',
    role: 'Propriétaire',
    company: 'Bijouterie Martin (Paris)',
  },
  {
    id: 'thomas',
    quote: 'J\'ai testé plusieurs logiciels avant. Celui-ci est le seul qui comprend vraiment le métier de bijoutier. Simple, efficace et pas cher. Recommandé.',
    author: 'Thomas Leclerc',
    role: 'Gérant',
    company: 'Les Bijoux de Thomas (Lyon)',
  },
  {
    id: 'veronique',
    quote: 'Depuis que j\'utilise Inventa, mon stock est à jour et fiable. Zéro stress à l\'inventaire. Le support est réactif et comprend mon business.',
    author: 'Véronique Arnoux',
    role: 'Joaillière',
    company: 'Art & Création (Marseille)',
  },
];

interface Metric {
  id: string;
  value: string;
  label: string;
}

const metrics: Metric[] = [
  { id: 'users', value: '1 200+', label: 'Bijouteries utilisent Inventa' },
  { id: 'productivity', value: '42%', label: 'Gain de productivité en moyenne' },
  { id: 'satisfaction', value: '96%', label: 'De satisfaction client' },
  { id: 'setup', value: '7 jours', label: 'Délai de mise en place moyen' },
];

export const SocialProofSection = () => {
  return (
    <section className="py-20 bg-primary/5 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">
            Ce que disent les bijouteries
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="rounded-xl border border-border bg-card p-8">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                "{testimonial.quote}"
              </p>
              <div>
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.role}, {testimonial.company}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid md:grid-cols-4 gap-8 pt-16 border-t border-border/50">
          {metrics.map((metric) => (
            <div key={metric.id} className="text-center">
              <p className="text-4xl font-display font-bold text-gold mb-2">
                {metric.value}
              </p>
              <p className="text-muted-foreground">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
