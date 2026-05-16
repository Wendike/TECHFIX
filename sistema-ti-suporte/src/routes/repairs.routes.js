const express = require('express');

const RepairController = require('../controllers/RepairController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(roleMiddleware('admin', 'standard'));

router.get('/', authMiddleware, RepairController.index);
router.get('/create', authMiddleware, RepairController.create);
router.post('/', authMiddleware, RepairController.store);

router.get('/:id', authMiddleware, RepairController.show);
router.get('/:id/edit', authMiddleware, RepairController.edit);
router.post('/:id/update', authMiddleware, RepairController.update);

router.post('/:id/parts', authMiddleware, RepairController.addPart);
router.post('/:id/parts/:repairPartId/delete', authMiddleware, RepairController.removePart);

router.get('/:id/finish', authMiddleware, RepairController.finishForm);
router.post('/:id/finish', authMiddleware, RepairController.finish);

router.post('/:id/status', authMiddleware, RepairController.changeStatus);

module.exports = router;
