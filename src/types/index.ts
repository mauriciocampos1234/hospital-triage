export type UserRole =
    | 'recepcao'
    | 'recepcionista'
    | 'medico'
    | 'gerente'
    | 'gerente_plantao'
    | 'gerente_geral';

export type RiskLevel = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul';

export type TriageStatus =
    | 'aguardando_triagem'
    | 'aguardando'
    | 'em_atendimento'
    | 'chamado'
    | 'atendido'
    | 'cancelado';

export interface Profile {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    crm?: string | null;        // <-- Adicionado aqui
    specialty?: string | null;  // <-- Adicionado para especialidades médicas
    created_at?: string;
}

export interface Triage {
    id: string;
    patient_id?: string;
    patient_name: string;
    cpf: string;
    blood_pressure?: string | null;
    height?: string | null;
    weight?: string | null;
    symptoms?: string | null;
    risk_level?: RiskLevel | string;
    triage_staff_id?: string | null;
    doctor_id?: string | null;
    status: TriageStatus | string;
    created_at: string;
    updated_at?: string;
}