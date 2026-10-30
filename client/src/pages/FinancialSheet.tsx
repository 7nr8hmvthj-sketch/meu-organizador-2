/*
PASSO A PASSO — FAÇA NA ORDEM

Este é um NOVO arquivo. Não cole este código em App.tsx.

1. Abra https://github.com/7nr8hmvthj-sketch/meu-organizador-2
2. Confira a branch main. Entre em client > src > pages.
3. Clique em Add file > Create new file.
4. No nome do arquivo, escreva FinancialSheet.tsx (respeite as maiúsculas).
5. Cole TODO este código, inclusive estes comentários.
6. Commit changes > mensagem: Adiciona painel financeiro mensal.
7. Depois abra client/src/App.tsx e clique no lápis.
8. Junto dos imports, acrescente esta linha:
   import FinancialSheet from "./pages/FinancialSheet";
9. Localize a linha:
   <Route path="/planilha-financeira" component={FinancialSheetConnection} />
   Substitua SOMENTE essa linha por:
   <Route path="/planilha-financeira" component={FinancialSheet} />
10. Não apague a função FinancialSheetConnection nesta etapa. Ela pode ficar
    no arquivo sem ser usada. Não altere a rota /financeiro nem os menus.
11. Commit changes > mensagem: Conecta aba ao painel financeiro completo.
12. Aguarde o deploy do SEGUNDO commit ficar Live. Atualize seu site.
13. Abra Planilha financeira. Novembro será lido do banco; não importe de novo.
14. Faça um gasto esporádico PF de teste de R$ 1,00. Clique Salvar alterações.
15. Aguarde Salvo no servidor. Abra no outro dispositivo e confira o gasto.
16. Exclua o teste, salve e confira no primeiro dispositivo após atualizar.

IMPORTANTE
- O salvamento é MANUAL: clique Salvar alterações antes de sair ou trocar
  de dispositivo. Não considera um dado salvo antes da resposta do servidor.
- Se houver conflito, baixe/cop ie a cópia de segurança das edições, recarregue
  o servidor e reaplique apenas as mudanças necessárias. Não force a versão.
- Novo mês prepara um rascunho. Só passa a existir no banco após Salvar.
- Não há necessidade de outro SQL, nova variável ou novo serviço.
- Código preparado para a API financialMonths.list/save instalada nesta
  conversa. Não foi compilado ou executado aqui; um deploy bem-sucedido ainda
  deve ser seguido pelo teste real acima.
*/

