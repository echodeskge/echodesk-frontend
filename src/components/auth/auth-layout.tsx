"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

interface AuthProps extends ComponentProps<"div"> {
  imgSrc?: string
  imgClassName?: string
  tenantName?: string
  tenantLogo?: string
}

export function Auth({
  className,
  children,
  imgSrc,
  imgClassName,
  tenantName,
  tenantLogo,
  ...props
}: AuthProps) {
  return (
    <section
      className={cn(
        "container min-h-screen w-full flex justify-between px-0",
        className
      )}
      {...props}
    >
      <div className="flex-1 relative grid">
        <div className="absolute top-0 inset-x-0 flex justify-between items-center px-4 py-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground font-black z-50"
          >
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt=""
                height={24}
                width={24}
                className="h-6 w-6"
              />
            ) : (
              <div className="h-6 w-6 bg-primary rounded" />
            )}
            <span>{tenantName || "EchoDesk"}</span>
          </Link>
        </div>
        <div className="max-w-[28rem] w-full m-auto px-6 py-12 space-y-6">
          {children}
        </div>
      </div>
      {imgSrc && <AuthImage imgSrc={imgSrc} className={cn("", imgClassName)} />}
    </section>
  )
}

interface AuthImageProps extends ComponentProps<"div"> {
  imgSrc: string
}

export function AuthImage({ className, imgSrc, ...props }: AuthImageProps) {
  return (
    <div
      className={cn(
        "basis-1/2 relative hidden min-h-screen bg-muted md:block",
        className
      )}
      {...props}
    >
      <img
        src={imgSrc}
        alt="Login illustration"
        className="object-cover w-full h-full"
      />
    </div>
  )
}

export function AuthHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("space-y-2 text-center", className)} {...props} />
}

export function AuthTitle({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
}

export function AuthDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

export function AuthForm({ className, ...props }: ComponentProps<"div">) {
  return <div className={className} {...props} />
}

export function AuthFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-6", className)} {...props} />
}