import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { Activity, Lock, Mail, AlertCircle, Monitor } from 'lucide-react';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const { user, profile, loading } = useAuth();

    // Redireciona automaticamente se o usuário já estiver logado
    useEffect(() => {
        if (!loading && user && profile) {
            const role = (profile.role as string) || '';
            switch (role) {
                case 'gerente_geral':
                case 'gerente_plantao':
                case 'gerente':
                    navigate('/gerencia', { replace: true });
                    break;
                case 'recepcao':
                case 'recepcionista':
                    navigate('/recepcao', { replace: true });
                    break;
                case 'medico':
                case 'medico_uti':
                    navigate('/medico', { replace: true });
                    break;
                case 'triagem':
                case 'enfermeiro':
                case 'enfermagem':
                    navigate('/triagem', { replace: true });
                    break;
                default:
                    break;
            }
        }
    }, [user, profile, loading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Busca o perfil do usuário logado no Supabase
            const { data: userProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            console.log('Perfil encontrado no banco:', userProfile);

            if (profileError || !userProfile) {
                const msg = `Usuário autenticado, mas o perfil não foi encontrado na tabela 'profiles'. ${profileError?.message || ''}`;
                setErrorMsg(msg);
                alert(msg);
                return;
            }

            const role = (userProfile.role as string) || '';
            alert(`Login efetuado com sucesso! Role encontrada: "${role}"`);

            // Redirecionamento condicional de acordo com a role do usuário
            if (role === 'triagem' || role === 'enfermeiro' || role === 'enfermagem') {
                navigate('/triagem');
            } else if (role === 'recepcao' || role === 'recepcionista') {
                navigate('/recepcao');
            } else if (role === 'medico' || role === 'medico_uti') {
                navigate('/medico');
            } else if (role.includes('gerente')) {
                navigate('/gerencia');
            } else {
                const msg = `Atenção: A role "${role}" não possui rota autorizada.`;
                setErrorMsg(msg);
                alert(msg);
            }

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao realizar login.';
            setErrorMsg(errorMessage);
            alert('Erro ao fazer login: ' + errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-2">
                        <Activity className="w-8 h-8 animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-wide">SYSTEM TRIAGE</h1>
                    <p className="text-xs text-slate-400">Acesse o portal do seu setor hospitalar</p>
                </div>

                {/* Mensagem de Erro */}
                {errorMsg && (
                    <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-2xl text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Formulário */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                            E-mail
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu.email@hospital.com"
                                className="w-full bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                            Senha
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition duration-200 disabled:bg-indigo-800"
                    >
                        {submitting ? 'Acessando...' : 'Entrar no Sistema'}
                    </button>
                </form>

                {/* Link do Painel TV */}
                <div className="pt-4 border-t border-slate-700/60 text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/painel')}
                        className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                    >
                        <Monitor className="w-4 h-4" />
                        <span>Abrir Painel TV de Senhas</span>
                    </button>
                </div>

            </div>
        </div>
    );
};