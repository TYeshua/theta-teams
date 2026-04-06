/**
 * Formata uma data ISO para distância relativa (pt-BR).
 * Exemplo: "em 3 dias", "há 2 horas"
 */
export function formatDistanceToNow(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  const diffHours = Math.round(diffMs / 3_600_000);

  if (diffDays < -1) return `${Math.abs(diffDays)}d atrasado`;
  if (diffDays === -1 || diffHours < 0) return 'ontem';
  if (diffHours < 1) return 'agora';
  if (diffHours < 24) return `em ${diffHours}h`;
  if (diffDays === 1) return 'amanhã';
  if (diffDays < 7) return `em ${diffDays}d`;
  if (diffDays < 30) return `em ${Math.round(diffDays / 7)}sem`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
