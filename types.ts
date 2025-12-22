
export type Role = 'guest' | 'staff' | 'admin' | 'developer';

export type QuestionType = 'yes_no' | 'likert' | 'text' | 'nps';

export type QuestionVisibility = 'all' | 'staff_only';

export type QuestionCategory = 'all' | 'inpatient' | 'discharge';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  order: number;
  visibility: QuestionVisibility;
  category?: QuestionCategory;
}

export interface PatientInfo {
  name: string;
  nationalId: string;
  gender: 'Male' | 'Female';
  birthDate: string; 
  mobile: string;
  address: string;
  admissionDate: string; 
}

export interface InsuranceInfo {
  type: 'SocialSecurity' | 'Supplementary' | 'Both' | 'None';
  name: string;
}

export interface ClinicalInfo {
  reason: string;
  doctor: string;
  hasSurgery: boolean;
  surgeon?: string;
  surgeryType?: string;
}

export interface DischargeInfo {
  isDischarged: boolean;
  date?: string;
  type?: 'DoctorOrder' | 'PersonalConsent' | 'Death';
  doctor?: string;
}

export interface Feedback {
  id: string;
  trackingId: number;
  source: 'public' | 'staff';
  surveyType?: 'inpatient' | 'discharge';
  registrarUsername?: string; 
  registrarName?: string;    
  status: 'draft' | 'final';
  patientInfo: PatientInfo;
  insuranceInfo: InsuranceInfo;
  clinicalInfo: ClinicalInfo;
  dischargeInfo: DischargeInfo;
  ward: string;
  answers: Record<string, any>;
  audioFiles?: Record<string, string | string[]>; 
  createdAt: string;
  lastModified: string;
}

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  title?: string;
  order?: number;
  password?: string;
  isPasswordEnabled: boolean;
  avatarColor?: string;
}

export interface Settings {
  brandName: string;
  developerPassword?: string;
  iotypeApiKey?: string;
  geminiApiKeys?: string[]; 
  transcriptionMode?: 'iotype' | 'browser' | 'gemini';
  users: AppUser[];
  questions: SurveyQuestion[]; 
  enabledIcons?: string[]; 
}

export enum TimeRange {
  TODAY = 'today',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
  ALL = 'all'
}

export interface SystemLog {
  timestamp: string;
  type: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}
