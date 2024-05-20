'use strict';
const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const authenticationEnsurer = require('./authentication-ensurer');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [ 'query' ] });

router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, async (req, res, next) => {
  await body('blogTitle').isString().run(req);
  await body('blogText').isString().run(req);
  await body('comment').isString().run(req);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('入力された情報が不十分または正しくありません。(文字列を入力してください)')
      err.status = 400;
      return next(err);
  }

  const blogId = uuidv4();
  const updatedAt = new Date();
  //blog作成
  const blog = await prisma.blog.create({
    data: {
      blogId: blogId,
      blogTitle: req.body.blogTitle,
      blogText: req.body.blogText,
      createdBy: parseInt(req.user.id),
      updatedAt: updatedAt
    }
  });
  const commentId = uuidv4();
  // comment作成
  const comment = await prisma.comment.create({
    data: {
      commentId: commentId,
      blogId: blogId,
      userId: parseInt(req.user.id),
      username: req.user.username,
      comment: req.body.comment
    }
  });
  res.redirect(`/blogs/${blog.blogId}`);
});

router.get('/:blogId', authenticationEnsurer, async (req, res, next) => {
  await param('blogId').isUUID('4').run(req);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('有効なブログIDを指定してください。');
    err.status = 400;
    return next(err);
  }
  // blogを取得
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
  // 存在しないblogIdを指定した場合
 if (!blog === true) {
    const err = new Error('指定されたブログはありません。');
    err.status = 404;
    return next(err);
  }

  // コメントの取得
  const comments = await prisma.comment.findMany({
    where: { blogId: blog.blogId }
  });

  res.render('blog', {
    user: req.user,
    blog: blog,
    comments: comments,
    csrfToken: req.csrfToken()
  })
});

router.get('/:blogId/edit', authenticationEnsurer, async (req, res, next) => {
  await param('blogId').isUUID('4').run(req);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('有効なブログIDを指定してください。')
    err.status = 400;
    return next(err);
  }
  // blogを取得
  const blog = await prisma.blog.findUnique({
    where: { blogId: req.params.blogId }
  });

  // 作成者のみが編集フォームを開ける
  if (isMine(req, blog)) { 
    res.render('edit', {
      user: req.user,
      blog: blog,
      csrfToken: req.csrfToken()
    });
  } else {
    const err = new Error('指定されたブログがない、または、ブログを編集する権限がありません。');
    err.status = 404;
    next(err);
  }
});

router.post('/:blogId/update', authenticationEnsurer, async (req, res, next) => {
  await param('blogId').isUUID('4').withMessage('有効なブログIDを指定してください。').run(req);
  await body('blogTitle').isString().withMessage('文字列を入力してください。').run(req);
  await body('blogText').isString().withMessage('文字列を入力してください。').run(req);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'NG', error: errors.array() });
  }
  // ブログを取得
  let blog = await prisma.blog.findUnique({
    where: { blogId: req.params.blogId }
  });

  try {
    // ブログの作成者のみが編集できる
    if (isMine(req, blog)) {
      const updatedAt = new Date();
      blog = await prisma.blog.update({
        where: { blogId: req.params.blogId},
        data: {
          blogTitle: req.body.blogTitle,
          blogText: req.body.blogText,
          updatedAt: updatedAt,
        }
      });

      res.redirect(`/blogs/${blog.blogId}`);
    } else {
      const err = new Error('指定されたブログがない、または、ブログを編集する権限がありません。');
      err.status = 404;
      next(err);
    }
  } catch (error) {
    res.status(400).json({ status: 'NG', errors: [{ msg: 'データベースエラー。' }] });
  }
});

router.post('/:blogId/delete', authenticationEnsurer, async (req, res, next) => {
  await param('blogId').isUUID('4').run(req);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('URLの形式が正しくありません。')
    err.status = 400;
    return next(err);
  }

  const blog = await prisma.blog.findUnique({
    where: { blogId: req.params.blogId }
  });

  try {
    // ブログの作成者のみが削除できる
    if (isMine(req, blog)) {
      await deleteBlogAggregate(blog.blogId);
      res.redirect('/');
    } else {
      const err = new Error('指定されたブログがない、または、削除する権限がありません。');
      err.status = 404;
      next(err);
    }
  } catch (error) {
      res.status('400').json({ status: 'NG', errors: [{ msg: 'データベースエラー。' }] });
  }
});

// blogとcommentを削除
async function deleteBlogAggregate(blogId) {
  await prisma.comment.deleteMany({ where: { blogId } });
  await prisma.blog.delete({ where: { blogId } });
}

// ブログの作成者とリクエストが同じ
function isMine(req, blog) {
  return blog && parseInt(blog.createdBy) === parseInt(req.user.id);
}

router.deleteBlogAggregate = deleteBlogAggregate;

module.exports = router;