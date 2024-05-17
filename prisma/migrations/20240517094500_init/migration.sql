-- CreateTable
CREATE TABLE "users" (
    "userId" INTEGER NOT NULL,
    "username" VARCHAR(255) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "blogs" (
    "blogId" UUID NOT NULL,
    "blogTitle" VARCHAR(255) NOT NULL,
    "blogText" TEXT NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("blogId")
);

-- CreateTable
CREATE TABLE "comments" (
    "blogId" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "comment" VARCHAR(255) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("blogId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "blogs_createdBy_idx" ON "blogs"("createdBy");

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blogs"("blogId") ON DELETE CASCADE ON UPDATE CASCADE;
