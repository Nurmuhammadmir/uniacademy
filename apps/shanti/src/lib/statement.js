// shared between the on-screen preview (StatementModal.jsx) and the PDF (StatementPdf.jsx) so the
// "who owes whom" verdict reads identically in both places. Plain "Сальдо на конец периода" +
// a signed number forces the reader to do the arithmetic themselves - this says it outright.
export const closingBalanceLabelKey = (isSales, value) => {
    if (value > 0.0001) return isSales ? 'statementClientOwes' : 'statementWeOwe'
    if (value < -0.0001) return isSales ? 'statementWeOweClient' : 'statementSupplierOwesUs'
    return 'statementSettled'
}

// any non-zero balance (either direction) gets the same "needs attention" tone - only an exact
// settle-up is the "all clear" tone
export const isBalanceSettled = (value) => Math.abs(value) <= 0.0001
