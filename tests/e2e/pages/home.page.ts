import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly newGroupButton: Locator;
  readonly newGroupDialog: Locator;
  readonly groupNameInput: Locator;
  readonly groupCurrencySelect: Locator;
  readonly groupMembersTextarea: Locator;
  readonly createGroupButton: Locator;
  readonly groupList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newGroupButton = page.getByRole('button', { name: 'Nouveau groupe' });
    this.newGroupDialog = page.getByRole('dialog', { name: 'Créer un groupe' });
    this.groupNameInput = this.newGroupDialog.getByLabel('Nom du groupe');
    this.groupCurrencySelect = this.newGroupDialog.getByLabel('Devise');
    this.groupMembersTextarea = this.newGroupDialog.getByLabel('Membres');
    this.createGroupButton = this.newGroupDialog.getByRole('button', { name: 'Créer' });
    this.groupList = page.getByRole('list');
  }

  async goto() {
    await this.page.goto('/');
  }

  async createGroup(name: string, currency: string, members: string[]) {
    await this.newGroupButton.click();
    await this.groupNameInput.fill(name);
    await this.groupCurrencySelect.selectOption(currency);
    await this.groupMembersTextarea.fill(members.join('\n'));
    await this.createGroupButton.click();
  }

  groupCard(name: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: name });
  }

  async openGroup(name: string) {
    await this.groupCard(name).click();
  }
}