import type { Page, Locator } from '@playwright/test';

export class GroupPage {
  readonly page: Page;
  readonly addExpenseButton: Locator;
  readonly newExpenseDialog: Locator;
  readonly expenseDescriptionInput: Locator;
  readonly expenseAmountInput: Locator;
  readonly expensePaidBySelect: Locator;
  readonly addExpenseSubmitButton: Locator;
  readonly expensesTable: Locator;
  readonly balancesTable: Locator;
  readonly settlementsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addExpenseButton = page.getByRole('button', { name: 'Ajouter une dépense' });
    this.newExpenseDialog = page.getByRole('dialog', { name: 'Ajouter une dépense' });
    this.expenseDescriptionInput = this.newExpenseDialog.getByLabel('Description');
    this.expenseAmountInput = this.newExpenseDialog.getByLabel('Montant');
    this.expensePaidBySelect = this.newExpenseDialog.getByLabel('Payé par');
    this.addExpenseSubmitButton = this.newExpenseDialog.getByRole('button', { name: 'Ajouter' });
    this.expensesTable = page.getByRole('table', { name: 'Liste des dépenses' });
    this.balancesTable = page.getByRole('table', { name: 'Soldes des membres' });
    this.settlementsTable = page.getByRole('table', { name: 'Règlements' });
  }

  async addExpense(description: string, amount: number, paidByName: string) {
    await this.addExpenseButton.click();
    await this.expenseDescriptionInput.fill(description);
    await this.expenseAmountInput.fill(String(amount));
    await this.expensePaidBySelect.selectOption({ label: paidByName });
    await this.addExpenseSubmitButton.click();
  }

  expenseRow(description: string): Locator {
    return this.expensesTable.getByRole('row').filter({ hasText: description });
  }

  balanceRow(memberName: string): Locator {
    return this.balancesTable.getByRole('row').filter({ hasText: memberName });
  }

  settlementRow(fromName: string, toName: string): Locator {
    return this.settlementsTable
      .getByRole('row')
      .filter({ hasText: fromName })
      .filter({ hasText: toName });
  }

  async settle(fromName: string, toName: string) {
    await this.settlementRow(fromName, toName).getByRole('button', { name: 'Régler' }).click();
  }
}