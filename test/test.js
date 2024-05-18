'use strict';
const request = require('supertest');
const app = require('../app');
const passportStub = require('passport-stub');
const { deleteBlogAggregate } = require('../routes/blogs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });

describe('/login', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall();
  });

  test('ログインのためのリンクが含まれる', async () => {
    await request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/auth\/github"/)
      .expect(200);
  });

  test('ログイン時はユーザ名が表示される', async () => {
    await request(app)
      .get('/login')
      .expect(/testuser/)
      .expect(200);
  });
});

describe('/logout', () => {
  test('ログアウトすると/にリダイレクトされる', async () => {
      await request(app)
    .get('/logout')
    .expect('Location', '/')
    .expect(302);
  });
});

describe('/blogs', () => {
  let blogId = '';
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);

  });
  test('ブログが作成でき、表示される', async () => {
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
    const res = await request(app)
      .post('/blogs')
      .send({
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testcomment'
      })
      .expect('Location', /blogs/)
      .expect(302);

    const createdBlogPath = res.headers.location;
    blogId = createdBlogPath.split('/blogs/')[1];
    await request(app)
      .get(createdBlogPath)
      .expect(/testTitle/)
      .expect(/testText/)
      .expect(/testcomment/)
      .expect(200);
  });
});

describe('/blogs/:blogId/users/:userId/comments', () => {
  let blogId = '';
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();
    
    //テストで作成したデータを削除
   await deleteBlogAggregate(blogId);

  });
  test('コメントが更新できる', async () => {
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
    const res = await request(app)
      .post('/blogs')
      .send({
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    blogId = createdBlogPath.split('/blogs/')[1];
    await request(app)
      .post(`/blogs/${blogId}/users/${userId}/comments`)
      .send({ comment: 'testComment2' })
      .expect('{"status":"OK","comment":"testComment2"}')
    const comments = await prisma.comment.findMany({ where: { blogId } });
    expect(comments.length).toBe(1);
    expect(comments[0].comment).toBe('testComment2');
  });
});

describe('/blogs/:blogId/update', () => {
  let blogId = '';
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();
    
    //テストで作成したデータを削除
   await deleteBlogAggregate(blogId);

  });
  test('ブログを編集できる', async () => {
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
    const res = await request(app)
      .post('/blogs')
      .send({
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    blogId = createdBlogPath.split('/blogs/')[1];
    await request(app)
      .post(`/blogs/${blogId}/update`)
      .send({
        blogTitle: 'testTitle2',
        blogText: 'testText2'
      });
    const blog = await prisma.blog.findUnique({ where: { blogId } });
    expect(blog.blogTitle).toBe('testTitle2');
    expect(blog.blogText).toBe('testText2');
  });
});

describe('/blogs/:blogId/delete', () => {
  let blogId = '';
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();
    
  });
  test('ブログに関するすべての情報が削除できる', async () => {
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
    const res = await request(app)
      .post('/blogs')
      .send({
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    blogId = createdBlogPath.split('/blogs/')[1];
    await request(app)
      .post(`/blogs/${blogId}/delete`)
    const blog = await prisma.blog.findUnique({ where: { blogId } });
    const comment = await prisma.comment.findMany({ where: { blogId} });
    expect(!blog).toBe(true);
    expect(comment.length).toBe(0);
  });
});