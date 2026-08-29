import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, LogOut, AlertCircle, CheckCircle2, Clock, UserPlus } from 'lucide-react';

interface PatientQueue {
    id: string;
    patient_name: string;
    age: number;
    symptoms: string;
    priority: 'verde' | 'amarelo' | 'vermelho';
    status: 'aguardando' | 'em_atendimento' | 'concluido';
    created_at: string;
}

export const DashboardRecepcao: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [patients, setPatients] = useState<PatientQueue[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    // Formulário de novo paciente
    const [patientName, setPatientName] = useState('');
    const [age, setAge] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [priority, setPriority] = useState<'verde' | 'amarelo' | 'vermelho'>('verde');
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('triage')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setPatients(data || []);
        } catch (err) {
            console.error('Erro ao buscar fila:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadQueue = async () => {
            await fetchQueue();
        };

        loadQueue();

        // Atualização em tempo real via Supabase Realtime
        const subscription = supabase
            .channel('triage_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'triage' }, () => {
                fetchQueue();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchQueue]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const handleAddPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);

        try {
            const { error } = await supabase.from('triage').insert([
                {
                    patient_name: patientName,
                    age: parseInt(age, 10),
                    symptoms,
                    priority,
                    status: 'aguardando',
                },
            ]);

            if (error) throw error;

            setFormSuccess('Paciente cadastrado na fila com sucesso!');
            setPatientName('');
            setAge('');
            setSymptoms('');
            setPriority('verde');
            fetchQueue();

            setTimeout(() => setModalOpen(false), 1500);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao cadastrar paciente.';
            setFormError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const getPriorityBadge = (prio: string) => {
        switch (prio) {
            case 'vermelho':
                return (
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-300 animate-pulse">
                        🔴 Emergência (Vermelho)
                    </span>
                );
            case 'amarelo':
                return (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300">
                        🟡 Urgente (Amarelo)
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                        🟢 Pouco Urgente (Verde)
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Recepção / Triagem</h1>
                        <p className="text-xs text-slate-500">
                            Atendente: <span className="font-medium text-slate-700">{profile?.name || 'Recepcionista'}</span>
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

            {/* Conteúdo Principal */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Fila de Espera de Pacientes</h2>
                        <p className="text-sm text-slate-500">Gerencie a chegada e classificação de risco dos pacientes.</p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow transition"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span>Novo Paciente</span>
                    </button>
                </div>

                {/* Tabela da Fila */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Carregando fila de pacientes...</div>
                    ) : patients.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Clock className="w-12 h-12 stroke-1" />
                            <p className="text-base font-medium text-slate-600">Nenhum paciente na fila no momento.</p>
                            <p className="text-xs">Clique em "Novo Paciente" para registrar uma nova entrada.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3 px-6">Paciente / Idade</th>
                                    <th className="py-3 px-6">Sintomas / Queixa</th>
                                    <th className="py-3 px-6">Classificação (Prioridade)</th>
                                    <th className="py-3 px-6">Status</th>
                                    <th className="py-3 px-6 text-right">Horário Chegada</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {patients.map((pat) => (
                                    <tr key={pat.id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-4 px-6 font-medium text-slate-800">
                                            <div>{pat.patient_name}</div>
                                            <div className="text-xs text-slate-500">{pat.age} anos</div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-600 max-w-xs truncate">{pat.symptoms}</td>
                                        <td className="py-4 px-6">{getPriorityBadge(pat.priority)}</td>
                                        <td className="py-4 px-6">
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 capitalize">
                                                {pat.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right text-xs text-slate-500">
                                            {new Date(pat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modal de Novo Paciente */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
                        <div className="bg-purple-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">Cadastro de Paciente (Triagem)</h3>
                            <button onClick={() => setModalOpen(false)} className="text-purple-100 hover:text-white font-bold text-xl">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddPatient} className="p-6 space-y-4">
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
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                                    Nome Completo do Paciente
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    placeholder="Ex: Maria da Silva"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Idade</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max="130"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    placeholder="Ex: 42"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                                    Sintomas / Queixa Principal
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    placeholder="Descreva os sintomas relatados..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                                    Classificação de Risco (Prioridade)
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as 'verde' | 'amarelo' | 'vermelho')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                                >
                                    <option value="verde">🟢 Verde - Pouco Urgente</option>
                                    <option value="amarelo">🟡 Amarelo - Urgente</option>
                                    <option value="vermelho">🔴 Vermelho - Emergência</option>
                                </select>
                            </div>

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
                                    className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold rounded-lg text-sm shadow transition"
                                >
                                    {submitting ? 'Salvando...' : 'Adicionar à Fila'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};