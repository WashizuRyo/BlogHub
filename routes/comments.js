'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });

router.post('/:blogId/users/:userId/comments/:commentId', 
  authenticationEnsurer,
  async (req, res, next) => {
    const commentId = req.params.commentId;
    const blogId = req.params.blogId;
    const userId = parseInt(req.params.userId);
    const username = req.user.username;
    const comment = req.body.comment;

    const data = {
      commentId,
      userId,
      blogId,
      username,
      comment: comment.slice(0, 255)
    };
    await prisma.comment.upsert({
      where: {
        commentCompositedId: {
          commentId,
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

router.post('/:blogId/comments',
  authenticationEnsurer,
  async (req, res, next) => {
    const blogId = req.params.blogId;
    const userId = parseInt(req.user.id);
    const username = req.user.username;
    const comment = req.body.comment;
    const commentId = uuidv4();
    await prisma.comment.create({
      data: {
        commentId,
        blogId,
        userId,
        username,
        comment: comment.slice(0, 255)
      }
    });

    res.redirect(`/blogs/${blogId}`);
  }
);

router.post('/:blogId/users/:userId/comments/:commentId/delete',
  authenticationEnsurer,
  async (req, res, next) => {
    const commentId = req.params.commentId;
    const blogId = req.params.blogId;
    const userId = parseInt(req.params.userId);
    const comment = await prisma.comment.findUnique({ 
      where: {
        commentCompositedId: {
          blogId: blogId,
          userId: userId,
          commentId: commentId
        }
      }
    });
   if (isMine(req, comment)) {
      await prisma.comment.delete({
        where: {
          commentCompositedId: {
            blogId: blogId,
            userId: userId,
            commentId: commentId
          }
        }
      });
   } else {
    const err = new Error('指定されたコメントはない、または、削除する権限がありません。')
    err.status = 404;
    next(err);
   }

   res.redirect(`/blogs/${blogId}`);
});

function isMine(req, comment) {
  return comment && comment.userId === parseInt(req.user.id);
}

module.exports = router;