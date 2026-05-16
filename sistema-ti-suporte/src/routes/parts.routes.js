const express = require('express');

const PartController = require('../controllers/PartController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(roleMiddleware('admin'));


router.get('/', authMiddleware, PartController.index);
router.get('/create', authMiddleware, PartController.create);
router.post('/', authMiddleware, PartController.store);
router.get('/:id', authMiddleware, PartController.show);
router.get('/:id/edit', authMiddleware, PartController.edit);
router.post('/:id/update', authMiddleware, PartController.update);
router.post('/:id/status', authMiddleware, PartController.changeStatus);

module.exports = router;
