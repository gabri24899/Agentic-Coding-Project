import * as React from "react"

import { cn } from "@/lib/utils"

const Empty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <section
      ref={ref}
      className={cn(
        "flex min-h-64 flex-col items-center justify-center gap-6 rounded-lg border bg-card p-8 text-center text-card-foreground shadow-soft",
        className,
      )}
      {...props}
    />
  ),
)
Empty.displayName = "Empty"

const EmptyHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex max-w-xl flex-col items-center gap-2", className)} {...props} />
  ),
)
EmptyHeader.displayName = "EmptyHeader"

const EmptyTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-xl font-semibold tracking-normal", className)} {...props} />
  ),
)
EmptyTitle.displayName = "EmptyTitle"

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />
))
EmptyDescription.displayName = "EmptyDescription"

const EmptyContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-wrap items-center justify-center gap-2", className)} {...props} />
  ),
)
EmptyContent.displayName = "EmptyContent"

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle }
