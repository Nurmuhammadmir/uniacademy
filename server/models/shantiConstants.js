// deliberately a standalone copy, not imported from the school's Expense.js EXPENSE_METHODS - keeps
// LasummaShanti's code fully decoupled from the school domain even though they share a database.
// The UI only renders buttons for cash/card/click for now; the rest exist so a 4th method is a
// front-end-only change later, never a migration.
export const SHANTI_METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']
