// Enums
export enum OrgType {
  UNIVERSITY = 'UNIVERSITY',
  STUDENT_CLUB = 'STUDENT_CLUB',
  STUDENT_ASSOCIATION = 'STUDENT_ASSOCIATION',
  COMPANY = 'COMPANY',
  NON_PROFIT = 'NON_PROFIT',
  IN_HOUSE = 'IN_HOUSE'
}

export enum OrgRole {
  FOUNDER = 'FOUNDER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER'
}

export enum CompetitionFormat {
  IN_PERSON = 'IN_PERSON',
  VIRTUAL = 'VIRTUAL',
  HYBRID = 'HYBRID'
}

export enum ResourceType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  DECK = 'DECK',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
  OTHER = 'OTHER'
}

// University
export interface University {
  id?: string;
  name: string;
  shortName?: string;
  cities?: string;
  state?: string;
  country?: string;
  description?: string;
  emailDomain?: string;
  logoUrl?: string;
  bannerImageUrl?: string;
  websiteUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Organizer
export interface Organizer {
  orgId?: string;
  orgName: string;
  orgType: OrgType;
  orgShortDescription?: string;
  orgLongDescription?: string;
  licenseId?: string;
  isUniversity?: boolean;
  universityId?: string;
  orgWebsiteUrl?: string;
  orgLogoUrl?: string;
  orgBannerUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Competition
export interface Competition {
  id?: string;
  title: string;
  shortDescription?: string;
  longDescription?: string;
  format?: CompetitionFormat;
  category?: string;
  tags?: string[];
  prizeAmount?: number;
  shortPrizeInfo?: string;
  longPrizeInfo?: string;
  registrationFee?: number;
  registrationInfo?: string;
  eligibilityInfo?: string;
  isInternal?: boolean;
  isFeatured?: boolean;
  isHostedByCaseComp?: boolean;
  isConfirmed?: boolean;
  lastDayToRegister?: string;
  city?: string;
  state?: string;
  country?: string;
  websiteUrl?: string;
  competitionImageUrl?: string;
  teamSizeMin?: number;
  teamSizeMax?: number;
  universityId?: string;
  organizerId?: string;
  timelineId?: string;
  historyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Timeline
export interface Timeline {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Timeline Event
export interface TimelineEvent {
  id?: string;
  timelineId: string;
  name: string;
  date: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// History
export interface History {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

// History Entry
export interface HistoryEntry {
  id?: string;
  historyId: string;
  date: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Gallery Image
export interface GalleryImage {
  id?: string;
  competitionId: string;
  imageUrl: string;
  caption?: string;
  dateTaken?: string;
  createdAt?: string;
}

// Resource
export interface Resource {
  resourceId?: string;
  title: string;
  shortDescription?: string;
  longDescription?: string;
  imageUrl?: string;
  bannerUrl?: string;
  websiteUrl?: string;
  type: ResourceType;
  isPaid?: boolean;
  price?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Log entry for tracking operations
export interface LogEntry {
  rowIndex: number;
  status: 'success' | 'error' | 'skipped';
  timestamp: string;
  message?: string;
  payload?: any;
}
