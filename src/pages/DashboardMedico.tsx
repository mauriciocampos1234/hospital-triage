import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { Patient } from '../types';
import { Stethoscope, LogOut, Bell, CheckCircle2, HeartPulse, Activity, Thermometer, Gauge } from 'lucide-react';

export const DashboardMedico: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [roomNumber, setRoomNumber] = useState('Consultório 01');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchPatients = async () => {
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .in('status', ['aguardando_atendimento_medico', 'em_atendimento'])
                .order('is_priority', { ascending: false })
                .order('created_at', { ascending: true });

            if (error) throw error;
            setPatients(data || []);

            // Se houver algum em atendimento com este médico/sala, foca nele
            const current = data?.find((p) => p.status === 'em_atendimento');
            if (current) setSelectedPatient(current);
        } catch (err) {
            console.error('Erro ao buscar fila médica:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .in('status', ['aguardando_atendimento_medico', 'em_atendimento'])
                    .order('is_priority', { ascending: false })
                    .order('created_at', { ascending: true });

                if (error) throw error;
                if (active) {
                    setPatients(data || []);
                    const current = data?.find((p) => p.status === 'em_atendimento');
                    if (current) setSelectedPatient(current);
                }
            } catch (err) {
                console.error('Erro ao carregar pacientes:', err);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadData();

        const channel = supabase
            .channel('public:patients:doctor')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(channel);
        };
    }, []);

    // Chamar Paciente (Atualiza o Painel TV)
    const handleCallPatient = async (patient: Patient) => {
        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('patients')
                .update({
                    status: 'em_atendimento',
                    doctor_room: roomNumber,
                    called_at: new Date().toISOString(),
                })
                .eq('id', patient.id);

            if (error) throw error;
            setSelectedPatient({ ...patient, status: 'em_atendimento', doctor_room: roomNumber });
            await fetchPatients();
        } catch (err) {
            console.error('Erro ao chamar paciente:', err);
            alert('Falha ao chamar paciente para o painel.');
        } finally {
            setActionLoading(false);
        }
    };

    // Finalizar Consulta
    const handleFinishConsultation = async () => {
        if (!selectedPatient) return;
        setActionLoading(true);

        try {
            const { error } = await supabase
                .from('patients')
                .update({
                    status: 'finalizado',
                })
                .eq('id', selectedPatient.id);

            if (error) throw error;
            setSelectedPatient(null);
            await fetchPatients();
        } catch (err) {
            console.error('Erro ao finalizar atendimento:', err);
            alert('Falha ao finalizar consulta.');
        } finally {
            setActionLoading(false);
        }
    };

    const getRiskBadge = (risk?: string | null) => {
        switch (risk) {
            case 'vermelho': return 'bg-red-600 text-white';
            case 'laranja': return 'bg-orange-500 text-white';
            case 'amarelo': return 'bg-yellow-400 text-slate-900';
            case 'verde': return 'bg-emerald-500 text-white';
            case 'azul': return 'bg-blue-500 text-white';
            default: return 'bg-slate-200 text-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/30">
                        <Stethoscope className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Portal Médico</h1>
                        <p className="text-xs text-slate-400">
                            Dr(a). {profile?.name} {profile?.crm ? `| CRM: ${profile.crm}` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                        <label className="text-[11px] text-slate-400 font-semibold uppercase">Sala:</label>
                        <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none w-28 text-center font-bold"
                        />
                    </div>

                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 text-xs px-3 py-2 rounded-xl transition"
                    >
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Coluna da Esquerda: Fila de Espera */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-fit">
                    <h2 className="text-base font-bold text-slate-800 mb-4 flex justify-between items-center">
                        <span>Aguardando Consulta</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                            {patients.filter((p) => p.status === 'aguardando_atendimento_medico').length}
                        </span>
                    </h2>

                    <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                        {loading ? (
                            <p className="text-xs text-slate-400 text-center py-6">Carregando fila...</p>
                        ) : patients.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">Nenhum paciente na fila no momento.</p>
                        ) : (
                            patients.map((p) => (
                                <div
                                    key={p.id}
                                    className={`p-4 rounded-xl border transition flex justify-between items-center ${selectedPatient?.id === p.id
                                            ? 'border-indigo-600 bg-indigo-50/50'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-indigo-600 text-sm">{p.ticket_number}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getRiskBadge(p.risk_level)}`}>
                                                {p.risk_level || 'Sem Classificação'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-800">{p.name}</p>
                                        <p className="text-[10px] text-slate-500">Sintoma: {p.symptoms || 'Não informado'}</p>
                                    </div>

                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleCallPatient(p)}
                                        className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition disabled:bg-indigo-300"
                                        title="Chamar no Painel TV"
                                    >
                                        <Bell className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Coluna da Direita: Atendimento Ativo */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-6">
                    {selectedPatient ? (
                        <div className="space-y-6">

                            {/* Header do Paciente Ativo */}
                            <div className="flex justify-between items-start border-b pb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                            Em Consulta
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getRiskBadge(selectedPatient.risk_level)}`}>
                                            Manchester: {selectedPatient.risk_level || 'N/A'}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800">{selectedPatient.name}</h2>
                                    <p className="text-xs text-slate-500">CPF: {selectedPatient.cpf} | Data Nasc: {selectedPatient.birth_date}</p>
                                </div>

                                <div className="text-right">
                                    <span className="text-xs text-slate-400 block">Senha</span>
                                    <span className="text-3xl font-black text-indigo-600">{selectedPatient.ticket_number}</span>
                                </div>
                            </div>

                            {/* Sinais Vitais Extraídos na Triagem */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <HeartPulse className="w-4 h-4 text-indigo-600" /> Sinais Vitais da Triagem
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                                            <Gauge className="w-3 h-3 text-slate-500" /> Pressão (PA)
                                        </span>
                                        <span className="text-sm font-bold text-slate-800">{selectedPatient.blood_pressure || 'N/A'}</span>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                                            <Activity className="w-3 h-3 text-slate-500" /> Freq. Cardíaca
                                        </span>
                                        <span className="text-sm font-bold text-slate-800">
                                            {selectedPatient.heart_rate ? `${selectedPatient.heart_rate} bpm` : 'N/A'}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                                            <Thermometer className="w-3 h-3 text-slate-500" /> Temperatura
                                        </span>
                                        <span className="text-sm font-bold text-slate-800">
                                            {selectedPatient.temperature ? `${selectedPatient.temperature} °C` : 'N/A'}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                                            <Stethoscope className="w-3 h-3 text-slate-500" /> SpO2
                                        </span>
                                        <span className="text-sm font-bold text-slate-800">
                                            {selectedPatient.oxygen_saturation ? `${selectedPatient.oxygen_saturation}%` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Queixa Principal / Sintomas */}
                            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                                    Queixa Relatada na Triagem:
                                </h4>
                                <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                                    {selectedPatient.symptoms || 'Nenhum sintoma registrado.'}
                                </p>
                            </div>

                            {/* Botões de Ação */}
                            <div className="pt-4 border-t flex justify-between items-center">
                                <button
                                    onClick={() => handleCallPatient(selectedPatient)}
                                    disabled={actionLoading}
                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
                                >
                                    <Bell className="w-4 h-4 text-indigo-400" /> Re-chamar no Painel
                                </button>

                                <button
                                    onClick={handleFinishConsultation}
                                    disabled={actionLoading}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2 disabled:bg-emerald-300"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {actionLoading ? 'Finalizando...' : 'Concluir Atendimento'}
                                </button>
                            </div>

                        </div>
                    ) : (
                        <div className="my-auto text-center py-16 space-y-3">
                            <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-3xl">
                                <Stethoscope className="w-10 h-10" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800">Nenhum Paciente Selecionado</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Selecione um paciente na fila à esquerda para iniciar ou retomar a consulta médica.
                            </p>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};