import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { Patient } from '../types';
import { Monitor, Volume2 } from 'lucide-react';

export const PainelTV: React.FC = () => {
    const [currentCall, setCurrentCall] = useState<Patient | null>(null);
    const [recentCalls, setRecentCalls] = useState<Patient[]>([]);

    useEffect(() => {
        const fetchLastCalls = async () => {
            try {
                const { data } = await supabase
                    .from('patients')
                    .select('*')
                    .not('called_at', 'is', null)
                    .order('called_at', { ascending: false })
                    .limit(5);

                if (data && data.length > 0) {
                    setCurrentCall(data[0]);
                    setRecentCalls(data.slice(1));
                }
            } catch (err) {
                console.error('Erro ao buscar chamadas:', err);
            }
        };

        fetchLastCalls();

        const channel = supabase
            .channel('public:patients:tv')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, (payload) => {
                if (payload.new && payload.new.called_at) {
                    fetchLastCalls();
                    try {
                        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        osc.connect(ctx.destination);
                        osc.frequency.setValueAtTime(440, ctx.currentTime);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.3);
                    } catch {
                        // Ignora se o navegador bloquear som sem clique inicial
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col justify-between">
            <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <Monitor className="w-8 h-8 text-indigo-500 animate-pulse" />
                    <h1 className="text-2xl font-black tracking-wider">PAINEL DE CHAMADA</h1>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                    <Volume2 className="w-4 h-4 text-emerald-400" /> Sistema Ativo
                </div>
            </header>

            <main className="my-auto py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2 bg-indigo-950/40 border-2 border-indigo-500/50 rounded-3xl p-10 text-center shadow-2xl shadow-indigo-500/10 space-y-4">
                    <span className="text-sm font-bold tracking-widest text-indigo-400 uppercase">Senha Atual</span>
                    <div className="text-8xl sm:text-9xl font-black text-white tracking-wider my-2">
                        {currentCall ? currentCall.ticket_number : '---'}
                    </div>
                    <div className="text-3xl font-bold text-indigo-200">
                        {currentCall ? currentCall.name : 'Aguardando Chamada...'}
                    </div>
                    {currentCall?.doctor_room && (
                        <div className="pt-4 text-xl font-semibold text-slate-300 border-t border-indigo-900/50 inline-block px-8">
                            Dirija-se ao: <span className="text-emerald-400 font-bold">{currentCall.doctor_room}</span>
                        </div>
                    )}
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                        Últimas Chamadas
                    </h2>
                    <div className="space-y-3">
                        {recentCalls.length === 0 ? (
                            <p className="text-xs text-slate-600">Nenhum histórico recente.</p>
                        ) : (
                            recentCalls.map((item) => (
                                <div key={item.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                                    <div>
                                        <p className="text-sm font-bold text-white">{item.name}</p>
                                        <p className="text-[10px] text-slate-500">{item.doctor_room || 'Atendimento'}</p>
                                    </div>
                                    <span className="text-lg font-black text-indigo-400">{item.ticket_number}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <footer className="text-center text-xs text-slate-600 border-t border-slate-900 pt-4">
                Hospital Triage System • Atualização em Tempo Real
            </footer>
        </div>
    );
};