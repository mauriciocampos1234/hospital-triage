import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { Activity, Lock, Mail, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        try {
            // 1. Tenta autenticar na tabela interna auth.users do Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setErrorMessage('E-mail ou senha incorretos. Verifique suas credenciais.');
                setLoading(false);
                return;
            }

            if (data.user) {
                // 2. Busca o perfil do usuário para saber para qual rota direcioná-lo
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profileError || !profile) {
                    setErrorMessage('Perfil de usuário não encontrado. Contate o administrador.');
                    setLoading(false);
                    return;
                }

                // 3. Redirecionamento baseado na role (RBAC)
                if (profile.role === 'gerente') {
                    navigate('/gerencia');
                } else if (profile.role === 'recepcionista') {
                    navigate('/recepcao');
                } else if (profile.role === 'medico') {
                    navigate('/medico');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            console.error('Erro ao realizar login:', err);
            setErrorMessage('Ocorreu um erro inesperado ao tentar fazer login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                {/* Cabeçalho do Card */}
                <div className="bg-blue-600 p-6 text-white text-center flex flex-col items-center">
                    <div className="p-3 bg-blue-500/30 rounded-full mb-3">
                        <Activity className="w-8 h-8 text-white animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-bold">Hospital Triage</h1>
                    <p className="text-blue-100 text-sm mt-1">
                        Sistema de Triagem e Chamada Médica
                    </p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleLogin} className="p-6 space-y-4">
                    {errorMessage && (
                        <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Campo E-mail */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
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
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Campo Senha */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
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
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Botão de Submissão */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow transition duration-200 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Entrando...</span>
                            </>
                        ) : (
                            'Entrar no Sistema'
                        )}
                    </button>
                </form>

                {/* Rodapé Informativo */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center text-xs text-slate-500">
                    Acesso restrito a funcionários autorizados.
                </div>
            </div>
        </div>
    );
};