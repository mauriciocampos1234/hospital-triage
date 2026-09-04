import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Profile, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { NovoColaboradorModal } from '../components/modals/NovoColaboradorModal';
import { EditarColaboradorModal } from '../components/modals/EditarColaboradorModal';
import { 
    Users, 
    UserPlus, 
    Stethoscope, 
    Search, 
    RefreshCw, 
    LogOut, 
    BadgeCheck, 
    Building2,
    Briefcase,
    Sparkles,
    UserCheck,
    UserCog,
    HeartPulse,
    ShieldCheck,
    UserPlus2,
    X
} from 'lucide-react';

// Categorias Principais para as Abas
const MAIN_CATEGORIES = [
    'TODAS',
    'Médicos',
    'Enfermeiros',
    'Auxiliares de Enfermagem',
    'Recepção',
    'Limpeza & Higienização',
    'Gestão & Administração'
] as const;

export const DashboardGerente: React.FC = () => {
    const { user, profile, signOut } = useAuth();
    const [collaborators, setCollaborators] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('TODAS');

    // Mapeamento local de Assistentes/Apoio do Dia por Colaborador (ID Médico -> Nome/ID Auxiliar)
    const [dailyAssignments, setDailyAssignments] = useState<Record<string, { assistantName: string; isShiftManager?: boolean }>>({});

    // Modais
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCollaborator, setEditingCollaborator] = useState<Profile | null>(null);
    const [assigningDoctor, setAssigningDoctor] = useState<Profile | null>(null);
    const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');

    const loadCollaborators = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setCollaborators(data || []);
        } catch (err) {
            console.error('Erro ao buscar colaboradores:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        await loadCollaborators();
    };

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('name', { ascending: true });

                if (isMounted) {
                    if (error) throw error;
                    setCollaborators(data || []);
                }
            } catch (err) {
                console.error('Erro ao buscar colaboradores:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, []);

    // Classifica o colaborador na Macro-Categoria exata
    const getCollaboratorCategory = (c: Profile): string => {
        const r = (c.role || '').toLowerCase();
        if (r.includes('medico')) return 'Médicos';
        if (r.includes('auxiliar')) return 'Auxiliares de Enfermagem';
        if (r.includes('enferm') || r.includes('triagem')) return 'Enfermeiros';
        if (r.includes('recep')) return 'Recepção';
        if (r.includes('limpeza') || r.includes('higieniz') || r.includes('servicos_gerais')) return 'Limpeza & Higienização';
        if (r.includes('gerente')) return 'Gestão & Administração';
        return 'Outros';
    };

    // Ícones temáticos para cada aba
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Médicos': return <Stethoscope className="w-3.5 h-3.5 text-blue-400" />;
            case 'Enfermeiros': return <HeartPulse className="w-3.5 h-3.5 text-rose-400" />;
            case 'Auxiliares de Enfermagem': return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
            case 'Recepção': return <UserCog className="w-3.5 h-3.5 text-purple-400" />;
            case 'Limpeza & Higienização': return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
            case 'Gestão & Administração': return <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />;
            default: return <Users className="w-3.5 h-3.5 text-slate-400" />;
        }
    };

    // Lista de potenciais assistentes (Enfermeiros e Auxiliares)
    const availableAssistants = useMemo(() => {
        return collaborators.filter(c => {
            const cat = getCollaboratorCategory(c);
            return cat === 'Enfermeiros' || cat === 'Auxiliares de Enfermagem';
        });
    }, [collaborators]);

    // Filtragem por Busca e Categoria
    const filteredCollaborators = useMemo(() => {
        return collaborators.filter((c) => {
            const matchesSearch = 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.specialty && c.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.document_number && c.document_number.includes(searchTerm)) ||
                (c.crm && c.crm.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.coren && c.coren.toLowerCase().includes(searchTerm.toLowerCase()));

            const category = getCollaboratorCategory(c);
            const matchesTab = selectedCategoryTab === 'TODAS' || category === selectedCategoryTab;

            return matchesSearch && matchesTab;
        });
    }, [collaborators, searchTerm, selectedCategoryTab]);

    const formatRoleLabel = (role: UserRole | string) => {
        const map: Record<string, string> = {
            gerente_geral: 'Gerente Geral',
            gerente_plantao: 'Gerente de Plantão',
            gerente: 'Gerente',
            recepcao: 'Recepção',
            recepcionista: 'Recepcionista',
            triagem: 'Enfermeiro(a) Triagem',
            enfermeiro: 'Enfermeiro(a)',
            enfermagem: 'Equipe Enfermagem',
            enfermeira_triagem: 'Enfermeira Triagem',
            enfermeira_medicamento: 'Enfermeira Medicação',
            enfermeira_uti: 'Enfermeira UTI',
            auxiliar_enfermagem: 'Aux. Enfermagem',
            auxiliar_uti: 'Aux. UTI',
            limpeza: 'Agente de Higienização',
            higienizacao: 'Equipe de Limpeza',
            servicos_gerais: 'Serviços Gerais',
            medico: 'Médico(a)',
            medico_uti: 'Médico(a) UTI',
        };
        return map[role] || role;
    };

    const handleSaveAssignment = () => {
        if (!assigningDoctor) return;
        
        const assistant = availableAssistants.find(a => a.id === selectedAssistantId);
        setDailyAssignments(prev => ({
            ...prev,
            [assigningDoctor.id]: {
                assistantName: assistant ? assistant.name : '',
            }
        }));
        setAssigningDoctor(null);
        setSelectedAssistantId('');
    };

    const toggleShiftManager = (collabId: string) => {
        setDailyAssignments(prev => ({
            ...prev,
            [collabId]: {
                ...prev[collabId],
                assistantName: prev[collabId]?.assistantName || '',
                isShiftManager: !prev[collabId]?.isShiftManager
            }
        }));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Topbar */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white leading-tight tracking-wide">Painel de Gestão Hospitalar</h1>
                        <p className="text-xs text-slate-400">Escala de Plantão, Quadro Profissional e Vínculos</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <span className="block text-xs font-bold text-slate-200">{profile?.name || user?.email}</span>
                        <span className="block text-[10px] text-indigo-400 uppercase font-semibold">
                            {profile?.role ? formatRoleLabel(profile.role) : 'Gestão'}
                        </span>
                    </div>

                    <button 
                        onClick={signOut}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition"
                        title="Encerrar Sessão"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

                {/* Banner e Ações */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Quadro Geral de Colaboradores</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Total de <strong className="text-indigo-400">{collaborators.length}</strong> profissionais registrados
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleRefresh}
                            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl transition"
                            title="Atualizar dados"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-indigo-600/30 transition"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Novo Colaborador</span>
                        </button>
                    </div>
                </div>

                {/* Pesquisa */}
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, especialidade, CRM, COREN ou CPF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-2xl pl-11 pr-4 py-3 text-xs outline-none focus:border-indigo-500 transition shadow-inner"
                    />
                </div>

                {/* MACRO-ABAS ORGANIZADAS */}
                <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                        Filtrar por Setor / Categoria
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
                        {MAIN_CATEGORIES.map((category) => {
                            const count = category === 'TODAS' 
                                ? collaborators.length 
                                : collaborators.filter(c => getCollaboratorCategory(c) === category).length;

                            const isActive = selectedCategoryTab === category;

                            return (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategoryTab(category)}
                                    className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                                        isActive
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25'
                                            : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                    }`}
                                >
                                    {getCategoryIcon(category)}
                                    <span>{category}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* LISTAGEM DOS CARDS */}
                {loading ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
                        Carregando equipe médica e administrativa...
                    </div>
                ) : filteredCollaborators.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
                        Nenhum colaborador encontrado nesta categoria.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCollaborators.map((item) => {
                            const category = getCollaboratorCategory(item);
                            const assignment = dailyAssignments[item.id];
                            const isDoctor = category === 'Médicos';

                            return (
                                <div 
                                    key={item.id}
                                    className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 transition flex flex-col justify-between space-y-4 shadow-lg group relative overflow-hidden"
                                >
                                    <div className="space-y-3">
                                        {/* Tag de Gerente do Dia / Plantão */}
                                        {assignment?.isShiftManager && (
                                            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl flex items-center gap-1.5 w-fit">
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                <span>Gerente de Plantão do Dia</span>
                                            </div>
                                        )}

                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                {/* Especialidade destacada nos Médicos */}
                                                {item.specialty && (
                                                    <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block">
                                                        {item.specialty}
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-slate-100 text-base leading-tight group-hover:text-indigo-300 transition mt-0.5">
                                                    {item.prefix ? `${item.prefix} ` : ''}{item.name}
                                                </h3>
                                            </div>
                                            <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold rounded-xl shrink-0">
                                                {formatRoleLabel(item.role)}
                                            </span>
                                        </div>

                                        {/* Registros Profissionais */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                                            {item.crm && (
                                                <div className="flex items-center gap-2">
                                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>CRM: <strong className="text-slate-200">{item.crm}</strong></span>
                                                </div>
                                            )}
                                            {item.coren && (
                                                <div className="flex items-center gap-2">
                                                    <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />
                                                    <span>COREN: <strong className="text-slate-200">{item.coren}</strong></span>
                                                </div>
                                            )}
                                            {item.crf && (
                                                <div className="flex items-center gap-2">
                                                    <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                                                    <span>CRF: <strong className="text-slate-200">{item.crf}</strong></span>
                                                </div>
                                            )}
                                            {item.registration_number && (
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                                                    <span>Matrícula: <strong className="text-slate-300">{item.registration_number}</strong></span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Assistente Atribuído do Dia */}
                                        {assignment?.assistantName && (
                                            <div className="p-2.5 bg-indigo-950/40 border border-indigo-800/40 rounded-2xl flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 text-indigo-300">
                                                    <UserCheck className="w-4 h-4 text-indigo-400" />
                                                    <span>Apoio: <strong>{assignment.assistantName}</strong></span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Ações / Atribuição de Plantão */}
                                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => toggleShiftManager(item.id)}
                                            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1 ${
                                                assignment?.isShiftManager
                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                                            }`}
                                            title="Definir responsável do plantão"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>{assignment?.isShiftManager ? 'Gerente Ativo' : 'Tornar Gerente'}</span>
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                            {isDoctor && (
                                                <button
                                                    onClick={() => {
                                                        setAssigningDoctor(item);
                                                        setSelectedAssistantId('');
                                                    }}
                                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 rounded-xl transition"
                                                    title="Vincular Auxiliar / Enfermeiro do dia"
                                                >
                                                    <UserPlus2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setEditingCollaborator(item)}
                                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 px-3 py-1.5 rounded-xl transition"
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL PARA VINCULAR AUXILIAR / ENFERMEIRO DE APOIO */}
            {assigningDoctor && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white">Vincular Equipe de Apoio</h3>
                                <p className="text-xs text-slate-400">
                                    Defina o enfermeiro ou auxiliar responsável para {assigningDoctor.name}
                                </p>
                            </div>
                            <button 
                                onClick={() => setAssigningDoctor(null)}
                                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Selecionar Auxiliar / Enfermeiro do Dia
                            </label>
                            <select
                                value={selectedAssistantId}
                                onChange={(e) => setSelectedAssistantId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                            >
                                <option value="">Sem auxiliar atribuído</option>
                                {availableAssistants.map((assistant) => (
                                    <option key={assistant.id} value={assistant.id}>
                                        {assistant.name} ({formatRoleLabel(assistant.role)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                            <button
                                onClick={() => setAssigningDoctor(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveAssignment}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
                            >
                                Salvar Vínculo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modais de Cadastro e Edição */}
            {isAddModalOpen && (
                <NovoColaboradorModal 
                    isOpen={isAddModalOpen} 
                    onClose={() => setIsAddModalOpen(false)} 
                    onSuccess={loadCollaborators} 
                />
            )}

            {editingCollaborator && (
                <EditarColaboradorModal 
                    isOpen={!!editingCollaborator}
                    collaborator={editingCollaborator} 
                    onClose={() => setEditingCollaborator(null)} 
                    onSuccess={loadCollaborators} 
                />
            )}
        </div>
    );
};

export default DashboardGerente;