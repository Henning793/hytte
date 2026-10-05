import { useEffect, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { pendingFile } from './data'
import { idbDel, idbGet, idbSet } from './idb'
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

export const MAX_FILE_BYTES = 20 * 1024 * 1024

/** Sletter en fil. Feiler stille: raden er allerede borte, og filen er utilgjengelig uten den. */
export function removeFile(path: string) {
  void idbDel(fileKey(path))
  return supabase.storage.from(BUCKET).remove([path]).then(
    () => undefined,
    () => undefined,
  )
}

// ---------------------------------------------------------------------------
// Visning av private filer, også uten nett
// ---------------------------------------------------------------------------

const fileKey = (path: string) => `f:${path}`
const objectUrls = new Map<string, Promise<string | null>>()

async function signedUrl(path: string, download?: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600, download ? { download } : undefined)
  return data?.signedUrl ?? null
}

/** Filen som blob: fra utboksen, fra lagret kopi, eller hentet og lagret for neste gang. */
async function fileBlob(path: string): Promise<Blob | null> {
  if (path.startsWith('local:')) return pendingFile(path)
  const saved = await idbGet<Blob>(fileKey(path))
  if (saved) return saved
  const url = await signedUrl(path).catch(() => null)
  if (!url) return null
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) return null
  const blob = await res.blob()
  void idbSet(fileKey(path), blob)
  return blob
}

function objectUrl(path: string): Promise<string | null> {
  let url = objectUrls.get(path)
  if (!url) {
    url = fileBlob(path).then((b) => (b ? URL.createObjectURL(b) : null))
    // Mislykket henting prøves igjen neste gang skjermen vises.
    void url.then((u) => {
      if (!u) objectUrls.delete(path)
    })
    objectUrls.set(path, url)
  }
  return url
}

/** Adresse til en privat fil (bilde eller PDF) som også virker uten nett når den er åpnet før. */
export function useFileUrl(path: string | null | undefined): string | null {
  const [result, setResult] = useState<{ path: string; url: string | null } | null>(null)

  useEffect(() => {
    if (!path) return
    let active = true
    void objectUrl(path).then((url) => {
      if (active) setResult({ path, url })
    })
    return () => {
      active = false
    }
  }, [path])

  return path && result?.path === path ? result.url : null
}

/** Laster ned filen med et lesbart navn. Gir false hvis den verken er lagret eller kan hentes. */
export async function downloadFile(path: string, filename: string): Promise<boolean> {
  const local = await objectUrl(path)
  const href = local ?? (await signedUrl(path, filename).catch(() => null))
  if (!href) return false
  const a = document.createElement('a')
  a.href = href
  if (local) a.download = filename
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
  return true
}
