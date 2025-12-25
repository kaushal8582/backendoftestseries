/**
 * Application Constants
 */

// User Roles
const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
};

// Exam Categories
const EXAM_CATEGORIES = {
  SSC: 'SSC',
  BANKING: 'Banking',
  RAILWAY: 'Railway',
  UPSC: 'UPSC',
  CAT: 'CAT',
  GATE: 'GATE',
  OTHER: 'Other',
};

// Exam Languages
const EXAM_LANGUAGES = {
  HINDI: 'Hindi',
  ENGLISH: 'English',
  BOTH: 'Both',
};

// Exam Status
const EXAM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

// Question Types
const QUESTION_TYPES = {
  MCQ: 'MCQ',
  // Future: TRUE_FALSE, FILL_BLANK, etc.
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Subscription Status (Future ready)
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

module.exports = {
  USER_ROLES,
  EXAM_CATEGORIES,
  EXAM_LANGUAGES,
  EXAM_STATUS,
  QUESTION_TYPES,
  HTTP_STATUS,
  SUBSCRIPTION_STATUS,
};

