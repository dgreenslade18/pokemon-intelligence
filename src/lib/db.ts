import { sql } from '@vercel/postgres'

export { sql }

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: Date
  subscription_status: 'testing' | 'pro' | 'enterprise'
}

export interface UserPreferences {
  user_id: string
  show_buy_value: boolean
  show_trade_value: boolean
  show_cash_value: boolean
  trade_percentage: number
  cash_percentage: number
  whatnot_fees: number
  updated_at: Date
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
  updated_at: Date
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
        subscription_status VARCHAR(50) DEFAULT 'testing' CHECK (subscription_status IN ('testing', 'pro', 'enterprise'))
      );
    `

    // Create user_preferences table
    await sql`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        show_buy_value BOOLEAN DEFAULT true,
        show_trade_value BOOLEAN DEFAULT false,
        show_cash_value BOOLEAN DEFAULT false,
        trade_percentage DECIMAL(5,2) DEFAULT 80.00,
        cash_percentage DECIMAL(5,2) DEFAULT 70.00,
        whatnot_fees DECIMAL(5,2) DEFAULT 12.50,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        card_image_url TEXT,
        set_name VARCHAR(255),
        UNIQUE(user_id, card_name, card_number)
      );
    `

    // Create index on user_id for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_comp_list_user_id ON comp_list(user_id);
    `

    // Add whatnot_fees column if it doesn't exist (migration)
    try {
      await sql`
        ALTER TABLE user_preferences 
        ADD COLUMN IF NOT EXISTS whatnot_fees DECIMAL(5,2) DEFAULT 12.50;
      `
      console.log('✅ whatnot_fees column migration completed')
    } catch (migrationError) {
      console.log('⚠️  whatnot_fees column migration failed (might already exist):', migrationError.message)
    }

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
  
  // Create default preferences for new user
  await createDefaultUserPreferences(result.rows[0].id)
  
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

// User preferences operations
export async function createDefaultUserPreferences(userId: string): Promise<UserPreferences> {
  const result = await sql`
    INSERT INTO user_preferences (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
    RETURNING *
  `
  
  if (result.rows.length === 0) {
    // If conflict (already exists), fetch existing preferences
    return getUserPreferences(userId)
  }
  
  const row = result.rows[0]
  return {
    ...row,
    trade_percentage: Number(row.trade_percentage),
    cash_percentage: Number(row.cash_percentage),
    whatnot_fees: Number(row.whatnot_fees || 12.5) // Default to 12.5 if column doesn't exist yet
  } as UserPreferences
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const result = await sql`
    SELECT * FROM user_preferences
    WHERE user_id = ${userId}
  `
  
  if (result.rows.length === 0) {
    // Create default preferences if they don't exist
    return await createDefaultUserPreferences(userId)
  }
  
  const row = result.rows[0]
  return {
    ...row,
    trade_percentage: Number(row.trade_percentage),
    cash_percentage: Number(row.cash_percentage),
    whatnot_fees: Number(row.whatnot_fees || 12.5) // Default to 12.5 if column doesn't exist yet
  } as UserPreferences
}

export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'user_id' | 'updated_at'>>
): Promise<UserPreferences> {
  const {
    show_buy_value,
    show_trade_value,
    show_cash_value,
    trade_percentage,
    cash_percentage,
    whatnot_fees
  } = preferences

  try {
    const result = await sql`
      UPDATE user_preferences
      SET 
        show_buy_value = COALESCE(${show_buy_value}, show_buy_value),
        show_trade_value = COALESCE(${show_trade_value}, show_trade_value),
        show_cash_value = COALESCE(${show_cash_value}, show_cash_value),
        trade_percentage = COALESCE(${trade_percentage}, trade_percentage),
        cash_percentage = COALESCE(${cash_percentage}, cash_percentage),
        whatnot_fees = COALESCE(${whatnot_fees}, whatnot_fees),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
      RETURNING *
    `
    
    const row = result.rows[0]
    return {
      ...row,
      trade_percentage: Number(row.trade_percentage),
      cash_percentage: Number(row.cash_percentage),
      whatnot_fees: Number(row.whatnot_fees || 12.5)
    } as UserPreferences
  } catch (error) {
    // If whatnot_fees column doesn't exist, add it and retry
    if (error.message?.includes('whatnot_fees')) {
      console.log('Adding whatnot_fees column and retrying update...')
      await sql`
        ALTER TABLE user_preferences 
        ADD COLUMN whatnot_fees DECIMAL(5,2) DEFAULT 12.50
      `
      
      // Retry the update
      const result = await sql`
        UPDATE user_preferences
        SET 
          show_buy_value = COALESCE(${show_buy_value}, show_buy_value),
          show_trade_value = COALESCE(${show_trade_value}, show_trade_value),
          show_cash_value = COALESCE(${show_cash_value}, show_cash_value),
          trade_percentage = COALESCE(${trade_percentage}, trade_percentage),
          cash_percentage = COALESCE(${cash_percentage}, cash_percentage),
          whatnot_fees = COALESCE(${whatnot_fees}, whatnot_fees),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
        RETURNING *
      `
      
      const row = result.rows[0]
      return {
        ...row,
        trade_percentage: Number(row.trade_percentage),
        cash_percentage: Number(row.cash_percentage),
        whatnot_fees: Number(row.whatnot_fees || 12.5)
      } as UserPreferences
    }
    throw error
  }
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
    ON CONFLICT (user_id, card_name, card_number) DO UPDATE SET
      recommended_price = EXCLUDED.recommended_price,
      tcg_price = EXCLUDED.tcg_price,
      ebay_average = EXCLUDED.ebay_average,
      card_image_url = EXCLUDED.card_image_url,
      set_name = EXCLUDED.set_name,
      updated_at = CURRENT_TIMESTAMP
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