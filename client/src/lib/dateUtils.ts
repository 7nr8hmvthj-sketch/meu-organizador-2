/**
 * Utilitários de data compartilhados entre páginas.
 * Usa hora LOCAL do navegador para extrair YYYY-MM-DD,
 * garantindo que o dia exibido corresponda ao dia percebido pelo usuário.
 */

export function normalizeDateKey(dateInput: string | Date): string {
  if (!dateInput) return "";

  // String: extrai parte antes do 'T' (já é YYYY-MM-DD)
  if (typeof dateInput === "string") {
    return dateInput.split("T")[0];
  }

  // Date object: usa hora LOCAL (não UTC) para evitar troca de dia em UTC-3
  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, "0");
  const day = String(dateInput.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
