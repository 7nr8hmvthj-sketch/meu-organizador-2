// Dicionário de horários de plantões padrão
export const SHIFT_HOURS: Record<string, string> = {
  "hc manhã": "7-13",
  "hc tarde": "13-19",
  "corredor tarde": "13-19",
  "corredor manhã": "7-13",
  "zona norte manhã": "7-13",
  "zona norte tarde": "13-19",
  "zona norte (manhã)": "7-13",
  "zona norte (tarde)": "13-19",
  "noturno": "19-7",
  "noturno (19-07)": "19-7",
  "apoio": "19-01",
  "apoio (19-01)": "19-01",
};

// Define a cor de fundo e borda do evento baseado no seu tipo ou status
export function getEventColor(type: string | undefined | null, isPassed: boolean): string {
  if (isPassed) return "text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-gray-200";
  const typeLower = (type || "").toLowerCase();
  
  if (typeLower.includes("natação") || typeLower.includes("natacao")) return "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200";
  if (typeLower.includes("musculação") || typeLower.includes("musculacao")) return "text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 border-green-200";
  if (typeLower.includes("pilates")) return "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200";
  if (typeLower.includes("enfermaria")) return "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border-red-200";
  if (typeLower.includes("hc")) return "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border-red-200";
  if (typeLower.includes("porta")) return "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200";
  if (typeLower.includes("sala")) return "text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200";
  if (typeLower.includes("zn")) return "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200";
  if (typeLower.includes("apoio")) return "text-pink-700 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200";
  if (typeLower.includes("noturno")) return "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200";
  if (typeLower.includes("observação") || typeLower.includes("observacao")) return "text-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200";
  if (typeLower.includes("home care")) return "text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200";
  if (typeLower.includes("lembrete")) return "text-gray-700 bg-gray-100 dark:bg-gray-800/30 dark:text-gray-300 border-gray-300";
  
  return "text-slate-700 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200";
}

// Constrói o título resumido do evento para exibição nos calendários
export function getEventLabel(event: { type?: string; description?: string | null }): string {
  const type = event.type || "";
  const desc = event.description || "";
  
  // Se o tipo contém intervalo de horário (ex: 7-13, 13-19, 19-01), retorna o tipo completo
  if (/\d{1,2}-\d{1,2}/.test(type)) {
    return type;
  }
  
  const typeLower = type.toLowerCase();
  
  const timeMatchColon = desc.match(/(\d{1,2}:\d{2})/) || type.match(/(\d{1,2}:\d{2})/);
  const timeMatchHyphen = type.match(/(\d{1,2}-\d{1,2})/);
  let timeStr = timeMatchColon ? timeMatchColon[0] : (timeMatchHyphen ? timeMatchHyphen[0] : "");

  let label = type;
  if (typeLower.includes("natação") || typeLower.includes("natacao")) label = "Natação";
  else if (typeLower.includes("musculação") || typeLower.includes("musculacao")) label = "Musculação";
  else if (typeLower.includes("pilates")) label = "Pilates";
  else if (typeLower.includes("hc")) label = "HC";
  else if (typeLower.includes("zn") || typeLower.includes("zona norte")) label = "ZN";
  else if (typeLower.includes("noturno")) label = "Noturno";
  else if (typeLower.includes("apoio")) label = "Apoio";
  else if (typeLower.includes("corredor")) label = "Corredor";
  
  // Tenta extrair do dicionário caso não tenha achado nenhum tempo direto na string
  if (!timeStr) {
    const mappedTime = SHIFT_HOURS[typeLower];
    if (mappedTime) timeStr = mappedTime;
  }
  
  if (timeStr && !label.includes(timeStr)) {
    return `${label} ${timeStr}`;
  }
  
  if (!timeStr && desc.length < 20 && desc.length > 0 && desc !== type) {
    return desc;
  }
  
  return label;
}

// Extrai especificamente um formato de hora exata de uma descrição
export function extractTimeFromDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  const match = desc.match(/(\d{1,2}):(\d{2})/);
  return match ? match[0] : "";
}
