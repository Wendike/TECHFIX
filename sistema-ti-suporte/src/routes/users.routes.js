const express = require('express');
const roleMiddleware = require('../middlewares/roleMiddleware');

const UserController = require('../controllers/UserController');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

router.use(roleMiddleware('admin'));


router.get('/', adminMiddleware, UserController.index);
router.get('/create', adminMiddleware, UserController.create);
router.post('/', adminMiddleware, UserController.store);
router.get('/:id', adminMiddleware, UserController.show);
router.get('/:id/edit', adminMiddleware, UserController.edit);
router.post('/:id/update', adminMiddleware, UserController.update);
router.post('/:id/status', adminMiddleware, UserController.changeStatus);

module.exports = router;
