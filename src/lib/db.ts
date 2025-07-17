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
  list_id: string
  card_name: string
  card_number: string
  recommended_price: string
  tcg_price: number | null
  ebay_average: number | null
  saved_at: Date
  updated_at: Date
  card_image_url?: string
  set_name?: string
  // Price tracking fields for confidence meter
  saved_tcg_price: number | null
  saved_ebay_average: number | null
  price_change_percentage: number | null
  price_volatility: number | null
  market_trend: 'increasing' | 'decreasing' | 'stable' | null
  confidence_score: number | null
}

export interface UserList {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: Date
  updated_at: Date
  is_default: boolean
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

    // Create lists table
    await sql`
      CREATE TABLE IF NOT EXISTS lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_default BOOLEAN DEFAULT false,
        UNIQUE(user_id, name)
      );
    `

    // Create comp_list table
    await sql`
      CREATE TABLE IF NOT EXISTS comp_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
        card_name VARCHAR(255) NOT NULL,
        card_number VARCHAR(50),
        recommended_price VARCHAR(100),
        tcg_price DECIMAL(10,2),
        ebay_average DECIMAL(10,2),
        saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        card_image_url TEXT,
        set_name VARCHAR(255),
        saved_tcg_price DECIMAL(10,2),
        saved_ebay_average DECIMAL(10,2),
        price_change_percentage DECIMAL(5,2),
        price_volatility DECIMAL(5,2),
        market_trend VARCHAR(20),
        confidence_score DECIMAL(3,1)
      );
    `

