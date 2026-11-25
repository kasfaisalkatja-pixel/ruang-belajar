import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'teacher', 'student'] }).notNull(),
  identityNumber: text('identity_number'),
  createdAt: text('created_at').notNull(),
});

export const classes = sqliteTable('classes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  academicYear: text('academic_year').notNull(),
  createdAt: text('created_at').notNull(),
});

export const classMembers = sqliteTable(
  'class_members',
  {
    id: text('id').primaryKey(),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: text('joined_at').notNull(),
  },
  (table) => ({
    classStudentUnique: uniqueIndex('class_student_unique').on(table.classId, table.studentId),
  })
);

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  classId: text('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const materials = sqliteTable('materials', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  fileKey: text('file_key'),
  fileName: text('file_name'),
  videoUrl: text('video_url'),
  createdAt: text('created_at').notNull(),
});

export const materialReads = sqliteTable(
  'material_reads',
  {
    id: text('id').primaryKey(),
    materialId: text('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: text('read_at').notNull(),
  },
  (table) => ({
    materialStudentUnique: uniqueIndex('material_student_unique').on(
      table.materialId,
      table.studentId
    ),
  })
);

export const assignments = sqliteTable('assignments', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  fileKey: text('file_key'),
  fileName: text('file_name'),
  dueDate: text('due_date').notNull(),
  maxScore: integer('max_score').notNull().default(100),
  createdAt: text('created_at').notNull(),
});

export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content'),
    fileKey: text('file_key'),
    fileName: text('file_name'),
    score: integer('score'),
    feedback: text('feedback'),
    submittedAt: text('submitted_at').notNull(),
    gradedAt: text('graded_at'),
  },
  (table) => ({
    assignmentStudentUnique: uniqueIndex('assignment_student_unique').on(
      table.assignmentId,
      table.studentId
    ),
  })
);
