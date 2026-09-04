import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { Patient, Profile } from '../types';
import { 
    UserPlus, Search, LogOut, FileText, MapPin, 
    Clock, Send, AlertCircle, CheckCircle2, RotateCcw, 
    Phone, MessageSquare, UserCheck, Share2, Stethoscope, Calendar
} from 'lucide-react';

const STREET_TYPES = ['Rua', 'Avenida', 'Alameda', 'Travessa', 'Praça', 'Rodovia', 'Estrada', 'Outro'];
const RELATIONSHIP_OPTIONS = ['Parente', 'Vizinho', 'Cônjuge', 'Filho(a)', 'Cuidador(a)', 'Amigo(a)', 'Outro'];

export const DashboardRecepcao: React.FC = () => {
    const { profile, signOut } = useAuth();

    // Identificação do Paciente
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [rg, setRg] = useState('');
    const [susCard, setSusCard] = useState('');
    const [birthDate, setBirthDate] = useState('');
    
    // Telefone & WhatsApp
    const [phone, setPhone] = useState('');
    const [hasWhatsapp, setHasWhatsapp] = useState(true);
    const [customWhatsapp, setCustomWhatsapp] = useState('');
    const [isOwnPhone, setIsOwnPhone] = useState(true);
    const [contactName, setContactName] = useState('');
    const [contactRelationship, setContactRelationship] = useState('Parente');

    // Endereço
    const [streetType, setStreetType] = useState('Rua');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressNeighborhood, setAddressNeighborhood] = useState('');
    const [addressComplement, setAddressComplement] = useState('');
    const [addressCity, setAddressCity] = useState('Goiânia');
    const [addressState, setAddressState] = useState('GO');
    const [addressCep, setAddressCep] = useState('');

    // Flags de Atendimento & Agendamento
    const [isPriorityManual, setIsPriorityManual] = useState(false);
    const [isReturn, setIsReturn] = useState(false);
    
    // Médicos e Especialidades
    const [doctors, setDoctors] = useState<Profile[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [selectedDoctorName, setSelectedDoctorName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    // Listagem e Estados
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Idoso (60+)
    const isElderly = (dateString: string): boolean => {
        if (!dateString) return false;
        const birth = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age >= 60;
    };

    const effectivePriority = isElderly(birthDate) || isPriorityManual;

    // Buscar lista de Médicos cadastrados no sistema
    const fetchDoctors = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .in('role', ['medico', 'medico_uti'])
                .order('name', { ascending: true });

            if (error) throw error;
            setDoctors((data as Profile[]) || []);
        } catch (err) {
            console.error('Erro ao buscar médicos:', err);
        }
    }, []);

    const fetchTodayPatients = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPatients((data as Patient[]) || []);
        } catch (err) {
            console.error('Erro ao buscar pacientes:', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            if (isMounted) {
                await Promise.all([
                    fetchTodayPatients(),
                    fetchDoctors()
                ]);
            }
        };

        loadInitialData();

        const channel = supabase
            .channel('reception_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
                fetchTodayPatients();
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [fetchTodayPatients, fetchDoctors]);

    // Seleção de Médico preenche o nome e a especialidade automaticamente
    const handleDoctorSelect = (doctorId: string) => {
        setSelectedDoctorId(doctorId);
        const doc = doctors.find((d) => d.id === doctorId);
        if (doc) {
            const docFullName = `${doc.prefix ? doc.prefix + ' ' : ''}${doc.name}`;
            setSelectedDoctorName(docFullName);
            setSpecialty(doc.specialty || 'Clínico Geral');
        } else {
            setSelectedDoctorName('');
            setSpecialty('');
        }
    };

    const handleRegisterAndSendToTriage = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedbackMessage(null);

        const targetWhatsapp = hasWhatsapp ? phone : customWhatsapp;

        try {
            const payload = {
                name,
                cpf,
                rg: rg || null,
                sus_card: susCard || null,
                birth_date: birthDate,
                phone: phone || null,
                has_whatsapp: hasWhatsapp,
                whatsapp: targetWhatsapp || null,
                is_own_phone: isOwnPhone,
                contact_name: !isOwnPhone ? contactName : null,
                contact_relationship: !isOwnPhone ? contactRelationship : null,
                street_type: streetType,
                address_street: addressStreet || null,
                address_number: addressNumber || null,
                address_neighborhood: addressNeighborhood || null,
                address_complement: addressComplement || null,
                address_city: addressCity,
                address_state: addressState,
                address_cep: addressCep || null,
                is_priority: effectivePriority,
                is_return: isReturn,
                doctor_id: selectedDoctorId || null,
                doctor_name: selectedDoctorName || null,
                specialty: specialty || null,
                scheduled_date: scheduledDate || null,
                scheduled_time: scheduledTime || null,
                status: 'aguardando_triagem'
            };

            const { error } = await supabase.from('patients').insert([payload]);

            if (error) throw error;

            setFeedbackMessage({ type: 'success', text: 'Paciente cadastrado e encaminhado com sucesso!' });
            
            // Limpa Formulário
            setName('');
            setCpf('');
            setRg('');
            setSusCard('');
            setBirthDate('');
            setPhone('');
            setHasWhatsapp(true);
            setCustomWhatsapp('');
            setIsOwnPhone(true);
            setContactName('');
            setContactRelationship('Parente');
            setAddressStreet('');
            setAddressNumber('');
            setAddressNeighborhood('');
            setAddressComplement('');
            setAddressCep('');
            setIsPriorityManual(false);
            setIsReturn(false);
            setSelectedDoctorId('');
            setSelectedDoctorName('');
            setSpecialty('');
            setScheduledDate('');
            setScheduledTime('');

            fetchTodayPatients();
        } catch (err: unknown) {
            console.error('Erro ao cadastrar:', err);
            const msg = err instanceof Error ? err.message : 'Erro ao cadastrar paciente. Verifique os dados.';
            setFeedbackMessage({ type: 'error', text: msg });
        } finally {
            setLoading(false);
        }
    };

    // Gerador da Mensagem Semi-Automática para WhatsApp com Template Personalizado
    const handleSendWhatsAppNotification = (patient: Patient) => {
        const rawNumber = patient.whatsapp || patient.phone;
        if (!rawNumber) {
            alert('Este paciente não possui número de WhatsApp cadastrado.');
            return;
        }

        const cleanNumber = rawNumber.replace(/\D/g, '');
        const formattedNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

        const hora = patient.scheduled_time 
            ? patient.scheduled_time 
            : (patient.created_at ? new Date(patient.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Horário Agendado');

        const dataFormatada = patient.scheduled_date 
            ? new Date(patient.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR')
            : 'Hoje';

        const tipoAtendimento = patient.is_return ? 'Retorno / Reavaliação Médica' : 'Consulta Médica';

        // Template de mensagem rica e personalizada
        let message = `Olá, *${patient.name}*! 👋\n\n`;
        message += `Confirmamos o seu agendamento de *${tipoAtendimento}* conosco!\n\n`;
        message += `📌 *Dados do Agendamento:*\n`;
        message += `📅 *Data:* ${dataFormatada}\n`;
        message += `🕒 *Horário:* ${hora}\n`;

        if (patient.doctor_name) {
            message += `👨‍⚕️ *Médico(a):* ${patient.doctor_name}\n`;
        }
        if (patient.specialty) {
            message += `🩺 *Especialidade:* ${patient.specialty}\n`;
        }

        message += `\n📍 *Local:* Recepção Principal do Hospital/Clínica\n`;
        message += `⚠️ *Orientação:* Por favor, chegue com 15 minutos de antecedência munido de documento oficial com foto e cartão do SUS/Convênio.\n\n`;
        message += `_Mensagem enviada automaticamente pela Recepção._`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${formattedNumber}?text=${encodedMessage}`, '_blank');
    };

    const filteredPatients = patients.filter((p) =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cpf || '').includes(searchTerm) ||
        (p.phone || '').includes(searchTerm) ||
        (p.whatsapp || '').includes(searchTerm) ||
        (p.doctor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/30">
                        <UserPlus className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Recepção & Admissão</h1>
                        <p className="text-xs text-slate-400">Atendente: {profile?.name || 'Recepção'}</p>
                    </div>
                </div>

                <button
                    onClick={signOut}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 text-xs px-4 py-2 rounded-xl transition"
                >
                    <LogOut className="w-4 h-4" /> Sair
                </button>
            </header>

            <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Form Admissão */}
                <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-base font-bold text-slate-800">Novo Cadastro / Agendamento</h2>
                    </div>

                    {feedbackMessage && (
                        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                            feedbackMessage.type === 'success' 
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                                : 'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                            {feedbackMessage.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{feedbackMessage.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleRegisterAndSendToTriage} className="space-y-4 text-xs">
                        {/* Identificação */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-indigo-600">
                                Identificação e Documentos
                            </h3>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Maria das Graças Silva"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">CPF *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={(e) => setCpf(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Data Nascimento *</label>
                                    <input
                                        type="date"
                                        required
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">RG</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 1234567 SSP/GO"
                                        value={rg}
                                        onChange={(e) => setRg(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Cartão SUS</label>
                                    <input
                                        type="text"
                                        placeholder="898 0000 0000 0000"
                                        value={susCard}
                                        onChange={(e) => setSusCard(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Telefone & WhatsApp */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" /> Telefones de Contato
                            </h3>

                            <div className="grid grid-cols-1 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Número de Telefone Principal</label>
                                    <input
                                        type="text"
                                        placeholder="(62) 99999-0000"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Este número possui WhatsApp?
                                    </span>
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-600">
                                            <input
                                                type="radio"
                                                name="hasWhatsapp"
                                                checked={hasWhatsapp === true}
                                                onChange={() => setHasWhatsapp(true)}
                                                className="text-emerald-600 focus:ring-emerald-500"
                                            /> Sim
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-600">
                                            <input
                                                type="radio"
                                                name="hasWhatsapp"
                                                checked={hasWhatsapp === false}
                                                onChange={() => setHasWhatsapp(false)}
                                                className="text-emerald-600 focus:ring-emerald-500"
                                            /> Não
                                        </label>
                                    </div>
                                </div>

                                {!hasWhatsapp && (
                                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2 animate-fadeIn">
                                        <label className="block font-bold text-emerald-900 uppercase">Número do WhatsApp para Mensagens</label>
                                        <input
                                            type="text"
                                            placeholder="(62) 98888-0000"
                                            value={customWhatsapp}
                                            onChange={(e) => setCustomWhatsapp(e.target.value)}
                                            className="w-full px-3 py-2 border border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="isOwnPhone"
                                    checked={isOwnPhone}
                                    onChange={(e) => setIsOwnPhone(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                                <label htmlFor="isOwnPhone" className="font-bold text-slate-700 cursor-pointer">
                                    O telefone pertence ao próprio paciente
                                </label>
                            </div>

                            {!isOwnPhone && (
                                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-fadeIn">
                                    <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-[11px]">
                                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Dono do Telefone / Recado</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase mb-1">Nome do Contato</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Maria (Filha)"
                                                value={contactName}
                                                onChange={(e) => setContactName(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase mb-1">Vínculo</label>
                                            <select
                                                value={contactRelationship}
                                                onChange={(e) => setContactRelationship(e.target.value)}
                                                className="w-full px-2 py-2 border rounded-xl outline-none bg-white focus:ring-2 focus:ring-indigo-600"
                                            >
                                                {RELATIONSHIP_OPTIONS.map((rel) => (
                                                    <option key={rel} value={rel}>{rel}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Endereço Completo */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> Endereço Completo
                            </h3>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Tipo</label>
                                    <select
                                        value={streetType}
                                        onChange={(e) => setStreetType(e.target.value)}
                                        className="w-full px-2 py-2 border rounded-xl outline-none bg-white focus:ring-2 focus:ring-indigo-600"
                                    >
                                        {STREET_TYPES.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Logradouro / Nome</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: T-63, Central"
                                        value={addressStreet}
                                        onChange={(e) => setAddressStreet(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Número</label>
                                    <input
                                        type="text"
                                        placeholder="S/N ou 1020"
                                        value={addressNumber}
                                        onChange={(e) => setAddressNumber(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Bairro</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Setor Bueno"
                                        value={addressNeighborhood}
                                        onChange={(e) => setAddressNeighborhood(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">CEP</label>
                                    <input
                                        type="text"
                                        placeholder="74000-000"
                                        value={addressCep}
                                        onChange={(e) => setAddressCep(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Cidade</label>
                                    <input
                                        type="text"
                                        value={addressCity}
                                        onChange={(e) => setAddressCity(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">UF</label>
                                    <input
                                        type="text"
                                        maxLength={2}
                                        value={addressState}
                                        onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Médico, Especialidade & Agendamento */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5" /> Médico & Agendamento
                            </h3>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1">Médico Responsável</label>
                                <select
                                    value={selectedDoctorId}
                                    onChange={(e) => handleDoctorSelect(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl outline-none bg-white focus:ring-2 focus:ring-indigo-600"
                                >
                                    <option value="">-- Selecionar Médico (Opcional) --</option>
                                    {doctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.prefix ? `${doc.prefix} ` : ''}{doc.name} {doc.specialty ? `(${doc.specialty})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Especialidade</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Ortodontia"
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Data Consulta</label>
                                    <input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase mb-1">Horário</label>
                                    <input
                                        type="time"
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Flags de Atendimento */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={isPriorityManual}
                                        onChange={(e) => setIsPriorityManual(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span>Prioridade Geral (PCD, Gestante, Lactante)</span>
                                </label>

                                {isElderly(birthDate) && (
                                    <div className="text-[11px] font-bold text-purple-700 bg-purple-50 p-2 rounded-xl border border-purple-200">
                                        ✓ Idoso 60+ detectado automaticamente (Prioritário)
                                    </div>
                                )}

                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 pt-1">
                                    <input
                                        type="checkbox"
                                        checked={isReturn}
                                        onChange={(e) => setIsReturn(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="flex items-center gap-1">
                                        <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                                        É Retendimento / Retorno de Exames
                                    </span>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:bg-indigo-300"
                        >
                            <Send className="w-4 h-4" />
                            <span>{loading ? 'Cadastrando...' : 'Cadastrar & Enviar p/ Triagem'}</span>
                        </button>
                    </form>
                </div>

                {/* Tabela de Cadastrados com Botão de Ação do WhatsApp */}
                <div className="lg:col-span-7 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-600" /> Pacientes Cadastrados / Agendados
                            </h2>
                            <p className="text-xs text-slate-400">Gerencie e envie notificações via WhatsApp</p>
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar nome, CPF, médico..."
                                className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <th className="py-3 px-3">Hora/Data</th>
                                    <th className="py-3 px-3">Paciente / Contato</th>
                                    <th className="py-3 px-3">Médico / Especialidade</th>
                                    <th className="py-3 px-3">Status</th>
                                    <th className="py-3 px-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPatients.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            Nenhum paciente cadastrado até o momento.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPatients.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition">
                                            <td className="py-3 px-3 text-slate-500 font-medium">
                                                {p.scheduled_date ? (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-indigo-600" />
                                                        <span>{new Date(p.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR')} {p.scheduled_time || ''}</span>
                                                    </div>
                                                ) : (
                                                    p.created_at 
                                                        ? new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                                                        : '---'
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                    {p.name}
                                                    {p.is_return && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 font-bold">
                                                            Retorno
                                                        </span>
                                                    )}
                                                </div>
                                                {(p.whatsapp || p.phone) && (
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                                                        <span>{p.whatsapp || p.phone}</span>
                                                        {!p.is_own_phone && (
                                                            <span className="text-indigo-600 font-medium">
                                                                ({p.contact_relationship || 'Recado'}: {p.contact_name})
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">
                                                {p.doctor_name ? (
                                                    <div>
                                                        <span className="font-bold text-slate-800">{p.doctor_name}</span>
                                                        {p.specialty && <p className="text-[10px] text-indigo-600">{p.specialty}</p>}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Não especificado</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                    p.status === 'aguardando_triagem'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : p.status === 'aguardando_atendimento'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : p.status === 'em_atendimento'
                                                                ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {(p.status || '').replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <button
                                                    onClick={() => handleSendWhatsAppNotification(p)}
                                                    title="Enviar agendamento via WhatsApp"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition text-[10px] shadow-sm"
                                                >
                                                    <Share2 className="w-3 h-3" />
                                                    <span>Zap</span>
                                                </button>
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