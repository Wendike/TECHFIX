const express = require('express');

const DeliveryController = require('../controllers/DeliveryController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(roleMiddleware('admin', 'standard'));

router.get('/', authMiddleware, DeliveryController.index);
router.get('/create', authMiddleware, DeliveryController.create);
router.post('/', authMiddleware, DeliveryController.store);

router.get('/:id', authMiddleware, DeliveryController.show);
router.get('/:id/edit', authMiddleware, DeliveryController.edit);
router.post('/:id/update', authMiddleware, DeliveryController.update);
router.post('/:id/status', authMiddleware, DeliveryController.changeStatus);

module.exports = router;
