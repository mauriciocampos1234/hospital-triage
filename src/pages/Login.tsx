import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { Activity, Lock, Mail, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                // Tenta buscar o perfil na tabela profiles usando .maybeSingle() para evitar exceção de linha ausente
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error('Erro ao buscar perfil:', profileError);
                }

                // Obtém a função a partir da tabela profiles ou do user_metadata do Auth
                const rawRole = profile?.role || data.user.user_metadata?.role || '';

                if (!rawRole) {
                    throw new Error('Perfil de usuário não encontrado na tabela profiles nem nos metadados da conta.');
                }

                // Normaliza o texto do cargo (remove acentos, espaços, hífens e converte para minúsculas)
                const roleNormalized = rawRole
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[\s_-]+/g, '');

                // Redireciona de forma flexível testando as variações do cargo
                if (roleNormalized.includes('gerente') || roleNormalized.includes('admin')) {
                    navigate('/gerencia');
                } else if (roleNormalized.includes('recepc')) {
                    navigate('/recepcao');
                } else if (roleNormalized.includes('triagem') || roleNormalized.includes('enferm')) {
                    navigate('/triagem');
                } else if (roleNormalized.includes('medic')) {
                    navigate('/medico');
                } else {
                    setErrorMessage(`O cargo "${rawRole}" não possui uma rota configurada no sistema.`);
                }
            }
        } catch (err: unknown) {
            console.error('Erro de Autenticação:', err);
            const message = err instanceof Error ? err.message : 'Erro ao realizar login.';
            
            if (message.includes('Email not confirmed')) {
                setErrorMessage('O e-mail deste usuário ainda não foi confirmado. Acesse o painel do Supabase (Authentication > Email) e desative a opção "Confirm email".');
            } else if (message.includes('Invalid login credentials')) {
                setErrorMessage('E-mail ou senha incorretos (ou usuário ainda não cadastrado no Supabase Auth).');
            } else {
                setErrorMessage(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-8 text-center text-white">
                    <div className="inline-flex p-3 bg-blue-500/30 rounded-2xl mb-4 backdrop-blur-sm">
                        <Activity className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Hospital Triage</h1>
                    <p className="text-blue-100 text-sm mt-1">Sistema de Triagem e Chamada Médica</p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleLogin} className="p-8 space-y-6">
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            E-mail de Acesso
                        </label>
                        <div className="relative">
                            <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu.email@hospital.com"
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Senha
                        </label>
                        <div className="relative">
                            <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-lg transition text-sm tracking-wide"
                    >
                        {loading ? 'Autenticando...' : 'Entrar no Sistema'}
                    </button>
                </form>

                <div className="px-8 pb-6 text-center">
                    <p className="text-xs text-slate-400">Acesso restrito a funcionários autorizados.</p>
                </div>
            </div>
        </div>
    );
};