// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const contextMiddleware = require('../middlewares/contextMiddleware'); 


// GET /api/admin/logs
router.get(
    '/logs', 
    // protect,  // uncomment เมื่อทำ auth เสร็จ
    // admin,    // uncomment เมื่อทำ auth เสร็จ
    contextMiddleware,
    logController.getSystemLogs
);

// GET /api/admin/logs/export
router.get(
    '/logs/export',
    // protect,
    // admin,
    contextMiddleware,
    logController.exportSystemLogs
);

module.exports = router;
// const express = require('express');
// const router = express.Router();
// const logController = require('../controllers/logController');

// const contextMiddleware = require('../middlewares/contextMiddleware'); 
// router.get(
//     '/logs', 
//     contextMiddleware,
//     logController.getSystemLogs
// );

// router.get(
//     '/logs/export',
//     contextMiddleware,
//     logController.exportSystemLogs
// );

// module.exports = router;