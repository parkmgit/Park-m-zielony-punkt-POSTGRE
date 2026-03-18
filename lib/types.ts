export interface User {
  id: number;
  name: string;
  role: 'admin' | 'brygadzista' | 'pracownik';
  email?: string;
  active: number;
  created_at: string;
}

export interface Project {
  id: number;
  project_number: string;
  name: string;
  location?: string;
  client?: string;
  trees_to_plant: number;
  trees_planted: number;
  active: number;
  created_at: string;
}

export interface Site {
  id: number;
  project_id?: number;
  code: string;
  name: string;
  address?: string;
  active: number;
  created_at: string;
  // Joined data
  project_name?: string;
  project_number?: string;
}

export interface Species {
  id: number;
  name: string;
  scientific_name?: string;
  active: number;
}

export interface Tree {
  id: number;
  tree_number?: string;
  species_id?: number;
  site_id: number;
  worker_id?: number;
  plant_date: string;
  status: 'posadzone' | 'utrzymanie' | 'wymiana' | 'usuniete';
  latitude: number;
  longitude: number;
  accuracy?: number;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined data
  species_name?: string;
  site_name?: string;
  site_code?: string;
  site_address?: string;
  project_id?: number;
  project_name?: string;
  project_number?: string;
  worker_name?: string;
  creator_name?: string;
}

export interface TreeAction {
  id: number;
  tree_id: number;
  action_type: 'posadzenie' | 'podlewanie' | 'przyciecie' | 'inspekcja' | 'wymiana' | 'usuniecie';
  notes?: string;
  performed_by: number;
  performed_at: string;
  // Joined data
  performer_name?: string;
}

export interface Photo {
  id: number;
  entity_type: 'tree' | 'tree_action';
  entity_id: number;
  filename: string;
  url: string;
  thumbnail_url?: string;
  taken_at: string;
  taken_by: number;
  // Joined data
  taker_name?: string;
}

export interface CreateTreeDTO {
  tree_number?: string;
  species_id?: number;
  site_id: number;
  worker_id?: number;
  plant_date: string;
  status: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  notes?: string;
  created_by?: number;
}

export interface CreateTreeActionDTO {
  tree_id?: number;
  action_type: string;
  notes?: string;
  performed_by?: number;
}
