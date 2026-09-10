import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DemoSlide {
  id: string;
  /** Chemin de la capture dans public/ (ex : /assets/dashboard.png) */
  src: string;
  alt: string;
  title: string;
  description: string;
}

/**
 * Captures d'écran réelles d'Inventa.
 * Pour ajouter une interface : déposez la capture dans public/assets/
 * puis ajoutez une entrée ci-dessous. Le carousel s'adapte automatiquement.
 */
const demoSlides: DemoSlide[] = [
  {
    id: 'dashboard',
    src: '/assets/dashboard.png',
    alt: "Tableau de bord Inventa — vue d'ensemble de l'activité",
    title: 'Tableau de bord',
    description: 'Pilotez vos ventes, votre stock et vos indicateurs clés en temps réel.',
  },
];

/** Ratio d'affichage du cadre (adaptez-le si les captures ont un autre ratio). */
const SLIDE_ASPECT = 'aspect-[1152/768]';

export default function ProductDemoSection() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slideCount = demoSlides.length;

  const goTo = (index: number) => {
    setCurrent((index + slideCount) % slideCount);
  };

  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slideCount);
    }, 5000);
    return () => clearInterval(timer);
  }, [slideCount, isPaused]);

  return (
    <section id="demo" className="py-[100px] lg:py-[140px] bg-[#F7F7F8]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-[560px] mx-auto mb-16">
          <h2 className="text-[36px] sm:text-[42px] font-bold leading-[1.12] tracking-[-0.02em] text-[#171717] mb-5">
            Découvrez Inventa en action
          </h2>
          <p className="text-[17px] leading-[1.6] text-[#55555C]">
            Une interface claire, pensée pour le quotidien du bijoutier. Voici un aperçu de ce qui vous attend.
          </p>
        </div>

        {/* Carousel */}
        <div
          className="max-w-[880px] mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative">
            {/* Soft glow */}
            <div className="absolute -inset-5 bg-gradient-to-br from-[#C89B3C]/10 via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

            {/* Browser frame */}
            <div className="relative bg-white rounded-2xl border border-[#E7E7EA] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F7F7F8] border-b border-[#E7E7EA]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-md bg-white border border-[#E7E7EA]">
                    <span className="text-[12px] text-[#55555C] font-medium">app.inventa.fr</span>
                  </div>
                </div>
              </div>

              {/* Slides */}
              <div className={`relative ${SLIDE_ASPECT} bg-[#0A1628]`}>
                {demoSlides.map((slide, i) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-500 ease-out ${
                      i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    aria-hidden={i !== current}
                  >
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Arrows */}
            {slideCount > 1 && (
              <>
                <button
                  onClick={() => goTo(current - 1)}
                  aria-label="Interface précédente"
                  className="absolute left-2 sm:-left-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E7E7EA] text-[#171717] shadow-md hover:bg-[#F7F7F8] hover:border-[#C89B3C]/40 transition-all duration-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => goTo(current + 1)}
                  aria-label="Interface suivante"
                  className="absolute right-2 sm:-right-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E7E7EA] text-[#171717] shadow-md hover:bg-[#F7F7F8] hover:border-[#C89B3C]/40 transition-all duration-200"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Indicators */}
          {slideCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {demoSlides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => goTo(i)}
                  aria-label={`Aller à l'interface ${i + 1}`}
                  aria-current={i === current}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? 'w-6 bg-[#C89B3C]' : 'w-2 bg-[#E7E7EA] hover:bg-[#C89B3C]/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Slide caption */}
          <div className="text-center mt-8">
            <div key={current} className="animate-fade-in">
              <h3 className="text-[18px] font-semibold text-[#171717] mb-1.5">
                {demoSlides[current].title}
              </h3>
              <p className="text-[15px] leading-[1.6] text-[#55555C]">
                {demoSlides[current].description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}