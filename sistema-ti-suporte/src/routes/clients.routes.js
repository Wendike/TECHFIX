const express = require('express');

const ClientController = require('../controllers/ClientController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, ClientController.index);
router.get('/create', authMiddleware, ClientController.create);
router.post('/', authMiddleware, ClientController.store);
router.get('/:id', authMiddleware, ClientController.show);
router.get('/:id/edit', authMiddleware, ClientController.edit);
router.post('/:id/update', authMiddleware, ClientController.update);
router.post('/:id/status', authMiddleware, ClientController.changeStatus);

module.exports = router;
