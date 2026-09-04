import { User } from '@supabase/supabase-js';

export type UserRole =
    | 'gerente_geral'
    | 'gerente_plantao'
    | 'gerente'
    | 'recepcao'
    | 'recepcionista'
    | 'triagem'
    | 'enfermeiro'
    | 'enfermagem'
    | 'enfermeira_triagem'
    | 'enfermeira_medicamento'
    | 'enfermeira_uti'
    | 'auxiliar_enfermagem'
    | 'auxiliar_uti'
    | 'farmacia'
    | 'medico'
    | 'medico_uti';

export type RiskLevel =
    | 'vermelho'
    | 'laranja'
    | 'amarelo'
    | 'verde'
    | 'azul'
    | 'emergencia'
    | 'muito_urgente'
    | 'urgente'
    | 'pouco_urgente'
    | 'nao_urgente';

export interface Profile {
    id: string;
    name: string;
    role: UserRole;
    prefix?: '' | 'Dr.' | 'Dra.' | string | null;
    specialty?: string | null;
    crm?: string | null;
    coren?: string | null;
    crf?: string | null;
    registration_number?: string | null;
    document_number?: string | null;
    is_health_professional?: boolean | null;
    created_at?: string;
}

export interface Patient {
    id: string;
    name: string;
    cpf: string;
    rg?: string | null;
    sus_card?: string | null;
    birth_date: string;
    phone?: string | null;
    has_whatsapp?: boolean;
    whatsapp?: string | null;
    is_own_phone?: boolean;
    contact_name?: string | null;
    contact_relationship?: string | null;
    street_type?: string | null;
    address_street?: string | null;
    address_number?: string | null;
    address_neighborhood?: string | null;
    address_complement?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_cep?: string | null;
    is_priority?: boolean;
    is_return?: boolean;
    doctor_id?: string | null;
    doctor_name?: string | null;
    doctor_room?: string | null;
    ticket_number?: string | null;
    specialty?: string | null;
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    status?: string;
    risk_level?: RiskLevel | string | null;
    symptoms?: string | null;
    blood_pressure?: string | null;
    heart_rate?: string | number | null;
    temperature?: string | number | null;
    oxygen_saturation?: string | number | null;
    vital_signs?: Record<string, unknown> | null;
    triaged_at?: string | null;
    triaged_by?: string | null;
    updated_at?: string | null;
    created_at?: string;
}

export interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signIn?: (email: string, password: string) => Promise<Profile | null>;
    signOut: () => Promise<void>;
}