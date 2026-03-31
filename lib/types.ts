export interface Event {
  id: string
  org_name: string
  event_name: string
  mission: string | null
  location: string | null
  event_date: string | null
  guest_count: number | null
  fundraising_goal: number | null
  items_secured: number
  total_items: number
  status: 'upcoming' | 'active' | 'completed'
  created_at: string
  updated_at: string
}

export interface EventFormData {
  org_name: string
  event_name: string
  mission: string
  location: string
  event_date: string
  guest_count: number | string
  fundraising_goal: number | string
}
