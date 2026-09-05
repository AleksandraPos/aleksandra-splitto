// src/infrastructure/pg-expense.repository.ts
//
// EXERCICE 4 — À COMPLÉTER
//
// Implémentation Postgres du ExpenseRepository.
// À tester avec Testcontainers (voir SUJET.md exercice 4).

import type { Pool } from 'pg';
import type { Expense, ExpenseSplit } from '../domain/types';
import type { ExpenseRepository } from '../ports/expense.repository';

export class PgExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async save(expense: Expense): Promise<void> {
    const { splitMode, splitData } = toSplitColumns(expense.split);

    await this.pool.query(
      `INSERT INTO expenses
        (id, group_id, description, amount, currency, paid_by, paid_at,
         split_mode, split_data, category, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        expense.id,
        expense.groupId,
        expense.description,
        expense.amount,
        expense.currency,
        expense.paidBy,
        expense.paidAt,
        splitMode,
        splitData,
        expense.category ?? null,
        expense.createdAt,
      ],
    );
  }

  async findById(id: string): Promise<Expense | null> {
    const result = await this.pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return rowToExpense(result.rows[0]);
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    const result = await this.pool.query(
      'SELECT * FROM expenses WHERE group_id = $1 ORDER BY paid_at DESC',
      [groupId],
    );
    return result.rows.map(rowToExpense);
  }

  async findInDateRange(groupId: string, from: Date, to: Date): Promise<Expense[]> {
    const result = await this.pool.query(
      `SELECT * FROM expenses
       WHERE group_id = $1 AND paid_at >= $2 AND paid_at <= $3
       ORDER BY paid_at ASC`,
      [groupId, from, to],
    );
    return result.rows.map(rowToExpense);
  }
}

//Convertit un ExpenseSplit (domaine) en colonnes SQL (split_mode, split_data)
function toSplitColumns(split: ExpenseSplit): { splitMode: string; splitData: unknown } {
  if (split.mode === 'equal') {
    return { splitMode: 'equal', splitData: JSON.stringify({ beneficiaries: split.beneficiaries }) };
  }
  if (split.mode === 'weighted') {
    return { splitMode: 'weighted', splitData: JSON.stringify({ weights: split.weights }) };
  }
  return { splitMode: 'percentage', splitData: JSON.stringify({ percentages: split.percentages }) };
}

//Convertit une ligne SQL (snake_case) en objet Expense (domaine, camelCase)
function rowToExpense(row: any): Expense {
  const split = rowToSplit(row.split_mode, row.split_data);

  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    paidBy: row.paid_by,
    paidAt: new Date(row.paid_at),
    split,
    category: row.category ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

function rowToSplit(splitMode: string, splitData: any): ExpenseSplit {
  const data = typeof splitData === 'string' ? JSON.parse(splitData) : splitData;

  if (splitMode === 'equal') {
    return { mode: 'equal', beneficiaries: data.beneficiaries };
  }
  if (splitMode === 'weighted') {
    return { mode: 'weighted', weights: data.weights };
  }
  return { mode: 'percentage', percentages: data.percentages };
}
