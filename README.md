# RecipeHub — Server API Documentation

This directory contains the Express backend for RecipeHub. It connects to MongoDB Atlas using Mongoose and provides authentication via Better Auth and custom JWT HTTPOnly cookies.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root of the server directory with:
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:5000
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=...
```

### 3. Start Development Server
```bash
npm run dev
```

---

## 🛤️ API Endpoints

### 🔑 Authentication
- `POST /api/auth/register` (Handled by Better Auth client / signup)
- `POST /api/auth/login` (Handled by Better Auth client / signin)
- `POST /api/auth/jwt` (Sync Better Auth session to HttpOnly Cookie JWT)
- `POST /api/auth/logout` (Clear cookie and end session)

### 🍳 Recipes
- `GET /api/recipes` - Get all recipes (supports search, category `$in` filtering, and server-side pagination)
- `GET /api/recipes/popular` - Get most liked recipes
- `GET /api/recipes/featured` - Get featured recipes (marked by admin)
- `GET /api/recipes/my-recipes` - Get current logged-in user's recipes
- `GET /api/recipes/:id` - Get specific recipe details (forces Stripe purchase verification for paid recipes)
- `POST /api/recipes` - Create new recipe (enforces a limit of 2 recipes for normal users; unlimited for premium users)
- `PUT /api/recipes/:id` - Update own recipe
- `DELETE /api/recipes/:id` - Delete own recipe

### ❤️ Likes, Favorites & Reports
- `POST /api/recipes/:id/like` - Like a recipe
- `POST /api/recipes/:id/favorite` - Toggle adding a recipe to favorites list
- `GET /api/favorites` - Get current user's favorites
- `DELETE /api/favorites/:id` - Remove favorite record
- `POST /api/recipes/:id/report` - Report a recipe for spam, offensive, or copyright reasons

### 💳 Stripe & Payments
- `POST /api/payments/create-checkout-session` - Initialize Stripe checkout session (membership or premium recipes)
- `POST /api/payments/confirm-payment` - Confirm Stripe payment and update user/recipe status (with mock fallback for testing)
- `GET /api/payments/my-purchased` - Get list of purchased premium recipes

### 👑 Admin Moderation
- `GET /api/admin/overview` - Returns total counts of users, recipes, premium members, and pending reports
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/block` - Suspend/block a user (prevents login and actions)
- `PUT /api/admin/users/:id/unblock` - Reactivate a user
- `GET /api/admin/recipes` - List all recipes for review
- `PUT /api/admin/recipes/:id/feature` - Toggle featured banner status
- `GET /api/admin/reports` - List reported recipes
- `DELETE /api/admin/reports/:id/remove-recipe` - Take down reported recipe
- `PUT /api/admin/reports/:id/dismiss` - Dismiss report
- `GET /api/admin/transactions` - Audit logs for all payments
