import { redirect } from 'next/navigation'
import { resolveLocale } from '@/i18n/utils'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  const resolvedLocale = resolveLocale(locale)

  redirect(`/${resolvedLocale}/posts`)
}
