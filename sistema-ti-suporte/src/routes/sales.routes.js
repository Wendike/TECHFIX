const express = require('express');

const SaleController = require('../controllers/SaleController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(roleMiddleware('admin'));


router.get('/', authMiddleware, SaleController.index);
router.get('/create', authMiddleware, SaleController.create);
router.post('/', authMiddleware, SaleController.store);

router.get('/:id', authMiddleware, SaleController.show);
router.get('/:id/edit', authMiddleware, SaleController.edit);
router.post('/:id/update', authMiddleware, SaleController.update);

router.post('/:id/status', authMiddleware, SaleController.changeStatus);
router.post('/:id/items', authMiddleware, SaleController.addItem);
router.post('/:id/items/:itemId/delete', authMiddleware, SaleController.removeItem);

module.exports = router;
