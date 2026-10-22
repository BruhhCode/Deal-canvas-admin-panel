import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLiveNow, timeAgo } from '@/lib/time'
import { setActiveTheme, useDataStatus, useSiteTheme } from '@/lib/data'
import { useToast } from '@/components/admin/Toast'
import { errorMessage } from '@/components/admin/FormField'
import { SITE_THEMES, type SiteThemeKey } from '@/types/catalog'

export const Route = createFileRoute('/admin/themes')({
  component: ThemesTab,
})

const THEME_DESCRIPTIONS: Record<SiteThemeKey, string> = {
  default: "The site's regular year-round look.",
  christmas:
    'Festive red/green accents, a gentle snowfall effect site-wide, and a holiday-themed homepage headline.',
}

function ThemesTab() {
  const theme = useSiteTheme()
  const { loaded, error } = useDataStatus()
  const toast = useToast()
  useLiveNow()

  const [selected, setSelected] = useState<SiteThemeKey | null>(null)
  const [saving, setSaving] = useState(false)

  const active = selected ?? theme?.active_theme ?? 'default'
  const dirty = active !== (theme?.active_theme ?? 'default')

  async function handleActivate() {
    setSaving(true)
    try {
      await setActiveTheme(active)
      toast.show(`${SITE_THEMES[active]} theme is now live`)
      setSelected(null)
    } catch (err) {
      toast.show(errorMessage(err, 'Failed to update the site theme.'), { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load theme: {error}
        </p>
      ) : null}

      <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
        Pick which theme is live on the site right now — colors, any decorative effect, and homepage copy all switch
        together with one click. Only one theme is active at a time.
      </p>

      <div className="max-w-xl space-y-4 rounded-lg border p-6">
        <div className="space-y-3">
          {(Object.keys(SITE_THEMES) as SiteThemeKey[]).map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-sm border p-4 has-[:checked]:border-clay has-[:checked]:bg-cream"
            >
              <input
                type="radio"
                name="theme"
                className="mt-1"
                checked={active === key}
                onChange={() => setSelected(key)}
              />
              <span>
                <span className="block font-semibold">{SITE_THEMES[key]}</span>
                <span className="block text-sm text-muted-foreground">{THEME_DESCRIPTIONS[key]}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {loaded && theme ? `Currently live: ${SITE_THEMES[theme.active_theme]} · updated ${timeAgo(theme.updated_at)}` : 'Loading...'}
          </p>
          <button
            type="button"
            onClick={handleActivate}
            disabled={!dirty || saving}
            className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
          >
            {saving ? 'Activating...' : 'Activate'}
          </button>
        </div>
      </div>
    </>
  )
}
