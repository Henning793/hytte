// Radene slik de ligger i databasen (se supabase/migrations).

/** «feil»: noe er ødelagt og må fikses. «oppgave»: alt annet som må gjøres. */
export type TaskKind = 'oppgave' | 'feil'

export type Task = {
  id: string
  cabin_id: string
  title: string
  description: string | null
  kind: TaskKind
  photo_path: string | null
  responsible_user_id: string | null
  due_date: string | null
  done: boolean
  done_by: string | null
  done_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ShoppingItem = {
  id: string
  cabin_id: string
  name: string
  done: boolean
  bought_by: string | null
  bought_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type DocCategory = 'manualer' | 'dokumenter'

export type Doc = {
  id: string
  cabin_id: string
  name: string
  category: DocCategory
  file_path: string
  mime_type: string
  size_bytes: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CabinInfo = {
  cabin_id: string
  wifi_name: string | null
  wifi_password: string | null
  keybox_code: string | null
  keybox_location: string | null
  trash_info: string | null
  store_info: string | null
  notes: string | null
  updated_by: string | null
  updated_at: string
}

export type ChecklistKind = 'ankomst' | 'avreise'

export type ChecklistItem = {
  id: string
  cabin_id: string
  kind: ChecklistKind
  text: string
  hint: string | null
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ChecklistRun = {
  id: string
  cabin_id: string
  kind: ChecklistKind
  completed_by: string | null
  completed_at: string
}

export type Stay = {
  id: string
  cabin_id: string
  /** Medlemmet oppholdet gjelder, eller null når det gjelder noen som ikke bruker appen. */
  user_id: string | null
  guest_name: string | null
  start_date: string
  end_date: string
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CalendarEvent = {
  id: string
  cabin_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  /** «10:00:00», eller null for hele dagen. */
  start_time: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type HistoryEntry = {
  id: string
  cabin_id: string
  happened_on: string
  title: string
  description: string | null
  photo_path: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Felter serveren fyller inn; brukes når en ny rad vises før den er lagret. */
export function draftMeta(cabinId: string, userId: string) {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), cabin_id: cabinId, created_by: userId, created_at: now, updated_at: now }
}
