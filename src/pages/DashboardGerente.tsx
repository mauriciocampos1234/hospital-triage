import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { Patient, Profile } from '../types';
import { NovoColaboradorModal } from '../components/modals/NovoColaboradorModal';
import { EditarColaboradorModal } from '../components/modals/EditarColaboradorModal';
import {
    BarChart3, Users, UserPlus, Clock, CheckCircle2,
    LogOut, ShieldCheck, Activity, Search, Contact, Edit3, Trash2
} from 'lucide-react';

export const DashboardGerente: React.FC = () => {
    const { profile, signOut } = useAuth();

    // Abas do Painel
    const [activeTab, setActiveTab] = useState<'fluxo' | 'colaboradores' | 'pacientes'>('fluxo');

    // Estados de Dados
    const [patients, setPatients] = useState<Patient[]>([]);
    const [collaborators, setCollaborators] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados de Modais
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCollaborator, setSelectedCollaborator] = useState<Profile | null>(null);

    // Filtros de busca
    const [searchCollaborator, setSearchCollaborator] = useState('');
    const [searchPatient, setSearchPatient] = useState('');

    const fetchData = useCallback(async () => {
        try {
            // 1. Busca pacientes
            const { data: patientData } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });

            setPatients((patientData as Patient[]) || []);

            // 2. Busca colaboradores cadastrados
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .order('name', { ascending: true });

            setCollaborators((profileData as Profile[]) || []);
        } catch (err) {
            console.error('Erro ao carregar dados do painel:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 0);

        const channel = supabase
            .channel('public:patients:manager')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    // Função para Deletar Colaborador (DELETE)
    // Função para Deletar Colaborador (DELETE)
    const handleDeleteCollaborator = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza de que deseja remover o colaborador "${name}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Atualiza estado local imediatamente e sincroniza com o banco
            setCollaborators((prev) => prev.filter((c) => c.id !== id));
            fetchData();
        } catch (err: unknown) {
            console.error('Erro ao excluir colaborador:', err);
            const errorMessage = err instanceof Error ? err.message : 'Verifique suas permissões no Supabase (RLS).';
            alert(`Erro ao excluir registro: ${errorMessage}`);
        }
    };

    // Métricas de Pacientes
    const totalPatients = patients.length;
    const waitingTriage = patients.filter((p) => p.status === 'aguardando_triagem').length;
    const waitingDoctor = patients.filter((p) => 
        p.status === 'aguardando_atendimento_medico' || p.status === 'aguardando_atendimento'
    ).length;
    const completed = patients.filter((p) => p.status === 'finalizado').length;

    // Filtro Seguro de Colaboradores
    const filteredCollaborators = collaborators.filter((c) =>
        (c.name || '').toLowerCase().includes(searchCollaborator.toLowerCase()) ||
        (c.role || '').toLowerCase().includes(searchCollaborator.toLowerCase())
    );

    // Filtro Seguro de Pacientes
    const filteredPatients = patients.filter((p) =>
        (p.name || '').toLowerCase().includes(searchPatient.toLowerCase()) ||
        (p.cpf || '').includes(searchPatient) ||
        (p.ticket_number || '').toLowerCase().includes(searchPatient.toLowerCase())
    );

    const formatRoleName = (role: string, specialty?: string | null) => {
        switch (role) {
            case 'gerente_geral': return 'Gerente Geral';
            case 'gerente_plantao': return 'Gerente de Plantão';
            case 'gerente': return 'Gerente Administrativo';
            case 'medico': return specialty ? `Médico(a) (${specialty})` : 'Médico(a)';
            case 'medico_uti': return specialty ? `Médico(a) UTI (${specialty})` : 'Médico(a) Intensivista (UTI)';
            case 'enfermeira_triagem': return 'Enfermeiro(a) - Triagem';
            case 'enfermeira_medicamento': return 'Enfermeiro(a) - Medicação';
            case 'enfermeira_uti': return 'Enfermeiro(a) - UTI / Emergência';
            case 'auxiliar_enfermagem': return 'Auxiliar / Téc. Enfermagem';
            case 'auxiliar_uti': return 'Aux. Enfermagem - UTI / Emergência';
            case 'farmacia': return 'Farmácia / Insumos';
            case 'recepcao':
            case 'recepcionista': return 'Recepção / Atendimento';
            default: return role || 'Não informado';
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header Superior Responsivo */}
            <header className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/30 shrink-0">
                        <ShieldCheck className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base sm:text-xl font-bold truncate">Painel de Gerência & Monitoramento</h1>
                        <p className="text-xs text-slate-400 truncate">
                            Gestor: {profile?.name} ({formatRoleName(profile?.role || '')})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 sm:px-4 py-2.5 rounded-xl shadow transition whitespace-nowrap"
                    >
                        <UserPlus className="w-4 h-4 shrink-0" /> 
                        <span>Cadastrar Colaborador</span>
                    </button>

                    <button
                        onClick={signOut}
                        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 text-xs px-3 sm:px-4 py-2.5 rounded-xl transition whitespace-nowrap shrink-0"
                    >
                        <LogOut className="w-4 h-4 shrink-0" /> 
                        <span>Sair</span>
                    </button>
                </div>
            </header>

            {/* Navegação por Abas */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-3 overflow-x-auto">
                <div className="max-w-7xl mx-auto flex gap-4 sm:gap-6 whitespace-nowrap">
                    <button
                        onClick={() => setActiveTab('fluxo')}
                        className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'fluxo'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" /> Fluxo de Atendimento
                    </button>

                    <button
                        onClick={() => setActiveTab('colaboradores')}
                        className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'colaboradores'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Contact className="w-4 h-4" /> Colaboradores ({collaborators.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('pacientes')}
                        className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'pacientes'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Users className="w-4 h-4" /> Todos os Pacientes ({patients.length})
                    </button>
                </div>
            </div>

            {/* Conteúdo do Painel */}
            <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">

                {/* ABA 1: FLUXO DE ATENDIMENTO */}
                {activeTab === 'fluxo' && (
                    <div className="space-y-6">
                        {/* Cards de Métricas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Geral</span>
                                    <span className="text-3xl font-black text-slate-800">{totalPatients}</span>
                                </div>
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Na Triagem</span>
                                    <span className="text-3xl font-black text-amber-600">{waitingTriage}</span>
                                </div>
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                    <Clock className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fila Médica</span>
                                    <span className="text-3xl font-black text-blue-600">{waitingDoctor}</span>
                                </div>
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <Activity className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Concluídos</span>
                                    <span className="text-3xl font-black text-emerald-600">{completed}</span>
                                </div>
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* Tabela do Fluxo */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-indigo-600" /> Fluxo em Tempo Real
                            </h2>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                            <th className="py-3 px-3">Senha</th>
                                            <th className="py-3 px-3">Nome</th>
                                            <th className="py-3 px-3">Prioridade</th>
                                            <th className="py-3 px-3">Classificação</th>
                                            <th className="py-3 px-3">Status</th>
                                            <th className="py-3 px-3">Médico / Sala</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-slate-400">Carregando relatório...</td>
                                            </tr>
                                        ) : patients.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-slate-400">Nenhum registro no momento.</td>
                                            </tr>
                                        ) : (
                                            patients.map((p) => (
                                                <tr key={p.id} className="hover:bg-slate-50 transition">
                                                    <td className="py-3 px-3 font-bold text-indigo-600">{p.ticket_number || '---'}</td>
                                                    <td className="py-3 px-3 font-semibold text-slate-800">{p.name}</td>
                                                    <td className="py-3 px-3">
                                                        {p.is_priority ? (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                                                Preferencial
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">Normal</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className="uppercase font-bold text-[10px] text-slate-600">
                                                            {p.risk_level || 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                            p.status === 'aguardando_triagem'
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : p.status === 'aguardando_atendimento_medico' || p.status === 'aguardando_atendimento'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : p.status === 'em_atendimento'
                                                                        ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                                                                        : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {(p.status || '').replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-600 font-medium">
                                                        {p.doctor_room || '---'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 2: CONSULTA E GESTÃO DE COLABORADORES */}
                {activeTab === 'colaboradores' && (
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Contact className="w-5 h-5 text-indigo-600" /> Corpo de Colaboradores do Hospital
                                </h2>
                                <p className="text-xs text-slate-400">Gerencie permissões, edite dados ou remova acessos de funcionários</p>
                            </div>

                            <div className="relative w-full sm:w-72">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={searchCollaborator}
                                    onChange={(e) => setSearchCollaborator(e.target.value)}
                                    placeholder="Buscar por nome ou cargo..."
                                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <th className="py-3 px-3">Nome Profissional</th>
                                        <th className="py-3 px-3">Função / Cargo</th>
                                        <th className="py-3 px-3">Identificação / Conselho</th>
                                        <th className="py-3 px-3">Data de Cadastro</th>
                                        <th className="py-3 px-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredCollaborators.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-slate-400">Nenhum colaborador localizado.</td>
                                        </tr>
                                    ) : (
                                        filteredCollaborators.map((c) => (
                                            <tr key={c.id} className="hover:bg-slate-50 transition">
                                                <td className="py-3 px-3 font-bold text-slate-800">
                                                    {c.prefix ? `${c.prefix} ` : ''}{c.name}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {formatRoleName(c.role, c.specialty)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-slate-500 font-semibold">
                                                    {c.crm 
                                                        ? `CRM: ${c.crm}` 
                                                        : c.coren 
                                                            ? `COREN: ${c.coren}` 
                                                            : c.registration_number 
                                                                ? `Matrícula: ${c.registration_number}` 
                                                                : c.document_number 
                                                                    ? `Doc: ${c.document_number}` 
                                                                    : 'N/A'}
                                                </td>
                                                <td className="py-3 px-3 text-slate-400">
                                                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '---'}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCollaborator(c);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                                                            title="Editar dados"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCollaborator(c.id, c.name)}
                                                            className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition"
                                                            title="Excluir colaborador"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ABA 3: HISTÓRICO COMPLETO DE PACIENTES */}
                {activeTab === 'pacientes' && (
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-600" /> Registro Geral de Pacientes
                                </h2>
                                <p className="text-xs text-slate-400">Histórico de pacientes que deram entrada no atendimento</p>
                            </div>

                            <div className="relative w-full sm:w-72">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={searchPatient}
                                    onChange={(e) => setSearchPatient(e.target.value)}
                                    placeholder="Buscar por nome, CPF ou senha..."
                                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <th className="py-3 px-3">Senha</th>
                                        <th className="py-3 px-3">Nome Paciente</th>
                                        <th className="py-3 px-3">CPF</th>
                                        <th className="py-3 px-3">Data Nasc.</th>
                                        <th className="py-3 px-3">Pressão / PA</th>
                                        <th className="py-3 px-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredPatients.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-6 text-center text-slate-400">Nenhum paciente cadastrado.</td>
                                        </tr>
                                    ) : (
                                        filteredPatients.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50 transition">
                                                <td className="py-3 px-3 font-bold text-indigo-600">{p.ticket_number || '---'}</td>
                                                <td className="py-3 px-3 font-bold text-slate-800">{p.name}</td>
                                                <td className="py-3 px-3 text-slate-500">{p.cpf || '---'}</td>
                                                <td className="py-3 px-3 text-slate-500">{p.birth_date || '---'}</td>
                                                <td className="py-3 px-3 font-semibold text-slate-700">{p.blood_pressure || 'Pendente'}</td>
                                                <td className="py-3 px-3">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                        p.status === 'aguardando_triagem'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : p.status === 'aguardando_atendimento_medico' || p.status === 'aguardando_atendimento'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : p.status === 'em_atendimento'
                                                                    ? 'bg-indigo-100 text-indigo-700'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {(p.status || '').replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>

            {/* Modal de Criação de Colaborador */}
            <NovoColaboradorModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchData}
            />

            {/* Modal de Edição de Colaborador */}
            <EditarColaboradorModal
                isOpen={isEditModalOpen}
                collaborator={selectedCollaborator}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedCollaborator(null);
                }}
                onSuccess={fetchData}
            />
        </div>
    );
};