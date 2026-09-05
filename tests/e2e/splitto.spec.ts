import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home.page';
import { GroupPage } from './pages/group.page';

test.beforeEach(async ({ request }) => {
  await request.post('/_test/reset');
});

test('créer un groupe avec 3 membres', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();

  await home.createGroup('Vacances Ete', 'EUR', [
    'Alice <alice@test.fr>',
    'Bob <bob@test.fr>',
    'Charlie <charlie@test.fr>',
  ]);

  await expect(home.groupCard('Vacances Ete')).toBeVisible();
});

test('ajouter une dépense à un groupe existant', async ({ page }) => {
  const home = new HomePage(page);
  const group = new GroupPage(page);
  await home.goto();

  await home.createGroup('Weekend Ski', 'EUR', [
    'Alice <alice@test.fr>',
    'Bob <bob@test.fr>',
  ]);
  await home.openGroup('Weekend Ski');

  await group.addExpense('Forfait ski', 40, 'Alice');

  await expect(group.expenseRow('Forfait ski')).toBeVisible();
});

test('voir les soldes mis à jour après une dépense partagée à 3', async ({ page }) => {
  const home = new HomePage(page);
  const group = new GroupPage(page);
  await home.goto();

  await home.createGroup('Diner entre amis', 'EUR', [
    'Alice <alice@test.fr>',
    'Bob <bob@test.fr>',
    'Charlie <charlie@test.fr>',
  ]);
  await home.openGroup('Diner entre amis');

  // 30€ payé par Alice, partagé entre les 3
  await group.addExpense('Restaurant', 30, 'Alice');

  // Alice créditrice de 20€ (30 payé - 10 sa part)
  await expect(group.balanceRow('Alice')).toContainText('20.00');
  // Bob et Charlie débiteurs de 10€ chacun
  await expect(group.balanceRow('Bob')).toContainText('-10.00');
  await expect(group.balanceRow('Charlie')).toContainText('-10.00');
});

test('marquer un règlement comme réglé le retire de la liste', async ({ page }) => {
  const home = new HomePage(page);
  const group = new GroupPage(page);
  await home.goto();

  await home.createGroup('Colocation', 'EUR', [
    'Alice <alice@test.fr>',
    'Bob <bob@test.fr>',
  ]);
  await home.openGroup('Colocation');

  await group.addExpense('Courses', 20, 'Alice');

  const row = group.settlementRow('Bob', 'Alice');
  await expect(row).toBeVisible();

  await group.settle('Bob', 'Alice');

  await expect(row).not.toBeVisible();
});