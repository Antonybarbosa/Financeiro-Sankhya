import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export function formatCurrencyInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    if (isNaN(value)) return '';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseCurrencyInput(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`
  }
  return formatCurrency(value)
}

export function parseSankhyaDate(dateStr: string | Date | null): Date | null {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr
  const str = String(dateStr).trim()
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (m) {
    return new Date(
      parseInt(m[3]),
      parseInt(m[2]) - 1,
      parseInt(m[1]),
      parseInt(m[4] || '0'),
      parseInt(m[5] || '0'),
      parseInt(m[6] || '0'),
    )
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function formatSankhyaDate(dateStr: string | Date | null): string {
  const date = parseSankhyaDate(dateStr)
  if (!date) return '--/--/----'
  return date.toLocaleDateString('pt-BR')
}

export function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return '--/--/----'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '--/--/----'
  return date.toLocaleDateString('pt-BR')
}

export function formatDateTime(dateStr: string | Date | null): string {
  if (!dateStr) return '--/--/---- --:--'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '--/--/---- --:--'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(dateStr: string | Date | null): string {
  if (!dateStr) return '--:--'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function formatCnpjCpf(value: string | null): string {
  if (!value) return ''
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`
  }
  return value
}

export function formatCep(value: string | null): string {
  if (!value) return ''
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length === 8) return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
  return value
}

export function formatWhatsAppLink(phone: string | null, text?: string): string {
  if (!phone) return '#';
  const cleaned = phone.replace(/\D/g, '');
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/55${cleaned}${encodedText}`;
}

export function formatTelLink(phone: string | null): string {
  if (!phone) return '#'
  const cleaned = phone.replace(/\D/g, '')
  return `tel:+55${cleaned}`
}

export function formatMailtoLink(email: string | null, subject?: string): string {
  if (!email) return '#'
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
}

export function diasAtrasoLabel(dias: number): { label: string; color: string } {
  if (dias <= 0) return { label: 'Em dia', color: 'text-green-600' }
  if (dias <= 7) return { label: `${dias}d atraso`, color: 'text-amber-600' }
  if (dias <= 30) return { label: `${dias}d atraso`, color: 'text-orange-600' }
  if (dias <= 90) return { label: `${dias}d atraso`, color: 'text-red-600' }
  return { label: `${dias}d atraso`, color: 'text-red-800' }
}

export function prioridadeLabel(prioridade: number): { label: string; variant: string } {
  if (prioridade >= 10000) return { label: 'CRÍTICO', variant: 'danger' }
  if (prioridade >= 5000) return { label: 'ALTA', variant: 'warning' }
  if (prioridade >= 1000) return { label: 'MÉDIA', variant: 'info' }
  return { label: 'BAIXA', variant: 'default' }
}
