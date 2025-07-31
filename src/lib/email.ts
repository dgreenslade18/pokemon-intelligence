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

export async function sendInviteEmail(email: string, inviteToken: string) {
  const inviteUrl = `https://www.cardintelligence.co.uk/auth/invite/${inviteToken}`
  const subject = 'You\'re invited to Card Intelligence!'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin: 0;">Card Intelligence</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0;">Made for sellers. Updated for today.</p>
      </div>
      
      <div style="background: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
        <h2 style="color: #111827; margin: 0 0 20px 0;">🎉 You're invited!</h2>
        <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
          Great news! You've been granted access to the alpha version of Card Intelligence. <Br> Click the button below to create your account and set your password.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" 
             style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            Create Your Account
          </a>
        </div>
        
        <p style="color: #374151; line-height: 1.6; margin: 20px 0 0 0;">
          <strong>Important:</strong> This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #111827; margin: 0 0 15px 0;">What you'll be able to do:</h3>
        <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>Analyse UK Pokemon card prices across eBay</li>
          <li>Track price changes and market trends</li>
          <li>Build comparison lists for your inventory</li>
          <li>Get confidence scores for buying decisions (coming soon)</li>
        </ul>
      </div>

      <div style="background: #eef2ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #6366f1;">
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
          <svg style="width: 24px; height: 24px; margin-right: 10px; fill: #5865f2;" viewBox="0 0 24 24">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z"/>
          </svg>
          <h3 style="color: #111827; margin: 0;">Join our Discord Community!</h3>
        </div>
        <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
          Connect with other collectors and sellers in our Discord server for real-time feedback, bug reports, new feature releases, and community discussions.
        </p>
        <div style="text-align: center;">
          <a href="https://discord.gg/s6AGM8cm" 
             target="_blank"
             rel="noopener noreferrer"
             style="background: #5865f2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            Join Discord Server
          </a>
        </div>
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

export async function sendManualPasswordResetEmail(email: string, newPassword: string) {
  const subject = 'Password Reset - Card Intelligence'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin: 0;">Card Intelligence</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0;">Made for sellers. Updated for today.</p>
      </div>
      
      <div style="background: #fef3c7; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
        <h2 style="color: #111827; margin: 0 0 20px 0;">Password Reset by Administrator</h2>
        <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
          An administrator has reset your password for your Card Intelligence account. Here are your new login credentials:
        </p>
        
        <div style="background: #ffffff; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #111827; margin: 0 0 15px 0;">New Password:</h3>
          <p style="color: #6366f1; margin: 0; font-family: monospace; font-size: 16px; background-color: #f3f4f6; padding: 10px; border-radius: 3px;">${newPassword}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000/auth/signin" 
             style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            Sign In Now
          </a>
        </div>
        
        <p style="color: #374151; line-height: 1.6; margin: 20px 0 0 0;">
          <strong>Important:</strong> Please change your password after signing in for security purposes.
        </p>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `

  return sendEmail({ to: email, subject, html })
} 