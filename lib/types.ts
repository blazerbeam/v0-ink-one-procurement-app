export interface Org {
  id: string
  name: string
  legal_name: string | null
  dba_name: string | null
  address: string | null
  tax_id: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  mission: string | null
  created_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: string
  created_at: string
}

export interface Business {
  id: string
  org_id: string
  name: string
  category: string | null
  website: string | null
  notes: string | null
  address: string | null
  created_at: string
}

export interface Contact {
  id: string
  business_id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  notes: string | null
  created_at: string
}

export interface Event {
  id: string
  org_id: string | null
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
  // Organization profile fields
  legal_name: string | null
  dba_name: string | null
  org_address: string | null
  tax_id: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
}

export interface EventFormData {
  org_name: string
  event_name: string
  mission: string
  location: string
  event_date: string
  guest_count: number | string
  fundraising_goal: number | string
  // Organization profile fields
  legal_name: string
  dba_name: string
  org_address: string
  tax_id: string
  contact_name: string
  contact_email: string
  contact_phone: string
  website: string
}

export type ItemStatus = 'needed' | 'contacted' | 'confirmed' | 'received' | 'declined' | 'fulfilled'

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
  donor_name: string | null // deprecated, use business_name
  business_id: string | null
  business_name: string | null
  contact_id: string | null
  contact_name: string | null
  estimated_value: number | null
  status: ItemStatus
  owner_name: string | null
  owner_id: string | null
  owner?: Volunteer | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ItemFormData {
  name: string
  description: string
  business_name: string
  contact_name: string
  estimated_value: number | string
  status: ItemStatus
  owner_id: string
  package_id: string
  notes: string
}

export interface PackageFormData {
  name: string
  description: string
}

export interface Volunteer {
  id: string
  event_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface VolunteerFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  notes: string
}

// Signup pages for community donations
export interface SignupPage {
  id: string
  event_id: string
  slug: string
  title: string
  message: string | null
  allow_open_donations: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export interface SignupSubmission {
  id: string
  signup_page_id: string
  donor_name: string
  donor_email: string | null
  donor_phone: string | null
  custom_item_description: string | null
  status: 'pending' | 'confirmed' | 'declined'
  created_at: string
  updated_at: string
  // Joined data
  items?: Item[]
}

export interface SignupSubmissionItem {
  id: string
  submission_id: string
  item_id: string
  created_at: string
}

export interface SignupPageItem {
  id: string
  signup_page_id: string
  item_id: string
  created_at: string
}

// Status display labels
export const STATUS_LABELS: Record<ItemStatus, string> = {
  needed: 'Needed',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  received: 'Received',
  declined: 'Declined',
  fulfilled: 'Fulfilled'
}

// Business Outreach for event-level outreach
export type BusinessOutreachStatus = 'not_contacted' | 'contacted' | 'confirmed' | 'declined'

export interface BusinessOutreach {
  id: string
  org_id: string
  event_id: string
  business_id: string
  contact_id: string | null
  status: BusinessOutreachStatus
  round_number: number
  is_latest: boolean
  last_contacted_at: string | null
  generated_subject_professional: string | null
  generated_body_professional: string | null
  generated_subject_friendly: string | null
  generated_body_friendly: string | null
  generated_subject_enthusiastic: string | null
  generated_body_enthusiastic: string | null
  generated_subject_parent: string | null
  generated_body_parent: string | null
  edited_subject: string | null
  edited_body: string | null
  edited_at: string | null
  created_at: string
  updated_at: string
}

export const OUTREACH_STATUS_LABELS: Record<BusinessOutreachStatus, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  declined: 'Declined'
}

// In-Kind Donation Receipts
export type ReceiptStatus = 'draft' | 'sent'

export interface Receipt {
  id: string
  org_id: string
  business_id: string
  contact_id: string | null
  status: ReceiptStatus
  receipt_date: string
  sent_at: string | null
  // Snapshot fields for historical integrity
  snapshot_org_name: string
  snapshot_org_tax_id: string
  snapshot_donor_name: string
  snapshot_business_name: string
  snapshot_business_address: string | null
  snapshot_contact_email: string | null
  body_text: string
  created_at: string
  updated_at: string
}

export interface ReceiptItem {
  id: string
  receipt_id: string
  item_id: string
  snapshot_item_name: string
  snapshot_estimated_value: number | null
  created_at: string
}

export interface ReceiptWithItems extends Receipt {
  items: ReceiptItem[]
}

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  draft: 'Draft',
  sent: 'Sent'
}
