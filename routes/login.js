'use strict';
const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  console.log(req.user);
  res.render('login', { user: req.user })
});

module.exports = router;