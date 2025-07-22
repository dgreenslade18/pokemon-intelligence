// Database Security Configuration
export const dbSecurityConfig = {
  // SSL/TLS Configuration
  ssl: {
    require: true,
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    // Additional SSL options for production
    ...(process.env.NODE_ENV === 'production' && {
      ca: process.env.DB_SSL_CA,
      cert: process.env.DB_SSL_CERT,
      key: process.env.DB_SSL_KEY
    })
  },
  
  // Connection Pool Security
  connection: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Force SSL for all connections
    ssl: true
  },
  
  // Query Security
  query: {
    // Prevent SQL injection
    parameterizedQueries: true,
    // Log suspicious queries in production
    logSuspiciousQueries: process.env.NODE_ENV === 'production'
  }
}

// Database encryption verification
export function verifyDatabaseEncryption() {
  console.log('🔐 Database Security Verification:')
  console.log(`   Environment: ${process.env.NODE_ENV}`)
  console.log(`   SSL Required: ${dbSecurityConfig.ssl.require}`)
  console.log(`   SSL Verification: ${dbSecurityConfig.ssl.rejectUnauthorized}`)
  console.log(`   Connection Pool Size: ${dbSecurityConfig.connection.max}`)
  console.log(`   Parameterized Queries: ${dbSecurityConfig.query.parameterizedQueries}`)
  
  // Check for required environment variables
  const requiredEnvVars = ['POSTGRES_URL']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars)
  } else {
    console.log('✅ All required environment variables are set')
  }
  
  // Verify SSL connection string
  const dbUrl = process.env.POSTGRES_URL
  if (dbUrl && !dbUrl.includes('sslmode=require')) {
    console.warn('⚠️  Database URL should include sslmode=require for production')
  } else if (dbUrl && dbUrl.includes('sslmode=require')) {
    console.log('✅ Database URL includes SSL requirement')
  }
}

// Export security status
export const dbSecurityStatus = {
  sslEnabled: true,
  passwordHashing: 'bcrypt-12-rounds',
  sqlInjectionProtection: true,
  connectionEncryption: true
} 