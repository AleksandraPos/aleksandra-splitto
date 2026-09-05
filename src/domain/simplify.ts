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
  const remaining: Record<string, number> = { ...balances };
  const settlements: Settlement[] = [];

  while (true) {
    const creditor = findLargestCreditor(remaining);
    const debtor = findLargestDebtor(remaining);

    if (!creditor || !debtor) {
      break;
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

//Trouve le membre le plus créditeur (solde positif maximal)
function findLargestCreditor(balances: Record<string, number>): [string, number] | undefined {
  const creditors = Object.entries(balances).filter(([, amount]) => amount > 0);
  if (creditors.length === 0) return undefined;
  return creditors.reduce((largest, current) => (current[1] > largest[1] ? current : largest));
}

//Trouve le membre le plus débiteur (solde négatif de plus grande valeur absolue)
function findLargestDebtor(balances: Record<string, number>): [string, number] | undefined {
  const debtors = Object.entries(balances).filter(([, amount]) => amount < 0);
  if (debtors.length === 0) return undefined;
  return debtors.reduce((largest, current) => (current[1] < largest[1] ? current : largest));
}