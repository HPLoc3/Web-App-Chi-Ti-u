-- 1. Alter existing Category table
ALTER TABLE "Category" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "Category" ALTER COLUMN "type" SET DEFAULT 'EXPENSE';
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- 2. Alter existing Wallet table
ALTER TABLE "Wallet" ALTER COLUMN "balance" TYPE DECIMAL(15,2);
ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- 3. Alter existing Transaction table
ALTER TABLE "Transaction" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "Transaction" ALTER COLUMN "type" SET DEFAULT 'EXPENSE';
ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE DECIMAL(15,2);

-- 4. Create new tables if they don't exist
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Budget" (
    "id" TEXT NOT NULL,
    "income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "budgetTemplate" TEXT NOT NULL DEFAULT '50_30_20',
    "needsPercent" INTEGER NOT NULL DEFAULT 50,
    "wantsPercent" INTEGER NOT NULL DEFAULT 30,
    "savingsPercent" INTEGER NOT NULL DEFAULT 20,
    "categoryLimits" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BudgetLimit" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLimit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Goal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(15,2) NOT NULL,
    "currentAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "color" TEXT,
    "icon" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXPENSE',
    "categoryId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "intent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- 5. Create Indices & Unique Constraints safely
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_sessionToken_idx" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx" ON "RefreshToken"("token");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Category_userId_name_type_key" ON "Category"("userId", "name", "type");
CREATE INDEX IF NOT EXISTS "Category_userId_idx" ON "Category"("userId");
CREATE INDEX IF NOT EXISTS "Category_userId_type_idx" ON "Category"("userId", "type");
CREATE INDEX IF NOT EXISTS "Category_isSystem_idx" ON "Category"("isSystem");

CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_userId_name_key" ON "Wallet"("userId", "name");
CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId");
CREATE INDEX IF NOT EXISTS "Wallet_userId_isDefault_idx" ON "Wallet"("userId", "isDefault");

CREATE INDEX IF NOT EXISTS "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

CREATE UNIQUE INDEX IF NOT EXISTS "Budget_userId_key" ON "Budget"("userId");
CREATE INDEX IF NOT EXISTS "Budget_userId_idx" ON "Budget"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "BudgetLimit_budgetId_categoryId_key" ON "BudgetLimit"("budgetId", "categoryId");
CREATE INDEX IF NOT EXISTS "BudgetLimit_budgetId_idx" ON "BudgetLimit"("budgetId");
CREATE INDEX IF NOT EXISTS "BudgetLimit_categoryId_idx" ON "BudgetLimit"("categoryId");

CREATE INDEX IF NOT EXISTS "Goal_userId_idx" ON "Goal"("userId");
CREATE INDEX IF NOT EXISTS "Goal_userId_deadline_idx" ON "Goal"("userId", "deadline");

CREATE INDEX IF NOT EXISTS "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId");
CREATE INDEX IF NOT EXISTS "RecurringTransaction_userId_isActive_idx" ON "RecurringTransaction"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "RecurringTransaction_dayOfMonth_isActive_idx" ON "RecurringTransaction"("dayOfMonth", "isActive");

CREATE INDEX IF NOT EXISTS "AIUsage_userId_idx" ON "AIUsage"("userId");
CREATE INDEX IF NOT EXISTS "AIUsage_userId_createdAt_idx" ON "AIUsage"("userId", "createdAt");

-- 6. Add Foreign Keys safely for new tables
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Session_userId_fkey') THEN
        ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='PasswordResetToken_userId_fkey') THEN
        ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='RefreshToken_userId_fkey') THEN
        ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Budget_userId_fkey') THEN
        ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='BudgetLimit_budgetId_fkey') THEN
        ALTER TABLE "BudgetLimit" ADD CONSTRAINT "BudgetLimit_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='BudgetLimit_categoryId_fkey') THEN
        ALTER TABLE "BudgetLimit" ADD CONSTRAINT "BudgetLimit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Goal_userId_fkey') THEN
        ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='RecurringTransaction_categoryId_fkey') THEN
        ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='RecurringTransaction_userId_fkey') THEN
        ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='AIUsage_userId_fkey') THEN
        ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