import { useEffect, useRef, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type Item = {
  id: string;
  name: string;
  value: number;
  day?: string;
  end?: string;
  repeat?: boolean;
  variable?: boolean;
  note?: string;
  paid?: boolean;
  kind?: string;
  date?: string;
};
type Entry = Item & { date: string; category: string; paid: boolean };
type Payload = {
  pjStart: number | null;
  pfStart: number | null;
  reserve: number;
  pro: number;
  auto: boolean;
  transferred: number;
  charges: number;
  pfTax: number;
  incomes: Item[];
  pj: Item[];
  pf: Item[];
  giro: Item[];
  entries: Entry[];
};
type Month = { month: string; version: number; payload: Payload };
type Group = "incomes" | "pj" | "pf" | "giro";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (n: number | null) => n === null ? "Não informado" : currency.format(n);
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (items: number[]) => round(items.reduce((a, b) => a + b, 0));
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const validMonth = (key: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
const active = (item: Item, month: string) => !item.end || item.end >= month;
const inputClass = "rounded-md border bg-background p-2 text-sm max-w-full";
const buttonClass = "rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed";

function readMonth(raw: unknown): Month {
  if (!raw || typeof raw !== "object") throw new Error("Registro mensal inválido.");
  const row = raw as Record<string, unknown>;
  const p = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
  if (typeof row.month !== "string" || !validMonth(row.month) ||
      !Number.isSafeInteger(Number(row.version)) || Number(row.version) < 1 ||
      !p || typeof p !== "object" || Array.isArray(p)) {
    throw new Error("Formato do mês recebido não reconhecido.");
  }
  for (const key of ["incomes", "pj", "pf", "giro", "entries"]) {
    if (!Array.isArray(p[key]) || p[key].some((x: Item) =>
      !x || typeof x.id !== "string" || typeof x.name !== "string" ||
      typeof x.value !== "number" || !Number.isFinite(x.value) || x.value < 0)) {
      throw new Error("Lista financeira inválida: " + key);
    }
  }
  for (const key of ["pjStart", "pfStart", "reserve", "pro", "transferred", "charges", "pfTax"]) {
    if (p[key] === null && (key === "pjStart" || key === "pfStart")) continue;
    if (typeof p[key] !== "number" || !Number.isFinite(p[key])) {
      throw new Error("Valor financeiro inválido: " + key);
    }
  }
  if (typeof p.auto !== "boolean") throw new Error("Configuração mensal inválida.");
  return { month: row.month, version: Number(row.version), payload: copy(p as Payload) };
}

function calculate(p: Payload, month: string) {
  const inc = sum(p.incomes.map(x => x.value));
  const received = sum(p.incomes.filter(x => x.paid).map(x => x.value));
  const pj = sum(p.pj.filter(x => active(x, month)).map(x => x.value));
  const pf = sum(p.pf.filter(x => active(x, month)).map(x => x.value));
  const extra = (category: string, paidOnly = false) => sum(p.entries
    .filter(x => x.category === category && (!paidOnly || x.paid)).map(x => x.value));
  const giro = p.giro.map(g => {
    const entries = p.entries.filter(x => x.category === g.id);
    return { ...g, all: sum(entries.map(x => x.value)),
      paidValue: sum(entries.filter(x => x.paid).map(x => x.value)),
      pending: sum(entries.filter(x => !x.paid).map(x => x.value)) };
  });
  const budget = sum(giro.map(x => x.value));
  const over = sum(giro.map(x => Math.max(0, round(x.all - x.value))));
  const need = sum([pf, budget, over, extra("extraPF"), p.pfTax]);
  const suggested = Math.max(0, round(need - (p.pfStart ?? 0)));
  const planned = p.auto ? suggested : p.pro;
  const transfer = Math.max(planned, p.transferred);
  const delta = round(inc - pj - extra("extraPJ") - p.charges - transfer);
  const end = p.pjStart === null ? null : round(p.pjStart + delta);
  const free = end === null ? null : round(end - p.reserve);
  const pjPaid = sum(p.pj.filter(x => active(x, month) && x.paid).map(x => x.value));
  const pfPaid = sum(p.pf.filter(x => active(x, month) && x.paid).map(x => x.value));
  const pjNow = p.pjStart === null ? null : round(p.pjStart + received - pjPaid - extra("extraPJ", true) - p.transferred);
  const pfNow = p.pfStart === null ? null : round(p.pfStart + p.transferred - pfPaid - extra("extraPF", true) - sum(giro.map(x => x.paidValue)));
  return { inc, received, pj, pf, giro, budget, over, need, suggested, planned,
    transfer, delta, end, free, pjNow, pfNow, pjPaid, pfPaid };
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>{children}
  </section>;
}
function Amount({ value }: { value: number | null }) {
  return <span className={value !== null && value < 0 ? "text-red-600 font-semibold" : "font-semibold"}>{money(value)}</span>;
}
function NumberField({ label, value, onChange, signed = false, nullable = false, disabled = false }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  signed?: boolean; nullable?: boolean; disabled?: boolean;
}) {
  return <label className="block space-y-1 text-sm"><span>{label}</span>
    <input aria-label={label} type="number" step="0.01" min={signed ? undefined : 0}
      value={value ?? ""} disabled={disabled} className={inputClass + " w-full"}
      onChange={e => {
        if (e.target.value === "" && nullable) { onChange(null); return; }
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(round(signed ? n : Math.max(0, n)));
      }} />
  </label>;
}

export default function FinancialSheet() {
  const query = trpc.financialMonths.list.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: true,
  });
  const mutation = trpc.financialMonths.save.useMutation({ retry: false });
  const [rows, setRows] = useState<Month[]>([]);
  const [doc, setDoc] = useState<Month | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [backupText, setBackupText] = useState("");
  const [entryName, setEntryName] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [entryCategory, setEntryCategory] = useState("extraPF");
  const [entryValue, setEntryValue] = useState("");
  const [entryPaid, setEntryPaid] = useState(true);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  const selectedRef = useRef("");

  function markDirty() { dirtyRef.current = true; setDirty(true); setMessage(""); }
  function load(row: Month) {
    selectedRef.current = row.month;
    dirtyRef.current = false;
    setDirty(false); setDoc(copy(row));
    setEntryDate(row.month + "-01"); setEntryCategory("extraPF");
    setEntryName(""); setEntryValue(""); setBackupText("");
  }

  useEffect(() => {
    if (!query.data) return;
    try {
      const fresh = query.data.map(readMonth).sort((a, b) => b.month.localeCompare(a.month));
      setRows(fresh);
      if (dirtyRef.current || busyRef.current) return;
      const chosen = fresh.find(x => x.month === selectedRef.current) ?? fresh[0];
      if (chosen) load(chosen);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao ler os dados.");
    }
  }, [query.data]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || busyRef.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function change(fn: (payload: Payload) => void) {
    if (busyRef.current) return;
    markDirty();
    setDoc(previous => {
      if (!previous) return previous;
      const next = copy(previous); fn(next.payload); return next;
    });
  }
  function updateItem(group: Group, id: string, patch: Partial<Item>) {
    change(p => { p[group] = p[group].map(x => x.id === id ? { ...x, ...patch } : x); });
  }
  function addItem(group: Group) {
    const name = window.prompt("Nome do novo item:");
    if (!name?.trim()) return;
    change(p => { p[group].push({ id: uid(), name: name.trim().slice(0, 300), value: 0,
      paid: false, repeat: true, day: "", end: "", variable: false }); });
  }
  function removeItem(group: Group, id: string) {
    if (group === "giro" && doc?.payload.entries.some(x => x.category === id)) {
      window.alert("Esta categoria possui gastos. Exclua os lançamentos correspondentes antes de excluir a categoria."); return;
    }
    if (window.confirm("Excluir somente deste mês? O histórico dos outros meses não será alterado.")) {
      change(p => { p[group] = p[group].filter(x => x.id !== id); });
    }
  }
  function selectMonth(key: string) {
    if (dirtyRef.current && !window.confirm("Descartar as alterações não salvas deste mês?")) return;
    const row = rows.find(x => x.month === key);
    if (row) { load(row); setMessage(""); }
  }
  async function save() {
    if (!doc || busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage("Salvando… Não feche esta página.");
    try {
      const snapshot = copy(doc);
      if (snapshot.payload.auto) snapshot.payload.pro = calculate(snapshot.payload, snapshot.month).suggested;
      const raw = await mutation.mutateAsync({ month: snapshot.month,
        expectedVersion: snapshot.version, payload: snapshot.payload });
      const saved = readMonth(raw);
      load(saved);
      setRows(previous => [...previous.filter(x => x.month !== saved.month), saved]
        .sort((a, b) => b.month.localeCompare(a.month)));
      setMessage("Salvo no servidor: " + saved.month + " — versão " + saved.version);
      // Atualiza também o cache da consulta antes de permitir novas edições.
      await query.refetch();
    } catch (error) {
      setMessage((error instanceof Error ? error.message : "Não foi possível confirmar o salvamento.") +
        " Suas edições continuam nesta tela. Gere uma cópia de segurança antes de recarregar.");
    } finally { busyRef.current = false; setBusy(false); }
  }
  async function reload() {
    if (dirtyRef.current && !window.confirm("Recarregar descarta as edições locais. Você já guardou uma cópia e deseja continuar?")) return;
    busyRef.current = true; setBusy(true);
    try {
      const result = await query.refetch();
      if (result.isError || !result.data) throw new Error("Não foi possível recarregar. As edições foram mantidas.");
      const fresh = result.data.map(readMonth).sort((a, b) => b.month.localeCompare(a.month));
      setRows(fresh);
      const chosen = fresh.find(x => x.month === selectedRef.current) ?? fresh[0];
      if (chosen) { load(chosen); setMessage("Dados recarregados do servidor."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao recarregar."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function newMonth() {
    if (!doc) return;
    if (dirtyRef.current) { window.alert("Salve o mês atual antes de criar outro."); return; }
    const [year, month] = doc.month.split("-").map(Number);
    const suggestion = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
    const key = window.prompt("Nova competência (AAAA-MM). Copiar fixos e tetos de " + doc.month, suggestion);
    if (key === null) return;
    if (!validMonth(key)) { window.alert("Use AAAA-MM, por exemplo 2026-12."); return; }
    if (rows.some(x => x.month === key)) { selectMonth(key); return; }
    const p = doc.payload;
    const recurring = (items: Item[], income = false) => items.filter(x => x.repeat && active(x, key))
      .map(x => ({ ...x, id: uid(), paid: false, date: "", value: income || x.variable ? 0 : x.value }));
    const next: Month = { month: key, version: 0, payload: {
      pjStart: null, pfStart: null, reserve: p.reserve, pro: 0, auto: p.auto,
      transferred: 0, charges: 0, pfTax: 0,
      incomes: recurring(p.incomes, true), pj: recurring(p.pj), pf: recurring(p.pf),
      giro: copy(p.giro), entries: [],
    } };
    load(next); markDirty();
    setMessage("Rascunho criado. Confira saldos iniciais, receitas, tributos, cartão e meta de reserva; depois clique Salvar alterações.");
  }
  function backup() {
    if (!doc) return;
    const all = [...rows.filter(x => x.month !== doc.month), doc];
    const months: Record<string, Payload> = {};
    all.forEach(x => { months[x.month] = x.payload; });
    const text = JSON.stringify({ version: 2, months }, null, 2);
    setBackupText(text);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url;
    a.download = "financeiro-" + doc.month + "-copia.json";
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  if (!doc) return <Panel title="Planilha financeira">
    <p>{query.isLoading ? "Carregando meses…" : query.isError ? query.error.message : "Nenhum mês disponível. Se novembro já foi importado, recarregue a consulta."}</p>
    {message && <p role="alert">{message}</p>}
    <button className={buttonClass} onClick={() => { void reload(); }} disabled={busy}>Consultar novamente</button>
  </Panel>;

  const p = doc.payload;
  const t = calculate(p, doc.month);
  const categoryName = (category: string) => category === "extraPF" ? "PF — esporádico" : category === "extraPJ" ? "PJ — esporádico" : p.giro.find(x => x.id === category)?.name ?? "Categoria desconhecida";
  const scalar = (key: "pjStart" | "pfStart" | "reserve" | "pro" | "transferred" | "charges" | "pfTax", label: string, signed = false, nullable = false) =>
    <NumberField key={key} label={label} value={key === "pro" ? t.planned : p[key]}
      signed={signed} nullable={nullable} disabled={key === "pro" && p.auto}
      onChange={v => change(next => { next[key] = v as number; })} />;

  function itemTable(group: Group, title: string) {
    const items = p[group];
    const total = sum(items.filter(x => active(x, doc!.month)).map(x => x.value));
    return <Panel title={title}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead><tr className="text-left border-b">
            <th className="p-2">Descrição</th><th className="p-2">Valor R$</th>
            <th className="p-2">{group === "incomes" ? "Data prevista" : "Dia"}</th>
            <th className="p-2">{group === "incomes" ? "Recebido?" : "Pago?"}</th>
            <th className="p-2">Repetir?</th><th className="p-2">Variável?</th>
            <th className="p-2">Último mês</th><th className="p-2">Ação</th>
          </tr></thead>
          <tbody>{items.map(x => <tr key={x.id} className={"border-b " + (!active(x, doc!.month) ? "opacity-50" : "")}>
            <td className="p-2"><input aria-label="Descrição" maxLength={300} value={x.name} className={inputClass + " w-64"}
              onChange={e => updateItem(group, x.id, { name: e.target.value })} />
              {x.note && <p className="text-xs text-muted-foreground max-w-xs mt-1">{x.note}</p>}
              {!active(x, doc!.month) && <p className="text-xs">Encerrado — fora dos totais.</p>}
            </td>
            <td className="p-2"><NumberField label="Valor" value={x.value} onChange={v => updateItem(group, x.id, { value: v ?? 0 })} /></td>
            <td className="p-2">{group === "incomes" ? <input aria-label="Data prevista" type="date" value={x.date ?? ""} className={inputClass}
              onChange={e => updateItem(group, x.id, { date: e.target.value })} /> :
              <input aria-label="Dia de vencimento" type="number" min={1} max={31} value={x.day ?? ""} className={inputClass + " w-20"}
                onChange={e => updateItem(group, x.id, { day: e.target.value ? String(Math.max(1, Math.min(31, Math.round(Number(e.target.value))))) : "" })} />}</td>
            <td className="p-2"><input type="checkbox" aria-label="Pago ou recebido" checked={!!x.paid} onChange={e => updateItem(group, x.id, { paid: e.target.checked })} /></td>
            <td className="p-2"><input type="checkbox" aria-label="Repetir no novo mês" checked={!!x.repeat} onChange={e => updateItem(group, x.id, { repeat: e.target.checked })} /></td>
            <td className="p-2"><input type="checkbox" aria-label="Zerar valor no novo mês" checked={!!x.variable} onChange={e => updateItem(group, x.id, { variable: e.target.checked })} /></td>
            <td className="p-2"><input aria-label="Último mês inclusive" type="month" value={x.end ?? ""} className={inputClass} onChange={e => updateItem(group, x.id, { end: e.target.value })} /></td>
            <td className="p-2"><button className={buttonClass + " text-red-600"} onClick={() => removeItem(group, x.id)}>Excluir</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="flex justify-between items-center gap-3 flex-wrap"><button className={buttonClass} onClick={() => addItem(group)}>+ Adicionar item</button><span>Total: <Amount value={total} /></span></div>
      <p className="text-xs text-muted-foreground">Repetir copia o item para um novo mês. Variável zera seu valor na cópia. Último mês é inclusivo. Valores de recebimentos são zerados na cópia mesmo sem marcar Variável. Pagamentos parciais devem ser divididos em linhas.</p>
    </Panel>;
  }

  return <div className="space-y-5 pb-8">
    <div><h1 className="text-2xl font-bold">Planilha financeira</h1>
      <p className="text-sm text-muted-foreground">PJ e PF · histórico mensal no Supabase · salvamento manual</p></div>
    <div className="rounded-xl border bg-card p-3 space-y-3 sticky top-[calc(4rem+max(env(safe-area-inset-top,0px),48px))] lg:top-0 z-20 shadow-sm">
      <div className="flex gap-2 flex-wrap items-center">
        <select aria-label="Mês selecionado" className={inputClass} value={doc.month} disabled={busy} onChange={e => selectMonth(e.target.value)}>
          {![...rows].some(x => x.month === doc.month) && <option value={doc.month}>{doc.month} — rascunho</option>}
          {rows.map(x => <option key={x.month} value={x.month}>{x.month}</option>)}
        </select>
        <button className={buttonClass + " bg-primary text-primary-foreground"} disabled={busy || !dirty} onClick={() => { void save(); }}>{busy ? "Aguarde…" : "Salvar alterações"}</button>
        <button className={buttonClass} disabled={busy} onClick={newMonth}>+ Novo mês</button>
        <button className={buttonClass} disabled={busy} onClick={() => { void reload(); }}>Recarregar servidor</button>
        <button className={buttonClass} disabled={busy} onClick={backup}>Cópia de segurança</button>
      </div>
      <p className={"text-sm font-medium " + (dirty ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400")} role="status">
        {busy ? "Processando…" : dirty ? "Alterações pendentes — salve antes de sair desta aba." : "Sem alterações pendentes · versão " + doc.version}
      </p>
      {message && <p className="text-sm break-words" role="status">{message}</p>}
      {query.isError && <p className="text-sm text-red-600">Falha ao atualizar a consulta: {query.error.message}. Os dados exibidos podem estar desatualizados.</p>}
    </div>
    {backupText && <Panel title="Cópia de segurança das edições e do histórico carregado">
      <p className="text-sm">O download foi solicitado. Se não funcionar, selecione e copie o texto abaixo. Esta cópia inclui as edições ainda não salvas, mas não as grava no servidor.</p>
      <textarea readOnly value={backupText} rows={8} className={inputClass + " w-full font-mono"} onFocus={e => e.target.select()} />
      <button className={buttonClass} onClick={() => setBackupText("")}>Fechar cópia</button>
    </Panel>}
    <fieldset disabled={busy} className="space-y-5 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[{ label: "Entradas previstas PJ", value: t.inc }, { label: "Orçamento total PF", value: t.need },
          { label: "Caixa final PJ projetado", value: t.end }, { label: "PJ livre após meta de reserva", value: t.free }].map(x =>
          <div key={x.label} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{x.label}</p><p className="text-xl mt-2"><Amount value={x.value} /></p></div>)}
      </div>
      <Panel title="01 · Saldos e transferência PJ → PF">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {scalar("pjStart", "Saldo inicial PJ", true, true)}
          {scalar("pfStart", "Saldo inicial PF / cheque especial", true, true)}
          {scalar("reserve", "Meta de reserva a formar (não é despesa)")}
          {scalar("pro", "Transferência líquida planejada")}
          {scalar("transferred", "Já transferido PJ → PF no mês")}
          {scalar("charges", "Encargos adicionais PJ previstos")}
          {scalar("pfTax", "Reserva para tributos PF")}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.auto} onChange={e => change(next => { next.auto = e.target.checked; })} />Calcular transferência para cobrir o orçamento PF e o cheque especial</label>
        <p className="text-sm">Transferência sugerida: <Amount value={t.suggested} /> · Restante planejado: <Amount value={Math.max(0, round(t.transfer - p.transferred))} /></p>
        <p className="text-xs text-muted-foreground">Informe a abertura efetiva do mês. Saldo negativo PF aumenta a transferência necessária, sem duplicar despesas. A meta de reserva permanece dentro do caixa PJ. DAS/DARF já registrados nas obrigações não devem ser somados novamente nos encargos.</p>
        {(p.pjStart === null || p.pfStart === null) && <p className="text-sm text-amber-700">Faltam saldos de abertura. A sugestão trata PF não informada como zero provisoriamente; a projeção PJ fica sem saldo final enquanto faltar a abertura.</p>}
        {p.transferred > t.planned && <p className="text-sm text-amber-700">O já transferido supera o planejado. A projeção respeita o maior valor.</p>}
      </Panel>
      {itemTable("incomes", "02 · Entradas previstas PJ")}
      {itemTable("pj", "03 · Obrigações PJ")}
      {itemTable("pf", "04 · PF — fixos e provisões")}
      <Panel title="05 · PF — tetos de giro">
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b text-left">{["Categoria", "Teto mensal", "Pago", "Pendente", "Disponível", "Ação"].map(x => <th className="p-2" key={x}>{x}</th>)}</tr></thead>
          <tbody>{t.giro.map(g => <tr className="border-b" key={g.id}>
            <td className="p-2"><input className={inputClass} aria-label="Categoria de giro" value={g.name} maxLength={300} onChange={e => updateItem("giro", g.id, { name: e.target.value })} /></td>
            <td className="p-2"><NumberField label="Teto" value={g.value} onChange={v => updateItem("giro", g.id, { value: v ?? 0 })} /></td>
            <td className="p-2"><Amount value={g.paidValue} /></td><td className="p-2"><Amount value={g.pending} /></td>
            <td className="p-2"><Amount value={round(g.value - g.all)} /></td>
            <td className="p-2"><button className={buttonClass + " text-red-600"} onClick={() => removeItem("giro", g.id)}>Excluir</button></td>
          </tr>)}</tbody>
        </table></div>
        <p>Total dos tetos: <Amount value={t.budget} /> · Estouro: <Amount value={t.over} /></p>
        <button className={buttonClass} onClick={() => addItem("giro")}>+ Categoria de giro</button>
        <p className="text-xs text-muted-foreground">Compras dentro do teto não aumentam novamente o orçamento. Somente o excesso é acrescentado. Registre as compras abaixo, na categoria correspondente.</p>
      </Panel>
      <Panel title="06 · Giro e gastos esporádicos PF/PJ">
        <form className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3" onSubmit={e => {
          e.preventDefault();
          const value = round(Number(entryValue));
          const date = new Date(entryDate + "T12:00:00Z");
          if (!entryName.trim() || !entryDate.startsWith(doc.month + "-") ||
              !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== entryDate ||
              !Number.isFinite(value) || value <= 0 || value > 1_000_000_000) {
            window.alert("Preencha a descrição, uma data válida dentro do mês e um valor positivo."); return;
          }
          if (!["extraPF", "extraPJ", ...p.giro.map(x => x.id)].includes(entryCategory)) {
            window.alert("Escolha uma categoria válida."); return;
          }
          change(next => { next.entries.push({ id: uid(), name: entryName.trim(), date: entryDate,
            category: entryCategory, value, paid: entryPaid }); });
          setEntryName(""); setEntryValue("");
        }}>
          <label className="text-sm space-y-1">Data<input className={inputClass + " block w-full"} required type="date" value={entryDate} min={doc.month + "-01"} max={doc.month + "-" + new Date(Number(doc.month.slice(0, 4)), Number(doc.month.slice(5)), 0).getDate()} onChange={e => setEntryDate(e.target.value)} /></label>
          <label className="text-sm space-y-1">Descrição<input className={inputClass + " block w-full"} required maxLength={300} value={entryName} onChange={e => setEntryName(e.target.value)} /></label>
          <label className="text-sm space-y-1">Destino<select className={inputClass + " block w-full"} value={entryCategory} onChange={e => setEntryCategory(e.target.value)}>
            <option value="extraPF">PF — esporádico adicional</option><option value="extraPJ">PJ — esporádico adicional</option>
            {p.giro.map(x => <option key={x.id} value={x.id}>Giro PF — {x.name}</option>)}
          </select></label>
          <label className="text-sm space-y-1">Valor R$<input className={inputClass + " block w-full"} required type="number" min="0.01" max="1000000000" step="0.01" value={entryValue} onChange={e => setEntryValue(e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={entryPaid} onChange={e => setEntryPaid(e.target.checked)} />Já pago</label>
          <button type="submit" className={buttonClass}>Adicionar ao mês (salve depois)</button>
        </form>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm">
          <thead><tr className="text-left border-b">{["Data", "Descrição", "Destino", "Valor", "Pago?", "Ação"].map(x => <th key={x} className="p-2">{x}</th>)}</tr></thead>
          <tbody>{[...p.entries].sort((a, b) => a.date.localeCompare(b.date)).map(x => <tr key={x.id} className="border-b">
            <td className="p-2">{x.date.split("-").reverse().join("/")}</td><td className="p-2">{x.name}</td><td className="p-2">{categoryName(x.category)}</td><td className="p-2"><Amount value={x.value} /></td>
            <td className="p-2"><input type="checkbox" aria-label="Pagamento realizado" checked={x.paid} onChange={e => change(next => { next.entries = next.entries.map(item => item.id === x.id ? { ...item, paid: e.target.checked } : item); })} /></td>
            <td className="p-2"><button className={buttonClass + " text-red-600"} onClick={() => {
              if (window.confirm("Excluir este gasto?")) change(next => { next.entries = next.entries.filter(item => item.id !== x.id); });
            }}>Excluir</button></td>
          </tr>)}</tbody>
        </table></div>
        {!p.entries.length && <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>}
        <p className="text-xs text-muted-foreground">Não repita aqui valores já incluídos nos fixos ou na fatura Cora. Esporádicos são adicionais ao orçamento; gastos de giro usam seu teto. Para corrigir descrição, data ou valor de um lançamento, exclua e registre novamente.</p>
      </Panel>
      <Panel title="07 · Projeção e realizado estimado">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {[{ label: "Entradas já recebidas", value: t.received }, { label: "Obrigações PJ previstas", value: t.pj },
            { label: "Fixos/provisões PF", value: t.pf }, { label: "Variação PJ prevista no mês", value: t.delta },
            { label: "Saldo final PF após todo o orçamento", value: p.pfStart === null ? null : round(p.pfStart + t.transfer - t.need) },
            { label: "PJ realizado estimado", value: t.pjNow }, { label: "PF realizado estimado", value: t.pfNow }].map(x =>
            <div className="flex justify-between gap-3 border-b pb-2" key={x.label}><span>{x.label}</span><Amount value={x.value} /></div>)}
        </div>
        <p className="text-xs text-muted-foreground">Projeção considera o orçamento inteiro; marcar pago altera só o realizado, sem descontar duas vezes. Realizado considera abertura, recebimentos, pagamentos e transferências confirmados. Encargos adicionais PJ e reserva tributária PF são previsões: para registrar seu pagamento, zere a previsão correspondente e crie um esporádico pago, evitando duplicidade. Provisões PF marcadas devem representar dinheiro retirado do saldo operacional. Não há conciliação automática com bancos.</p>
      </Panel>
      <Panel title="08 · Histórico mensal">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b text-left">{["Mês", "Entradas PJ", "Orçamento PF", "Caixa final PJ", "Ação"].map(x => <th className="p-2" key={x}>{x}</th>)}</tr></thead>
          <tbody>{rows.map(row => { const values = calculate(row.payload, row.month); return <tr key={row.month} className="border-b">
            <td className="p-2">{row.month}</td><td className="p-2">{money(values.inc)}</td><td className="p-2">{money(values.need)}</td><td className="p-2"><Amount value={values.end} /></td>
            <td className="p-2"><button className={buttonClass} onClick={() => selectMonth(row.month)}>Abrir</button></td>
          </tr>; })}</tbody>
        </table></div>
        <p className="text-xs text-muted-foreground">O histórico mostra os valores salvos/carregados, não o rascunho. Novo mês copia fixos ativos e tetos, sem transportar pagamentos nem gastos esporádicos. Receitas e itens variáveis voltam a zero. Saldos de abertura devem ser informados novamente. A meta de reserva é copiada e precisa de revisão.</p>
      </Panel>
    </fieldset>
    <p className="text-xs text-muted-foreground">Salve antes de navegar para outra seção, sair da conta ou trocar de dispositivo. O aviso do navegador ao fechar depende do dispositivo e não protege mudanças de rota dentro do site. Dados digitados sem salvar podem ser perdidos; use a cópia de segurança para preservar rascunhos.</p>
  </div>;
}
