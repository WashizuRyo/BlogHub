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
      .expect(/<a class="btn btn-primary my-3" href="\/auth\/github"/)
      .expect(200);
  });

  test('ログイン時はユーザ名が表示される', async () => {
    await request(app)
      .get('/')
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
  beforeAll(async () => {
    //データベースにユーザ登録
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();

  });

  test('ブログが作成でき、表示される', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testcomment'
      })
      .expect('Location', /blogs/)
      .expect(302);

    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];
    await request(app)
      .get(createdBlogPath)
      .expect(/testTitle/)
      .expect(/testText/)
      .expect(/testcomment/)
      .expect(200);

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);
  });

  test('フォームの入力データが不正な場合', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 1234,
        blogText: 'aaa',
        comment: 'aaa'
      })
      .expect(/<h1>入力された情報が不十分または正しくありません。\(文字列を入力してください\)<\/h1>/)
      .expect(400)
    
    await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'aa',
        blogText: 134,
        comment: 'aa'
      })
      .expect(/<h1>入力された情報が不十分または正しくありません。\(文字列を入力してください\)<\/h1>/)
      .expect(400)

    await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'aa',
        blogText: 'aa',
        comment: 123
      })
      .expect(/<h1>入力された情報が不十分または正しくありません。\(文字列を入力してください\)<\/h1>/)
      .expect(400)

    await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: '',
        blogText: 'aa',
        comment: 'aa'
      })
      .expect(/<h1>入力された情報が不十分または正しくありません。\(文字列を入力してください\)<\/h1>/)
      .expect(400)

      await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'aa',
        blogText: '',
        comment: 'aa'
      })
      .expect(/<h1>入力された情報が不十分または正しくありません。\(文字列を入力してください\)<\/h1>/)
      .expect(400)

  })
});

describe('/blogs/:blogId', () => {
  beforeAll(async () => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();

  });
  test('存在しないブログにアクセスした場合', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })
      
    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];
    
    // blogIdがUUIDではない場合
    await request(app)
      .get('/blogs/aaa123')
      .expect(/有効なブログIDを指定してください。/)
      .expect(400)
    
    // blogIdがUUIDではあるが、存在しない場合
    await request(app)
      .get('/blogs/4a2e1dd2-9877-4e68-85c1-e3d8e8bfb5cd')
      .expect(/指定されたブログはありません。/)
      .expect(404)
    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);
  });
});

describe('/blogs/:blogId/edit', () => {
  beforeAll(async () => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();
    
  });
  test('存在しないブログの編集ページにアクセスした場合', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })
      
    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];
    
    // blogIdがUUIDではない場合
    await request(app)
      .get('/blogs/aaa123/edit')
      .expect(/有効なブログIDを指定してください。/)
      .expect(400)

    // 存在しないblogIdを指定した場合
    await request(app)
      .get('/blogs/4a2e1dd2-9877-4e68-85c1-e3d8e8bfb5cd/edit')
      .expect(/指定されたブログがない、または、ブログを編集する権限がありません。/)
      .expect(404)

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);

  });
});

describe('/blogs/:blogId/comments', () => {
  beforeAll(async () => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();

  });
  test('コメントを追加でき、投稿日時で降順で表示される', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })
      
    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];

    await request(app)
      .post(`/blogs/${blogId}/comments`)
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({ _csrf: formToken, comment: 'testComment2' })
      .expect('Location', `/blogs/${blogId}`)
    const comments = await prisma.comment.findMany({ where: { blogId } });
    expect(comments.length).toBe(2);
    expect(comments[0].comment).toBe('testComment');
    expect(comments[1].comment).toBe('testComment2');

    await request(app)
      .get(createdBlogPath)
      .expect(/testComment2.*testComment/)
    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);

  });

  test('パラメータの値が不正、または、フォームの値が不正の場合', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];

    await request(app)
      .post(`/blogs/${blogId}/comments`)
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        comment: 1234
      })
      .expect(/コメントを入力してください。/)
      .expect(400)
    
    await request(app)
      .post('/blogs/aaa123/comments')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        comment: 'aaa'
      })
      .expect(/有効なブログIDを指定してださい。/)
      .expect(400)

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);

  })

});

