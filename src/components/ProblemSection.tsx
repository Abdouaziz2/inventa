export const ProblemSection = () => {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-display font-bold mb-6">
            Le vrai problème des bijouteries aujourd'hui
          </h2>
          
          <div className="space-y-4 text-lg text-muted-foreground">
            <p>
              Vous jongler entre Excel, cahiers papier, messages clients et votre système de caisse. Chaque jour, vous perdez des heures à saisir des données deux fois, chercher une fiche client ou vérifier le stock.
            </p>
            <p>
              Les erreurs s'accumulent : stock mal à jour, clients perdus, dépôts oubliés, factures manuelles. Et quand vous grandissez, c'est devenu un cauchemar de coordination.
            </p>
            <p>
              Vous savez que vous devriez utiliser un vrai logiciel, mais la plupart des solutions sont compliquées, chères et demandent semaines de mise en place.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
