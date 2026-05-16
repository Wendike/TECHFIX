const express = require('express');
const roleMiddleware = require('../middlewares/roleMiddleware');

const AdminController = require('../controllers/AdminController');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

router.use(roleMiddleware('admin'));

router.get('/', adminMiddleware, AdminController.index);

router.get('/backups', adminMiddleware, AdminController.backups);
router.post('/backups/create', adminMiddleware, AdminController.createBackup);
router.get('/backups/:filename/download', adminMiddleware, AdminController.downloadBackup);
router.post('/backups/:filename/delete', adminMiddleware, AdminController.deleteBackup);

router.get('/logs', adminMiddleware, AdminController.logs);
router.post('/logs/clear', adminMiddleware, AdminController.clearLogs);

router.get('/permissions', adminMiddleware, AdminController.permissions);

module.exports = router;
