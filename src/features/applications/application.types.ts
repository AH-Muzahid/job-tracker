export interface TagInfo {
  id: string
  name: string
}

export interface ApplicationTagRelation {
  tag: TagInfo
}

export interface StatusChangeRecord {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: Date | string
}

export interface Application {
  id: string
  userId: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  source: string
  applicationDate: Date | string
  status: string
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  tags?: ApplicationTagRelation[]
  statusChanges?: StatusChangeRecord[]
}

export interface ApplicationQueryFilters {
  search?: string | null
  status?: string | null
  source?: string | null
  sort?: string | null
  tag?: string | null
  page?: number
  pageSize?: number
}

export interface PaginatedApplications {
  data: Application[]
  total: number
  page: number
  pageSize: number
}

export interface CreateApplicationDto {
  companyName: string
  jobTitle: string
  jobUrl?: string | null
  source: string
  applicationDate: string | Date
  status: string
  notes?: string | null
  tagIds?: string[]
}

export interface UpdateApplicationDto {
  companyName?: string
  jobTitle?: string
  jobUrl?: string | null
  source?: string
  applicationDate?: string | Date
  status?: string
  notes?: string | null
  tagIds?: string[]
}
