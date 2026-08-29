import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope, LogOut, CheckCircle2, UserCheck, AlertCircle, Clock, Volume2 } from 'lucide-react';

interface PatientQueue {
    id: string;
    patient_name: string;
    age: number;
    symptoms: string;
    priority: 'verde' | 'amarelo' | 'vermelho';
    status: 'aguardando' | 'em_atendimento' | 'concluido';
    created_at: string;
    doctor_notes?: string;
}

export const DashboardMedico: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [patients, setPatients] = useState<PatientQueue[]>([]);
    const [currentPatient, setCurrentPatient] = useState<PatientQueue | null>(null);
    const [loading, setLoading] = useState(true);
    const [doctorNotes, setDoctorNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('triage')
                .select('*')
                .in('status', ['aguardando', 'em_atendimento'])
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Ordenação customizada por prioridade (vermelho > amarelo > verde)
            const priorityOrder = { vermelho: 1, amarelo: 2, verde: 3 };
            const sorted = (data || []).sort((a, b) => {
                if (a.status === 'em_atendimento') return -1;
                if (b.status === 'em_atendimento') return 1;
                return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
            });

            setPatients(sorted);

            const inAttendance = sorted.find((p) => p.status === 'em_atendimento');
            setCurrentPatient(inAttendance || null);
        } catch (err) {
            console.error('Erro ao buscar fila médica:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            await fetchQueue();
        };
        loadData();

        const subscription = supabase
            .channel('triage_medico')
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

    const handleCallPatient = async (patient: PatientQueue) => {
        try {
            const { error } = await supabase
                .from('triage')
                .update({ status: 'em_atendimento' })
                .eq('id', patient.id);

            if (error) throw error;
            fetchQueue();
        } catch (err) {
            console.error('Erro ao chamar paciente:', err);
        }
    };

    const handleFinishConsultation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPatient) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('triage')
                .update({
                    status: 'concluido',
                    doctor_notes: doctorNotes,
                })
                .eq('id', currentPatient.id);

            if (error) throw error;

            setDoctorNotes('');
            setCurrentPatient(null);
            fetchQueue();
        } catch (err) {
            console.error('Erro ao finalizar consulta:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Consultório Médico</h1>
                        <p className="text-xs text-slate-500">
                            Médico(a): <span className="font-medium text-slate-700">{profile?.name || 'Dr. Médico'}</span>
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
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Painel de Atendimento Atual (2 Colunas) */}
                <section className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-teal-600" />
                            <span>Atendimento Em Andamento</span>
                        </h2>

                        {currentPatient ? (
                            <form onSubmit={handleFinishConsultation} className="space-y-4">
                                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-teal-950">{currentPatient.patient_name}</h3>
                                        <p className="text-sm text-teal-700">{currentPatient.age} anos</p>
                                        <p className="text-sm mt-2 text-slate-700 font-medium">Sintomas relatados:</p>
                                        <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-teal-100 mt-1">
                                            {currentPatient.symptoms}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                                        Prontuário / Prescrição / Observações Médicas
                                    </label>
                                    <textarea
                                        rows={5}
                                        required
                                        value={doctorNotes}
                                        onChange={(e) => setDoctorNotes(e.target.value)}
                                        placeholder="Descreva o diagnóstico, medicação ministrada ou orientações de alta..."
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold rounded-xl shadow transition flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>{submitting ? 'Encerrando...' : 'Finalizar Atendimento'}</span>
                                </button>
                            </form>
                        ) : (
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                                <Clock className="w-12 h-12 stroke-1" />
                                <p className="text-base font-medium text-slate-600">Nenhum paciente em atendimento no momento.</p>
                                <p className="text-xs">Selecione um paciente da fila ao lado para iniciar a consulta.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Fila de Pacientes Aguardando (1 Coluna) */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <span>Fila de Espera por Prioridade</span>
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {loading ? (
                            <p className="text-sm text-slate-500 text-center py-6">Carregando fila...</p>
                        ) : patients.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-6">Sem pacientes na fila.</p>
                        ) : (
                            patients.map((pat) => (
                                <div
                                    key={pat.id}
                                    className={`p-4 rounded-xl border transition flex justify-between items-center ${pat.status === 'em_atendimento'
                                            ? 'bg-teal-50 border-teal-300'
                                            : pat.priority === 'vermelho'
                                                ? 'bg-red-50 border-red-200'
                                                : pat.priority === 'amarelo'
                                                    ? 'bg-amber-50 border-amber-200'
                                                    : 'bg-slate-50 border-slate-200'
                                        }`}
                                >
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-800 text-sm">{pat.patient_name}</p>
                                        <p className="text-xs text-slate-500">{pat.age} anos • {pat.priority.toUpperCase()}</p>
                                    </div>

                                    {pat.status === 'em_atendimento' ? (
                                        <span className="text-xs font-semibold px-2.5 py-1 bg-teal-200 text-teal-800 rounded-full">
                                            Em Atendimento
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleCallPatient(pat)}
                                            disabled={!!currentPatient}
                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold shadow transition flex items-center gap-1"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                            <span>Chamar</span>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>

            </main>
        </div>
    );
};