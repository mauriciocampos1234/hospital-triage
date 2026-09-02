import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { NovoColaboradorModal } from '../components/NovoColaboradorModal';
import { 
    Users, 
    Stethoscope, 
    UserCheck, 
    Building2, 
    LogOut, 
    Activity, 
    UserPlus, 
    Layers,
    SlidersHorizontal
} from 'lucide-react';

interface StaffProfile {
    id: string;
    name: string;
    email: string;
    role: 'medico' | 'recepcao' | 'triagem' | 'gerente_dia' | 'gerente_geral' | string;
    room_number?: string;
    is_active: boolean;
    crm?: string;
    specialty?: string;
}

interface SectorStats {
    totalPatientsToday: number;
    waitingReception: number;
    waitingTriage: number;
    waitingDoctor: number;
    completedToday: number;
}

export const DashboardGerente: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'plantao' | 'equipe' | 'metricas'>('plantao');
    const [staffList, setStaffList] = useState<StaffProfile[]>([]);
    const [stats, setStats] = useState<SectorStats>({
        totalPatientsToday: 0,
        waitingReception: 0,
        waitingTriage: 0,
        waitingDoctor: 0,
        completedToday: 0,
    });

    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [allocationRooms, setAllocationRooms] = useState<{ [key: string]: string }>({});

    const loadData = useCallback(async () => {
        try {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('name', { ascending: true });

            if (profilesError) throw profilesError;
            setStaffList(profilesData || []);

            const roomMap: { [key: string]: string } = {};
            (profilesData || []).forEach((p: StaffProfile) => {
                if (p.room_number) {
                    roomMap[p.id] = p.room_number;
                }
            });
            setAllocationRooms(roomMap);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { data: triagesData, error: triagesError } = await supabase
                .from('triages')
                .select('*')
                .gte('created_at', todayStart.toISOString());

            if (triagesError) throw triagesError;

            const triages = triagesData || [];
            setStats({
                totalPatientsToday: triages.length,
                waitingReception: triages.filter(t => t.status === 'aguardando_recepcao').length,
                waitingTriage: triages.filter(t => t.status === 'aguardando_triagem').length,
                waitingDoctor: triages.filter(t => t.status === 'aguardando').length,
                completedToday: triages.filter(t => t.status === 'finalizado').length,
            });

        } catch (err) {
            console.error('Erro ao carregar dados do gerente:', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            if (isMounted) await loadData();
        };
        init();
        return () => { isMounted = false; };
    }, [loadData]);

    const getRoleSubtitle = (staff: StaffProfile) => {
        const role = (staff.role || '').toLowerCase().trim();
        switch (role) {
            case 'medico':
                return staff.specialty ? `Médico - ${staff.specialty}` : 'Médico';
            case 'triagem':
                return staff.specialty || 'Enfermeiro(a) / Triagem';
            case 'recepcao':
                return 'Recepcionista';
            case 'gerente_dia':
                return 'Gerente do Dia';
            case 'gerente_geral':
            case 'gerente':
                return 'Gerente Geral';
            default:
                return staff.specialty || 'Colaborador';
        }
    };

    const handleUpdateAllocation = async (staffId: string, roomNumber: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ room_number: roomNumber || null, is_active: true })
                .eq('id', staffId);

            if (error) throw error;
            alert('Alocação de posto atualizada com sucesso!');
            await loadData();
        } catch (err) {
            const errorObj = err as Error;
            alert(`Erro ao atualizar alocação: ${errorObj.message}`);
        }
    };

    const handleToggleStatus = async (staffId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: !currentStatus })
                .eq('id', staffId);

            if (error) throw error;
            await loadData();
        } catch (err) {
            const errorObj = err as Error;
            alert(`Erro ao alterar status: ${errorObj.message}`);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const doctors = staffList.filter(s => s.role === 'medico');
    const receptionists = staffList.filter(s => s.role === 'recepcao');
    const triageStaff = staffList.filter(s => s.role === 'triagem');

    const getRoleBadge = (role?: string) => {
        const r = (role || '').toLowerCase().trim();
        switch (r) {
            case 'medico':
                return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">MÉDICO</span>;
            case 'recepcao':
                return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">RECEPÇÃO</span>;
            case 'triagem':
                return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">TRIAGEM</span>;
            case 'gerente_dia':
                return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">GERENTE DO DIA</span>;
            case 'gerente_geral':
            case 'gerente':
                return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">GERENTE GERAL</span>;
            default:
                return (
                    <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {role || 'NÃO DEFINIDO'}
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                        <SlidersHorizontal className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Painel do Gerente do Dia</h1>
                        <p className="text-xs text-slate-500">
                            Gestor em exercício: <span className="font-semibold text-slate-700">{profile?.name}</span>
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded-lg font-medium transition text-xs"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                </button>
            </header>

            <div className="bg-white border-b border-slate-200 px-6">
                <div className="max-w-7xl mx-auto flex gap-6 text-xs font-bold">
                    <button
                        onClick={() => setActiveTab('plantao')}
                        className={`py-3.5 border-b-2 transition flex items-center gap-2 ${
                            activeTab === 'plantao' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Building2 className="w-4 h-4" /> Alocação de Plantão do Dia
                    </button>
                    <button
                        onClick={() => setActiveTab('equipe')}
                        className={`py-3.5 border-b-2 transition flex items-center gap-2 ${
                            activeTab === 'equipe' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <UserCheck className="w-4 h-4" /> Gestão de Equipe e Colaboradores
                    </button>
                    <button
                        onClick={() => setActiveTab('metricas')}
                        className={`py-3.5 border-b-2 transition flex items-center gap-2 ${
                            activeTab === 'metricas' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Activity className="w-4 h-4" /> Resumo de Fluxo e Métricas
                    </button>
                </div>
            </div>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
                {activeTab === 'plantao' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-900 text-xs">
                            <p className="font-semibold">
                                Defina em quais consultórios, guichês e salas de triagem a equipe trabalhará durante o plantão de hoje.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Recepção */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h2 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-600" /> Recepção ({receptionists.length})
                                    </h2>
                                </div>
                                <div className="space-y-3">
                                    {receptionists.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-6">Nenhum recepcionista cadastrado.</p>
                                    ) : (
                                        receptionists.map(item => (
                                            <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="font-bold text-slate-800 block">{item.name}</span>
                                                        <span className="text-[10px] text-slate-400 block font-medium">{getRoleSubtitle(item)}</span>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                        {item.is_active ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Ex: Guichê 01"
                                                        value={allocationRooms[item.id] || ''}
                                                        onChange={(e) => setAllocationRooms({ ...allocationRooms, [item.id]: e.target.value })}
                                                        className="flex-1 border border-slate-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateAllocation(item.id, allocationRooms[item.id])}
                                                        className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-[11px] hover:bg-indigo-700"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Triagem */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h2 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-emerald-600" /> Sala de Triagem ({triageStaff.length})
                                    </h2>
                                </div>
                                <div className="space-y-3">
                                    {triageStaff.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-6">Nenhum profissional de triagem cadastrado.</p>
                                    ) : (
                                        triageStaff.map(item => (
                                            <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="font-bold text-slate-800 block">{item.name}</span>
                                                        <span className="text-[10px] text-slate-400 block font-medium">{getRoleSubtitle(item)}</span>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                        {item.is_active ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Ex: Sala Triagem A"
                                                        value={allocationRooms[item.id] || ''}
                                                        onChange={(e) => setAllocationRooms({ ...allocationRooms, [item.id]: e.target.value })}
                                                        className="flex-1 border border-slate-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateAllocation(item.id, allocationRooms[item.id])}
                                                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Médicos */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h2 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4 text-blue-600" /> Consultórios Médicos ({doctors.length})
                                    </h2>
                                </div>
                                <div className="space-y-3">
                                    {doctors.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-6">Nenhum médico cadastrado.</p>
                                    ) : (
                                        doctors.map(item => (
                                            <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="font-bold text-slate-800 block">{item.name}</span>
                                                        <span className="text-[10px] text-slate-400 block font-medium">{getRoleSubtitle(item)}</span>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                        {item.is_active ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Ex: Consultório 03"
                                                        value={allocationRooms[item.id] || ''}
                                                        onChange={(e) => setAllocationRooms({ ...allocationRooms, [item.id]: e.target.value })}
                                                        className="flex-1 border border-slate-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateAllocation(item.id, allocationRooms[item.id])}
                                                        className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-[11px] hover:bg-blue-700"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'equipe' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Gestão de Equipe e Colaboradores</h2>
                                <p className="text-xs text-slate-500">Cadastre médicos, gerentes, recepcionistas e enfermeiros do hospital.</p>
                            </div>
                            <button
                                onClick={() => setIsStaffModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
                            >
                                <UserPlus className="w-4 h-4" /> Novo Colaborador
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr>
                                        <th className="p-4">Nome</th>
                                        <th className="p-4">E-mail / CRM</th>
                                        <th className="p-4">Função / Cargo</th>
                                        <th className="p-4">Posto / Sala Alocada</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {staffList.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-slate-400">
                                                Nenhum colaborador cadastrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        staffList.map((staff) => (
                                            <tr key={staff.id} className="hover:bg-slate-50 transition">
                                                <td className="p-4">
                                                    <span className="font-bold text-slate-800 block">
                                                        {staff.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium block">
                                                        {getRoleSubtitle(staff)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-500">
                                                    <div>{staff.email || 'N/A'}</div>
                                                    {staff.crm && <div className="text-[10px] text-slate-400 font-semibold">CRM: {staff.crm}</div>}
                                                </td>
                                                <td className="p-4">
                                                    {getRoleBadge(staff.role)}
                                                </td>
                                                <td className="p-4 font-medium text-slate-700">{staff.room_number || 'Não alocado'}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                        staff.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {staff.is_active ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleStatus(staff.id, staff.is_active)}
                                                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                                                    >
                                                        {staff.is_active ? 'Desativar' : 'Ativar'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'metricas' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase">Pacientes Atendidos Hoje</p>
                            <p className="text-3xl font-black text-slate-800">{stats.totalPatientsToday}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase">Aguardando Triagem</p>
                            <p className="text-3xl font-black text-amber-600">{stats.waitingTriage}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase">Aguardando Atendimento Médico</p>
                            <p className="text-3xl font-black text-blue-600">{stats.waitingDoctor}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase">Atendimentos Concluídos</p>
                            <p className="text-3xl font-black text-emerald-600">{stats.completedToday}</p>
                        </div>
                    </div>
                )}
            </main>

            <NovoColaboradorModal
                isOpen={isStaffModalOpen}
                onClose={() => setIsStaffModalOpen(false)}
                onSuccess={loadData}
            />
        </div>
    );
};