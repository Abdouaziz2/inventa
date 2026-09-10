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

export default function SocialProofSection() {
  return (
    <section id="testimonials" className="py-[100px] lg:py-[140px] bg-white">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-[36px] sm:text-[42px] font-bold leading-[1.12] tracking-[-0.02em] text-[#171717] mb-5">
            Ce que disent les bijouteries
          </h2>
          <p className="text-[17px] leading-[1.6] text-[#55555C]">
            Des professionnels comme vous font déjà confiance à Inventa au quotidien.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-[#F7F7F8] rounded-2xl p-7 sm:p-8 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] transition-shadow duration-300"
            >
              <div className="flex gap-0.5 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#C89B3C] text-[#C89B3C]" />
                ))}
              </div>
              <p className="text-[15px] leading-[1.65] text-[#171717] mb-6">
                « {testimonial.quote} »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C89B3C]/10 flex items-center justify-center">
                  <span className="text-[13px] font-semibold text-[#C89B3C]">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#171717]">{testimonial.author}</p>
                  <p className="text-[13px] text-[#55555C]">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {metrics.map((metric) => (
            <div key={metric.id} className="text-center">
              <p className="text-[40px] sm:text-[48px] font-bold text-[#C89B3C] leading-none tracking-tight">
                {metric.value}
              </p>
              <p className="text-[14px] text-[#55555C] mt-2.5 leading-snug">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
