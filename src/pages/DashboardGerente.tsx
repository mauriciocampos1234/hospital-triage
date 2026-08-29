import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope, LogOut, Plus, Trash2, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface DoctorProfile {
    id: string;
    name: string;
    email?: string;
    role: string;
    specialty?: string;
}

export const DashboardGerente: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    // Estados do formulário de novo médico
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Função para recarregar os dados após inserção ou remoção
    const reloadDoctors = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'medico');

            if (error) throw error;
            setDoctors(data || []);
        } catch (err) {
            console.error('Erro ao recarregar médicos:', err);
        }
    };

    // Busca inicial de dados com tratamento seguro de desmontagem (active flag)
    useEffect(() => {
        let active = true;

        const loadInitialData = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'medico');

                if (error) throw error;
                if (active) {
                    setDoctors(data || []);
                }
            } catch (err) {
                console.error('Erro ao buscar médicos:', err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadInitialData();

        return () => {
            active = false;
        };
    }, []);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const handleCreateDoctor = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);

        try {
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role: 'medico',
                        specialty,
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Não foi possível registrar as credenciais de autenticação.');

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert([
                    {
                        id: authData.user.id,
                        name,
                        email,
                        role: 'medico',
                        specialty,
                    }
                ]);

            if (profileError) throw profileError;

            setFormSuccess('Médico cadastrado com sucesso! Já pode realizar login.');
            setName('');
            setEmail('');
            setPassword('');
            setSpecialty('');

            await reloadDoctors();

            setTimeout(() => {
                setModalOpen(false);
                setFormSuccess(null);
            }, 2000);
        } catch (err: unknown) {
            console.error('Erro ao cadastrar médico:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erro ao cadastrar médico.';
            setFormError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDoctor = async (id: string) => {
        if (!confirm('Deseja realmente remover este médico da lista?')) return;
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            await reloadDoctors();
        } catch (err) {
            console.error('Erro ao remover médico:', err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header do Gestor */}
            <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Painel de Gerenciamento</h1>
                        <p className="text-xs text-slate-500">Logado como: <span className="font-medium text-slate-700">{profile?.name || 'Gerente'}</span></p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded-lg font-medium transition"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                </button>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Equipe Médica</h2>
                        <p className="text-sm text-slate-500">Gerencie os profissionais de saúde cadastrados no hospital.</p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Novo Médico</span>
                    </button>
                </div>

                {/* Tabela de Médicos */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Carregando equipe médica...</div>
                    ) : doctors.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Stethoscope className="w-12 h-12 stroke-1" />
                            <p className="text-base font-medium text-slate-600">Nenhum médico cadastrado ainda.</p>
                            <p className="text-xs">Clique em "Novo Médico" para adicionar o primeiro profissional.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3 px-6">Nome do Profissional</th>
                                    <th className="py-3 px-6">E-mail</th>
                                    <th className="py-3 px-6">Especialidade</th>
                                    <th className="py-3 px-6">Função</th>
                                    <th className="py-3 px-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {doctors.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-4 px-6 font-medium text-slate-800 flex items-center gap-3">
                                            <div className="p-2 bg-teal-50 text-teal-600 rounded-full">
                                                <Stethoscope className="w-4 h-4" />
                                            </div>
                                            {doc.name}
                                        </td>
                                        <td className="py-4 px-6 text-slate-500">{doc.email || '-'}</td>
                                        <td className="py-4 px-6">{doc.specialty || 'Clínica Geral'}</td>
                                        <td className="py-4 px-6">
                                            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                                                Médico
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => handleDeleteDoctor(doc.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                title="Excluir médico"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modal de Cadastro de Médico */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
                        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">Cadastrar Novo Médico</h3>
                            <button onClick={() => setModalOpen(false)} className="text-blue-100 hover:text-white font-bold text-xl">✕</button>
                        </div>

                        <form onSubmit={handleCreateDoctor} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}
                            {formSuccess && (
                                <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded text-green-700 text-xs flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>{formSuccess}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Dr. Roberto Carlos"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">E-mail de Acesso</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="medico@hospital.com"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Senha Inicial</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Especialidade</label>
                                <input
                                    type="text"
                                    required
                                    value={specialty}
                                    onChange={(e) => setSpecialty(e.target.value)}
                                    placeholder="Ex: Cardiologia, Pediatria..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg text-sm shadow transition"
                                >
                                    {submitting ? 'Salvando...' : 'Salvar Médico'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};