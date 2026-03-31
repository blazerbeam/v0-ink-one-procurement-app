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

export type ItemStatus = 'expected' | 'confirmed' | 'received' | 'missing' | 'fulfilled'

export interface Package {
  id: string
  event_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  items?: Item[]
}

export interface Item {
  id: string
  event_id: string
  package_id: string | null
  name: string
  description: string | null
  donor_name: string | null
  estimated_value: number | null
  status: ItemStatus
  owner_name: string | null
  created_at: string
  updated_at: string
}

export interface ItemFormData {
  name: string
  description: string
  donor_name: string
  estimated_value: number | string
  status: ItemStatus
  owner_name: string
  package_id: string
}

export interface PackageFormData {
  name: string
  description: string
}
