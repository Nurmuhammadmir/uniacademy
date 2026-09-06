import express from "express"
import requireRole from "../middleware/auth.js"
import {
    listUnits, createUnit, updateUnit, deleteUnit,
    listMaterialCategories, createMaterialCategory, updateMaterialCategory, deleteMaterialCategory,
    listMaterials, createMaterial, updateMaterial, deleteMaterial,
    getPurchasesOverview, getPurchaseDebts, getPurchaseDetail, createPurchase, updatePurchase, deletePurchase,
} from "../controllers/shantiPurchasesController.js"
import {
    listClientCategories, createClientCategory, updateClientCategory, deleteClientCategory,
    listClients, createClient, updateClient, deleteClient,
    listProducts, createProduct, updateProduct, deleteProduct,
    getSalesOverview, getSalesDebtors, getSaleDetail, createSale, updateSale, deleteSale,
} from "../controllers/shantiSalesController.js"

const shantiRouter = express.Router()
shantiRouter.use(requireRole('shanti'))

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

// same ordering note as purchases/debts above
shantiRouter.get('/sales/debtors', getSalesDebtors)
shantiRouter.get('/sales', getSalesOverview)
shantiRouter.get('/sales/:id', getSaleDetail)
shantiRouter.post('/sales', createSale)
shantiRouter.put('/sales/:id', updateSale)
shantiRouter.delete('/sales/:id', deleteSale)

export default shantiRouter
