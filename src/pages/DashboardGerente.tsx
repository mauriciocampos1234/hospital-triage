import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Stethoscope,
    LogOut,
    Plus,
    Trash2,
    Shield,
    AlertCircle,
    CheckCircle2,
    Users,
    UserCheck,
    Building2
} from 'lucide-react';

interface UserProfile {
    id: string;
    name: string;
    email?: string;
    role: string;
    specialty?: string;
}

export const DashboardGerente: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const isGerenteGeral = profile?.role === 'gerente_geral' || profile?.role === 'gerente';

    const [activeTab, setActiveTab] = useState<'medicos' | 'gerentes'>('medicos');
    const [usersList, setUsersList] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    // Estados do formulário
    const [targetRole, setTargetRole] = useState<'medico' | 'gerente_plantao'>('medico');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Função para recarregar dados manualmente (após ações do usuário)
    const reloadUsers = async () => {
        try {
            setLoading(true);
            const roleToFetch = activeTab === 'medicos' ? 'medico' : 'gerente_plantao';
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', roleToFetch)
                .order('name', { ascending: true });

            if (error) throw error;
            setUsersList(data || []);
        } catch (err) {
            console.error('Erro ao buscar usuários:', err);
        } finally {
            setLoading(false);
        }
    };

    // Efeito isolado para carregamento de dados sincronizado com a mudança de aba
    useEffect(() => {
        let isMounted = true;

        const fetchUsers = async () => {
            setLoading(true);
            try {
                const roleToFetch = activeTab === 'medicos' ? 'medico' : 'gerente_plantao';
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', roleToFetch)
                    .order('name', { ascending: true });

                if (error) throw error;
                if (isMounted) {
                    setUsersList(data || []);
                }
            } catch (err) {
                console.error('Erro ao buscar usuários:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchUsers();

        return () => {
            isMounted = false;
        };
    }, [activeTab]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    // Cadastro via Edge Function (create-user) com Service Role Key no backend
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);

        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email,
                    password,
                    name,
                    role: targetRole,
                    specialty: targetRole === 'medico' ? specialty : null,
                },
            });

            if (error) {
                throw new Error(error.message || 'Erro ao comunicar com o servidor.');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            const labelCreated = targetRole === 'medico' ? 'Médico' : 'Gerente de Plantão';
            setFormSuccess(`${labelCreated} cadastrado(a) com sucesso!`);
            
            // Limpa o formulário
            setName('');
            setEmail('');
            setPassword('');
            setSpecialty('');

            await reloadUsers();

            setTimeout(() => {
                setModalOpen(false);
                setFormSuccess(null);
            }, 1800);
        } catch (err: unknown) {
            console.error('Erro ao cadastrar usuário:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erro ao cadastrar profissional.';
            setFormError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // Apenas Gerente Geral tem permissão de exclusão definitiva
    const handleDeleteUser = async (id: string, userName: string) => {
        if (!isGerenteGeral) {
            alert('Apenas o Gerente Geral (RH) possui permissão para excluir registros.');
            return;
        }

        if (!confirm(`Deseja realmente remover "${userName}" do sistema?`)) return;

        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            await reloadUsers();
        } catch (err) {
            console.error('Erro ao remover usuário:', err);
            alert('Erro ao excluir registro. Tente novamente.');
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
                        <p className="text-xs text-slate-500">
                            Logado como: <span className="font-semibold text-slate-700">{profile?.name || 'Gerente'}</span>
                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase border border-blue-200">
                                {isGerenteGeral ? 'Gerente Geral (RH)' : 'Gerente de Plantão'}
                            </span>
                        </p>
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
                {/* Abas e Ações */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    {/* Navegação por Abas */}
                    <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
                        <button
                            onClick={() => setActiveTab('medicos')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                activeTab === 'medicos'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Stethoscope className="w-4 h-4" />
                            <span>Equipe Médica</span>
                        </button>

                        {isGerenteGeral && (
                            <button
                                onClick={() => setActiveTab('gerentes')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                    activeTab === 'gerentes'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                <span>Gerentes de Plantão</span>
                            </button>
                        )}
                    </div>

                    {/* Botão Novo Usuário */}
                    <button
                        onClick={() => {
                            setTargetRole(activeTab === 'gerentes' ? 'gerente_plantao' : 'medico');
                            setModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
                    >
                        <Plus className="w-5 h-5" />
                        <span>{activeTab === 'medicos' ? 'Novo Médico' : 'Novo Gerente'}</span>
                    </button>
                </div>

                {/* Tabela de Dados */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 font-medium">Carregando dados...</div>
                    ) : usersList.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                            {activeTab === 'medicos' ? (
                                <Stethoscope className="w-12 h-12 stroke-1" />
                            ) : (
                                <UserCheck className="w-12 h-12 stroke-1" />
                            )}
                            <p className="text-base font-medium text-slate-600">
                                Nenhum {activeTab === 'medicos' ? 'médico' : 'gerente de plantão'} cadastrado ainda.
                            </p>
                            <p className="text-xs">
                                Clique no botão acima para adicionar o primeiro registro.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3 px-6">Nome Completo</th>
                                    <th className="py-3 px-6">E-mail</th>
                                    {activeTab === 'medicos' && <th className="py-3 px-6">Especialidade</th>}
                                    <th className="py-3 px-6">Função</th>
                                    {isGerenteGeral && <th className="py-3 px-6 text-right">Ações</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {usersList.map((userItem) => (
                                    <tr key={userItem.id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-4 px-6 font-medium text-slate-800 flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${
                                                activeTab === 'medicos'
                                                    ? 'bg-teal-50 text-teal-600'
                                                    : 'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                {activeTab === 'medicos' ? (
                                                    <Stethoscope className="w-4 h-4" />
                                                ) : (
                                                    <Building2 className="w-4 h-4" />
                                                )}
                                            </div>
                                            {userItem.name}
                                        </td>
                                        <td className="py-4 px-6 text-slate-500">{userItem.email || '-'}</td>
                                        {activeTab === 'medicos' && (
                                            <td className="py-4 px-6">{userItem.specialty || 'Clínica Geral'}</td>
                                        )}
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                                                userItem.role === 'medico'
                                                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            }`}>
                                                {userItem.role === 'medico' ? 'Médico' : 'Gerente de Plantão'}
                                            </span>
                                        </td>
                                        {isGerenteGeral && (
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleDeleteUser(userItem.id, userItem.name)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                    title="Excluir do sistema"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modal de Cadastro Seguro */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
                        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">
                                {targetRole === 'medico' ? 'Cadastrar Novo Médico' : 'Cadastrar Gerente de Plantão'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-blue-100 hover:text-white font-bold text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
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

                            {/* Seleção do Perfil (se Gerente Geral) */}
                            {isGerenteGeral && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                                        Tipo de Perfil
                                    </label>
                                    <select
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value as 'medico' | 'gerente_plantao')}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="medico">Médico</option>
                                        <option value="gerente_plantao">Gerente de Plantão (Enfermeira Chefe)</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={targetRole === 'medico' ? "Ex: Dr. Roberto Carlos" : "Ex: Dra. Ana Paula"}
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
                                    placeholder="usuario@hospital.com"
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

                            {targetRole === 'medico' && (
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
                            )}

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
                                    {submitting ? 'Salvando...' : 'Salvar Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};