import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope, LogOut, UserCheck, AlertCircle, Clock, Volume2, CheckCircle2 } from 'lucide-react';

interface TriagePatient {
    id: string;
    risk_level: string;
    chief_complaint: string;
    blood_pressure: string;
    temperature: string;
    heart_rate: string;
    oxygen_saturation: string;
    status: string;
    created_at: string;
    patients?: { name: string; cpf: string };
}

const MANCHESTER_ORDER: Record<string, number> = {
    Vermelho: 1,
    Laranja: 2,
    Amarelo: 3,
    Verde: 4,
    Azul: 5,
};

const MANCHESTER_BADGES: Record<string, string> = {
    Vermelho: 'bg-red-500 text-white',
    Laranja: 'bg-orange-500 text-white',
    Amarelo: 'bg-yellow-400 text-slate-900',
    Verde: 'bg-emerald-500 text-white',
    Azul: 'bg-blue-500 text-white',
};

export const DashboardMedico: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [triageQueue, setTriageQueue] = useState<TriagePatient[]>([]);
    const [currentPatient, setCurrentPatient] = useState<TriagePatient | null>(null);
    const [roomNumber, setRoomNumber] = useState('Consultório 01');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fetchQueue = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('triages')
                .select('*, patients(name, cpf)')
                .in('status', ['aguardando', 'em_atendimento']);

            if (error) throw error;

            const list = (data || []) as TriagePatient[];

            list.sort((a, b) => {
                const priorityA = MANCHESTER_ORDER[a.risk_level] || 99;
                const priorityB = MANCHESTER_ORDER[b.risk_level] || 99;
                if (priorityA !== priorityB) return priorityA - priorityB;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            const activeCall = list.find((item) => item.status === 'em_atendimento');
            if (activeCall) {
                setCurrentPatient(activeCall);
            } else {
                setCurrentPatient(null);
            }

            setTriageQueue(list.filter((item) => item.status === 'aguardando'));
        } catch (err) {
            console.error('Erro ao buscar fila médica:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (isMounted) {
                await fetchQueue();
            }
        };

        loadData();

        const subscription = supabase
            .channel('triages_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'triages' }, () => {
                fetchQueue();
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [fetchQueue]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const handleCallPatient = async (patient: TriagePatient) => {
        setActionLoading(true);
        setErrorMessage(null);

        try {
            const { error } = await supabase
                .from('triages')
                .update({
                    status: 'em_atendimento',
                    doctor_id: profile?.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', patient.id);

            if (error) throw error;

            setCurrentPatient({ ...patient, status: 'em_atendimento' });
            await fetchQueue();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao chamar paciente.';
            setErrorMessage(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleFinishConsultation = async () => {
        if (!currentPatient) return;
        setActionLoading(true);

        try {
            const { error } = await supabase
                .from('triages')
                .update({
                    status: 'finalizado',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', currentPatient.id);

            if (error) throw error;

            setCurrentPatient(null);
            await fetchQueue();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao finalizar atendimento.';
            setErrorMessage(msg);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Painel do Médico</h1>
                        <p className="text-xs text-slate-500">
                            Dr(a). <span className="font-semibold text-slate-700">{profile?.name || 'Médico(a)'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Consultório 01">Consultório 01</option>
                        <option value="Consultório 02">Consultório 02</option>
                        <option value="Consultório 03">Consultório 03</option>
                        <option value="Consultório 04">Consultório 04</option>
                    </select>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded-lg font-medium transition text-xs"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sair</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
                {errorMessage && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Atendimento Atual */}
                {currentPatient && (
                    <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
                                <UserCheck className="w-4 h-4" /> Em Atendimento Agora em {roomNumber}
                            </div>
                            <h2 className="text-2xl font-bold">{currentPatient.patients?.name || 'Paciente'}</h2>
                            <p className="text-sm text-blue-100">Queixa: {currentPatient.chief_complaint || 'Não informada'}</p>
                            <div className="flex gap-4 text-xs text-blue-200 pt-1">
                                {currentPatient.blood_pressure && <span>PA: <strong>{currentPatient.blood_pressure}</strong></span>}
                                {currentPatient.temperature && <span>Temp: <strong>{currentPatient.temperature}°C</strong></span>}
                                {currentPatient.heart_rate && <span>FC: <strong>{currentPatient.heart_rate} bpm</strong></span>}
                                {currentPatient.oxygen_saturation && <span>SpO2: <strong>{currentPatient.oxygen_saturation}%</strong></span>}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleCallPatient(currentPatient)}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
                            >
                                <Volume2 className="w-4 h-4" /> Rechamar Painel
                            </button>
                            <button
                                onClick={handleFinishConsultation}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shadow"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Concluir Consulta
                            </button>
                        </div>
                    </div>
                )}

                {/* Fila de Aguardando */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800">Próximos Pacientes na Fila</h3>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500">Buscando fila de espera...</div>
                        ) : triageQueue.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">Nenhum paciente aguardando no momento.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        <th className="py-3 px-6">Prioridade</th>
                                        <th className="py-3 px-6">Paciente</th>
                                        <th className="py-3 px-6">Queixa Principal</th>
                                        <th className="py-3 px-6">Sinais Vitais</th>
                                        <th className="py-3 px-6">Espera</th>
                                        <th className="py-3 px-6 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                    {triageQueue.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                            <td className="py-4 px-6">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${MANCHESTER_BADGES[item.risk_level] || 'bg-slate-200'}`}>
                                                    {item.risk_level}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-medium text-slate-800">
                                                {item.patients?.name || 'Sem nome'}
                                                <div className="text-xs text-slate-400">CPF: {item.patients?.cpf || 'Não informado'}</div>
                                            </td>
                                            <td className="py-4 px-6 text-slate-600 max-w-xs truncate">
                                                {item.chief_complaint || '-'}
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-500 space-y-0.5">
                                                {item.blood_pressure && <div>PA: <strong>{item.blood_pressure}</strong></div>}
                                                {item.temperature && <div>Temp: <strong>{item.temperature}°C</strong></div>}
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleCallPatient(item)}
                                                    disabled={actionLoading || !!currentPatient}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow transition"
                                                >
                                                    Chamar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};