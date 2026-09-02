export type UserRole =
    | 'recepcao'
    | 'recepcionista'
    | 'medico'
    | 'gerente'
    | 'gerente_plantao'
    | 'gerente_geral';

export type RiskLevel = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul';

export interface Profile {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    crm?: string | null;
    specialty?: string | null;
    created_at?: string;
}

export interface Patient {
    id: string;
    name: string;
    cpf: string;
    birth_date: string;
    ticket_number: string;
    is_priority: boolean;
    status: 'aguardando_triagem' | 'aguardando_atendimento_medico' | 'em_atendimento' | 'finalizado';
    risk_level?: RiskLevel | null;
    symptoms?: string | null;
    blood_pressure?: string | null;
    heart_rate?: number | null;
    temperature?: number | null;
    oxygen_saturation?: number | null;
    doctor_room?: string | null;
    called_at?: string | null;
    created_at?: string;
}