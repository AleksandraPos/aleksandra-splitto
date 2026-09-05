// tests/unit/expense.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ExpenseService } from '../../src/domain/expense.service';
import type { ExpenseRepository } from '../../src/ports/expense.repository';
import type { EmailNotifier } from '../../src/ports/notifier';
import type { Clock } from '../../src/ports/clock';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';
import type { CreateExpenseInput, Expense } from '../../src/domain/types';

const dummyLogger: Logger = {
  info: () => {},
  error: () => {},
};

const FIXED_DATE = new Date('2026-01-15T10:00:00Z');
const stubClock: Clock = {
  now: () => FIXED_DATE,
};

function createInput(overrides: Partial<CreateExpenseInput> = {}): CreateExpenseInput {
  return {
    groupId: 'group-1',
    description: 'Déjeuner',
    amount: 50,
    currency: 'EUR',
    paidBy: 'alice',
    paidAt: new Date('2026-01-14'),
    split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    ...overrides,
  };
}

describe('ExpenseService.create', () => {
  it('retourne une expense avec les bonnes valeurs et notifie si amount >= 100', async () => {
    const notifySpy = vi.fn().mockResolvedValue(undefined);
    const spyNotifier: EmailNotifier = {
      notifyGroupMembers: notifySpy,
    };

    const mockIdGen: IdGenerator = {
      next: vi.fn().mockReturnValue('expense-42'),
    };

    const fakeRepo = createFakeRepository();

    const service = new ExpenseService(
      fakeRepo,
      spyNotifier,
      stubClock,
      mockIdGen,
      dummyLogger,
    );

    const input = createInput({ amount: 150 });

    const result = await service.create(input);

    // Vérifie les valeurs de l'expense retournée
    expect(result.id).toBe('expense-42');
    expect(result.createdAt).toEqual(FIXED_DATE);
    expect(result.amount).toBe(150);
    expect(result.groupId).toBe('group-1');

    // Vérifie que le repository (Fake) contient l'expense après save
    const saved = await fakeRepo.findById('expense-42');
    expect(saved).toEqual(result);

    // Vérifie que le Mock a bien été appelé une fois
    expect(mockIdGen.next).toHaveBeenCalledTimes(1);

    // Vérifie que le Spy a bien été appelé (notification car amount >= 100)
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(
      'group-1',
      expect.stringContaining('Déjeuner'),
    );
  });

  it("n'envoie PAS de notification si amount < 100", async () => {
    const notifySpy = vi.fn().mockResolvedValue(undefined);
    const spyNotifier: EmailNotifier = {
      notifyGroupMembers: notifySpy,
    };
    const mockIdGen: IdGenerator = {
      next: vi.fn().mockReturnValue('expense-43'),
    };
    const fakeRepo = createFakeRepository();

    const service = new ExpenseService(
      fakeRepo,
      spyNotifier,
      stubClock,
      mockIdGen,
      dummyLogger,
    );

    const input = createInput({ amount: 20 });

    await service.create(input);

    expect(notifySpy).not.toHaveBeenCalled();
  });
});

// Crée un Fake ExpenseRepository 
function createFakeRepository(): ExpenseRepository {
  const store = new Map<string, Expense>();

  return {
    async save(expense: Expense): Promise<void> {
      store.set(expense.id, expense);
    },
    async findById(id: string): Promise<Expense | null> {
      return store.get(id) ?? null;
    },
    async findByGroupId(groupId: string): Promise<Expense[]> {
      return [...store.values()].filter((e) => e.groupId === groupId);
    },
    async findInDateRange(groupId: string, from: Date, to: Date): Promise<Expense[]> {
      return [...store.values()].filter(
        (e) => e.groupId === groupId && e.paidAt >= from && e.paidAt <= to,
      );
    },
  };
}

