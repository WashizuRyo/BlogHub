'use strict';
const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const authenticationEnsurer = require('./authentication-ensurer');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });

router.post('/:blogId/users/:userId/comments/:commentId', 
  authenticationEnsurer,
  async (req, res, next) => {
    //フォームの値とパラメータのバリデーション
    await body('comment').isString().withMessage('コメントを入力してください。').run(req);
    await param('blogId').isUUID('4').withMessage('有効なブログIDを指定してください。').run(req);
    await param('userId').isInt().custom((value, { req }) => {
      return parseInt(value) === parseInt(req.user.id);
    }).withMessage('ユーザIDが不正です。').run(req);
    await param('commentId').isUUID('4').withMessage('有効なコメントIDを入力してください。').run(req);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'NG', error: errors.array() });
    }

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

    try {
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
    res.status(200).json({ status: 'OK', comment: comment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 'NG', errors: [{msg: 'データベースエラー'}] });
    }
  }
);

router.post('/:blogId/comments',
  authenticationEnsurer,
  async (req, res, next) => {
    //フォームの値とパラメータのバリデーション
    await body('comment').isString().withMessage('コメントを入力してください。').run(req);
    await param('blogId').isUUID('4').withMessage('有効なブログIDを指定してださい。').run(req);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'NG', errors: errors.array() });
    }

    const blogId = req.params.blogId;
    const userId = parseInt(req.user.id);
    const username = req.user.username;
    const comment = req.body.comment;
    const commentId = uuidv4();
    try {
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
    } catch (error) {
      res.status(500).json({ status: 'NG', errors: [{ msg: 'データベースエラー'}] });
    }
  }
);

router.post('/:blogId/users/:userId/comments/:commentId/delete',
  authenticationEnsurer,
  async (req, res, next) => {
    //フォームの値とパラメータのバリデーション
    await param('blogId').isUUID('4').withMessage('有効なブログIDを入力してください。').run(req);
    await param('userId').isInt().custom((value, { req }) => {
      return parseInt(value) === parseInt(req.user.id);
    }).withMessage('ユーザIDが不正です。').run(req);
    await param('commentId').isUUID('4').withMessage('有効なコメントIDを入力してください。').run(req)
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'NG', errors: errors.array() });
    }

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
      try {
        await prisma.comment.delete({
          where: {
            commentCompositedId: {
              blogId: blogId,
              userId: userId,
              commentId: commentId
            }
          }
        });
        res.redirect(`/blogs/${blogId}`);
      } catch (error) {
        res.status(500).json({ status: 'NG', errors: [{ msg: 'データベースエラー'}] });
      }
   } else {
    const err = new Error('指定されたブログがない、または、削除する権限がありません。')
    err.status = 404;
    next(err);
   }
});

function isMine(req, comment) {
  return comment && comment.userId === parseInt(req.user.id);
}

module.exports = router;