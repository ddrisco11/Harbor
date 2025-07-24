import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
  hover?: boolean
  clickable?: boolean
  onClick?: () => void
}

export function Card({ 
  children, 
  className, 
  padding = 'md',
  hover = false,
  clickable = false,
  onClick 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={clsx(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        paddingClasses[padding],
        {
          'hover:shadow-md transition-shadow duration-200': hover,
          'cursor-pointer': clickable,
          'hover:border-gray-300': hover && clickable,
        },
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
} 