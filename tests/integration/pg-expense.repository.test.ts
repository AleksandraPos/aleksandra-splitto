import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { PgExpenseRepository } from '../../src/infrastructure/pg-expense.repository';
import type { Expense } from '../../src/domain/types';

describe('PgExpenseRepository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repo: PgExpenseRepository;

  beforeAll(async () => {
    // on démarre un vrai Postgres dans un container Docker
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    pool = new Pool({ connectionString: container.getConnectionUri() });

    // Exécute les migrations SQL fournies
    const migration = readFileSync('migrations/001-initial.sql', 'utf-8');
    await pool.query(migration);

    repo = new PgExpenseRepository(pool);
  }, 60_000); // timeout

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    // Isolation totale entre les tests
    await pool.query('TRUNCATE expenses CASCADE');
    await pool.query('TRUNCATE members CASCADE');
    await pool.query('TRUNCATE groups CASCADE');

    // On recrée les groupes/membres nécessaires pour les FK
    await pool.query(`INSERT INTO groups (id, name, currency) VALUES ('group-1', 'Groupe 1', 'EUR')`);
    await pool.query(`INSERT INTO groups (id, name, currency) VALUES ('group-2', 'Groupe 2', 'EUR')`);
    await pool.query(
      `INSERT INTO members (id, group_id, name, email) VALUES ('alice', 'group-1', 'Alice', 'alice@test.fr')`,
    );
    await pool.query(
      `INSERT INTO members (id, group_id, name, email) VALUES ('bob', 'group-2', 'Bob', 'bob@test.fr')`,
    );
  });

  function buildExpense(overrides: Partial<Expense> = {}): Expense {
    return {
      id: 'exp-1',
      groupId: 'group-1',
      description: 'Dîner',
      amount: 30,
      currency: 'EUR',
      paidBy: 'alice',
      paidAt: new Date('2026-01-10T12:00:00Z'),
      split: { mode: 'equal', beneficiaries: ['alice'] },
      createdAt: new Date('2026-01-10T12:00:00Z'),
      ...overrides,
    };
  }

  it('save() puis findById() retourne l\'expense identique', async () => {
    const expense = buildExpense();

    await repo.save(expense);
    const found = await repo.findById(expense.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(expense.id);
    expect(found!.description).toBe(expense.description);
    expect(found!.amount).toBe(expense.amount);
    expect(found!.paidBy).toBe(expense.paidBy);
    expect(found!.split).toEqual(expense.split);
  });

  it('findByGroupId() retourne uniquement les expenses du groupe demandé', async () => {
    await repo.save(buildExpense({ id: 'exp-1', groupId: 'group-1', paidBy: 'alice' }));
    await repo.save(
      buildExpense({
        id: 'exp-2',
        groupId: 'group-2',
        paidBy: 'bob',
        split: { mode: 'equal', beneficiaries: ['bob'] },
      }),
    );

    const results = await repo.findByGroupId('group-1');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('exp-1');
  });

  it('findInDateRange() filtre correctement (inclusif sur les bornes)', async () => {
    await repo.save(buildExpense({ id: 'exp-1', paidAt: new Date('2026-01-01T00:00:00Z') }));
    await repo.save(buildExpense({ id: 'exp-2', paidAt: new Date('2026-01-15T00:00:00Z') }));
    await repo.save(buildExpense({ id: 'exp-3', paidAt: new Date('2026-01-31T00:00:00Z') }));

    const results = await repo.findInDateRange(
      'group-1',
      new Date('2026-01-01T00:00:00Z'), // borne inférieure incluse
      new Date('2026-01-15T00:00:00Z'), // borne supérieure incluse
    );

    expect(results.map((e) => e.id).sort()).toEqual(['exp-1', 'exp-2']);
  });

  it('rejette un doublon via la contrainte UNIQUE(group_id, paid_at, amount, paid_by)', async () => {
    const expense1 = buildExpense({ id: 'exp-1' });
    const expense2 = buildExpense({ id: 'exp-2' }); // même group/paid_at/amount/paid_by, id différent

    await repo.save(expense1);

    await expect(repo.save(expense2)).rejects.toThrow();
  });

  it('une transaction qui échoue à mi-parcours rollback proprement', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO expenses
          (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, created_at)
         VALUES ('exp-valid', 'group-1', 'Valide', 10, 'EUR', 'alice', NOW(), 'equal', '{"beneficiaries":["alice"]}', NOW())`,
      );
      await client.query(
        `INSERT INTO expenses
          (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, created_at)
         VALUES ('exp-invalid', 'group-1', 'Invalide', 10, 'EUR', 'membre-inexistant', NOW(), 'equal', '{"beneficiaries":["x"]}', NOW())`,
      );
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    // Aucune des deux lignes ne doit être présente
    const found = await repo.findById('exp-valid');
    expect(found).toBeNull();
  });
});