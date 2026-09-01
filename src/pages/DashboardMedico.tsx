import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Stethoscope, 
    LogOut, 
    Clock, 
    User, 
    FileText, 
    Plus, 
    X, 
    Paperclip, 
    Calendar, 
    Eye, 
    Download, 
    CheckCircle2, 
    FileDown
} from 'lucide-react';

interface TriagePatient {
    id: string;
    patient_name: string;
    cpf?: string;
    age?: number;
    symptoms?: string;
    risk_level: string;
    status: string;
    created_at: string;
}

interface MedicalRecord {
    id: string;
    patient_id: string;
    doctor_id: string;
    triage_id: string;
    day_number: number;
    clinical_notes: string;
    prescription?: string;
    created_at: string;
    attachments?: Attachment[];
}

interface Attachment {
    id: string;
    medical_record_id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    created_at: string;
}

export const DashboardMedico: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    // Lista de pacientes da fila de atendimento
    const [queue, setQueue] = useState<TriagePatient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<TriagePatient | null>(null);

    // Prontuários diários do paciente selecionado
    const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);

    // Modais
    const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
    const [viewRecordModal, setViewRecordModal] = useState<MedicalRecord | null>(null);

    // Formulário do Prontuário
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [prescription, setPrescription] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);

    // Helper de formatação de data
    const formatDateTime = (isoString: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Cor do badge pelo nível de risco Manchester
    const getRiskBadgeColor = (risk: string) => {
        switch (risk?.toLowerCase()) {
            case 'vermelho': return 'bg-red-500 text-white';
            case 'laranja': return 'bg-orange-500 text-white';
            case 'amarelo': return 'bg-yellow-400 text-slate-900';
            case 'verde': return 'bg-emerald-500 text-white';
            default: return 'bg-blue-500 text-white';
        }
    };

    // Carrega a fila de pacientes
    const loadQueue = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('triages')
                .select('*')
                .in('status', ['aguardando', 'em_atendimento'])
                .order('created_at', { ascending: true });

            if (error) throw error;
            setQueue((data || []) as TriagePatient[]);
        } catch (err) {
            console.error('Erro ao carregar fila de atendimento:', err);
        }
    }, []);

    // Carrega o histórico de prontuários
    const loadPatientRecords = useCallback(async (patientId: string) => {
        try {
            const { data: recordsData, error: recordsError } = await supabase
                .from('medical_records')
                .select('*')
                .eq('triage_id', patientId)
                .order('day_number', { ascending: true });

            if (recordsError) throw recordsError;

            if (recordsData) {
                const recordIds = recordsData.map(r => r.id);
                const { data: attachData } = await supabase
                    .from('medical_record_attachments')
                    .select('*')
                    .in('medical_record_id', recordIds);

                const fullRecords = recordsData.map(record => ({
                    ...record,
                    attachments: attachData?.filter(a => a.medical_record_id === record.id) || []
                }));

                setPatientRecords(fullRecords as MedicalRecord[]);
            }
        } catch (err) {
            console.error('Erro ao carregar prontuários do paciente:', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initQueue = async () => {
            try {
                const { data, error } = await supabase
                    .from('triages')
                    .select('*')
                    .in('status', ['aguardando', 'em_atendimento'])
                    .order('created_at', { ascending: true });

                if (!error && isMounted) {
                    setQueue((data || []) as TriagePatient[]);
                }
            } catch (err) {
                console.error('Erro na inicialização da fila:', err);
            }
        };

        initQueue();

        return () => {
            isMounted = false;
        };
    }, []);

    // Selecionar paciente para atendimento
    const handleSelectPatient = (patient: TriagePatient) => {
        setSelectedPatient(patient);
        loadPatientRecords(patient.id);
    };

    // Salvar nova evolução diária e arquivos no Storage
    const handleSaveMedicalRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient || !profile) return;

        setSaving(true);
        try {
            const nextDayNumber = patientRecords.length + 1;

            const { data: recordData, error: recordError } = await supabase
                .from('medical_records')
                .insert([{
                    patient_id: selectedPatient.id,
                    doctor_id: profile.id,
                    triage_id: selectedPatient.id,
                    day_number: nextDayNumber,
                    clinical_notes: clinicalNotes,
                    prescription: prescription || null,
                }])
                .select()
                .single();

            if (recordError) throw recordError;

            if (selectedFiles.length > 0 && recordData) {
                for (const file of selectedFiles) {
                    const fileExt = file.name.split('.').pop();
                    const filePath = `${recordData.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { error: uploadError } = await supabase
                        .storage
                        .from('medical-attachments')
                        .upload(filePath, file);

                    if (uploadError) {
                        console.error('Erro ao subir arquivo:', uploadError);
                        continue;
                    }

                    await supabase
                        .from('medical_record_attachments')
                        .insert([{
                            medical_record_id: recordData.id,
                            file_name: file.name,
                            file_path: filePath,
                            file_type: file.type || 'application/octet-stream',
                        }]);
                }
            }

            await supabase
                .from('triages')
                .update({ status: 'em_atendimento' })
                .eq('id', selectedPatient.id);

            setClinicalNotes('');
            setPrescription('');
            setSelectedFiles([]);
            setIsNewRecordModalOpen(false);
            await loadPatientRecords(selectedPatient.id);
            await loadQueue();
        } catch (err) {
            console.error('Erro ao salvar prontuário:', err);
            alert('Falha ao registrar evolução do prontuário.');
        } finally {
            setSaving(false);
        }
    };

    const getAttachmentUrl = (filePath: string) => {
        const { data } = supabase.storage.from('medical-attachments').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleFinishConsultation = async () => {
        if (!selectedPatient) return;
        if (!window.confirm('Deseja concluir o atendimento deste paciente?')) return;

        try {
            await supabase
                .from('triages')
                .update({ status: 'finalizado' })
                .eq('id', selectedPatient.id);

            setSelectedPatient(null);
            setPatientRecords([]);
            await loadQueue();
        } catch (err) {
            console.error('Erro ao finalizar atendimento:', err);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Atendimento Médico</h1>
                        <p className="text-xs text-slate-500">
                            Dr(a). <span className="font-semibold text-slate-700">{profile?.name}</span> {profile?.crm ? `— ${profile.crm}` : ''}
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

            {/* Layout em Duas Colunas */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Coluna 1: Fila de Pacientes */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col h-[calc(100vh-140px)]">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Fila de Espera</h2>
                            <p className="text-xs text-slate-500">{queue.length} paciente(s) aguardando</p>
                        </div>
                        <button onClick={loadQueue} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition">
                            <Clock className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {queue.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-8">Nenhum paciente na fila no momento.</p>
                        ) : (
                            queue.map((pt) => {
                                const isSelected = selectedPatient?.id === pt.id;
                                return (
                                    <div
                                        key={pt.id}
                                        onClick={() => handleSelectPatient(pt)}
                                        className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                                            isSelected 
                                                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                                                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRiskBadgeColor(pt.risk_level)}`}>
                                                {pt.risk_level}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{formatDateTime(pt.created_at)}</span>
                                        </div>

                                        <h3 className="font-bold text-slate-800 text-sm">{pt.patient_name}</h3>
                                        
                                        {pt.symptoms && (
                                            <p className="text-xs text-slate-500 line-clamp-2">
                                                <span className="font-semibold text-slate-600">Queixa:</span> {pt.symptoms}
                                            </p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Coluna 2: Prontuário Eletrônico */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[calc(100vh-140px)]">
                    {!selectedPatient ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <User className="w-12 h-12 text-slate-300 mb-3" />
                            <h3 className="text-base font-bold text-slate-700">Nenhum Paciente Selecionado</h3>
                            <p className="text-xs text-slate-400 max-w-sm mt-1">
                                Selecione um paciente na fila à esquerda para abrir a ficha médica e os prontuários diários.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
                            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-slate-800">{selectedPatient.patient_name}</h2>
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getRiskBadgeColor(selectedPatient.risk_level)}`}>
                                            {selectedPatient.risk_level}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Triagem realizada em: {formatDateTime(selectedPatient.created_at)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsNewRecordModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition"
                                    >
                                        <Plus className="w-4 h-4" /> Evolução Diária
                                    </button>

                                    <button
                                        onClick={handleFinishConsultation}
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs transition"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Concluir
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Histórico de Evolução Médica ({patientRecords.length} Registro(s))
                                </h3>

                                {patientRecords.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-slate-500">Nenhum registro de prontuário para este paciente.</p>
                                        <p className="text-[11px] text-slate-400 mt-1">Clique no botão "+ Evolução Diária" acima para abrir o 1º dia.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {patientRecords.map((record) => (
                                            <div 
                                                key={record.id} 
                                                className="p-5 border border-slate-200 rounded-2xl bg-slate-50 space-y-3 hover:border-indigo-200 transition"
                                            >
                                                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black bg-indigo-600 text-white px-3 py-1 rounded-lg">
                                                            {record.day_number}º DIA
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            {formatDateTime(record.created_at)}
                                                        </span>
                                                    </div>

                                                    <button
                                                        onClick={() => setViewRecordModal(record)}
                                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-lg transition"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> Detalhes
                                                    </button>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 uppercase mb-0.5">Anotações Clínicas:</p>
                                                    <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-line">{record.clinical_notes}</p>
                                                </div>

                                                {record.attachments && record.attachments.length > 0 && (
                                                    <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                                                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="text-[11px] font-semibold text-slate-500">
                                                            {record.attachments.length} anexo(s) disponível(is)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal 1: Registrar Nova Evolução */}
            {isNewRecordModalOpen && selectedPatient && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Registrar Evolução — {patientRecords.length + 1}º Dia
                                </h3>
                                <p className="text-xs text-slate-500">Paciente: {selectedPatient.patient_name}</p>
                            </div>
                            <button 
                                onClick={() => setIsNewRecordModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMedicalRecord} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Anotações Clínicas e Diagnóstico *</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={clinicalNotes}
                                    onChange={(e) => setClinicalNotes(e.target.value)}
                                    placeholder="Descreva o estado do paciente, sinais vitais, queixas e parecer médico..."
                                    className="w-full border border-slate-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Receituário / Prescrição Médica</label>
                                <textarea
                                    rows={3}
                                    value={prescription}
                                    onChange={(e) => setPrescription(e.target.value)}
                                    placeholder="Medicamentos dosados, posologia e recomendações..."
                                    className="w-full border border-slate-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Anexar Exames / Laudos / Documentos (PDF, Imagens)</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 rounded-xl p-1"
                                />
                                {selectedFiles.length > 0 && (
                                    <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                                        {selectedFiles.length} arquivo(s) selecionado(s) para upload.
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsNewRecordModalOpen(false)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold transition shadow"
                                >
                                    {saving ? 'Salvando...' : 'Salvar Prontuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Visualização Completa */}
            {viewRecordModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black bg-indigo-600 text-white px-3 py-1 rounded-lg">
                                    {viewRecordModal.day_number}º DIA
                                </span>
                                <h3 className="text-base font-bold text-slate-800">
                                    Detalhes da Evolução
                                </h3>
                            </div>
                            <button 
                                onClick={() => setViewRecordModal(null)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <p className="text-slate-400">
                                Atendimento registrado em: <span className="font-semibold text-slate-700">{formatDateTime(viewRecordModal.created_at)}</span>
                            </p>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <p className="font-bold text-slate-700 uppercase">Anotações Clínicas:</p>
                                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{viewRecordModal.clinical_notes}</p>
                            </div>

                            {viewRecordModal.prescription && (
                                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
                                    <p className="font-bold text-amber-800 uppercase">Prescrição Médica:</p>
                                    <p className="text-amber-900 whitespace-pre-line leading-relaxed">{viewRecordModal.prescription}</p>
                                </div>
                            )}

                            {viewRecordModal.attachments && viewRecordModal.attachments.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <p className="font-bold text-slate-700 uppercase">Documentos e Exames Anexados:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {viewRecordModal.attachments.map((file) => {
                                            const fileUrl = getAttachmentUrl(file.file_path);
                                            return (
                                                <a
                                                    key={file.id}
                                                    href={fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <FileDown className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                                        <span className="font-semibold text-slate-700 truncate">{file.file_name}</span>
                                                    </div>
                                                    <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 flex-shrink-0 ml-2" />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setViewRecordModal(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};