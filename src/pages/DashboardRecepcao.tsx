import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Users, 
    Search, 
    UserPlus, 
    LogOut, 
    Send, 
    X,
    Building2,
    CreditCard
} from 'lucide-react';

interface Patient {
    id: string;
    full_name: string;
    address?: string;
    sex?: string;
    doc_type: 'CPF' | 'RG';
    doc_number: string;
    sus_card?: string;
    health_insurance?: string;
    created_at: string;
}

export const DashboardRecepcao: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [fullName, setFullName] = useState('');
    const [address, setAddress] = useState('');
    const [sex, setSex] = useState('Masculino');
    const [docType, setDocType] = useState<'CPF' | 'RG'>('CPF');
    const [docNumber, setDocNumber] = useState('');
    const [susCard, setSusCard] = useState('');
    const [healthInsurance, setHealthInsurance] = useState('Particular');

    const loadPatients = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPatients(data || []);
        } catch (err) {
            console.error('Erro ao carregar pacientes:', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchInitialPatients = async () => {
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (isMounted) {
                    setPatients(data || []);
                }
            } catch (err) {
                console.error('Erro ao carregar pacientes:', err);
            }
        };

        fetchInitialPatients();

        return () => {
            isMounted = false;
        };
    }, []);

    const resetForm = () => {
        setFullName('');
        setAddress('');
        setSex('Masculino');
        setDocType('CPF');
        setDocNumber('');
        setSusCard('');
        setHealthInsurance('Particular');
    };

    const handleCreatePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { error } = await supabase
                .from('patients')
                .insert([{
                    full_name: fullName,
                    address: address || null,
                    sex,
                    doc_type: docType,
                    doc_number: docNumber,
                    sus_card: susCard || null,
                    health_insurance: healthInsurance,
                }]);

            if (error) throw error;

            alert('Paciente cadastrado com sucesso!');
            setIsModalOpen(false);
            resetForm();
            await loadPatients();
        } catch (err) {
            const errorObj = err as Error;
            console.error('Erro ao salvar paciente:', errorObj);
            alert(`Falha ao cadastrar paciente: ${errorObj.message || 'Verifique se o documento já existe.'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSendToTriage = async (patient: Patient) => {
        if (!window.confirm(`Encaminhar ${patient.full_name} para a Sala de Triagem?`)) return;

        try {
            const { error } = await supabase
                .from('triages')
                .insert([{
                    patient_id: patient.id,
                    patient_name: patient.full_name,
                    cpf: patient.doc_number,
                    receptionist_id: profile?.id,
                    status: 'aguardando_triagem',
                    risk_level: 'azul'
                }]);

            if (error) throw error;

            alert(`Paciente ${patient.full_name} enviado para a fila de triagem com sucesso!`);
        } catch (err) {
            const errorObj = err as Error;
            console.error('Erro ao enviar para triagem:', errorObj);
            alert(`Erro ao encaminhar paciente para a triagem: ${errorObj.message || 'Tente novamente.'}`);
        }
    };

    const filteredPatients = patients.filter(p => 
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doc_number.includes(searchTerm)
    );

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
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Recepção — Admissão & Agendamento</h1>
                        <p className="text-xs text-slate-500">
                            Atendente: <span className="font-semibold text-slate-700">{profile?.name}</span>
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
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative w-full sm:w-96">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por Nome, CPF ou RG..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                        <UserPlus className="w-4 h-4" /> Novo Paciente
                    </button>
                </div>

                {/* Tabela de Pacientes */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Pacientes Cadastrados ({filteredPatients.length})
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                                <tr>
                                    <th className="p-4">Nome do Paciente</th>
                                    <th className="p-4">Documento</th>
                                    <th className="p-4">Sexo</th>
                                    <th className="p-4">Convênio / SUS</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPatients.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-400">
                                            Nenhum paciente localizado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPatients.map((patient) => (
                                        <tr key={patient.id} className="hover:bg-slate-50/80 transition">
                                            <td className="p-4 font-bold text-slate-800">
                                                {patient.full_name}
                                                {patient.address && (
                                                    <p className="text-[11px] font-normal text-slate-400">{patient.address}</p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className="font-semibold text-slate-700">{patient.doc_type}:</span> {patient.doc_number}
                                            </td>
                                            <td className="p-4">{patient.sex || '—'}</td>
                                            <td className="p-4 space-y-0.5">
                                                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                                    {patient.health_insurance}
                                                </div>
                                                {patient.sus_card && (
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                        <CreditCard className="w-3 h-3 text-slate-400" />
                                                        SUS: {patient.sus_card}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleSendToTriage(patient)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs transition"
                                                >
                                                    <Send className="w-3.5 h-3.5" /> Encaminhar Triagem
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal de Cadastro de Paciente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl p-6 space-y-5">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-800">Cadastrar Novo Paciente</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Digite o nome completo do paciente"
                                    className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Tipo de Documento *</label>
                                    <select
                                        value={docType}
                                        onChange={(e) => setDocType(e.target.value as 'CPF' | 'RG')}
                                        className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="CPF">CPF</option>
                                        <option value="RG">RG</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Número do Documento *</label>
                                    <input
                                        type="text"
                                        required
                                        value={docNumber}
                                        onChange={(e) => setDocNumber(e.target.value)}
                                        placeholder={docType === 'CPF' ? '000.000.000-00' : 'Número do RG'}
                                        className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Sexo</label>
                                    <select
                                        value={sex}
                                        onChange={(e) => setSex(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Nº Cartão SUS</label>
                                    <input
                                        type="text"
                                        value={susCard}
                                        onChange={(e) => setSusCard(e.target.value)}
                                        placeholder="Opcional"
                                        className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Convênio / Plano de Saúde</label>
                                <input
                                    type="text"
                                    value={healthInsurance}
                                    onChange={(e) => setHealthInsurance(e.target.value)}
                                    placeholder="Ex: Unimed, Bradesco Saúde, Particular..."
                                    className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Endereço Residencial</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Rua, Número, Bairro, Cidade..."
                                    className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow disabled:bg-indigo-300"
                                >
                                    {saving ? 'Salvando...' : 'Cadastrar Paciente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};