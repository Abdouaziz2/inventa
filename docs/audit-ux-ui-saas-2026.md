# Audit UX/UI professionnel - Inventa

Date : 14 juin 2026  
Produit : SaaS de gestion pour bijouteries  
Références de qualité : Linear, Stripe Dashboard, Shopify Admin, Notion, Vercel, Odoo

## 1. Résumé exécutif

Inventa possède une base saine : navigation stable, composants Radix/shadcn, mise en page responsive, actions critiques confirmées et identité visuelle reconnaissable. Le produit est utilisable, mais son interface reste plus proche d'un bon outil métier en phase de consolidation que d'un SaaS premium.

**Note globale actuelle : 6,6/10.**

Les écarts principaux avec les meilleurs SaaS sont :

1. L'information n'est pas suffisamment hiérarchisée autour de la décision immédiate.
2. Les écrans de travail mélangent souvent création, suivi et résumé dans une même vue.
3. Le système visuel est cohérent dans ses couleurs, mais pas encore assez normalisé dans ses espacements, rayons, densités et comportements.
4. Le tableau de bord décrit l'activité sans réellement aider à décider.
5. La navigation ne couvre pas encore les fournisseurs et rapports annoncés dans la vision produit.
6. Plusieurs libellés et métriques peuvent induire l'utilisateur en erreur.
7. Les parcours mobiles fonctionnent techniquement, mais demandent trop de défilement et perdent les actions importantes.

## 2. Méthode et barème

Audit réalisé à partir :

- de l'architecture complète des routes et composants ;
- du code des écrans et de leurs états responsive ;
- de la capture de l'écran Vente fournie ;
- du rendu public de connexion ;
- des parcours métier et règles de validation.

Barème : 1 = problématique, 5 = utilisable, 8 = très bon, 10 = niveau de référence SaaS.

Abréviations de la matrice :

- EMP : emphase
- HIE : hiérarchie
- CON : contraste
- ALI : alignement
- PRO : proximité
- ESP : espace blanc
- COH : cohérence
- RES : responsive
- UX : expérience utilisateur
- MOD : modernité SaaS 2026

## 3. Matrice par écran

| Écran | EMP | HIE | CON | ALI | PRO | ESP | COH | RES | UX | MOD | Note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Connexion | 8 | 8 | 8 | 8 | 8 | 9 | 8 | 8 | 6 | 7 | **7,8** |
| Navigation globale | 6 | 6 | 8 | 8 | 6 | 7 | 7 | 7 | 6 | 6 | **6,7** |
| Tableau de bord | 6 | 6 | 7 | 8 | 7 | 7 | 8 | 8 | 5 | 6 | **6,8** |
| Liste clients | 7 | 7 | 7 | 8 | 7 | 7 | 8 | 8 | 7 | 7 | **7,3** |
| Fiche client | 7 | 7 | 7 | 8 | 7 | 8 | 8 | 8 | 7 | 7 | **7,4** |
| Inventaire | 7 | 7 | 7 | 8 | 7 | 7 | 7 | 7 | 7 | 7 | **7,1** |
| Ajouter un bijou | 7 | 7 | 7 | 8 | 8 | 8 | 8 | 8 | 8 | 7 | **7,6** |
| Dépôt client | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 8 | 7 | **7,8** |
| Cadre Opérations | 6 | 6 | 7 | 8 | 6 | 7 | 7 | 7 | 6 | 6 | **6,6** |
| Vente | 7 | 6 | 7 | 7 | 6 | 5 | 7 | 6 | 6 | 6 | **6,3** |
| Réservation | 7 | 7 | 7 | 8 | 7 | 7 | 8 | 7 | 7 | 7 | **7,2** |
| Retour / rachat | 6 | 6 | 7 | 8 | 6 | 6 | 7 | 7 | 6 | 6 | **6,5** |
| Commandes | 7 | 7 | 7 | 8 | 7 | 6 | 8 | 7 | 7 | 7 | **7,1** |
| Reçus & factures | 6 | 6 | 7 | 8 | 7 | 7 | 8 | 8 | 6 | 6 | **6,9** |
| Paramètres boutique | 7 | 7 | 7 | 8 | 8 | 8 | 8 | 8 | 7 | 7 | **7,5** |
| Abonnements | 6 | 6 | 7 | 7 | 7 | 7 | 7 | 7 | 6 | 6 | **6,6** |
| Accès expiré | 8 | 8 | 8 | 8 | 8 | 9 | 8 | 9 | 7 | 8 | **8,1** |

## 4. Audit transversal

