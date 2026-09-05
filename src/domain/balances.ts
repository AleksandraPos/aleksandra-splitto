// src/domain/balances.ts — calcul des soldes d'un groupe
//
// EXERCICE 1 — À COMPLÉTER
//
// Spec : voir SUJET.md, exercice 1
//
// Cette fonction est PURE : pas d'effets de bord, pas d'I/O.
// Elle prend un groupe et ses dépenses, retourne les soldes.

import type { Group, Expense, Balances } from './types';

export function computeBalances(group: Group, expenses: Expense[]): Balances {
  const balances: Balances = {};
  for (const member of group.members) {
    balances[member.id] = 0;
  }

  for (const expense of expenses) {
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount;

    const shares = computeShares(expense);

    for (const [memberId, share] of Object.entries(shares)) {
      balances[memberId] = (balances[memberId] ?? 0) - share;
    }
  }

  return balances;
}

function computeShares(expense: Expense): Record<string, number> {
  const { split, amount } = expense;

  if (split.mode === 'equal') {
    const n = split.beneficiaries.length;
    const sharePerPerson = amount / n;
    const shares: Record<string, number> = {};
    for (const memberId of split.beneficiaries) {
      shares[memberId] = sharePerPerson;
    }
    return shares;
  }

  if (split.mode === 'weighted') {
    const totalWeight = Object.values(split.weights).reduce((a, b) => a + b, 0);
    const shares: Record<string, number> = {};
    for (const [memberId, weight] of Object.entries(split.weights)) {
      shares[memberId] = (amount * weight) / totalWeight;
    }
    return shares;
  }

  const shares: Record<string, number> = {};
  for (const [memberId, percentage] of Object.entries(split.percentages)) {
    shares[memberId] = (amount * percentage) / 100;
  }
  return shares;
}
