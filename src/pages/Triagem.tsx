import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { Patient, RiskLevel } from '../types';
import { Stethoscope, ArrowLeft, HeartPulse, Activity, Thermometer, Gauge } from 'lucide-react';

export const Triagem: React.FC = () => {
    const { patientId } = useParams<{ patientId: string }>();
    const navigate = useNavigate();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form Triagem
    const [symptoms, setSymptoms] = useState('');
    const [bloodPressure, setBloodPressure] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [temperature, setTemperature] = useState('');
    const [oxygenSaturation, setOxygenSaturation] = useState('');
    const [riskLevel, setRiskLevel] = useState<RiskLevel>('verde');

    useEffect(() => {
        const fetchPatient = async () => {
            if (!patientId) return;
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', patientId)
                    .single();

                if (error) throw error;
                setPatient(data);
            } catch (err) {
                console.error('Erro ao buscar paciente:', err);
                alert('Paciente não encontrado.');
                navigate('/recepcao');
            } finally {
                setLoading(false);
            }
        };

        fetchPatient();
    }, [patientId, navigate]);

    const handleSaveTriage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) return;
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('patients')
                .update({
                    symptoms,
                    blood_pressure: bloodPressure,
                    heart_rate: heartRate ? Number(heartRate) : null,
                    temperature: temperature ? Number(temperature) : null,
                    oxygen_saturation: oxygenSaturation ? Number(oxygenSaturation) : null,
                    risk_level: riskLevel,
                    status: 'aguardando_atendimento_medico',
                })
                .eq('id', patientId);

            if (error) throw error;

            alert('Triagem concluída com sucesso!');
            navigate('/recepcao');
        } catch (err) {
            console.error('Erro ao salvar triagem:', err);
            alert('Falha ao salvar triagem.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <p className="text-xs font-semibold text-slate-500">Carregando dados da triagem...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Top bar */}
                <button
                    onClick={() => navigate('/recepcao')}
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para a Recepção
                </button>

                {/* Card Informações Paciente */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow flex justify-between items-center">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Ficha de Triagem</span>
                        <h1 className="text-2xl font-black">{patient?.name}</h1>
                        <p className="text-xs text-slate-400 mt-1">CPF: {patient?.cpf} | Nasc: {patient?.birth_date}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 block">Senha de Atendimento</span>
                        <span className="text-3xl font-black text-indigo-400">{patient?.ticket_number}</span>
                    </div>
                </div>

                {/* Form Triagem */}
                <form onSubmit={handleSaveTriage} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">

                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <HeartPulse className="w-5 h-5 text-indigo-600" /> Sinais Vitais & Sintomas
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                <Gauge className="w-3.5 h-3.5 text-slate-400" /> PA (mmHg)
                            </label>
                            <input
                                type="text"
                                placeholder="120/80"
                                value={bloodPressure}
                                onChange={(e) => setBloodPressure(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5 text-slate-400" /> FC (bpm)
                            </label>
                            <input
                                type="number"
                                placeholder="80"
                                value={heartRate}
                                onChange={(e) => setHeartRate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                <Thermometer className="w-3.5 h-3.5 text-slate-400" /> Temp (°C)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="36.5"
                                value={temperature}
                                onChange={(e) => setTemperature(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5 text-slate-400" /> SpO2 (%)
                            </label>
                            <input
                                type="number"
                                placeholder="98"
                                value={oxygenSaturation}
                                onChange={(e) => setOxygenSaturation(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Queixa Principal / Sintomas *</label>
                        <textarea
                            required
                            rows={3}
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            placeholder="Descreva a queixa e os sintomas relatados pelo paciente..."
                            className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                    </div>

                    {/* Seleção de Protocolo Manchester */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-3">
                            Classificação de Risco (Protocolo Manchester) *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {[
                                { level: 'vermelho', label: 'Emergência', color: 'bg-red-600 text-white' },
                                { level: 'laranja', label: 'Muito Urgente', color: 'bg-orange-500 text-white' },
                                { level: 'amarelo', label: 'Urgente', color: 'bg-yellow-400 text-slate-900' },
                                { level: 'verde', label: 'Pouco Urgente', color: 'bg-emerald-500 text-white' },
                                { level: 'azul', label: 'Não Urgente', color: 'bg-blue-500 text-white' },
                            ].map((item) => (
                                <button
                                    key={item.level}
                                    type="button"
                                    onClick={() => setRiskLevel(item.level as RiskLevel)}
                                    className={`p-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border-2 ${item.color
                                        } ${riskLevel === item.level
                                            ? 'border-slate-900 shadow-lg scale-105'
                                            : 'border-transparent opacity-70 hover:opacity-100'
                                        }`}
                                >
                                    <span className="uppercase">{item.level}</span>
                                    <span className="text-[10px] font-normal">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/recepcao')}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition disabled:bg-indigo-300"
                        >
                            {submitting ? 'Salvando...' : 'Finalizar Triagem'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};