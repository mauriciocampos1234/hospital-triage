import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Patient } from '../types';
import { useAuth } from '../hooks/useAuth';
import { 
    Activity, 
    Clock, 
    User, 
    Send, 
    RefreshCw, 
    LogOut 
} from 'lucide-react';

type RiskLevel = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul';

export const Triagem: React.FC = () => {
    const { user, signOut } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(false);

    // Formulário de Triagem
    const [heartRate, setHeartRate] = useState('');
    const [bloodPressure, setBloodPressure] = useState('');
    const [temperature, setTemperature] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [riskLevel, setRiskLevel] = useState<RiskLevel>('verde');

    // Função utilizada para atualização manual (botão ou após salvar)
    const handleManualRefresh = useCallback(async () => {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('status', 'aguardando_triagem')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setPatients(data);
        }
    }, []);

    // Efeito para sincronização e tempo real
    useEffect(() => {
        let isMounted = true;

        const loadPatients = async () => {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('status', 'aguardando_triagem')
                .order('created_at', { ascending: true });

            if (!error && data && isMounted) {
                setPatients(data);
            }
        };

        loadPatients();

        const channel = supabase
            .channel('realtime_triagem')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
                loadPatients();
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSaveTriage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('patients')
                .update({
                    status: 'aguardando_atendimento',
                    risk_level: riskLevel,
                    vital_signs: {
                        heart_rate: heartRate,
                        blood_pressure: bloodPressure,
                        temperature: temperature,
                    },
                    symptoms: symptoms,
                    triaged_at: new Date().toISOString(),
                    triaged_by: user?.email
                })
                .eq('id', selectedPatient.id);

            if (error) throw error;

            setSelectedPatient(null);
            setHeartRate('');
            setBloodPressure('');
            setTemperature('');
            setSymptoms('');
            setRiskLevel('verde');
            await handleManualRefresh();
        } catch (err) {
            console.error('Erro ao salvar triagem:', err);
            alert('Erro ao salvar triagem do paciente.');
        } finally {
            setLoading(false);
        }
    };

    const riskOptions: Array<{ id: RiskLevel; label: string; color: string }> = [
        { id: 'vermelho', label: 'Emergência', color: 'bg-red-600 text-white' },
        { id: 'laranja', label: 'Muito Urgente', color: 'bg-orange-500 text-white' },
        { id: 'amarelo', label: 'Urgente', color: 'bg-amber-400 text-slate-950 font-black' },
        { id: 'verde', label: 'Pouco Urgente', color: 'bg-emerald-600 text-white' },
        { id: 'azul', label: 'Não Urgente', color: 'bg-blue-600 text-white' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Topbar com Botão de Sair */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">Módulo de Triagem</h1>
                        <p className="text-xs text-slate-400">Classificação de Risco e Sinais Vitais</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <span className="block text-xs font-bold text-slate-200">{user?.email}</span>
                        <span className="block text-[10px] text-indigo-400 uppercase font-semibold">Enfermagem / Triagem</span>
                    </div>

                    <button 
                        onClick={signOut}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition"
                        title="Encerrar Sessão"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sair</span>
                    </button>
                </div>
            </header>

            {/* Conteúdo */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Fila de Espera */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-400" />
                            <span>Aguardando Triagem ({patients.length})</span>
                        </h2>
                        <button 
                            onClick={handleManualRefresh}
                            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                            title="Atualizar lista"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {patients.length === 0 ? (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                                Nenhum paciente aguardando triagem no momento.
                            </div>
                        ) : (
                            patients.map((p) => (
                                <div 
                                    key={p.id}
                                    onClick={() => setSelectedPatient(p)}
                                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                                        selectedPatient?.id === p.id 
                                            ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg' 
                                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-indigo-400">
                                            Senha: #{p.ticket_number || '00'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {p.created_at ? new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-200 text-sm">{p.name}</h3>
                                    <p className="text-xs text-slate-400 mt-1">CPF: {p.cpf || 'Não informado'}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Formulário de Classificação */}
                <div className="lg:col-span-7">
                    {selectedPatient ? (
                        <form onSubmit={handleSaveTriage} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
                            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Triando Paciente</span>
                                    <h2 className="text-xl font-bold text-white">{selectedPatient.name}</h2>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedPatient(null)}
                                    className="text-xs text-slate-500 hover:text-slate-300"
                                >
                                    Cancelar
                                </button>
                            </div>

                            {/* Classificação de Manchester */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-3">
                                    Nível de Risco (Manchester)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {riskOptions.map((risk) => (
                                        <button
                                            key={risk.id}
                                            type="button"
                                            onClick={() => setRiskLevel(risk.id)}
                                            className={`p-3 rounded-xl text-center text-xs font-bold transition border ${
                                                riskLevel === risk.id 
                                                    ? `${risk.color} border-white ring-2 ring-indigo-500` 
                                                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            {risk.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sinais Vitais */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Pressão Arterial</label>
                                    <input 
                                        type="text" 
                                        placeholder="120/80 mmHg" 
                                        value={bloodPressure}
                                        onChange={(e) => setBloodPressure(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Freq. Cardíaca</label>
                                    <input 
                                        type="text" 
                                        placeholder="80 bpm" 
                                        value={heartRate}
                                        onChange={(e) => setHeartRate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Temperatura</label>
                                    <input 
                                        type="text" 
                                        placeholder="36.5 °C" 
                                        value={temperature}
                                        onChange={(e) => setTemperature(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Sintomas */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Queixas Principais / Sintomas</label>
                                <textarea 
                                    rows={3}
                                    placeholder="Descreva as queixas do paciente..."
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                            >
                                <Send className="w-4 h-4" />
                                <span>{loading ? 'Encaminhando...' : 'Finalizar Triagem e Encaminhar'}</span>
                            </button>
                        </form>
                    ) : (
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 h-full flex flex-col justify-center items-center space-y-3">
                            <User className="w-12 h-12 text-slate-700" />
                            <h3 className="text-base font-bold text-slate-300">Nenhum paciente selecionado</h3>
                            <p className="text-xs max-w-xs">Clique em um paciente na fila ao lado para iniciar a triagem e aferição de sinais vitais.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Triagem;