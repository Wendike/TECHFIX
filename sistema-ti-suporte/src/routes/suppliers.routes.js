const express = require('express');

const SupplierController = require('../controllers/SupplierController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, SupplierController.index);
router.get('/create', authMiddleware, SupplierController.create);
router.post('/', authMiddleware, SupplierController.store);
router.get('/:id', authMiddleware, SupplierController.show);
router.get('/:id/edit', authMiddleware, SupplierController.edit);
router.post('/:id/update', authMiddleware, SupplierController.update);
router.post('/:id/status', authMiddleware, SupplierController.changeStatus);

module.exports = router;
