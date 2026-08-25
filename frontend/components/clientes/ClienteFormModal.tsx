'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Cliente,
  CreateClientePayload,
  UpdateClientePayload,
  TipoPessoa,
  SituacaoCliente,
  SITUACAO_LABELS,
  ClienteAnexo,
} from '@/types/cliente';
import {
  useCriarCliente,
  useAtualizarCliente,
  useValidarDocumento,
  useClienteById,
  useEmpresasParceiro,
  useEmpresasDisponiveis,
  useTabelasPrecoDisponiveis,
  useAnexosParceiro,
  useUploadAnexoParceiro,
  useRemoverAnexoParceiro,
} from '@/hooks/useCliente';
import {
  X,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  Pencil,
  CreditCard,
  Receipt,
  Layers,
  Info,
  Lock,
  Truck,
  Copy,
  Search,
  Trash2,
  Plus,
  Compass,
  Paperclip,
  UploadCloud,
  FileUp,
  FileCheck2,
  Download,
  ExternalLink,
  AlertTriangle,
  Zap,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';
import { formatCnpjCpf, formatPhone, formatCep, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import { EnderecoCombobox, OpcaoEndereco } from './EnderecoCombobox';
import { buscarCepViaApi, buscarCoordenadasPorEndereco, consultarCnpjPublico, clienteApi } from '@/lib/api';

interface FormLabelProps {
  label: string;
  tooltip?: string;
  obrigatorio?: boolean;
}

function FormLabel({ label, tooltip, obrigatorio }: FormLabelProps) {
  return (
    <div className="flex items-center justify-between mb-1">
      <span className="block text-xs font-semibold text-gray-700">
        {label} {obrigatorio && <span className="text-red-500">*</span>}
      </span>
      {tooltip && (
        <span title={tooltip} className="cursor-help text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-0.5 text-[11px] font-mono">
          <Info className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: Cliente | null;
}

export function ClienteFormModal({ isOpen, onClose, cliente }: ClienteFormModalProps) {
  const isEditing = !!cliente;
  const { data: clienteDetalhe, isLoading: isLoadingDetalhe } = useClienteById(cliente?.codParc ?? null);
  const clienteAtual = clienteDetalhe || cliente;

  const criarMutation = useCriarCliente();
  const atualizarMutation = useAtualizarCliente();

  const [tab, setTab] = useState<'geral' | 'contato' | 'endereco' | 'empresas' | 'financeiro' | 'fiscal' | 'customizados' | 'anexos'>('geral');
  const [subTabEndereco, setSubTabEndereco] = useState<'principal' | 'entrega'>('principal');
  const [modoFormulario, setModoFormulario] = useState<'rapido' | 'completo'>('completo');

  useEffect(() => {
    if (isOpen) {
      if (!cliente) {
        setModoFormulario('rapido');
      } else {
        setModoFormulario('completo');
      }
    }
  }, [isOpen, cliente]);

  // Tab 5: Empresas / Grupo ICMS (TGFPAEM)
  const { data: empresasParceiro = [], isLoading: isLoadingEmpresas, refetch: refetchEmpresas } = useEmpresasParceiro(cliente?.codParc ?? null);
  const { data: empresasDisponiveis = [] } = useEmpresasDisponiveis();
  const { data: tabelasPrecoDisponiveis = [], isLoading: isLoadingTabelasPreco } = useTabelasPrecoDisponiveis();
  const [showAddEmpresa, setShowAddEmpresa] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<boolean>(false);
  const [selectedCodEmp, setSelectedCodEmp] = useState<number | ''>('');
  const [inputCodTab, setInputCodTab] = useState('');
  const [inputClassificIcms, setInputClassificIcms] = useState('');
  const [isSavingEmpresa, setIsSavingEmpresa] = useState(false);
  const [deletingCodEmp, setDeletingCodEmp] = useState<number | null>(null);

  // Tab 8: Anexos / Documentos (TSIANX)
  const { data: anexosParceiro = [], isLoading: isLoadingAnexos, refetch: refetchAnexos } = useAnexosParceiro(cliente?.codParc ?? null);
  const uploadAnexoMutation = useUploadAnexoParceiro();
  const removerAnexoMutation = useRemoverAnexoParceiro();
  const [showAddAnexo, setShowAddAnexo] = useState(false);
  const [nomeArquivoAnexo, setNomeArquivoAnexo] = useState('');
  const [descAnexo, setDescAnexo] = useState('');
  const [arquivoObj, setArquivoObj] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSavingAnexo, setIsSavingAnexo] = useState(false);
  const [baixandoNuAttach, setBaixandoNuAttach] = useState<number | null>(null);
  const [selectedAnexoView, setSelectedAnexoView] = useState<ClienteAnexo | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [deletingNuAttach, setDeletingNuAttach] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anexoDownloadError, setAnexoDownloadError] = useState<string | null>(null);

  const handleBaixarAnexo = async (anx: ClienteAnexo) => {
    if (!cliente?.codParc) return;
    setBaixandoNuAttach(anx.nuAttach);
    setAnexoDownloadError(null);
    try {
      const blob = await clienteApi.baixarAnexoParceiro(cliente.codParc, anx.nuAttach, anx.fonte || 'TSIATA', anx.nomeArquivo);
      
      // Validação de segurança: se o Blob retornado for JSON (payload de erro HTTP 404/500), exibe o erro e NÃO cria arquivo corrompido em disco
      if (blob.type === 'application/json' || (blob.size < 400 && blob.type.includes('json'))) {
        const txt = await blob.text();
        try {
          const parsed = JSON.parse(txt);
          setAnexoDownloadError(parsed?.message || 'Arquivo físico do anexo não disponível via API neste ambiente.');
          return;
        } catch {
          /* prossegue caso não seja um JSON */
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = anx.nomeArquivo || `anexo_${anx.nuAttach}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[handleBaixarAnexo] ERRO AO BAIXAR ANEXO:', err);
      let mensagem = err?.message || 'Erro ao realizar requisição de download.';
      try {
        const resData = err?.response?.data;
        if (resData) {
          if (typeof resData.text === 'function') {
            const txt = await resData.text();
            try {
              const parsed = JSON.parse(txt);
              if (parsed?.message) mensagem = `[HTTP ${err?.response?.status || 404}] ${parsed.message}`;
              else if (txt) mensagem = `[HTTP ${err?.response?.status || 404}] ${txt}`;
            } catch {
              if (txt) mensagem = `[HTTP ${err?.response?.status || 404}] ${txt}`;
            }
          } else if (typeof resData === 'string') {
            try {
              const parsed = JSON.parse(resData);
              if (parsed?.message) mensagem = `[HTTP ${err?.response?.status || 404}] ${parsed.message}`;
              else mensagem = `[HTTP ${err?.response?.status || 404}] ${resData}`;
            } catch {
              mensagem = `[HTTP ${err?.response?.status || 404}] ${resData}`;
            }
          } else if (typeof resData === 'object' && resData.message) {
            mensagem = `[HTTP ${err?.response?.status || 404}] ${resData.message}`;
          }
        }
      } catch {
        /* mantém mensagem do erro original */
      }
      setAnexoDownloadError(mensagem);
    } finally {
      setBaixandoNuAttach(null);
    }
  };

  const handleAbrirAnexoModal = (anx: ClienteAnexo) => {
    setAnexoDownloadError(null);
    setSelectedAnexoView(anx);
  };

  const handleCopiarNomeArquivo = (anx: ClienteAnexo) => {
    navigator.clipboard.writeText(anx.nomeArquivo);
    setCopiedText(anx.nomeArquivo);
    setTimeout(() => setCopiedText(null), 3000);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setArquivoObj(file);
    setNomeArquivoAnexo(file.name);
    const nameLower = file.name.toLowerCase();
    if (nameLower.includes('contrato') || nameLower.includes('social') || nameLower.includes('estatuto')) {
      setDescAnexo('Contrato Social / Estatuto');
    } else if (nameLower.includes('cnpj') || nameLower.includes('cartao')) {
      setDescAnexo('Cartão CNPJ');
    } else if (nameLower.includes('ie') || nameLower.includes('sintegra') || nameLower.includes('estadual')) {
      setDescAnexo('Comprovante de Inscrição Estadual (Sintegra)');
    } else if (nameLower.includes('endereco') || nameLower.includes('comprovante') || nameLower.includes('luz')) {
      setDescAnexo('Comprovante de Endereço');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Form State
  const [nomeParc, setNomeParc] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('J');
  const [situacao, setSituacao] = useState<SituacaoCliente | ''>('');
  const [cnpjCpf, setCnpjCpf] = useState('');

  const docValidoQuery = useValidarDocumento(cnpjCpf, cliente?.codParc);

  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [prazoPag, setPrazoPag] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Financeiro & Crédito
  const [limiteCreditoMensal, setLimiteCreditoMensal] = useState('');
  const [qtdMaxTitVencidos, setQtdMaxTitVencidos] = useState('');
  const [codTab, setCodTab] = useState('');
  const [codVend, setCodVend] = useState('');
  const [codBco, setCodBco] = useState('');
  const [descBonif, setDescBonif] = useState('');
  const [descFin, setDescFin] = useState('');

  // Fiscal & Tributário
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [classificacaoIcms, setClassificacaoIcms] = useState('');
  const [retemIss, setRetemIss] = useState<'S' | 'N' | ''>('');
  const [retemInss, setRetemInss] = useState<'S' | 'N' | ''>('');
  const [retemPis, setRetemPis] = useState<'S' | 'N' | ''>('');
  const [retemCofins, setRetemCofins] = useState<'S' | 'N' | ''>('');
  const [retemCsl, setRetemCsl] = useState<'S' | 'N' | ''>('');

  // Campos Customizados AD_*
  const [adCredCli, setAdCredCli] = useState('');
  const [adLimitePar, setAdLimitePar] = useState('');
  const [adLocalCad, setAdLocalCad] = useState('');
  const [adEndCompleto, setAdEndCompleto] = useState('');
  const [adCodBcoBol, setAdCodBcoBol] = useState('');

  // Dropdowns do Dicionário TDDOPC
  const [simples, setSimples] = useState<'S' | 'N' | ''>('');
  const [perfilEconect, setPerfilEconect] = useState<string>('');
  const [tipoFatur, setTipoFatur] = useState<string>('');
  const [regimeEspTribIss, setRegimeEspTribIss] = useState<string>('');
  const [tipoClienteServCom, setTipoClienteServCom] = useState<string>('');

  // Novos Campos (12 campos TGFPAR)
  const [ativoStatus, setAtivoStatus] = useState<'S' | 'N'>('S');
  const [codTipParc, setCodTipParc] = useState('');
  const [codReg, setCodReg] = useState('');
  const [dtCad, setDtCad] = useState('');
  const [dtAlter, setDtAlter] = useState('');
  const [grupoAutor, setGrupoAutor] = useState('');
  const [bloquear, setBloquear] = useState<'S' | 'N' | ''>('');
  const [motBloq, setMotBloq] = useState('');
  const [tipAnexoNfe, setTipAnexoNfe] = useState('');
  const [emailDanfe, setEmailDanfe] = useState('');
  const [emailNfe, setEmailNfe] = useState('');
  const [adDtAprovRep, setAdDtAprovRep] = useState('');

  // Endereço & Geolocalização (Principal & Entrega)
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [latitudeEntrega, setLatitudeEntrega] = useState('');
  const [longitudeEntrega, setLongitudeEntrega] = useState('');
  const [nomeContatoEntrega, setNomeContatoEntrega] = useState('');
  const [lograEntregaSel, setLograEntregaSel] = useState<OpcaoEndereco | null>(null);
  const [lograEntregaTexto, setLograEntregaTexto] = useState('');
  const [numeroEntrega, setNumeroEntrega] = useState('');
  const [complementoEntrega, setComplementoEntrega] = useState('');
  const [bairroEntregaSel, setBairroEntregaSel] = useState<OpcaoEndereco | null>(null);
  const [bairroEntregaTexto, setBairroEntregaTexto] = useState('');
  const [cidadeEntregaSel, setCidadeEntregaSel] = useState<OpcaoEndereco | null>(null);
  const [cidadeEntregaTexto, setCidadeEntregaTexto] = useState('');
  const [cepEntrega, setCepEntrega] = useState('');

  // Busca TSIBCO (Bancos), TGFTPP (Tipos Parceiro), TSIREG (Regiões)
  const [bcoTexto, setBcoTexto] = useState('');
  const [adBcoBolTexto, setAdBcoBolTexto] = useState('');
  const [tipParcTexto, setTipParcTexto] = useState('');
  const [regTexto, setRegTexto] = useState('');

  const fetchTiposParceiro = useCallback(async (query: string): Promise<OpcaoEndereco[]> => {
    const res = await clienteApi.getTiposParceiro(query);
    return res.map(t => ({ codigo: t.codTipParc, nome: t.nomeTipParc }));
  }, []);

  const fetchRegioes = useCallback(async (query: string): Promise<OpcaoEndereco[]> => {
    const res = await clienteApi.getRegioes(query);
    return res.map(r => ({ codigo: r.codReg, nome: r.nomeReg }));
  }, []);

  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  const [cidadeSel, setCidadeSel] = useState<OpcaoEndereco | null>(null);
  const [cidadeTexto, setCidadeTexto] = useState('');
  const [bairroSel, setBairroSel] = useState<OpcaoEndereco | null>(null);
  const [bairroTexto, setBairroTexto] = useState('');
  const [lograSel, setLograSel] = useState<OpcaoEndereco | null>(null);
  const [lograTexto, setLograTexto] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cep, setCep] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isBuscandoCepMain, setIsBuscandoCepMain] = useState(false);
  const [isBuscandoCepEntrega, setIsBuscandoCepEntrega] = useState(false);

  const [modoVisualizacao, setModoVisualizacao] = useState(isEditing);

  const isDirty = useMemo(() => {
    if (!isEditing || !cliente) return true;

    const initNome = cliente.nomeParc || '';
    const initRazao = cliente.razaoSocial || '';
    const initTipo = cliente.tipoPessoa || 'J';
    const initSituacao = cliente.situacao || '';
    const initCnpjCpf = formatCnpjCpf(cliente.cnpjCpf || '');
    const initIe = cliente.inscricaoEstadual || '';
    const initPrazo = cliente.prazoPag != null ? String(cliente.prazoPag) : '';
    const initLimite = cliente.limiteCredito != null ? formatCurrencyInput(cliente.limiteCredito) : '';
    const initObs = cliente.observacoes || '';
    const initLimiteMensal = cliente.limiteCreditoMensal != null ? formatCurrencyInput(cliente.limiteCreditoMensal) : '';
    const initQtdTit = cliente.qtdMaxTitVencidos != null ? String(cliente.qtdMaxTitVencidos) : '';
    const initCodTab = cliente.codTab || '';
    const initCodVend = cliente.codVend != null ? String(cliente.codVend) : '';
    const initCodBco = cliente.codBco != null ? String(cliente.codBco) : '';
    const initDescBonif = cliente.descBonif != null ? String(cliente.descBonif) : '';
    const initDescFin = cliente.descFin != null ? String(cliente.descFin) : '';
    const initIm = cliente.inscricaoMunicipal || '';
    const initClassIcms = cliente.classificacaoIcms || '';
    const initRetIss = cliente.retemIss || '';
    const initRetInss = cliente.retemInss || '';
    const initRetPis = cliente.retemPis || '';
    const initRetCofins = cliente.retemCofins || '';
    const initRetCsl = cliente.retemCsl || '';
    const initAdCred = cliente.adCredCli != null ? formatCurrencyInput(cliente.adCredCli) : '';
    const initAdLim = cliente.adLimitePar != null ? formatCurrencyInput(cliente.adLimitePar) : '';
    const initAdLoc = cliente.adLocalCad || '';
    const initAdEndComp = cliente.adEndCompleto || '';
    const initAdBcoBol = cliente.adCodBcoBol != null ? String(cliente.adCodBcoBol) : '';
    const initSimples = cliente.simples || '';
    const initPerfilEconect = cliente.perfilEconect || '';
    const initTipoFatur = cliente.tipoFatur || '';
    const initRegimeIss = cliente.regimeEspTribIss || '';
    const initTipServCom = cliente.tipoClienteServCom || '';
    const initTel = formatPhone(cliente.telefone || '');
    const initEmail = cliente.email || '';
    const initNum = cliente.endereco?.numero || '';
    const initCompl = cliente.endereco?.complemento || '';
    const initCep = formatCep(cliente.endereco?.cep || '');
    const initCid = cliente.endereco?.codCid || 0;
    const initBai = cliente.endereco?.codBai || 0;
    const initEnd = cliente.endereco?.codEnd || 0;
    const initLograTexto = cliente.endereco?.logradouro || '';
    const initBaiTexto = cliente.endereco?.bairro || '';
    const initCidTexto = cliente.endereco?.cidade || '';

    const initCepEntrega = formatCep(cliente.enderecoEntrega?.cep || '');
    const initNumEntrega = cliente.enderecoEntrega?.numero || '';
    const initComplEntrega = cliente.enderecoEntrega?.complemento || '';
    const initCidEntrega = cliente.enderecoEntrega?.codCid || 0;
    const initBaiEntrega = cliente.enderecoEntrega?.codBai || 0;
    const initEndEntrega = cliente.enderecoEntrega?.codEnd || 0;
    const initLograEntregaTexto = cliente.enderecoEntrega?.logradouro || '';
    const initBaiEntregaTexto = cliente.enderecoEntrega?.bairro || '';
    const initCidEntregaTexto = cliente.enderecoEntrega?.cidade || '';
    const initLat = cliente.latitude || '';
    const initLong = cliente.longitude || '';
    const initLatEntrega = cliente.latitudeEntrega || '';
    const initLongEntrega = cliente.longitudeEntrega || '';

    return (
      nomeParc.trim() !== initNome.trim() ||
      razaoSocial.trim() !== initRazao.trim() ||
      tipoPessoa !== initTipo ||
      situacao !== initSituacao ||
      cnpjCpf.trim() !== initCnpjCpf.trim() ||
      inscricaoEstadual.trim() !== initIe.trim() ||
      prazoPag.trim() !== initPrazo.trim() ||
      limiteCredito.trim() !== initLimite.trim() ||
      observacoes.trim() !== initObs.trim() ||
      limiteCreditoMensal.trim() !== initLimiteMensal.trim() ||
      qtdMaxTitVencidos.trim() !== initQtdTit.trim() ||
      codTab.trim() !== initCodTab.trim() ||
      codVend.trim() !== initCodVend.trim() ||
      codBco.trim() !== initCodBco.trim() ||
      descBonif.trim() !== initDescBonif.trim() ||
      descFin.trim() !== initDescFin.trim() ||
      inscricaoMunicipal.trim() !== initIm.trim() ||
      classificacaoIcms.trim() !== initClassIcms.trim() ||
      retemIss !== initRetIss ||
      retemInss !== initRetInss ||
      retemPis !== initRetPis ||
      retemCofins !== initRetCofins ||
      retemCsl !== initRetCsl ||
      adCredCli.trim() !== initAdCred.trim() ||
      adLimitePar.trim() !== initAdLim.trim() ||
      adLocalCad.trim() !== initAdLoc.trim() ||
      adEndCompleto.trim() !== initAdEndComp.trim() ||
      adCodBcoBol.trim() !== initAdBcoBol.trim() ||
      simples !== initSimples ||
      perfilEconect !== initPerfilEconect ||
      tipoFatur !== initTipoFatur ||
      regimeEspTribIss !== initRegimeIss ||
      telefone.trim() !== initTel.trim() ||
      email.trim() !== initEmail.trim() ||
      numero.trim() !== initNum.trim() ||
      complemento.trim() !== initCompl.trim() ||
      cep.trim() !== initCep.trim() ||
      lograTexto.trim() !== initLograTexto.trim() ||
      bairroTexto.trim() !== initBaiTexto.trim() ||
      cidadeTexto.trim() !== initCidTexto.trim() ||
      (cidadeSel?.codigo || 0) !== initCid ||
      (bairroSel?.codigo || 0) !== initBai ||
      (lograSel?.codigo || 0) !== initEnd ||
      cepEntrega.trim() !== initCepEntrega.trim() ||
      numeroEntrega.trim() !== initNumEntrega.trim() ||
      complementoEntrega.trim() !== initComplEntrega.trim() ||
      lograEntregaTexto.trim() !== initLograEntregaTexto.trim() ||
      bairroEntregaTexto.trim() !== initBaiEntregaTexto.trim() ||
      cidadeEntregaTexto.trim() !== initCidEntregaTexto.trim() ||
      latitude.trim() !== initLat.trim() ||
      longitude.trim() !== initLong.trim() ||
      latitudeEntrega.trim() !== initLatEntrega.trim() ||
      longitudeEntrega.trim() !== initLongEntrega.trim() ||
      (cidadeEntregaSel?.codigo || 0) !== initCidEntrega ||
      (bairroEntregaSel?.codigo || 0) !== initBaiEntrega ||
      (lograEntregaSel?.codigo || 0) !== initEndEntrega
    );
  }, [
    isEditing,
    cliente,
    nomeParc,
    razaoSocial,
    tipoPessoa,
    situacao,
    cnpjCpf,
    inscricaoEstadual,
    prazoPag,
    limiteCredito,
    observacoes,
    limiteCreditoMensal,
    qtdMaxTitVencidos,
    codTab,
    codVend,
    codBco,
    descBonif,
    descFin,
    inscricaoMunicipal,
    classificacaoIcms,
    retemIss,
    retemInss,
    retemPis,
    retemCofins,
    retemCsl,
    adCredCli,
    adLimitePar,
    adLocalCad,
    adEndCompleto,
    adCodBcoBol,
    simples,
    perfilEconect,
    tipoFatur,
    regimeEspTribIss,
    telefone,
    email,
    numero,
    complemento,
    cep,
    cidadeSel,
    bairroSel,
    lograSel,
    cepEntrega,
    numeroEntrega,
    complementoEntrega,
    cidadeEntregaTexto,
    bairroEntregaTexto,
    lograEntregaTexto,
    cidadeEntregaSel,
    bairroEntregaSel,
    lograEntregaSel,
    latitude,
    longitude,
    cidadeTexto,
    bairroTexto,
    lograTexto,
  ]);

  const completenessScore = useMemo(() => {
    let score = 0;
    const fields = [
      !!nomeParc.trim(),
      !!cnpjCpf.trim(),
      !!telefone.trim(),
      !!email.trim(),
      !!cep.trim(),
      !!(cidadeSel || cidadeTexto.trim()),
      !!(limiteCredito.trim() && limiteCredito !== '0'),
      !!(inscricaoEstadual.trim() || tipoPessoa === 'F'),
    ];
    fields.forEach((f) => {
      if (f) score++;
    });
    return Math.round((score / fields.length) * 100);
  }, [nomeParc, cnpjCpf, telefone, email, cep, cidadeSel, cidadeTexto, limiteCredito, inscricaoEstadual, tipoPessoa]);

  useEffect(() => {
    setModoVisualizacao(!!clienteAtual);
    if (clienteAtual) {
      setNomeParc(clienteAtual.nomeParc || '');
      setRazaoSocial(clienteAtual.razaoSocial || '');
      setTipoPessoa(clienteAtual.tipoPessoa || 'J');
      setSituacao(clienteAtual.situacao || '');
      setCnpjCpf(formatCnpjCpf(clienteAtual.cnpjCpf || ''));
      setInscricaoEstadual(clienteAtual.inscricaoEstadual || '');
      setPrazoPag(clienteAtual.prazoPag != null ? String(clienteAtual.prazoPag) : '');
      setLimiteCredito(clienteAtual.limiteCredito != null ? formatCurrencyInput(clienteAtual.limiteCredito) : '');
      setObservacoes(clienteAtual.observacoes || '');
      setLimiteCreditoMensal(clienteAtual.limiteCreditoMensal != null ? formatCurrencyInput(clienteAtual.limiteCreditoMensal) : '');
      setQtdMaxTitVencidos(clienteAtual.qtdMaxTitVencidos != null ? String(clienteAtual.qtdMaxTitVencidos) : '');
      setCodTab(clienteAtual.codTab || '');
      setCodVend(clienteAtual.codVend != null ? String(clienteAtual.codVend) : '');
      setCodBco(clienteAtual.codBco != null ? String(clienteAtual.codBco) : '');
      setDescBonif(clienteAtual.descBonif != null ? String(clienteAtual.descBonif) : '');
      setDescFin(clienteAtual.descFin != null ? String(clienteAtual.descFin) : '');
      setInscricaoMunicipal(clienteAtual.inscricaoMunicipal || '');
      setClassificacaoIcms(clienteAtual.classificacaoIcms || '');
      setRetemIss((clienteAtual.retemIss as 'S' | 'N') || '');
      setRetemInss((clienteAtual.retemInss as 'S' | 'N') || '');
      setRetemPis((clienteAtual.retemPis as 'S' | 'N') || '');
      setRetemCofins((clienteAtual.retemCofins as 'S' | 'N') || '');
      setRetemCsl((clienteAtual.retemCsl as 'S' | 'N') || '');
      setAdCredCli(clienteAtual.adCredCli != null ? formatCurrencyInput(clienteAtual.adCredCli) : '');
      setAdLimitePar(clienteAtual.adLimitePar != null ? formatCurrencyInput(clienteAtual.adLimitePar) : '');
      setAdLocalCad(clienteAtual.adLocalCad || '');
      setAdEndCompleto(clienteAtual.adEndCompleto || '');
      setAdCodBcoBol(clienteAtual.adCodBcoBol != null ? String(clienteAtual.adCodBcoBol) : '');
      setBcoTexto(clienteAtual.nomeBco ? `${clienteAtual.codBco} - ${clienteAtual.nomeBco}` : clienteAtual.codBco != null ? String(clienteAtual.codBco) : '');
      setAdBcoBolTexto(clienteAtual.adNomeBcoBol ? `${clienteAtual.adCodBcoBol} - ${clienteAtual.adNomeBcoBol}` : clienteAtual.adCodBcoBol != null ? String(clienteAtual.adCodBcoBol) : '');
      setSimples((clienteAtual.simples as 'S' | 'N') || '');
      setPerfilEconect(clienteAtual.perfilEconect || '');
      setTipoFatur(clienteAtual.tipoFatur || '');
      setRegimeEspTribIss(clienteAtual.regimeEspTribIss || '');
      setLatitude(clienteAtual.latitude || '');
      setLongitude(clienteAtual.longitude || '');
      setLatitudeEntrega(clienteAtual.latitudeEntrega || '');
      setLongitudeEntrega(clienteAtual.longitudeEntrega || '');
      setAtivoStatus(clienteAtual.ativo === false ? 'N' : 'S');
      setCodTipParc(clienteAtual.codTipParc != null ? String(clienteAtual.codTipParc) : '');
      setTipParcTexto(clienteAtual.nomeTipParc ? `${clienteAtual.codTipParc} - ${clienteAtual.nomeTipParc}` : clienteAtual.codTipParc != null ? String(clienteAtual.codTipParc) : '');
      setCodReg(clienteAtual.codReg != null ? String(clienteAtual.codReg) : '');
      setRegTexto(clienteAtual.nomeReg ? `${clienteAtual.codReg} - ${clienteAtual.nomeReg}` : clienteAtual.codReg != null ? String(clienteAtual.codReg) : '');
      setDtCad(clienteAtual.dataCadastro ? String(clienteAtual.dataCadastro) : '');
      setDtAlter(clienteAtual.dataUltimaAlteracao ? String(clienteAtual.dataUltimaAlteracao) : '');
      setGrupoAutor(clienteAtual.grupoAutor != null ? String(clienteAtual.grupoAutor) : '');
      setBloquear((clienteAtual.bloquear as 'S' | 'N') || '');
      setMotBloq(clienteAtual.motBloq || '');
      setTipAnexoNfe(clienteAtual.tipAnexoNfe || '');
      setEmailDanfe(clienteAtual.emailDanfe || '');
      setEmailNfe(clienteAtual.emailNfe || '');
      setAdDtAprovRep(clienteAtual.adDtAprovRep ? String(clienteAtual.adDtAprovRep) : '');
      setTelefone(formatPhone(clienteAtual.telefone || ''));
      setEmail(clienteAtual.email || '');

      const entE = clienteAtual.enderecoEntrega;
      const temEntregaSeparada = entE && ((entE.codEnd && entE.codEnd > 0) || entE.logradouro || entE.cidade);

      if (temEntregaSeparada) {
        setNumeroEntrega(entE.numero || '');
        setComplementoEntrega(entE.complemento || '');
        setCepEntrega(formatCep(entE.cep || ''));
        const ufEnt = entE.uf && typeof entE.uf === 'string' ? entE.uf : undefined;
        if (entE.codCid && entE.codCid > 0 && entE.cidade) {
          setCidadeEntregaSel({ codigo: entE.codCid, nome: entE.cidade, extra: ufEnt });
          setCidadeEntregaTexto(`${entE.cidade}${ufEnt ? ` (${ufEnt})` : ''}`);
        } else {
          setCidadeEntregaSel(null);
          setCidadeEntregaTexto('');
        }
        if (entE.codBai && entE.codBai > 0 && entE.bairro) {
          setBairroEntregaSel({ codigo: entE.codBai, nome: entE.bairro });
          setBairroEntregaTexto(entE.bairro);
        } else {
          setBairroEntregaSel(null);
          setBairroEntregaTexto('');
        }
        if (entE.codEnd && entE.codEnd > 0 && entE.logradouro) {
          setLograEntregaSel({ codigo: entE.codEnd, nome: entE.logradouro });
          setLograEntregaTexto(entE.logradouro);
        } else {
          setLograEntregaSel(null);
          setLograEntregaTexto('');
        }
      } else {
        setNomeContatoEntrega('');
        setNumeroEntrega('');
        setComplementoEntrega('');
        setCepEntrega('');
        setCidadeEntregaSel(null);
        setCidadeEntregaTexto('');
        setBairroEntregaSel(null);
        setBairroEntregaTexto('');
        setLograEntregaSel(null);
        setLograEntregaTexto('');
      }

      const end = clienteAtual.endereco;
      const ufSigla = end?.uf && typeof end.uf === 'string' ? end.uf : undefined;
      const temCidade = !!end?.codCid && end.codCid > 0 && !!end?.cidade;
      setCidadeSel(
        temCidade
          ? { codigo: end!.codCid!, nome: end!.cidade!, extra: ufSigla }
          : null,
      );
      setCidadeTexto(temCidade ? `${end!.cidade}${ufSigla ? ` (${ufSigla})` : ''}` : '');

      const temBairro = !!end?.codBai && end!.codBai > 0 && !!end?.bairro;
      setBairroSel(temBairro ? { codigo: end!.codBai!, nome: end!.bairro! } : null);
      setBairroTexto(temBairro ? end!.bairro! : '');

      const temLogra = !!end?.codEnd && end!.codEnd > 0 && !!end?.logradouro;
      setLograSel(temLogra ? { codigo: end!.codEnd!, nome: end!.logradouro! } : null);
      setLograTexto(temLogra ? end!.logradouro! : '');

      setNumero(end?.numero || '');
      setComplemento(end?.complemento || '');
      setCep(formatCep(end?.cep || ''));
    } else {
      setNomeParc('');
      setRazaoSocial('');
      setTipoPessoa('J');
      setSituacao('');
      setCnpjCpf('');
      setInscricaoEstadual('');
      setPrazoPag('');
      setLimiteCredito('');
      setObservacoes('');
      setLimiteCreditoMensal('');
      setQtdMaxTitVencidos('');
      setCodTab('');
      setCodVend('');
      setCodBco('');
      setDescBonif('');
      setDescFin('');
      setInscricaoMunicipal('');
      setClassificacaoIcms('');
      setRetemIss('');
      setRetemInss('');
      setRetemPis('');
      setRetemCofins('');
      setRetemCsl('');
      setAdCredCli('');
      setAdLimitePar('');
      setAdLocalCad('');
      setAdEndCompleto('');
      setAdCodBcoBol('');
      setBcoTexto('');
      setAdBcoBolTexto('');
      setSimples('');
      setPerfilEconect('');
      setTipoFatur('');
      setRegimeEspTribIss('');
      setTipoClienteServCom('');
      setLatitude('');
      setLongitude('');
      setLatitudeEntrega('');
      setLongitudeEntrega('');
      setAtivoStatus('S');
      setCodTipParc('');
      setTipParcTexto('');
      setCodReg('');
      setRegTexto('');
      setDtCad('');
      setDtAlter('');
      setGrupoAutor('');
      setBloquear('');
      setMotBloq('');
      setTipAnexoNfe('');
      setEmailDanfe('');
      setEmailNfe('');
      setAdDtAprovRep('');
      setNomeContatoEntrega('');
      setLograEntregaSel(null);
      setLograEntregaTexto('');
      setNumeroEntrega('');
      setComplementoEntrega('');
      setBairroEntregaSel(null);
      setBairroEntregaTexto('');
      setCidadeEntregaSel(null);
      setCidadeEntregaTexto('');
      setCepEntrega('');
      setTelefone('');
      setEmail('');
      setCidadeSel(null);
      setCidadeTexto('');
      setBairroSel(null);
      setBairroTexto('');
      setLograSel(null);
      setLograTexto('');
      setNumero('');
      setComplemento('');
      setCep('');
    }
    setErrorMessage(null);
    setTab('geral');
  }, [clienteAtual, isOpen]);

  const fetchCidades = useCallback(
    (q: string) =>
      import('@/lib/api').then(m =>
        m.clienteApi.getCidades(q).then(rs => rs.map(r => ({ codigo: r.codCid, nome: r.nomeCidade, extra: r.uf }))),
      ),
    [],
  );
  const fetchBairros = useCallback(
    (q: string) =>
      import('@/lib/api').then(m =>
        m.clienteApi.getBairros(q).then(rs => rs.map(r => ({ codigo: r.codBai, nome: r.nomeBairro }))),
      ),
    [],
  );
  const fetchLogradouros = useCallback(
    (q: string) =>
      import('@/lib/api').then(m =>
        m.clienteApi.getLogradouros(q).then(rs => rs.map(r => ({ codigo: r.codEnd, nome: r.nomeEnd }))),
      ),
    [],
  );
  const fetchBancos = useCallback(
    (q: string) =>
      import('@/lib/api').then(m =>
        m.clienteApi.getBancos(q).then(rs => rs.map(r => ({ codigo: r.codBco, nome: `${r.codBco} - ${r.nomeBco}` }))),
      ),
    [],
  );

  const handleCnpjCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpjCpf(formatCnpjCpf(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatPhone(e.target.value));
  };

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const matchExato = <T extends { nome: string }>(lista: T[], alvo: string): T | undefined =>
    lista.find(o => norm(o.nome) === norm(alvo));

  const executarBuscaCepMain = async (valCep: string) => {
    const clean = valCep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setIsBuscandoCepMain(true);
    try {
      const res = await buscarCepViaApi(clean);
      if (res) {
        if (res.logradouro) setLograTexto(res.logradouro);
        if (res.bairro) setBairroTexto(res.bairro);
        if (res.cidade) {
          const nomeFormatado = `${res.cidade}${res.uf ? ` (${res.uf})` : ''}`;
          setCidadeTexto(nomeFormatado);
          if (res.codCid) {
            setCidadeSel({ codigo: res.codCid, nome: res.cidade, extra: res.uf });
          } else {
            const cidadesSankhya = await fetchCidades(res.cidade);
            const exata = cidadesSankhya.length > 0
              ? cidadesSankhya.find(
                  c => c.nome.toLowerCase() === res.cidade.toLowerCase() && (!res.uf || c.extra === res.uf),
                )
              : undefined;
            setCidadeSel(exata ?? null);
            if (!exata) console.warn(`[CEP] Cidade "${res.cidade}" não encontrada exatamente no Sankhya — FK não alterada`);
          }
        }
        if (res.bairro) {
          if (res.codBai) {
            setBairroSel({ codigo: res.codBai, nome: res.bairro });
          } else {
            const bairrosSankhya = await fetchBairros(res.bairro);
            const exato = matchExato(bairrosSankhya, res.bairro);
            setBairroSel(exato ?? null);
            if (!exato) console.warn(`[CEP] Bairro "${res.bairro}" não encontrado exatamente no Sankhya — FK não alterada`);
          }
        }
        if (res.logradouro) {
          if (res.codEnd) {
            setLograSel({ codigo: res.codEnd, nome: res.logradouro });
          } else {
            const lograSankhya = await fetchLogradouros(res.logradouro);
            const exato = matchExato(lograSankhya, res.logradouro);
            setLograSel(exato ?? null);
            if (!exato) console.warn(`[CEP] Logradouro "${res.logradouro}" não encontrado exatamente no Sankhya — FK não alterada`);
          }
        }
        if (res.latitude) setLatitude(res.latitude);
        if (res.longitude) setLongitude(res.longitude);
        setModoVisualizacao(false);
      }
    } catch (e) {
      console.error('Erro ao buscar CEP Principal:', e);
    } finally {
      setIsBuscandoCepMain(false);
    }
  };

  const executarBuscaCepEntrega = async (valCep: string) => {
    const clean = valCep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setIsBuscandoCepEntrega(true);
    try {
      const res = await buscarCepViaApi(clean);
      if (res) {
        if (res.logradouro) setLograEntregaTexto(res.logradouro);
        if (res.bairro) setBairroEntregaTexto(res.bairro);
        if (res.cidade) {
          const nomeFormatado = `${res.cidade}${res.uf ? ` (${res.uf})` : ''}`;
          setCidadeEntregaTexto(nomeFormatado);
          if (res.codCid) {
            setCidadeEntregaSel({ codigo: res.codCid, nome: res.cidade, extra: res.uf });
          } else {
            const cidadesSankhya = await fetchCidades(res.cidade);
            const exata = cidadesSankhya.length > 0
              ? cidadesSankhya.find(
                  c => c.nome.toLowerCase() === res.cidade.toLowerCase() && (!res.uf || c.extra === res.uf),
                )
              : undefined;
            setCidadeEntregaSel(exata ?? null);
            if (!exata) console.warn(`[CEP Entrega] Cidade "${res.cidade}" não encontrada exatamente no Sankhya — FK não alterada`);
          }
        }
        if (res.bairro) {
          if (res.codBai) {
            setBairroEntregaSel({ codigo: res.codBai, nome: res.bairro });
          } else {
            const bairrosSankhya = await fetchBairros(res.bairro);
            const exato = matchExato(bairrosSankhya, res.bairro);
            setBairroEntregaSel(exato ?? null);
            if (!exato) console.warn(`[CEP Entrega] Bairro "${res.bairro}" não encontrado exatamente no Sankhya — FK não alterada`);
          }
        }
        if (res.logradouro) {
          if (res.codEnd) {
            setLograEntregaSel({ codigo: res.codEnd, nome: res.logradouro });
          } else {
            const lograSankhya = await fetchLogradouros(res.logradouro);
            const exato = matchExato(lograSankhya, res.logradouro);
            setLograEntregaSel(exato ?? null);
            if (!exato) console.warn(`[CEP Entrega] Logradouro "${res.logradouro}" não encontrado exatamente no Sankhya — FK não alterada`);
          }
        }
        if (res.latitude) setLatitudeEntrega(res.latitude);
        if (res.longitude) setLongitudeEntrega(res.longitude);
        setModoVisualizacao(false);
      }
    } catch (e) {
      console.error('Erro ao buscar CEP Entrega:', e);
    } finally {
      setIsBuscandoCepEntrega(false);
    }
  };

  const [isGeocodificandoMain, setIsGeocodificandoMain] = useState(false);
  const [isGeocodificandoEntrega, setIsGeocodificandoEntrega] = useState(false);

  const handleBuscarGpsMain = async () => {
    setIsGeocodificandoMain(true);
    try {
      const cidNome = cidadeSel?.nome || cidadeTexto.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const ufNome = cidadeSel?.extra;
      const coords = await buscarCoordenadasPorEndereco({
        logradouro: lograSel?.nome || lograTexto,
        numero,
        bairro: bairroSel?.nome || bairroTexto,
        cidade: cidNome,
        uf: ufNome,
        cep,
      });
      if (coords) {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        setModoVisualizacao(false);
      } else {
        alert('Não foi possível localizar as coordenadas GPS para este endereço. Certifique-se de que a Cidade/Rua ou CEP estejam preenchidos.');
      }
    } catch (err) {
      console.error('Erro ao buscar GPS principal:', err);
    } finally {
      setIsGeocodificandoMain(false);
    }
  };

  const handleBuscarGpsEntrega = async () => {
    setIsGeocodificandoEntrega(true);
    try {
      const cidNome = cidadeEntregaSel?.nome || cidadeEntregaTexto.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const ufNome = cidadeEntregaSel?.extra;
      const coords = await buscarCoordenadasPorEndereco({
        logradouro: lograEntregaSel?.nome || lograEntregaTexto,
        numero: numeroEntrega,
        bairro: bairroEntregaSel?.nome || bairroEntregaTexto,
        cidade: cidNome,
        uf: ufNome,
        cep: cepEntrega,
      });
      if (coords) {
        setLatitudeEntrega(coords.latitude);
        setLongitudeEntrega(coords.longitude);
        setModoVisualizacao(false);
      } else {
        alert('Não foi possível localizar as coordenadas GPS para o endereço de entrega.');
      }
    } catch (err) {
      console.error('Erro ao buscar GPS de entrega:', err);
    } finally {
      setIsGeocodificandoEntrega(false);
    }
  };

  const [isConsultandoCnpj, setIsConsultandoCnpj] = useState(false);

  const handleConsultarCnpjPublico = async (valCnpj: string) => {
    const clean = valCnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      alert('Digite um CNPJ válido com 14 dígitos para consultar.');
      return;
    }

    setIsConsultandoCnpj(true);
    try {
      const res = await consultarCnpjPublico(clean);
      if (res) {
        if (res.razaoSocial) setRazaoSocial(res.razaoSocial);
        if (res.nomeFantasia) setNomeParc(res.nomeFantasia);
        if (res.inscricaoEstadual) setInscricaoEstadual(res.inscricaoEstadual);
        if (res.email) {
          setEmail(res.email);
          setEmailDanfe(res.email);
          setEmailNfe(res.email);
        }
        if (res.telefone) setTelefone(formatPhone(res.telefone));
        if (res.numero) setNumero(res.numero);
        if (res.complemento) setComplemento(res.complemento.substring(0, 30));

        if (res.cep) {
          const formattedCep = formatCep(res.cep);
          setCep(formattedCep);
          executarBuscaCepMain(formattedCep);
        } else if (res.cidade) {
          const cidSankhya = await fetchCidades(res.cidade);
          const exata = cidSankhya.find(
            c => c.nome.toLowerCase() === res.cidade!.toLowerCase() && (!res.uf || c.extra === res.uf),
          );
          if (exata) setCidadeSel(exata);
          if (res.bairro) {
            const baiSankhya = await fetchBairros(res.bairro);
            const exatoBai = matchExato(baiSankhya, res.bairro);
            if (exatoBai) setBairroSel(exatoBai);
          }
          if (res.logradouro) setLograTexto(res.logradouro);
        }

        setModoVisualizacao(false);
      } else {
        alert('Não foi possível obter os dados do CNPJ informado. Verifique se o CNPJ está correto.');
      }
    } catch (err) {
      console.error('Erro ao consultar CNPJ público:', err);
      alert('Erro ao realizar consulta do CNPJ.');
    } finally {
      setIsConsultandoCnpj(false);
    }
  };

  const handleSalvarAnexo = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!cliente?.codParc) {
      alert('Salve o cadastro do parceiro antes de incluir anexos.');
      return;
    }
    if (!arquivoObj) {
      alert('Selecione o arquivo do computador (o arquivo físico é enviado ao Sankhya).');
      return;
    }

    setIsSavingAnexo(true);
    try {
      await uploadAnexoMutation.mutateAsync({
        codParc: cliente.codParc,
        arquivo: arquivoObj,
        descricao: descAnexo.trim() || undefined,
      });
      setShowAddAnexo(false);
      setNomeArquivoAnexo('');
      setDescAnexo('');
      setArquivoObj(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetchAnexos();
    } catch (err: any) {
      console.error('Erro ao salvar anexo:', err);
      alert(err?.response?.data?.message || 'Falha ao salvar anexo no Sankhya.');
    } finally {
      setIsSavingAnexo(false);
    }
  };

  const handleRemoverAnexo = async (anx: ClienteAnexo) => {
    if (!cliente?.codParc) return;
    if (!confirm('Deseja realmente remover este anexo do parceiro?')) return;

    setDeletingNuAttach(anx.nuAttach);
    try {
      await removerAnexoMutation.mutateAsync({
        codParc: cliente.codParc,
        nuAttach: anx.nuAttach,
        fonte: anx.fonte || 'TSIATA',
        descricao: anx.descricao,
      });
      refetchAnexos();
    } catch (err: any) {
      console.error('Erro ao remover anexo:', err);
      alert('Falha ao remover anexo do Sankhya.');
    } finally {
      setDeletingNuAttach(null);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      executarBuscaCepMain(formatted);
    }
  };

  const handleCepEntregaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCepEntrega(formatted);
    // Ativa modo edição imediatamente ao digitar CEP (não aguarda a resposta assíncrona da API)
    setModoVisualizacao(false);
    if (formatted.replace(/\D/g, '').length === 8) {
      executarBuscaCepEntrega(formatted);
    }
  };

  const handleLimiteCreditoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLimiteCredito(formatCurrencyInput(e.target.value));
  };

  const handleLimiteCreditoMensalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLimiteCreditoMensal(formatCurrencyInput(e.target.value));
  };

  const handleAdCredCliChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdCredCli(formatCurrencyInput(e.target.value));
  };

  const handleAdLimiteParChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdLimitePar(formatCurrencyInput(e.target.value));
  };

  /**
   * buildDirtyUpdatePayload — compara campo a campo com clienteAtual e retorna
   * APENAS o que foi modificado. enderecoEntrega e endereco só são incluídos
   * quando algum campo das suas seções foi alterado.
   */
  const buildDirtyUpdatePayload = (): UpdateClientePayload => {
    const c = clienteAtual!;
    const p: UpdateClientePayload = {
      // nomeParc e tipoPessoa são sempre incluídos (campos essenciais do parceiro)
      nomeParc: nomeParc.trim(),
      tipoPessoa,
    };

    const strDiff = (atual: string, orig: string | undefined | null) =>
      atual.trim() !== (orig || '').trim();
    const numDiff = (formStr: string, orig: number | undefined | null) =>
      formStr.trim() !== (orig != null ? String(orig) : '');
    const currDiff = (formStr: string, orig: number | undefined | null) =>
      parseCurrencyInput(formStr) !== (orig ?? undefined);
    const selDiff = (sel: { codigo: number } | null, origCod: number | undefined | null) =>
      (sel?.codigo ?? 0) !== (origCod ?? 0);
    const txtDiff = (txt: string, orig: string | undefined | null) =>
      txt.trim() !== (orig || '').trim();

    // — Aba Geral —
    if (ativoStatus !== (c.ativo ? 'S' : 'N')) p.ativo = ativoStatus;
    if (numDiff(codTipParc, c.codTipParc)) p.codTipParc = codTipParc.trim() ? parseInt(codTipParc.trim(), 10) : undefined;
    if (numDiff(codReg, c.codReg)) p.codReg = codReg.trim() ? parseInt(codReg.trim(), 10) : undefined;
    if (strDiff(razaoSocial, c.razaoSocial)) p.razaoSocial = razaoSocial.trim() || undefined;
    if (strDiff(cnpjCpf, formatCnpjCpf(c.cnpjCpf || ''))) p.cnpjCpf = cnpjCpf.trim() || undefined;
    if (tipoPessoa !== (c.tipoPessoa || 'J')) p.tipoPessoa = tipoPessoa;
    if (situacao !== '' && situacao !== (c.situacao || '')) p.situacao = situacao;
    if (strDiff(inscricaoEstadual, c.inscricaoEstadual)) p.inscricaoEstadual = inscricaoEstadual.trim() || undefined;
    if (strDiff(observacoes, c.observacoes)) p.observacoes = observacoes.trim() || undefined;

    // — Aba Contato —
    if (strDiff(telefone, formatPhone(c.telefone || ''))) p.telefone = telefone.trim() || undefined;
    if (strDiff(email, c.email)) p.email = email.trim() || undefined;

    // — Aba Financeiro & Crédito —
    if (numDiff(prazoPag, c.prazoPag)) p.prazoPag = prazoPag.trim() ? parseInt(prazoPag.trim(), 10) : undefined;
    if (currDiff(limiteCredito, c.limiteCredito)) p.limiteCredito = parseCurrencyInput(limiteCredito);
    if (currDiff(limiteCreditoMensal, c.limiteCreditoMensal)) p.limiteCreditoMensal = parseCurrencyInput(limiteCreditoMensal);
    if (numDiff(qtdMaxTitVencidos, c.qtdMaxTitVencidos)) p.qtdMaxTitVencidos = qtdMaxTitVencidos.trim() ? parseInt(qtdMaxTitVencidos.trim(), 10) : undefined;
    if (strDiff(codTab, c.codTab)) p.codTab = codTab.trim() || undefined;
    if (numDiff(codVend, c.codVend)) p.codVend = codVend.trim() ? parseInt(codVend.trim(), 10) : undefined;
    if (numDiff(codBco, c.codBco)) p.codBco = codBco.trim() ? parseInt(codBco.trim(), 10) : undefined;
    if (descBonif !== (c.descBonif != null ? String(c.descBonif) : '')) p.descBonif = descBonif !== '' ? descBonif : undefined;
    if (strDiff(descFin, c.descFin != null ? String(c.descFin) : '')) p.descFin = descFin.trim() ? parseFloat(descFin.trim()) : undefined;

    // — Aba Fiscal —
    if (strDiff(inscricaoMunicipal, c.inscricaoMunicipal)) p.inscricaoMunicipal = inscricaoMunicipal.trim() || undefined;
    if (strDiff(classificacaoIcms, c.classificacaoIcms)) p.classificacaoIcms = classificacaoIcms.trim() || undefined;
    if (retemIss !== (c.retemIss || '')) p.retemIss = retemIss !== '' ? retemIss : undefined;
    if (retemInss !== (c.retemInss || '')) p.retemInss = retemInss !== '' ? retemInss : undefined;
    if (retemPis !== (c.retemPis || '')) p.retemPis = retemPis !== '' ? retemPis : undefined;
    if (retemCofins !== (c.retemCofins || '')) p.retemCofins = retemCofins !== '' ? retemCofins : undefined;
    if (retemCsl !== (c.retemCsl || '')) p.retemCsl = retemCsl !== '' ? retemCsl : undefined;
    if (simples !== (c.simples || '')) p.simples = simples !== '' ? simples : undefined;
    if (perfilEconect !== (c.perfilEconect || '')) p.perfilEconect = perfilEconect !== '' ? perfilEconect : undefined;
    if (tipoFatur !== (c.tipoFatur || '')) p.tipoFatur = tipoFatur !== '' ? tipoFatur : undefined;
    if (regimeEspTribIss !== (c.regimeEspTribIss || '')) p.regimeEspTribIss = regimeEspTribIss !== '' ? regimeEspTribIss : undefined;
    if (tipoClienteServCom !== (c.tipoClienteServCom || '')) p.tipoClienteServCom = tipoClienteServCom !== '' ? tipoClienteServCom : undefined;
    if (strDiff(tipAnexoNfe, c.tipAnexoNfe)) p.tipAnexoNfe = tipAnexoNfe.trim() || undefined;
    if (strDiff(emailDanfe, c.emailDanfe)) p.emailDanfe = emailDanfe.trim() || undefined;
    if (strDiff(emailNfe, c.emailNfe)) p.emailNfe = emailNfe.trim() || undefined;

    // — Aba Regras, Bloqueio e AD_* —
    if (numDiff(grupoAutor, c.grupoAutor)) p.grupoAutor = grupoAutor.trim() ? parseInt(grupoAutor.trim(), 10) : undefined;
    if (bloquear !== (c.bloquear || '')) p.bloquear = bloquear !== '' ? bloquear : undefined;
    if (strDiff(motBloq, c.motBloq)) p.motBloq = motBloq.trim() || undefined;

    // — Aba Campos AD_* —
    if (currDiff(adCredCli, c.adCredCli)) p.adCredCli = parseCurrencyInput(adCredCli);
    if (currDiff(adLimitePar, c.adLimitePar)) p.adLimitePar = parseCurrencyInput(adLimitePar);
    if (strDiff(adLocalCad, c.adLocalCad)) p.adLocalCad = adLocalCad.trim() || undefined;
    if (strDiff(adEndCompleto, c.adEndCompleto)) p.adEndCompleto = adEndCompleto.trim() || undefined;
    if (numDiff(adCodBcoBol, c.adCodBcoBol)) p.adCodBcoBol = adCodBcoBol.trim() ? parseInt(adCodBcoBol.trim(), 10) : undefined;

    // — Aba Endereço de Entrega —
    if (strDiff(latitude, c.latitude)) p.latitude = latitude.trim() || undefined;
    if (strDiff(longitude, c.longitude)) p.longitude = longitude.trim() || undefined;
    if (strDiff(latitudeEntrega, c.latitudeEntrega)) p.latitudeEntrega = latitudeEntrega.trim() || undefined;
    if (strDiff(longitudeEntrega, c.longitudeEntrega)) p.longitudeEntrega = longitudeEntrega.trim() || undefined;

    // Endereço de entrega: inclui no payload SOMENTE se algum campo da seção mudou
    const entE = c.enderecoEntrega;
    const entregaMudou =
      txtDiff(cepEntrega, formatCep(entE?.cep || '')) ||
      txtDiff(numeroEntrega, entE?.numero) ||
      txtDiff(complementoEntrega, entE?.complemento) ||
      txtDiff(lograEntregaTexto, entE?.logradouro) ||
      txtDiff(bairroEntregaTexto, entE?.bairro) ||
      txtDiff(cidadeEntregaTexto.replace(/\s*\([^)]*\)\s*$/, '').trim(), entE?.cidade) ||
      selDiff(lograEntregaSel, entE?.codEnd) ||
      selDiff(bairroEntregaSel, entE?.codBai) ||
      selDiff(cidadeEntregaSel, entE?.codCid);

    if (entregaMudou) {
      const cidEntTextoLimpo = cidadeEntregaTexto.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const ufEntExtraida = typeof cidadeEntregaSel?.extra === 'string'
        ? cidadeEntregaSel.extra
        : (cidadeEntregaTexto.match(/\(([^)]+)\)$/)?.[1] || undefined);

      p.enderecoEntrega = {
        codCid: cidadeEntregaSel?.codigo,
        codBai: bairroEntregaSel?.codigo,
        codEnd: lograEntregaSel?.codigo,
        logradouro: lograEntregaSel?.nome ?? (lograEntregaTexto.trim() || undefined),
        numero: numeroEntrega.trim().slice(0, 6) || undefined,
        complemento: complementoEntrega.trim().slice(0, 30) || undefined,
        bairro: bairroEntregaSel?.nome ?? (bairroEntregaTexto.trim() || undefined),
        cidade: cidadeEntregaSel?.nome ?? (cidEntTextoLimpo || undefined),
        uf: ufEntExtraida,
        cep: cepEntrega.trim() || undefined,
      };
    }

    // Endereço principal: inclui no payload SOMENTE se algum campo mudou
    const end = c.endereco;
    const enderecoPrincipalMudou =
      txtDiff(cep, formatCep(end?.cep || '')) ||
      txtDiff(numero, end?.numero) ||
      txtDiff(complemento, end?.complemento) ||
      txtDiff(lograTexto, end?.logradouro) ||
      txtDiff(bairroTexto, end?.bairro) ||
      txtDiff(cidadeTexto.replace(/\s*\([^)]*\)\s*$/, '').trim(), end?.cidade) ||
      selDiff(lograSel, end?.codEnd) ||
      selDiff(bairroSel, end?.codBai) ||
      selDiff(cidadeSel, end?.codCid);

    if (enderecoPrincipalMudou) {
      p.endereco = {
        codCid: cidadeSel?.codigo,
        codBai: bairroSel?.codigo,
        codEnd: lograSel?.codigo,
        cidade: cidadeSel?.nome ?? (cidadeTexto.replace(/\s*\([^)]*\)\s*$/, '').trim() || undefined),
        uf: typeof cidadeSel?.extra === 'string' ? cidadeSel.extra : undefined,
        bairro: bairroSel?.nome ?? (bairroTexto.trim() || undefined),
        logradouro: lograSel?.nome ?? (lograTexto.trim() || undefined),
        numero: numero.trim().slice(0, 6) || undefined,
        complemento: complemento.trim().slice(0, 30) || undefined,
        cep: cep.trim() || undefined,
      };
    }

    return p;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!nomeParc.trim()) {
      setErrorMessage('Nome do cliente é obrigatório.');
      setTab('geral');
      return;
    }

    if (!cidadeSel && !cidadeTexto.trim()) {
      setErrorMessage('Cidade é obrigatória (regra do Sankhya).');
      setTab('endereco');
      return;
    }

    try {
      if (isEditing && cliente) {
        // Modo edição: envia APENAS os campos modificados (dirty diff)
        const updatePayload = buildDirtyUpdatePayload();
        await atualizarMutation.mutateAsync({ codParc: cliente.codParc, payload: updatePayload });
        setSuccessMessage(`Cliente #${cliente.codParc} atualizado com sucesso no Sankhya!`);
        setModoVisualizacao(true);
        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      } else {
        // Modo criação: payload completo (não há base de comparação)
        const payload: CreateClientePayload = {
          nomeParc: nomeParc.trim(),
          tipoPessoa,
          razaoSocial: razaoSocial.trim() || undefined,
          cnpjCpf: cnpjCpf.trim() || undefined,
          telefone: telefone.trim() || undefined,
          email: email.trim() || undefined,
          inscricaoEstadual: inscricaoEstadual.trim() || undefined,
          prazoPag: prazoPag.trim() ? parseInt(prazoPag.trim(), 10) : undefined,
          limiteCredito: parseCurrencyInput(limiteCredito),
          observacoes: observacoes.trim() || undefined,
          limiteCreditoMensal: parseCurrencyInput(limiteCreditoMensal),
          qtdMaxTitVencidos: qtdMaxTitVencidos.trim() ? parseInt(qtdMaxTitVencidos.trim(), 10) : undefined,
          codTab: codTab.trim() || undefined,
          codVend: codVend.trim() ? parseInt(codVend.trim(), 10) : undefined,
          codBco: codBco.trim() ? parseInt(codBco.trim(), 10) : undefined,
          descBonif: descBonif !== '' ? descBonif : undefined,
          descFin: descFin.trim() ? parseFloat(descFin.trim()) : undefined,
          inscricaoMunicipal: inscricaoMunicipal.trim() || undefined,
          classificacaoIcms: classificacaoIcms.trim() || undefined,
          retemIss: retemIss !== '' ? retemIss : undefined,
          retemInss: retemInss !== '' ? retemInss : undefined,
          retemPis: retemPis !== '' ? retemPis : undefined,
          retemCofins: retemCofins !== '' ? retemCofins : undefined,
          retemCsl: retemCsl !== '' ? retemCsl : undefined,
          adCredCli: parseCurrencyInput(adCredCli),
          adLimitePar: parseCurrencyInput(adLimitePar),
          adLocalCad: adLocalCad.trim() || undefined,
          adEndCompleto: adEndCompleto.trim() || undefined,
          adCodBcoBol: adCodBcoBol.trim() ? parseInt(adCodBcoBol.trim(), 10) : undefined,
          simples: simples !== '' ? simples : undefined,
          perfilEconect: perfilEconect !== '' ? perfilEconect : undefined,
          tipoFatur: tipoFatur !== '' ? tipoFatur : undefined,
          regimeEspTribIss: regimeEspTribIss !== '' ? regimeEspTribIss : undefined,
          latitude: latitude.trim() || undefined,
          longitude: longitude.trim() || undefined,
          enderecoEntrega: {
            codCid: cidadeEntregaSel?.codigo,
            codBai: bairroEntregaSel?.codigo,
            codEnd: lograEntregaSel?.codigo,
            logradouro: lograEntregaSel?.nome ?? (lograEntregaTexto.trim() || undefined),
            numero: numeroEntrega.trim().slice(0, 6) || undefined,
            complemento: complementoEntrega.trim().slice(0, 30) || undefined,
            bairro: bairroEntregaSel?.nome ?? (bairroEntregaTexto.trim() || undefined),
            cidade: cidadeEntregaSel?.nome ?? (cidadeEntregaTexto.replace(/\s*\([^)]*\)\s*$/, '').trim() || undefined),
            uf: typeof cidadeEntregaSel?.extra === 'string'
              ? cidadeEntregaSel.extra
              : (cidadeEntregaTexto.match(/\(([^)]+)\)$/)?.[1] || undefined),
            cep: cepEntrega.trim() || undefined,
          },
          endereco: {
            codCid: cidadeSel?.codigo,
            codBai: bairroSel?.codigo,
            codEnd: lograSel?.codigo,
            cidade: cidadeSel?.nome ?? (cidadeTexto.replace(/\s*\([^)]*\)\s*$/, '').trim() || undefined),
            uf: typeof cidadeSel?.extra === 'string' ? cidadeSel.extra : undefined,
            bairro: bairroSel?.nome ?? (bairroTexto.trim() || undefined),
            logradouro: lograSel?.nome ?? (lograTexto.trim() || undefined),
            numero: numero.trim().slice(0, 6) || undefined,
            complemento: complemento.trim().slice(0, 30) || undefined,
            cep: cep.trim() || undefined,
          },
        };
        await criarMutation.mutateAsync(payload);
        setSuccessMessage(`Novo cliente registrado com sucesso no Sankhya!`);
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erro ao salvar cliente no Sankhya.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const isLoading = criarMutation.isPending || atualizarMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 md:p-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-4xl lg:max-w-5xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              {tipoPessoa === 'J' ? <Building className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  {isEditing ? `Cliente #${cliente.codParc} - ${cliente.nomeParc}` : 'Cadastrar Novo Cliente'}
                </h3>
                {isEditing && modoVisualizacao && (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    Modo Leitura
                  </span>
                )}
                {isEditing && !modoVisualizacao && (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Modo Edição
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {isEditing
                  ? modoVisualizacao
                    ? 'Visualização dos dados do parceiro (clique em "Habilitar Edição" para alterar)'
                    : 'Modifique os dados abaixo. O botão Salvar será ativado ao alterar qualquer campo.'
                  : 'Preencha os dados do novo cliente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher: Rápido vs Completo */}
            <div className="flex items-center rounded-lg border border-gray-300 bg-gray-100 p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setModoFormulario('rapido')}
                title="Visualização simplificada com apenas os campos fundamentais"
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  modoFormulario === 'rapido'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Cadastro Rápido
              </button>
              <button
                type="button"
                onClick={() => setModoFormulario('completo')}
                title="Visualização ERP completa com todos os campos e tabelas do Sankhya"
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  modoFormulario === 'completo'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Cadastro Completo (ERP)
              </button>
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={() => setModoVisualizacao(!modoVisualizacao)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  modoVisualizacao
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-300 hover:bg-indigo-100 shadow-xs'
                }`}
              >
                {modoVisualizacao ? (
                  <>
                    <Pencil className="h-3.5 w-3.5 text-amber-800" /> Habilitar Edição
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-indigo-700" /> Modo Leitura
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de Saúde / Completude do Cadastro */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-indigo-50/50 px-6 py-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span className="font-bold text-gray-800">Completude do Cadastro:</span>
            <div className="h-2 w-28 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  completenessScore >= 80
                    ? 'bg-green-600'
                    : completenessScore >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${completenessScore}%` }}
              />
            </div>
            <span className="font-extrabold text-indigo-900">{completenessScore}%</span>
          </div>
          <span className="text-[11px] font-semibold text-gray-600 hidden md:inline">
            {completenessScore === 100
              ? '✨ Cadastro 100% completo e qualificado!'
              : '💡 Dica: Preencha CNPJ, Nome, Telefone, E-mail e Endereço para atingir 100%'}
          </span>
        </div>

        {/* Feedback Banners (Erro ou Sucesso) */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Erro ao salvar no Sankhya</p>
                <p className="mt-0.5 whitespace-pre-line leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="font-bold text-emerald-900">{successMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="rounded p-1 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation (Exibido apenas no Modo Completo ERP) */}
        {modoFormulario === 'completo' && (
          <div className="flex border-b border-gray-200 bg-white px-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setTab('geral')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === 'geral'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              Dados Gerais
            </button>
            <button
              type="button"
              onClick={() => setTab('contato')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === 'contato'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              <Phone className="h-4 w-4" />
              Contato
            </button>
            <button
              type="button"
              onClick={() => setTab('endereco')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === 'endereco'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              <MapPin className="h-4 w-4" />
              Endereço
            </button>
            <button
              type="button"
              onClick={() => setTab('empresas')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === 'empresas'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              <Building className="h-4 w-4" />
              Empresas / Grupo ICMS
            </button>
            <button
              type="button"
              onClick={() => setTab('financeiro')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === 'financeiro'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Financeiro & Crédito
            </button>
            <button
              type="button"
              onClick={() => setTab('fiscal')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === 'fiscal'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              <Receipt className="h-4 w-4" />
              Fiscal
            </button>
            <button
              type="button"
              onClick={() => setTab('customizados')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === 'customizados'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              <Layers className="h-4 w-4" />
              Campos AD_*
            </button>
            <button
              type="button"
              onClick={() => setTab('anexos')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === 'anexos'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              <Paperclip className="h-4 w-4" />
              Anexos & Documentos
              {anexosParceiro.length > 0 && (
                <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                  {anexosParceiro.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoadingDetalhe ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold text-gray-600">
                Carregando dados cadastrais do cliente #{cliente?.codParc} no Sankhya...
              </p>
            </div>
          ) : (
            <>
              {/* MODO CADASTRO RÁPIDO (3 CARDS COMPACTOS) */}
              {modoFormulario === 'rapido' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Card 1: Identificação */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-4 shadow-xs">
                    <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-indigo-200/80 pb-2">
                      <Building className="h-4 w-4 text-indigo-600" />
                      1. Identificação Básica do Cliente
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Tipo de Pessoa <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4 pt-1">
                          <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                            <input
                              type="radio"
                              name="tipoPessoaRapido"
                              value="J"
                              checked={tipoPessoa === 'J'}
                              onChange={() => setTipoPessoa('J')}
                              className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            Jurídica (PJ)
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                            <input
                              type="radio"
                              name="tipoPessoaRapido"
                              value="F"
                              checked={tipoPessoa === 'F'}
                              onChange={() => setTipoPessoa('F')}
                              className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            Física (PF)
                          </label>
                        </div>
                      </div>

                      <div className="md:col-span-5">
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          {tipoPessoa === 'J' ? 'CNPJ' : 'CPF'} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={tipoPessoa === 'J' ? '00.000.000/0000-00' : '000.000.000-00'}
                            value={cnpjCpf}
                            onChange={handleCnpjCpfChange}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                          {tipoPessoa === 'J' && (
                            <button
                              type="button"
                              onClick={() => handleConsultarCnpjPublico(cnpjCpf)}
                              disabled={isConsultandoCnpj}
                              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                            >
                              {isConsultandoCnpj ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                              Consultar
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Inscrição Estadual (IE)
                        </label>
                        <input
                          type="text"
                          placeholder="Isento ou Nº da IE"
                          value={inscricaoEstadual}
                          onChange={(e) => setInscricaoEstadual(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="md:col-span-12">
                        <FormLabel label="Nome do Cliente / Razão Social" obrigatorio />
                        <input
                          type="text"
                          placeholder="Nome fantasia ou Razão social completa"
                          value={nomeParc}
                          onChange={(e) => setNomeParc(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Contatos */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3 shadow-xs">
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-2">
                      <Phone className="h-4 w-4 text-indigo-600" />
                      2. Contato Direto & Notificações
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <FormLabel label="Telefone / WhatsApp" />
                        <input
                          type="text"
                          placeholder="(00) 00000-0000"
                          value={telefone}
                          onChange={(e) => setTelefone(formatPhone(e.target.value))}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <FormLabel label="E-mail Principal" />
                        <input
                          type="email"
                          placeholder="contato@cliente.com.br"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Endereço Principal */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3 shadow-xs">
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-2">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                      3. Endereço Principal
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-4">
                        <FormLabel label="CEP" />
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="00000-000"
                            value={cep}
                            onChange={handleCepChange}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                          {isBuscandoCepMain && (
                            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-indigo-600" />
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-8">
                        <FormLabel label="Logradouro / Rua" />
                        <input
                          type="text"
                          placeholder="Rua, Avenida, Alameda..."
                          value={lograTexto}
                          onChange={(e) => {
                            setLograTexto(e.target.value);
                            setLograSel(null);
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <FormLabel label="Número" />
                        <input
                          type="text"
                          placeholder="123"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <FormLabel label="Bairro" />
                        <input
                          type="text"
                          placeholder="Bairro"
                          value={bairroTexto}
                          onChange={(e) => {
                            setBairroTexto(e.target.value);
                            setBairroSel(null);
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <EnderecoCombobox
                          label="Cidade / UF"
                          placeholder="Buscar cidade..."
                          fetcher={fetchCidades}
                          value={cidadeTexto}
                          onSelecionar={setCidadeSel}
                          onTextoChange={setCidadeTexto}
                          obrigatorio
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODO CADASTRO COMPLETO ERP (ABAS EXPANDIDAS) */}
              {modoFormulario === 'completo' && (
                <>
                  {/* TAB 1: DADOS GERAIS */}
                  {tab === 'geral' && (
            <div className="space-y-4">
              {/* 1. TIPO PESSOA, CNPJ/CPF COM CONSULTA RECEITA/SINTEGRA E INSCRIÇÃO ESTADUAL NO INÍCIO */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-3 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  {/* Tipo de Pessoa (3 cols) */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tipo de Pessoa <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="tipoPessoa"
                          value="J"
                          checked={tipoPessoa === 'J'}
                          onChange={() => setTipoPessoa('J')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        Jurídica (PJ)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="tipoPessoa"
                          value="F"
                          checked={tipoPessoa === 'F'}
                          onChange={() => setTipoPessoa('F')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        Física (PF)
                      </label>
                    </div>
                  </div>

                  {/* CNPJ / CPF + Botão Consultar Receita/Sintegra (6 cols) */}
                  <div className="md:col-span-6">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {tipoPessoa === 'J' ? 'CNPJ' : 'CPF'} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder={tipoPessoa === 'J' ? '00.000.000/0000-00' : '000.000.000-00'}
                          value={cnpjCpf}
                          onChange={handleCnpjCpfChange}
                          className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none ${
                            docValidoQuery.data?.existe
                              ? 'border-amber-500 bg-amber-50/30'
                              : 'border-gray-300 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      {tipoPessoa === 'J' && (
                        <button
                          type="button"
                          onClick={() => handleConsultarCnpjPublico(cnpjCpf)}
                          disabled={isConsultandoCnpj || cnpjCpf.replace(/\D/g, '').length !== 14}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
                          title="Consultar dados da empresa (Razão Social, Endereço, Inscrição Estadual) na Receita Federal / Sintegra"
                        >
                          {isConsultandoCnpj ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Consultando...
                            </>
                          ) : (
                            <>
                              <Search className="h-3.5 w-3.5" />
                              Consultar CNPJ / Receita
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {docValidoQuery.isFetching ? (
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Verificando CNPJ/CPF no Sankhya...
                      </p>
                    ) : docValidoQuery.data?.existe ? (
                      <p className="text-[10px] font-semibold text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {docValidoQuery.data.mensagem || 'Documento já cadastrado no sistema.'}
                      </p>
                    ) : null}
                  </div>

                  {/* Inscrição Estadual (3 cols) */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Inscrição Estadual
                    </label>
                    <input
                      type="text"
                      placeholder="ex: 123.456.789.123"
                      value={inscricaoEstadual}
                      onChange={(e) => setInscricaoEstadual(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Classificação (crédito)
                    </label>
                    <select
                      value={situacao}
                      onChange={(e) => setSituacao(e.target.value as SituacaoCliente | '')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Não informada</option>
                      {(Object.keys(SITUACAO_LABELS) as SituacaoCliente[]).map(s => (
                        <option key={s} value={s}>
                          {SITUACAO_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome do Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Empresa Exemplo Ltda"
                  value={nomeParc}
                  onChange={(e) => setNomeParc(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Razão Social
                </label>
                <input
                  type="text"
                  placeholder="ex: Empresa Exemplo Ltda"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <p className="text-[10px] text-gray-400">
                Se a razão social ficar vazia, será usado o nome do cliente.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <FormLabel label="Parceiro Ativo (ATIVO)" tooltip="ATIVO — Status de atividade do parceiro ('S' = Ativo, 'N' = Inativo)" />
                  <select
                    value={ativoStatus}
                    onChange={(e) => setAtivoStatus(e.target.value as 'S' | 'N')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="S">Sim (S) - Ativo</option>
                    <option value="N">Não (N) - Inativo</option>
                  </select>
                </div>
                <EnderecoCombobox
                  label="Tipo de Parceiro (TGFTPP)"
                  placeholder="Pesquise..."
                  fetcher={fetchTiposParceiro}
                  value={tipParcTexto}
                  onSelecionar={(t) => setCodTipParc(t ? String(t.codigo) : '')}
                  onTextoChange={setTipParcTexto}
                  icon={false}
                  tooltip="CODTIPPARC — Pesquisa dinâmica na tabela TGFTPP (Tipos de Parceiro)"
                />
                <EnderecoCombobox
                  label="Região do Parceiro (TSIREG)"
                  placeholder="Pesquise..."
                  fetcher={fetchRegioes}
                  value={regTexto}
                  onSelecionar={(r) => setCodReg(r ? String(r.codigo) : '')}
                  onTextoChange={setRegTexto}
                  icon={false}
                  tooltip="CODREG — Pesquisa dinâmica na tabela TSIREG (Regiões)"
                />
                <EnderecoCombobox
                  label="Banco para Boleto"
                  placeholder="ex: 341 - Itaú / 001 - BB"
                  fetcher={fetchBancos}
                  value={adBcoBolTexto}
                  onSelecionar={(b) => setAdCodBcoBol(b ? String(b.codigo) : '')}
                  onTextoChange={setAdBcoBolTexto}
                  icon={false}
                  tooltip="AD_CODBCOBOL — Pesquisa dinâmica na tabela TSIBCO (Banco para Boleto)"
                />
              </div>

              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <div>
                    <FormLabel label="Data de Cadastro (DTCAD)" tooltip="DTCAD — Data em que o parceiro foi cadastrado no Sankhya" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={dtCad}
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <FormLabel label="Última Alteração (DTALTER)" tooltip="DTALTER — Data da última modificação do parceiro no Sankhya" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={dtAlter}
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <FormLabel label="Aprovação Representante (AD_DTAPROVREP)" tooltip="AD_DTAPROVREP — Data de aprovação do representante (Apenas Leitura)" />
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        disabled
                        placeholder="Sem aprovação..."
                        value={adDtAprovRep}
                        className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 cursor-not-allowed pr-8"
                      />
                      <Lock className="absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Prazo de Pagamento (dias)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="ex: 30"
                    value={prazoPag}
                    onChange={(e) => setPrazoPag(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Limite de Crédito (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="ex: 5.000,00"
                    value={limiteCredito}
                    onChange={handleLimiteCreditoChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observações / Histórico
                </label>
                <textarea
                  rows={3}
                  placeholder="Observações do cliente, referências comerciais ou anotações de crédito..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CONTATO */}
          {tab === 'contato' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={handlePhoneChange}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">
                  Gravado apenas com dígitos (limite de 13 caracteres no Sankhya).
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ENDEREÇO (UNIFICADO) */}
          {tab === 'endereco' && (
            <div className="space-y-4">
              {/* Endereço Completo Formatado (AD_ENDCOMPLETO) */}
              <div>
                <FormLabel label="Endereço Completo Formatado (AD_ENDCOMPLETO)" tooltip="AD_ENDCOMPLETO — Campo calculado via sub-select no Sankhya (Apenas Leitura)" />
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    placeholder="Sem endereço calculado..."
                    value={adEndCompleto}
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 cursor-not-allowed pr-8"
                  />
                  <Lock className="absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                </div>
                <p className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Campo calculado dinamicamente no banco Sankhya (apenas leitura).
                </p>
              </div>

              {/* Sub-divisão Navegação */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                  type="button"
                  onClick={() => setSubTabEndereco('principal')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabEndereco === 'principal'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Endereço Principal (Faturamento / Comercial)
                </button>
                <button
                  type="button"
                  onClick={() => setSubTabEndereco('entrega')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabEndereco === 'entrega'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Truck className="h-3.5 w-3.5" />
                  Endereço de Entrega
                </button>
              </div>

              {/* Sub-divisão 1: Endereço Principal */}
              {subTabEndereco === 'principal' && (
                <div className="space-y-4 pt-1">
                  <p className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 text-[11px] text-blue-700">
                    Cidade, bairro e logradouro são buscados das tabelas do Sankhya. Digite 2+ letras e
                    selecione na lista — a cidade é <strong>obrigatória</strong> (regra do banco).
                  </p>

                  {/* 1. CEP (PRIMEIRO CAMPO) */}
                  <div>
                    <FormLabel
                      label="CEP"
                      tooltip="CEP — Busca automática na API ViaCEP / BrasilAPI ao digitar 8 dígitos"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={cep}
                        onChange={handleCepChange}
                        className="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => executarBuscaCepMain(cep)}
                        disabled={isBuscandoCepMain || cep.replace(/\D/g, '').length !== 8}
                        title="Buscar endereço pelo CEP via API (ViaCEP/BrasilAPI)"
                        className="absolute right-1 top-1 bottom-1 px-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        {isBuscandoCepMain ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2. Cidade e Bairro */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EnderecoCombobox
                      label="Cidade"
                      placeholder="ex: Recife"
                      fetcher={fetchCidades}
                      value={cidadeTexto}
                      onSelecionar={setCidadeSel}
                      onTextoChange={setCidadeTexto}
                      obrigatorio
                    />

                    <EnderecoCombobox
                      label="Bairro"
                      placeholder="ex: Boa Viagem"
                      fetcher={fetchBairros}
                      value={bairroTexto}
                      onSelecionar={setBairroSel}
                      onTextoChange={setBairroTexto}
                    />
                  </div>

                  {/* 3. Logradouro / Rua */}
                  <EnderecoCombobox
                    label="Logradouro / Rua"
                    placeholder="ex: Avenida Boa Viagem"
                    fetcher={fetchLogradouros}
                    value={lograTexto}
                    onSelecionar={setLograSel}
                    onTextoChange={setLograTexto}
                  />

                  {/* 4. Número e Complemento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Complemento
                      </label>
                      <input
                        type="text"
                        placeholder="Sala 101"
                        maxLength={30}
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 5. Geolocalização (GPS) - POSICIONADO NO FIM */}
                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-600" />
                        <h4 className="text-xs font-bold text-gray-900">Geolocalização (GPS) do Endereço Principal</h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleBuscarGpsMain}
                        disabled={isGeocodificandoMain}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors shadow-sm"
                        title="Buscar Latitude e Longitude automaticamente com base na Rua, Cidade ou CEP preenchidos"
                      >
                        {isGeocodificandoMain ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                        ) : (
                          <Compass className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        Obter Coordenadas GPS pelo Endereço
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FormLabel
                          label="Latitude"
                          tooltip="LATITUDE — Coordenada geográfica de Latitude do parceiro"
                        />
                        <input
                          type="text"
                          placeholder="ex: -8.047562"
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <FormLabel
                          label="Longitude"
                          tooltip="LONGITUDE — Coordenada geográfica de Longitude do parceiro"
                        />
                        <input
                          type="text"
                          placeholder="ex: -34.876964"
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-divisão 2: Endereço de Entrega */}
              {subTabEndereco === 'entrega' && (
                <div className="space-y-4 pt-1">
                  {/* Endereço de Entrega Detalhado */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-gray-900">Dados do Endereço de Entrega</h4>
                      </div>
                      {!modoVisualizacao && (
                        <button
                          type="button"
                          onClick={() => {
                            setCidadeEntregaSel(cidadeSel);
                            setCidadeEntregaTexto(cidadeTexto);
                            setBairroEntregaSel(bairroSel);
                            setBairroEntregaTexto(bairroTexto);
                            setLograEntregaSel(lograSel);
                            setLograEntregaTexto(lograTexto);
                            setNumeroEntrega(numero);
                            setComplementoEntrega(complemento);
                            setCepEntrega(cep);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                          title="Copiar os dados preenchidos no Endereço Principal"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar do Endereço Principal
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {/* 1. CEP p/ Entrega (PRIMEIRO CAMPO) */}
                      <div>
                        <FormLabel
                          label="CEP p/ entrega"
                          tooltip="CEPENTREGA — Busca automática de endereço na API ViaCEP / BrasilAPI"
                        />
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="00000-000"
                            value={cepEntrega}
                            onChange={handleCepEntregaChange}
                            className="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => executarBuscaCepEntrega(cepEntrega)}
                            disabled={isBuscandoCepEntrega || cepEntrega.replace(/\D/g, '').length !== 8}
                            title="Buscar endereço pelo CEP p/ entrega via API"
                            className="absolute right-1 top-1 bottom-1 px-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                          >
                            {isBuscandoCepEntrega ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Search className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 2. Cidade e Bairro */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <EnderecoCombobox
                          label="Cód. Cidade Entrega (TSICID)"
                          tooltip="CODCID — Pesquisa cidade por código ou nome para o endereço de entrega"
                          placeholder="Digite o código ou nome da cidade..."
                          fetcher={fetchCidades}
                          value={cidadeEntregaTexto}
                          onSelecionar={setCidadeEntregaSel}
                          onTextoChange={setCidadeEntregaTexto}
                        />

                        <EnderecoCombobox
                          label="Bairro p/ Entrega (TSIBAI)"
                          tooltip="CODBAI — Pesquisa bairro por código ou nome para o endereço de entrega"
                          placeholder="Digite o código ou nome do bairro..."
                          fetcher={fetchBairros}
                          value={bairroEntregaTexto}
                          onSelecionar={setBairroEntregaSel}
                          onTextoChange={setBairroEntregaTexto}
                        />
                      </div>

                      {/* 3. Logradouro / Rua */}
                      <EnderecoCombobox
                        label="Endereço p/ Entrega (TSIEND)"
                        tooltip="CODEND — Pesquisa logradouro/rua por código ou nome para o endereço de entrega"
                        placeholder="Digite a rua, avenida ou código do endereço..."
                        fetcher={fetchLogradouros}
                        value={lograEntregaTexto}
                        onSelecionar={setLograEntregaSel}
                        onTextoChange={setLograEntregaTexto}
                      />

                      {/* 4. Número e Complemento */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Número entrega
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            value={numeroEntrega}
                            onChange={(e) => setNumeroEntrega(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Complemento entrega
                          </label>
                          <input
                            type="text"
                            placeholder="Galpão B, Docas 3"
                            maxLength={30}
                            value={complementoEntrega}
                            onChange={(e) => setComplementoEntrega(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Geolocalização p/ Entrega (GPS) */}
                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-600" />
                        <h4 className="text-xs font-bold text-gray-900">Geolocalização p/ Entrega (GPS)</h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleBuscarGpsEntrega}
                        disabled={isGeocodificandoEntrega}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors shadow-sm"
                        title="Buscar Latitude e Longitude de Entrega automaticamente com base no Endereço de Entrega"
                      >
                        {isGeocodificandoEntrega ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                        ) : (
                          <Compass className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        Obter Coordenadas GPS pelo Endereço
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FormLabel
                          label="Latitude p/ Entrega (LATITUDEENTREGA)"
                          tooltip="LATITUDEENTREGA — Coordenada geográfica de Latitude do ponto de entrega"
                        />
                        <input
                          type="text"
                          placeholder="ex: -8.047562"
                          value={latitudeEntrega}
                          onChange={(e) => setLatitudeEntrega(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <FormLabel
                          label="Longitude p/ Entrega (LONGITUDEENTREGA)"
                          tooltip="LONGITUDEENTREGA — Coordenada geográfica de Longitude do ponto de entrega"
                        />
                        <input
                          type="text"
                          placeholder="ex: -34.876964"
                          value={longitudeEntrega}
                          onChange={(e) => setLongitudeEntrega(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EMPRESAS / GRUPO ICMS (TGFPAEM) */}
          {tab === 'empresas' && (
            <div className="space-y-4">
              {!isEditing || !cliente?.codParc ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-center gap-3">
                  <Info className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Associação de Empresas (TGFPAEM)</strong>
                    <span>
                      A vinculação do parceiro com empresas do grupo e configurações de ICMS fica disponível após o salvamento inicial do cadastro do cliente.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-gray-900">
                        Empresas do Parceiro / Grupo ICMS (<span className="font-mono text-gray-500">TGFPAEM</span>)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCodEmp('');
                        setInputCodTab('');
                        setInputClassificIcms('');
                        setEditingEmpresa(false);
                        setShowAddEmpresa(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Associar Nova Empresa
                    </button>
                  </div>

                  {/* Form de Adicionar/Editar Inline */}
                  {showAddEmpresa && (
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                      <h5 className="text-xs font-bold text-blue-900 flex items-center justify-between">
                        <span>{editingEmpresa ? `Editar Associação — Empresa #${selectedCodEmp}` : 'Nova Associação de Empresa'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddEmpresa(false);
                            setEditingEmpresa(false);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <FormLabel label="Empresa (TSIEMP)" obrigatorio tooltip="CODEMP — Empresa do Grupo Sankhya" />
                          <select
                            disabled={editingEmpresa}
                            value={selectedCodEmp}
                            onChange={(e) => setSelectedCodEmp(e.target.value ? parseInt(e.target.value, 10) : '')}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Selecione uma empresa...</option>
                            {empresasDisponiveis.map((emp) => (
                              <option key={emp.codEmp} value={emp.codEmp}>
                                {emp.nomeEmp}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <FormLabel label="Tabela de Preço (VGFTAB)" tooltip="CODTAB — Selecione a tabela de preços de vendas (VGFTAB) cadastrada no Sankhya" />
                          <select
                            value={inputCodTab}
                            onChange={(e) => setInputCodTab(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">{isLoadingTabelasPreco ? 'Carregando tabelas de preço...' : 'Selecione uma tabela de preço...'}</option>
                            {inputCodTab !== '' && !tabelasPrecoDisponiveis.some(t => String(t.codTab) === String(inputCodTab)) && (
                              <option value={inputCodTab}>Tabela #{inputCodTab}</option>
                            )}
                            {tabelasPrecoDisponiveis.map((tabPreco) => (
                              <option key={tabPreco.codTab} value={String(tabPreco.codTab)}>
                                {tabPreco.nomeTab}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <FormLabel label="Classificação ICMS" tooltip="CLASSIFICMS — Ex: 1, Z, etc." />
                          <input
                            type="text"
                            placeholder="ex: 1 ou Z"
                            value={inputClassificIcms}
                            onChange={(e) => setInputClassificIcms(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddEmpresa(false);
                            setEditingEmpresa(false);
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={!selectedCodEmp || isSavingEmpresa}
                          onClick={async () => {
                            if (!selectedCodEmp || !cliente?.codParc) return;
                            setIsSavingEmpresa(true);
                            try {
                              await clienteApi.salvarEmpresaParceiro(cliente.codParc, {
                                codEmp: Number(selectedCodEmp),
                                codTab: inputCodTab.trim() ? parseInt(inputCodTab.trim(), 10) : undefined,
                                classificIcms: inputClassificIcms.trim() || undefined,
                              });
                              setSelectedCodEmp('');
                              setInputCodTab('');
                              setInputClassificIcms('');
                              setShowAddEmpresa(false);
                              setEditingEmpresa(false);
                              await refetchEmpresas();
                            } catch (err: any) {
                              setErrorMessage(err.message || 'Erro ao salvar associação da empresa');
                            } finally {
                              setIsSavingEmpresa(false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isSavingEmpresa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {editingEmpresa ? 'Atualizar Registro' : 'Salvar Associação'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabela de Empresas do Parceiro */}
                  {isLoadingEmpresas ? (
                    <div className="flex py-8 items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="text-xs text-gray-600">Carregando empresas associadas...</span>
                    </div>
                  ) : empresasParceiro.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
                      Nenhuma empresa associada a este parceiro na tabela <code className="font-mono text-gray-700">TGFPAEM</code>.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2.5">Cód. Emp</th>
                            <th className="px-3 py-2.5">Nome da Empresa</th>
                            <th className="px-3 py-2.5">Tabela de Preço</th>
                            <th className="px-3 py-2.5">Classificação ICMS</th>
                            <th className="px-3 py-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                          {empresasParceiro.map((emp) => (
                            <tr key={emp.codEmp} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 font-mono font-bold text-blue-700">{emp.codEmp}</td>
                              <td className="px-3 py-2">{emp.nomeEmp || `Empresa #${emp.codEmp}`}</td>
                              <td className="px-3 py-2">{emp.nomeTab || (emp.codTab != null ? `Tabela #${emp.codTab}` : <span className="text-gray-400 italic">-</span>)}</td>
                              <td className="px-3 py-2">{emp.classificIcms || <span className="text-gray-400 italic">-</span>}</td>
                              <td className="px-3 py-2 text-right flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCodEmp(emp.codEmp);
                                    setInputCodTab(emp.codTab != null ? String(emp.codTab) : '');
                                    setInputClassificIcms(emp.classificIcms || '');
                                    setEditingEmpresa(true);
                                    setShowAddEmpresa(true);
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="Editar campos desta empresa"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingCodEmp === emp.codEmp}
                                  onClick={async () => {
                                    if (!cliente?.codParc) return;
                                    if (confirm(`Remover a empresa #${emp.codEmp} (${emp.nomeEmp || ''}) do parceiro?`)) {
                                      setDeletingCodEmp(emp.codEmp);
                                      try {
                                        await clienteApi.removerEmpresaParceiro(cliente.codParc, emp.codEmp);
                                        await refetchEmpresas();
                                      } catch (err: any) {
                                        setErrorMessage(err.message || 'Erro ao remover empresa');
                                      } finally {
                                        setDeletingCodEmp(null);
                                      }
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Remover empresa (DatasetSP.removeRecord)"
                                >
                                  {deletingCodEmp === emp.codEmp ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FINANCEIRO & CRÉDITO */}
          {tab === 'financeiro' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel label="Limite de Crédito Mensal" tooltip="LIMCREDMENSAL — Limite mensal concedido ao cliente" />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="ex: 10.000,00"
                    value={limiteCreditoMensal}
                    onChange={handleLimiteCreditoMensalChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <FormLabel label="Qtd. Máx. Títulos Vencidos" tooltip="QTDMAXTITVENCIDOS — Quantidade máxima tolerada de títulos vencidos" />
                  <input
                    type="number"
                    min={0}
                    placeholder="ex: 3"
                    value={qtdMaxTitVencidos}
                    onChange={(e) => setQtdMaxTitVencidos(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel label="Tabela de Preço" tooltip="CODTAB — Código da tabela de preços vinculada" />
                  <input
                    type="text"
                    placeholder="ex: 1"
                    value={codTab}
                    onChange={(e) => setCodTab(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <FormLabel label="Vendedor Responsável" tooltip="CODVEND — Código do vendedor/representante vinculado" />
                  <input
                    type="number"
                    min={0}
                    placeholder="ex: 10"
                    value={codVend}
                    onChange={(e) => setCodVend(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  {cliente?.nomeVend && (
                    <p className="mt-1 text-[11px] font-medium text-blue-600 truncate">
                      Vendedor: {cliente.nomeVend}
                    </p>
                  )}
                </div>

                <EnderecoCombobox
                  label="Banco Preferencial"
                  placeholder="ex: 341 - Itaú / 001 - Banco do Brasil"
                  fetcher={fetchBancos}
                  value={bcoTexto}
                  onSelecionar={(b) => setCodBco(b ? String(b.codigo) : '')}
                  onTextoChange={setBcoTexto}
                  icon={false}
                  tooltip="CODBCO — Pesquisa dinâmica na tabela TSIBCO (Bancos do Sankhya)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Desconto Bonificado
                  </label>
                  <select
                    value={descBonif}
                    onChange={(e) => setDescBonif(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">— Selecione —</option>
                    <option value="L">Livre</option>
                    <option value="J">Na Nota/Pedido</option>
                    <option value="S">Em separado</option>
                    <option value="P">Proibido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Desconto Financeiro (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="ex: 2.50"
                    value={descFin}
                    onChange={(e) => setDescFin(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Perfil de Crédito (PERFILECONECT)
                  </label>
                  <select
                    value={perfilEconect}
                    onChange={(e) => setPerfilEconect(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione o perfil de crédito...</option>
                    <option value="B">B - Somente até o limite</option>
                    <option value="A">A - Pode ultrapassar limite</option>
                    <option value="C">C - Cliente sem limite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tipo de Faturamento (TIPOFATUR)
                  </label>
                  <select
                    value={tipoFatur}
                    onChange={(e) => setTipoFatur(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione o tipo de faturamento...</option>
                    <option value="L">L - Livre</option>
                    <option value="M">M - Mensal</option>
                    <option value="Q">Q - Quinzenal</option>
                    <option value="S">S - Semanal</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50/30 p-4 space-y-3">
                <p className="text-xs font-bold text-red-900">Regras de Bloqueio & Autorização</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <FormLabel label="Grupo Autorização (GRUPOAUTOR)" tooltip="GRUPOAUTOR — Código do grupo de autorização" />
                    <input
                      type="number"
                      min={0}
                      placeholder="ex: 1"
                      value={grupoAutor}
                      onChange={(e) => setGrupoAutor(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <FormLabel label="Bloquear Parceiro (BLOQUEAR)" tooltip="BLOQUEAR — Bloqueio do parceiro no Sankhya ('S' = Bloqueado, 'N' = Não)" />
                    <select
                      value={bloquear}
                      onChange={(e) => setBloquear(e.target.value as 'S' | 'N' | '')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Não Bloqueado (N)</option>
                      <option value="S">Sim (S) - Bloqueado</option>
                      <option value="N">Não (N) - Liberado</option>
                    </select>
                  </div>
                  <div>
                    <FormLabel label="Motivo do Bloqueio (MOTBLOQ)" tooltip="MOTBLOQ — Descrição do motivo do bloqueio do parceiro" />
                    <input
                      type="text"
                      placeholder="ex: Pendência de documentos"
                      value={motBloq}
                      onChange={(e) => setMotBloq(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FISCAL & TRIBUTÁRIO */}
          {tab === 'fiscal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Inscrição Municipal (INSCMUN)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 123456-7"
                    value={inscricaoMunicipal}
                    onChange={(e) => setInscricaoMunicipal(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Classificação ICMS (CLASSIFCMS)
                  </label>
                  <select
                    value={classificacaoIcms}
                    onChange={(e) => setClassificacaoIcms(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione a classificação ICMS...</option>
                    <option value="C">C - Consumidor Final Não Contribuinte</option>
                    <option value="I">I - Isento de ICMS</option>
                    <option value="P">P - Produtor Rural</option>
                    <option value="R">R - Revendedor</option>
                    <option value="T">T - Usar a da TOP</option>
                    <option value="X">X - Consumidor Final Contribuinte</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Optante Simples Nacional (SIMPLES)
                  </label>
                  <select
                    value={simples}
                    onChange={(e) => setSimples(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Não Inf.</option>
                    <option value="S">Sim (S)</option>
                    <option value="N">Não (N)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Regime Esp. Tributação ISS
                  </label>
                  <select
                    value={regimeEspTribIss}
                    onChange={(e) => setRegimeEspTribIss(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione o regime...</option>
                    <option value="0">0 - Nenhum</option>
                    <option value="1">1 - Ato Cooperado (Cooperativa)</option>
                    <option value="2">2 - Estimativa</option>
                    <option value="3">3 - Microempresa Municipal</option>
                    <option value="4">4 - Notário ou Registrador</option>
                    <option value="5">5 - Profissional Autônomo</option>
                    <option value="6">6 - Sociedade de Profissionais</option>
                    <option value="9">9 - Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tipo Cliente Serv. Comunicação
                  </label>
                  <select
                    value={tipoClienteServCom}
                    onChange={(e) => setTipoClienteServCom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione a classificação...</option>
                    <option value="1">01 - Comercial</option>
                    <option value="2">02 - Industrial</option>
                    <option value="3">03 - Residencial / Pessoa Física</option>
                    <option value="4">04 - Produtor Rural</option>
                    <option value="5">05 - Órgão Adm. Pública (Conv. 107/95)</option>
                    <option value="8">08 - Igrejas e Templos</option>
                    <option value="99">99 - Outros não especificados</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-blue-50/30 p-4 space-y-3">
                <p className="text-xs font-bold text-blue-900">Configurações de Envio da NF-e / DANFE</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <FormLabel label="Tipo Anexo NF-e (TIPANEXONFE)" tooltip="TIPANEXONFE — Tipo de anexo para o e-mail da NF-e (ex: XML, PDF, etc.)" />
                    <input
                      type="text"
                      placeholder="ex: XML+PDF"
                      value={tipAnexoNfe}
                      onChange={(e) => setTipAnexoNfe(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <FormLabel label="E-mail DANFE (EMAILDANFE)" tooltip="EMAILDANFE — Endereço de e-mail para envio exclusivo da DANFE" />
                    <input
                      type="email"
                      placeholder="danfe@empresa.com.br"
                      value={emailDanfe}
                      onChange={(e) => setEmailDanfe(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <FormLabel label="E-mail NF-e (EMAILNFE)" tooltip="EMAILNFE — Endereço de e-mail para envio da NF-e (XML)" />
                    <input
                      type="email"
                      placeholder="nfe@empresa.com.br"
                      value={emailNfe}
                      onChange={(e) => setEmailNfe(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <p className="text-xs font-bold text-gray-800 mb-3">Retenção de Impostos na Fonte</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Retém ISS</label>
                    <select
                      value={retemIss}
                      onChange={(e) => setRetemIss(e.target.value as any)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Não Inf.</option>
                      <option value="S">Sim (S)</option>
                      <option value="N">Não (N)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Retém INSS</label>
                    <select
                      value={retemInss}
                      onChange={(e) => setRetemInss(e.target.value as any)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Não Inf.</option>
                      <option value="S">Sim (S)</option>
                      <option value="N">Não (N)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Retém PIS</label>
                    <select
                      value={retemPis}
                      onChange={(e) => setRetemPis(e.target.value as any)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Não Inf.</option>
                      <option value="S">Sim (S)</option>
                      <option value="N">Não (N)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Retém COFINS</label>
                    <select
                      value={retemCofins}
                      onChange={(e) => setRetemCofins(e.target.value as any)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Não Inf.</option>
                      <option value="S">Sim (S)</option>
                      <option value="N">Não (N)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Retém CSLL</label>
                    <select
                      value={retemCsl}
                      onChange={(e) => setRetemCsl(e.target.value as any)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Não Inf.</option>
                      <option value="S">Sim (S)</option>
                      <option value="N">Não (N)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CAMPOS CUSTOMIZADOS DA EMPRESA (AD_*) */}
          {tab === 'customizados' && (
            <div className="space-y-4">
              <p className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                Estes campos foram customizados no dicionário Sankhya da empresa (`TGFPAR.AD_*`).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel label="Crédito Cliente (AD_CREDCLI)" tooltip="AD_CREDCLI — Campo customizado da empresa" />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="ex: 1.500,00"
                    value={adCredCli}
                    onChange={handleAdCredCliChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <FormLabel label="Limite Parceiro (AD_LIMITEPAR)" tooltip="AD_LIMITEPAR — Campo customizado da empresa" />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="ex: 20.000,00"
                    value={adLimitePar}
                    onChange={handleAdLimiteParChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <FormLabel label="Local de Cadastro (AD_LOCALCAD)" tooltip="AD_LOCALCAD — Campo customizado da empresa" />
                  <input
                    type="text"
                    placeholder="ex: Loja Matriz / Site"
                    value={adLocalCad}
                    onChange={(e) => setAdLocalCad(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ANEXOS & DOCUMENTOS (TSIANX) */}
          {tab === 'anexos' && (
            <div className="space-y-5">
              {!isEditing ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Para anexar documentos, salve o parceiro primeiro para gerar o código do cliente.</span>
                </div>
              ) : (
                <>
                  {/* Card Principal de Importação de Anexo da Máquina */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-blue-950 flex items-center gap-2">
                          <UploadCloud className="h-4 w-4 text-blue-600" />
                          Importar Novo Documento / Anexo do Computador
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Selecione ou arraste um arquivo da sua máquina para registrar como anexo do cliente #{cliente?.codParc} no Sankhya.
                        </p>
                      </div>
                    </div>

                    {/* Input HTML Escondido */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    {/* Zona Drag & Drop e Botão Destacado de Seleção de Arquivo */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-blue-600 bg-blue-100/70 scale-[0.99] shadow-inner'
                          : arquivoObj
                          ? 'border-emerald-400 bg-emerald-50/70'
                          : 'border-blue-300 bg-white hover:bg-blue-50/50 hover:border-blue-500 shadow-sm'
                      }`}
                    >
                      {arquivoObj ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileCheck2 className="h-8 w-8 text-emerald-600 shrink-0 animate-bounce" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-emerald-950">{arquivoObj.name}</p>
                            <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                              {(arquivoObj.size / 1024).toFixed(1)} KB — Clique para escolher outro arquivo da sua máquina
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setArquivoObj(null);
                              setNomeArquivoAnexo('');
                            }}
                            className="ml-4 rounded-md p-1 text-emerald-700 hover:bg-emerald-200 transition-colors"
                            title="Remover arquivo selecionado"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <UploadCloud className={`mx-auto h-10 w-10 transition-transform ${isDragging ? 'scale-110 text-blue-600' : 'text-blue-500'}`} />
                          <div>
                            <p className="text-xs font-bold text-gray-800">
                              Arraste e solte o arquivo aqui
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              PDF, Imagens (PNG/JPG), Word (DOCX), Excel (XLSX)
                            </p>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              <FileUp className="h-4 w-4" />
                              📁 Selecionar Arquivo do Computador
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Nome do Arquivo no Sankhya <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ex: Contrato_Social.pdf ou Cartao_CNPJ.pdf"
                          value={nomeArquivoAnexo}
                          onChange={(e) => setNomeArquivoAnexo(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Descrição / Categoria do Anexo
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={descAnexo}
                            onChange={(e) => setDescAnexo(e.target.value)}
                            className="rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700 bg-white focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">Categorias sugeridas...</option>
                            <option value="Contrato Social / Estatuto">Contrato Social / Estatuto</option>
                            <option value="Cartão CNPJ">Cartão CNPJ</option>
                            <option value="Comprovante de Inscrição Estadual (Sintegra)">Comprovante IE (Sintegra)</option>
                            <option value="Comprovante de Endereço">Comprovante de Endereço</option>
                            <option value="Documentos dos Sócios">Documentos dos Sócios</option>
                            <option value="Ficha Cadastral">Ficha Cadastral</option>
                            <option value="Outros Documentos">Outros Documentos</option>
                          </select>
                          <input
                            type="text"
                            placeholder="ou digite a descrição..."
                            value={descAnexo}
                            onChange={(e) => setDescAnexo(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSalvarAnexo}
                        disabled={isSavingAnexo || !nomeArquivoAnexo.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {isSavingAnexo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileUp className="h-4 w-4" />
                        )}
                        Importar e Salvar Anexo no Sankhya
                      </button>
                    </div>
                  </div>

                  {/* Cabeçalho da Lista de Anexos Existentes */}
                  <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                      Documentos Anexados ao Cliente #{cliente?.codParc}
                      {anexosParceiro.length > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          {anexosParceiro.length}
                        </span>
                      )}
                    </h4>
                  </div>

                  {/* Tabela de Anexos Registrados */}
                  {isLoadingAnexos ? (
                    <div className="flex h-32 items-center justify-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      Carregando anexos do Sankhya...
                    </div>
                  ) : anexosParceiro.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                      <Paperclip className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs font-bold text-gray-700">Nenhum documento anexado ainda</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Clique em "Novo Anexo / Documento" acima para salvar arquivos cadastrais deste parceiro no Sankhya.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-[11px]">
                          <tr>
                            <th className="px-4 py-2.5">Código / ID</th>
                            <th className="px-4 py-2.5">Nome do Arquivo</th>
                            <th className="px-4 py-2.5">Descrição</th>
                            <th className="px-4 py-2.5">Data de Cadastro</th>
                            <th className="px-4 py-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-gray-800">
                          {anexosParceiro.map((anx) => (
                            <tr
                              key={anx.nuAttach}
                              onDoubleClick={() => handleAbrirAnexoModal(anx)}
                              title="Clique duplo para visualizar ou baixar este anexo"
                              className="hover:bg-blue-50/60 cursor-pointer select-none transition-colors"
                            >
                              <td className="px-4 py-2.5 font-mono text-gray-500">
                                #{anx.nuAttach}
                              </td>
                              <td className="px-4 py-2.5 font-semibold text-gray-900 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                                <span>{anx.nomeArquivo}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                {anx.descricao ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                                    {anx.descricao}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-italic text-[11px]">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 font-mono text-[11px]">
                                {anx.dataCadastro || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAbrirAnexoModal(anx);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors mr-1"
                                  title="Visualizar ou baixar anexo"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Visualizar
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoverAnexo(anx);
                                  }}
                                  disabled={deletingNuAttach === anx.nuAttach}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                  title="Remover anexo do Sankhya"
                                >
                                  {deletingNuAttach === anx.nuAttach ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        {/* Modal de Visualização de Anexo (Clique Duplo) */}
        {selectedAnexoView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl space-y-4 border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  Detalhes do Anexo #{selectedAnexoView.nuAttach}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedAnexoView(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-lg bg-blue-50/60 p-4 border border-blue-100 space-y-2">
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-xs font-bold text-blue-950 truncate" title={selectedAnexoView.nomeArquivo}>
                      {selectedAnexoView.nomeArquivo}
                    </p>
                    <p className="text-[11px] text-gray-600 font-medium">
                      Categoria: <span className="font-bold text-gray-800">{selectedAnexoView.descricao || 'Outros Documentos'}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      Data de Cadastro: {selectedAnexoView.dataCadastro || '—'}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono truncate">
                      Parceiro: #{cliente?.codParc} — {cliente?.razaoSocial || cliente?.nomeParc}
                    </p>
                  </div>
                </div>
              </div>

              {anexoDownloadError && (
                <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Aviso de Download / Restrição</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                    {anexoDownloadError}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleBaixarAnexo(selectedAnexoView)}
                  disabled={baixandoNuAttach === selectedAnexoView.nuAttach}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {baixandoNuAttach === selectedAnexoView.nuAttach ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {baixandoNuAttach === selectedAnexoView.nuAttach ? 'Baixando...' : 'Baixar / Visualizar Documento'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopiarNomeArquivo(selectedAnexoView)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedText === selectedAnexoView.nomeArquivo ? 'Copiado!' : 'Copiar Nome'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAnexoView(null)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
                </>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              {isEditing && isDirty && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Modificações pendentes de salvamento
                </span>
              )}
              {isEditing && !isDirty && modoVisualizacao && (
                <span className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-blue-600" /> Dados em modo de leitura
                </span>
              )}
              {isEditing && !isDirty && !modoVisualizacao && (
                <span className="text-[11px] font-medium text-gray-400">
                  Nenhuma modificação realizada. Altere um campo para salvar.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || (isEditing && !isDirty)}
                title={isEditing && !isDirty ? 'Modifique algum campo para habilitar a opção de salvar' : 'Salvar dados do cliente'}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  isEditing && !isDirty
                    ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed opacity-70'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isEditing ? 'Salvar Edição' : 'Cadastrar Cliente'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
