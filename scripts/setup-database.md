# Database Setup Instructions

## Quick Setup (5 minutes)

### 1. Create Free Neon Database
1. Go to https://neon.tech
2. Sign up for free account
3. Create a new project called "pokemon-card-comp"
4. Copy the connection string (it looks like: `postgresql://user:pass@host/dbname`)

### 2. Add to Environment Variables
Add this to your `.env.local` file:
```
POSTGRES_URL="your-neon-connection-string-here"
```

### 3. Initialize Database
Run this command:
```bash
curl -X POST "http://localhost:3000/api/init-db" -H "Content-Type: application/json"
```

### 4. Test Authentication
- Go to `http://localhost:3000/auth/signup`
- Create a test account
- Sign in and verify everything works

## Database Schema Created
The system automatically creates:
- `users` table (id, email, password_hash, subscription_status, created_at)
- `comp_list` table (user_id, card_name, card_number, prices, saved_at)
- Proper indexes for performance

## Features Ready
- ✅ User registration/login
- ✅ Session management
- ✅ Route protection
- ✅ Save to comp list functionality
- ✅ User dashboard
- ✅ Beautiful UI matching your app theme 