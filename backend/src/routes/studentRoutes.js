// routes/StudentRoutes.js
const express = require('express');
const router = express.Router();
const {
  changeName,
  changeEmail,
  changePhone,
  changeAddress,
  setPassword,
  verifyPassword,
  changePassword
} = require('../controllers/StudentController');

router.patch('/:id/change_name', changeName);
router.patch('/:id/change_email', changeEmail);
router.patch('/:id/change_phone', changePhone);
router.patch('/:id/change_address', changeAddress);

router.patch('/:id/set_password', setPassword);
router.patch('/:id/verify_password', verifyPassword);
router.patch('/:id/change_password', changePassword);

module.exports = router;
