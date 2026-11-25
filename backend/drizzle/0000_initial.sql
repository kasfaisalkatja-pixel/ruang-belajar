CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `username` text NOT NULL UNIQUE,
  `password_hash` text NOT NULL,
  `role` text NOT NULL,
  `identity_number` text,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `classes` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `academic_year` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `class_members` (
  `id` text PRIMARY KEY NOT NULL,
  `class_id` text NOT NULL REFERENCES `classes`(`id`) ON DELETE CASCADE,
  `student_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `joined_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `class_student_unique` ON `class_members` (`class_id`, `student_id`);

CREATE TABLE IF NOT EXISTS `subjects` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `class_id` text NOT NULL REFERENCES `classes`(`id`) ON DELETE CASCADE,
  `teacher_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `materials` (
  `id` text PRIMARY KEY NOT NULL,
  `subject_id` text NOT NULL REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `file_key` text,
  `file_name` text,
  `video_url` text,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `material_reads` (
  `id` text PRIMARY KEY NOT NULL,
  `material_id` text NOT NULL REFERENCES `materials`(`id`) ON DELETE CASCADE,
  `student_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `read_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `material_student_unique` ON `material_reads` (`material_id`, `student_id`);

CREATE TABLE IF NOT EXISTS `assignments` (
  `id` text PRIMARY KEY NOT NULL,
  `subject_id` text NOT NULL REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `file_key` text,
  `file_name` text,
  `due_date` text NOT NULL,
  `max_score` integer DEFAULT 100 NOT NULL,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `submissions` (
  `id` text PRIMARY KEY NOT NULL,
  `assignment_id` text NOT NULL REFERENCES `assignments`(`id`) ON DELETE CASCADE,
  `student_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `content` text,
  `file_key` text,
  `file_name` text,
  `score` integer,
  `feedback` text,
  `submitted_at` text NOT NULL,
  `graded_at` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `assignment_student_unique` ON `submissions` (`assignment_id`, `student_id`);