describe('/blogs/:blogId/users/:userId/comments/:commentId/delete', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();
    
  });
  test('コメントを削除', async () => {
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];
    const comment = await prisma.comment.findMany({ where: { blogId: blogId } });
    const commentId = comment[0].commentId;

    await request(app)
      .post(`/blogs/${blogId}/users/${comment[0].userId}/comments/${commentId}/delete`)
      .set('Cookie', `csrfToken=${formToken}`)
      .send({ _csrf: formToken })
      .expect('Location', `/blogs/${blogId}`)
    const comments = await prisma.comment.findMany({ where: { blogId } });
    expect(comments.length).toBe(0);

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);

  });

  test('パラメータの値が不正、または、フォームの値が不正の場合', async () => {
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })
    
      const createdBlogPath = res.headers.location;
      const blogId = createdBlogPath.split('/blogs/')[1];
      const comment = await prisma.comment.findMany({ where: { blogId: blogId } });
      const commentId = comment[0].commentId;

      // blogIdがUUIDではない場合
      await request(app)
        .post(`/blogs/aa1234/users/${comment[0].userId}/comments/${commentId}/delete`)
        .send({ _csrf: formToken, })
        .expect(/有効なブログIDを入力してください。/)
        .expect(400)
      
      // userIdが不正な場合
      await request(app)
        .post(`/blogs/${blogId}/users/5667/comments/${commentId}/delete`)
        .send({ _csrf: formToken })
        .expect(/ユーザIDが不正です。/)
        .expect(400)

      // commentIdがUUIDではない場合
      await request(app)
        .post(`/blogs/${blogId}/users/${comment[0].userId}/comments/aa1234/delete`)
        .send({ _csrf: formToken })
        .expect(/有効なコメントIDを入力してください。/)
        .expect(400)

      //存在しないblogId,commentIdを指定した場合
      const fakeUuid = '4a2e1dd2-9877-4e68-85c1-e3d8e8bfb5cd';
      await request(app)
        .post(`/blogs/${fakeUuid}/users/${comment[0].userId}/comments/${fakeUuid}/delete`)
        .send({ _csrf: formToken })
        .expect(/指定されたブログがない、または、削除する権限がありません。/)
        .expect(404)
      //テストで作成したデータを削除
      await deleteBlogAggregate(blogId);

  })  
});


describe('/blogs/:blogId/users/:userId/comments/:commentId', () => {
  beforeAll(async () => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data

    });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();
    
  });
  test('コメントが更新できる', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];
    const comment = await prisma.comment.findMany({ where: { blogId: blogId } });
    const commentId = comment[0].commentId;

    await request(app)
      .post(`/blogs/${blogId}/users/${comment[0].userId}/comments/${commentId}`)
      .send({ comment: 'testComment2' })
      .expect('{"status":"OK","comment":"testComment2"}')
    const comments = await prisma.comment.findMany({ where: { blogId } });
    expect(comments.length).toBe(1);
    expect(comments[0].comment).toBe('testComment2');

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);

  });

  test('パラメータの値が不正、または、フォームの値が不正の場合', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];
    const comment = await prisma.comment.findMany({ where: { blogId: blogId } });
    const commentId = comment[0].commentId;

    // commentが不正な値の場合
    await request(app)
      .post(`/blogs/${blogId}/users/${comment[0].userId}/comments/${commentId}`)
      .send({ comment: 1224 })
      .expect(/コメントを入力してください。/)
      .expect(400)

    // blogIdがUUIDではない場合
    await request(app)
      .post(`/blogs/aaa123/users/${comment[0].userId}/comments/${commentId}`)
      .send({ comment: 'aaa' })
      .expect(/有効なブログIDを指定してください。/)
      .expect(400)

    // userIdが不正な値の場合
    await request(app)
      .post(`/blogs/${blogId}/users/1234/comments/${commentId}`)
      .send({ comment: 'aaa' })
      .expect(/ユーザIDが不正です。/)
      .expect(400)

    // commentIdがUUIDではない場合
    await request(app)
    .post(`/blogs/${blogId}/users/${comment[0].userId}/comments/aaa1234`)
    .send({ comment: 'aaa' })
    .expect(/有効なコメントIDを入力してください。/)
    .expect(400)

    // blogId,commentIdはUUIDだが、存在しない場合
    const fakeUuid = '4a2e1dd2-9877-4e68-85c1-e3d8e8bfb5cd';
    await request(app)
      .post(`/blogs/${fakeUuid}/users/${comment[0].userId}/comments/${fakeUuid}`)
      .send({ comment: 'aaa' })
      .expect(/データベースエラー/)
      .expect(500)
    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);

  })
});

