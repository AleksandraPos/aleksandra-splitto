# Analyse des mutations

## Score initial
- balances.ts : 100%
- simplify.ts : 66.67%
- **Score global : 81.54%**

## Score final
- balances.ts : 100%
- simplify.ts : 100%
- **Score global : 100%**

## Démarche

Le premier run a révélé 12 mutants survivants dans `simplify.ts`, tous
liés aux fonctions `findLargestCreditor` et `findLargestDebtor`. La cause
racine : nos tests initiaux ne couvraient que des cas où le "bon" candidat
(le plus grand créditeur/débiteur) se trouvait être le premier élément
de l'objet `balances` — une mutation cassant la comparaison (`>` → `>=`,
`<` → `<=`, ou suppression du filtre) ne changeait donc jamais le résultat
observable.

**Correctif appliqué** : ajout de 7 tests ciblés où le bon candidat n'est
PAS le premier de la liste, et où deux candidats ont des montants égaux
(pour vérifier le comportement en cas d'égalité). Ces tests forcent
l'algorithme à réellement comparer les montants, ce qui tue les mutants
de comparaison et de filtre.

## Mutants survivants après amélioration

Aucun mutant n'a survécu après l'ajout des tests ciblés. Les 10 mutants
en "timeout" sur `simplify.ts` correspondent à des mutations qui cassent
la condition d'arrêt de la boucle `while (true)` (par exemple
`!creditor || !debtor` → `!creditor && !debtor`), provoquant une boucle
infinie détectée par le timeout de Stryker — ce qui est un résultat
équivalent à "tué" du point de vue de la robustesse du code : ces
mutations sont bien détectées, juste par timeout plutôt que par échec
d'assertion.

- Décision : score final de 100% accepté sur les deux fichiers, aucune
  action supplémentaire requise.