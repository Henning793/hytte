// Edge Function «push»: sender push-varsler til de i hytta som har slått dem på.
//
// Kalles bare fra databasen (se migrasjonen 20261007090000_push.sql):
//   { "table": "issues" | "calendar_events" | "stays" | "tasks", "id": "<uuid>" }  når noe nytt legges inn
//   { "kind": "reminders" }                                                          hver dag, for hendelser i morgen
// Kallet må ha headeren x-push-secret med hemmeligheten fra Vault.
//
// Utrulling: supabase functions deploy push --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type Pref = 'issues' | 'events' | 'reminders' | 'stays' | 'tasks'

type Message = {
  cabinId: string
  pref: Pref
  /** Den som gjorde det får ikke varsel. */
  actor: string | null
  title: string
  body: string
  url: string
  tag: string
}

const DEFAULTS: Record<Pref, boolean> = { issues: true, events: true, reminders: true, stays: false, tasks: false }

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

// ---------------------------------------------------------------------------
// Datoer (norsk tid)
// ---------------------------------------------------------------------------

const osloDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' }).format(d)
const fromIso = (iso: string) => new Date(`${iso}T12:00:00Z`)
const dayMonth = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekdayDay = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })

/** «lørdag 10. okt.» eller «10.–14. okt.» */
function formatDates(start: string, end: string): string {
  if (start === end) return weekdayDay.format(fromIso(start))
  const a = fromIso(start)
  const b = fromIso(end)
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}.–${dayMonth.format(b)}`
  return `${dayMonth.format(a)}–${dayMonth.format(b)}`
}

const clock = (time: string | null) => (time ? ` kl. ${time.slice(0, 5)}` : '')

// ---------------------------------------------------------------------------
// Oppslag
// ---------------------------------------------------------------------------

async function cabinName(id: string): Promise<string> {
  const { data } = await db.from('cabins').select('name').eq('id', id).single()
  return data?.name ?? 'hytta'
}

async function firstName(id: string | null): Promise<string> {
  if (!id) return 'Noen'
  const { data } = await db.from('profiles').select('first_name').eq('id', id).single()
  return data?.first_name ?? 'Noen'
}

async function messageForRow(table: string, id: string): Promise<Message[]> {
  if (table === 'issues') {
    const { data: r } = await db.from('issues').select('cabin_id, title, created_by').eq('id', id).single()
    if (!r) return []
    return [{
      cabinId: r.cabin_id,
      pref: 'issues',
      actor: r.created_by,
      title: `Ny feil på ${await cabinName(r.cabin_id)}`,
      body: `${await firstName(r.created_by)}: ${r.title}`,
      url: `/feil/${id}`,
      tag: `issue-${id}`,
    }]
  }
  if (table === 'calendar_events') {
    const { data: r } = await db
      .from('calendar_events')
      .select('cabin_id, title, start_date, end_date, start_time, created_by')
      .eq('id', id)
      .single()
    if (!r) return []
    return [{
      cabinId: r.cabin_id,
      pref: 'events',
      actor: r.created_by,
      title: `Ny hendelse på ${await cabinName(r.cabin_id)}`,
      body: `${r.title}, ${formatDates(r.start_date, r.end_date)}${clock(r.start_time)}`,
      url: '/mer/kalender',
      tag: `event-${id}`,
    }]
  }
  if (table === 'stays') {
    const { data: r } = await db
      .from('stays')
      .select('cabin_id, user_id, guest_name, start_date, end_date, created_by')
      .eq('id', id)
      .single()
    if (!r) return []
    const who = r.guest_name ?? (await firstName(r.user_id))
    return [{
      cabinId: r.cabin_id,
      pref: 'stays',
      actor: r.created_by,
      title: `${who} skal på ${await cabinName(r.cabin_id)}`,
      body: formatDates(r.start_date, r.end_date),
      url: '/mer/kalender',
      tag: `stay-${id}`,
    }]
  }
  if (table === 'tasks') {
    const { data: r } = await db.from('tasks').select('cabin_id, title, done, created_by').eq('id', id).single()
    if (!r || r.done) return []
    return [{
      cabinId: r.cabin_id,
      pref: 'tasks',
      actor: r.created_by,
      title: `Nytt gjøremål på ${await cabinName(r.cabin_id)}`,
      body: `${await firstName(r.created_by)}: ${r.title}`,
      url: `/gjoremal/${id}`,
      tag: `task-${id}`,
    }]
  }
  return []
}

async function reminders(): Promise<Message[]> {
  const tomorrow = osloDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
  const { data } = await db
    .from('calendar_events')
    .select('id, cabin_id, title, start_time')
    .eq('start_date', tomorrow)
  const out: Message[] = []
  for (const e of data ?? []) {
    out.push({
      cabinId: e.cabin_id,
      pref: 'reminders',
      actor: null,
      title: `I morgen: ${e.title}`,
      body: `${await cabinName(e.cabin_id)}${clock(e.start_time)}`,
      url: '/mer/kalender',
      tag: `reminder-${e.id}`,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

async function send(msg: Message): Promise<number> {
  const { data: members } = await db.from('cabin_members').select('user_id').eq('cabin_id', msg.cabinId)
  const userIds = (members ?? []).map((m) => m.user_id as string).filter((u) => u !== msg.actor)
  if (!userIds.length) return 0

  const { data: prefs } = await db.from('notification_prefs').select('*').in('user_id', userIds)
  const wants = new Map((prefs ?? []).map((p) => [p.user_id as string, Boolean(p[msg.pref])]))
  const receivers = userIds.filter((u) => wants.get(u) ?? DEFAULTS[msg.pref])
  if (!receivers.length) return 0

  const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', receivers)
  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    // Hytta åpnes når man trykker på varselet, selv om en annen hytte var valgt.
    url: `${msg.url}?hytte=${msg.cabinId}`,
    tag: msg.tag,
  })

  let sent = 0
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
        })
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        // Abonnementet finnes ikke lenger (appen er slettet, varsler skrudd av i telefonen).
        if (status === 404 || status === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        } else {
          console.error('Push feilet', status, (err as Error).message)
        }
      }
    }),
  )
  return sent
}

Deno.serve(async (req) => {
  const { data: settings, error } = await db.rpc('push_settings')
  if (error || !settings?.push_secret || !settings.push_vapid_private) {
    return new Response('Push er ikke satt opp', { status: 503 })
  }
  if (req.headers.get('x-push-secret') !== settings.push_secret) {
    return new Response('Ingen tilgang', { status: 401 })
  }
  webpush.setVapidDetails(
    settings.push_vapid_subject ?? 'mailto:post@example.com',
    settings.push_vapid_public,
    settings.push_vapid_private,
  )

  const body = await req.json().catch(() => ({}))
  const messages = body.kind === 'reminders' ? await reminders() : await messageForRow(body.table, body.id)
  let sent = 0
  for (const m of messages) sent += await send(m)
  return Response.json({ messages: messages.length, sent })
})
