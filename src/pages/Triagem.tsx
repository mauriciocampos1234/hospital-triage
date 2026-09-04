import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Patient, RiskLevel } from '../types';
import { 
    Activity, 
    RefreshCw, 
    HeartPulse, 
    Thermometer, 
    Gauge, 
    Stethoscope, 
    MessageSquare, 
    X, 
    CheckCircle2, 
    Phone,
    Clock
} from 'lucide-react';

export const Triagem: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Formulário do Modal de Triagem
    const [symptoms, setSymptoms] = useState('');
    const [bloodPressure, setBloodPressure] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [temperature, setTemperature] = useState('');
    const [oxygenSaturation, setOxygenSaturation] = useState('');
    const [riskLevel, setRiskLevel] = useState<RiskLevel>('verde');

    // Busca manual com ordenação de prioridade (is_priority) e ordem de chegada (created_at)
    const handleManualRefresh = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .or('status.eq.aguardando_triagem,status.is.null')
                .order('is_priority', { ascending: false }) // Prioritários no topo
                .order('created_at', { ascending: true });   // Ordem de chegada para empate

            if (error) {
                console.error('Erro ao buscar pacientes:', error);
            } else {
                setPatients(data || []);
            }
        } catch (err) {
            console.error('Erro inesperado:', err);
        } finally {
            setLoading(false);
        }
    };

    // Effect assíncrono para montagem inicial e escuta em tempo real
    useEffect(() => {
        let isMounted = true;

        const loadPatients = async () => {
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .or('status.eq.aguardando_triagem,status.is.null')
                    .order('is_priority', { ascending: false })
                    .order('created_at', { ascending: true });

                if (isMounted) {
                    if (error) {
                        console.error('Erro ao buscar pacientes:', error);
                    } else {
                        setPatients(data || []);
                    }
                }
            } catch (err) {
                console.error('Erro inesperado:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
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

    // Calcula a idade do paciente
    const getAge = (birthDateString: string): number => {
        if (!birthDateString) return 0;
        const birth = new Date(birthDateString);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const handleOpenTriage = (patient: Patient) => {
        setSelectedPatient(patient);
        setSymptoms(patient.symptoms || '');
        setBloodPressure(patient.blood_pressure || '');
        setHeartRate(patient.heart_rate?.toString() || '');
        setTemperature(patient.temperature?.toString() || '');
        setOxygenSaturation(patient.oxygen_saturation?.toString() || '');
        setRiskLevel((patient.risk_level as RiskLevel) || 'verde');
    };

    const handleCloseModal = () => {
        setSelectedPatient(null);
        setSymptoms('');
        setBloodPressure('');
        setHeartRate('');
        setTemperature('');
        setOxygenSaturation('');
        setRiskLevel('verde');
    };

    const handleSaveTriage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setSubmitting(true);
        try {
            const isSenior = getAge(selectedPatient.birth_date) >= 60;

            const payload = {
                status: 'aguardando_atendimento',
                risk_level: riskLevel,
                symptoms: symptoms.trim(),
                blood_pressure: bloodPressure.trim() || null,
                heart_rate: heartRate ? parseInt(heartRate, 10) : null,
                temperature: temperature ? parseFloat(temperature) : null,
                oxygen_saturation: oxygenSaturation ? parseInt(oxygenSaturation, 10) : null,
                is_priority: Boolean(isSenior || selectedPatient.is_priority)
            };

            const { error } = await supabase
                .from('patients')
                .update(payload)
                .eq('id', selectedPatient.id);

            if (error) {
                console.error('Detalhes do erro Supabase:', error);
                throw error;
            }

            alert(`Triagem concluída para ${selectedPatient.name}! Encaminhado para atendimento.`);
            handleCloseModal();
            handleManualRefresh();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar triagem.';
            alert('Falha ao salvar triagem: ' + msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendWhatsApp = (patient: Patient) => {
        const rawPhone = patient.phone || patient.whatsapp;
        if (!rawPhone) {
            alert('Telefone do paciente não informado.');
            return;
        }

        const cleanPhone = rawPhone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const message = encodeURIComponent(
            `Olá, ${patient.name}. Sua triagem foi concluída no hospital. Por favor, aguarde a chamada do seu nome no painel principal do consultório.`
        );

        window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    };

    const getRiskBadgeColor = (risk: string) => {
        switch (risk) {
            case 'vermelho':
            case 'emergencia':
                return 'bg-red-600 text-white border-red-500';
            case 'laranja':
            case 'muito_urgente':
                return 'bg-orange-500 text-white border-orange-400';
            case 'amarelo':
            case 'urgente':
                return 'bg-amber-500 text-slate-950 border-amber-400 font-bold';
            case 'verde':
            case 'pouco_urgente':
                return 'bg-emerald-600 text-white border-emerald-500';
            case 'azul':
            case 'nao_urgente':
            default:
                return 'bg-blue-600 text-white border-blue-500';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
            {/* Cabecalho */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl shadow-xl">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
                            <Activity className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-wide text-white">Módulo de Triagem</h1>
                            <p className="text-xs text-slate-400">Classificação de risco e fila por ordem de chegada</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-3 py-1.5 bg-slate-700/60 rounded-xl text-slate-300">
                        Na fila: <strong className="text-indigo-400">{patients.length}</strong>
                    </span>
                    <button
                        onClick={handleManualRefresh}
                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Atualizar</span>
                    </button>
                </div>
            </header>

            {/* Listagem de Pacientes na Fila */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm font-medium">Organizando fila de atendimento...</p>
                </div>
            ) : patients.length === 0 ? (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-12 text-center text-slate-400 max-w-lg mx-auto space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h3 className="text-base font-bold text-white">Fila limpa!</h3>
                    <p className="text-xs">Não há pacientes aguardando triagem no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {patients.map((patient, index) => {
                        const age = getAge(patient.birth_date);
                        const isSenior = age >= 60 || patient.is_priority;
                        const arrivalTime = patient.created_at 
                            ? new Date(patient.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            : '--:--';

                        return (
                            <div 
                                key={patient.id}
                                className="bg-slate-800/90 border border-slate-700 hover:border-slate-600 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition duration-200 flex flex-col justify-between space-y-4 relative"
                            >
                                {/* Indicador de Senha e Tag de Prioridade */}
                                <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                                    <span className="text-xs font-black bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-xl">
                                        Senha #{index + 1}
                                    </span>

                                    {isSenior && (
                                        <span className="shrink-0 text-[10px] uppercase font-extrabold px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl">
                                            60+ Prioritário
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <h3 className="font-black text-base text-white tracking-wide">{patient.name}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">CPF: {patient.cpf || 'Não informado'}</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
                                        <div>
                                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Idade</span>
                                            <span className="font-bold text-slate-200">{age} anos</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Chegada</span>
                                            <span className="font-bold text-slate-200 flex items-center justify-center gap-1">
                                                <Clock className="w-3 h-3 text-indigo-400 inline" />
                                                {arrivalTime}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Especialidade</span>
                                            <span className="font-bold text-slate-200 truncate block">{patient.specialty || 'Geral'}</span>
                                        </div>
                                    </div>

                                    {patient.phone && (
                                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                                {patient.phone}
                                            </span>
                                            {patient.has_whatsapp && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWhatsApp(patient)}
                                                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span>Enviar Msg</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleOpenTriage(patient)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-2xl text-xs shadow-lg shadow-indigo-600/20 transition duration-200 flex items-center justify-center gap-2"
                                >
                                    <Stethoscope className="w-4 h-4" />
                                    <span>Iniciar Classificação / Triagem</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Triagem e Sinais Vitais */}
            {selectedPatient && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 my-8">
                        {/* Header Modal */}
                        <div className="flex items-start justify-between pb-4 border-b border-slate-700">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Atendimento de Enfermagem</span>
                                <h2 className="text-xl font-black text-white">{selectedPatient.name}</h2>
                                <p className="text-xs text-slate-400">
                                    Idade: {getAge(selectedPatient.birth_date)} anos | CPF: {selectedPatient.cpf}
                                </p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSaveTriage} className="space-y-6">
                            {/* Afericao de Sinais Vitais */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                                    <HeartPulse className="w-4 h-4 text-indigo-400" />
                                    <span>Sinais Vitais</span>
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                                            <Gauge className="w-3 h-3 text-indigo-400" /> PA (mmHg)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="120/80"
                                            value={bloodPressure}
                                            onChange={(e) => setBloodPressure(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:border-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                                            <HeartPulse className="w-3 h-3 text-red-400" /> FC (bpm)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="80"
                                            value={heartRate}
                                            onChange={(e) => setHeartRate(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:border-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                                            <Thermometer className="w-3 h-3 text-amber-400" /> Temp (°C)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="36.5"
                                            value={temperature}
                                            onChange={(e) => setTemperature(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:border-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                                            <Activity className="w-3 h-3 text-sky-400" /> SpO2 (%)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="98"
                                            value={oxygenSaturation}
                                            onChange={(e) => setOxygenSaturation(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Queixa Principal e Sintomas */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                                    Sintomas / Queixa Principal
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Descreva as dores, sintomas relatados e histórico breve..."
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-2xl p-3 text-xs focus:border-indigo-500 outline-none"
                                />
                            </div>

                            {/* Classificacao de Risco Manchester */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                    Classificação de Risco (Manchester)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {[
                                        { id: 'vermelho', name: 'Vermelho', desc: 'Emergência' },
                                        { id: 'laranja', name: 'Laranja', desc: 'Muito Urgente' },
                                        { id: 'amarelo', name: 'Amarelo', desc: 'Urgente' },
                                        { id: 'verde', name: 'Verde', desc: 'Pouco Urgente' },
                                        { id: 'azul', name: 'Azul', desc: 'Não Urgente' },
                                    ].map((item) => {
                                        const isSelected = riskLevel === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setRiskLevel(item.id as RiskLevel)}
                                                className={`p-2.5 rounded-2xl border text-center transition ${
                                                    isSelected 
                                                        ? `${getRiskBadgeColor(item.id)} ring-2 ring-white/50 shadow-lg scale-105` 
                                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                            >
                                                <strong className="block text-xs font-black uppercase">{item.name}</strong>
                                                <span className="text-[9px] opacity-80 block">{item.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Botoes de Acao */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700/50 text-xs font-bold transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:bg-indigo-800"
                                >
                                    {submitting ? 'Salvando...' : 'Finalizar Triagem & Encaminhar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Triagem;