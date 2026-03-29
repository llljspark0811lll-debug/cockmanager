ALTER TABLE "Admin"
ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
