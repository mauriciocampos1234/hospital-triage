import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { Stethoscope, Lock, Mail, Loader2, Tv } from 'lucide-react';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const getRedirectPath = (role: string) => {
        if (['gerente', 'gerente_geral', 'gerente_plantao'].includes(role)) {
            return '/gerencia';
        }
        if ([
            'triagem', 'enfermagem', 'enfermeiro', 'enfermeira_triagem', 
            'enfermeira_medicamento', 'enfermeira_uti', 'auxiliar_enfermagem', 'auxiliar_uti'
        ].includes(role)) {
            return '/triagem';
        }
        if (['recepcao', 'recepcionista'].includes(role)) {
            return '/recepcao';
        }
        if (['medico', 'medico_uti'].includes(role)) {
            return '/medico';
        }
        return '/';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Autenticação direta no Supabase para evitar divergência de tipos no Context
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (data.user) {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) throw profileError;

                if (profileData?.role) {
                    const targetPath = getRedirectPath(profileData.role);
                    navigate(targetPath, { replace: true });
                } else {
                    setError('Perfil do usuário não encontrado.');
                }
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Falha ao autenticar. Verifique e-mail e senha.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                
                {/* Cabeçalho */}
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-2">
                        <Stethoscope className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-wide">SYSTEM TRIAGE</h1>
                    <p className="text-xs text-slate-400">Acesse o portal do seu setor hospitalar</p>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-center font-medium">
                        {error}
                    </div>
                )}

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu.email@hospital.com"
                                className="w-full bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Senha</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Acessando...</span>
                            </>
                        ) : (
                            <span>Entrar</span>
                        )}
                    </button>
                </form>

                <div className="pt-4 border-t border-slate-800 text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/painel')}
                        className="text-xs text-slate-400 hover:text-indigo-400 transition inline-flex items-center gap-1.5 font-medium"
                    >
                        <Tv className="w-3.5 h-3.5" />
                        <span>Abrir Painel TV de Senhas</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;