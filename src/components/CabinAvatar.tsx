import { useState } from 'react'
import { useFileUrl } from '../lib/files'

type Props = {
  name: string
  photoPath?: string | null
  /** Grønn i stedet for oker, for å skille hytter i lister. */
  alt?: boolean
  size?: number
}

export function CabinAvatar({ name, photoPath, alt, size }: Props) {
  const url = useFileUrl(photoPath)
  // Bildet kan mangle uten nett; da vises forbokstaven.
  const [broken, setBroken] = useState<string | null>(null)
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.45) } : undefined
  return (
    <span className={alt ? 'ha-avatar alt' : 'ha-avatar'} style={style} aria-hidden="true">
      {url && broken !== url ? <img src={url} alt="" onError={() => setBroken(url)} /> : name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function PersonAvatar({ name }: { name: string }) {
  return (
    <span className="ha-avatar alt" style={{ width: 40, height: 40, fontSize: 17, borderRadius: 20 }} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
