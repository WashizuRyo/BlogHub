'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });

router.post('/:blogId/users/:userId/comments', 
  authenticationEnsurer,
  async (req, res, next) => {
    const blogId = req.params.blogId;
    const userId = parseInt(req.params.userId);
    const username = req.user.username;
    const comment = req.body.comment;

    const data = {
      userId,
      blogId,
      username,
      comment: comment.slice(0, 255)
    };
    await prisma.comment.upsert({
      where: {
        commentCompositedId: {
          userId,
          blogId
        }
      },
      update: data,
      create: data
    });

    res.json({ status: 'OK', comment: comment });
  }
);

module.exports = router;