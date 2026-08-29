import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Volume2, Monitor, Clock } from 'lucide-react';

interface TriageCall {
    id: string;
    risk_level: string;
    status: string;
    updated_at: string;
    patients?: { name: string };
}

const MANCHESTER_COLORS: Record<string, string> = {
    Vermelho: 'bg-red-600 border-red-400 text-white',
    Laranja: 'bg-orange-500 border-orange-300 text-white',
    Amarelo: 'bg-yellow-400 border-yellow-200 text-slate-900',
    Verde: 'bg-emerald-600 border-emerald-400 text-white',
    Azul: 'bg-blue-600 border-blue-400 text-white',
};

export const PainelTV: React.FC = () => {
    const [lastCalled, setLastCalled] = useState<TriageCall | null>(null);
    const [callHistory, setCallHistory] = useState<TriageCall[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Relógio do painel
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchLastCalls = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('triages')
                .select('*, patients(name)')
                .eq('status', 'em_atendimento')
                .order('updated_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            const list = (data || []) as TriageCall[];
            if (list.length > 0) {
                setLastCalled(list[0]);
                setCallHistory(list.slice(1));
            }
        } catch (err) {
            console.error('Erro ao buscar chamadas da TV:', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadInitial = async () => {
            if (isMounted) {
                await fetchLastCalls();
            }
        };

        loadInitial();

        const subscription = supabase
            .channel('tv_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'triages' }, () => {
                fetchLastCalls();
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [fetchLastCalls]);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
            {/* Topbar / Relógio */}
            <header className="bg-slate-900 border-b border-slate-800 px-8 py-5 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                        <Monitor className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-wide uppercase text-slate-100">Painel de Chamada</h1>
                        <p className="text-xs font-medium text-slate-400">Atendimento Ambulatorial & Emergência</p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-3xl font-extrabold tracking-tight text-slate-100 font-mono">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </div>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-8">
                {/* Destaque Principal: Último Paciente Chamado */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 animate-pulse">
                            <Volume2 className="w-5 h-5" /> Chamada Atual
                        </span>
                        {lastCalled?.risk_level && (
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase border ${MANCHESTER_COLORS[lastCalled.risk_level] || 'bg-slate-700'}`}>
                                {lastCalled.risk_level}
                            </span>
                        )}
                    </div>

                    <div className="my-12 text-center space-y-4">
                        <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Paciente</p>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase drop-shadow-md">
                            {lastCalled?.patients?.name || 'Aguardando Chamada'}
                        </h2>
                    </div>

                    <div className="bg-slate-800/60 rounded-2xl p-6 text-center border border-slate-700/50">
                        <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Dirija-se ao</p>
                        <p className="text-3xl font-black text-blue-400 uppercase tracking-wide">Consultório Médico</p>
                    </div>
                </div>

                {/* Lateral: Histórico Recente */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col space-y-4 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-slate-800 pb-3">
                        <Clock className="w-4 h-4" /> Últimas Chamadas
                    </h3>

                    <div className="flex-1 space-y-3 overflow-hidden">
                        {callHistory.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-8">Nenhuma chamada anterior.</p>
                        ) : (
                            callHistory.map((item) => (
                                <div key={item.id} className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-200 uppercase">{item.patients?.name || 'Paciente'}</p>
                                        <p className="text-xs text-blue-400 font-medium">Consultório</p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${MANCHESTER_COLORS[item.risk_level] || 'bg-slate-700 text-white'}`}>
                                        {item.risk_level}
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