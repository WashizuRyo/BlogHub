const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] }); 

/* GET home page. */
router.get('/', async (req, res, next) =>  {
  const title = 'BlogHub';
  if (req.user) {
    const blogs = await prisma.blog.findMany({
      where: { createdBy: parseInt(req.user.id) },
      orderBy: { updatedAt: 'desc' }
    });
    res.render('index', { title: title, user: req.user, blogs: blogs });
  } else {
    res.render('index', { title: title, user: req.user });
  }
});

module.exports = router;
