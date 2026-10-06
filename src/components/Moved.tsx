import { Navigate, useLocation } from 'react-router'

type Props = { from: string; to: string }

/** Sender gamle lenker (fra varsler, bokmerker) videre til der skjermen ligger nå. */
export function Moved({ from, to }: Props) {
  const { pathname, search } = useLocation()
  return <Navigate to={to + pathname.slice(from.length) + search} replace />
}