describe('/blogs/:blogId/update', () => {
  beforeAll(async () => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();
    
  });
  test('ブログを編集できる', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];
    await request(app)
      .post(`/blogs/${blogId}/update`)
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({ _csrf: formToken })
      .send({
        blogTitle: 'testTitle2',
        blogText: 'testText2'
      });
    const blog = await prisma.blog.findUnique({ where: { blogId } });
    expect(blog.blogTitle).toBe('testTitle2');
    expect(blog.blogText).toBe('testText2');

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);
  });

  test('パラメータの値が不正、または、フォームの値が不正の場合', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    const blogId = createdBlogPath.split('/blogs/')[1];

    // blogIdがUUIDではない場合
    await request(app)
      .post('/blogs/aaa1234/update')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'aaa',
        blogText: 'aaa'
      })
      .expect(/有効なブログIDを指定してください。/)
      .expect(400)

    // blogTitleが文字列ではない場合
    await request(app)
      .post(`/blogs/${blogId}/update`)
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 1234,
        blogText: 'aaa'
      })
      .expect(/文字列を入力してください。/)
      .expect(400)

    // blogTextが文字列ではない場合
    await request(app)
      .post(`/blogs/${blogId}/update`)
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'aaa',
        blogText: 1234
      })
      .expect(/文字列を入力してください。/)
      .expect(400)
    
    // blogIdがUUIDであるが、存在しない場合
    const fakeUuid = '4a2e1dd2-9877-4e68-85c1-e3d8e8bfb5cd';
    await request(app)
      .post(`/blogs/${fakeUuid}/update`)
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'aaa',
        blogText: 'aaa'
      })
      .expect(/指定されたブログがない、または、ブログを編集する権限がありません。/)
      .expect(404)

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);
  });
});

describe('/blogs/:blogId/delete', () => {
  let blogId = '';
  beforeAll(async() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: { userId },
      create: data,
      update: data
    });
  });

  afterAll(async () => {
    passportStub.logout();
    passportStub.uninstall();
    
  });
  test('ブログに関するすべての情報が削除できる', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    blogId = createdBlogPath.split('/blogs/')[1];
    console.log(blogId);
    await request(app)
      .post(`/blogs/${blogId}/delete`)
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({ _csrf: formToken })
    const blog = await prisma.blog.findUnique({ where: { blogId } });
    const comment = await prisma.comment.findMany({ where: { blogId} });
    expect(!blog).toBe(true);
    expect(comment.length).toBe(0);
  });

  test('パラメータの値が不正の場合', async () => {
    const { formToken, cookieToken } = await getCSRFTokens();
    const res = await request(app)
      .post('/blogs')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({
        _csrf: formToken,
        blogTitle: 'testTitle',
        blogText: 'testText',
        comment: 'testComment'
      })

    const createdBlogPath = res.headers.location;
    blogId = createdBlogPath.split('/blogs/')[1];

    // blogIdがUUIDではない場合
    await request(app)
      .post('/blogs/aaa1234/delete')
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({ _csrf: formToken })
      .expect(/URLの形式が正しくありません。/)
      .expect(400)

    // blogIdがUUIDであるが、存在しない場合
    const fakeUuid = '4a2e1dd2-9877-4e68-85c1-e3d8e8bfb5cd';
    await request(app)
      .post(`/blogs/${fakeUuid}/delete`)
      .set('Cookie', `csrfToken=${cookieToken}`)
      .send({ _csrf: formToken })
      .expect(/指定されたブログがない、または、削除する権限がありません。/)
      .expect(404)

    //テストで作成したデータを削除
    await deleteBlogAggregate(blogId);

    });
});

// CSRFTokensを取得
async function getCSRFTokens() {
  const response = await request(app).get('/blogs/new');
  return {
    formToken: response.text.match(/<input type="hidden" name="_csrf" value="(.+?)">/)[1],
    cookieToken: response.headers['set-cookie'][0].match(/csrfToken=(.+?);/)[1]
  };
}
