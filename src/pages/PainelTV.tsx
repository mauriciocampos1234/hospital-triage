import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { Volume2, Monitor, VolumeX } from 'lucide-react';

interface TriagePatient {
    id: string;
    patient_name: string;
    risk_level: string;
    status: string;
    created_at: string;
}

export const PainelTV: React.FC = () => {
    const [patients, setPatients] = useState<TriagePatient[]>([]);
    const [lastCalled, setLastCalled] = useState<TriagePatient | null>(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    
    // Evita repetir a chamada de voz para o mesmo paciente
    const lastSpokenId = useRef<string | null>(null);

    // Função de Síntese de Voz (Web Speech API)
    const speakPatientName = (name: string) => {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel(); // Cancela falas anteriores na fila

        const text = `Atenção, paciente ${name}. Favor dirigir-se ao consultório.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9; // Velocidade natural
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
    };

    const fetchPatients = useCallback(async () => {
        const { data, error } = await supabase
            .from('triages')
            .select('*')
            .in('status', ['aguardando', 'em_atendimento', 'chamado'])
            .order('created_at', { ascending: true });

        if (!error && data) {
            setPatients(data as TriagePatient[]);
            
            const current = data.find(p => p.status === 'em_atendimento' || p.status === 'chamado');
            if (current) {
                setLastCalled(current);

                // Executa voz se for uma nova chamada e o áudio estiver ativado pelo usuário
                if (current.id !== lastSpokenId.current) {
                    lastSpokenId.current = current.id;
                    if (audioEnabled) {
                        speakPatientName(current.patient_name);
                    }
                }
            }
        }
    }, [audioEnabled]);

    useEffect(() => {
        let isMounted = true;

        const initData = async () => {
            const { data, error } = await supabase
                .from('triages')
                .select('*')
                .in('status', ['aguardando', 'em_atendimento', 'chamado'])
                .order('created_at', { ascending: true });

            if (!error && data && isMounted) {
                setPatients(data as TriagePatient[]);
                const current = data.find(p => p.status === 'em_atendimento' || p.status === 'chamado');
                if (current) {
                    setLastCalled(current);
                }
            }
        };

        initData();

        // Subscrição em tempo real na tabela de triagens
        const channel = supabase
            .channel('realtime_triages_tv')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'triages' },
                () => {
                    fetchPatients();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [fetchPatients]);

    // Permite ativar o áudio contornando o bloqueio de Autoplay dos navegadores
    const toggleAudio = () => {
        const newState = !audioEnabled;
        setAudioEnabled(newState);
        if (newState && lastCalled) {
            speakPatientName(lastCalled.patient_name);
        }
    };

    const getRiskBadgeColor = (risk: string) => {
        switch (risk?.toLowerCase()) {
            case 'vermelho': return 'bg-red-500 text-white';
            case 'laranja': return 'bg-orange-500 text-white';
            case 'amarelo': return 'bg-yellow-400 text-slate-900';
            case 'verde': return 'bg-emerald-500 text-white';
            default: return 'bg-blue-500 text-white';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col justify-between">
            {/* Header */}
            <header className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                    <Monitor className="w-10 h-10 text-indigo-400" />
                    <div>
                        <h1 className="text-3xl font-black tracking-wide">PAINEL DE CHAMADA</h1>
                        <p className="text-sm text-slate-400">Acompanhamento em Tempo Real</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleAudio}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition border ${
                            audioEnabled 
                                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400 hover:bg-emerald-900' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                        {audioEnabled ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                        {audioEnabled ? 'Áudio Ativado' : 'Ativar Chamada de Voz'}
                    </button>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest bg-indigo-950/80 border border-indigo-800 px-4 py-2 rounded-full flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" /> WebSocket Ativo
                    </span>
                </div>
            </header>

            {/* Chamada Principal */}
            <main className="my-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-7 bg-slate-800/90 border-2 border-indigo-500/40 rounded-3xl p-10 shadow-2xl flex flex-col items-center justify-center text-center space-y-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-700/60 px-4 py-1.5 rounded-full flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-indigo-400 animate-bounce" /> Chamada Atual
                    </span>
                    
                    <h2 className="text-5xl font-extrabold text-indigo-300">
                        {lastCalled ? lastCalled.patient_name : 'Aguardando Atendimento...'}
                    </h2>

                    {lastCalled && (
                        <div className="pt-4 border-t border-slate-700/80 w-full flex justify-center gap-4">
                            <span className={`text-sm font-bold px-5 py-2 rounded-xl ${getRiskBadgeColor(lastCalled.risk_level)}`}>
                                Prioridade: {lastCalled.risk_level}
                            </span>
                        </div>
                    )}
                </div>

                {/* Fila de Espera */}
                <div className="lg:col-span-5 bg-slate-800/40 border border-slate-800 rounded-3xl p-6 flex flex-col">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-700">
                        Fila de Espera ({patients.length})
                    </h3>
                    <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                        {patients.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-8">Nenhum paciente aguardando.</p>
                        ) : (
                            patients.map((p) => (
                                <div key={p.id} className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl flex justify-between items-center">
                                    <span className="font-bold text-base text-slate-200">{p.patient_name}</span>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${getRiskBadgeColor(p.risk_level)}`}>
                                        {p.risk_level}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};