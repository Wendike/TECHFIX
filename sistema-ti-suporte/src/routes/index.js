const express = require('express');

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const clientsRoutes = require('./clients.routes');
const suppliersRoutes = require('./suppliers.routes');
const partsRoutes = require('./parts.routes');
const inventoryRoutes = require('./inventory.routes');
const devicesRoutes = require('./devices.routes');
const repairsRoutes = require('./repairs.routes');
const salesRoutes = require('./sales.routes');
const financeRoutes = require('./finance.routes');
const deliveriesRoutes = require('./deliveries.routes');
const reportsRoutes = require('./reports.routes');

const DashboardController = require('../controllers/DashboardController');
const AdminController = require('../controllers/AdminController');

const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

router.use(authRoutes);

router.get('/', authMiddleware, DashboardController.index);
router.get('/dashboard', authMiddleware, DashboardController.index);

router.get('/admin', adminMiddleware, AdminController.index);

router.use('/users', usersRoutes);
router.use('/clients', clientsRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/parts', partsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/devices', devicesRoutes);
router.use('/repairs', repairsRoutes);
router.use('/sales', salesRoutes);
router.use('/finance', financeRoutes);
router.use('/deliveries', deliveriesRoutes);
router.use('/reports', reportsRoutes);

module.exports = router;
