import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { UserRole } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const NovoColaboradorModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('recepcao');
    const [crm, setCrm] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        try {
            // Chama a Edge Function no Supabase
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email,
                    password,
                    name,
                    role,
                    crm: role === 'medico' ? crm : null,
                },
            });

            if (error) {
                throw new Error(error.message || 'A Edge Function "create-user" não respondeu. Certifique-se de publicá-la no Supabase CLI.');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            // Reset
            setName('');
            setEmail('');
            setPassword('');
            setRole('recepcao');
            setCrm('');
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Erro ao cadastrar colaborador:', err);
            const message = err instanceof Error ? err.message : 'Erro inesperado ao cadastrar colaborador.';
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100">

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
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <strong className="font-bold block">Falha no Cadastro:</strong>
                            {errorMessage}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Carlos Eduardo Lima"
                            className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">E-mail de Acesso *</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colaborador@hospital.com"
                            className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Senha Provisória *</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Função / Setor *</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                        >
                            <option value="recepcao">Recepção / Atendimento</option>
                            <option value="enfermeira_triagem">Enfermeira(o) - Triagem</option>
                            <option value="medico">Médico(a)</option>
                            <option value="enfermeira_medicamento">Enfermeira(o) - Medicação</option>
                            <option value="farmacia">Farmácia / Insumos</option>
                            <option value="emergencia">Emergência / UTI</option>
                            <option value="gerente">Gerente</option>
                            <option value="gerente_plantao">Gerente de Plantão</option>
                            <option value="gerente_geral">Gerente Geral</option>
                        </select>
                    </div>

                    {role === 'medico' && (
                        <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">CRM *</label>
                            <input
                                type="text"
                                required
                                value={crm}
                                onChange={(e) => setCrm(e.target.value)}
                                placeholder="Ex: CRM/GO 123456"
                                className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                            />
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
                            {loading ? 'Cadastrando...' : 'Cadastrar Colaborador'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};