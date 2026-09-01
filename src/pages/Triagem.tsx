import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Stethoscope, 
    Activity, 
    Clock, 
    LogOut, 
    CheckCircle2, 
    AlertTriangle,
    User,
    HeartPulse
} from 'lucide-react';

interface WaitingPatient {
    id: string;
    patient_id: string;
    patient_name: string;
    cpf: string;
    created_at: string;
}

export const Triagem: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [queue, setQueue] = useState<WaitingPatient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<WaitingPatient | null>(null);
    const [saving, setSaving] = useState(false);

    // Form Vinais & Triagem
    const [bloodPressure, setBloodPressure] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [riskLevel, setRiskLevel] = useState('verde');

    const fetchTriageQueue = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('triages')
                .select('*')
                .eq('status', 'aguardando_triagem')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setQueue(data || []);
        } catch (err) {
            console.error('Erro ao carregar fila de triagem:', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initQueue = async () => {
            try {
                const { data, error } = await supabase
                    .from('triages')
                    .select('*')
                    .eq('status', 'aguardando_triagem')
                    .order('created_at', { ascending: true });

                if (error) throw error;
                if (isMounted) {
                    setQueue(data || []);
                }
            } catch (err) {
                console.error('Erro ao carregar fila de triagem:', err);
            }
        };

        initQueue();

        // Escutar novos pacientes enviados pela Recepção em tempo real
        const channel = supabase
            .channel('realtime_triages_queue')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'triages' },
                () => {
                    fetchTriageQueue();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [fetchTriageQueue]);

    const handleSelectPatient = (patient: WaitingPatient) => {
        setSelectedPatient(patient);
        setBloodPressure('');
        setHeight('');
        setWeight('');
        setSymptoms('');
        setRiskLevel('verde');
    };

    const handleSaveTriage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setSaving(true);

        try {
            const { error } = await supabase
                .from('triages')
                .update({
                    blood_pressure: bloodPressure || null,
                    height: height || null,
                    weight: weight || null,
                    symptoms,
                    risk_level: riskLevel,
                    triage_staff_id: profile?.id,
                    status: 'aguardando' // Liberado para o Médico e Painel TV
                })
                .eq('id', selectedPatient.id);

            if (error) throw error;

            alert(`Triagem de ${selectedPatient.patient_name} concluída! Paciente enviado para a fila médica.`);
            setSelectedPatient(null);
            await fetchTriageQueue();
        } catch (err) {
            const errorObj = err as Error;
            console.error('Erro ao salvar triagem:', errorObj);
            alert(`Falha ao registrar triagem: ${errorObj.message || 'Tente novamente.'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const riskBadges = [
        { id: 'vermelho', label: 'Emergência (Vermelho)', bg: 'bg-red-600 text-white border-red-700' },
        { id: 'laranja', label: 'Muito Urgente (Laranja)', bg: 'bg-orange-500 text-white border-orange-600' },
        { id: 'amarelo', label: 'Urgente (Amarelo)', bg: 'bg-yellow-400 text-slate-900 border-yellow-500' },
        { id: 'verde', label: 'Pouco Urgente (Verde)', bg: 'bg-emerald-500 text-white border-emerald-600' },
        { id: 'azul', label: 'Não Urgente (Azul)', bg: 'bg-blue-500 text-white border-blue-600' },
    ];

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Triagem & Enfermagem</h1>
                        <p className="text-xs text-slate-500">
                            Profissional: <span className="font-semibold text-slate-700">{profile?.name}</span>
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded-lg font-medium transition text-xs"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                </button>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Fila de Pacientes na Espera da Triagem */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600" /> Aguardando Triagem ({queue.length})
                        </h2>
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                        {queue.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-10">
                                Nenhum paciente aguardando triagem no momento.
                            </p>
                        ) : (
                            queue.map((item) => {
                                const isSelected = selectedPatient?.id === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectPatient(item)}
                                        className={`p-4 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                                            isSelected 
                                                ? 'bg-emerald-50 border-emerald-400 shadow-sm' 
                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <p className="font-bold text-slate-800 text-xs">{item.patient_name}</p>
                                            <p className="text-[11px] text-slate-500">CPF: {item.cpf}</p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600">
                                            Selecionar
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Formulário de Classificação / Dados Vitais */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    {!selectedPatient ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 text-slate-400">
                            <Activity className="w-12 h-12 text-slate-300" />
                            <p className="text-xs font-medium">Selecione um paciente na fila ao lado para iniciar a triagem.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveTriage} className="space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                                        Atendimento de Triagem
                                    </span>
                                    <h2 className="text-lg font-bold text-slate-800 mt-1">{selectedPatient.patient_name}</h2>
                                    <p className="text-xs text-slate-400">CPF: {selectedPatient.cpf}</p>
                                </div>
                                <User className="w-8 h-8 text-slate-300" />
                            </div>

                            {/* Sinais Vitais */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                                    <HeartPulse className="w-4 h-4 text-emerald-600" /> Sinais Vitais & Biometria
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <label className="block font-semibold text-slate-600 mb-1">Pressão Arterial (PA)</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 120/80 mmHg"
                                            value={bloodPressure}
                                            onChange={(e) => setBloodPressure(e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-600 mb-1">Altura</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 1.75 m"
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-600 mb-1">Peso</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 70 kg"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sintomas Relatados */}
                            <div className="space-y-2 text-xs">
                                <label className="block font-bold uppercase text-slate-700">Queixas Principal / Sintomas *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Descreva as principais dores, sintomas e observações do paciente..."
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Classificação de Risco Protocolo Manchester */}
                            <div className="space-y-3">
                                <label className="block font-bold uppercase text-xs text-slate-700 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Classificação de Risco (Manchester) *
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {riskBadges.map((badge) => (
                                        <button
                                            key={badge.id}
                                            type="button"
                                            onClick={() => setRiskLevel(badge.id)}
                                            className={`p-3 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                                                badge.bg
                                            } ${riskLevel === badge.id ? 'ring-2 ring-slate-900 shadow-md scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
                                        >
                                            <span>{badge.label}</span>
                                            {riskLevel === badge.id && <CheckCircle2 className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPatient(null)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow disabled:bg-emerald-300"
                                >
                                    {saving ? 'Finalizando...' : 'Concluir Triagem & Enviar p/ Médico'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
};