import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import { UserRole } from '../../types';
import { X, UserPlus, AlertCircle, Stethoscope, BadgeCheck, FileText } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const MEDICAL_SPECIALTIES = [
    'Clínico Geral',
    'Ortopedia / Traumatologia',
    'Radiologia / Diagnóstico',
    'Pediatria',
    'Cardiologia',
    'Cirurgia Geral',
    'Ginecologia / Obstetrícia',
    'Intensivista (UTI / Emergência)',
    'Neurologia'
];

export const NovoColaboradorModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('recepcao');
    const [specialty, setSpecialty] = useState('Clínico Geral');
    const [prefix, setPrefix] = useState<'Dr.' | 'Dra.' | ''>('Dr.');
    const [crm, setCrm] = useState('');
    const [coren, setCoren] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const isDoctor = role === 'medico' || role === 'medico_uti';
    const isNurse = role === 'enfermeira_triagem' || role === 'enfermeira_medicamento' || role === 'enfermeira_uti';
    const isAuxiliary = role === 'auxiliar_enfermagem' || role === 'auxiliar_uti';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        try {
            // 1. Cria o usuário no Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw new Error(authError.message);
            if (!authData.user) throw new Error('Não foi possível obter a confirmação do cadastro.');

            // 2. Registra os dados no perfil (Profiles)
            const payload = {
                id: authData.user.id,
                name,
                role,
                specialty: isDoctor ? specialty : null,
                prefix: isDoctor ? prefix : null,
                crm: isDoctor ? crm : null,
                coren: isNurse || isAuxiliary ? coren : null,
                registration_number: !isDoctor && !isNurse && !isAuxiliary ? registrationNumber : null,
                document_number: documentNumber || null,
                is_health_professional: isDoctor || isNurse || isAuxiliary
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .insert([payload]);

            if (profileError) throw new Error(profileError.message);

            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Erro ao cadastrar:', err);
            const msg = err instanceof Error ? err.message : 'Erro ao cadastrar colaborador.';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Novo Colaborador</h3>
                            <p className="text-[11px] text-slate-400">Cadastre um novo membro da equipe hospitalar</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Carlos Eduardo Lima"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">E-mail de Acesso *</label>
                            <input
                                type="email"
                                required
                                placeholder="colaborador@hospital.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">Senha Provisória *</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="******"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Função / Setor Especifico *</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                        >
                            <optgroup label="Recepção e Administrativo">
                                <option value="recepcao">Recepção / Atendimento</option>
                                <option value="gerente">Gerente Administrativo</option>
                                <option value="gerente_plantao">Gerente de Plantão</option>
                                <option value="gerente_geral">Gerente Geral</option>
                            </optgroup>

                            <optgroup label="Corpo Médico">
                                <option value="medico">Médico(a) Ambu/Atendimento Geral</option>
                                <option value="medico_uti">Médico(a) Intensivista - UTI / Emergência</option>
                            </optgroup>

                            <optgroup label="Equipe de Enfermagem">
                                <option value="enfermeira_triagem">Enfermeiro(a) - Triagem</option>
                                <option value="enfermeira_medicamento">Enfermeiro(a) - Medicação / Internação</option>
                                <option value="auxiliar_enfermagem">Auxiliar / Técnico de Enfermagem</option>
                            </optgroup>

                            <optgroup label="UTI / Emergência Especializada">
                                <option value="enfermeira_uti">Enfermeiro(a) - UTI / Emergência</option>
                                <option value="auxiliar_uti">Auxiliar de Enfermagem - UTI / Emergência</option>
                            </optgroup>

                            <optgroup label="Farmácia">
                                <option value="farmacia">Farmácia / Insumos</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* Seleção de Especialidade Médica */}
                    {isDoctor && (
                        <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Tratamento Médico</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPrefix('Dr.')}
                                        className={`flex-1 py-1.5 rounded-xl font-bold border transition ${
                                            prefix === 'Dr.' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        Dr.
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPrefix('Dra.')}
                                        className={`flex-1 py-1.5 rounded-xl font-bold border transition ${
                                            prefix === 'Dra.' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        Dra.
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Especialidade Médica *</label>
                                <select
                                    value={specialty}
                                    onChange={(e) => setSpecialty(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                                >
                                    {MEDICAL_SPECIALTIES.map((spec) => (
                                        <option key={spec} value={spec}>{spec}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                    <Stethoscope className="w-3.5 h-3.5 text-indigo-600" /> Registro CRM *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: CRM-SP 123456"
                                    value={crm}
                                    onChange={(e) => setCrm(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                                />
                            </div>
                        </div>
                    )}

                    {/* Campos de Registro para Enfermagem e Auxiliares */}
                    {(isNurse || isAuxiliary) && (
                        <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-2">
                            <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                <BadgeCheck className="w-3.5 h-3.5 text-amber-600" /> Registro COREN *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: COREN-GO 4758696"
                                value={coren}
                                onChange={(e) => setCoren(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-600 bg-white"
                            />
                        </div>
                    )}

                    {/* Identificação para recepção e administrativo */}
                    {!isDoctor && !isNurse && !isAuxiliary && (
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5 text-slate-500" /> Número de Matrícula
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: MAT-2026-089"
                                    value={registrationNumber}
                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">CPF / Documento</label>
                                <input
                                    type="text"
                                    placeholder="Ex: 000.000.000-00"
                                    value={documentNumber}
                                    onChange={(e) => setDocumentNumber(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-2 flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition disabled:bg-indigo-300"
                        >
                            {loading ? 'Cadastrando...' : 'Cadastrar Colaborador'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};