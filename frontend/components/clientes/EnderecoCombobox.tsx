'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2, MapPin, Info } from 'lucide-react';
import { useDebounce } from '@/hooks/useCliente';

export interface OpcaoEndereco {
  codigo: number;
  nome: string;
  extra?: string;
}

interface EnderecoComboboxProps {
  label: string;
  placeholder: string;
  fetcher: (query: string) => Promise<OpcaoEndereco[]>;
  value: string;
  onSelecionar: (opcao: OpcaoEndereco | null) => void;
  onTextoChange: (texto: string) => void;
  obrigatorio?: boolean;
  icon?: boolean;
  tooltip?: string;
}

export function EnderecoCombobox({
  label,
  placeholder,
  fetcher,
  value,
  onSelecionar,
  onTextoChange,
  obrigatorio = false,
  icon = true,
  tooltip,
}: EnderecoComboboxProps) {
  const [aberto, setAberto] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcaoEndereco[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [destacado, setDestacado] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(value, 400);

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;
    if (debounced.trim().length < 2) {
      setOpcoes([]);
      return;
    }
    setCarregando(true);
    fetcher(debounced)
      .then(res => {
        if (!cancelado) setOpcoes(res);
      })
      .catch(() => {
        if (!cancelado) setOpcoes([]);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [debounced, aberto, fetcher]);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const selecionar = (opcao: OpcaoEndereco) => {
    onSelecionar(opcao);
    onTextoChange(opcao.extra ? `${opcao.nome} (${opcao.extra})` : opcao.nome);
    setAberto(false);
    setDestacado(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!aberto && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      if (value.trim().length >= 2) setAberto(true);
      return;
    }
    if (!aberto) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDestacado(d => Math.min(d + 1, opcoes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestacado(d => Math.max(d - 1, 0));
    } else if (e.key === 'Enter') {
      if (destacado >= 0 && opcoes[destacado]) {
        e.preventDefault();
        selecionar(opcoes[destacado]);
      }
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
        <span>
          {label} {obrigatorio && <span className="text-red-500">*</span>}
        </span>
        {tooltip && (
          <span title={tooltip} className="cursor-help text-gray-400 hover:text-blue-600 transition-colors">
            <Info className="h-3.5 w-3.5 inline" />
          </span>
        )}
      </label>
      <div className="relative">
        {icon && <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10" />}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => {
            onTextoChange(e.target.value);
            onSelecionar(null);
            setAberto(true);
          }}
          onFocus={() => {
            if (value.trim().length >= 2) setAberto(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-lg border px-3 ${icon ? 'pl-9' : ''} ${obrigatorio ? 'pr-8' : 'pr-3'} py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none`}
        />
        {carregando && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
        )}
        {!carregando && obrigatorio && (
          <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        )}
      </div>

      {aberto && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {carregando && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando...
            </div>
          )}
          {!carregando && opcoes.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-gray-400">
              {value.trim().length < 2
                ? 'Digite pelo menos 2 caracteres'
                : 'Nenhum resultado — campo será ignorado no salvamento'}
            </div>
          )}
          {!carregando &&
            opcoes.map((opcao, i) => (
              <button
                key={`${opcao.codigo}-${opcao.nome}`}
                type="button"
                onClick={() => selecionar(opcao)}
                onMouseEnter={() => setDestacado(i)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  i === destacado ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{opcao.nome}</span>
                {opcao.extra && (
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                    {opcao.extra}
                  </span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
