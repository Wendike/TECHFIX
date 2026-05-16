const express = require('express');

const FinanceController = require('../controllers/FinanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(roleMiddleware('admin'));


router.get('/', authMiddleware, FinanceController.index);
router.get('/transactions', authMiddleware, FinanceController.transactions);

router.get('/create', authMiddleware, FinanceController.create);
router.post('/', authMiddleware, FinanceController.store);

router.get('/:id', authMiddleware, FinanceController.show);
router.get('/:id/edit', authMiddleware, FinanceController.edit);
router.post('/:id/update', authMiddleware, FinanceController.update);
router.post('/:id/status', authMiddleware, FinanceController.changeStatus);

module.exports = router;
