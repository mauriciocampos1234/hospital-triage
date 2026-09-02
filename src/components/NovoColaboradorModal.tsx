import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { X, UserPlus } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
});

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const NovoColaboradorModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [cargo, setCargo] = useState('recepcao');
    const [prefixo, setPrefixo] = useState('Dr.');
    const [crm, setCrm] = useState('');
    const [especialidade, setEspecialidade] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        try {
            const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
                email,
                password: senha,
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    throw new Error('Este e-mail já está registrado na autenticação. Remova-o no Supabase (Authentication > Users) para poder cadastrá-lo novamente.');
                }
                throw authError;
            }

            if (!authData.user) {
                throw new Error('Não foi possível registrar o usuário.');
            }

            const formattedName = cargo === 'medico' 
                ? `${prefixo} ${nome.trim()}`.trim()
                : nome.trim();

            const profilePayload = {
                id: authData.user.id,
                name: formattedName,
                email: email,
                role: cargo,
                is_active: true,
                ...(cargo === 'medico' && {
                    crm: crm,
                    specialty: especialidade || 'Clínico Geral'
                }),
                ...(cargo === 'triagem' && {
                    specialty: especialidade || 'Enfermagem'
                })
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert([profilePayload]);

            if (profileError) throw profileError;

            setNome('');
            setEmail('');
            setSenha('');
            setCrm('');
            setEspecialidade('');
            setCargo('recepcao');

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: unknown) {
            const errorObj = err as Error;
            console.error('Erro ao cadastrar colaborador:', errorObj);
            setErrorMsg(errorObj.message || 'Erro ao cadastrar colaborador.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <UserPlus className="w-5 h-5" />
                        <h3 className="text-base font-bold text-slate-800">Cadastrar Colaborador</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {errorMsg && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                            {errorMsg}
                        </div>
                    )}

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Função / Cargo *</label>
                        <select
                            value={cargo}
                            onChange={(e) => setCargo(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
                        >
                            <option value="recepcao">Recepção</option>
                            <option value="triagem">Triagem / Enfermagem</option>
                            <option value="medico">Médico</option>
                            <option value="gerente_dia">Gerente do Dia</option>
                            <option value="gerente_geral">Gerente Geral</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                        <input
                            type="text"
                            required
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder={cargo === 'medico' ? 'Ex: Mauricio Campos' : 'Ex: Rita Lee'}
                            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">E-mail *</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@hospital.com"
                            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Senha de Acesso *</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {cargo === 'medico' && (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Título</label>
                                    <select
                                        value={prefixo}
                                        onChange={(e) => setPrefixo(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="Dr.">Dr.</option>
                                        <option value="Dra.">Dra.</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block font-bold text-slate-700 uppercase mb-1">CRM *</label>
                                    <input
                                        type="text"
                                        required
                                        value={crm}
                                        onChange={(e) => setCrm(e.target.value)}
                                        placeholder="Ex: 567889"
                                        className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Especialidade</label>
                                <input
                                    type="text"
                                    value={especialidade}
                                    onChange={(e) => setEspecialidade(e.target.value)}
                                    placeholder="Ex: Psiquiatra, Pediatra"
                                    className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {cargo === 'triagem' && (
                        <div className="pt-2 border-t border-slate-100">
                            <label className="block font-bold text-slate-700 uppercase mb-1">Cargo / Especialidade</label>
                            <input
                                type="text"
                                value={especialidade}
                                onChange={(e) => setEspecialidade(e.target.value)}
                                placeholder="Ex: Enfermeira, Auxiliar de Enfermagem"
                                className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow disabled:bg-indigo-300"
                        >
                            {loading ? 'Salvando...' : 'Cadastrar Colaborador'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};