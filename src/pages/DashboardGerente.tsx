import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Stethoscope,
    LogOut,
    Plus,
    Trash2,
    Shield,
    AlertCircle,
    CheckCircle2,
    Users,
    Building2,
    Activity,
    Clock,
    CalendarCheck,
    Edit3
} from 'lucide-react';

interface UserProfile {
    id: string;
    name: string;
    email?: string;
    role: string;
    specialty?: string;
}

interface Room {
    id: string;
    name: string;
    type: string;
}

interface DoctorSchedule {
    id: string;
    doctor_id: string;
    room_id: string | null;
    work_regime: string;
    status: string;
    profiles?: { name: string; specialty: string };
    rooms?: { name: string };
}

export const DashboardGerente: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const isGerenteGeral = profile?.role === 'gerente_geral' || profile?.role === 'gerente';

    const [activeTab, setActiveTab] = useState<'medicos' | 'escalas' | 'gerentes'>('medicos');
    const [usersList, setUsersList] = useState<UserProfile[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    // Modais
    const [modalOpen, setModalOpen] = useState(false);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

    // Estado do formulário de usuários
    const [targetRole, setTargetRole] = useState<'medico' | 'gerente_plantao'>('medico');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Estado do formulário de alocação/escala
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [workRegime, setWorkRegime] = useState('12x36');
    const [scheduleStatus, setScheduleStatus] = useState('ativo');

    // Função manual para recarregar dados após ações do usuário
    const refetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [roomsRes, schedulesRes] = await Promise.all([
                supabase.from('rooms').select('*'),
                supabase.from('doctor_schedules').select('*, profiles(name, specialty), rooms(name)')
            ]);

            let usersData: UserProfile[] = [];
            if (activeTab === 'medicos') {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'medico')
                    .order('name', { ascending: true });
                usersData = data || [];
            } else if (activeTab === 'gerentes') {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'gerente_plantao')
                    .order('name', { ascending: true });
                usersData = data || [];
            }

            setRooms(roomsRes.data || []);
            setSchedules(schedulesRes.data || []);
            setUsersList(usersData);
        } catch (err) {
            console.error('Erro ao recarregar dados:', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    // Efeito isolado para carregamento inicial / mudança de aba
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                const [roomsRes, schedulesRes] = await Promise.all([
                    supabase.from('rooms').select('*'),
                    supabase.from('doctor_schedules').select('*, profiles(name, specialty), rooms(name)')
                ]);

                let usersData: UserProfile[] = [];
                if (activeTab === 'medicos') {
                    const { data } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('role', 'medico')
                        .order('name', { ascending: true });
                    usersData = data || [];
                } else if (activeTab === 'gerentes') {
                    const { data } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('role', 'gerente_plantao')
                        .order('name', { ascending: true });
                    usersData = data || [];
                }

                if (isMounted) {
                    setRooms(roomsRes.data || []);
                    setSchedules(schedulesRes.data || []);
                    setUsersList(usersData);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [activeTab]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    // Cadastro de Usuários via Edge Function
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);

        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email,
                    password,
                    name,
                    role: targetRole,
                    specialty: targetRole === 'medico' ? specialty : null,
                },
            });

            if (error) throw new Error(error.message || 'Erro no servidor.');
            if (data?.error) throw new Error(data.error);

            const labelCreated = targetRole === 'medico' ? 'Médico' : 'Gerente de Plantão';
            setFormSuccess(`${labelCreated} cadastrado(a) com sucesso!`);
            
            setName('');
            setEmail('');
            setPassword('');
            setSpecialty('');
            await refetchData();

            setTimeout(() => {
                setModalOpen(false);
                setFormSuccess(null);
            }, 1800);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao cadastrar profissional.';
            setFormError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // Salvar ou atualizar escala médica
    const handleSaveSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDoctorId) return;

        setSubmitting(true);
        try {
            const { error } = await supabase.from('doctor_schedules').upsert(
                [
                    {
                        doctor_id: selectedDoctorId,
                        room_id: selectedRoomId || null,
                        work_regime: workRegime,
                        status: scheduleStatus,
                        updated_at: new Date().toISOString(),
                    },
                ],
                { onConflict: 'doctor_id' }
            );

            if (error) throw error;

            await refetchData();
            setScheduleModalOpen(false);
            setSelectedDoctorId('');
            setSelectedRoomId('');
        } catch (err) {
            console.error('Erro ao salvar escala:', err);
            alert('Erro ao alocar médico em sala.');
        } finally {
            setSubmitting(false);
        }
    };

    // Exclusão de usuário (exclusivo Gerente Geral)
    const handleDeleteUser = async (id: string, userName: string) => {
        if (!isGerenteGeral) return alert('Permissão negada.');
        if (!confirm(`Deseja realmente remover "${userName}"?`)) return;

        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            await refetchData();
        } catch (err) {
            console.error('Erro ao remover usuário:', err);
        }
    };

    // Cálculos para o Dashboard de Métricas
    const totalMedicos = usersList.length;
    const medicosAtivos = schedules.filter((s) => s.status === 'ativo').length;
    const salasOcupadas = schedules.filter((s) => s.room_id !== null && s.status === 'ativo').length;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Painel de Gerenciamento</h1>
                        <p className="text-xs text-slate-500">
                            Logado como: <span className="font-semibold text-slate-700">{profile?.name || 'Gerente'}</span>
                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase border border-blue-200">
                                {isGerenteGeral ? 'Gerente Geral (RH)' : 'Gerente de Plantão'}
                            </span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded-lg font-medium transition"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                </button>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
                {/* Cards de Métricas / KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">Médicos Cadastrados</p>
                            <p className="text-2xl font-bold text-slate-800">{totalMedicos}</p>
                        </div>
                        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">Em Plantão Ativo</p>
                            <p className="text-2xl font-bold text-emerald-600">{medicosAtivos}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">Salas Ocupadas</p>
                            <p className="text-2xl font-bold text-blue-600">{salasOcupadas} / {rooms.length}</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Building2 className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Navegação por Abas */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
                        <button
                            onClick={() => setActiveTab('medicos')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                activeTab === 'medicos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                            }`}
                        >
                            <Stethoscope className="w-4 h-4" />
                            <span>Equipe Médica</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('escalas')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                activeTab === 'escalas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                            }`}
                        >
                            <CalendarCheck className="w-4 h-4" />
                            <span>Escalas & Salas</span>
                        </button>

                        {isGerenteGeral && (
                            <button
                                onClick={() => setActiveTab('gerentes')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                    activeTab === 'gerentes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                <span>Gerentes de Plantão</span>
                            </button>
                        )}
                    </div>

                    {activeTab !== 'escalas' ? (
                        <button
                            onClick={() => {
                                setTargetRole(activeTab === 'gerentes' ? 'gerente_plantao' : 'medico');
                                setModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
                        >
                            <Plus className="w-5 h-5" />
                            <span>{activeTab === 'medicos' ? 'Novo Médico' : 'Novo Gerente'}</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setScheduleModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow transition"
                        >
                            <Edit3 className="w-5 h-5" />
                            <span>Alocar Médico em Sala</span>
                        </button>
                    )}
                </div>

                {/* Conteúdo Principal da Tabela */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 font-medium">Carregando dados...</div>
                    ) : activeTab === 'escalas' ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3 px-6">Médico</th>
                                    <th className="py-3 px-6">Sala Alocada</th>
                                    <th className="py-3 px-6">Regime</th>
                                    <th className="py-3 px-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {schedules.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400">
                                            Nenhum médico alocado em salas no momento.
                                        </td>
                                    </tr>
                                ) : (
                                    schedules.map((sch) => (
                                        <tr key={sch.id} className="hover:bg-slate-50/50 transition">
                                            <td className="py-4 px-6 font-medium text-slate-800 flex items-center gap-2">
                                                <Stethoscope className="w-4 h-4 text-teal-600" />
                                                {sch.profiles?.name || 'Médico'}
                                            </td>
                                            <td className="py-4 px-6 font-medium text-blue-700">
                                                {sch.rooms?.name || 'Não alocado'}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 flex items-center gap-1 w-fit">
                                                    <Clock className="w-3 h-3" />
                                                    {sch.work_regime}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                                                    sch.status === 'ativo'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {sch.status === 'ativo' ? 'Em Plantão' : 'Ausente/Folga'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3 px-6">Nome Completo</th>
                                    <th className="py-3 px-6">E-mail</th>
                                    {activeTab === 'medicos' && <th className="py-3 px-6">Especialidade</th>}
                                    <th className="py-3 px-6">Função</th>
                                    {isGerenteGeral && <th className="py-3 px-6 text-right">Ações</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {usersList.map((userItem) => (
                                    <tr key={userItem.id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-4 px-6 font-medium text-slate-800 flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${
                                                activeTab === 'medicos' ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                {activeTab === 'medicos' ? <Stethoscope className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                            </div>
                                            {userItem.name}
                                        </td>
                                        <td className="py-4 px-6 text-slate-500">{userItem.email || '-'}</td>
                                        {activeTab === 'medicos' && <td className="py-4 px-6">{userItem.specialty || 'Clínica Geral'}</td>}
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                                                userItem.role === 'medico'
                                                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            }`}>
                                                {userItem.role === 'medico' ? 'Médico' : 'Gerente de Plantão'}
                                            </span>
                                        </td>
                                        {isGerenteGeral && (
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleDeleteUser(userItem.id, userItem.name)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modal de Alocação de Escala */}
            {scheduleModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
                        <div className="bg-emerald-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">Alocar Médico em Sala</h3>
                            <button onClick={() => setScheduleModalOpen(false)} className="text-emerald-100 hover:text-white font-bold text-xl">✕</button>
                        </div>
                        <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Selecione o Médico</label>
                                <select
                                    required
                                    value={selectedDoctorId}
                                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">-- Escolha o Profissional --</option>
                                    {usersList.map((doc) => (
                                        <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty || 'Geral'})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Sala de Atendimento</label>
                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => setSelectedRoomId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">-- Sem Sala (Aguardando) --</option>
                                    {rooms.map((room) => (
                                        <option key={room.id} value={room.id}>{room.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Regime de Trabalho</label>
                                <select
                                    value={workRegime}
                                    onChange={(e) => setWorkRegime(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="12x36">12x36 (Plantonista)</option>
                                    <option value="24h">24 Horas</option>
                                    <option value="Semanal">Diário / Semanal</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Status Atual</label>
                                <select
                                    value={scheduleStatus}
                                    onChange={(e) => setScheduleStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="ativo">Em Plantão (Ativo)</option>
                                    <option value="ausente">Ausente / Folga</option>
                                </select>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setScheduleModalOpen(false)}
                                    className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg text-sm shadow transition"
                                >
                                    Salvar Escala
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Cadastro de Profissionais */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
                        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">
                                {targetRole === 'medico' ? 'Cadastrar Novo Médico' : 'Cadastrar Gerente de Plantão'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-blue-100 hover:text-white font-bold text-xl">✕</button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}
                            {formSuccess && (
                                <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded text-green-700 text-xs flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>{formSuccess}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Dr. Roberto Carlos"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">E-mail de Acesso</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@hospital.com"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Senha Inicial</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {targetRole === 'medico' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Especialidade</label>
                                    <input
                                        type="text"
                                        required
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        placeholder="Ex: Cardiologia, Pediatria..."
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg text-sm shadow transition"
                                >
                                    {submitting ? 'Salvando...' : 'Salvar Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};