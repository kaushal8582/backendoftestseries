# Test Series Backend API

A production-ready backend API for a Test Series application similar to Testbook, built with Node.js, Express.js, and MongoDB.

## Features

- **Authentication & Authorization**
  - User registration and login
  - JWT-based authentication
  - Role-based access control (USER, ADMIN)
  - Password hashing with bcrypt

- **Exam Management**
  - Create, read, update, delete exams
  - Exam categories (SSC, Banking, Railway, etc.)
  - Multi-language support (Hindi, English)
  - Exam status management (draft/published)

- **Test Series Management**
  - Create multiple tests per exam
  - Test ordering and organization
  - Free/Paid test support (subscription-ready)

- **Question Management**
  - MCQ question support
  - Bulk question creation
  - Question ordering
  - Marks and negative marking support

- **Test Attempt System**
  - Start test attempts
  - Submit answers in real-time
  - Automatic score calculation
  - Accuracy and performance metrics
  - Test ranking system

- **Performance Analytics**
  - User performance tracking
  - Test analytics
  - Exam analytics
  - Leaderboard system

- **Future-Ready Subscription System**
  - Subscription plan models (placeholder)
  - User subscription tracking
  - Subscription middleware structure

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS
- **Logging**: Morgan

## Project Structure

```
src/
 ├── config/          # Configuration files
 │   ├── database.js   # MongoDB connection
 │   └── constants.js  # Application constants
 ├── controllers/      # Request handlers
 ├── models/          # MongoDB models
 ├── routes/          # API routes
 ├── services/        # Business logic
 ├── middlewares/     # Custom middlewares
 │   ├── auth.js      # Authentication & authorization
 │   └── subscription.js # Subscription check (future)
 ├── utils/           # Utility functions
 │   ├── password.js  # Password hashing
 │   ├── jwt.js       # JWT operations
 │   └── errorHandler.js # Error handling
 ├── validations/     # Request validation
 ├── app.js           # Express app configuration
 └── server.js        # Server entry point
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd test-series-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/test-series-db
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Users
- `GET /api/users/profile` - Get user profile (Protected)
- `PUT /api/users/profile` - Update user profile (Protected)
- `GET /api/users/test-attempts` - Get user test attempts (Protected)
- `GET /api/users/performance` - Get user performance summary (Protected)

### Exams
- `POST /api/exams` - Create exam (Admin only)
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get exam by ID
- `PUT /api/exams/:id` - Update exam (Admin only)
- `DELETE /api/exams/:id` - Delete exam (Admin only)
- `GET /api/exams/:id/tests` - Get tests for an exam

### Tests
- `POST /api/tests` - Create test (Admin only)
- `GET /api/tests?examId=:examId` - Get tests for an exam
- `GET /api/tests/:id` - Get test by ID
- `PUT /api/tests/:id` - Update test (Admin only)
- `DELETE /api/tests/:id` - Delete test (Admin only)

### Questions
- `POST /api/questions` - Create question (Admin only)
- `POST /api/questions/bulk` - Bulk create questions (Admin only)
- `GET /api/questions?testId=:testId` - Get questions for a test
- `GET /api/questions/:id` - Get question by ID
- `PUT /api/questions/:id` - Update question (Admin only)
- `DELETE /api/questions/:id` - Delete question (Admin only)

### Test Attempts
- `POST /api/test-attempts/start/:testId` - Start a test (Protected)
- `POST /api/test-attempts/:attemptId/answer` - Submit answer (Protected)
- `POST /api/test-attempts/:attemptId/submit` - Submit test (Protected)
- `GET /api/test-attempts/:attemptId` - Get test attempt (Protected)
- `GET /api/test-attempts/:attemptId/details` - Get detailed results (Protected)

### Analytics
- `GET /api/analytics/test/:testId` - Get test analytics (Admin only)
- `GET /api/analytics/exam/:examId` - Get exam analytics (Admin only)
- `GET /api/analytics/test/:testId/leaderboard` - Get test leaderboard

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Example API Usage

### Register a User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Create an Exam (Admin)
```bash
POST /api/exams
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "SSC CGL 2024",
  "description": "Staff Selection Commission Combined Graduate Level",
  "category": "SSC",
  "language": "English",
  "totalMarks": 200,
  "duration": 120,
  "status": "published"
}
```

### Start a Test
```bash
POST /api/test-attempts/start/:testId
Authorization: Bearer <user-token>
```

### Submit an Answer
```bash
POST /api/test-attempts/:attemptId/answer
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "questionId": "question-id",
  "selectedOption": "A",
  "timeSpent": 30
}
```

### Submit Test
```bash
POST /api/test-attempts/:attemptId/submit
Authorization: Bearer <user-token>
```

## Database Models

- **User**: User accounts with role-based access
- **Exam**: Exam categories and metadata
- **Test**: Individual tests within exams
- **Question**: MCQ questions with options and explanations
- **TestAttempt**: User test attempts with answers and results
- **SubscriptionPlan**: Subscription plans (future-ready)
- **UserSubscription**: User subscription tracking (future-ready)

## Error Handling

The API uses centralized error handling. All errors follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Helmet.js for security headers
- CORS configuration
- Input validation with express-validator
- Role-based access control

## Future Enhancements

- Payment gateway integration
- Email notifications
- File upload for profile pictures
- Advanced analytics and reporting
- Section-wise test support
- Question bank management
- Test scheduling
- Real-time test monitoring

## Development

### Running in Development Mode
```bash
npm run dev
```

### Environment Variables
See `.env.example` for all required environment variables.

## License

ISC

## Support

For issues and questions, please contact the development team.

