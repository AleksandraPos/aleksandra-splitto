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
  const entries = Object.entries(balances);
  const debtor = entries.find(([, amount]) => amount < 0);
  const creditor = entries.find(([, amount]) => amount > 0);

  if (!debtor || !creditor) {
    return [];
  }

  const [debtorId, debtorAmount] = debtor;
  const [creditorId, creditorAmount] = creditor;

  return [{ from: debtorId, to: creditorId, amount: Math.min(-debtorAmount, creditorAmount) }];
}