### Critique - Le tableau de bord ne permet pas de piloter

**Problème :** les montants sont cumulés sans période visible. “Total ventes” et “Total dépôts” peuvent signifier aujourd'hui, ce mois ou depuis toujours. Le graphique ne montre que sept jours, sans comparaison. Le nombre de réservations utilise toutes les réservations alors que le sous-titre affirme “en cours”.

**Impact :** le gérant peut interpréter une donnée incorrectement, manquer une baisse d'activité ou croire que des dossiers terminés sont encore actifs.

**Solution :**

- Ajouter un filtre global `Aujourd'hui / 7 jours / Ce mois / Personnalisé`.
- Afficher chiffre d'affaires, encaissements, créances, sorties d'argent et marge estimée.
- Comparer chaque KPI à la période précédente.
- Corriger “Réservations en cours” pour compter uniquement les statuts actifs.
- Ajouter les alertes actionnables : stock faible, réservations expirant bientôt, commandes en retard, crédits clients.

### Critique - Architecture produit incomplète

**Problème :** la vision mentionne fournisseurs et rapports, mais aucun écran, route ou groupe de navigation ne les représente.

**Impact :** Inventa paraît être une application de caisse enrichie plutôt qu'une plateforme complète de gestion.

**Solution :**

- Ajouter un espace `Achats & fournisseurs` : fournisseurs, réceptions, dettes, historique d'achat.
- Ajouter `Rapports` : ventes, paiements, stock, créances, retours, exports.
- Structurer la navigation par groupes : Activité, Catalogue, Relations, Finance, Administration.

### Critique - Parcours Vente trop vertical et redondant

**Problème :** client, ajout de produit, panier, paiement, résumé panier et total supérieur répètent des informations. Sur tablette et mobile, le paiement arrive tard après beaucoup de défilement.

**Impact :** temps de caisse plus long, risque d'oublier un champ, difficulté à vérifier le total et la monnaie.

**Solution :**

- Desktop : conserver deux colonnes, avec panier et paiement réunis dans un panneau droit permanent.
- Mobile : utiliser une barre inférieure fixe `Panier · X articles · Total`, ouvrant un tiroir de paiement.
- Afficher le total calculé de la ligne avant “Ajouter au panier”.
- Permettre d'éditer poids, PU et quantité directement dans le panier.
- Supprimer le second “Résumé panier” qui duplique la liste.
- Rendre explicite le cas sans client : `Client facultatif`, sans onglet contradictoire “Client existant” vide.

### Critique - Cohérence métier et vocabulaire

**Problème :** coexistence de français et d'anglais : “Sold out”, “Stock faible”, “Retour”, “Rachat”, ainsi que des textes sans accents. Certaines catégories internes peuvent apparaître en anglais.

**Impact :** perte de confiance, compréhension ralentie pour des utilisateurs non informaticiens et impression de produit inachevé.

**Solution :**

- Définir un glossaire produit unique.
- Utiliser `Épuisé` plutôt que `Sold out`.
- Choisir définitivement `Retour` ou `Achat retour` selon le vocabulaire terrain.
- Traduire toutes les catégories et corriger systématiquement les accents.
- Intégrer les libellés dans un fichier central de traduction.

### Important - Navigation globale trop plate

**Problème :** neuf entrées ont le même poids. `Abonnement` est aussi visible que `Vente` ou `Stock`. Le nom et le profil utilisateur sont répétés dans le header et la sidebar. La cloche affiche un point mais n'a pas de comportement.

**Impact :** charge cognitive, mauvaise priorisation, fausse promesse de notification.

**Solution :**

- Grouper les liens avec de petits intitulés : `TRAVAIL`, `GESTION`, `ADMINISTRATION`.
- Ajouter un bouton principal `Nouvelle vente` dans la sidebar.
- Déplacer Abonnement et Déconnexion dans le menu utilisateur.
- Supprimer la cloche tant qu'il n'existe pas de centre de notifications, ou la rendre fonctionnelle.
- Transformer la recherche globale en vraie commande universelle : clients, bijoux, documents, commandes.

### Important - Design system incomplet

**Problème :** rayons `rounded-xl` et `rounded-2xl`, ombres, en-têtes de cartes et paddings varient selon les pages. Certaines couleurs sont codées directement (`#c9972a`, `amber-*`) au lieu d'utiliser les tokens.

**Impact :** l'interface paraît assemblée écran par écran. Les futures évolutions seront plus lentes et moins cohérentes.

**Solution :**