    // Add confidence meter fields to existing comp_list table if they don't exist
    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS saved_tcg_price DECIMAL(10,2);
      `
      console.log('✅ saved_tcg_price column migration completed')
    } catch (migrationError) {
      console.log('⚠️  saved_tcg_price column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS saved_ebay_average DECIMAL(10,2);
      `
      console.log('✅ saved_ebay_average column migration completed')
    } catch (migrationError) {
      console.log('⚠️  saved_ebay_average column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS price_change_percentage DECIMAL(5,2);
      `
      console.log('✅ price_change_percentage column migration completed')
    } catch (migrationError) {
      console.log('⚠️  price_change_percentage column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS price_volatility DECIMAL(5,2);
      `
      console.log('✅ price_volatility column migration completed')
    } catch (migrationError) {
      console.log('⚠️  price_volatility column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS market_trend VARCHAR(20);
      `
      console.log('✅ market_trend column migration completed')
    } catch (migrationError) {
      console.log('⚠️  market_trend column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,1);
      `
      console.log('✅ confidence_score column migration completed')
    } catch (migrationError) {
      console.log('⚠️  confidence_score column migration failed (might already exist):', migrationError.message)
    }

    // Add updated_at column if it doesn't exist (migration)
    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      `
      console.log('✅ updated_at column migration completed')
    } catch (migrationError) {
      console.log('⚠️  updated_at column migration failed (might already exist):', migrationError.message)
    }

    // Add list_id column if it doesn't exist (migration)
    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lists(id) ON DELETE CASCADE;
      `
      console.log('✅ list_id column migration completed')
    } catch (migrationError) {
      console.log('⚠️  list_id column migration failed (might already exist):', migrationError.message)
    }

    // Create default lists for existing users and migrate existing cards
    try {
      // Get all users who don't have a default list
      const usersWithoutDefaultList = await sql`
        SELECT DISTINCT u.id, u.email
        FROM users u
        LEFT JOIN lists l ON u.id = l.user_id AND l.is_default = true
        WHERE l.id IS NULL
      `
      
      for (const user of usersWithoutDefaultList.rows) {
        // Create default list for each user
        const defaultList = await sql`
          INSERT INTO lists (user_id, name, is_default)
          VALUES (${user.id}, 'My Comp List', true)
          RETURNING id
        `
        
        // Move existing cards to default list
        await sql`
          UPDATE comp_list 
          SET list_id = ${defaultList.rows[0].id}
          WHERE user_id = ${user.id} AND list_id IS NULL
        `
        
        console.log(`✅ Created default list and migrated cards for user: ${user.email}`)
      }
    } catch (migrationError) {
      console.log('⚠️  Default list creation migration failed:', migrationError.message)
    }

    // Handle existing duplicates before adding unique constraint
    try {
      // Remove duplicates keeping the most recent entry
      await sql`
        DELETE FROM comp_list 
        WHERE id NOT IN (
          SELECT DISTINCT ON (user_id, list_id, card_name, card_number) id
          FROM comp_list
          ORDER BY user_id, list_id, card_name, card_number, saved_at DESC
        );
      `
      console.log('✅ Duplicate removal completed')
    } catch (duplicateError) {
      console.log('⚠️  Duplicate removal failed (might not be needed):', duplicateError.message)
    }

    // Add unique constraint if it doesn't exist
    try {
      await sql`
        ALTER TABLE comp_list 
        ADD CONSTRAINT comp_list_unique_user_list_card UNIQUE(user_id, list_id, card_name, card_number);
      `
      console.log('✅ Unique constraint added successfully')
    } catch (constraintError) {
      console.log('⚠️  Unique constraint already exists or failed:', constraintError.message)
    }

    // Create indexes for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_comp_list_user_id ON comp_list(user_id);
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_comp_list_list_id ON comp_list(list_id);
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
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

// List management operations
export async function createUserList(
  userId: string,
  name: string,
  description?: string,
  isDefault: boolean = false
): Promise<UserList> {
  // If this is the first list or isDefault is true, unset other default lists
  if (isDefault) {
    await sql`
      UPDATE lists 
      SET is_default = false 
      WHERE user_id = ${userId}
    `
  }

  const result = await sql`
    INSERT INTO lists (user_id, name, description, is_default)
    VALUES (${userId}, ${name}, ${description || null}, ${isDefault})
    RETURNING *
  `
  
  return result.rows[0] as UserList
}

export async function getUserLists(userId: string): Promise<UserList[]> {
  const result = await sql`
    SELECT * FROM lists 
    WHERE user_id = ${userId}
    ORDER BY is_default DESC, created_at ASC
  `
  
  return result.rows as UserList[]
}

export async function getUserList(listId: string, userId: string): Promise<UserList | null> {
  const result = await sql`
    SELECT * FROM lists 
    WHERE id = ${listId} AND user_id = ${userId}
  `
  
  return result.rows[0] as UserList || null
}

export async function updateUserList(
  listId: string,
  userId: string,
  updates: { name?: string; description?: string; is_default?: boolean }
): Promise<UserList> {
  // If setting as default, unset other default lists
  if (updates.is_default) {
    await sql`
      UPDATE lists 
      SET is_default = false 
      WHERE user_id = ${userId} AND id != ${listId}
    `
  }

  const { name, description, is_default } = updates

  const result = await sql`
    UPDATE lists 
    SET 
      name = COALESCE(${name}, name),
      description = COALESCE(${description}, description),
      is_default = COALESCE(${is_default}, is_default),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${listId} AND user_id = ${userId}
    RETURNING *
  `
  
  return result.rows[0] as UserList
}

export async function deleteUserList(listId: string, userId: string): Promise<void> {
  // First, move all cards from this list to the default list
  const defaultList = await sql`
    SELECT id FROM lists 
    WHERE user_id = ${userId} AND is_default = true
    LIMIT 1
  `
  
  if (defaultList.rows.length > 0) {
    await sql`
      UPDATE comp_list 
      SET list_id = ${defaultList.rows[0].id}
      WHERE list_id = ${listId} AND user_id = ${userId}
    `
  }

  // Then delete the list
  await sql`
    DELETE FROM lists 
    WHERE id = ${listId} AND user_id = ${userId}
  `
}

export async function getDefaultUserList(userId: string): Promise<UserList | null> {
  const result = await sql`
    SELECT * FROM lists 
    WHERE user_id = ${userId} AND is_default = true
    LIMIT 1
  `
  
  return result.rows[0] as UserList || null
}

// Comp list operations
export async function saveToCompList(
  userId: string,
  cardName: string,
  cardNumber: string,
  recommendedPrice: string,
  tcgPrice: number | null,
  ebayAverage: number | null,
  cardImageUrl?: string,
  setName?: string,
  listId?: string,
  confidenceData?: {
    savedTcgPrice?: number | null
    savedEbayAverage?: number | null
    priceChangePercentage?: number | null
    priceVolatility?: number | null
    marketTrend?: 'increasing' | 'decreasing' | 'stable' | null
    confidenceScore?: number | null
  }
): Promise<CompListItem> {
  // If no listId provided, get the default list
  let targetListId = listId
  if (!targetListId) {
    const defaultList = await getDefaultUserList(userId)
    if (!defaultList) {
      throw new Error('No default list found for user')
    }
    targetListId = defaultList.id
  }

  const result = await sql`
    INSERT INTO comp_list (
      user_id, list_id, card_name, card_number, recommended_price, tcg_price, ebay_average, 
      card_image_url, set_name, saved_tcg_price, saved_ebay_average, 
      price_change_percentage, price_volatility, market_trend, confidence_score
    )
    VALUES (
      ${userId}, ${targetListId}, ${cardName}, ${cardNumber}, ${recommendedPrice}, ${tcgPrice}, ${ebayAverage}, 
      ${cardImageUrl || null}, ${setName || null}, ${confidenceData?.savedTcgPrice || null}, 
      ${confidenceData?.savedEbayAverage || null}, ${confidenceData?.priceChangePercentage || null}, 
      ${confidenceData?.priceVolatility || null}, ${confidenceData?.marketTrend || null}, 
      ${confidenceData?.confidenceScore || null}
    )
    ON CONFLICT (user_id, list_id, card_name, card_number) 
    DO UPDATE SET 
      recommended_price = EXCLUDED.recommended_price,
      tcg_price = EXCLUDED.tcg_price,
      ebay_average = EXCLUDED.ebay_average,
      card_image_url = EXCLUDED.card_image_url,
      set_name = EXCLUDED.set_name,
      saved_tcg_price = EXCLUDED.saved_tcg_price,
      saved_ebay_average = EXCLUDED.saved_ebay_average,
      price_change_percentage = EXCLUDED.price_change_percentage,
      price_volatility = EXCLUDED.price_volatility,
      market_trend = EXCLUDED.market_trend,
      confidence_score = EXCLUDED.confidence_score,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `
  
  return result.rows[0] as CompListItem
}

export async function getCompList(userId: string, listId?: string): Promise<CompListItem[]> {
  if (listId) {
    // Get cards from specific list
    const result = await sql`
      SELECT * FROM comp_list
      WHERE user_id = ${userId} AND list_id = ${listId}
      ORDER BY saved_at DESC
    `
    return result.rows as CompListItem[]
  } else {
    // Get all cards from all lists (backward compatibility)
    const result = await sql`
      SELECT * FROM comp_list
      WHERE user_id = ${userId}
      ORDER BY saved_at DESC
    `
    return result.rows as CompListItem[]
  }
}

export async function getCompListByList(userId: string, listId: string): Promise<CompListItem[]> {
  const result = await sql`
    SELECT * FROM comp_list
    WHERE user_id = ${userId} AND list_id = ${listId}
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