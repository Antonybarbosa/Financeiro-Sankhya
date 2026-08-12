'use client';

import { useState } from 'react';
import { useCriarContato } from '@/hooks/useCobranca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { TipoContato } from '@/types/cobranca';
import { formatWhatsAppLink, formatTelLink } from '@/lib/utils';
import { Phone, MessageCircle, Mail, FileText, Smartphone } from 'lucide-react';

interface ContatoFormProps {
  parceiroId: number;
  parceiroNome: string;
  telefone: string | null;
  email: string | null;
  nuFin?: number;
  onSaved?: () => void;
  compact?: boolean;
}

const tipoOptions: { value: TipoContato; label: string; icon: typeof Phone }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
  { value: 'TELEFONE', label: 'Telefone', icon: Phone },
  { value: 'EMAIL', label: 'E-mail', icon: Mail },
  { value: 'SMS', label: 'SMS', icon: Smartphone },
  { value: 'BOLETO', label: 'Boleto', icon: FileText },
];

export function ContatoForm({
  parceiroId,
  parceiroNome,
  telefone,
  email,
  nuFin,
  onSaved,
  compact,
}: ContatoFormProps) {
  const criarContato = useCriarContato();

  const [tipo, setTipo] = useState<TipoContato>('WHATSAPP');
  const [comentarios, setComentarios] = useState('');
  const [mensagem, setMensagem] = useState(
    `Prezado(a) ${parceiroNome}, entrando em contato sobre seu título em aberto. Por favor, regularize o pagamento.`
  );
  const [agendarProxima, setAgendarProxima] = useState(false);
  const [proximaChamada, setProximaChamada] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    criarContato.mutate(
      {
        parceiroId,
        tipo,
        comentarios: comentarios || undefined,
        mensagem: mensagem || undefined,
        proximaChamada: agendarProxima && proximaChamada ? new Date(proximaChamada).toISOString() : undefined,
        situacao: 'EM_ANDAMENTO',
        pendente: agendarProxima,
        nuFin,
      },
      {
        onSuccess: () => {
          setComentarios('');
          onSaved?.();
        },
      }
    );
  };

  const selectedTipo = tipoOptions.find((t) => t.value === tipo);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="mb-2 block">Canal de Contato</Label>
        <div className="flex flex-wrap gap-2">
          {tipoOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = tipo === opt.value;
            const disabled =
              (opt.value === 'WHATSAPP' || opt.value === 'TELEFONE' || opt.value === 'SMS') && !telefone;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => setTipo(opt.value)}
                className={`
                  inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all
                  ${isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                  ${disabled ? 'cursor-not-allowed opacity-40' : ''}
                `}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        {telefone && (
          <>
            {tipo === 'WHATSAPP' && (
              <a
                href={formatWhatsAppLink(telefone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Abrir WhatsApp
              </a>
            )}
            {tipo === 'TELEFONE' && (
              <a
                href={formatTelLink(telefone)}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Phone className="h-3.5 w-3.5" />
                Ligar
              </a>
            )}
          </>
        )}
        {email && tipo === 'EMAIL' && (
          <a
            href={`mailto:${email}?subject=${encodeURIComponent('Cobrança - Título em aberto')}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Mail className="h-3.5 w-3.5" />
            Abrir E-mail
          </a>
        )}
      </div>

      <div>
        <Label htmlFor="mensagem" className="mb-1 block text-xs">
          Mensagem enviada
        </Label>
        <Textarea
          id="mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={compact ? 2 : 3}
          placeholder="O que foi enviado ao cliente..."
          className="text-sm"
        />
      </div>

      <div>
        <Label htmlFor="comentarios" className="mb-1 block text-xs">
          Resultado / Observações
        </Label>
        <Textarea
          id="comentarios"
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          rows={compact ? 2 : 3}
          placeholder="Ex: Cliente informou que vai pagar amanhã / Não atendeu / Prometeu boleto..."
          className="text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="agendar"
          checked={agendarProxima}
          onChange={(e) => setAgendarProxima(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <Label htmlFor="agendar" className="cursor-pointer text-xs">
          Agendar próximo contato
        </Label>
      </div>

      {agendarProxima && (
        <div>
          <Label htmlFor="proxima" className="mb-1 block text-xs">
            Data e hora do próximo contato
          </Label>
          <Input
            id="proxima"
            type="datetime-local"
            value={proximaChamada}
            onChange={(e) => setProximaChamada(e.target.value)}
            className="text-sm"
          />
        </div>
      )}

      <Button
        type="submit"
        disabled={criarContato.isPending}
        className="w-full"
        size="sm"
      >
        {criarContato.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Registrar {selectedTipo?.label}
          </>
        )}
      </Button>
    </form>
  );
}
