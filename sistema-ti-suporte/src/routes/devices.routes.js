const express = require('express');

const DeviceController = require('../controllers/DeviceController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, DeviceController.index);
router.get('/create', authMiddleware, DeviceController.create);
router.post('/', authMiddleware, DeviceController.store);
router.get('/:id', authMiddleware, DeviceController.show);
router.get('/:id/edit', authMiddleware, DeviceController.edit);
router.post('/:id/update', authMiddleware, DeviceController.update);
router.post('/:id/status', authMiddleware, DeviceController.changeStatus);

module.exports = router;
