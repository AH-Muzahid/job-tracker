-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "notes" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_userId_idx" ON "Company"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_name_key" ON "Company"("userId", "name");

-- CreateIndex
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");

-- CreateIndex
CREATE INDEX "PrepQuestion_userId_idx" ON "PrepQuestion"("userId");

-- CreateIndex
CREATE INDEX "PrepQuestion_userId_category_idx" ON "PrepQuestion"("userId", "category");

-- CreateIndex
CREATE INDEX "PrepNote_userId_idx" ON "PrepNote"("userId");

-- CreateIndex
CREATE INDEX "PrepNote_applicationId_idx" ON "PrepNote"("applicationId");

-- CreateIndex
CREATE INDEX "Application_companyId_idx" ON "Application"("companyId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepQuestion" ADD CONSTRAINT "PrepQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepNote" ADD CONSTRAINT "PrepNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepNote" ADD CONSTRAINT "PrepNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
