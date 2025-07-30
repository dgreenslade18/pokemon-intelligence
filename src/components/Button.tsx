import React, { Fragment, memo, useRef, useState } from 'react'
import clsx from 'clsx'

export type ButtonColor = 
  | 'primary' 
  | 'secondary' 
  | 'white' 
  | 'success' 
  | 'warning'
  | 'outline'
  | 'danger'
  | 'ghost'
  | 'search'

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
		"font-body font-medium  cursor-pointer overflow-hidden ease-in-out transition-[scale,color,background-color] whitespace-nowrap  text-center items-center  group duration-400 justify-center select-none appearance-none group-active:scale-[0.975] active:scale-[0.975] inline-flex gap-2 rounded-full text-[0.938rem] px-5 leading-[0.9] tracking-[0.01em] ",
    className,
    // Color variants
    color === 'primary' && 'relative bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700',
    color === 'secondary' && 'relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white',
    color === 'white' && 'relative bg-white text-black rounded-full',
    color === 'danger' && 'relative bg-red-700 text-white rounded-full',
    color === 'success' && 'relative bg-green-600 text-white hover:bg-green-700',
    color === 'warning' && 'relative bg-yellow-600 text-white hover:bg-yellow-700',
    color === 'outline' && 'relative bg-transparent text-white border border-white/20 hover:bg-white/10',
    color === 'ghost' && 'relative bg-transparent text-white hover:bg-white/10',
    color === 'search' && 'bg-transparent text-black dark:text-white !pr-2',
    // Size variants
    buttonSize === 'small' && 'py-2 px-3 text-sm',
    buttonSize === 'medium' && 'py-3 px-4',
    buttonSize === 'large' && 'py-4 px-6 text-[15px]',
    // Disabled state
    disabled && 'opacity-50 cursor-not-allowed'
  )

  // Check if children contains SVG elements
  const hasSVG = (children: React.ReactNode): boolean => {
    if (!children) return false
    if (typeof children === 'string') return false
    if (Array.isArray(children)) {
      return children.some(child => hasSVG(child))
    }
         if (React.isValidElement(children)) {
       // Check if this element is an SVG
       if (children.type === 'svg') {
         return true
       }
       // Recursively check children
       const props = children.props as any
       if (props && props.children) {
         return hasSVG(props.children)
       }
     }
    return false
  }

  // Extract text content from children
  const getTextContent = (children: React.ReactNode): string => {
    if (typeof children === 'string') return children
    if (Array.isArray(children)) {
      return children.map(child => getTextContent(child)).join('')
    }
    if (children && typeof children === 'object' && 'props' in children) {
      const childProps = children as { props: { children?: React.ReactNode } }
      return getTextContent(childProps.props.children)
    }
    return ''
  }

  const containsSVG = hasSVG(children)
  const text = getTextContent(children)
  const words = text.split(' ')
  
	const [isAnimating, setIsAnimating] = useState(false);
	const timeoutRef = useRef<any>(null);


  // Create a key based on the text content to force re-render when content changes
  const contentKey = text.trim()


  const handleMouseEnter = (e) => {
		const svg = e.currentTarget.querySelector("svg");
		if (svg) {
			const animations = svg?.querySelectorAll("animate");
			animations.forEach((anim) => {
				anim.beginElement();
			});
		}

		if (!isAnimating) {
			setIsAnimating(true);

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			const totalTime = 800 + characters.length * 30;
			timeoutRef.current = setTimeout(() => {
				setIsAnimating(false);
			}, totalTime);
		}
	};

  const characters = text.split("");

  return (
		<button 
      {...other} 
      type={type}
      onClick={onClick}
      onMouseEnter={handleMouseEnter} 
      className={clsx(classes)}
      disabled={disabled}
    >
			
			<span className="pointer-events-none relative z-5">
				{containsSVG ? (
					// If contains SVG, render children directly without text animation
					<span className="inline-flex items-center gap-2">
						{children}
					</span>
				) : (
					// Text-only content with animation
					<span className="inline-block">
						{characters.map((char, index) => (
							<span
								key={index}
								className="inline-block"
								style={{
									animation: isAnimating ? `deleteType 1s ease-in-out forwards ${index * 0.03}s` : "none",
								}}
							>
								{char === " " ? "\u00A0" : char}
							</span>
						))}
					</span>
				)}
			</span>
		</button>
	);
})

Button.displayName = 'Button' 