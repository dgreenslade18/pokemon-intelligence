import React, { Fragment, memo } from 'react'
import clsx from 'clsx'

export type ButtonColor = 
  | 'primary' 
  | 'secondary' 
  | 'danger' 
  | 'success' 
  | 'warning'
  | 'outline'
  | 'ghost'

export type ButtonSize = 'small' | 'medium' | 'large'

type ButtonProps = {
  color?: ButtonColor
  size?: ButtonSize
  className?: string
  containerClassName?: string
  children?: React.ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export const Button = memo(({ 
  color = 'primary', 
  size = 'medium', 
  className = '', 
  containerClassName, 
  children, 
  disabled = false,
  onClick,
  type = 'button',
  ...other 
}: ButtonProps) => {
  const buttonSize = size

  const classes = clsx(
    'font-medium relative ease-in-out transition-[color,background-color,border-color,scale] whitespace-nowrap text-center items-center group duration-500 justify-center select-none appearance-none inline-flex gap-3 rounded-lg text-[1rem] px-4.5 leading-[1.1]',
    className,
    // Color variants
    color === 'primary' && 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700',
    color === 'secondary' && 'bg-white/10 text-white hover:bg-white/20',
    color === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
    color === 'success' && 'bg-green-600 text-white hover:bg-green-700',
    color === 'warning' && 'bg-yellow-600 text-white hover:bg-yellow-700',
    color === 'outline' && 'bg-transparent text-white border border-white/20 hover:bg-white/10',
    color === 'ghost' && 'bg-transparent text-white hover:bg-white/10',
    // Size variants
    buttonSize === 'small' && 'py-2 px-3 text-sm',
    buttonSize === 'medium' && 'py-3 px-4',
    buttonSize === 'large' && 'py-4 px-6 text-lg',
    // Disabled state
    disabled && 'opacity-50 cursor-not-allowed'
  )

  // Check if children is purely text
  const isPureText = typeof children === 'string' || (Array.isArray(children) && children.every(child => typeof child === 'string'))
  
  return (
    <div
      className={clsx(
        'group relative inline-block overflow-hidden rounded-lg transition-[scale] duration-300 group-active:scale-[0.975] active:scale-[0.975]',
        containerClassName
      )}
    >
      <button 
        className={classes} 
        disabled={disabled}
        onClick={onClick}
        type={type}
        {...other}
      >
        {isPureText ? (
          // Text animation for pure text content
          <span className="pointer-events-none relative flex items-center gap-2 overflow-hidden">
            <span>
              {(() => {
                const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : ''
                const words = text.split(' ')
                return words.map((word, i) => (
                  <Fragment key={i}>
                    <span
                      style={{ '--delay': `${i * 0.1}s` } as React.CSSProperties}
                      className="inline-block translate-y-0 transition-transform [transition-delay:var(--delay)] duration-[400ms] ease-[cubic-bezier(.94,-0.11,.35,.93)] group-hover:translate-y-[200%]"
                    >
                      {word === ' ' ? '\u00A0' : word}
                    </span>{' '}
                  </Fragment>
                ))
              })()}
            </span>
            <span className="absolute inset-0">
              {(() => {
                const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : ''
                const words = text.split(' ')
                return words.map((word, i) => (
                  <Fragment key={i}>
                    <span
                      style={{ '--delay': `${i * 0.1}s` } as React.CSSProperties}
                      className="inline-block -translate-y-[200%] transition-transform [transition-delay:var(--delay)] duration-[400ms] ease-[cubic-bezier(.94,-0.11,.35,.93)] group-hover:translate-y-0"
                    >
                      {word === ' ' ? '\u00A0' : word}
                    </span>{' '}
                  </Fragment>
                ))
              })()}
            </span>
          </span>
        ) : (
          // Normal rendering for mixed content (icons + text)
          children
        )}
      </button>
      
      {/* Pattern overlay effect for all buttons */}
      <div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden opacity-0 transition-[opacity] duration-800 ease-in-out group-hover:opacity-100">
        <div className="pointer-events-none absolute inset-0 h-full w-full">
          <div className="absolute inset-0 w-full">
            <div
              className={clsx(
                'absolute inset-0 -left-[45%] w-[200%]',
                'animate-pulse',
                color === 'primary' && 'opacity-20',
                color === 'secondary' && 'opacity-15',
                color === 'danger' && 'opacity-20',
                color === 'success' && 'opacity-20',
                color === 'warning' && 'opacity-20',
                color === 'outline' && 'opacity-15',
                color === 'ghost' && 'opacity-10'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

Button.displayName = 'Button' 