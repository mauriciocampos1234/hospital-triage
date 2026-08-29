import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../config/supabase";
import { Tv, Volume2, Clock } from "lucide-react";

interface PatientQueue {
    id: string;
    patient_name: string;
    priority: "verde" | "amarelo" | "vermelho";
    status: "aguardando" | "em_atendimento" | "concluido";
    created_at: string;
}

export const PainelTV: React.FC = () => {
    const [currentCall, setCurrentCall] = useState<PatientQueue | null>(null);
    const [history, setHistory] = useState<PatientQueue[]>([]);
    const [loading, setLoading] = useState(true);

    // Efeito sonoro sintético via Web Audio API (sem dependência de arquivo de áudio)
    const playSound = () => {
        try {
            const AudioCtx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext })
                    .webkitAudioContext;
            const ctx = new AudioCtx();

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = "sine";
            osc2.type = "sine";

            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5

            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.3);

            osc2.start(ctx.currentTime + 0.2);
            osc2.stop(ctx.currentTime + 1.2);
        } catch (e) {
            console.error("Erro ao emitir áudio:", e);
        }
    };

    const fetchPainelData = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("triage")
                .select("*")
                .eq("status", "em_atendimento")
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                setCurrentCall(data[0]);
                setHistory(data.slice(1, 6));
            } else {
                setCurrentCall(null);
                setHistory([]);
            }
        } catch (err) {
            console.error("Erro ao buscar chamadas:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            await fetchPainelData();
        };
        loadData();

        // Inscrição Supabase Realtime para soar alarme e atualizar a TV quando um médico chamar
        const subscription = supabase
            .channel("tv_realtime")
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "triage" },
                (payload) => {
                    const updated = payload.new as PatientQueue;
                    if (updated.status === "em_atendimento") {
                        playSound();
                    }
                    fetchPainelData();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchPainelData]);

    const getPriorityColor = (prio: string) => {
        switch (prio) {
            case "vermelho":
                return "bg-red-600 border-red-500 text-white";
            case "amarelo":
                return "bg-amber-500 border-amber-400 text-slate-900";
            default:
                return "bg-emerald-600 border-emerald-500 text-white";
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
            {/* Header da TV */}
            <header className="bg-slate-900 border-b border-slate-800 px-8 py-5 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                        <Tv className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-wide text-white uppercase">
                            Painel de Chamadas
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">
                            Hospital Triage System • Real-Time
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                    <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-300">
                        Som Ativo
                    </span>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {/* Chamada Principal */}
                <section className="lg:col-span-2 bg-slate-900/90 rounded-3xl border-2 border-slate-800 p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                    <div className="space-y-4">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-bold tracking-wider uppercase">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                            Paciente Chamado
                        </span>

                        {loading ? (
                            <div className="py-20 text-center text-slate-500 text-xl font-medium">
                                Carregando chamadas...
                            </div>
                        ) : currentCall ? (
                            <div className="space-y-6 pt-4">
                                <h2 className="text-6xl lg:text-7xl font-black tracking-tight text-white leading-none drop-shadow-md">
                                    {currentCall.patient_name}
                                </h2>

                                <div className="flex items-center gap-4">
                                    <span
                                        className={`px-6 py-2.5 rounded-2xl text-xl font-black tracking-wide uppercase shadow-lg border ${getPriorityColor(currentCall.priority)}`}
                                    >
                                        Prioridade: {currentCall.priority}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="py-24 text-center text-slate-500 space-y-3">
                                <Clock className="w-16 h-16 mx-auto stroke-1 text-slate-600" />
                                <p className="text-2xl font-bold text-slate-400">
                                    Aguardando próxima chamada...
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t border-slate-800/80 flex justify-between items-center text-slate-400 text-sm font-medium">
                        <span>Por favor, dirija-se ao consultório médico.</span>
                        <span className="text-blue-400 font-bold">Triagem Hospitalar</span>
                    </div>
                </section>

                {/* Histórico Recente */}
                <section className="bg-slate-900/60 rounded-3xl border border-slate-800 p-8 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                        <span>Últimas Chamadas</span>
                    </h3>

                    <div className="flex-1 space-y-4 overflow-y-auto">
                        {history.length === 0 ? (
                            <p className="text-slate-600 text-sm text-center py-10">
                                Nenhum histórico recente.
                            </p>
                        ) : (
                            history.map((pat) => (
                                <div
                                    key={pat.id}
                                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center shadow"
                                >
                                    <div>
                                        <p className="font-extrabold text-slate-200 text-lg">
                                            {pat.patient_name}
                                        </p>
                                        <p className="text-xs text-slate-500 capitalize">
                                            {pat.priority} prioridade
                                        </p>
                                    </div>
                                    <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                                        Em Atendimento
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};
