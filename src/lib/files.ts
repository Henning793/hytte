import { useEffect, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

export const BUCKET = 'cabin-files'

/** Krymper bilder til omtrent 1600 px lengste side før opplasting. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    return await imageCompression(file, {
      maxWidthOrHeight: 1600,
      maxSizeMB: 1,
      initialQuality: 0.8,
      fileType: 'image/jpeg',
      // Uten worker: ellers hentes biblioteket fra et CDN, som ikke virker uten nett.
      useWebWorker: false,
    })
  } catch {
    // Formater nettleseren ikke kan lese (f.eks. noen HEIC) lastes opp som de er.
    return file
  }
}

/** Laster opp et bilde til {cabinId}/{folder}/{uuid}.jpg og gir stien tilbake. */
export async function uploadImage(cabinId: string, folder: string, file: File): Promise<string> {
  const image = await compressImage(file)
  const ext = image.type === 'image/jpeg' ? 'jpg' : (image.name.split('.').pop() ?? 'bin')
  const path = `${cabinId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, image, { contentType: image.type })
  if (error) throw error
  return path
}

const signed = new Map<string, { url: Promise<string | null>; expires: number }>()

function signedUrl(path: string): Promise<string | null> {
  const hit = signed.get(path)
  if (hit && hit.expires > Date.now() + 60_000) return hit.url
  const url = supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)
    .then(({ data }) => data?.signedUrl ?? null)
  signed.set(path, { url, expires: Date.now() + 3600_000 })
  return url
}

/** Midlertidig adresse til en privat fil. Gjenbrukes til den nesten er utløpt. */
export function useSignedUrl(path: string | null | undefined): string | null {
  const [result, setResult] = useState<{ path: string; url: string | null } | null>(null)

  useEffect(() => {
    if (!path) return
    let active = true
    signedUrl(path).then((url) => {
      if (active) setResult({ path, url })
    })
    return () => {
      active = false
    }
  }, [path])

  return path && result?.path === path ? result.url : null
}
