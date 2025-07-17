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

    // Create comp_list table with list_id
    await sql`
      CREATE TABLE IF NOT EXISTS comp_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        card_name VARCHAR(255) NOT NULL,
        card_number VARCHAR(50),
        recommended_price VARCHAR(100),
        tcg_price DECIMAL(10,2),
        ebay_average DECIMAL(10,2),
        saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        card_image_url TEXT,
        set_name VARCHAR(255)
      );
    `

    // Add list_id column to existing comp_list table if it doesn't exist
    try {
      await sql`
        ALTER TABLE comp_list 
        ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lists(id) ON DELETE CASCADE;
      `
      console.log('✅ list_id column migration completed')
    } catch (migrationError) {
      console.log('⚠️  list_id column migration failed (might already exist):', migrationError.message)
    }

    // Create default list for existing users and migrate existing data
    try {
      // Create default lists for all users who don't have one
      await sql`
        INSERT INTO lists (user_id, name, description, is_default)
        SELECT DISTINCT user_id, 'My Comp List', 'Default comparison list', true
        FROM comp_list
        WHERE user_id NOT IN (
          SELECT DISTINCT user_id FROM lists
        );
      `
      console.log('✅ Default lists created for existing users')

      // Also create default list for users who have no cards yet
      await sql`
        INSERT INTO lists (user_id, name, description, is_default)
        SELECT id, 'My Comp List', 'Default comparison list', true
        FROM users
        WHERE id NOT IN (
          SELECT DISTINCT user_id FROM lists
        );
      `
      console.log('✅ Default lists created for new users')

      // Update existing comp_list items to use the default list
      await sql`
        UPDATE comp_list 
        SET list_id = (
          SELECT id FROM lists 
          WHERE lists.user_id = comp_list.user_id 
          AND lists.is_default = true
        )
        WHERE list_id IS NULL;
      `
      console.log('✅ Existing comp_list items migrated to default lists')
    } catch (migrationError) {
      console.log('⚠️  List migration failed:', migrationError.message)
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

// Comp list operations (updated to work with lists)
export async function saveToCompList(
  userId: string,
  cardName: string,
  cardNumber: string,
  recommendedPrice: string,
  tcgPrice: number | null,
  ebayAverage: number | null,
  cardImageUrl?: string,
  setName?: string,
  listId?: string
): Promise<CompListItem> {
  // Always use the default list if no listId provided (maintains backward compatibility)
  if (!listId) {
    const defaultList = await getDefaultUserList(userId)
    if (!defaultList) {
      // Create default list if it doesn't exist
      const newDefaultList = await createUserList(userId, 'My Comp List', 'Default comparison list', true)
      listId = newDefaultList.id
    } else {
      listId = defaultList.id
    }
  }

  const result = await sql`
    INSERT INTO comp_list (user_id, list_id, card_name, card_number, recommended_price, tcg_price, ebay_average, card_image_url, set_name)
    VALUES (${userId}, ${listId}, ${cardName}, ${cardNumber}, ${recommendedPrice}, ${tcgPrice}, ${ebayAverage}, ${cardImageUrl || null}, ${setName || null})
    ON CONFLICT (user_id, list_id, card_name, card_number) 
    DO UPDATE SET 
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

export async function getCompList(userId: string, listId?: string): Promise<CompListItem[]> {
  let query: any
  
  if (listId) {
    // Get cards from specific list
    query = sql`
      SELECT cl.*, l.name as list_name
      FROM comp_list cl
      JOIN lists l ON cl.list_id = l.id
      WHERE cl.user_id = ${userId} AND cl.list_id = ${listId}
      ORDER BY cl.saved_at DESC
    `
  } else {
    // Get all cards from all lists
    query = sql`
      SELECT cl.*, l.name as list_name
      FROM comp_list cl
      JOIN lists l ON cl.list_id = l.id
      WHERE cl.user_id = ${userId}
      ORDER BY cl.saved_at DESC
    `
  }
  
  const result = await query
  return result.rows as CompListItem[]
}

export async function removeFromCompList(userId: string, itemId: string): Promise<void> {
  await sql`
    DELETE FROM comp_list 
    WHERE id = ${itemId} AND user_id = ${userId}
  `
} 