import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Profile, UserRole } from '../../types';
import { X, Edit3, AlertCircle, Stethoscope, FileText, BadgeCheck } from 'lucide-react';

interface Props {
    isOpen: boolean;
    collaborator: Profile | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditarColaboradorModal: React.FC<Props> = ({ isOpen, collaborator, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>('recepcao');
    const [prefix, setPrefix] = useState<'Dr.' | 'Dra.' | ''>('');
    const [crm, setCrm] = useState('');
    const [coren, setCoren] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [isHealthProfessional, setIsHealthProfessional] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Identifica funções que dependem da escolha do usuário (Se é da saúde ou admin)
    const isFlexibleRole = ['gerente', 'gerente_plantao', 'gerente_geral', 'emergencia'].includes(role);

    useEffect(() => {
        if (collaborator) {
            const timer = setTimeout(() => {
                setName(collaborator.name || '');
                setRole(collaborator.role || 'recepcao');
                setPrefix(collaborator.prefix || '');
                setCrm(collaborator.crm || '');
                setCoren(collaborator.coren || '');
                setRegistrationNumber(collaborator.registration_number || '');
                setDocumentNumber(collaborator.document_number || '');
                setIsHealthProfessional(collaborator.is_health_professional ?? false);
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [collaborator]);

    if (!isOpen || !collaborator) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        // Define quais campos salvar conforme a regra de negócio
        const isDoctor = role === 'medico';
        const isNurse = role === 'enfermeira_triagem' || role === 'enfermeira_medicamento';
        const showHealthFields = isDoctor || isNurse || (isFlexibleRole && isHealthProfessional);

        const payload = {
            name,
            role,
            prefix: isDoctor ? prefix : null,
            crm: isDoctor ? crm : (isFlexibleRole && isHealthProfessional ? crm : null),
            coren: isNurse || (isFlexibleRole && isHealthProfessional && !crm) ? coren : null,
            registration_number: !showHealthFields || registrationNumber ? registrationNumber : null,
            document_number: documentNumber || null,
            is_health_professional: isDoctor || isNurse ? true : isHealthProfessional
        };

        try {
            const { error } = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', collaborator.id);

            if (error) throw new Error(error.message);

            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Erro ao atualizar colaborador:', err);
            const msg = err instanceof Error ? err.message : 'Erro ao atualizar colaborador.';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Edit3 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Editar Perfil do Colaborador</h3>
                            <p className="text-[11px] text-slate-400">Identificação profissional e credenciais de acesso</p>
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

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {/* Título de Tratamento (Médicos) */}
                    {role === 'medico' && (
                        <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">Tratamento Médico</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPrefix('Dr.')}
                                    className={`flex-1 py-2 rounded-xl font-bold border transition ${prefix === 'Dr.'
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    Dr. (Doutor)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPrefix('Dra.')}
                                    className={`flex-1 py-2 rounded-xl font-bold border transition ${prefix === 'Dra.'
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    Dra. (Doutora)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Nome Completo */}
                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                    </div>

                    {/* Cargo / Função */}
                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Função / Cargo</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                        >
                            <option value="recepcao">Recepção / Atendimento</option>
                            <option value="enfermeira_triagem">Enfermeira(o) - Triagem</option>
                            <option value="enfermeira_medicamento">Enfermeira(o) - Medicação</option>
                            <option value="medico">Médico(a)</option>
                            <option value="farmacia">Farmácia / Insumos</option>
                            <option value="emergencia">Emergência / UTI</option>
                            <option value="gerente">Gerente</option>
                            <option value="gerente_plantao">Gerente de Plantão</option>
                            <option value="gerente_geral">Gerente Geral</option>
                        </select>
                    </div>

                    {/* Pergunta de prof. de saúde para papéis flexíveis (Gerentes/Emergência) */}
                    {isFlexibleRole && (
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isHealthProfessional}
                                    onChange={(e) => setIsHealthProfessional(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span>Este colaborador possui registro no COREN / CRM?</span>
                            </label>
                            <p className="text-[10px] text-slate-400 pl-6">
                                Marque se o gestor ou profissional da emergência é enfermeiro(a) ou médico(a) ativo.
                            </p>
                        </div>
                    )}

                    {/* Campos Específicos para MÉDICOS */}
                    {role === 'medico' && (
                        <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5 text-indigo-600" /> Número do CRM
                            </label>
                            <input
                                type="text"
                                required
                                value={crm}
                                onChange={(e) => setCrm(e.target.value)}
                                placeholder="Ex: 123456/SP"
                                className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    )}

                    {/* Campos Específicos para ENFERMAGEM */}
                    {(role === 'enfermeira_triagem' || role === 'enfermeira_medicamento') && (
                        <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" /> Registro COREN
                            </label>
                            <input
                                type="text"
                                required
                                value={coren}
                                onChange={(e) => setCoren(e.target.value)}
                                placeholder="Ex: COREN-SP 123.456"
                                className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    )}

                    {/* Registro Profissional Alternativo para Gestão/Emergência da Saúde */}
                    {isFlexibleRole && isHealthProfessional && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">COREN</label>
                                <input
                                    type="text"
                                    value={coren}
                                    onChange={(e) => setCoren(e.target.value)}
                                    placeholder="COREN (se houver)"
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">CRM</label>
                                <input
                                    type="text"
                                    value={crm}
                                    onChange={(e) => setCrm(e.target.value)}
                                    placeholder="CRM (se houver)"
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                        </div>
                    )}

                    {/* Campos de Identificação Administrativa (Matrícula e Documento) */}
                    {(!isHealthProfessional && role !== 'medico' && role !== 'enfermeira_triagem' && role !== 'enfermeira_medicamento') && (
                        <div className="space-y-3 pt-1 border-t border-slate-100">
                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5 text-slate-500" /> Número de Matrícula
                                </label>
                                <input
                                    type="text"
                                    value={registrationNumber}
                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                    placeholder="Ex: MAT-2026-089"
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Número de Documento (CPF / RG)</label>
                                <input
                                    type="text"
                                    value={documentNumber}
                                    onChange={(e) => setDocumentNumber(e.target.value)}
                                    placeholder="Ex: 000.000.000-00"
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-3 flex gap-2 justify-end">
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
                            {loading ? 'Salvar...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};