- Normaliser les composants `PageHeader`, `SectionCard`, `FilterBar`, `DataList`, `EmptyState`, `MetricCard`, `FormFooter`.
- Fixer une échelle : rayon 10 px pour contrôles, 12 px pour cartes, 16 px uniquement pour grands panneaux.
- Utiliser uniquement les tokens sémantiques.
- Définir une grille d'espacement 4/8/12/16/24/32.
- Uniformiser la hauteur des champs à 44 ou 48 px selon le contexte.

### Important - États et retours système

**Problème :** plusieurs pages utilisent du texte “Chargement...” au lieu de squelettes. Les listes n'indiquent pas toujours l'erreur réseau ni la dernière synchronisation.

**Impact :** sur réseau mobile instable, l'utilisateur ne sait pas si l'application travaille, a échoué ou est hors connexion.

**Solution :**

- Ajouter des skeletons correspondant à chaque mise en page.
- Afficher les erreurs dans la zone concernée avec `Réessayer`.
- Désactiver et renommer les boutons pendant les mutations.
- Prévoir un indicateur réseau et une stratégie de reprise pour les opérations critiques.
- Confirmer les écritures importantes avec numéro de document.

### Important - Accessibilité et contraste

**Problème :** plusieurs textes utilisent une taille de 8 à 11 px, notamment dans la sidebar et les badges. Le jaune doré avec texte clair ou atténué doit être vérifié systématiquement. Les actions uniquement iconographiques manquent parfois de libellé accessible.

**Impact :** difficulté pour les utilisateurs âgés, en extérieur ou sur écrans peu lumineux.

**Solution :**

- Taille minimale de lecture : 12 px pour les métadonnées, 14 px pour le contenu.
- Respect WCAG AA : 4,5:1 pour le texte normal.
- Garder le texte presque noir sur les fonds or.
- Ajouter `aria-label` et tooltips aux actions icônes.
- Renforcer les focus visibles au clavier.

## 5. Recommandations par écran

### Connexion - 7,8/10

**Forces :** excellente respiration, action principale évidente, marque visible, responsive propre.

**Problèmes :**

- Le texte “comptes créés par le super admin dans Supabase” expose une notion technique inutile.
- Aucun lien de récupération de mot de passe, aide ou contact.
- Le grand panneau de marque n'apporte aucune preuve produit.

**Solution :** remplacer le texte technique par “Besoin d'un accès ? Contactez votre administrateur”, ajouter récupération de mot de passe, support WhatsApp/téléphone et trois bénéfices métier courts.

### Tableau de bord - 6,8/10

**Forces :** grille lisible, CTA vente visible, quatre KPI faciles à parcourir.

**Problèmes :** métriques ambiguës, graphique peu analytique, absence de priorités, dépôt trop valorisé face aux alertes métier.

