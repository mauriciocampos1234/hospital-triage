import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Activity,
    UserPlus,
    Clock,
    LogOut,
    AlertCircle,
    HeartPulse,
    Thermometer,
    Gauge,
    Droplets
} from 'lucide-react';

interface TriageItem {
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

const MANCHESTER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    Vermelho: { bg: 'bg-red-500', text: 'text-white', label: 'Emergência (0 min)' },
    Laranja: { bg: 'bg-orange-500', text: 'text-white', label: 'Muito Urgente (10 min)' },
    Amarelo: { bg: 'bg-yellow-400', text: 'text-slate-900', label: 'Urgente (60 min)' },
    Verde: { bg: 'bg-emerald-500', text: 'text-white', label: 'Pouco Urgente (120 min)' },
    Azul: { bg: 'bg-blue-500', text: 'text-white', label: 'Não Urgente (240 min)' },
};

export const Triagem: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [triageList, setTriageList] = useState<TriageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Formulário do Paciente e Triagem
    const [patientName, setPatientName] = useState('');
    const [patientCpf, setPatientCpf] = useState('');
    const [riskLevel, setRiskLevel] = useState('Verde');
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [bloodPressure, setBloodPressure] = useState('');
    const [temperature, setTemperature] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [oxygenSaturation, setOxygenSaturation] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const loadTriages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('triages')
                .select('*, patients(name, cpf)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTriageList(data || []);
        } catch (err) {
            console.error('Erro ao buscar triagens:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const fetchInitialData = async () => {
            try {
                const { data } = await supabase
                    .from('triages')
                    .select('*, patients(name, cpf)')
                    .order('created_at', { ascending: false });

                if (isMounted) {
                    setTriageList(data || []);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Erro ao buscar triagens:', err);
                if (isMounted) setLoading(false);
            }
        };

        fetchInitialData();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const handleSaveTriage = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);

        try {
            let patientId = '';
            const cleanCpf = patientCpf.trim();

            if (cleanCpf) {
                const { data: existingPatient } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('cpf', cleanCpf)
                    .maybeSingle();

                if (existingPatient) {
                    patientId = existingPatient.id;
                }
            }

            if (!patientId) {
                const { data: newPatient, error: patientError } = await supabase
                    .from('patients')
                    .insert([{ name: patientName, cpf: cleanCpf || null }])
                    .select()
                    .single();

                if (patientError) throw patientError;
                patientId = newPatient.id;
            }

            const { error: triageError } = await supabase.from('triages').insert([
                {
                    patient_id: patientId,
                    risk_level: riskLevel,
                    chief_complaint: chiefComplaint,
                    blood_pressure: bloodPressure,
                    temperature: temperature,
                    heart_rate: heartRate,
                    oxygen_saturation: oxygenSaturation,
                    status: 'aguardando',
                },
            ]);

            if (triageError) throw triageError;

            setPatientName('');
            setPatientCpf('');
            setChiefComplaint('');
            setBloodPressure('');
            setTemperature('');
            setHeartRate('');
            setOxygenSaturation('');
            setRiskLevel('Verde');
            setModalOpen(false);

            await loadTriages();
        } catch (err: unknown) {
            console.error('Erro ao cadastrar triagem:', err);
            const msg = err instanceof Error ? err.message : 'Erro ao registrar triagem.';
            setFormError(msg);
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
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Triagem & Classificação de Risco</h1>
                        <p className="text-xs text-slate-500">
                            Operador: <span className="font-semibold text-slate-700">{profile?.name || 'Enfermagem'}</span>
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

            {/* Conteúdo */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Fila de Atendimento Geral</h2>
                        <p className="text-xs text-slate-500">Pacientes triados aguardando consulta médica</p>
                    </div>

                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow transition"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span>Nova Triagem</span>
                    </button>
                </div>

                {/* Tabela de Triagens */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 font-medium">Carregando fila de triagem...</div>
                    ) : triageList.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">Nenhum paciente na fila no momento.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3 px-6">Classificação</th>
                                    <th className="py-3 px-6">Paciente</th>
                                    <th className="py-3 px-6">Sinais Vitais</th>
                                    <th className="py-3 px-6">Queixa Principal</th>
                                    <th className="py-3 px-6">Status</th>
                                    <th className="py-3 px-6">Horário</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {triageList.map((item) => {
                                    const manchester = MANCHESTER_COLORS[item.risk_level] || MANCHESTER_COLORS['Verde'];
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                            <td className="py-4 px-6">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${manchester.bg} ${manchester.text} shadow-sm`}>
                                                    {item.risk_level}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-medium text-slate-800">
                                                {item.patients?.name || 'Paciente sem nome'}
                                                <div className="text-xs text-slate-400">CPF: {item.patients?.cpf || 'Não informado'}</div>
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-600 space-y-0.5">
                                                {item.blood_pressure && <div>PA: <strong>{item.blood_pressure}</strong></div>}
                                                {item.temperature && <div>Temp: <strong>{item.temperature}°C</strong></div>}
                                                {item.heart_rate && <div>FC: <strong>{item.heart_rate} bpm</strong></div>}
                                                {item.oxygen_saturation && <div>SpO2: <strong>{item.oxygen_saturation}%</strong></div>}
                                            </td>
                                            <td className="py-4 px-6 text-slate-600 max-w-xs truncate">
                                                {item.chief_complaint || '-'}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                                                    item.status === 'aguardando'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : item.status === 'em_atendimento'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                    {item.status === 'aguardando' ? 'Aguardando' : item.status === 'em_atendimento' ? 'Em Atendimento' : 'Finalizado'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modal de Cadastro de Triagem */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
                        <div className="bg-teal-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">Nova Triagem de Paciente</h3>
                            <button onClick={() => setModalOpen(false)} className="text-teal-100 hover:text-white font-bold text-xl">✕</button>
                        </div>

                        <form onSubmit={handleSaveTriage} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                            {formError && (
                                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            {/* Dados Básicos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome do Paciente</label>
                                    <input
                                        type="text"
                                        required
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        placeholder="Nome Completo"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">CPF (Opcional)</label>
                                    <input
                                        type="text"
                                        value={patientCpf}
                                        onChange={(e) => setPatientCpf(e.target.value)}
                                        placeholder="000.000.000-00"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Classificação de Manchester */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Classificação de Risco (Manchester)</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.entries(MANCHESTER_COLORS).map(([key, val]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setRiskLevel(key)}
                                            className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-bold border transition ${
                                                riskLevel === key
                                                    ? `${val.bg} ${val.text} ring-2 ring-offset-1 ring-slate-400`
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span>{key}</span>
                                            <span className="font-normal opacity-90">{val.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sinais Vitais */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Sinais Vitais</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center border border-slate-300 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-teal-500">
                                        <Gauge className="w-4 h-4 text-slate-400 mr-2" />
                                        <input
                                            type="text"
                                            value={bloodPressure}
                                            onChange={(e) => setBloodPressure(e.target.value)}
                                            placeholder="PA (120/80)"
                                            className="w-full text-sm outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center border border-slate-300 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-teal-500">
                                        <Thermometer className="w-4 h-4 text-slate-400 mr-2" />
                                        <input
                                            type="text"
                                            value={temperature}
                                            onChange={(e) => setTemperature(e.target.value)}
                                            placeholder="Temp (°C)"
                                            className="w-full text-sm outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center border border-slate-300 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-teal-500">
                                        <HeartPulse className="w-4 h-4 text-slate-400 mr-2" />
                                        <input
                                            type="text"
                                            value={heartRate}
                                            onChange={(e) => setHeartRate(e.target.value)}
                                            placeholder="FC (bpm)"
                                            className="w-full text-sm outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center border border-slate-300 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-teal-500">
                                        <Droplets className="w-4 h-4 text-slate-400 mr-2" />
                                        <input
                                            type="text"
                                            value={oxygenSaturation}
                                            onChange={(e) => setOxygenSaturation(e.target.value)}
                                            placeholder="SpO2 (%)"
                                            className="w-full text-sm outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Queixa Principal */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Queixa Principal / Sintomas</label>
                                <textarea
                                    rows={2}
                                    value={chiefComplaint}
                                    onChange={(e) => setChiefComplaint(e.target.value)}
                                    placeholder="Descreva a queixa trazida pelo paciente..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold rounded-lg text-sm shadow transition"
                                >
                                    {submitting ? 'Salvando...' : 'Confirmar Triagem'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};