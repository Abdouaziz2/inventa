import { Diamond } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="py-12 bg-white border-t border-[#E7E7EA]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Diamond className="h-5 w-5 text-[#C89B3C]" />
              <span className="text-[16px] font-bold text-[#171717]">Inventa</span>
            </div>
            <p className="text-[14px] leading-[1.6] text-[#55555C] max-w-[280px]">
              Plateforme de gestion intelligente pour bijouteries modernes. Stock, clients, ventes — tout centralisé.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-[13px] font-semibold text-[#171717] uppercase tracking-wider mb-4">Produit</h4>
            <ul className="space-y-2.5">
              {['Fonctionnalités', 'Tarification', 'Sécurité'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[14px] text-[#55555C] hover:text-[#171717] transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="text-[13px] font-semibold text-[#171717] uppercase tracking-wider mb-4">Entreprise</h4>
            <ul className="space-y-2.5">
              {['Blog', 'Support', 'Contact'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[14px] text-[#55555C] hover:text-[#171717] transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-[13px] font-semibold text-[#171717] uppercase tracking-wider mb-4">Légal</h4>
            <ul className="space-y-2.5">
              {['Mentions légales', 'Confidentialité', 'CGU'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[14px] text-[#55555C] hover:text-[#171717] transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#E7E7EA] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[#55555C]">&copy; 2026 Inventa. Tous droits réservés.</p>
          <div className="flex items-center gap-5">
            {['Twitter', 'LinkedIn', 'Facebook'].map((social) => (
              <a
                key={social}
                href="#"
                className="text-[13px] text-[#55555C] hover:text-[#171717] transition-colors duration-200"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
