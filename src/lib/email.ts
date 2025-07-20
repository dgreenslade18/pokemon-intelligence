import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailData {
  to: string
  subject: string
  html: string
}

export async function sendEmail(emailData: EmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Card Intelligence <noreply@cardintelligence.co.uk>',
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
    })

    if (error) {
      console.error('Email sending failed:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('Email sent successfully:', data)
    return data
  } catch (error) {
    console.error('Email service error:', error)
    throw error
  }
}

export async function sendWelcomeEmail(email: string) {
  const subject = 'Thanks for your interest in Card Intelligence!'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 10px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin: 0;">Card Intelligence</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0;">Made for sellers. Updated for today.</p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #111827; margin: 0 0 20px 0;">Thanks for your interest!</h2>
        <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
          We've received your email and added you to our waitlist. We're currently in a gradual rollout phase, 
          and we'll be in touch as soon as your access is ready.
        </p>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `

  return sendEmail({ to: email, subject, html })
}

export async function sendAccessGrantedEmail(email: string, tempPassword: string) {
  const subject = 'Your Card Intelligence access is ready!'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin: 0;">Card Intelligence</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0;">Made for sellers. Updated for today.</p>
      </div>
      
      <div style="background: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
        <h2 style="color: #111827; margin: 0 0 20px 0;">🎉 Your access is ready!</h2>
        <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
          Great news! Your Card Intelligence account has been approved and is ready to use.
        </p>
        
        <div style="background: #ffffff; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #111827; margin: 0 0 15px 0;">Your login details:</h3>
          <p style="color: #374151; margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
          <p style="color: #374151; margin: 0 0 20px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          
          <div style="text-align: center;">
            <a href="http://localhost:3000/auth/signin" 
               style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Sign In Now
            </a>
          </div>
        </div>
        
        <p style="color: #374151; line-height: 1.6; margin: 20px 0 0 0;">
          <strong>Important:</strong> Please change your password after your first login for security.
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #111827; margin: 0 0 15px 0;">What you can do now:</h3>
        <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>Analyze Pokemon card prices across eBay and TCG API</li>
          <li>Track price changes and market trends</li>
          <li>Build comparison lists for your inventory</li>
          <li>Get confidence scores for buying decisions</li>
        </ul>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `

  return sendEmail({ to: email, subject, html })
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `http://localhost:3000/auth/reset-password?token=${resetToken}`
  const subject = 'Reset your Card Intelligence password'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin: 0;">Card Intelligence</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0;">Made for sellers. Updated for today.</p>
      </div>
      
      <div style="background: #fef3c7; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
        <h2 style="color: #111827; margin: 0 0 20px 0;">Password Reset Request</h2>
        <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
          We received a request to reset your password for your Card Intelligence account.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #374151; line-height: 1.6; margin: 20px 0 0 0;">
          <strong>Security note:</strong> This link will expire in 1 hour. If you didn't request this reset, 
          you can safely ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `

  return sendEmail({ to: email, subject, html })
} 