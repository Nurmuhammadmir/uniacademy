import express from "express"
import requireRole from "../middleware/auth.js"
import { getBalance } from "../controllers/shantiBalanceController.js"
import {
    listUnits, createUnit, updateUnit, deleteUnit,
    listMaterialCategories, createMaterialCategory, updateMaterialCategory, deleteMaterialCategory,
    listMaterials, createMaterial, updateMaterial, deleteMaterial,
    listSellers, createSeller, updateSeller, deleteSeller,
    getPurchasesOverview, getPurchaseDebts, getPurchaseDetail, createPurchase, updatePurchase, deletePurchase,
} from "../controllers/shantiPurchasesController.js"
import {
    listClientCategories, createClientCategory, updateClientCategory, deleteClientCategory,
    listClients, createClient, updateClient, deleteClient,
    listProducts, createProduct, updateProduct, deleteProduct, restockProduct,
    getSalesOverview, getSalesDebtors, getSaleDetail, createSale, updateSale, deleteSale,
} from "../controllers/shantiSalesController.js"
import { getPaymentsOverview, createPayment, updatePayment, deletePayment, getPaymentsChart } from "../controllers/shantiFinanceController.js"
import { getDashboardSummary, getDashboardSeries } from "../controllers/shantiDashboardController.js"
import {
    getBalanceAdjustments, createBalanceAdjustment, updateBalanceAdjustment, deleteBalanceAdjustment, restockMaterial,
} from "../controllers/shantiSettingsController.js"
import {
    listExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    getExpensesOverview, getExpensesChart, createExpense, updateExpense, deleteExpense,
} from "../controllers/shantiExpenseController.js"

const shantiRouter = express.Router()
shantiRouter.use(requireRole('shanti'))

shantiRouter.get('/balance', getBalance)

shantiRouter.get('/dashboard/summary', getDashboardSummary)
shantiRouter.get('/dashboard/series', getDashboardSeries)

shantiRouter.get('/settings/balance-adjustments', getBalanceAdjustments)
shantiRouter.post('/settings/balance-adjustments', createBalanceAdjustment)
shantiRouter.put('/settings/balance-adjustments/:id', updateBalanceAdjustment)
shantiRouter.delete('/settings/balance-adjustments/:id', deleteBalanceAdjustment)

shantiRouter.get('/finance/chart', getPaymentsChart)
shantiRouter.get('/finance/payments', getPaymentsOverview)
shantiRouter.post('/finance/payments', createPayment)
shantiRouter.put('/finance/payments/:id', updatePayment)
shantiRouter.delete('/finance/payments/:id', deletePayment)

shantiRouter.get('/expense-categories', listExpenseCategories)
shantiRouter.post('/expense-categories', createExpenseCategory)
shantiRouter.put('/expense-categories/:id', updateExpenseCategory)
shantiRouter.delete('/expense-categories/:id', deleteExpenseCategory)

shantiRouter.get('/expenses/chart', getExpensesChart)
shantiRouter.get('/expenses', getExpensesOverview)
shantiRouter.post('/expenses', createExpense)
shantiRouter.put('/expenses/:id', updateExpense)
shantiRouter.delete('/expenses/:id', deleteExpense)

shantiRouter.get('/units', listUnits)
shantiRouter.post('/units', createUnit)
shantiRouter.put('/units/:id', updateUnit)
shantiRouter.delete('/units/:id', deleteUnit)

shantiRouter.get('/material-categories', listMaterialCategories)
shantiRouter.post('/material-categories', createMaterialCategory)
shantiRouter.put('/material-categories/:id', updateMaterialCategory)
shantiRouter.delete('/material-categories/:id', deleteMaterialCategory)

shantiRouter.get('/materials', listMaterials)
shantiRouter.post('/materials', createMaterial)
shantiRouter.put('/materials/:id', updateMaterial)
shantiRouter.delete('/materials/:id', deleteMaterial)
shantiRouter.post('/materials/:id/restock', restockMaterial)

shantiRouter.get('/sellers', listSellers)
shantiRouter.post('/sellers', createSeller)
shantiRouter.put('/sellers/:id', updateSeller)
shantiRouter.delete('/sellers/:id', deleteSeller)

// must be registered before the generic '/purchases/:id' below - Express matches routes in
// registration order, and :id would otherwise greedily match the literal "debts" segment
shantiRouter.get('/purchases/debts', getPurchaseDebts)
shantiRouter.get('/purchases', getPurchasesOverview)
shantiRouter.get('/purchases/:id', getPurchaseDetail)
shantiRouter.post('/purchases', createPurchase)
shantiRouter.put('/purchases/:id', updatePurchase)
shantiRouter.delete('/purchases/:id', deletePurchase)

shantiRouter.get('/client-categories', listClientCategories)
shantiRouter.post('/client-categories', createClientCategory)
shantiRouter.put('/client-categories/:id', updateClientCategory)
shantiRouter.delete('/client-categories/:id', deleteClientCategory)

shantiRouter.get('/clients', listClients)
shantiRouter.post('/clients', createClient)
shantiRouter.put('/clients/:id', updateClient)
shantiRouter.delete('/clients/:id', deleteClient)

shantiRouter.get('/products', listProducts)
shantiRouter.post('/products', createProduct)
shantiRouter.put('/products/:id', updateProduct)
shantiRouter.delete('/products/:id', deleteProduct)
shantiRouter.post('/products/:id/restock', restockProduct)

// same ordering note as purchases/debts above
shantiRouter.get('/sales/debtors', getSalesDebtors)
shantiRouter.get('/sales', getSalesOverview)
shantiRouter.get('/sales/:id', getSaleDetail)
shantiRouter.post('/sales', createSale)
shantiRouter.put('/sales/:id', updateSale)
shantiRouter.delete('/sales/:id', deleteSale)

export default shantiRouter
