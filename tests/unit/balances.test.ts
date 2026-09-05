import { describe, it, expect } from 'vitest';
import { computeBalances } from '../../src/domain/balances';
import type { Group, Expense } from '../../src/domain/types';

describe('computeBalances', () => {
  it('retourne des soldes à 0 pour un groupe sans dépenses', () => {
    const group: Group = {
      id: 'g1',
      name: 'Test',
      currency: 'EUR',
      members: [
        { id: 'alice', name: 'Alice', email: 'alice@test.fr' },
        { id: 'bob', name: 'Bob', email: 'bob@test.fr' },
      ],
    };
    const expenses: Expense[] = [];

    const balances = computeBalances(group, expenses);

    expect(balances).toEqual({ alice: 0, bob: 0 });
  });

    it('calcule les soldes pour une dépense equal où le payeur est bénéficiaire', () => {
    const group: Group = {
      id: 'g1',
      name: 'Test',
      currency: 'EUR',
      members: [
        { id: 'alice', name: 'Alice', email: 'alice@test.fr' },
        { id: 'bob', name: 'Bob', email: 'bob@test.fr' },
        { id: 'charlie', name: 'Charlie', email: 'charlie@test.fr' },
      ],
    };
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dîner',
        amount: 30,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
      },
    ];

    const balances = computeBalances(group, expenses);

    expect(balances.alice).toBeCloseTo(20);
    expect(balances.bob).toBeCloseTo(-10);
    expect(balances.charlie).toBeCloseTo(-10);
  });

    it('calcule les soldes pour une dépense equal où le payeur n\'est PAS bénéficiaire', () => {
    const group: Group = {
      id: 'g1',
      name: 'Test',
      currency: 'EUR',
      members: [
        { id: 'alice', name: 'Alice', email: 'alice@test.fr' },
        { id: 'bob', name: 'Bob', email: 'bob@test.fr' },
        { id: 'charlie', name: 'Charlie', email: 'charlie@test.fr' },
      ],
    };
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Cadeau pour Alice',
        amount: 30,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        split: { mode: 'equal', beneficiaries: ['bob', 'charlie'] },
      },
    ];

    const balances = computeBalances(group, expenses);

    expect(balances.alice).toBeCloseTo(30);
    expect(balances.bob).toBeCloseTo(-15);
    expect(balances.charlie).toBeCloseTo(-15);
  });

    it('cumule les soldes sur plusieurs dépenses qui se compensent partiellement', () => {
    const group: Group = {
      id: 'g1',
      name: 'Test',
      currency: 'EUR',
      members: [
        { id: 'alice', name: 'Alice', email: 'alice@test.fr' },
        { id: 'bob', name: 'Bob', email: 'bob@test.fr' },
        { id: 'charlie', name: 'Charlie', email: 'charlie@test.fr' },
      ],
    };
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dîner (payé par Alice)',
        amount: 30,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
      },
      {
        id: 'e2',
        groupId: 'g1',
        description: 'Taxi (payé par Bob)',
        amount: 15,
        currency: 'EUR',
        paidBy: 'bob',
        paidAt: new Date('2026-01-02'),
        createdAt: new Date('2026-01-02'),
        split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
      },
    ];

    const balances = computeBalances(group, expenses);

    // alice +30-10=+20, bob -10, charlie -10
    // e2: bob +15-5=+10, alice -5, charlie -5
    // cumulé: alice = 20-5=15, bob = -10+10=0, charlie = -10-5=-15
    expect(balances.alice).toBeCloseTo(15);
    expect(balances.bob).toBeCloseTo(0);
    expect(balances.charlie).toBeCloseTo(-15);

    //La somme de tous les balances doit être = 0 

    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0);
  });
    it('calcule les soldes pour une dépense weighted avec poids non-uniformes', () => {
    const group: Group = {
      id: 'g1',
      name: 'Test',
      currency: 'EUR',
      members: [
        { id: 'alice', name: 'Alice', email: 'alice@test.fr' },
        { id: 'bob', name: 'Bob', email: 'bob@test.fr' },
        { id: 'charlie', name: 'Charlie', email: 'charlie@test.fr' },
      ],
    };
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Loyer',
        amount: 100,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        split: {
          mode: 'weighted',
          weights: { alice: 2, bob: 1, charlie: 1 },
        },
      },
    ];

    const balances = computeBalances(group, expenses);

    // Alice a payé 100, sa part est 50 (poids 2/4) -> +50
    expect(balances.alice).toBeCloseTo(50);
    // Bob et Charlie ont chacun un poids 1/4 -> part de 25
    expect(balances.bob).toBeCloseTo(-25);
    expect(balances.charlie).toBeCloseTo(-25);

    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0);
  });

    it('calcule les soldes pour une dépense percentage avec arrondis', () => {
    const group: Group = {
      id: 'g1',
      name: 'Test',
      currency: 'EUR',
      members: [
        { id: 'alice', name: 'Alice', email: 'alice@test.fr' },
        { id: 'bob', name: 'Bob', email: 'bob@test.fr' },
        { id: 'charlie', name: 'Charlie', email: 'charlie@test.fr' },
      ],
    };
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Restaurant',
        amount: 100,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        split: {
          mode: 'percentage',
          percentages: { alice: 33.33, bob: 33.33, charlie: 33.34 },
        },
      },
    ];

    const balances = computeBalances(group, expenses);

    // Alice a payé 100, sa part est 33.33 -> +66.67
    expect(balances.alice).toBeCloseTo(66.67);
    expect(balances.bob).toBeCloseTo(-33.33);
    expect(balances.charlie).toBeCloseTo(-33.34);

    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0);
  });

    it('cas limite : liste vide de dépenses (aucune dépense sur un groupe non-vide)', () => {
    const group: Group = {
      id: 'g1',
      name: 'Test',
      currency: 'EUR',
      members: [
        { id: 'alice', name: 'Alice', email: 'alice@test.fr' },
        { id: 'bob', name: 'Bob', email: 'bob@test.fr' },
      ],
    };

    const balances = computeBalances(group, []);

    expect(balances).toEqual({ alice: 0, bob: 0 });
  });

  it('cas limite : dépense avec un seul bénéficiaire (le payeur lui-même)', () => {
    const group: Group = {
      id: 'g1',
      name: 'Test',
      currency: 'EUR',
      members: [
        { id: 'alice', name: 'Alice', email: 'alice@test.fr' },
        { id: 'bob', name: 'Bob', email: 'bob@test.fr' },
      ],
    };
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Café perso',
        amount: 20,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        split: { mode: 'equal', beneficiaries: ['alice'] },
      },
    ];

    const balances = computeBalances(group, expenses);

    // Alice paie pour elle-même: +20 -20 = 0. Bob n'est pas concerné.
    expect(balances.alice).toBeCloseTo(0);
    expect(balances.bob).toBeCloseTo(0);
  });

  it('cas limite : très grand nombre de membres (10+)', () => {
    const members = Array.from({ length: 12 }, (_, i) => ({
      id: `m${i}`,
      name: `Membre ${i}`,
      email: `m${i}@test.fr`,
    }));
    const group: Group = {
      id: 'g1',
      name: 'Grand groupe',
      currency: 'EUR',
      members,
    };
    const beneficiaries = members.map((m) => m.id);
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Voyage',
        amount: 1200,
        currency: 'EUR',
        paidBy: 'm0',
        paidAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        split: { mode: 'equal', beneficiaries },
      },
    ];

    const balances = computeBalances(group, expenses);

    // 1200 / 12 = 100 par personne
    expect(balances.m0).toBeCloseTo(1100); // 1200 - 100
    expect(balances.m1).toBeCloseTo(-100);
    expect(balances.m11).toBeCloseTo(-100);

    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0);
  });
});