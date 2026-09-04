import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Patient } from '../types';
import { 
    Volume2, 
    VolumeX, 
    Monitor, 
    UserCheck, 
    Clock, 
    Sparkles, 
    ArrowRight 
} from 'lucide-react';

export const PainelTV: React.FC = () => {
    const [currentCall, setCurrentCall] = useState<Patient | null>(null);
    const [callHistory, setCallHistory] = useState<Patient[]>([]);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    const lastCalledIdRef = useRef<string | null>(null);
    const audioEnabledRef = useRef(audioEnabled);

    // Mantém a referência do áudio atualizada sem reiniciar efeitos
    useEffect(() => {
        audioEnabledRef.current = audioEnabled;
    }, [audioEnabled]);

    // Relógio do cabeçalho
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Anúncio por voz (Web Speech API)
    const speakCall = useCallback((patientName: string, doctorRoom?: string | null) => {
        if (!audioEnabledRef.current || !('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const roomText = doctorRoom ? `compareça ao ${doctorRoom}` : 'compareça ao consultório médico';
        const text = `Atenção: Paciente ${patientName}, ${roomText}.`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
    }, []);

    // Carregamento de dados e escuta em tempo real
    useEffect(() => {
        const fetchCalls = async () => {
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .in('status', ['chamado', 'em_atendimento'])
                    .order('updated_at', { ascending: false })
                    .limit(6);

                if (error) {
                    console.error('Erro ao buscar painel:', error);
                    return;
                }

                if (data && data.length > 0) {
                    const latest = data[0];

                    if (latest.id !== lastCalledIdRef.current) {
                        lastCalledIdRef.current = latest.id;
                        setCurrentCall(latest);
                        speakCall(latest.name, latest.doctor_room || latest.specialty);
                    }

                    setCallHistory(data.slice(1));
                }
            } catch (err) {
                console.error('Erro inesperado no painel:', err);
            }
        };

        fetchCalls();

        const channel = supabase
            .channel('realtime_painel_tv')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, () => {
                fetchCalls();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [speakCall]);

    const getRiskColor = (risk?: string | null) => {
        switch (risk) {
            case 'vermelho': return 'bg-red-600 text-white';
            case 'laranja': return 'bg-orange-500 text-white';
            case 'amarelo': return 'bg-amber-400 text-slate-950 font-black';
            case 'verde': return 'bg-emerald-600 text-white';
            default: return 'bg-blue-600 text-white';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-10 font-sans select-none overflow-hidden">
            {/* Cabecalho da TV */}
            <header className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/40">
                        <Monitor className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider text-white">Atendimento Médico</h1>
                        <p className="text-xs font-semibold text-slate-400">Painel Principal de Chamadas</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-bold text-xs transition ${
                            audioEnabled 
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                                : 'bg-red-500/20 border-red-500/40 text-red-300'
                        }`}
                    >
                        {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        <span>{audioEnabled ? 'Voz Ativada' : 'Voz Muted'}</span>
                    </button>

                    <div className="text-right border-l border-slate-800 pl-6">
                        <div className="text-2xl font-black tracking-widest text-indigo-400">
                            {currentTime.toLocaleTimeString('pt-BR')}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                        </div>
                    </div>
                </div>
            </header>

            {/* Conteudo Principal */}
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-8">
                {/* Chamada Atual */}
                <div className="lg:col-span-7 flex flex-col justify-center">
                    {currentCall ? (
                        <div className="bg-gradient-to-br from-indigo-900/80 via-slate-900 to-slate-900 border-2 border-indigo-500/80 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden animate-pulse">
                            <div className="absolute top-0 right-0 bg-indigo-600 text-white font-black text-xs px-6 py-2 rounded-bl-3xl uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Chamando Agora
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest block mb-1">
                                        Paciente
                                    </span>
                                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-wide leading-tight">
                                        {currentCall.name}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800">
                                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                                        <span className="text-slate-500 text-xs font-bold uppercase block mb-1">
                                            Local / Consultório
                                        </span>
                                        <span className="text-2xl md:text-3xl font-black text-emerald-400">
                                            {currentCall.doctor_room || 'Consultório 01'}
                                        </span>
                                    </div>

                                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                                        <span className="text-slate-500 text-xs font-bold uppercase block mb-1">
                                            Classificação
                                        </span>
                                        <span className={`inline-block px-4 py-1.5 rounded-xl font-black text-sm uppercase tracking-wider ${getRiskColor(currentCall.risk_level)}`}>
                                            {currentCall.risk_level || 'Atendimento'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 text-center text-slate-500 space-y-4">
                            <Clock className="w-16 h-16 mx-auto text-slate-600 animate-spin" />
                            <h3 className="text-xl font-bold text-slate-300">Aguardando Chamadas...</h3>
                            <p className="text-xs">Assim que o médico chamar um paciente, ele aparecerá aqui.</p>
                        </div>
                    )}
                </div>

                {/* Historico de Ultimas Chamadas */}
                <div className="lg:col-span-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-400" />
                        <span>Últimas Chamadas</span>
                    </h3>

                    <div className="space-y-3">
                        {callHistory.length === 0 ? (
                            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-center text-xs text-slate-500">
                                Nenhuma chamada anterior gravada.
                            </div>
                        ) : (
                            callHistory.map((patient) => (
                                <div 
                                    key={patient.id}
                                    className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md hover:border-slate-700 transition"
                                >
                                    <div className="truncate">
                                        <h4 className="font-bold text-slate-200 text-sm truncate">{patient.name}</h4>
                                        <span className="text-xs text-indigo-400 font-semibold">
                                            {patient.doctor_room || 'Consultório'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${getRiskColor(patient.risk_level)}`}>
                                            {patient.risk_level || 'Geral'}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-slate-600" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Rodape Informativo */}
            <footer className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold">Por favor, mantenha os documentos em mãos ao ser chamado.</span>
                <span className="text-indigo-400 font-bold">Sistema de Gestão Hospitalar</span>
            </footer>
        </div>
    );
};

export default PainelTV;