'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [ 'query' ] });

router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', { user: req.user });
});

router.post('/', authenticationEnsurer, async (req, res, next) => {
  const blogId = uuidv4();
  const updatedAt = new Date();
  const blog = await prisma.blog.create({
    data: {
      blogId: blogId,
      blogTitle: req.body.blogTitle,
      blogText: req.body.blogText,
      createdBy: parseInt(req.user.id),
      updatedAt: updatedAt
    }
  });
  res.redirect(`/blogs/${blog.blogId}`);
});

router.get('/:blogId', authenticationEnsurer, async (req, res, next) => {
  const blog = await prisma.blog.findUnique({
    where: { blogId: req.params.blogId },
    include: {
      user: {
        select: {
            userId: true,
            username: true
        }
      }
    }
  });
  if (blog) {
    res.render('blog', {
      user: req.user,
      blog: blog
    })
  } else {
    const err = new Error('指定されたブログはありません。')
    err.status = 404;
    next (err);
  }
});

module.exports = router;