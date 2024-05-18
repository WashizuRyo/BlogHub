const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] }); 

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tokyo');


/* GET home page. */
router.get('/', async (req, res, next) =>  {
  const title = 'BlogHub';
  if (req.user) {
    const blogs = await prisma.blog.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            userId: true,
            username: true
          }
        }
      }
    });
    blogs.forEach((blog) => {
      blog.formattedUpdateAt = dayjs(blog.updatedAt).tz().format('YYYY/MM/DD HH:mm');
    });

    res.render('index', { title: title, user: req.user, blogs: blogs });
  } else {
    res.render('index', { title: title, user: req.user });
  }
});

module.exports = router;
