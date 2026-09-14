// LamusWater - a separate water-delivery CRM sharing this VPS/backend process with the school
// platform (own database though - see config/lamusMongodb.js). Mounted under /api/lamus/* in
// server.js so its route prefixes (/admin, /manager, /client, /order, /stock, /finance) never
// collide with this platform's own /api/admin etc.
import express from 'express'
import { lamusAuthAdmin, lamusAuthManager } from '../middleware/lamusAuth.js'
import {
    loginAdmin, getAllManagers, addManager, editManager, removeManager, getOperations,
    getAllClients, getAllAdmins, addAdmin, editAdmin, removeAdmin, getManagerLocations,
} from '../controllers/lamusAdminController.js'
import { loginManager, getProfile, updateLocation } from '../controllers/lamusManagerController.js'
import { addClient, getMyClients, updateClient, deleteClient } from '../controllers/lamusClientController.js'
import { recordOrder, getMyOrders, getClientOrders } from '../controllers/lamusOrderController.js'
import { getStock, addStock } from '../controllers/lamusStockController.js'
import { settings, updateSettings, addTransaction, updateTransaction, deleteTransaction, report } from '../controllers/lamusFinanceController.js'

const lamusRouter = express.Router()

// admin
lamusRouter.post('/admin/login', loginAdmin)
lamusRouter.get('/admin/managers', lamusAuthAdmin, getAllManagers)
lamusRouter.post('/admin/manager', lamusAuthAdmin, addManager)
lamusRouter.put('/admin/manager/:managerId', lamusAuthAdmin, editManager)
lamusRouter.delete('/admin/manager/:managerId', lamusAuthAdmin, removeManager)
lamusRouter.get('/admin/operations', lamusAuthAdmin, getOperations)
lamusRouter.get('/admin/manager-locations', lamusAuthAdmin, getManagerLocations)
lamusRouter.get('/admin/clients', lamusAuthAdmin, getAllClients)
lamusRouter.get('/admin/admins', lamusAuthAdmin, getAllAdmins)
lamusRouter.post('/admin/admin', lamusAuthAdmin, addAdmin)
lamusRouter.put('/admin/admin/:adminId', lamusAuthAdmin, editAdmin)
lamusRouter.delete('/admin/admin/:adminId', lamusAuthAdmin, removeAdmin)

// manager
lamusRouter.post('/manager/login', loginManager)
lamusRouter.get('/manager/profile', lamusAuthManager, getProfile)
lamusRouter.post('/manager/location', lamusAuthManager, updateLocation)

// client
lamusRouter.post('/client', lamusAuthManager, addClient)
lamusRouter.get('/client/my', lamusAuthManager, getMyClients)
lamusRouter.put('/client/:clientId', lamusAuthManager, updateClient)
lamusRouter.delete('/client/:clientId', lamusAuthManager, deleteClient)

// order
lamusRouter.post('/order', lamusAuthManager, recordOrder)
lamusRouter.get('/order/my', lamusAuthManager, getMyOrders)
lamusRouter.get('/order/client/:clientId', lamusAuthManager, getClientOrders)

// stock
lamusRouter.get('/stock', lamusAuthManager, getStock)
lamusRouter.post('/stock/add', lamusAuthAdmin, addStock)

// finance
lamusRouter.get('/finance/settings', lamusAuthManager, settings)
lamusRouter.put('/finance/settings', lamusAuthAdmin, updateSettings)
lamusRouter.post('/finance/transactions', lamusAuthAdmin, addTransaction)
lamusRouter.put('/finance/transactions/:id', lamusAuthAdmin, updateTransaction)
lamusRouter.delete('/finance/transactions/:id', lamusAuthAdmin, deleteTransaction)
lamusRouter.get('/finance/report', lamusAuthAdmin, report)

export default lamusRouter
