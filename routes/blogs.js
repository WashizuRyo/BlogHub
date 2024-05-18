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
  const comment = await prisma.comment.create({
    data: {
      blogId: blogId,
      userId: parseInt(req.user.id),
      username: req.user.username,
      comment: req.body.comment || ''
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

  // コメントの取得
  const comments = await prisma.comment.findMany({
    where: { blogId: blog.blogId }
  });

  if (blog) {
    res.render('blog', {
      user: req.user,
      blog: blog,
      users: [ req.user ],
      comments: comments
    })
  } else {
    const err = new Error('指定されたブログはありません。')
    err.status = 404;
    next (err);
  }
});

router.get('/:blogId/edit', authenticationEnsurer, async (req, res, next) => {
  const blog = await prisma.blog.findUnique({
    where: { blogId: req.params.blogId }
  });
  if (isMine(req, blog)) { // 作成者のみが編集フォームを開ける
    res.render('edit', {
      user: req.user,
      blog: blog
    });
  } else {
    const err = new Error('指定されたブログがない、または、ブログを編集する権限がありません。');
    err.status = 404;
    next(err);
  }
});

function isMine(req, blog) {
  return blog && parseInt(blog.createdBy) === parseInt(req.user.id);
}


router.post('/:blogId/update', authenticationEnsurer, async (req, res, next) => {
  let blog = await prisma.blog.findUnique({
    where: { blogId: req.params.blogId }
  });
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
});

router.post('/:blogId/delete', authenticationEnsurer, async (req, res, next) => {
  const blog = await prisma.blog.findUnique({
    where: { blogId: req.params.blogId }
  });
  if (isMine(req, blog)) {
    await deleteBlogAggregate(blog.blogId);
    res.redirect('/');
  } else {
    const err = new Error('指定されたブログがない、または、削除する権限がありません');
    err.status = 404;
    next(err);
  }
});

async function deleteBlogAggregate(blogId) {
  await prisma.comment.deleteMany({ where: { blogId } });
  await prisma.blog.delete({ where: { blogId } });
}

router.deleteBlogAggregate = deleteBlogAggregate;

module.exports = router;