import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'DealCanvas Admin',
      },
      {
        name: 'robots',
        content: 'noindex, nofollow',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* TanStack Router code-splits each route into its own hashed JS
            chunk. If a browser tab stays open across a new deploy (or
            preloads a route right as one lands), the hash it's holding no
            longer exists on the CDN and the dynamic import 404s -- Vite
            fires "vite:preloadError" on window for exactly this case. A
            reload picks up the new deploy's current chunk map; the
            sessionStorage guard stops a genuinely broken deploy from
            reload-looping forever. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){window.addEventListener('vite:preloadError',function(e){e.preventDefault();var k='__preload_reload_at__';var last=Number(sessionStorage.getItem(k)||0);if(Date.now()-last>10000){sessionStorage.setItem(k,String(Date.now()));window.location.reload();}});})();`,
          }}
        />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
