/*
  Warnings:

  - A unique constraint covering the columns `[userId,postId]` on the table `BookMark` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BookMark_userId_postId_key" ON "BookMark"("userId", "postId");
