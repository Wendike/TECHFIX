const express = require('express');

const InventoryController = require('../controllers/InventoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(roleMiddleware('admin', 'standard'));

router.get('/', authMiddleware, InventoryController.index);

router.get('/movements', authMiddleware, InventoryController.movements);
router.get('/low-stock', authMiddleware, InventoryController.lowStock);

router.get('/entry', authMiddleware, InventoryController.entryForm);
router.post('/entry', authMiddleware, InventoryController.storeEntry);

router.get('/exit', authMiddleware, InventoryController.exitForm);
router.post('/exit', authMiddleware, InventoryController.storeExit);

router.get('/adjustment', authMiddleware, InventoryController.adjustmentForm);
router.post('/adjustment', authMiddleware, InventoryController.storeAdjustment);

module.exports = router;
