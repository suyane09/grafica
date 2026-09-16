import { useState, useEffect, useMemo, useContext, createContext } from "react";
import {
  LayoutGrid,
  ClipboardList,
  Users,
  FolderKanban,
  Columns3,
  Calendar,
  Receipt,
  Truck,
  BarChart3,
  Settings,
  Printer,
  Box,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Search,
  ChevronDown,
  Plus,
  X,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  PackageCheck,
  RotateCcw,
  ArrowLeft,
  ArrowRightCircle,
  Loader2,
  Inbox,
  FileText,
  MessageCircle,
  Send,
  CheckCheck,
  Menu,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FLOW = [
  "Recebido",
  "Aguardando arte",
  "Aguardando aprovação",
  "Aprovado",
  "Em produção",
  "Pronto",
  "Entregue",
];

const STATUS_COLOR = {
  "Recebido": "gray",
  "Aguardando arte": "purple",
  "Aguardando aprovação": "amber",
  "Aprovado": "blue",
  "Em produção": "blue",
  "Pronto": "green",
  "Entregue": "green",
};

const SERVICOS = [
  "Sublimação",
  "Silk Screen",
  "DTF",
  "Bordado",
  "Impressão digital",
  "Banner / Lona",
  "Adesivo",
  "Camisetaria",
  "Outros",
];

const CATEGORIAS_DESPESA = [
  "Material",
  "Manutenção",
  "Aluguel",
  "Salários",
  "Marketing",
  "Transporte",
  "Energia / Água",
  "Outros",
];

const FORMAS_PAGAMENTO = ["Não definido", "Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Boleto", "Transferência"];

const TIPOS_ENTREGA = ["Cliente retira", "Entrega no endereço"];

const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#f97316", "#64748b"];

const NAV = [
  { key: "painel", label: "Painel", icon: LayoutGrid },
  { key: "pedidos", label: "Pedidos", icon: ClipboardList },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "produtos", label: "Produtos", icon: Box },
  { key: "producao", label: "Produção", icon: FolderKanban },
  { key: "kanban", label: "Kanban", icon: Columns3 },
  { key: "calendario", label: "Calendário", icon: Calendar },
  { key: "despesas", label: "Despesas", icon: Receipt },
  { key: "entregas", label: "Entregas", icon: Truck },
  { key: "lembretes", label: "Lembretes", icon: Bell },
  { key: "relatorios", label: "Relatórios", icon: BarChart3 },
  { key: "configuracoes", label: "Configurações", icon: Settings },
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromISO, toISO) {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

function formatDateBR(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function uid(prefix, list) {
  const nums = list
    .map((it) => parseInt(String(it.id).split("-")[1] || "0", 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function prazoInfo(dataEntrega, status) {
  if (status === "Entregue") return { label: "Entregue", color: "green" };
  if (!dataEntrega) return { label: "Sem prazo", color: "gray" };
  const diff = daysBetween(todayISO(), dataEntrega);
  if (diff < 0) return { label: `${Math.abs(diff)} dia(s) atrasado`, color: "red" };
  if (diff === 0) return { label: "Vence hoje", color: "orange" };
  if (diff <= 3) return { label: `${diff} dia(s) restante(s)`, color: "amber" };
  return { label: `${diff} dia(s) restante(s)`, color: "green" };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Calcula entrada/restante de um pedido, com compatibilidade para pedidos
// criados antes desse recurso existir (assume entrada de 50% já recebida e
// restante de acordo com o status).
function pagamentoInfo(pedido) {
  const total = Number(pedido.valor) || 0;
  const valorEntrada =
    pedido.valorEntrada != null && pedido.valorEntrada !== "" ? round2(pedido.valorEntrada) : round2(total / 2);
  const valorRestante = Math.max(0, round2(total - valorEntrada));
  const entradaPaga = pedido.entradaPaga ?? true;
  const restantePago = pedido.restantePago ?? pedido.status === "Entregue";
  const totalRecebido = round2((entradaPaga ? valorEntrada : 0) + (restantePago ? valorRestante : 0));
  const totalAReceber = round2(total - totalRecebido);
  let statusLabel = "Pago";
  let statusColor = "green";
  if (!entradaPaga && !restantePago) {
    statusLabel = "Pendente";
    statusColor = "red";
  } else if (entradaPaga && !restantePago) {
    statusLabel = "Entrada paga";
    statusColor = "amber";
  }
  return { total, valorEntrada, valorRestante, entradaPaga, restantePago, totalRecebido, totalAReceber, statusLabel, statusColor };
}

// ---------------------------------------------------------------------------
// Lembretes (WhatsApp / e-mail)
// ---------------------------------------------------------------------------

// Um pedido "precisa de lembrete" quando está pronto, atrasado, vence hoje,
// ou vence dentro da janela de aviso configurada (padrão 3 dias).
function precisaLembrete(pedido, diasAviso) {
  if (pedido.status === "Entregue") return false;
  if (pedido.status === "Pronto") return true;
  if (!pedido.dataEntrega) return false;
  const diff = daysBetween(todayISO(), pedido.dataEntrega);
  return diff <= diasAviso;
}

function primeiroNome(nomeCompleto) {
  return String(nomeCompleto || "").trim().split(/\s+/)[0] || "";
}

// Situação em texto curto (usada tanto no card quanto nas mensagens).
function situacaoPedido(pedido) {
  const prazo = prazoInfo(pedido.dataEntrega, pedido.status);
  if (pedido.status === "Pronto") return "pronto, aguardando retirada/entrega";
  if (prazo.color === "red") return `atrasado desde ${formatDateBR(pedido.dataEntrega)}`;
  if (prazo.label === "Vence hoje") return "vence hoje";
  return `vence em ${formatDateBR(pedido.dataEntrega)}`;
}

// Gera o texto de alerta de UM pedido, para o PRÓPRIO dono da gráfica agilizar.
function buildLembreteTexto(pedido, empresa) {
  return [
    `⚠️ Lembrete de prazo — ${empresa.nome}`,
    "",
    `Pedido: ${pedido.id} — ${pedido.cliente}`,
    `Produto: ${pedido.produto} (${pedido.qtd} un.)`,
    `Entrega prevista: ${formatDateBR(pedido.dataEntrega)}`,
    `Status atual: ${pedido.status}`,
    `Situação: ${situacaoPedido(pedido)}`,
    "",
    "Bora agilizar esse aí!",
  ].join("\n");
}

// Gera um resumo único com todos os pedidos que precisam de atenção, para
// mandar de uma vez só (WhatsApp/e-mail) para o próprio proprietário.
function buildResumoLembretes(pedidos, empresa) {
  const linhas = pedidos.map(
    (p, i) =>
      `${i + 1}. ${p.id} — ${p.cliente}\n   ${p.produto} (${p.qtd} un.) · Entrega ${formatDateBR(p.dataEntrega)} · ${p.status} · ${situacaoPedido(p)}`
  );
  return [
    `📋 Lembrete de prazos — ${empresa.nome}`,
    `Hoje: ${formatDateBR(todayISO())}`,
    "",
    `${pedidos.length} pedido(s) precisam de atenção:`,
    "",
    ...linhas,
    "",
    "Bora agilizar!",
  ].join("\n");
}

function telefoneParaWhatsApp(telefone) {
  const digitos = String(telefone || "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

function buildWhatsAppLink(telefone, mensagem) {
  const numero = telefoneParaWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function buildMailtoLink(email, assunto, mensagem) {
  if (!email || !email.trim()) return null;
  return `mailto:${email.trim()}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function buildSeed() {
  const empresa = {
    nome: "Gráfica",
    responsavel: "",
    telefone: "",
    email: "",
    endereco: "",
    cnpj: "",
    diasAvisoLembrete: 3,
  };

  return { pedidos: [], clientes: [], despesas: [], produtos: [], empresa };
}

// ---------------------------------------------------------------------------
// Persistent store hook
// ---------------------------------------------------------------------------

const STORAGE_KEY = "grafica-demo-data";

function useStore() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const local = raw ? JSON.parse(raw) : null;
      setData(local && Object.keys(local).length ? { produtos: [], ...local } : buildSeed());
    } catch (e) {
      setData(buildSeed());
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || data == null) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  }, [data, loaded]);

  return { data, setData, loaded, saveError };
}

// ---------------------------------------------------------------------------
// App context (CRUD helpers)
// ---------------------------------------------------------------------------

const AppCtx = createContext(null);
function useApp() {
  return useContext(AppCtx);
}

// ---------------------------------------------------------------------------
// Shared UI bits
// ---------------------------------------------------------------------------

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

const TAG_COLORS = {
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  orange: "bg-orange-50 text-orange-700",
  gray: "bg-gray-100 text-gray-600",
  purple: "bg-purple-50 text-purple-700",
};

function Tag({ children, color = "gray" }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${TAG_COLORS[color]}`}>
      {children}
    </span>
  );
}

function EmptyState({ icon: Icon = Inbox, title, subtitle }) {
  return (
    <div className="border border-gray-200 rounded-xl p-10 text-center bg-white">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
        <Icon size={18} className="text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function IconBtn({ onClick, children, title, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 ${
        danger ? "hover:border-red-200 hover:bg-red-50 text-red-500" : "text-gray-500"
      }`}
    >
      {children}
    </button>
  );
}

function Dropdown({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none flex items-center gap-2 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-600 bg-white outline-none cursor-pointer"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none text-xs font-medium pl-2.5 pr-6 py-1 rounded-full outline-none cursor-pointer ${TAG_COLORS[STATUS_COLOR[value]]}`}
      >
        {STATUS_FLOW.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg z-[60] animate-[fadeIn_.15s_ease-out]">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal + form fields
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white no-print">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, span }) {
  return (
    <label className={`block mb-3.5 ${span ? "col-span-2" : ""}`}>
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white";

function ConfirmDialog({ title, body, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-gray-600 mb-5">{body}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white">
          Cancelar
        </button>
        <button onClick={onConfirm} className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-red-600">
          Excluir
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Pedido form
// ---------------------------------------------------------------------------

function PedidoForm({ pedido, onClose }) {
  const { clientes, produtos, addPedido, updatePedido } = useApp();
  const isEdit = !!pedido;
  const [form, setForm] = useState(() => {
    if (pedido) {
      // Compatibilidade com pedidos antigos que não tinham valor/custo unitário salvo.
      const qtdAtual = Number(pedido.qtd) || 1;
      const produtoCadastrado = produtos.find((p) => p.nome === pedido.produto);
      const pgto = pagamentoInfo(pedido);
      return {
        ...pedido,
        valorUnitario: pedido.valorUnitario ?? (pedido.valor ? Number(pedido.valor) / qtdAtual : ""),
        custoUnitario: pedido.custoUnitario ?? (pedido.custo ? Number(pedido.custo) / qtdAtual : ""),
        produtoId: pedido.produtoId ?? produtoCadastrado?.id ?? "__custom__",
        valorEntrada: pgto.valorEntrada,
        entradaPaga: pgto.entradaPaga,
        restantePago: pgto.restantePago,
      };
    }
    return {
      cliente: "",
      servico: SERVICOS[0],
      produtoId: produtos.length ? "" : "__custom__",
      produto: "",
      qtd: 1,
      valorUnitario: "",
      custoUnitario: "",
      nota: "",
      dataRecebido: todayISO(),
      dataEntrega: addDays(todayISO(), 7),
      status: "Recebido",
      obs: "",
      arteAprovada: "",
      valorEntrada: "",
      entradaPaga: true,
      restantePago: false,
    };
  });

  // Enquanto o usuário não editar manualmente o valor de entrada, ele acompanha
  // 50% do valor total do pedido automaticamente.
  const [entradaManual, setEntradaManual] = useState(isEdit);

  const [arteErro, setArteErro] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const handleArteChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setArteErro("");
    if (!/^image\/(jpeg|jpg)$/i.test(file.type)) {
      setArteErro("Envie a arte aprovada em formato JPEG (.jpg/.jpeg).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setArteErro("Imagem muito grande. Envie um JPEG de até 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, arteAprovada: reader.result }));
    };
    reader.onerror = () => {
      setArteErro("Não foi possível ler o arquivo. Tente novamente.");
    };
    reader.readAsDataURL(file);
  };

  const handleProdutoChange = (e) => {
    const val = e.target.value;
    if (val === "__custom__") {
      setForm((f) => ({ ...f, produtoId: "__custom__" }));
      return;
    }
    const prod = produtos.find((p) => p.id === val);
    if (!prod) return;
    setForm((f) => ({
      ...f,
      produtoId: prod.id,
      produto: prod.nome,
      custoUnitario: prod.custoProducao ?? f.custoUnitario,
      valorUnitario:
        prod.valorVenda !== "" && prod.valorVenda != null ? prod.valorVenda : f.valorUnitario,
    }));
  };

  const qtdNum = Number(form.qtd) || 0;
  const valorUnitNum = Number(form.valorUnitario) || 0;
  const custoUnitNum = Number(form.custoUnitario) || 0;
  const valorTotal = qtdNum * valorUnitNum;
  const custoTotal = qtdNum * custoUnitNum;
  const lucroEstimado = valorTotal - custoTotal;
  const margem = valorTotal > 0 ? (lucroEstimado / valorTotal) * 100 : 0;

  // Mantém a entrada em 50% do total automaticamente, a não ser que o usuário
  // já tenha digitado um valor de entrada diferente.
  useEffect(() => {
    if (entradaManual) return;
    setForm((f) => ({ ...f, valorEntrada: valorTotal > 0 ? round2(valorTotal / 2) : "" }));
  }, [valorTotal, entradaManual]);

  const valorEntradaNum = Math.min(Number(form.valorEntrada) || 0, valorTotal);
  const valorRestante = Math.max(0, round2(valorTotal - valorEntradaNum));

  const canSave = form.cliente.trim() && form.produto.trim() && form.dataEntrega && qtdNum > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const payload = {
      ...form,
      produtoId: form.produtoId === "__custom__" ? null : form.produtoId,
      qtd: qtdNum,
      valorUnitario: valorUnitNum,
      custoUnitario: custoUnitNum,
      valor: valorTotal,
      custo: custoTotal,
      valorEntrada: valorEntradaNum,
      entradaPaga: !!form.entradaPaga,
      restantePago: !!form.restantePago,
    };
    if (isEdit) updatePedido(payload);
    else addPedido(payload);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <datalist id="clientes-datalist">
        {clientes.map((c) => (
          <option key={c.id} value={c.nome} />
        ))}
      </datalist>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label="Cliente" span>
          <input
            list="clientes-datalist"
            className={inputCls}
            value={form.cliente}
            onChange={set("cliente")}
            placeholder="Nome do cliente"
            required
          />
        </Field>
        <Field label="Serviço">
          <select className={inputCls} value={form.servico} onChange={set("servico")}>
            {SERVICOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={set("status")}>
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Produto" span>
          {produtos.length > 0 ? (
            <>
              <select className={inputCls} value={form.produtoId || ""} onChange={handleProdutoChange} required>
                <option value="" disabled>
                  Selecione um produto cadastrado
                </option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
                <option value="__custom__">Outro (digitar manualmente)</option>
              </select>
              {form.produtoId === "__custom__" && (
                <input
                  className={`${inputCls} mt-2`}
                  value={form.produto}
                  onChange={set("produto")}
                  placeholder="Ex: Camisa longa"
                  required
                />
              )}
            </>
          ) : (
            <>
              <input className={inputCls} value={form.produto} onChange={set("produto")} placeholder="Ex: Camisa de time" required />
              <span className="block text-[11px] text-gray-400 mt-1">
                Dica: cadastre seus produtos na aba "Produtos" para preencher o custo automaticamente.
              </span>
            </>
          )}
        </Field>
        <Field label="Quantidade">
          <input type="number" min="1" className={inputCls} value={form.qtd} onChange={set("qtd")} required />
        </Field>
        <Field label="Nº da OS / nota fiscal">
          <input
            className={inputCls}
            value={form.nota}
            onChange={set("nota")}
            placeholder={isEdit ? "—" : "Gerado automaticamente ao criar"}
          />
          <span className="block text-[11px] text-gray-400 mt-1">
            Deixe em branco para gerar um número de OS automático. Preencha só se já tiver o nº da nota fiscal emitida.
          </span>
        </Field>
        <Field label="Valor unitário (R$)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={form.valorUnitario}
            onChange={set("valorUnitario")}
            placeholder="0,00"
          />
        </Field>
        <Field label="Valor total (calculado)">
          <div className={`${inputCls} bg-gray-50 text-gray-700 font-medium`}>{formatCurrency(valorTotal)}</div>
        </Field>
        <Field label="Custo unitário (R$)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={form.custoUnitario}
            onChange={set("custoUnitario")}
            placeholder="0,00"
          />
          {form.produtoId && form.produtoId !== "__custom__" && (
            <span className="block text-[11px] text-gray-400 mt-1">Preenchido a partir do produto. Pode ajustar se precisar.</span>
          )}
        </Field>
        <Field label="Custo total (calculado)">
          <div className={`${inputCls} bg-gray-50 text-gray-700 font-medium`}>{formatCurrency(custoTotal)}</div>
        </Field>
        <Field label="Data de recebimento">
          <input type="date" className={inputCls} value={form.dataRecebido} onChange={set("dataRecebido")} />
        </Field>
        <Field label="Data de entrega">
          <input type="date" className={inputCls} value={form.dataEntrega} onChange={set("dataEntrega")} required />
        </Field>
        <Field label="Observações" span>
          <textarea className={inputCls} rows={2} value={form.obs} onChange={set("obs")} placeholder="Opcional" />
        </Field>
        <Field label="Arte aprovada pelo cliente (JPEG)" span>
          {form.arteAprovada ? (
            <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-2">
              <img
                src={form.arteAprovada}
                alt="Arte aprovada"
                className="w-16 h-16 object-cover rounded-md border border-gray-100 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600">Arte cadastrada. Ela será impressa junto com a OS/nota.</p>
              </div>
              <label className="shrink-0 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white cursor-pointer hover:bg-gray-50">
                Trocar
                <input type="file" accept="image/jpeg,image/jpg" className="hidden" onChange={handleArteChange} />
              </label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, arteAprovada: "" }))}
                className="shrink-0 text-xs font-medium text-red-600 border border-red-100 rounded-lg px-2.5 py-1.5 bg-white hover:bg-red-50"
              >
                Remover
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 justify-center border border-dashed border-gray-300 rounded-lg px-3 py-4 text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
              <Upload size={15} />
              Selecionar arquivo JPEG da arte aprovada
              <input type="file" accept="image/jpeg,image/jpg" className="hidden" onChange={handleArteChange} />
            </label>
          )}
          {arteErro && <span className="block text-[11px] text-red-500 mt-1">{arteErro}</span>}
          <span className="block text-[11px] text-gray-400 mt-1">
            Opcional. Cadastre a arte já aprovada pelo cliente em JPEG para que ela saia impressa junto com os dados
            do pedido na Ordem de Serviço.
          </span>
        </Field>
      </div>

      {(valorTotal > 0 || custoTotal > 0) && (
        <div className="border border-emerald-100 bg-emerald-50/60 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-700/80">Lucro estimado neste pedido</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(lucroEstimado)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-700/80">Margem</p>
            <p className="text-sm font-semibold text-emerald-700">{margem.toFixed(1)}%</p>
          </div>
        </div>
      )}

      <div className="border border-blue-100 bg-blue-50/60 rounded-lg px-4 py-3 mb-4">
        <p className="text-xs font-medium text-blue-800/80 mb-3">Pagamento (padrão: 50% na encomenda, 50% na entrega)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Valor de entrada (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={form.valorEntrada}
              onChange={(e) => {
                setEntradaManual(true);
                set("valorEntrada")(e);
              }}
              placeholder="0,00"
            />
          </Field>
          <Field label="Valor restante (calculado)">
            <div className={`${inputCls} bg-gray-50 text-gray-700 font-medium`}>{formatCurrency(valorRestante)}</div>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-2.5">
          <input type="checkbox" checked={!!form.entradaPaga} onChange={setCheck("entradaPaga")} className="rounded" />
          Entrada já recebida
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={!!form.restantePago} onChange={setCheck("restantePago")} className="rounded" />
          Restante recebido
        </label>
        <p className="text-[11px] text-gray-500 mt-2">
          {form.restantePago
            ? "Restante já recebido."
            : `Restante a receber na entrega, prevista para ${formatDateBR(form.dataEntrega)}.`}
        </p>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 disabled:opacity-40"
        >
          {isEdit ? "Salvar alterações" : "Criar pedido"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Ordem de Serviço / comprovante (documento para imprimir e entregar ao cliente)
// ---------------------------------------------------------------------------

function OSDocument({ pedido, empresa, clientes }) {
  const cliente = clientes.find((c) => c.id === pedido.clienteId);
  const prazo = prazoInfo(pedido.dataEntrega, pedido.status);
  const pgto = pagamentoInfo(pedido);

  return (
    <div className="print-area">
      <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-lg font-bold text-gray-900">{empresa.nome}</p>
            {empresa.endereco && <p className="text-xs text-gray-500">{empresa.endereco}</p>}
            <p className="text-xs text-gray-500">
              {[empresa.telefone, empresa.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Ordem de Serviço</p>
          <p className="text-lg font-bold text-gray-900">{pedido.nota || pedido.id}</p>
          <p className="text-xs text-gray-400">Ref. pedido {pedido.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 os-two-col-print">
        <div>
          <p className="text-xs text-gray-400 mb-1">Cliente</p>
          <p className="text-sm font-medium text-gray-900">{pedido.cliente}</p>
          {cliente?.telefone && <p className="text-xs text-gray-500">{cliente.telefone}</p>}
          {cliente?.endereco && <p className="text-xs text-gray-500">{cliente.endereco}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">Datas</p>
          <p className="text-xs text-gray-600">Recebido em {formatDateBR(pedido.dataRecebido)}</p>
          <p className="text-xs text-gray-600">Entrega prevista {formatDateBR(pedido.dataEntrega)}</p>
          <p className="text-xs text-gray-600 mt-1">
            Status: <span className="font-medium text-gray-900">{pedido.status}</span>
          </p>
        </div>
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium">Serviço</th>
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium text-right">Qtd</th>
              <th className="px-3 py-2 font-medium text-right">Valor unit.</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200">
              <td className="px-3 py-2">{pedido.servico}</td>
              <td className="px-3 py-2">{pedido.produto}</td>
              <td className="px-3 py-2 text-right">{pedido.qtd}</td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(pedido.valorUnitario ?? (pedido.qtd ? pedido.valor / pedido.qtd : 0))}
              </td>
              <td className="px-3 py-2 text-right font-semibold">{formatCurrency(pedido.valor)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-4">
        <div className="w-64">
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">Total do pedido</span>
            <span className="font-bold text-gray-900">{formatCurrency(pedido.valor)}</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-t border-gray-100">
            <span className="text-gray-400">Entrada {pgto.entradaPaga ? "(recebida)" : "(pendente)"}</span>
            <span className={`font-medium ${pgto.entradaPaga ? "text-emerald-600" : "text-amber-600"}`}>
              {formatCurrency(pgto.valorEntrada)}
            </span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-gray-400">
              Restante {pgto.restantePago ? "(recebido)" : `(a receber em ${formatDateBR(pedido.dataEntrega)})`}
            </span>
            <span className={`font-medium ${pgto.restantePago ? "text-emerald-600" : "text-amber-600"}`}>
              {formatCurrency(pgto.valorRestante)}
            </span>
          </div>
          <div className="flex justify-between text-xs py-1 border-t border-gray-100">
            <span className="text-gray-400">Prazo</span>
            <span className="text-gray-600">{prazo.label}</span>
          </div>
        </div>
      </div>

      {pedido.obs && (
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1">Observações</p>
          <p className="text-sm text-gray-700">{pedido.obs}</p>
        </div>
      )}

      {pedido.arteAprovada && (
        <div className="mb-6 arte-aprovada-print">
          <p className="text-xs text-gray-400 mb-2">Arte aprovada pelo cliente</p>
          <img
            src={pedido.arteAprovada}
            alt="Arte aprovada pelo cliente"
            className="max-w-full max-h-[420px] w-auto h-auto object-contain rounded-lg border border-gray-200 mx-auto"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10 pt-6 os-two-col-print">
        <div className="border-t border-gray-300 pt-2 text-center">
          <p className="text-xs text-gray-500">Assinatura do cliente</p>
        </div>
        <div className="border-t border-gray-300 pt-2 text-center">
          <p className="text-xs text-gray-500">Assinatura da gráfica</p>
        </div>
      </div>

      <p className="text-[10px] text-gray-300 mt-8 text-center">
        Documento gerado em {formatDateBR(todayISO())} · Não substitui a nota fiscal eletrônica quando exigida.
      </p>
    </div>
  );
}

function OSModal({ pedido, empresa, clientes, onClose }) {
  return (
    <Modal title={`Ordem de serviço · ${pedido.id}`} onClose={onClose} wide>
      <OSDocument pedido={pedido} empresa={empresa} clientes={clientes} />
      <div className="flex justify-end gap-2 mt-4 no-print">
        <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white">
          Fechar
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
        >
          <FileText size={14} /> Imprimir / salvar PDF
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Cliente form
// ---------------------------------------------------------------------------

function ClienteForm({ cliente, onClose }) {
  const { addCliente, updateCliente } = useApp();
  const isEdit = !!cliente;
  const [form, setForm] = useState(cliente || { nome: "", telefone: "", email: "", endereco: "", obs: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSave = form.nome.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    if (isEdit) updateCliente(form);
    else addCliente(form);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Nome">
        <input className={inputCls} value={form.nome} onChange={set("nome")} required />
      </Field>
      <Field label="Telefone">
        <input className={inputCls} value={form.telefone} onChange={set("telefone")} placeholder="(00) 00000-0000" />
      </Field>
      <Field label="E-mail">
        <input type="email" className={inputCls} value={form.email} onChange={set("email")} />
      </Field>
      <Field label="Endereço">
        <input className={inputCls} value={form.endereco} onChange={set("endereco")} />
      </Field>
      <Field label="Observações">
        <textarea className={inputCls} rows={2} value={form.obs} onChange={set("obs")} />
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white">
          Cancelar
        </button>
        <button type="submit" disabled={!canSave} className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 disabled:opacity-40">
          {isEdit ? "Salvar alterações" : "Adicionar cliente"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Produto form
// ---------------------------------------------------------------------------

function ProdutoForm({ produto, onClose }) {
  const { addProduto, updateProduto } = useApp();
  const isEdit = !!produto;
  const [form, setForm] = useState(
    produto || { nome: "", custoProducao: "", valorVenda: "", obs: "" }
  );
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSave = form.nome.trim().length > 0 && Number(form.custoProducao) >= 0 && form.custoProducao !== "";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const payload = {
      ...form,
      custoProducao: Number(form.custoProducao) || 0,
      valorVenda: form.valorVenda === "" ? "" : Number(form.valorVenda) || 0,
    };
    if (isEdit) updateProduto(payload);
    else addProduto(payload);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Nome do produto">
        <input className={inputCls} value={form.nome} onChange={set("nome")} placeholder="Ex: Camisa longa" required />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label="Custo de produção (R$)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={form.custoProducao}
            onChange={set("custoProducao")}
            placeholder="0,00"
            required
          />
        </Field>
        <Field label="Preço de venda sugerido (R$)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={form.valorVenda}
            onChange={set("valorVenda")}
            placeholder="Opcional"
          />
        </Field>
      </div>
      <Field label="Observações">
        <textarea className={inputCls} rows={2} value={form.obs} onChange={set("obs")} placeholder="Opcional" />
      </Field>
      <p className="text-[11px] text-gray-400 -mt-1.5 mb-3.5">
        Ao criar um pedido, selecione este produto e o custo (e o preço, se preenchido) entram automaticamente.
      </p>
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white">
          Cancelar
        </button>
        <button type="submit" disabled={!canSave} className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 disabled:opacity-40">
          {isEdit ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Despesa form
// ---------------------------------------------------------------------------

function DespesaForm({ despesa, onClose }) {
  const { addDespesa, updateDespesa } = useApp();
  const isEdit = !!despesa;
  const [form, setForm] = useState(
    despesa || { descricao: "", categoria: CATEGORIAS_DESPESA[0], valor: "", data: todayISO() }
  );
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSave = form.descricao.trim().length > 0 && Number(form.valor) > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const payload = { ...form, valor: Number(form.valor) || 0 };
    if (isEdit) updateDespesa(payload);
    else addDespesa(payload);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Descrição">
        <input className={inputCls} value={form.descricao} onChange={set("descricao")} required />
      </Field>
      <Field label="Categoria">
        <select className={inputCls} value={form.categoria} onChange={set("categoria")}>
          {CATEGORIAS_DESPESA.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Valor (R$)">
        <input type="number" min="0" step="0.01" className={inputCls} value={form.valor} onChange={set("valor")} required />
      </Field>
      <Field label="Data">
        <input type="date" className={inputCls} value={form.data} onChange={set("data")} />
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white">
          Cancelar
        </button>
        <button type="submit" disabled={!canSave} className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 disabled:opacity-40">
          {isEdit ? "Salvar alterações" : "Adicionar despesa"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

function PainelPage() {
  const { pedidos, despesas } = useApp();
  const hoje = todayISO();

  const stats = useMemo(() => {
    const ativos = pedidos.filter((p) => p.status !== "Entregue");
    const emProducao = pedidos.filter((p) => p.status === "Em produção").length;
    const aguardandoAprovacao = pedidos.filter((p) => p.status === "Aguardando aprovação").length;
    const prontos = pedidos.filter((p) => p.status === "Pronto").length;
    const entregues = pedidos.filter((p) => p.status === "Entregue").length;
    const atrasados = ativos.filter((p) => p.dataEntrega < hoje);
    const vencendoHoje = ativos.filter((p) => p.dataEntrega === hoje);
    const vencendo3 = ativos.filter((p) => p.dataEntrega > hoje && daysBetween(hoje, p.dataEntrega) <= 3);
    const receita = pedidos.reduce((s, p) => s + Number(p.valor || 0), 0);
    const custo = pedidos.reduce((s, p) => s + Number(p.custo || 0), 0);
    const despesasTotal = despesas.reduce((s, d) => s + Number(d.valor || 0), 0);
    const recebido = pedidos.reduce((s, p) => s + pagamentoInfo(p).totalRecebido, 0);
    const aReceber = pedidos.reduce((s, p) => s + pagamentoInfo(p).totalAReceber, 0);
    return { ativos, emProducao, aguardandoAprovacao, prontos, entregues, atrasados, vencendoHoje, vencendo3, receita, custo, despesasTotal, recebido, aReceber };
  }, [pedidos, despesas, hoje]);

  const KPIS = [
    { label: "Pedidos ativos", value: stats.ativos.length, icon: Box, tone: "text-blue-600", bg: "bg-blue-50" },
    { label: "Em produção", value: stats.emProducao, icon: Printer, tone: "text-blue-600", bg: "bg-blue-50" },
    { label: "Aguardando aprovação", value: stats.aguardandoAprovacao, icon: Clock, tone: "text-amber-500", bg: "bg-amber-50" },
    { label: "Prontos", value: stats.prontos, icon: CheckCircle2, tone: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Entregues", value: stats.entregues, icon: CheckCircle2, tone: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Atrasados", value: stats.atrasados.length, icon: AlertTriangle, tone: "text-red-600", bg: "bg-red-50" },
    { label: "Vencendo hoje", value: stats.vencendoHoje.length, icon: Flame, tone: "text-orange-500", bg: "bg-orange-50" },
    { label: "Vencendo em 3 dias", value: stats.vencendo3.length, icon: Clock, tone: "text-amber-500", bg: "bg-amber-50" },
  ];

  const lucro = stats.receita - stats.custo;
  const FINANCEIRO = [
    { label: "Receita", value: formatCurrency(stats.receita), icon: TrendingUp, tone: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Custo dos pedidos", value: formatCurrency(stats.custo), icon: TrendingDown, tone: "text-orange-500", bg: "bg-orange-50" },
    { label: "Lucro", value: formatCurrency(lucro), icon: DollarSign, tone: "text-blue-600", bg: "bg-blue-50" },
    { label: "Despesas", value: formatCurrency(stats.despesasTotal), icon: Receipt, tone: "text-red-500", bg: "bg-red-50" },
    { label: "Recebido", value: formatCurrency(stats.recebido), icon: CheckCircle2, tone: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "A receber", value: formatCurrency(stats.aReceber), icon: Clock, tone: "text-amber-500", bg: "bg-amber-50" },
  ];

  const prioridades = [...stats.ativos].sort((a, b) => (a.dataEntrega < b.dataEntrega ? -1 : 1)).slice(0, 4);

  return (
    <div>
      <PageHeader title="Painel" subtitle="Visão geral da produção e prazos de hoje." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {KPIS.map(({ label, value, icon: Icon, tone, bg }) => (
          <div key={label} className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-start justify-between">
              <span className="text-2xl font-bold text-gray-900">{value}</span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${bg}`}>
                <Icon size={15} className={tone} />
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="border border-gray-200 rounded-xl p-5 bg-white mb-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-gray-700" />
          <span className="font-semibold text-gray-900">Resumo financeiro</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
          {FINANCEIRO.map(({ label, value, icon: Icon, tone, bg }) => (
            <div key={label} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center ${bg}`}>
                  <Icon size={13} className={tone} />
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          O lucro considera apenas o valor dos pedidos menos o custo de produção. As despesas são
          controladas separadamente e não entram nesse cálculo. "Recebido" soma as entradas e
          restantes já marcados como pagos; "A receber" é o que falta receber dos pedidos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-red-500" />
              <span className="font-semibold text-gray-900">Prioridades de hoje</span>
            </div>
          </div>
          {prioridades.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Nenhum pedido ativo no momento.</p>
          ) : (
            <div className="space-y-2.5">
              {prioridades.map((p) => {
                const prazo = prazoInfo(p.dataEntrega, p.status);
                return (
                  <div key={p.id} className="border border-gray-200 rounded-xl p-4">
                    <p className="font-medium text-gray-900">
                      {p.id} · {p.cliente}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {p.produto} · {p.qtd} un. · Entrega {formatDateBR(p.dataEntrega)}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Tag color={prazo.color}>{prazo.label}</Tag>
                      <Tag color={STATUS_COLOR[p.status]}>{p.status}</Tag>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-gray-700" />
            <span className="font-semibold text-gray-900">Alertas</span>
          </div>
          {stats.atrasados.length === 0 && stats.vencendoHoje.length === 0 ? (
            <p className="text-sm text-gray-500">Tudo em dia. Sem alertas.</p>
          ) : (
            <div className="space-y-3">
              {stats.atrasados.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-gray-900">{p.id}</span> ({p.cliente}) está atrasado desde{" "}
                    {formatDateBR(p.dataEntrega)}.
                  </p>
                </div>
              ))}
              {stats.vencendoHoje.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-start gap-2">
                  <Flame size={14} className="text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-gray-900">{p.id}</span> ({p.cliente}) vence hoje.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

function PedidosPage() {
  const { pedidos, clientes, empresa, deletePedido, setPedidoStatus, showToast } = useApp();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterServico, setFilterServico] = useState("");
  const [formTarget, setFormTarget] = useState(null); // null | "new" | pedido
  const [toDelete, setToDelete] = useState(null);
  const [osTarget, setOsTarget] = useState(null);

  const filtered = pedidos.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q || p.id.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.produto.toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchServico = !filterServico || p.servico === filterServico;
    return matchQ && matchStatus && matchServico;
  });

  const cols = ["Pedido", "Cliente", "Serviço", "Produto", "Qtd", "Valor", "Custo", "Pagamento", "Nota", "Entrega", "Prazo", "Status", ""];

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle="Gerencie pedidos do recebimento à entrega."
        action={
          <button
            onClick={() => setFormTarget("new")}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus size={14} /> Novo pedido
          </button>
        }
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido, cliente ou produto"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <Dropdown label="Todos os status" value={filterStatus} onChange={setFilterStatus} options={STATUS_FLOW} />
        <Dropdown label="Todos os serviços" value={filterServico} onChange={setFilterServico} options={SERVICOS} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhum pedido encontrado" subtitle="Ajuste os filtros ou crie um novo pedido." />
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs">
                {cols.map((c) => (
                  <th key={c} className="px-4 py-3 font-medium whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const prazo = prazoInfo(p.dataEntrega, p.status);
                const pgto = pagamentoInfo(p);
                return (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.id}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{p.cliente}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{p.servico}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{p.produto}</td>
                    <td className="px-4 py-3 text-gray-700">{p.qtd}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(p.valor)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(p.custo)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Tag color={pgto.statusColor}>{pgto.statusLabel}</Tag>
                      {pgto.totalAReceber > 0 && (
                        <span className="block text-[11px] text-gray-400 mt-0.5">{formatCurrency(pgto.totalAReceber)} a receber</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{p.nota || "—"}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateBR(p.dataEntrega)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Tag color={prazo.color}>{prazo.label}</Tag>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusSelect value={p.status} onChange={(v) => setPedidoStatus(p.id, v)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <IconBtn title="Gerar OS / comprovante" onClick={() => setOsTarget(p)}>
                          <FileText size={13} />
                        </IconBtn>
                        <IconBtn title="Editar" onClick={() => setFormTarget(p)}>
                          <Pencil size={13} />
                        </IconBtn>
                        <IconBtn title="Excluir" danger onClick={() => setToDelete(p)}>
                          <Trash2 size={13} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formTarget && (
        <Modal title={formTarget === "new" ? "Novo pedido" : `Editar ${formTarget.id}`} onClose={() => setFormTarget(null)} wide>
          <PedidoForm pedido={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} />
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir pedido"
          body={`Tem certeza que deseja excluir o pedido ${toDelete.id} (${toDelete.cliente})? Essa ação não pode ser desfeita.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deletePedido(toDelete.id);
            showToast("Pedido excluído.");
            setToDelete(null);
          }}
        />
      )}

      {osTarget && <OSModal pedido={osTarget} empresa={empresa} clientes={clientes} onClose={() => setOsTarget(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

function ClientesPage() {
  const { clientes, pedidos, deleteCliente, showToast } = useApp();
  const [search, setSearch] = useState("");
  const [formTarget, setFormTarget] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const filtered = clientes.filter((c) => c.nome.toLowerCase().includes(search.trim().toLowerCase()));

  const statsFor = (clienteId) => {
    const own = pedidos.filter((p) => p.clienteId === clienteId);
    const total = own.reduce((s, p) => s + Number(p.valor || 0), 0);
    return { count: own.length, total };
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Sua base de clientes."
        action={
          <button
            onClick={() => setFormTarget("new")}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus size={14} /> Novo cliente
          </button>
        }
      />

      <div className="relative max-w-xs mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente"
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-gray-400"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente encontrado" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const { count, total } = statsFor(c.id);
            return (
              <div key={c.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                      {c.nome.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{c.nome}</p>
                      <p className="text-xs text-gray-400">{c.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconBtn title="Editar" onClick={() => setFormTarget(c)}>
                      <Pencil size={13} />
                    </IconBtn>
                    <IconBtn title="Excluir" danger onClick={() => setToDelete(c)}>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {c.telefone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Phone size={11} /> {c.telefone}
                    </p>
                  )}
                  {c.email && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Mail size={11} /> {c.email}
                    </p>
                  )}
                  {c.endereco && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <MapPin size={11} /> {c.endereco}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Pedidos</p>
                    <p className="text-sm font-semibold text-gray-900">{count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total gasto</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(total)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formTarget && (
        <Modal title={formTarget === "new" ? "Novo cliente" : "Editar cliente"} onClose={() => setFormTarget(null)}>
          <ClienteForm cliente={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} />
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir cliente"
          body={`Tem certeza que deseja excluir ${toDelete.nome}? Os pedidos já registrados serão mantidos.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deleteCliente(toDelete.id);
            showToast("Cliente excluído.");
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

function ProdutosPage() {
  const { produtos, deleteProduto, showToast } = useApp();
  const [search, setSearch] = useState("");
  const [formTarget, setFormTarget] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const filtered = produtos.filter((p) => p.nome.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Cadastre o custo de produção de cada produto para agilizar a criação de pedidos."
        action={
          <button
            onClick={() => setFormTarget("new")}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus size={14} /> Novo produto
          </button>
        }
      />

      <div className="relative max-w-xs mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto"
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-gray-400"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Box}
          title="Nenhum produto cadastrado"
          subtitle="Cadastre seus produtos para preencher o custo automaticamente nos pedidos."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const margem =
              p.valorVenda !== "" && p.valorVenda != null && Number(p.valorVenda) > 0
                ? ((Number(p.valorVenda) - Number(p.custoProducao)) / Number(p.valorVenda)) * 100
                : null;
            return (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4 bg-white min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.nome}</p>
                    <p className="text-xs text-gray-400">{p.id}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconBtn title="Editar" onClick={() => setFormTarget(p)}>
                      <Pencil size={13} />
                    </IconBtn>
                    <IconBtn title="Excluir" danger onClick={() => setToDelete(p)}>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Custo</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.custoProducao)}</p>
                  </div>
                  {p.valorVenda !== "" && p.valorVenda != null && (
                    <div>
                      <p className="text-xs text-gray-400">Venda sugerida</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.valorVenda)}</p>
                    </div>
                  )}
                  {margem != null && (
                    <div>
                      <p className="text-xs text-gray-400">Margem</p>
                      <p className="text-sm font-semibold text-emerald-600">{margem.toFixed(0)}%</p>
                    </div>
                  )}
                </div>
                {p.obs && <p className="text-xs text-gray-500 mt-2">{p.obs}</p>}
              </div>
            );
          })}
        </div>
      )}

      {formTarget && (
        <Modal title={formTarget === "new" ? "Novo produto" : "Editar produto"} onClose={() => setFormTarget(null)}>
          <ProdutoForm produto={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} />
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir produto"
          body={`Tem certeza que deseja excluir "${toDelete.nome}"? Pedidos já criados não serão alterados.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deleteProduto(toDelete.id);
            showToast("Produto excluído.");
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Produção
// ---------------------------------------------------------------------------

function ProducaoPage() {
  const { pedidos, advanceStatus } = useApp();
  const stages = STATUS_FLOW.filter((s) => s !== "Entregue");

  return (
    <div>
      <PageHeader title="Produção de hoje" subtitle="O que a equipe precisa produzir agora, separado por etapa." />
      <div className="space-y-5">
        {stages.map((stage) => {
          const items = pedidos.filter((p) => p.status === stage);
          if (items.length === 0) return null;
          return (
            <div key={stage} className="border border-gray-200 rounded-xl p-5 bg-white">
              <p className="font-semibold text-gray-900 mb-3">
                {stage} ({items.length})
              </p>
              <div className="space-y-2.5">
                {items.map((p) => {
                  const prazo = prazoInfo(p.dataEntrega, p.status);
                  const isLast = stage === "Pronto";
                  return (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {p.id} · {p.cliente}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {p.produto} · {p.qtd} un. · Entrega {formatDateBR(p.dataEntrega)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Tag color={prazo.color}>{prazo.label}</Tag>
                        <button
                          onClick={() => advanceStatus(p.id)}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1.5"
                        >
                          {isLast ? "Marcar entregue" : "Avançar etapa"} <ArrowRightCircle size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {stages.every((s) => pedidos.filter((p) => p.status === s).length === 0) && (
          <EmptyState icon={FolderKanban} title="Nada em produção" subtitle="Todos os pedidos foram entregues." />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban
// ---------------------------------------------------------------------------

function KanbanPage() {
  const { pedidos, setPedidoStatus } = useApp();

  return (
    <div>
      <PageHeader title="Kanban de produção" subtitle="Mova os pedidos entre as etapas alterando o status em cada cartão." />
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-proximity">
        {STATUS_FLOW.map((col) => {
          const items = pedidos.filter((p) => p.status === col);
          const idx = STATUS_FLOW.indexOf(col);
          return (
            <div key={col} className="border border-gray-200 rounded-xl bg-gray-50 w-60 shrink-0 p-3 snap-start">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900">{col}</span>
                <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded-full w-5 h-5 flex items-center justify-center">
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Vazio</p>
              ) : (
                <div className="space-y-2">
                  {items.map((p) => {
                    const prazo = prazoInfo(p.dataEntrega, p.status);
                    return (
                      <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-900">{p.id}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{p.cliente}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {p.produto} · {p.qtd} un.
                        </p>
                        <div className="mt-2">
                          <Tag color={prazo.color}>{prazo.label}</Tag>
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                          <button
                            disabled={idx === 0}
                            onClick={() => setPedidoStatus(p.id, STATUS_FLOW[idx - 1])}
                            className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <StatusSelect value={p.status} onChange={(v) => setPedidoStatus(p.id, v)} />
                          <button
                            disabled={idx === STATUS_FLOW.length - 1}
                            onClick={() => setPedidoStatus(p.id, STATUS_FLOW[idx + 1])}
                            className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50"
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------

function CalendarioPage() {
  const { pedidos } = useApp();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(todayISO());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const pedidosByDay = useMemo(() => {
    const map = {};
    pedidos.forEach((p) => {
      if (!p.dataEntrega) return;
      map[p.dataEntrega] = map[p.dataEntrega] || [];
      map[p.dataEntrega].push(p);
    });
    return map;
  }, [pedidos]);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isoFor = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const selectedPedidos = pedidosByDay[selected] || [];

  return (
    <div>
      <PageHeader title="Calendário" subtitle="Prazos e entregas no calendário." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-gray-200 rounded-xl p-3 sm:p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-900 capitalize text-sm sm:text-base">
              {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-xs font-medium text-gray-400 text-center py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={`b-${i}`} />;
              const iso = isoFor(d);
              const items = pedidosByDay[iso] || [];
              const isToday = iso === todayISO();
              const isSelected = iso === selected;
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={`aspect-square rounded-lg border text-left p-1 sm:p-1.5 flex flex-col justify-between ${
                    isSelected ? "border-gray-900 bg-gray-900 text-white" : isToday ? "border-blue-300 bg-blue-50" : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-xs font-medium ${isSelected ? "text-white" : "text-gray-700"}`}>{d}</span>
                  {items.length > 0 && (
                    <span
                      className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 self-start ${
                        isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {items.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-3 sm:p-5 bg-white">
          <p className="font-semibold text-gray-900 mb-1">{formatDateBR(selected)}</p>
          <p className="text-xs text-gray-400 mb-4">{selectedPedidos.length} pedido(s) com entrega nesta data</p>
          {selectedPedidos.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Nenhuma entrega prevista.</p>
          ) : (
            <div className="space-y-2.5">
              {selectedPedidos.map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {p.id} · {p.cliente}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.produto} · {p.qtd} un.
                  </p>
                  <div className="mt-2">
                    <Tag color={STATUS_COLOR[p.status]}>{p.status}</Tag>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Despesas
// ---------------------------------------------------------------------------

function DespesasPage() {
  const { despesas, deleteDespesa, showToast } = useApp();
  const [formTarget, setFormTarget] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [filterCategoria, setFilterCategoria] = useState("");

  const filtered = despesas.filter((d) => !filterCategoria || d.categoria === filterCategoria);
  const sorted = [...filtered].sort((a, b) => (a.data < b.data ? 1 : -1));
  const total = filtered.reduce((s, d) => s + Number(d.valor || 0), 0);

  const byCategoria = CATEGORIAS_DESPESA.map((cat) => ({
    categoria: cat,
    total: despesas.filter((d) => d.categoria === cat).reduce((s, d) => s + Number(d.valor || 0), 0),
  })).filter((c) => c.total > 0);

  return (
    <div>
      <PageHeader
        title="Despesas"
        subtitle="Controle as despesas da gráfica."
        action={
          <button
            onClick={() => setFormTarget("new")}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus size={14} /> Nova despesa
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <div className="border border-gray-200 rounded-xl p-4 bg-white col-span-1">
          <p className="text-sm text-gray-500">Total no período</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(total)}</p>
        </div>
        {byCategoria.slice(0, 3).map((c) => (
          <div key={c.categoria} className="border border-gray-200 rounded-xl p-4 bg-white">
            <p className="text-sm text-gray-500">{c.categoria}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(c.total)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <Dropdown label="Todas as categorias" value={filterCategoria} onChange={setFilterCategoria} options={CATEGORIAS_DESPESA} />
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma despesa registrada" />
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs">
                {["Descrição", "Categoria", "Valor", "Data", ""].map((c) => (
                  <th key={c} className="px-4 py-3 font-medium whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{d.descricao}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Tag color="gray">{d.categoria}</Tag>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(d.valor)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateBR(d.data)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <IconBtn title="Editar" onClick={() => setFormTarget(d)}>
                        <Pencil size={13} />
                      </IconBtn>
                      <IconBtn title="Excluir" danger onClick={() => setToDelete(d)}>
                        <Trash2 size={13} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formTarget && (
        <Modal title={formTarget === "new" ? "Nova despesa" : "Editar despesa"} onClose={() => setFormTarget(null)}>
          <DespesaForm despesa={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} />
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir despesa"
          body={`Tem certeza que deseja excluir "${toDelete.descricao}"?`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deleteDespesa(toDelete.id);
            showToast("Despesa excluída.");
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entregas
// ---------------------------------------------------------------------------

function EntregasPage() {
  const { pedidos, setPedidoStatus, showToast } = useApp();
  const prontos = pedidos.filter((p) => p.status === "Pronto");
  const entregues = [...pedidos.filter((p) => p.status === "Entregue")].sort((a, b) => (a.dataEntrega < b.dataEntrega ? 1 : -1));

  return (
    <div>
      <PageHeader title="Entregas" subtitle="Pedidos prontos aguardando retirada ou entrega, e histórico de entregas." />

      <div className="border border-gray-200 rounded-xl p-5 bg-white mb-6">
        <p className="font-semibold text-gray-900 mb-3">Prontos para entrega ({prontos.length})</p>
        {prontos.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhum pedido pronto no momento.</p>
        ) : (
          <div className="space-y-2.5">
            {prontos.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {p.id} · {p.cliente}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {p.produto} · {p.qtd} un. · Prazo {formatDateBR(p.dataEntrega)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPedidoStatus(p.id, "Entregue");
                    showToast(`${p.id} marcado como entregue.`);
                  }}
                  className="flex items-center gap-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-100"
                >
                  <PackageCheck size={14} /> Marcar como entregue
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl p-5 bg-white">
        <p className="font-semibold text-gray-900 mb-3">Histórico de entregas ({entregues.length})</p>
        {entregues.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhuma entrega registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {entregues.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 flex-wrap border-t border-gray-100 first:border-t-0 pt-2.5 first:pt-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.id} · {p.cliente}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{p.produto}</p>
                </div>
                <Tag color="green">Entregue em {formatDateBR(p.dataEntrega)}</Tag>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lembretes
// ---------------------------------------------------------------------------

function LembreteCard({ pedido, empresa, onMarcarEnviado, onMarcarPendente }) {
  const prazo = prazoInfo(pedido.dataEntrega, pedido.status);
  const mensagem = buildLembreteTexto(pedido, empresa);
  const linkWhats = buildWhatsAppLink(empresa.telefone, mensagem);
  const assunto = `Lembrete de prazo — pedido ${pedido.id}`;
  const linkEmail = buildMailtoLink(empresa.email, assunto, mensagem);

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-medium text-gray-900">
            {pedido.id} · {pedido.cliente}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {pedido.produto} · {pedido.qtd} un. · Entrega {formatDateBR(pedido.dataEntrega)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Tag color={prazo.color}>{prazo.label}</Tag>
          <Tag color={STATUS_COLOR[pedido.status]}>{pedido.status}</Tag>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {linkWhats ? (
          <a
            href={linkWhats}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onMarcarEnviado(pedido.id)}
            className="flex items-center gap-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-100"
          >
            <MessageCircle size={14} /> Mandar pra mim no WhatsApp
          </a>
        ) : (
          <span className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5">
            Cadastre seu telefone em Configurações para usar o WhatsApp
          </span>
        )}

        {linkEmail ? (
          <a
            href={linkEmail}
            onClick={() => onMarcarEnviado(pedido.id)}
            className="flex items-center gap-1.5 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-100"
          >
            <Mail size={14} /> Mandar pra mim por e-mail
          </a>
        ) : (
          <span className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5">
            Cadastre seu e-mail em Configurações para usar o e-mail
          </span>
        )}

        {pedido.lembreteEnviado ? (
          <button
            onClick={() => onMarcarPendente(pedido.id)}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 ml-auto"
          >
            <CheckCheck size={13} className="text-emerald-600" />
            Enviado em {formatDateBR(pedido.lembreteEnviadoEm)} · marcar como pendente
          </button>
        ) : (
          <button
            onClick={() => onMarcarEnviado(pedido.id)}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 ml-auto"
          >
            <Send size={13} /> Marcar como enviado manualmente
          </button>
        )}
      </div>
    </div>
  );
}

function LembretesPage() {
  const { pedidos, empresa, marcarLembreteEnviado, marcarLembretePendente } = useApp();
  const [filtro, setFiltro] = useState("pendentes");

  const diasAviso = Number(empresa.diasAvisoLembrete) || 3;
  const temTelefone = !!telefoneParaWhatsApp(empresa.telefone);
  const temEmail = !!(empresa.email && empresa.email.trim());

  const relevantes = useMemo(
    () => pedidos.filter((p) => precisaLembrete(p, diasAviso)),
    [pedidos, diasAviso]
  );

  const pendentes = relevantes.filter((p) => !p.lembreteEnviado);
  const enviados = relevantes.filter((p) => p.lembreteEnviado);
  const lista = filtro === "pendentes" ? pendentes : enviados;

  const ordenados = [...lista].sort((a, b) => (a.dataEntrega < b.dataEntrega ? -1 : 1));
  const pendentesOrdenados = [...pendentes].sort((a, b) => (a.dataEntrega < b.dataEntrega ? -1 : 1));

  const resumoTexto = buildResumoLembretes(pendentesOrdenados, empresa);
  const resumoWhats = buildWhatsAppLink(empresa.telefone, resumoTexto);
  const resumoEmail = buildMailtoLink(empresa.email, `Lembrete de prazos — ${pendentesOrdenados.length} pedido(s)`, resumoTexto);

  const marcarTodosPendentesEnviados = () => pendentes.forEach((p) => marcarLembreteEnviado(p.id));

  return (
    <div>
      <PageHeader
        title="Lembretes"
        subtitle={`Alertas para você mesmo agilizar pedidos prontos, atrasados ou que vencem em até ${diasAviso} dia(s).`}
      />

      {pendentes.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={15} className="text-amber-600" />
            <p className="font-semibold text-gray-900">
              {pendentes.length} pedido(s) pedindo atenção — mande o resumo pra você mesmo
            </p>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Um único WhatsApp ou e-mail com a lista completa, pra você não precisar abrir pedido por pedido.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {resumoWhats ? (
              <a
                href={resumoWhats}
                target="_blank"
                rel="noopener noreferrer"
                onClick={marcarTodosPendentesEnviados}
                className="flex items-center gap-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg px-3.5 py-2 text-sm font-medium hover:bg-emerald-100"
              >
                <MessageCircle size={14} /> Enviar resumo por WhatsApp
              </a>
            ) : (
              <span className="text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3.5 py-2">
                Cadastre seu telefone em Configurações para usar o WhatsApp
              </span>
            )}
            {resumoEmail ? (
              <a
                href={resumoEmail}
                onClick={marcarTodosPendentesEnviados}
                className="flex items-center gap-1.5 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg px-3.5 py-2 text-sm font-medium hover:bg-blue-100"
              >
                <Mail size={14} /> Enviar resumo por e-mail
              </a>
            ) : (
              <span className="text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3.5 py-2">
                Cadastre seu e-mail em Configurações para usar o e-mail
              </span>
            )}
          </div>
        </div>
      )}

      {!temTelefone && !temEmail && (
        <div className="border border-gray-200 rounded-xl p-4 mb-6 bg-white">
          <p className="text-sm text-gray-600">
            Cadastre seu telefone e/ou e-mail em <span className="font-medium">Configurações</span> para poder receber
            estes lembretes.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setFiltro("pendentes")}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border ${
            filtro === "pendentes" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 bg-white"
          }`}
        >
          Pendentes ({pendentes.length})
        </button>
        <button
          onClick={() => setFiltro("enviados")}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border ${
            filtro === "enviados" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 bg-white"
          }`}
        >
          Já enviados ({enviados.length})
        </button>
      </div>

      {ordenados.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filtro === "pendentes" ? "Nenhum lembrete pendente" : "Nenhum lembrete enviado ainda"}
          subtitle={filtro === "pendentes" ? "Tudo em dia por aqui." : "Os lembretes marcados como enviados aparecem aqui."}
        />
      ) : (
        <div className="space-y-2.5">
          {ordenados.map((p) => (
            <LembreteCard
              key={p.id}
              pedido={p}
              empresa={empresa}
              onMarcarEnviado={marcarLembreteEnviado}
              onMarcarPendente={marcarLembretePendente}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-5 leading-relaxed max-w-2xl">
        Este painel roda direto no navegador, então ele não envia mensagens sozinho: os botões abrem o WhatsApp Web/app e o
        seu programa de e-mail com a mensagem já pronta, endereçada pra você mesmo — só falta confirmar o envio. Ajuste
        seu telefone, e-mail e os dias de antecedência do aviso em Configurações.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------

function RelatoriosPage() {
  const { pedidos, despesas } = useApp();
  const [periodo, setPeriodo] = useState("90");

  const filteredPedidos = useMemo(() => {
    if (periodo === "all") return pedidos;
    const days = periodo === "ano" ? 365 : Number(periodo);
    const cutoff = addDays(todayISO(), -days);
    return pedidos.filter((p) => p.dataRecebido >= cutoff);
  }, [pedidos, periodo]);

  const porMes = useMemo(() => {
    const map = {};
    filteredPedidos.forEach((p) => {
      const key = monthLabel(p.dataEntrega || p.dataRecebido);
      map[key] = map[key] || { mes: key, receita: 0, custo: 0 };
      map[key].receita += Number(p.valor || 0);
      map[key].custo += Number(p.custo || 0);
    });
    return Object.values(map).map((m) => ({ ...m, lucro: m.receita - m.custo }));
  }, [filteredPedidos]);

  const porStatus = useMemo(() => {
    return STATUS_FLOW.map((s) => ({ status: s, total: filteredPedidos.filter((p) => p.status === s).length })).filter(
      (s) => s.total > 0
    );
  }, [filteredPedidos]);

  const porCliente = useMemo(() => {
    const map = {};
    filteredPedidos.forEach((p) => {
      map[p.cliente] = (map[p.cliente] || 0) + Number(p.valor || 0);
    });
    return Object.entries(map)
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredPedidos]);

  const despesasPorCategoria = useMemo(() => {
    const map = {};
    despesas.forEach((d) => {
      map[d.categoria] = (map[d.categoria] || 0) + Number(d.valor || 0);
    });
    return Object.entries(map).map(([categoria, total]) => ({ categoria, total }));
  }, [despesas]);

  const receitaTotal = filteredPedidos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const custoTotal = filteredPedidos.reduce((s, p) => s + Number(p.custo || 0), 0);
  const ticketMedio = filteredPedidos.length ? receitaTotal / filteredPedidos.length : 0;

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Desempenho financeiro e operacional da gráfica." />

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[
          { k: "30", label: "Últimos 30 dias" },
          { k: "90", label: "Últimos 90 dias" },
          { k: "ano", label: "Este ano" },
          { k: "all", label: "Tudo" },
        ].map((opt) => (
          <button
            key={opt.k}
            onClick={() => setPeriodo(opt.k)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              periodo === opt.k ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-sm text-gray-500">Receita</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(receitaTotal)}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-sm text-gray-500">Custo</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(custoTotal)}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-sm text-gray-500">Lucro</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(receitaTotal - custoTotal)}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-sm text-gray-500">Ticket médio</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(ticketMedio)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <p className="font-semibold text-gray-900 mb-4">Receita, custo e lucro por mês</p>
          {porMes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="receita" name="Receita" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" name="Custo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <p className="font-semibold text-gray-900 mb-4">Pedidos por status</p>
          {porStatus.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porStatus} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 11 }}>
                  {porStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <p className="font-semibold text-gray-900 mb-4">Top 5 clientes por receita</p>
          {porCliente.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porCliente} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="cliente" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="total" name="Receita" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <p className="font-semibold text-gray-900 mb-4">Despesas por categoria</p>
          {despesasPorCategoria.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Nenhuma despesa registrada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={despesasPorCategoria} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 11 }}>
                  {despesasPorCategoria.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

function ConfiguracoesPage() {
  const { empresa, updateEmpresa, resetData, showToast } = useApp();
  const [form, setForm] = useState(empresa);
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    updateEmpresa(form);
    showToast("Dados da empresa atualizados.");
  };

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Preferências da conta e da oficina." />

      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-5 bg-white mb-6 max-w-xl">
        <p className="font-semibold text-gray-900 mb-4">Dados da gráfica</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Nome da gráfica" span>
            <input className={inputCls} value={form.nome} onChange={set("nome")} />
          </Field>
          <Field label="Responsável" span>
            <input className={inputCls} value={form.responsavel} onChange={set("responsavel")} />
          </Field>
          <Field label="Telefone">
            <input className={inputCls} value={form.telefone} onChange={set("telefone")} />
          </Field>
          <Field label="E-mail">
            <input type="email" className={inputCls} value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Endereço" span>
            <input className={inputCls} value={form.endereco} onChange={set("endereco")} />
          </Field>
        </div>
        <button type="submit" className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800">
          Salvar alterações
        </button>
      </form>

      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-5 bg-white mb-6 max-w-xl">
        <p className="font-semibold text-gray-900 mb-1">Lembretes de prazo</p>
        <p className="text-xs text-gray-500 mb-4">
          Define com quantos dias de antecedência um pedido passa a aparecer na aba Lembretes (pedidos prontos ou
          atrasados sempre aparecem).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Avisar com quantos dias de antecedência">
            <input
              type="number"
              min="0"
              max="30"
              className={inputCls}
              value={form.diasAvisoLembrete ?? 3}
              onChange={set("diasAvisoLembrete")}
            />
          </Field>
        </div>
        <button type="submit" className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800">
          Salvar alterações
        </button>
      </form>

      <div className="border border-red-100 rounded-xl p-5 bg-red-50/40 max-w-xl">
        <p className="font-semibold text-red-700 mb-1">Zona de risco</p>
        <p className="text-sm text-red-600/80 mb-3">
          Apaga todos os pedidos, clientes, produtos e despesas cadastrados, deixando o painel limpo. Essa ação não pode
          ser desfeita.
        </p>
        <button
          onClick={() => setConfirmReset(true)}
          className="flex items-center gap-1.5 border border-red-200 text-red-700 bg-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-50"
        >
          <RotateCcw size={13} /> Limpar todos os dados
        </button>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Limpar todos os dados"
          body="Todos os pedidos, clientes, produtos e despesas atuais serão apagados. Deseja continuar?"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetData();
            showToast("Dados apagados.");
            setConfirmReset(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

export default function GraficaDashboard() {
  const [page, setPage] = useState("painel");
  const [toast, setToast] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data, setData, loaded, saveError } = useStore();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  if (!loaded || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Carregando painel...
        </div>
      </div>
    );
  }

  const { pedidos, clientes, despesas, empresa } = data;
  const produtos = data.produtos || [];

  const lembretesPendentesCount = pedidos.filter(
    (p) => precisaLembrete(p, Number(empresa.diasAvisoLembrete) || 3) && !p.lembreteEnviado
  ).length;

  const ctx = {
    pedidos,
    clientes,
    despesas,
    produtos,
    empresa,
    showToast,

    addPedido: (p) => {
      const id = uid("PED", pedidos);
      const nota = p.nota && p.nota.trim() ? p.nota.trim() : id.replace("PED", "OS");
      const cli = clientes.find((c) => c.nome.toLowerCase() === p.cliente.trim().toLowerCase());
      let nextClientes = clientes;
      let clienteId = cli?.id;
      if (!cli) {
        clienteId = uid("CLI", clientes);
        nextClientes = [...clientes, { id: clienteId, nome: p.cliente.trim(), telefone: "", email: "", endereco: "", obs: "" }];
      }
      setData({
        ...data,
        pedidos: [...pedidos, { ...p, id, nota, clienteId, lembreteEnviado: false, lembreteEnviadoEm: null }],
        clientes: nextClientes,
      });
      showToast("Pedido criado com sucesso.");
    },
    updatePedido: (p) => {
      let nextClientes = clientes;
      let clienteId = p.clienteId;
      const cli = clientes.find((c) => c.nome.toLowerCase() === p.cliente.trim().toLowerCase());
      if (!cli) {
        clienteId = uid("CLI", clientes);
        nextClientes = [...clientes, { id: clienteId, nome: p.cliente.trim(), telefone: "", email: "", endereco: "", obs: "" }];
      } else {
        clienteId = cli.id;
      }
      setData({
        ...data,
        pedidos: pedidos.map((x) => {
          if (x.id !== p.id) return x;
          // Se a data de entrega mudou, o lembrete antigo perde sentido e volta a pendente.
          const dataMudou = x.dataEntrega !== p.dataEntrega;
          return {
            ...p,
            clienteId,
            lembreteEnviado: dataMudou ? false : x.lembreteEnviado ?? false,
            lembreteEnviadoEm: dataMudou ? null : x.lembreteEnviadoEm ?? null,
          };
        }),
        clientes: nextClientes,
      });
      showToast("Pedido atualizado.");
    },
    deletePedido: (id) => setData({ ...data, pedidos: pedidos.filter((p) => p.id !== id) }),
    setPedidoStatus: (id, status) => setData({ ...data, pedidos: pedidos.map((p) => (p.id === id ? { ...p, status } : p)) }),
    advanceStatus: (id) =>
      setData({
        ...data,
        pedidos: pedidos.map((p) => {
          if (p.id !== id) return p;
          const idx = STATUS_FLOW.indexOf(p.status);
          const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
          return { ...p, status: next };
        }),
      }),

    marcarLembreteEnviado: (id) =>
      setData({
        ...data,
        pedidos: pedidos.map((p) => (p.id === id ? { ...p, lembreteEnviado: true, lembreteEnviadoEm: todayISO() } : p)),
      }),
    marcarLembretePendente: (id) =>
      setData({
        ...data,
        pedidos: pedidos.map((p) => (p.id === id ? { ...p, lembreteEnviado: false, lembreteEnviadoEm: null } : p)),
      }),

    addCliente: (c) => {
      const id = uid("CLI", clientes);
      setData({ ...data, clientes: [...clientes, { ...c, id }] });
      showToast("Cliente adicionado.");
    },
    updateCliente: (c) => {
      setData({
        ...data,
        clientes: clientes.map((x) => (x.id === c.id ? c : x)),
        pedidos: pedidos.map((p) => (p.clienteId === c.id ? { ...p, cliente: c.nome } : p)),
      });
      showToast("Cliente atualizado.");
    },
    deleteCliente: (id) => setData({ ...data, clientes: clientes.filter((c) => c.id !== id) }),

    addDespesa: (d) => {
      const id = uid("DESP", despesas);
      setData({ ...data, despesas: [...despesas, { ...d, id }] });
      showToast("Despesa registrada.");
    },
    updateDespesa: (d) => {
      setData({ ...data, despesas: despesas.map((x) => (x.id === d.id ? d : x)) });
      showToast("Despesa atualizada.");
    },
    deleteDespesa: (id) => setData({ ...data, despesas: despesas.filter((d) => d.id !== id) }),

    addProduto: (p) => {
      const id = uid("PROD", produtos);
      setData({ ...data, produtos: [...produtos, { ...p, id }] });
      showToast("Produto cadastrado.");
    },
    updateProduto: (p) => {
      setData({ ...data, produtos: produtos.map((x) => (x.id === p.id ? p : x)) });
      showToast("Produto atualizado.");
    },
    deleteProduto: (id) => setData({ ...data, produtos: produtos.filter((p) => p.id !== id) }),

    updateEmpresa: (e) => setData({ ...data, empresa: e }),
    resetData: () => setData(buildSeed()),
  };

  const renderPage = () => {
    switch (page) {
      case "painel":
        return <PainelPage />;
      case "pedidos":
        return <PedidosPage />;
      case "producao":
        return <ProducaoPage />;
      case "kanban":
        return <KanbanPage />;
      case "clientes":
        return <ClientesPage />;
      case "produtos":
        return <ProdutosPage />;
      case "calendario":
        return <CalendarioPage />;
      case "despesas":
        return <DespesasPage />;
      case "entregas":
        return <EntregasPage />;
      case "lembretes":
        return <LembretesPage />;
      case "relatorios":
        return <RelatoriosPage />;
      case "configuracoes":
        return <ConfiguracoesPage />;
      default:
        return <PainelPage />;
    }
  };

  return (
    <AppCtx.Provider value={ctx}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .print-area .os-two-col-print { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .print-area .arte-aprovada-print { page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="flex min-h-screen bg-white text-gray-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {/* Topo mobile */}
        <div className="md:hidden fixed top-0 inset-x-0 h-14 border-b border-gray-100 bg-white z-30 flex items-center justify-between px-4 no-print">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{empresa.nome}</span>
            <span className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
              <Printer size={13} className="text-white" />
            </span>
          </div>
        </div>

        {/* Overlay do menu mobile */}
        {mobileNavOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`w-64 md:w-60 border-r border-gray-100 flex flex-col shrink-0 bg-white fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-200 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="flex items-center justify-between gap-2.5 px-5 py-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                <Printer size={16} className="text-white" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">{empresa.nome}</p>
                <p className="text-xs text-gray-400 leading-tight">Gestão de Produção</p>
              </div>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 shrink-0"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {NAV.map(({ key, label, icon: Icon }) => {
              const active = page === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setPage(key);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm ${
                    active ? "bg-gray-900 text-white font-medium" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={15} />
                    {label}
                  </span>
                  {key === "lembretes" && lembretesPendentesCount > 0 && (
                    <span
                      className={`text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center ${
                        active ? "bg-white text-gray-900" : "bg-red-500 text-white"
                      }`}
                    >
                      {lembretesPendentesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">Versão de demonstração</p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 md:p-8 pt-20 md:pt-8 overflow-x-hidden">{renderPage()}</main>
      </div>
      <Toast message={toast} />
      {saveError && (
        <div className="fixed bottom-5 left-5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3.5 py-2 rounded-lg shadow z-[60]">
          Não foi possível salvar as últimas alterações neste navegador.
        </div>
      )}
    </AppCtx.Provider>
  );
}