export type UserRole =
    | 'recepcao'
    | 'enfermeira_triagem'
    | 'enfermeira_medicamento'
    | 'enfermeira_uti'
    | 'auxiliar_enfermagem'
    | 'auxiliar_uti'
    | 'medico'
    | 'medico_uti'
    | 'farmacia'
    | 'gerente'
    | 'gerente_plantao'
    | 'gerente_geral';

export interface Profile {
    id: string;
    name: string;
    role: UserRole;
    specialty?: string | null; // ex: 'Clínico Geral', 'Ortopedia', 'Radiologia', 'Pediatria', 'Intensivista / UTI'
    prefix?: 'Dr.' | 'Dra.' | '' | null;
    crm?: string | null;
    coren?: string | null;
    registration_number?: string | null;
    document_number?: string | null;
    is_health_professional?: boolean;
    created_at?: string;
}

export type PatientStatus =
    | 'aguardando_triagem'
    | 'em_triagem'
    | 'aguardando_atendimento'
    | 'aguardando_atendimento_medico'
    | 'em_atendimento'
    | 'finalizado'
    | 'cancelado';

export interface Patient {
    id: string;
    ticket_number: string;
    name: string;
    cpf?: string | null;
    birth_date?: string | null;
    gender?: string | null;
    phone?: string | null;
    is_priority?: boolean;
    risk_level?: 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul' | string | null;
    status: PatientStatus;
    blood_pressure?: string | null;
    doctor_room?: string | null;
    created_at?: string;
    updated_at?: string;
}