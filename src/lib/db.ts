import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'
import { verifyDatabaseEncryption, dbSecurityStatus } from './db-security'

export { sql }

// Verify database encryption on startup
verifyDatabaseEncryption()

// Database encryption configuration
const dbConfig = {
  // SSL configuration based on environment
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    require: true
  } : {
    rejectUnauthorized: false,
    require: true
  },
  // Additional security settings
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20 // Maximum number of connections
}

// Log database security status
console.log('🔐 Database Security Status:')
console.log(`   Environment: ${process.env.NODE_ENV}`)
console.log(`   SSL Required: ${dbConfig.ssl.require}`)
console.log(`   SSL Verification: ${dbConfig.ssl.rejectUnauthorized}`)
console.log(`   Connection Pool Size: ${dbConfig.max}`)

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: Date
  subscription_status: 'testing' | 'pro' | 'enterprise'
  user_level: 'tester' | 'super_admin'
  last_login?: Date
  password_reset_token?: string
  password_reset_expires?: Date
  email_verified?: boolean
  is_active?: boolean
  deactivated_at?: Date
  deactivated_by?: string
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

export interface Invite {
  id: string
  email: string
  token: string
  created_at: Date
  expires_at: Date
  used: boolean
  invited_by: string | null
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

export interface EmailSubmission {
  id: string
  email: string
  created_at: Date
  status: 'pending' | 'approved' | 'rejected'
  assigned_user_id?: string
  notes?: string
  email_sent_at?: Date
}

// Add population data schema
export interface PopulationEntry {
  id?: number
  card_name: string
  card_number: string
  set_name: string
  set_slug: string
  grading_service: 'PSA' | 'CGC' | 'ACE'
  grade_10: number
  grade_9: number
  grade_8: number
  grade_7: number
  grade_6: number
  total_population: number
  gem_rate: number // Percentage of grade 10s
  source: string // 'psa_api', etc. (pikawiz disabled)
  last_updated: string
  created_at?: string
}

// Function to store population data
export async function insertPopulationData(data: PopulationEntry) {
  await sql`
    INSERT INTO population_data (
      card_name, card_number, set_name, set_slug, grading_service,
      grade_10, grade_9, grade_8, grade_7, grade_6, total_population,
      gem_rate, source, last_updated
    ) VALUES (
      ${data.card_name}, ${data.card_number}, ${data.set_name}, ${data.set_slug}, 
      ${data.grading_service}, ${data.grade_10}, ${data.grade_9}, ${data.grade_8},
      ${data.grade_7}, ${data.grade_6}, ${data.total_population}, ${data.gem_rate},
      ${data.source}, ${data.last_updated}
    )
    ON CONFLICT (card_name, card_number, set_slug, grading_service)
    DO UPDATE SET
      grade_10 = EXCLUDED.grade_10,
      grade_9 = EXCLUDED.grade_9,
      grade_8 = EXCLUDED.grade_8,
      grade_7 = EXCLUDED.grade_7,
      grade_6 = EXCLUDED.grade_6,
      total_population = EXCLUDED.total_population,
      gem_rate = EXCLUDED.gem_rate,
      source = EXCLUDED.source,
      last_updated = EXCLUDED.last_updated
  `
}

// Function to get population data for a card
export async function getPopulationData(cardName: string, setName?: string, cardNumber?: string) {
  if (setName && cardNumber) {
    return await sql`
      SELECT * FROM population_data 
      WHERE card_name = ${cardName} 
        AND set_name = ${setName}
        AND card_number = ${cardNumber}
      ORDER BY last_updated DESC
    `
  } else if (setName) {
    return await sql`
      SELECT * FROM population_data 
      WHERE card_name = ${cardName} 
        AND set_name = ${setName}
      ORDER BY last_updated DESC
    `
  } else if (cardNumber) {
    return await sql`
      SELECT * FROM population_data 
      WHERE card_name = ${cardName} 
        AND card_number = ${cardNumber}
      ORDER BY last_updated DESC
    `
  } else {
    return await sql`
      SELECT * FROM population_data 
      WHERE card_name = ${cardName}
      ORDER BY last_updated DESC
    `
  }
}

// Function to get all population data for a set
export async function getSetPopulationData(setSlug: string) {
  return await sql`
    SELECT * FROM population_data 
    WHERE set_slug = ${setSlug}
    ORDER BY card_number, grading_service
  `
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
        subscription_status VARCHAR(50) DEFAULT 'testing' CHECK (subscription_status IN ('testing', 'pro', 'enterprise')),
        user_level VARCHAR(20) DEFAULT 'tester' CHECK (user_level IN ('tester', 'super_admin')),
        last_login TIMESTAMP WITH TIME ZONE
      );
    `

    // Create invites table
    await sql`
      CREATE TABLE IF NOT EXISTS invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false,
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL
      );
    `

    // Create email_submissions table
    await sql`
      CREATE TABLE IF NOT EXISTS email_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT
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

    // Add user_level column if it doesn't exist (migration)
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS user_level VARCHAR(20) DEFAULT 'tester' CHECK (user_level IN ('tester', 'super_admin'));
      `
      console.log('✅ user_level column migration completed')
    } catch (migrationError) {
      console.log('⚠️  user_level column migration failed (might already exist):', migrationError.message)
    }

    // Add last_login column if it doesn't exist (migration)
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
      `
      console.log('✅ last_login column migration completed')
    } catch (migrationError) {
      console.log('⚠️  last_login column migration failed (might already exist):', migrationError.message)
    }

    // Add password reset columns if they don't exist (migration)
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
      `
      console.log('✅ password_reset_token column migration completed')
    } catch (migrationError) {
      console.log('⚠️  password_reset_token column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;
      `
      console.log('✅ password_reset_expires column migration completed')
    } catch (migrationError) {
      console.log('⚠️  password_reset_expires column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
      `
      console.log('✅ email_verified column migration completed')
    } catch (migrationError) {
      console.log('⚠️  email_verified column migration failed (might already exist):', migrationError.message)
    }

    // Add email_sent_at column to email_submissions if it doesn't exist (migration)
    try {
      await sql`
        ALTER TABLE email_submissions 
        ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;
      `
      console.log('✅ email_sent_at column migration completed')
    } catch (migrationError) {
      console.log('⚠️  email_sent_at column migration failed (might already exist):', migrationError.message)
    }

    // Add user management columns if they don't exist (migration)
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      `
      console.log('✅ is_active column migration completed')
    } catch (migrationError) {
      console.log('⚠️  is_active column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE;
      `
      console.log('✅ deactivated_at column migration completed')
    } catch (migrationError) {
      console.log('⚠️  deactivated_at column migration failed (might already exist):', migrationError.message)
    }

    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS deactivated_by VARCHAR(255);
      `
      console.log('✅ deactivated_by column migration completed')
    } catch (migrationError) {
      console.log('⚠️  deactivated_by column migration failed (might already exist):', migrationError.message)
    }

    // Set super admin for domgreenslade@me.com
    try {
      await sql`
        UPDATE users 
        SET user_level = 'super_admin' 
        WHERE email = 'domgreenslade@me.com';
      `
      console.log('✅ Super admin assignment completed')
    } catch (migrationError) {
      console.log('⚠️  Super admin assignment failed:', migrationError.message)
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
    SELECT id, email, password_hash, created_at, subscription_status, user_level, last_login, 
           password_reset_token, password_reset_expires, email_verified, is_active, deactivated_at, deactivated_by
    FROM users
    WHERE email = ${email}
  `
  
  return result.rows[0] as User || null
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await sql`
    SELECT id, email, password_hash, created_at, subscription_status, user_level, last_login,
           password_reset_token, password_reset_expires, email_verified, is_active, deactivated_at, deactivated_by
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

// Email submission functions
export async function submitEmail(email: string): Promise<EmailSubmission> {
  const result = await sql`
    INSERT INTO email_submissions (email)
    VALUES (${email})
    RETURNING *
  `
  return result.rows[0] as EmailSubmission
}

export async function getEmailSubmissions(): Promise<EmailSubmission[]> {
  const result = await sql`
    SELECT * FROM email_submissions 
    ORDER BY created_at DESC
  `
  return result.rows as EmailSubmission[]
}

export async function updateEmailSubmissionStatus(
  submissionId: string, 
  status: 'pending' | 'approved' | 'rejected',
  assignedUserId?: string,
  notes?: string
): Promise<EmailSubmission> {
  const result = await sql`
    UPDATE email_submissions 
    SET status = ${status}, 
        assigned_user_id = ${assignedUserId || null},
        notes = ${notes || null}
    WHERE id = ${submissionId}
    RETURNING *
  `
  return result.rows[0] as EmailSubmission
}

export async function getAllUsers(): Promise<User[]> {
  const result = await sql`
    SELECT id, email, created_at, subscription_status, user_level, last_login, email_verified, 
           is_active, deactivated_at, deactivated_by
    FROM users 
    ORDER BY created_at DESC
  `
  return result.rows as User[]
}

export async function updateUserLevel(userId: string, userLevel: 'tester' | 'super_admin'): Promise<User> {
  const result = await sql`
    UPDATE users 
    SET user_level = ${userLevel}
    WHERE id = ${userId}
    RETURNING *
  `
  return result.rows[0] as User
}

export async function updateLastLogin(userId: string): Promise<void> {
  await sql`
    UPDATE users 
    SET last_login = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const resetToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

  const result = await sql`
    UPDATE users 
    SET password_reset_token = ${resetToken}, password_reset_expires = ${expiresAt.toISOString()}
    WHERE email = ${email}
    RETURNING id
  `

  return result.rows.length > 0 ? resetToken : null
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const result = await sql`
    SELECT id FROM users 
    WHERE password_reset_token = ${token} 
    AND password_reset_expires > CURRENT_TIMESTAMP
  `

  return result.rows.length > 0 ? result.rows[0].id : null
}

// Invite operations
export async function createInvite(email: string, invitedBy: string): Promise<Invite> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  const result = await sql`
    INSERT INTO invites (email, token, expires_at, invited_by)
    VALUES (${email}, ${token}, ${expiresAt.toISOString()}, ${invitedBy})
    RETURNING id, email, token, created_at, expires_at, used, invited_by
  `

  return result.rows[0] as Invite
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const result = await sql`
    SELECT id, email, token, created_at, expires_at, used, invited_by
    FROM invites 
    WHERE token = ${token}
  `

  return result.rows.length > 0 ? result.rows[0] as Invite : null
}

export async function verifyInviteToken(token: string): Promise<{valid: boolean, email?: string}> {
  const result = await sql`
    SELECT email FROM invites 
    WHERE token = ${token} 
    AND expires_at > CURRENT_TIMESTAMP
    AND used = false
  `

  if (result.rows.length > 0) {
    return { valid: true, email: result.rows[0].email }
  }
  
  return { valid: false }
}

export async function markInviteAsUsed(token: string): Promise<void> {
  await sql`
    UPDATE invites 
    SET used = true 
    WHERE token = ${token}
  `
}

export async function deleteInvite(token: string): Promise<void> {
  await sql`
    DELETE FROM invites 
    WHERE token = ${token}
  `
}

export async function resetPassword(userId: string, newPasswordHash: string): Promise<void> {
  await sql`
    UPDATE users 
    SET password_hash = ${newPasswordHash}, 
        password_reset_token = NULL, 
        password_reset_expires = NULL
    WHERE id = ${userId}
  `
}

export async function markEmailSent(submissionId: string): Promise<void> {
  await sql`
    UPDATE email_submissions 
    SET email_sent_at = CURRENT_TIMESTAMP
    WHERE id = ${submissionId}
  `
}

export async function generateTempPassword(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function deactivateUser(userId: string, deactivatedBy: string): Promise<void> {
  await sql`
    UPDATE users 
    SET is_active = false, 
        deactivated_at = CURRENT_TIMESTAMP,
        deactivated_by = ${deactivatedBy}
    WHERE id = ${userId}
  `
}

export async function reactivateUser(userId: string): Promise<void> {
  await sql`
    UPDATE users 
    SET is_active = true, 
        deactivated_at = NULL,
        deactivated_by = NULL
    WHERE id = ${userId}
  `
}

export async function deleteUser(userId: string): Promise<void> {
  await sql`
    DELETE FROM users 
    WHERE id = ${userId}
  `
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  await sql`
    UPDATE users 
    SET password_hash = ${newPasswordHash}
    WHERE id = ${userId}
  `
}

export async function manualPasswordReset(userId: string): Promise<string> {
  const tempPassword = await generateTempPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 12)
  
  await sql`
    UPDATE users 
    SET password_hash = ${hashedPassword}
    WHERE id = ${userId}
  `
  
  return tempPassword
}

export async function deleteEmailSubmission(submissionId: string): Promise<void> {
  await sql`
    DELETE FROM email_submissions 
    WHERE id = ${submissionId}
  `
} 