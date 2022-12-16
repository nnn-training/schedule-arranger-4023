'use strict';
const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  const from = req.query.from;
  if (from) {
    res.cookie('loginFrom', from, { expres: new Date(Date.now() + 600000)})
  }
  res.render('login', { user: req.user });
});

module.exports = router;
