import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { Patient } from '../types';
import { NovoColaboradorModal } from '../components/modals/NovoColaboradorModal';
import { BarChart3, Users, UserPlus, Clock, CheckCircle2, LogOut, ShieldCheck, Activity } from 'lucide-react';

export const DashboardGerente: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchMetrics = async () => {
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPatients(data || []);
        } catch (err) {
            console.error('Erro ao carregar dados do gerente:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (active) setPatients(data || []);
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadData();

        const channel = supabase
            .channel('public:patients:manager')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(channel);
        };
    }, []);

    // Métricas calculadas
    const totalPatients = patients.length;
    const waitingTriage = patients.filter((p) => p.status === 'aguardando_triagem').length;
    const waitingDoctor = patients.filter((p) => p.status === 'aguardando_atendimento_medico').length;
    const completed = patients.filter((p) => p.status === 'finalizado').length;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/30">
                        <ShieldCheck className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Painel de Gerência & Monitoramento</h1>
                        <p className="text-xs text-slate-400">Gestor: {profile?.name} ({profile?.role})</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
                    >
                        <UserPlus className="w-4 h-4" /> Cadastrar Colaborador
                    </button>

                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 text-xs px-3 py-2.5 rounded-xl transition"
                    >
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">

                {/* Cards de Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Atendimentos</span>
                            <span className="text-3xl font-black text-slate-800">{totalPatients}</span>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Aguardando Triagem</span>
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
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Finalizados</span>
                            <span className="text-3xl font-black text-emerald-600">{completed}</span>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Tabela Geral de Monitoramento */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" /> Fluxo Geral de Atendimento Hospitalar
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <th className="py-3 px-3">Senha</th>
                                    <th className="py-3 px-3">Nome</th>
                                    <th className="py-3 px-3">Prioridade</th>
                                    <th className="py-3 px-3">Classificação (Risco)</th>
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
                                        <td colSpan={6} className="py-6 text-center text-slate-400">Nenhum registro encontrado.</td>
                                    </tr>
                                ) : (
                                    patients.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition">
                                            <td className="py-3 px-3 font-bold text-indigo-600">{p.ticket_number}</td>
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
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.status === 'aguardando_triagem'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : p.status === 'aguardando_atendimento_medico'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : p.status === 'em_atendimento'
                                                                ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {p.status.replace(/_/g, ' ')}
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

            </main>

            {/* Modal Cadastro de Colaboradores */}
            <NovoColaboradorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchMetrics}
            />
        </div>
    );
};