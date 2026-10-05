// Radene slik de ligger i databasen (se supabase/migrations).

export type TaskKind = 'gjoremal' | 'vedlikehold'

export type Task = {
  id: string
  cabin_id: string
  title: string
  description: string | null
  kind: TaskKind
  responsible_user_id: string | null
  due_date: string | null
  done: boolean
  done_by: string | null
  done_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type IssueStatus = 'ny' | 'pagar' | 'fikset'

export type Issue = {
  id: string
  cabin_id: string
  title: string
  description: string | null
  status: IssueStatus
  photo_path: string | null
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

/** Felter serveren fyller inn; brukes når en ny rad vises før den er lagret. */
export function draftMeta(cabinId: string, userId: string) {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), cabin_id: cabinId, created_by: userId, created_at: now, updated_at: now }
}
