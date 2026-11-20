import type { BuildTime, Metadata } from '@/types'
import * as React from 'react'
import { CopyPageButton } from '@/components/copy-page-button'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

interface DefaultLayoutProps {
  metadata: Metadata
  buildTime: BuildTime
  children: React.ReactNode
}

export function DefaultLayout({ metadata, buildTime, children }: DefaultLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader metadata={metadata} />
      <main className="bg-background relative flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-4xl justify-end px-4 pt-4">
          <CopyPageButton />
        </div>
        {children}
      </main>
      <SiteFooter buildTime={buildTime} />
    </div>
  )
}