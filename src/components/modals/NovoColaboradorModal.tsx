import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import { UserRole } from '../../types';
import { X, UserPlus, Lock, Mail, User, Stethoscope, ShieldCheck } from 'lucide-react';

interface NovoColaboradorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const NovoColaboradorModal: React.FC<NovoColaboradorModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('recepcao');
    const [specialty, setSpecialty] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        try {
            // Chama a Edge Function no Supabase para criar o usuário com a Service Role Key no backend
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    name,
                    email,
                    password,
                    role,
                    specialty: role === 'medico' ? specialty : null,
                },
            });

            if (error) {
                throw new Error(error.message || 'Erro ao invocar função de criação.');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            alert('Colaborador cadastrado com sucesso!');

            // Limpa os campos
            setName('');
            setEmail('');
            setPassword('');
            setRole('recepcao');
            setSpecialty('');

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            const errObj = err as Error;
            console.error('Erro ao cadastrar colaborador:', errObj);
            setErrorMsg(errObj.message || 'Falha ao criar usuário.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">

                {/* Header Modal */}
                <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/30">
                            <UserPlus className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Novo Colaborador</h2>
                            <p className="text-xs text-slate-400">Cadastre um novo membro da equipe</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                            {errorMsg}
                        </div>
                    )}

                    {/* Nome */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Nome Completo *
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Dra. Ana Maria"
                                className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            E-mail de Acesso *
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="colaborador@hospital.com"
                                className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    </div>

                    {/* Senha */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Senha Provisória *
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    </div>

                    {/* Perfil/Função */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Função / Cargo *
                            </label>
                            <div className="relative">
                                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                                >
                                    <option value="recepcao">Recepção</option>
                                    <option value="medico">Médico(a)</option>
                                    <option value="gerente">Gerente</option>
                                    <option value="gerente_plantao">Gerente de Plantão</option>
                                    <option value="gerente_geral">Gerente Geral</option>
                                </select>
                            </div>
                        </div>

                        {/* Especialidade (Apenas para Médico) */}
                        {role === 'medico' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Especialidade *
                                </label>
                                <div className="relative">
                                    <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                    <input
                                        type="text"
                                        required
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        placeholder="Ex: Ortopedia, Clinico"
                                        className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition disabled:bg-indigo-300"
                        >
                            {loading ? 'Cadastrando...' : 'Cadastrar Colaborador'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};