**Solution :** faire du tableau de bord une page d'action : `À traiter aujourd'hui`, `Performance`, `Trésorerie`, `Stock`. Ajouter des liens directs depuis chaque carte.

### Clients - 7,3/10

**Forces :** recherche visible, tableau desktop et cartes mobile, création rapide.

**Problèmes :** le code client occupe la première colonne alors que le nom est l'information primaire. Le solde positif n'indique pas clairement s'il s'agit d'un avoir ou d'une dette.

**Solution :** ordre `Nom, Téléphone, Solde/Avoir, Dernière activité, Actions`. Ajouter filtres `Avec solde`, `Avec dette`, `Récents` et création en panneau latéral.

### Fiche client - 7,4/10

**Forces :** historique consolidé, filtres compréhensibles, modification accessible.

**Problèmes :** la carte solde domine alors que le contexte client manque : téléphone, dernière visite, total achats, crédit en cours. “Nouvelle opération” est trop générique.

**Solution :** afficher une en-tête client compacte avec téléphone cliquable et quatre métriques. Remplacer le CTA générique par menu `Vente / Dépôt / Réservation / Commande`.

### Inventaire - 7,1/10

**Forces :** recherche, filtre, tri, pagination, actions rapides et adaptation mobile.

**Problèmes :** le nom, code, matière puis la matière répétée créent du bruit. Les actions essentielles sont cachées dans `...`. Les statuts et la quantité peuvent se contredire.

**Solution :** une ligne = photo, nom + référence, matière, quantité, statut, action. Retirer les répétitions. Afficher directement `Entrée` et `Sortie` au survol desktop. Calculer automatiquement le statut à partir du stock.

### Ajouter un bijou - 7,6/10

**Forces :** parcours désormais simple, peu de champs, bonne logique métier.

**Problèmes :** absence de prévisualisation finale et risque de créer des doublons proches.

**Solution :** rechercher les noms existants pendant la saisie, afficher `Référence générée`, et garder le bouton d'enregistrement fixe en bas sur mobile.

### Dépôt client - 7,8/10

**Forces :** meilleur parcours de l'application : étapes claires, montants rapides, récapitulatif, confirmation des gros montants.

**Problèmes :** trop de détails du client sont répétés après sélection. Le récapitulatif disparaît loin sous le formulaire sur mobile.

**Solution :** réduire la fiche client sélectionnée à une ligne et utiliser une barre fixe mobile avec le nouveau solde et le bouton de confirmation.

### Vente - 6,3/10

**Forces :** contrôles financiers sérieux, monnaie à rendre, crédit confirmé, recherche client et bijou.

**Problèmes :** densité élevée, double résumé, client facultatif mal exprimé, total de ligne invisible avant ajout, action de paiement éloignée sur mobile.

**Solution :** restructuration prioritaire en trois étapes visuelles : `1 Client facultatif`, `2 Articles`, `3 Paiement`. Utiliser un panneau de caisse fixe et une édition en ligne du panier.

### Réservation - 7,2/10

**Forces :** création et suivi côte à côte, date limite, annulation sécurisée.

**Problèmes :** la liste de bijoux affiche encore trop de détails dans un select standard. Pas de filtre pour retrouver rapidement une réservation. Pas d'action “Transformer en vente”.

**Solution :** combobox bijou cohérente, recherche dans les réservations, filtres par statut/date, CTA principal `Finaliser la vente`.

### Retour / achat retour - 6,5/10

**Forces :** contrôle de propriété et validation avant sortie d'argent.

**Problèmes :** formulaire très long, première option “Nouveau vendeur” encourage les doublons, vocabulaire sensible, aucune estimation ou récapitulatif latéral.

**Solution :** commencer par une recherche universelle de personne puis proposer `Créer`. Organiser en étapes `Vendeur`, `Bijou`, `Justificatif`, `Paiement`. Garder le montant et l'action visibles.

### Commandes - 7,1/10

**Forces :** création et suivi, progression de statut, bon imprimable.

**Problèmes :** formulaire long face à une liste dense. Les statuts ne forment pas un véritable workflow visuel. Les commandes en retard ne ressortent pas.

**Solution :** création dans un drawer, liste plein écran avec vues `À traiter / En cours / Prêtes / Terminées`, dates en retard rouges et actions contextuelles.

### Reçus & factures - 6,9/10

**Forces :** lignes cliquables, version mobile, consultation et réimpression.

**Problèmes :** aucune recherche, filtre ou plage de dates. Tous les documents sont mélangés. Le type couleur ne distingue pas correctement vente, commande et retour.

**Solution :** barre de recherche document/client, filtres `Type`, `Date`, `Paiement`, export PDF/CSV, pagination et menu d'action `Voir / Imprimer / Télécharger / Partager`.

### Paramètres boutique - 7,5/10

**Forces :** formulaire clair, logo bien traité, largeur confortable.

**Problèmes :** identité de l'utilisateur et identité de la boutique sont mélangées. Le logo est enregistré immédiatement alors que les autres champs attendent le bouton.

**Solution :** séparer `Boutique`, `Compte utilisateur`, `Documents`, `Paiements`. Utiliser un seul modèle de sauvegarde avec état “Modifications non enregistrées”.

### Abonnements - 6,6/10

**Forces :** état d'accès visible, prolongation rapide pour l'administrateur.

**Problèmes :** fonctionnalité technique exposée dans la navigation de tous. Manque de plan, prix, historique et statut de paiement.

**Solution :** déplacer dans Administration. Pour le client, créer une carte simple plan/date/contact. Pour le super-admin, fournir tableau, filtres, historique et confirmation des changements.

## 6. Responsive

### Desktop

Bonne base générale. Le principal défaut est l'utilisation de grandes largeurs sans densité adaptative : sur 1440 px, certaines cartes restent très aérées tandis que les formulaires critiques sont chargés.

### Tablette

Risque principal : les mises en page passent trop tard en deux colonnes (`xl`). Entre 768 et 1199 px, Vente, Réservation et Commande deviennent de longues pages verticales.

**Action :** tester explicitement 768, 834, 1024 et 1280 px. Passer certains panneaux en deux colonnes dès `lg`, si leur largeur minimale le permet.

### Mobile

La navigation et les listes ont des adaptations dédiées, ce qui est positif. Cependant :

- le header occupe deux rangées à cause de la recherche ;
- les actions principales disparaissent sous la ligne de flottaison ;
- les formulaires de Vente, Retour et Commande nécessitent trop de défilement ;
- les tableaux convertis en cartes affichent parfois trop de métadonnées ;
- les dialogues complexes peuvent dépasser la hauteur utile du clavier.

**Action :** barre d'action inférieure fixe, drawers plein écran, recherche globale ouverte depuis une icône, champs numériques avec clavier adapté et tests Android réels.

## 7. Parcours et nombre de clics

| Tâche | Actuel estimé | Cible |
|---|---:|---:|
| Vente simple sans client | 8 à 10 interactions | 5 à 6 |
| Vente avec client existant | 10 à 13 | 7 à 9 |
| Ajouter un bijou | 6 à 8 | 5 à 6 |
| Dépôt client | 6 à 8 | 5 à 6 |
| Réserver un bijou | 7 à 9 | 6 à 7 |
| Retrouver et réimprimer un reçu ancien | défilement non borné | recherche + 2 clics |
| Mettre à jour une commande | 2 à 3 | 1 à 2 |
| Modifier un client | 3 à 4 | 2 à 3 |

## 8. Feuille de route priorisée

### Phase 1 - Critique, 1 à 2 semaines

1. Repenser Vente desktop/mobile et supprimer les résumés dupliqués.
2. Corriger les KPI et ajouter une période au tableau de bord.
3. Normaliser le vocabulaire et toutes les traductions.
4. Ajouter recherche et filtres aux documents.
5. Rendre la cloche fonctionnelle ou la supprimer.
6. Corriger les incohérences statut/stock et les réservations “en cours”.

### Phase 2 - Important, 2 à 4 semaines

1. Créer les composants structurants du design system.
2. Réorganiser la navigation en groupes et ajouter le CTA Vente.
3. Transformer la recherche du header en recherche universelle.
4. Repenser Commandes et Retours avec drawers ou étapes.
5. Ajouter skeletons, erreurs locales et reprise réseau.
6. Auditer WCAG et augmenter les textes trop petits.

### Phase 3 - Produit, 4 à 8 semaines

1. Ajouter fournisseurs et achats.
2. Ajouter rapports et exports.
3. Créer un centre d'alertes métier.
4. Ajouter vues personnalisées, filtres sauvegardés et raccourcis clavier.
5. Préparer une expérience réseau faible : cache, synchronisation et prévention des doubles soumissions.

### Phase 4 - Optionnel premium

1. Mode sombre réellement validé.
2. Command palette type Linear (`Ctrl/Cmd + K`).
3. Onboarding guidé pour utilisateurs non informaticiens.
4. Personnalisation des rôles et permissions.
5. Partage WhatsApp des reçus et rappels de commande.

## 9. Direction visuelle recommandée

Inventa ne doit pas devenir une copie sombre de Linear ni une copie dense d'Odoo. La direction adaptée est :

- **Clarté de Stripe** pour les chiffres et paiements ;
- **densité maîtrisée de Shopify Admin** pour stock et commandes ;
- **rapidité de Linear** pour recherche, raccourcis et actions ;
- **souplesse d'Odoo**, mais avec beaucoup moins de complexité ;
- **identité Inventa** : navy, or, blanc, photographie produit discrète.

Principes :

1. Une seule action primaire par zone.
2. Les montants et alertes doivent dominer, pas les décorations.
3. Les informations secondaires apparaissent à la demande.
4. Chaque écran doit répondre à une question métier précise.
5. Toute action financière doit être vérifiable, traçable et confirmée.
6. Le mobile doit être conçu comme un outil de travail, pas comme une version empilée du desktop.

## 10. Cible après refonte

Une exécution complète des phases 1 et 2 peut raisonnablement porter l'interface à **8,0-8,5/10**. L'ajout des fournisseurs, rapports, alertes métier et d'une stratégie réseau faible permettrait de positionner Inventa comme un SaaS vertical premium crédible pour les bijouteries africaines.

## 11. Références officielles consultées

- [Vercel Geist Design System](https://vercel.com/geist/introduction) : cohérence, contraste et composants accessibles.
- [Linear Search](https://linear.app/docs/search) et [Command menu](https://linear.app/docs/conceptual-model) : recherche universelle et actions rapides.
- [Odoo Inventory dashboards](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/reporting/dashboards.html) : KPI opérationnels et suivi des tâches.
- [Odoo Purchase & Vendor analysis](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/purchase/advanced/purchase_dashboard.html) : indicateurs fournisseurs et achats.
