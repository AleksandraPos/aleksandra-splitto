// src/domain/simplify.ts — simplification des dettes
//
// EXERCICE 2 — À COMPLÉTER EN TDD STRICT
//
// Spec : voir SUJET.md, exercice 2
//
// Le but : transformer un dictionnaire de soldes en LISTE MINIMALE
// de règlements pour solder le groupe.

import type { Balances, Settlement } from './types';

export function simplifyDebts(balances: Balances): Settlement[] {
  // On travaille sur une copie, pour ne pas modifier l'objet reçu
  const remaining: Record<string, number> = { ...balances };
  const settlements: Settlement[] = [];

  while (true) {
    const creditor = findLargest(remaining, (amount) => amount > 0);
    const debtor = findLargest(remaining, (amount) => amount < 0);

    if (!creditor || !debtor) {
      break; // plus personne à régler
    }

    const [creditorId, creditorAmount] = creditor;
    const [debtorId, debtorAmount] = debtor;

    const amount = Math.min(creditorAmount, -debtorAmount);

    settlements.push({ from: debtorId, to: creditorId, amount });

    remaining[creditorId] -= amount;
    remaining[debtorId] += amount;
  }

  return settlements;
}

//Trouve l'entrée [id, montant] avec le plus grand montant satisfaisant le prédicat.
function findLargest(
  balances: Record<string, number>,
  predicate: (amount: number) => boolean,
): [string, number] | undefined {
  const candidates = Object.entries(balances).filter(([, amount]) => predicate(amount));
  if (candidates.length === 0) return undefined;

  return candidates.reduce((largest, current) =>
    Math.abs(current[1]) > Math.abs(largest[1]) ? current : largest,
  );
}