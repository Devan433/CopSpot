export type ReportType = 'checking' | 'traffic' | 'accident' | 'hazard' | 'other';

export interface Report {
  id: string;
  type: ReportType;
  latitude: number;
  longitude: number;
  description: string;
  created_at: string;
  expires_at: string;
  confirmations: number;
  denials: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

