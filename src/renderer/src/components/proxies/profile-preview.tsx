import useSWR from 'swr'
import { load } from 'js-yaml'
import { useTranslation } from 'react-i18next'
import { getProfileParseStr } from '@renderer/utils/ipc'
import { Virtuoso } from 'react-virtuoso'

export default function ProfilePreview({ id }: { id: string }) {
  const { t } = useTranslation()
  const { data, error } = useSWR(['profilePreview', id], async () => {
    const value = load(await getProfileParseStr(id)) as {
      proxies?: { name?: string; type?: string }[]
      'proxy-providers'?: Record<string, unknown>
    } | null
    return {
      proxies: Array.isArray(value?.proxies) ? value.proxies : [],
      providers: Object.keys(value?.['proxy-providers'] ?? {})
    }
  })
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <p role="status" className="ui-panel text-sm">
        {t('redesign.previewHint')}
      </p>
      {error ? (
        <p role="alert" className="text-destructive">
          {String(error)}
        </p>
      ) : !data ? (
        <p>{t('redesign.loading')}</p>
      ) : (
        <>
          {data.providers.length > 0 && (
            <p className="ui-description">
              {t('redesign.previewProviders')}: {data.providers.join(', ')}
            </p>
          )}
          {data.proxies.length === 0 ? (
            <p className="ui-panel">{t('redesign.noNode')}</p>
          ) : (
            <Virtuoso
              className="min-h-0 flex-1"
              data={data.proxies}
              itemContent={(_, proxy) => (
                <div className="border-b p-4">
                  <p className="break-words font-medium">{proxy.name}</p>
                  <p className="ui-description">{proxy.type}</p>
                </div>
              )}
            />
          )}
        </>
      )}
    </section>
  )
}
