const express = require('express');

const ReportController = require('../controllers/ReportController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, ReportController.index);
router.get('/clients', authMiddleware, ReportController.clients);
router.get('/devices', authMiddleware, ReportController.devices);
router.get('/repairs', authMiddleware, ReportController.repairs);
router.get('/inventory', authMiddleware, ReportController.inventory);
router.get('/sales', authMiddleware, ReportController.sales);
router.get('/finance', authMiddleware, ReportController.finance);
router.get('/deliveries', authMiddleware, ReportController.deliveries);

module.exports = router;
