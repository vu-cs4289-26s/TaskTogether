# VandiBites API Endpoints Specification

## Version 1.0

### Authentication & User Management

#### POST /api/auth/signup
Create a new user account
```json
Request:
{
  "email": "student@vanderbilt.edu",
  "username": "vustudent",
  "password": "********",
  "name": "John Doe"
}

Response: 201 Created
{
  "user_id": "uuid",
  "username": "vustudent",
  "email": "student@vanderbilt.edu",
  "token": "jwt_token"
}
```

#### POST /api/auth/login
Authenticate existing user
```json
Request:
{
  "email": "student@vanderbilt.edu",
  "password": "********"
}

Response: 200 OK
{
  "token": "jwt_token",
  "user": {...}
}
```

#### POST /api/auth/sso
SSO authentication (future: Vanderbilt SSO integration)

---

### User Profile

#### GET /api/users/{user_id}
Get user profile information

#### PUT /api/users/{user_id}
Update user profile
```json
Request:
{
  "name": "John Doe",
  "dietary_preferences": ["vegetarian", "gluten-free"],
  "macro_goals": {
    "calories": 2000,
    "protein": 150,
    "carbs": 250,
    "fat": 70
  }
}
```

#### DELETE /api/users/{user_id}
Delete user account

---

### Schedule Management

#### POST /api/users/{user_id}/schedule
Add or import class schedule
```json
Request:
{
  "courses": [
    {
      "name": "CS 4289",
      "days": ["Monday", "Wednesday"],
      "start_time": "10:10",
      "end_time": "11:25",
      "location": "FGH 134"
    }
  ]
}
```

#### GET /api/users/{user_id}/schedule
Get user's class schedule

#### PUT /api/users/{user_id}/schedule/{schedule_id}
Update specific class

#### DELETE /api/users/{user_id}/schedule/{schedule_id}
Remove class from schedule

---

### Dining Halls & Menus

#### GET /api/dining-halls
List all dining halls
```json
Response: 200 OK
{
  "dining_halls": [
    {
      "id": "kissam",
      "name": "Kissam Kitchen",
      "hours": {
        "breakfast": "07:00-10:30",
        "lunch": "11:00-14:30",
        "dinner": "17:00-20:00"
      },
      "location": {
        "lat": 36.1447,
        "lon": -86.8027
      },
      "current_status": "open",
      "estimated_wait": "5-10 min"
    }
  ]
}
```

#### GET /api/dining-halls/{hall_id}
Get specific dining hall details

#### GET /api/dining-halls/{hall_id}/menu
Get current menu for a dining hall
```json
Query params: ?meal=lunch&date=2026-01-17

Response: 200 OK
{
  "hall_id": "kissam",
  "meal_period": "lunch",
  "date": "2026-01-17",
  "stations": [
    {
      "name": "Grill",
      "items": [...]
    }
  ]
}
```

#### GET /api/dining-halls/{hall_id}/recommendations
Get personalized recommendations for dining hall
```json
Query params: ?user_id=uuid&time=12:30

Response: 200 OK
{
  "recommended_items": [...],
  "fits_schedule": true,
  "walking_time": "5 min",
  "crowdedness": "moderate"
}
```

---

### Menu Items / Dishes

#### GET /api/items/{item_id}
Get detailed information about a specific dish
```json
Response: 200 OK
{
  "id": "item_123",
  "name": "Grilled Chicken Breast",
  "station": "Grill",
  "dining_hall": "kissam",
  "nutrition": {
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fat": 3.6,
    "fiber": 0,
    "sodium": 74
  },
  "allergens": ["none"],
  "ingredients": ["chicken", "olive oil", "seasoning"],
  "average_rating": 4.2,
  "photo_count": 15
}
```

#### GET /api/items/search
Search for menu items across all dining halls
```json
Query params: ?q=chicken&dietary=vegetarian&date=2026-01-17
```

---

### Ratings & Reviews

#### POST /api/items/{item_id}/ratings
Create a rating/review
```json
Request:
{
  "user_id": "uuid",
  "rating": 4,
  "comment": "Pretty good! Chicken was tender.",
  "date_tried": "2026-01-17"
}

Response: 201 Created
{
  "rating_id": "uuid",
  "item_id": "item_123",
  "rating": 4,
  "comment": "...",
  "created_at": "2026-01-17T12:30:00Z"
}
```

#### GET /api/items/{item_id}/ratings
Get all ratings for an item
```json
Query params: ?sort=recent&limit=20
```

#### PUT /api/ratings/{rating_id}
Update own rating

#### DELETE /api/ratings/{rating_id}
Delete own rating

---

### Food Photos

#### POST /api/items/{item_id}/photos
Upload a photo of a dish
```json
Request: multipart/form-data
{
  "photo": <file>,
  "user_id": "uuid",
  "caption": "Today's lunch!"
}

Response: 201 Created
{
  "photo_id": "uuid",
  "url": "https://cdn.vandibites.com/photos/...",
  "upvotes": 0
}
```

#### GET /api/items/{item_id}/photos
Get photos for a dish

#### POST /api/photos/{photo_id}/upvote
Upvote a photo

#### DELETE /api/photos/{photo_id}
Delete own photo (or admin)

---

### Social Features

#### POST /api/users/{user_id}/friends
Send friend request
```json
Request:
{
  "friend_user_id": "uuid"
}
```

#### GET /api/users/{user_id}/friends
Get list of friends

#### PUT /api/users/{user_id}/friends/{friend_id}
Accept/reject friend request

#### DELETE /api/users/{user_id}/friends/{friend_id}
Remove friend

#### GET /api/users/{user_id}/friends/schedules
View friends' schedules (with permission)

---

### Meal Planning (MVP - Simple Version)

#### POST /api/users/{user_id}/meal-plan
Plan a meal
```json
Request:
{
  "date": "2026-01-17",
  "meal_period": "lunch",
  "dining_hall": "kissam",
  "items": ["item_123", "item_456"],
  "friends": ["friend_uuid"]
}
```

#### GET /api/users/{user_id}/meal-plan
Get planned meals
```json
Query params: ?date=2026-01-17
```

---

### Admin Endpoints (Future)

#### DELETE /api/admin/users/{user_id}
Remove user account

#### DELETE /api/admin/ratings/{rating_id}
Remove inappropriate rating

#### DELETE /api/admin/photos/{photo_id}
Remove inappropriate photo

---

## API Conventions

### Base URL
- Development: `http://localhost:8000/api`
- Production: `https://api.vandibites.com/api`

### Authentication
- JWT Bearer tokens in Authorization header
- `Authorization: Bearer <token>`

### Response Codes
- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing/invalid auth
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource doesn't exist
- 500 Internal Server Error - Server error

### Pagination
For list endpoints:
```
Query params: ?page=1&limit=20
Response includes: total_count, page, pages, results
```

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {...}
  }
}
```
