import { sql } from '@vercel/postgres'

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: Date
  subscription_status: 'free' | 'pro' | 'enterprise'
}

export interface CompListItem {
  id: string
  user_id: string
  card_name: string
  card_number: string
  recommended_price: string
  tcg_price: number
  ebay_average: number
  saved_at: Date
  card_image_url?: string
  set_name?: string
}

// Initialize database tables
export async function initDb() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        subscription_status VARCHAR(50) DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise'))
      );
    `

    // Create comp_list table
    await sql`
      CREATE TABLE IF NOT EXISTS comp_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_name VARCHAR(255) NOT NULL,
        card_number VARCHAR(50),
        recommended_price VARCHAR(100),
        tcg_price DECIMAL(10,2),
        ebay_average DECIMAL(10,2),
        saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        card_image_url TEXT,
        set_name VARCHAR(255)
      );
    `

    // Create index on user_id for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_comp_list_user_id ON comp_list(user_id);
    `

    console.log('✅ Database tables initialized successfully')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

// User operations
export async function createUser(email: string, passwordHash: string): Promise<User> {
  const result = await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email, password_hash, created_at, subscription_status
  `
  
  return result.rows[0] as User
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql`
    SELECT id, email, password_hash, created_at, subscription_status
    FROM users
    WHERE email = ${email}
  `
  
  return result.rows[0] as User || null
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await sql`
    SELECT id, email, password_hash, created_at, subscription_status
    FROM users
    WHERE id = ${id}
  `
  
  return result.rows[0] as User || null
}

// Comp list operations
export async function saveToCompList(
  userId: string,
  cardName: string,
  cardNumber: string,
  recommendedPrice: string,
  tcgPrice: number,
  ebayAverage: number,
  cardImageUrl?: string,
  setName?: string
): Promise<CompListItem> {
  const result = await sql`
    INSERT INTO comp_list (
      user_id, card_name, card_number, recommended_price, 
      tcg_price, ebay_average, card_image_url, set_name
    )
    VALUES (
      ${userId}, ${cardName}, ${cardNumber}, ${recommendedPrice},
      ${tcgPrice}, ${ebayAverage}, ${cardImageUrl || null}, ${setName || null}
    )
    RETURNING *
  `
  
  return result.rows[0] as CompListItem
}

export async function getCompList(userId: string): Promise<CompListItem[]> {
  const result = await sql`
    SELECT * FROM comp_list
    WHERE user_id = ${userId}
    ORDER BY saved_at DESC
  `
  
  return result.rows as CompListItem[]
}

export async function removeFromCompList(userId: string, itemId: string): Promise<void> {
  await sql`
    DELETE FROM comp_list
    WHERE id = ${itemId} AND user_id = ${userId}
  `
} 