-- CreateTable
CREATE TABLE "app_users" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "role" VARCHAR(50) NOT NULL DEFAULT 'student',
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "subscription_plan" VARCHAR(50) NOT NULL DEFAULT 'free',
    "avatar" TEXT,
    "bio" TEXT,
    "specialization" VARCHAR(255),
    "joined_at" VARCHAR(50),
    "custom_role_id" VARCHAR(100),
    "qualification_doc" TEXT,
    "phone" VARCHAR(30),
    "qualifications" JSONB,
    "badges" JSONB,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_courses" (
    "id" VARCHAR(100) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "headline" TEXT,
    "description" TEXT,
    "category" VARCHAR(100),
    "level" VARCHAR(50),
    "duration" VARCHAR(50),
    "instructor_id" VARCHAR(100),
    "instructor_name" VARCHAR(255),
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "lessons" JSONB NOT NULL DEFAULT '[]',
    "quizzes" JSONB NOT NULL DEFAULT '[]',
    "assignments" JSONB NOT NULL DEFAULT '[]',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "approval_status" VARCHAR(50) NOT NULL DEFAULT 'approved',
    "rejection_reason" TEXT,
    "enrollment_count" INTEGER NOT NULL DEFAULT 0,
    "rating_average" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" VARCHAR(50),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_enrollments" (
    "id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "course_id" VARCHAR(100) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed_lessons" JSONB NOT NULL DEFAULT '[]',
    "quiz_attempts" JSONB NOT NULL DEFAULT '{}',
    "enrolled_at" VARCHAR(50),
    "completed_at" VARCHAR(50),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_messages" (
    "id" VARCHAR(100) NOT NULL,
    "from_user_id" VARCHAR(100),
    "to_user_id" VARCHAR(100),
    "from_name" VARCHAR(255),
    "to_name" VARCHAR(255),
    "from_role" VARCHAR(50),
    "subject" VARCHAR(512),
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" VARCHAR(50),

    CONSTRAINT "app_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_certificates" (
    "id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "course_id" VARCHAR(100) NOT NULL,
    "cert_id" VARCHAR(100) NOT NULL,
    "issued_at" VARCHAR(50),

    CONSTRAINT "app_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_logs" (
    "id" VARCHAR(100) NOT NULL,
    "text" TEXT NOT NULL,
    "type" VARCHAR(100),
    "user_id" VARCHAR(100),
    "time" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_invites" (
    "id" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" VARCHAR(50),

    CONSTRAINT "app_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_custom_roles" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" VARCHAR(50),

    CONSTRAINT "app_custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_media_items" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(512) NOT NULL,
    "data_url" TEXT,
    "type" VARCHAR(100),
    "used_as" VARCHAR(100),
    "uploaded_at" VARCHAR(50),

    CONSTRAINT "app_media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_bank_accounts" (
    "id" VARCHAR(100) NOT NULL,
    "instructor_id" VARCHAR(100) NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "account_number" VARCHAR(100) NOT NULL,
    "routing_code" VARCHAR(100),
    "country" VARCHAR(100),

    CONSTRAINT "app_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_withdrawal_requests" (
    "id" VARCHAR(100) NOT NULL,
    "instructor_id" VARCHAR(100) NOT NULL,
    "instructor_name" VARCHAR(255),
    "amount" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" VARCHAR(50),

    CONSTRAINT "app_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_assignment_submissions" (
    "id" VARCHAR(100) NOT NULL,
    "assignment_id" VARCHAR(100),
    "course_id" VARCHAR(100),
    "assignment_title" VARCHAR(512),
    "course_name" VARCHAR(512),
    "student_id" VARCHAR(100),
    "student_name" VARCHAR(255),
    "text" TEXT NOT NULL,
    "file_url" TEXT,
    "grade" VARCHAR(50),
    "feedback" TEXT,
    "submitted_at" VARCHAR(50),
    "graded_at" VARCHAR(50),
    "graded_by" VARCHAR(100),

    CONSTRAINT "app_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_webinar_posts" (
    "id" VARCHAR(100) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(50),
    "author_id" VARCHAR(100),
    "author_name" VARCHAR(255),
    "author_role" VARCHAR(50),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "created_at" VARCHAR(50),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "app_webinar_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_quiz_attempts" (
    "id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "course_id" VARCHAR(100),
    "quiz_id" VARCHAR(100),
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "attempted_at" VARCHAR(50),

    CONSTRAINT "app_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_learning_paths" (
    "id" VARCHAR(100) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "courses" JSONB NOT NULL DEFAULT '[]',
    "instructor_id" VARCHAR(100),
    "instructor_name" VARCHAR(255),
    "badge" VARCHAR(255),
    "enrolled_students" JSONB NOT NULL DEFAULT '[]',
    "created_at" VARCHAR(50),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_events" (
    "id" VARCHAR(100) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "date" VARCHAR(50),
    "time" VARCHAR(20),
    "host" VARCHAR(255),
    "type" VARCHAR(100),
    "desc" TEXT,
    "category" VARCHAR(100),
    "attendees" JSONB NOT NULL DEFAULT '[]',
    "created_at" VARCHAR(50),

    CONSTRAINT "app_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_cms_content" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'main',
    "pages" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_cms_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_theme_settings" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'main',
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_theme_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_cert_templates" (
    "id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "style" VARCHAR(50),
    "primary_color" VARCHAR(20),
    "accent_color" VARCHAR(20),
    "header_text" VARCHAR(512),
    "footer_text" VARCHAR(512),
    "signature_label" VARCHAR(255),
    "logo_enabled" BOOLEAN NOT NULL DEFAULT true,
    "badge_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" VARCHAR(50),

    CONSTRAINT "app_cert_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_subscriptions" (
    "id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "plan" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "start_date" VARCHAR(50),
    "end_date" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_exams" (
    "id" VARCHAR(100) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "description" TEXT,
    "course_id" VARCHAR(100),
    "questions" JSONB NOT NULL DEFAULT '[]',
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "scheduled_at" VARCHAR(50),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_by" VARCHAR(100),
    "created_by_name" VARCHAR(255),
    "created_at" VARCHAR(50),

    CONSTRAINT "app_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_exam_attempts" (
    "id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "exam_id" VARCHAR(100) NOT NULL,
    "exam_title" VARCHAR(512),
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL DEFAULT '[]',
    "time_taken" INTEGER NOT NULL DEFAULT 0,
    "attempted_at" VARCHAR(50),

    CONSTRAINT "app_exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_payments" (
    "id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "user_name" VARCHAR(255),
    "plan" VARCHAR(50) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'BDT',
    "method" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "provider_ref" VARCHAR(255),
    "reference" VARCHAR(255),
    "sender_name" VARCHAR(255),
    "raw" JSONB,
    "created_at" VARCHAR(50),
    "completed_at" VARCHAR(50),

    CONSTRAINT "app_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_cert_download_history" (
    "id" VARCHAR(100) NOT NULL,
    "cert_id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "user_name" VARCHAR(255),
    "course_title" VARCHAR(512),
    "downloaded_at" VARCHAR(50),

    CONSTRAINT "app_cert_download_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_state_snapshots" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'main',
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_state_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE INDEX "app_enrollments_user_id_idx" ON "app_enrollments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_enrollments_user_id_course_id_key" ON "app_enrollments"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "app_messages_to_user_id_idx" ON "app_messages"("to_user_id");

-- CreateIndex
CREATE INDEX "app_certificates_user_id_idx" ON "app_certificates"("user_id");

-- CreateIndex
CREATE INDEX "app_logs_created_at_idx" ON "app_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "app_invites_token_key" ON "app_invites"("token");

-- CreateIndex
CREATE INDEX "app_bank_accounts_instructor_id_idx" ON "app_bank_accounts"("instructor_id");

-- CreateIndex
CREATE INDEX "app_withdrawal_requests_instructor_id_idx" ON "app_withdrawal_requests"("instructor_id");

-- CreateIndex
CREATE INDEX "app_assignment_submissions_course_id_idx" ON "app_assignment_submissions"("course_id");

-- CreateIndex
CREATE INDEX "app_assignment_submissions_student_id_idx" ON "app_assignment_submissions"("student_id");

-- CreateIndex
CREATE INDEX "app_quiz_attempts_user_id_idx" ON "app_quiz_attempts"("user_id");

-- CreateIndex
CREATE INDEX "app_subscriptions_user_id_idx" ON "app_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "app_exams_course_id_idx" ON "app_exams"("course_id");

-- CreateIndex
CREATE INDEX "app_exam_attempts_user_id_idx" ON "app_exam_attempts"("user_id");

-- CreateIndex
CREATE INDEX "app_payments_user_id_idx" ON "app_payments"("user_id");

-- CreateIndex
CREATE INDEX "app_cert_download_history_user_id_idx" ON "app_cert_download_history"("user_id");

