import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { Patient } from '../types';
import { UserPlus, Stethoscope, LogOut, Search } from 'lucide-react';

export const DashboardRecepcao: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Form de Novo Paciente
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [isPriority, setIsPriority] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchPatients = async () => {
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPatients(data || []);
        } catch (err) {
            console.error('Erro ao buscar pacientes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (active) {
                    setPatients(data || []);
                }
            } catch (err) {
                console.error('Erro ao buscar pacientes:', err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadData();

        const channel = supabase
            .channel('public:patients')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(channel);
        };
    }, []);

    const handleRegisterPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const ticketPrefix = isPriority ? 'P' : 'N';
            const ticketNumber = `${ticketPrefix}-${Math.floor(100 + Math.random() * 900)}`;

            const { error } = await supabase.from('patients').insert([
                {
                    name,
                    cpf,
                    birth_date: birthDate,
                    is_priority: isPriority,
                    ticket_number: ticketNumber,
                    status: 'aguardando_triagem',
                },
            ]);

            if (error) throw error;

            setName('');
            setCpf('');
            setBirthDate('');
            setIsPriority(false);
            await fetchPatients();
        } catch (err) {
            alert('Erro ao registrar paciente.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPatients = patients.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm) ||
        p.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-indigo-400" /> Recepção & Entrada
                    </h1>
                    <p className="text-xs text-slate-400">Atendente: {profile?.name}</p>
                </div>
                <button
                    onClick={signOut}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 text-xs px-3 py-2 rounded-xl transition"
                >
                    <LogOut className="w-4 h-4" /> Sair
                </button>
            </header>

            <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        Cadastrar Novo Paciente
                    </h2>
                    <form onSubmit={handleRegisterPatient} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: João da Silva"
                                className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CPF *</label>
                            <input
                                type="text"
                                required
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                                placeholder="000.000.000-00"
                                className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data de Nascimento *</label>
                            <input
                                type="date"
                                required
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="priority"
                                checked={isPriority}
                                onChange={(e) => setIsPriority(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="priority" className="text-xs font-semibold text-slate-700 cursor-pointer">
                                Atendimento Preferencial / Prioritário
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition disabled:bg-indigo-300"
                        >
                            {submitting ? 'Gerando Senha...' : 'Emitir Senha & Enviar p/ Triagem'}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                        <h2 className="text-base font-bold text-slate-800">Fila de Recepção & Triagem</h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nome, CPF ou senha..."
                                className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <th className="py-3 px-3">Senha</th>
                                    <th className="py-3 px-3">Nome</th>
                                    <th className="py-3 px-3">CPF</th>
                                    <th className="py-3 px-3">Status</th>
                                    <th className="py-3 px-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-slate-400">Carregando pacientes...</td>
                                    </tr>
                                ) : filteredPatients.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-slate-400">Nenhum paciente encontrado.</td>
                                    </tr>
                                ) : (
                                    filteredPatients.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition">
                                            <td className="py-3 px-3 font-bold text-indigo-600">{p.ticket_number}</td>
                                            <td className="py-3 px-3 font-semibold text-slate-800">{p.name}</td>
                                            <td className="py-3 px-3 text-slate-500">{p.cpf}</td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.status === 'aguardando_triagem'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : p.status === 'aguardando_atendimento_medico'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {p.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                {p.status === 'aguardando_triagem' && (
                                                    <button
                                                        onClick={() => navigate(`/triagem/${p.id}`)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] inline-flex items-center gap-1 transition"
                                                    >
                                                        <Stethoscope className="w-3.5 h-3.5" /> Fazer Triagem
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};