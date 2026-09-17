import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Search,
  MoreHorizontal,
  Star,
  Clock,
  CheckSquare,
  MessageSquare,
  AlignLeft,
  Tag as TagIcon,
  Users,
  Calendar,
  ArrowLeft,
  Copy,
  Archive,
  Check,
  ChevronDown,
  RefreshCw,
  Columns3,
  Link2,
  Trello,
  GripVertical,
  Palette,
  ArrowRight,
  Paperclip,
  Image as ImageIcon,
  Upload,
  ThumbsUp,
  ExternalLink,
  Info,
  FileText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const QUADRO_FUNDOS = [
  { id: "azul", nome: "Azul", css: "linear-gradient(160deg,#0b5394 0%,#2a7fd4 100%)" },
  { id: "oceano", nome: "Oceano", css: "linear-gradient(160deg,#0f766e 0%,#22a5a0 100%)" },
  { id: "verde", nome: "Verde", css: "linear-gradient(160deg,#166534 0%,#3f9142 100%)" },
  { id: "roxo", nome: "Roxo", css: "linear-gradient(160deg,#5b21b6 0%,#8b5cf6 100%)" },
  { id: "rosa", nome: "Rosa", css: "linear-gradient(160deg,#9d174d 0%,#ec4899 100%)" },
  { id: "vermelho", nome: "Vermelho", css: "linear-gradient(160deg,#991b1b 0%,#ef4444 100%)" },
  { id: "laranja", nome: "Laranja", css: "linear-gradient(160deg,#9a3412 0%,#f97316 100%)" },
  { id: "grafite", nome: "Grafite", css: "linear-gradient(160deg,#1f2937 0%,#475569 100%)" },
];

export const ETIQUETA_CORES = {
  verde: "#4bad51",
  amarelo: "#e2b203",
  laranja: "#f2822b",
  vermelho: "#e2483d",
  roxo: "#9c5ce0",
  azul: "#1f72d9",
  ceu: "#18a0c7",
  limao: "#3fbc8a",
  rosa: "#e771ac",
  cinza: "#626f86",
};

const AVATAR_CORES = ["#1f72d9", "#4bad51", "#f2822b", "#9c5ce0", "#e2483d", "#18a0c7", "#e771ac", "#626f86"];

const ETIQUETAS_PADRAO = () => [
  { id: nid("etq"), nome: "", cor: "verde" },
  { id: nid("etq"), nome: "", cor: "amarelo" },
  { id: nid("etq"), nome: "", cor: "laranja" },
  { id: nid("etq"), nome: "", cor: "vermelho" },
  { id: nid("etq"), nome: "", cor: "roxo" },
  { id: nid("etq"), nome: "", cor: "azul" },
];

export const QUADRO_MODELOS = [
  {
    id: "basico",
    nome: "Básico",
    descricao: "A fazer · Fazendo · Concluído",
    listas: ["A fazer", "Fazendo", "Concluído"],
  },
  {
    id: "producao",
    nome: "Produção (ligado aos pedidos)",
    descricao: "Uma coluna por etapa do pedido. Mover o cartão muda o status do pedido.",
    listas: null, // preenchido com o fluxo de status
  },
  {
    id: "grafica",
    nome: "Fluxo da gráfica",
    descricao: "Pedidos · Arte aprovada · Montar grade · Impressão · Estamparia",
    listas: ["Pedidos", "Arte aprovada", "Montar grade", "Impressão", "Estamparia"],
  },
  {
    id: "vazio",
    nome: "Em branco",
    descricao: "Começar sem nenhuma lista.",
    listas: [],
  },
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function nid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function dataBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function dataCurtaBR(iso) {
  if (!iso) return "";
  const [, m, d] = iso.slice(0, 10).split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${d} ${meses[Number(m) - 1]}`;
}

function dataHoraBR(iso) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()} às ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function diasAte(iso) {
  const a = new Date(`${hojeISO()}T00:00:00`);
  const b = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

function prazoStyle(prazo, feito) {
  if (!prazo) return null;
  if (feito) return { bg: "#dcfce7", fg: "#166534", label: dataCurtaBR(prazo), titulo: "Concluído" };
  const d = diasAte(prazo);
  if (d < 0) return { bg: "#fee2e2", fg: "#b91c1c", label: dataCurtaBR(prazo), titulo: `Atrasado ${Math.abs(d)} dia(s)` };
  if (d === 0) return { bg: "#fef3c7", fg: "#92400e", label: "Hoje", titulo: "Vence hoje" };
  if (d <= 2) return { bg: "#fef3c7", fg: "#92400e", label: dataCurtaBR(prazo), titulo: `Vence em ${d} dia(s)` };
  return { bg: "#eef2f6", fg: "#44546f", label: dataCurtaBR(prazo), titulo: `Vence em ${d} dia(s)` };
}

function iniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function contarChecklist(card) {
  let total = 0;
  let feitos = 0;
  (card.checklists || []).forEach((cl) => {
    (cl.itens || []).forEach((i) => {
      total += 1;
      if (i.feito) feitos += 1;
    });
  });
  return { total, feitos };
}

export function criarQuadro({ titulo, fundo, modelo, statusFlow = [], pedidos = [] }) {
  const base = {
    id: nid("QDR"),
    titulo: titulo.trim() || "Quadro sem nome",
    fundo: fundo || "azul",
    favorito: false,
    criadoEm: new Date().toISOString(),
    vinculoPedidos: modelo === "producao",
    etiquetas: ETIQUETAS_PADRAO(),
    membros: [],
    listas: [],
    arquivadas: { listas: [], cards: [] },
  };

  if (modelo === "producao") {
    base.listas = statusFlow.map((s) => ({
      id: nid("lst"),
      titulo: s,
      statusVinculado: s,
      cards: pedidos
        .filter((p) => p.status === s)
        .map((p) => ({ ...cardVazio(`${p.id} · ${p.cliente}`, s), pedidoId: p.id })),
    }));
    return base;
  }

  const modeloDef = QUADRO_MODELOS.find((m) => m.id === modelo);
  const listas = modeloDef?.listas || [];
  base.listas = listas.map((t) => ({ id: nid("lst"), titulo: t, cards: [] }));
  return base;
}

function cardVazio(titulo, listaTitulo) {
  const agora = new Date().toISOString();
  return {
    id: nid("crd"),
    titulo,
    descricao: "",
    etiquetas: [],
    membros: [],
    prazo: null,
    prazoFeito: false,
    checklists: [],
    comentarios: [],
    atividades: listaTitulo
      ? [{ id: nid("atv"), texto: `adicionou este cartão a ${listaTitulo}`, autor: "Você", data: agora }]
      : [],
    votos: [],
    capa: null,
    capaImagem: null,
    anexos: [],
    pedidoId: null,
    criadoEm: agora,
  };
}

const LIMITE_ANEXO = 1.5 * 1024 * 1024; // 1,5 MB por arquivo

function tamanhoLegivel(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function lerArquivo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

// Reduz uma imagem (escala + qualidade JPEG) até caber no limite de tamanho.
// Tenta várias combinações de escala/qualidade e devolve a melhor combinação
// que couber; se nenhuma couber, devolve null.
function comprimirImagem(file, limiteBytes) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const largura = img.naturalWidth || img.width;
      const altura = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);

      if (!largura || !altura) {
        reject(new Error("Não foi possível ler as dimensões da imagem"));
        return;
      }

      const escalas = [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2];
      const qualidades = [0.85, 0.75, 0.65, 0.55, 0.45];
      let melhor = null;

      const testarEscala = (escalaIdx) => {
        if (escalaIdx >= escalas.length) {
          resolve(melhor);
          return;
        }
        const escala = escalas[escalaIdx];
        const w = Math.max(1, Math.round(largura * escala));
        const h = Math.max(1, Math.round(altura * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const testarQualidade = (qIdx) => {
          if (qIdx >= qualidades.length) {
            testarEscala(escalaIdx + 1);
            return;
          }
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                testarQualidade(qIdx + 1);
                return;
              }
              if (!melhor || blob.size < melhor.blob.size) melhor = { blob, w, h };
              if (blob.size <= limiteBytes) {
                resolve({ blob, w, h });
              } else {
                testarQualidade(qIdx + 1);
              }
            },
            "image/jpeg",
            qualidades[qIdx]
          );
        };
        testarQualidade(0);
      };

      testarEscala(0);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível processar a imagem"));
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// UI auxiliar
// ---------------------------------------------------------------------------

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";

function Popover({ titulo, onClose, children, largura = "w-72", align = "left" }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute z-50 ${align === "right" ? "right-0" : "left-0"} top-full mt-1 ${largura} bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-600">{titulo}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
          <X size={14} />
        </button>
      </div>
      <div className="p-3 max-h-[60vh] overflow-y-auto">{children}</div>
    </div>
  );
}

function ModalBase({ onClose, children, largura = "max-w-3xl" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] overflow-y-auto p-3 sm:p-6" onClick={onClose}>
      <div
        className={`bg-gray-50 rounded-xl shadow-2xl w-full ${largura} mx-auto my-2`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function BotaoTexto({ children, onClick, className = "", ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function Avatar({ membro, size = 24, title }) {
  return (
    <span
      title={title || membro.nome}
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: membro.cor, fontSize: size * 0.4 }}
    >
      {iniciais(membro.nome)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Página principal (roteia entre lista de quadros e um quadro aberto)
// ---------------------------------------------------------------------------

export default function QuadrosPage({ data, setData, showToast, statusFlow }) {
  const [abertoId, setAbertoId] = useState(null);
  const quadros = data.quadros || [];
  const quadroAberto = quadros.find((q) => q.id === abertoId) || null;

  // Helpers de mutação -------------------------------------------------------
  const setQuadros = (fn) =>
    setData((prev) => ({ ...prev, quadros: fn(prev.quadros || []) }));

  const updateQuadro = (id, fn) =>
    setQuadros((qs) => qs.map((q) => (q.id === id ? fn(q) : q)));

  const api = {
    quadros,
    statusFlow,
    showToast,
    abrir: setAbertoId,

    criar: ({ titulo, fundo, modelo }) => {
      const novo = criarQuadro({
        titulo,
        fundo,
        modelo,
        statusFlow,
        pedidos: data.pedidos || [],
      });
      setQuadros((qs) => [...qs, novo]);
      setAbertoId(novo.id);
      showToast("Quadro criado.");
    },

    excluir: (id) => {
      setQuadros((qs) => qs.filter((q) => q.id !== id));
      setAbertoId(null);
      showToast("Quadro excluído.");
    },

    duplicar: (id) => {
      const orig = quadros.find((q) => q.id === id);
      if (!orig) return;
      const clone = JSON.parse(JSON.stringify(orig));
      clone.id = nid("QDR");
      clone.titulo = `${orig.titulo} (cópia)`;
      clone.criadoEm = new Date().toISOString();
      clone.favorito = false;
      clone.listas = clone.listas.map((l) => ({
        ...l,
        id: nid("lst"),
        cards: l.cards.map((c) => ({ ...c, id: nid("crd") })),
      }));
      setQuadros((qs) => [...qs, clone]);
      showToast("Quadro duplicado.");
    },

    patch: (id, patch) => updateQuadro(id, (q) => ({ ...q, ...patch })),
    update: updateQuadro,
    setData,
  };

  if (quadroAberto) {
    return <QuadroView quadro={quadroAberto} api={api} pedidos={data.pedidos || []} onVoltar={() => setAbertoId(null)} />;
  }

  return <QuadrosHome api={api} />;
}

// ---------------------------------------------------------------------------
// Home — grade de quadros
// ---------------------------------------------------------------------------

function QuadrosHome({ api }) {
  const [novo, setNovo] = useState(false);
  const [busca, setBusca] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [excluir, setExcluir] = useState(null);

  const quadros = api.quadros;
  const filtrados = quadros.filter((q) => q.titulo.toLowerCase().includes(busca.toLowerCase()));
  const favoritos = filtrados.filter((q) => q.favorito);
  const demais = filtrados.filter((q) => !q.favorito);

  const fundoDe = (q) => QUADRO_FUNDOS.find((f) => f.id === q.fundo)?.css || QUADRO_FUNDOS[0].css;

  const Cartao = ({ q }) => {
    const cards = q.listas.reduce((a, l) => a + l.cards.length, 0);
    return (
      <div className="relative group">
        <button
          onClick={() => api.abrir(q.id)}
          className="w-full h-28 rounded-xl p-3 text-left text-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          style={{ background: fundoDe(q) }}
        >
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <p className="font-semibold text-sm leading-snug line-clamp-2 relative">{q.titulo}</p>
          <p className="text-[11px] opacity-80 absolute bottom-3 left-3">
            {q.listas.length} lista(s) · {cards} cartão(ões)
          </p>
          {q.vinculoPedidos && (
            <span className="absolute bottom-3 right-3 text-[10px] bg-white/20 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Link2 size={10} /> pedidos
            </span>
          )}
        </button>

        <button
          onClick={() => api.patch(q.id, { favorito: !q.favorito })}
          title={q.favorito ? "Remover dos favoritos" : "Favoritar"}
          className={`absolute top-2 right-9 w-7 h-7 rounded-lg flex items-center justify-center text-white ${
            q.favorito ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } hover:bg-black/20`}
        >
          <Star size={14} fill={q.favorito ? "currentColor" : "none"} />
        </button>

        <div className="absolute top-2 right-2">
          <button
            onClick={() => setMenuId(menuId === q.id ? null : q.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-black/20"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuId === q.id && (
            <div className="relative">
              <Popover titulo="Ações do quadro" onClose={() => setMenuId(null)} largura="w-52" align="right">
                <BotaoTexto
                  onClick={() => {
                    api.abrir(q.id);
                    setMenuId(null);
                  }}
                >
                  <ArrowRight size={14} /> Abrir quadro
                </BotaoTexto>
                <BotaoTexto
                  onClick={() => {
                    api.duplicar(q.id);
                    setMenuId(null);
                  }}
                >
                  <Copy size={14} /> Duplicar
                </BotaoTexto>
                <BotaoTexto
                  onClick={() => {
                    setExcluir(q);
                    setMenuId(null);
                  }}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Excluir
                </BotaoTexto>
              </Popover>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Quadros</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize o trabalho em quadros, listas e cartões — arraste para mover, igual ao Trello.
          </p>
        </div>
        <button
          onClick={() => setNovo(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shrink-0"
        >
          <Plus size={15} /> Criar quadro
        </button>
      </div>

      {quadros.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar quadro..."
            className={`${inputCls} pl-9`}
          />
        </div>
      )}

      {quadros.length === 0 ? (
        <div className="border border-gray-200 rounded-xl p-10 text-center bg-white">
          <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Trello size={18} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-600">Nenhum quadro ainda</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Crie um quadro em branco, use um modelo pronto ou gere um quadro já com os seus pedidos.
          </p>
          <button
            onClick={() => setNovo(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus size={15} /> Criar primeiro quadro
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {favoritos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Star size={12} /> Favoritos
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {favoritos.map((q) => (
                  <Cartao key={q.id} q={q} />
                ))}
              </div>
            </div>
          )}
          <div>
            {favoritos.length > 0 && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Seus quadros</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {demais.map((q) => (
                <Cartao key={q.id} q={q} />
              ))}
              <button
                onClick={() => setNovo(true)}
                className="h-28 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 flex flex-col items-center justify-center gap-1.5 text-sm font-medium"
              >
                <Plus size={17} /> Criar quadro
              </button>
            </div>
          </div>
        </div>
      )}

      {novo && <NovoQuadroModal api={api} onClose={() => setNovo(false)} />}

      {excluir && (
        <ModalBase onClose={() => setExcluir(null)} largura="max-w-sm">
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Excluir quadro</h3>
            <p className="text-sm text-gray-600 mb-5">
              O quadro “{excluir.titulo}” e todos os seus cartões serão apagados. Os pedidos do sistema não são afetados.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setExcluir(null)}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  api.excluir(excluir.id);
                  setExcluir(null);
                }}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}

function NovoQuadroModal({ api, onClose }) {
  const [titulo, setTitulo] = useState("");
  const [fundo, setFundo] = useState("azul");
  const [modelo, setModelo] = useState("basico");
  const fundoCss = QUADRO_FUNDOS.find((f) => f.id === fundo).css;

  const submit = (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    api.criar({ titulo, fundo, modelo });
    onClose();
  };

  return (
    <ModalBase onClose={onClose} largura="max-w-md">
      <form onSubmit={submit} className="bg-white rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Criar quadro</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <div className="h-24 rounded-lg mb-4 p-3 text-white relative overflow-hidden" style={{ background: fundoCss }}>
            <p className="text-sm font-semibold">{titulo || "Nome do quadro"}</p>
            <div className="absolute bottom-0 left-3 right-3 flex gap-1.5">
              <span className="h-10 flex-1 bg-white/85 rounded-t-md" />
              <span className="h-8 flex-1 bg-white/70 rounded-t-md" />
              <span className="h-12 flex-1 bg-white/60 rounded-t-md" />
            </div>
          </div>

          <label className="block mb-4">
            <span className="block text-xs font-medium text-gray-500 mb-1">Nome do quadro *</span>
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={inputCls}
              placeholder="Ex.: Produção da semana"
            />
          </label>

          <div className="mb-4">
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Fundo</span>
            <div className="flex flex-wrap gap-2">
              {QUADRO_FUNDOS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  title={f.nome}
                  onClick={() => setFundo(f.id)}
                  className="w-10 h-8 rounded-md relative"
                  style={{ background: f.css }}
                >
                  {fundo === f.id && (
                    <Check size={14} className="text-white absolute inset-0 m-auto drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Começar com</span>
            <div className="space-y-2">
              {QUADRO_MODELOS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModelo(m.id)}
                  className={`w-full text-left border rounded-lg px-3 py-2.5 ${
                    modelo === m.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    {m.nome}
                    {m.id === "producao" && <Link2 size={12} className="text-blue-600" />}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.descricao}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo.trim()}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 disabled:opacity-40"
            >
              Criar
            </button>
          </div>
        </div>
      </form>
    </ModalBase>
  );
}

// ---------------------------------------------------------------------------
// Visualização de um quadro
// ---------------------------------------------------------------------------

function QuadroView({ quadro, api, pedidos, onVoltar }) {
  const [cardAberto, setCardAberto] = useState(null); // { listaId, cardId }
  const [menuQuadro, setMenuQuadro] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [novaLista, setNovaLista] = useState(false);
  const [filtro, setFiltro] = useState({ texto: "", etiquetas: [], membros: [], prazo: "" });

  const railRef = useRef(null);
  const ghostRef = useRef(null);
  const dnd = useRef({ pending: null, drag: null, over: null, x: 0, y: 0, scroll: null });
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [ativo, setAtivo] = useState(false);

  const fundo = QUADRO_FUNDOS.find((f) => f.id === quadro.fundo)?.css || QUADRO_FUNDOS[0].css;

  // ---- mutações -----------------------------------------------------------
  const upd = (fn) => api.update(quadro.id, fn);
  const updListas = (fn) => upd((q) => ({ ...q, listas: fn(q.listas) }));
  const updLista = (listaId, fn) => updListas((ls) => ls.map((l) => (l.id === listaId ? fn(l) : l)));
  const updCard = (listaId, cardId, fn) =>
    updLista(listaId, (l) => ({ ...l, cards: l.cards.map((c) => (c.id === cardId ? fn(c) : c)) }));

  const addLista = (titulo) => {
    if (!titulo.trim()) return;
    updListas((ls) => [...ls, { id: nid("lst"), titulo: titulo.trim(), cards: [] }]);
  };

  const addCard = (listaId, titulo, noTopo = false) => {
    if (!titulo.trim()) return;
    updLista(listaId, (l) => {
      const novo = cardVazio(titulo.trim(), l.titulo);
      return { ...l, cards: noTopo ? [novo, ...l.cards] : [...l.cards, novo] };
    });
  };

  const removerLista = (listaId) => updListas((ls) => ls.filter((l) => l.id !== listaId));

  const removerCard = (listaId, cardId) =>
    updLista(listaId, (l) => ({ ...l, cards: l.cards.filter((c) => c.id !== cardId) }));

  const duplicarCard = (listaId, cardId) =>
    updLista(listaId, (l) => {
      const i = l.cards.findIndex((c) => c.id === cardId);
      if (i < 0) return l;
      const original = l.cards[i];
      const copia = {
        ...JSON.parse(JSON.stringify(original)),
        id: nid("crd"),
        pedidoId: null,
        comentarios: [],
        votos: [],
        atividades: [
          {
            id: nid("atv"),
            texto: `duplicou este cartão a partir de "${original.titulo}"`,
            autor: "Você",
            data: new Date().toISOString(),
          },
        ],
      };
      const cards = [...l.cards];
      cards.splice(i + 1, 0, copia);
      return { ...l, cards };
    });

  const moverCard = (fromId, cardId, toId, index) => {
    api.setData((prev) => {
      let cardMovido = null;
      let origemTitulo = "";
      const quadros = (prev.quadros || []).map((q) => {
        if (q.id !== quadro.id) return q;
        let card = null;
        let listas = q.listas.map((l) => {
          if (l.id !== fromId) return l;
          card = l.cards.find((c) => c.id === cardId) || null;
          origemTitulo = l.titulo;
          return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
        });
        if (!card) return q;
        cardMovido = card;
        listas = listas.map((l) => {
          if (l.id !== toId) return l;
          const cards = [...l.cards];
          const cardFinal =
            fromId === toId
              ? card
              : {
                  ...card,
                  atividades: [
                    {
                      id: nid("atv"),
                      texto: `moveu este cartão de ${origemTitulo} para ${l.titulo}`,
                      autor: "Você",
                      data: new Date().toISOString(),
                    },
                    ...(card.atividades || []),
                  ],
                };
          cards.splice(Math.max(0, Math.min(index, cards.length)), 0, cardFinal);
          return { ...l, cards };
        });
        return { ...q, listas };
      });

      let pedidosNext = prev.pedidos;
      const q = quadros.find((x) => x.id === quadro.id);
      const destino = q?.listas.find((l) => l.id === toId);
      if (q?.vinculoPedidos && destino?.statusVinculado && cardMovido?.pedidoId) {
        pedidosNext = (prev.pedidos || []).map((p) =>
          p.id === cardMovido.pedidoId ? { ...p, status: destino.statusVinculado } : p
        );
      }
      return { ...prev, quadros, pedidos: pedidosNext };
    });
  };

  const moverLista = (listaId, index) =>
    updListas((ls) => {
      const i = ls.findIndex((l) => l.id === listaId);
      if (i < 0) return ls;
      const copia = [...ls];
      const [item] = copia.splice(i, 1);
      copia.splice(Math.max(0, Math.min(index, copia.length)), 0, item);
      return copia;
    });

  const sincronizarPedidos = () => {
    let add = 0;
    let mov = 0;
    let rem = 0;
    upd((q) => {
      const listasPorStatus = {};
      q.listas.forEach((l) => {
        if (l.statusVinculado) listasPorStatus[l.statusVinculado] = l.id;
      });
      const idsPedidos = new Set((pedidos || []).map((p) => p.id));

      // remove cartões de pedidos que não existem mais
      let listas = q.listas.map((l) => {
        const cards = l.cards.filter((c) => {
          if (!c.pedidoId) return true;
          const ok = idsPedidos.has(c.pedidoId);
          if (!ok) rem += 1;
          return ok;
        });
        return { ...l, cards };
      });

      // move cartões cujo pedido mudou de status fora do quadro
      const mapaCard = {};
      listas.forEach((l) => l.cards.forEach((c) => c.pedidoId && (mapaCard[c.pedidoId] = { listaId: l.id, card: c })));

      (pedidos || []).forEach((p) => {
        const destinoId = listasPorStatus[p.status];
        if (!destinoId) return;
        const atual = mapaCard[p.id];
        if (!atual) {
          listas = listas.map((l) =>
            l.id === destinoId
              ? { ...l, cards: [...l.cards, { ...cardVazio(`${p.id} · ${p.cliente}`), pedidoId: p.id }] }
              : l
          );
          add += 1;
        } else if (atual.listaId !== destinoId) {
          listas = listas.map((l) => {
            if (l.id === atual.listaId) return { ...l, cards: l.cards.filter((c) => c.id !== atual.card.id) };
            if (l.id === destinoId) return { ...l, cards: [...l.cards, atual.card] };
            return l;
          });
          mov += 1;
        }
      });

      return { ...q, listas };
    });
    api.showToast(`Sincronizado: ${add} novo(s), ${mov} movido(s), ${rem} removido(s).`);
  };

  // ---- filtro -------------------------------------------------------------
  const filtroAtivo =
    !!filtro.texto || filtro.etiquetas.length > 0 || filtro.membros.length > 0 || !!filtro.prazo;

  const passaFiltro = (card, pedido) => {
    if (!filtroAtivo) return true;
    const texto = `${card.titulo} ${card.descricao} ${pedido ? `${pedido.id} ${pedido.cliente} ${pedido.produto}` : ""}`.toLowerCase();
    if (filtro.texto && !texto.includes(filtro.texto.toLowerCase())) return false;
    if (filtro.etiquetas.length && !filtro.etiquetas.some((e) => (card.etiquetas || []).includes(e))) return false;
    if (filtro.membros.length && !filtro.membros.some((m) => (card.membros || []).includes(m))) return false;
    if (filtro.prazo) {
      const prazo = card.prazo || pedido?.dataEntrega || null;
      if (filtro.prazo === "sem" && prazo) return false;
      if (filtro.prazo === "atrasado" && !(prazo && !card.prazoFeito && diasAte(prazo) < 0)) return false;
      if (filtro.prazo === "semana" && !(prazo && diasAte(prazo) >= 0 && diasAte(prazo) <= 7)) return false;
      if (filtro.prazo === "concluido" && !card.prazoFeito) return false;
    }
    return true;
  };

  // ---- drag & drop --------------------------------------------------------
  const pararScroll = () => {
    if (dnd.current.scroll) {
      clearInterval(dnd.current.scroll);
      dnd.current.scroll = null;
    }
  };

  const limpar = () => {
    dnd.current.pending = null;
    dnd.current.drag = null;
    dnd.current.over = null;
    pararScroll();
    setDrag(null);
    setOver(null);
    setAtivo(false);
    document.body.style.userSelect = "";
  };

  const iniciarDrag = () => {
    const p = dnd.current.pending;
    if (!p) return;
    dnd.current.pending = null;
    dnd.current.drag = p;
    setDrag(p);
    document.body.style.userSelect = "none";
    dnd.current.scroll = setInterval(() => {
      const rail = railRef.current;
      if (!rail || !dnd.current.drag) return;
      const r = rail.getBoundingClientRect();
      const x = dnd.current.x;
      if (x < r.left + 70) rail.scrollLeft -= 14;
      else if (x > r.right - 70) rail.scrollLeft += 14;
      // rolagem vertical dentro da lista sob o cursor
      if (dnd.current.drag.type === "card" && dnd.current.over) {
        const listaEl = rail.querySelector(`[data-list-id="${dnd.current.over.listaId}"] [data-cards]`);
        if (listaEl) {
          const lr = listaEl.getBoundingClientRect();
          if (dnd.current.y < lr.top + 40) listaEl.scrollTop -= 12;
          else if (dnd.current.y > lr.bottom - 40) listaEl.scrollTop += 12;
        }
      }
    }, 16);
  };

  const calcularOver = (x, y) => {
    const d = dnd.current.drag;
    if (!d) return;
    const rail = railRef.current;
    if (!rail) return;
    const alvo = document.elementFromPoint(x, y);

    if (d.type === "lista") {
      const nodes = [...rail.querySelectorAll("[data-list-id]")].filter(
        (n) => n.getAttribute("data-list-id") !== d.id
      );
      let index = nodes.length;
      for (let i = 0; i < nodes.length; i++) {
        const r = nodes[i].getBoundingClientRect();
        if (x < r.left + r.width / 2) {
          index = i;
          break;
        }
      }
      const novo = { index };
      dnd.current.over = novo;
      setOver((o) => (o && o.index === index ? o : novo));
      return;
    }

    const listaEl = alvo && alvo.closest ? alvo.closest("[data-list-id]") : null;
    if (!listaEl) return;
    const listaId = listaEl.getAttribute("data-list-id");
    const container = listaEl.querySelector("[data-cards]");
    let index = 0;
    if (container) {
      const nodes = [...container.querySelectorAll("[data-card-id]")];
      index = nodes.length;
      for (let i = 0; i < nodes.length; i++) {
        const r = nodes[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) {
          index = i;
          break;
        }
      }
    }
    const novo = { listaId, index };
    dnd.current.over = novo;
    setOver((o) => (o && o.listaId === listaId && o.index === index ? o : novo));
  };

  const onPointerDownItem = (e, info) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("[data-nodrag]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const toque = e.pointerType !== "mouse";
    dnd.current.pending = {
      ...info,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      toque,
    };
    dnd.current.x = e.clientX;
    dnd.current.y = e.clientY;
    setAtivo(true);
    if (toque) {
      const alvoId = info.id;
      setTimeout(() => {
        const p = dnd.current.pending;
        if (p && p.id === alvoId) iniciarDrag();
      }, 190);
    }
  };

  useEffect(() => {
    if (!ativo) return;

    const onMove = (e) => {
      dnd.current.x = e.clientX;
      dnd.current.y = e.clientY;
      const d = dnd.current.drag;
      const p = dnd.current.pending;
      if (d) {
        e.preventDefault();
        if (ghostRef.current) {
          ghostRef.current.style.transform = `translate(${e.clientX - d.offsetX}px, ${e.clientY - d.offsetY}px) rotate(3deg)`;
        }
        calcularOver(e.clientX, e.clientY);
      } else if (p) {
        const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
        if (p.toque) {
          if (dist > 10) dnd.current.pending = null; // deixa a página rolar
        } else if (dist > 5) {
          iniciarDrag();
        }
      }
    };

    const onUp = () => {
      const d = dnd.current.drag;
      const o = dnd.current.over;
      if (d && o) {
        if (d.type === "card" && (o.listaId !== d.fromListId || o.index !== d.index)) {
          moverCard(d.fromListId, d.id, o.listaId, o.index);
        } else if (d.type === "lista" && o.index !== d.index) {
          moverLista(d.id, o.index);
        }
      }
      limpar();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, quadro]);

  useEffect(() => {
    if (drag && ghostRef.current) {
      ghostRef.current.style.transform = `translate(${dnd.current.x - drag.offsetX}px, ${dnd.current.y - drag.offsetY}px) rotate(3deg)`;
    }
  }, [drag]);

  useEffect(() => () => limpar(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- render -------------------------------------------------------------
  const cardEmDrag = useMemo(() => {
    if (!drag || drag.type !== "card") return null;
    const l = quadro.listas.find((x) => x.id === drag.fromListId);
    return l?.cards.find((c) => c.id === drag.id) || null;
  }, [drag, quadro]);

  const listaEmDrag = drag?.type === "lista" ? quadro.listas.find((l) => l.id === drag.id) : null;

  let listasRender = quadro.listas;
  if (drag?.type === "lista") {
    const semArrastada = quadro.listas.filter((l) => l.id !== drag.id);
    listasRender = semArrastada;
  }

  const cardDoModal = (() => {
    if (!cardAberto) return null;
    const l = quadro.listas.find((x) => x.id === cardAberto.listaId);
    const c = l?.cards.find((x) => x.id === cardAberto.cardId);
    return c ? { lista: l, card: c } : null;
  })();

  const totalCards = quadro.listas.reduce((a, l) => a + l.cards.length, 0);

  return (
    <div
      className="-mx-4 sm:-mx-6 md:-mx-8 -mb-4 sm:-mb-6 md:-mb-8 -mt-20 md:-mt-8 flex flex-col"
      style={{ background: fundo, minHeight: "100vh" }}
    >
      {/* Barra do quadro */}
      <div className="pt-16 md:pt-0 px-3 sm:px-5 py-3 flex flex-wrap items-center gap-2 bg-black/15 backdrop-blur-sm">
        <button
          onClick={onVoltar}
          className="h-8 px-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm flex items-center gap-1.5"
        >
          <ArrowLeft size={15} /> Quadros
        </button>

        {editandoTitulo ? (
          <input
            autoFocus
            defaultValue={quadro.titulo}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) api.patch(quadro.id, { titulo: v });
              setEditandoTitulo(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditandoTitulo(false);
            }}
            className="h-8 px-2 rounded-lg text-sm font-semibold outline-none bg-white text-gray-900 w-48"
          />
        ) : (
          <button
            onClick={() => setEditandoTitulo(true)}
            className="h-8 px-2.5 rounded-lg hover:bg-white/20 text-white font-semibold text-base truncate max-w-[45vw]"
          >
            {quadro.titulo}
          </button>
        )}

        <button
          onClick={() => api.patch(quadro.id, { favorito: !quadro.favorito })}
          className="h-8 w-8 rounded-lg hover:bg-white/20 text-white flex items-center justify-center"
          title="Favoritar"
        >
          <Star size={15} fill={quadro.favorito ? "currentColor" : "none"} />
        </button>

        {quadro.vinculoPedidos && (
          <span className="h-8 px-2.5 rounded-lg bg-white/20 text-white text-xs flex items-center gap-1.5">
            <Link2 size={12} /> Ligado aos pedidos
          </span>
        )}

        <div className="flex-1" />

        <div className="relative">
          <button
            onClick={() => setFiltroAberto(!filtroAberto)}
            className={`h-8 px-2.5 rounded-lg text-sm flex items-center gap-1.5 ${
              filtroAtivo ? "bg-white text-gray-900 font-medium" : "bg-white/20 hover:bg-white/30 text-white"
            }`}
          >
            <Search size={14} /> Filtrar
            {filtroAtivo && (
              <span className="bg-gray-900 text-white text-[10px] rounded-full px-1.5">
                {(filtro.texto ? 1 : 0) + filtro.etiquetas.length + filtro.membros.length + (filtro.prazo ? 1 : 0)}
              </span>
            )}
          </button>
          {filtroAberto && (
            <FiltroPopover
              quadro={quadro}
              filtro={filtro}
              setFiltro={setFiltro}
              onClose={() => setFiltroAberto(false)}
            />
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuQuadro(!menuQuadro)}
            className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuQuadro && (
            <MenuQuadro
              quadro={quadro}
              api={api}
              totalCards={totalCards}
              onSincronizar={sincronizarPedidos}
              onClose={() => setMenuQuadro(false)}
              onVoltar={onVoltar}
            />
          )}
        </div>
      </div>

      {/* Trilho de listas */}
      <div
        ref={railRef}
        className="flex-1 flex items-start gap-3 overflow-x-auto overflow-y-hidden p-3 sm:p-4"
        style={{ touchAction: drag ? "none" : "auto" }}
      >
        {listasRender.map((lista, i) => {
          const placeholderAntes = drag?.type === "lista" && over?.index === i;
          return (
            <div key={lista.id} className="flex items-start gap-3 shrink-0">
              {placeholderAntes && (
                <div
                  className="rounded-xl bg-white/25 border-2 border-dashed border-white/50 shrink-0"
                  style={{ width: drag.width, height: Math.min(drag.height, 320) }}
                />
              )}
              <ListaColuna
                lista={lista}
                quadro={quadro}
                pedidos={pedidos}
                drag={drag}
                over={over}
                passaFiltro={passaFiltro}
                onPointerDownItem={onPointerDownItem}
                onAbrirCard={(cardId) => setCardAberto({ listaId: lista.id, cardId })}
                onAddCard={addCard}
                onRenomear={(t) => updLista(lista.id, (l) => ({ ...l, titulo: t }))}
                onRemover={() => removerLista(lista.id)}
                onLimparCards={() => updLista(lista.id, (l) => ({ ...l, cards: [] }))}
                onDuplicarCard={duplicarCard}
                onRemoverCard={removerCard}
              />
            </div>
          );
        })}

        {drag?.type === "lista" && over?.index >= listasRender.length && (
          <div
            className="rounded-xl bg-white/25 border-2 border-dashed border-white/50 shrink-0"
            style={{ width: drag.width, height: Math.min(drag.height, 320) }}
          />
        )}

        {/* Adicionar lista */}
        <div className="w-72 shrink-0">
          {quadro.listas.length === 0 && !novaLista && (
            <p className="text-xs text-white/80 mb-2 leading-relaxed">
              Crie sua primeira lista (ex.: “A fazer”). Depois arraste os cartões entre elas — no celular,
              segure o cartão por um instante para arrastar.
            </p>
          )}
          {novaLista ? (
            <FormularioRapido
              placeholder="Nome da lista"
              botao="Adicionar lista"
              onSubmit={(v) => addLista(v)}
              onCancel={() => setNovaLista(false)}
              manterAberto
            />
          ) : (
            <button
              onClick={() => setNovaLista(true)}
              className="w-full text-left bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-2.5 text-sm font-medium flex items-center gap-2"
            >
              <Plus size={15} /> Adicionar lista
            </button>
          )}
        </div>
      </div>

      {/* Fantasma do arrasto */}
      {drag && (
        <div
          ref={ghostRef}
          className="fixed top-0 left-0 z-[80] pointer-events-none opacity-90"
          style={{ width: drag.width }}
        >
          {drag.type === "card" && cardEmDrag ? (
            <CartaoVisual
              card={cardEmDrag}
              quadro={quadro}
              pedido={cardEmDrag.pedidoId ? pedidos.find((p) => p.id === cardEmDrag.pedidoId) : null}
              sombra
            />
          ) : listaEmDrag ? (
            <div className="bg-gray-100 rounded-xl p-2.5 shadow-2xl">
              <p className="text-sm font-semibold text-gray-800 px-1">{listaEmDrag.titulo}</p>
              <p className="text-xs text-gray-500 px-1 mt-1">{listaEmDrag.cards.length} cartão(ões)</p>
            </div>
          ) : null}
        </div>
      )}

      {cardDoModal && (
        <CardModal
          quadro={quadro}
          lista={cardDoModal.lista}
          card={cardDoModal.card}
          pedidos={pedidos}
          api={api}
          onClose={() => setCardAberto(null)}
          updCard={updCard}
          moverCard={moverCard}
          removerCard={(lid, cid) => {
            removerCard(lid, cid);
            setCardAberto(null);
          }}
          duplicarCard={duplicarCard}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coluna (lista)
// ---------------------------------------------------------------------------

function ListaColuna({
  lista,
  quadro,
  pedidos,
  drag,
  over,
  passaFiltro,
  onPointerDownItem,
  onAbrirCard,
  onAddCard,
  onRenomear,
  onRemover,
  onLimparCards,
  onDuplicarCard,
  onRemoverCard,
}) {
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const [compositor, setCompositor] = useState(null); // 'topo' | 'fim' | null
  const [confirmar, setConfirmar] = useState(false);

  const arrastandoDaqui = drag?.type === "card";
  const cardsVisiveis = lista.cards.filter((c) => {
    if (drag?.type === "card" && drag.id === c.id) return false;
    const pedido = c.pedidoId ? pedidos.find((p) => p.id === c.pedidoId) : null;
    return passaFiltro(c, pedido);
  });
  const placeholderIndex = arrastandoDaqui && over?.listaId === lista.id ? over.index : -1;
  const ocultos = lista.cards.length - cardsVisiveis.length - (drag?.type === "card" && drag.fromListId === lista.id ? 1 : 0);

  return (
    <div
      data-list-id={lista.id}
      className="w-72 shrink-0 bg-gray-100 rounded-xl flex flex-col max-h-[calc(100vh-11rem)]"
    >
      {/* cabeçalho */}
      <div
        className="flex items-center gap-1 px-2.5 pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) =>
          onPointerDownItem(e, {
            type: "lista",
            id: lista.id,
            index: quadro.listas.findIndex((l) => l.id === lista.id),
          })
        }
      >
        <GripVertical size={13} className="text-gray-400 shrink-0" />
        {editando ? (
          <input
            autoFocus
            data-nodrag
            defaultValue={lista.titulo}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) onRenomear(v);
              setEditando(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditando(false);
            }}
            className="flex-1 min-w-0 text-sm font-semibold bg-white border border-blue-400 rounded px-1.5 py-1 outline-none"
          />
        ) : (
          <button
            data-nodrag
            onClick={() => setEditando(true)}
            className="flex-1 min-w-0 text-left text-sm font-semibold text-gray-800 px-1 py-1 rounded hover:bg-gray-200 truncate"
            title={lista.titulo}
          >
            {lista.titulo}
          </button>
        )}
        <span className="text-[11px] text-gray-500 shrink-0 px-1">{lista.cards.length}</span>
        <div className="relative shrink-0">
          <button
            data-nodrag
            onClick={() => setMenu(!menu)}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <MoreHorizontal size={14} />
          </button>
          {menu && (
            <Popover titulo="Ações da lista" onClose={() => setMenu(false)} largura="w-56" align="right">
              <BotaoTexto
                onClick={() => {
                  setCompositor("topo");
                  setMenu(false);
                }}
              >
                <Plus size={14} /> Adicionar cartão no topo
              </BotaoTexto>
              <BotaoTexto
                onClick={() => {
                  setEditando(true);
                  setMenu(false);
                }}
              >
                <Pencil size={14} /> Renomear lista
              </BotaoTexto>
              <BotaoTexto
                onClick={() => {
                  onLimparCards();
                  setMenu(false);
                }}
              >
                <Archive size={14} /> Limpar cartões
              </BotaoTexto>
              <BotaoTexto
                onClick={() => {
                  setConfirmar(true);
                  setMenu(false);
                }}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} /> Excluir lista
              </BotaoTexto>
            </Popover>
          )}
        </div>
      </div>

      {lista.statusVinculado && (
        <p className="px-3.5 pb-1 text-[10px] text-gray-500 flex items-center gap-1">
          <Link2 size={10} /> status “{lista.statusVinculado}”
        </p>
      )}

      {compositor === "topo" && (
        <div className="px-2.5 pb-1">
          <FormularioRapido
            placeholder="Título do cartão"
            botao="Adicionar cartão"
            escuro={false}
            onSubmit={(v) => onAddCard(lista.id, v, true)}
            onCancel={() => setCompositor(null)}
            manterAberto
          />
        </div>
      )}

      {/* cartões */}
      <div data-cards className="px-2.5 pb-1 space-y-2 overflow-y-auto flex-1 min-h-[8px]">
        {cardsVisiveis.map((card, i) => {
          const pedido = card.pedidoId ? pedidos.find((p) => p.id === card.pedidoId) : null;
          return (
            <Fragment key={card.id}>
              {placeholderIndex === i && <Placeholder altura={drag.height} />}
              <div
                data-card-id={card.id}
                onPointerDown={(e) =>
                  onPointerDownItem(e, {
                    type: "card",
                    id: card.id,
                    fromListId: lista.id,
                    index: lista.cards.findIndex((c) => c.id === card.id),
                  })
                }
                onClick={() => onAbrirCard(card.id)}
                className="cursor-pointer"
              >
                <CartaoVisual
                  card={card}
                  quadro={quadro}
                  pedido={pedido}
                  onDuplicar={() => onDuplicarCard(lista.id, card.id)}
                  onRemover={() => onRemoverCard(lista.id, card.id)}
                />
              </div>
            </Fragment>
          );
        })}
        {placeholderIndex >= cardsVisiveis.length && <Placeholder altura={drag.height} />}

        {cardsVisiveis.length === 0 && placeholderIndex < 0 && (
          <p className="text-[11px] text-gray-400 text-center py-4">Sem cartões</p>
        )}
        {ocultos > 0 && (
          <p className="text-[11px] text-gray-400 text-center py-1">{ocultos} cartão(ões) oculto(s) pelo filtro</p>
        )}
      </div>

      {/* rodapé */}
      <div className="p-2">
        {compositor === "fim" ? (
          <FormularioRapido
            placeholder="Título do cartão"
            botao="Adicionar cartão"
            onSubmit={(v) => onAddCard(lista.id, v)}
            onCancel={() => setCompositor(null)}
            manterAberto
          />
        ) : (
          <button
            onClick={() => setCompositor("fim")}
            className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-200 flex items-center gap-2"
          >
            <Plus size={15} /> Adicionar cartão
          </button>
        )}
      </div>

      {confirmar && (
        <ModalBase onClose={() => setConfirmar(false)} largura="max-w-sm">
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Excluir lista</h3>
            <p className="text-sm text-gray-600 mb-5">
              A lista “{lista.titulo}” e seus {lista.cards.length} cartão(ões) serão apagados.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmar(false)}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onRemover();
                  setConfirmar(false);
                }}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}

function Placeholder({ altura }) {
  return (
    <div
      className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-200/60"
      style={{ height: Math.min(altura || 60, 160) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Cartão
// ---------------------------------------------------------------------------

function CartaoVisual({ card, quadro, pedido, sombra, onDuplicar, onRemover }) {
  const [menu, setMenu] = useState(false);
  const etiquetas = (card.etiquetas || [])
    .map((id) => quadro.etiquetas.find((e) => e.id === id))
    .filter(Boolean);
  const membros = (card.membros || [])
    .map((id) => quadro.membros.find((m) => m.id === id))
    .filter(Boolean);
  const { total, feitos } = contarChecklist(card);
  const prazo = card.prazo || pedido?.dataEntrega || null;
  const estiloPrazo = prazoStyle(prazo, card.prazoFeito);
  const titulo = pedido ? `${pedido.id} · ${pedido.cliente}` : card.titulo;
  const anexos = card.anexos || [];
  const capaImg = card.capaImagem ? anexos.find((a) => a.id === card.capaImagem) : null;

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 hover:border-gray-400 ${
        sombra ? "shadow-2xl" : "shadow-sm"
      } overflow-hidden`}
    >
      {capaImg ? (
        <img src={capaImg.url} alt="" className="w-full h-36 object-cover bg-gray-100" draggable={false} />
      ) : (
        card.capa && <div className="h-8" style={{ background: ETIQUETA_CORES[card.capa] }} />
      )}
      <div className="p-2.5">
        {etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {etiquetas.map((e) => (
              <span
                key={e.id}
                title={e.nome || e.cor}
                className="h-2 rounded-full"
                style={{ background: ETIQUETA_CORES[e.cor], width: e.nome ? "auto" : 28, minWidth: 28 }}
              >
                {e.nome && <span className="text-[10px] text-white px-1.5 font-medium leading-none">{e.nome}</span>}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-start gap-1">
          <p className="text-sm text-gray-800 leading-snug flex-1 break-words">{titulo}</p>
          {(onDuplicar || onRemover) && (
            <div className="relative shrink-0">
              <button
                data-nodrag
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu(!menu);
                }}
                className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                <MoreHorizontal size={13} />
              </button>
              {menu && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Popover titulo="Cartão" onClose={() => setMenu(false)} largura="w-44" align="right">
                    <BotaoTexto
                      onClick={() => {
                        onDuplicar();
                        setMenu(false);
                      }}
                    >
                      <Copy size={14} /> Duplicar
                    </BotaoTexto>
                    <BotaoTexto onClick={() => onRemover()} className="text-red-600 hover:bg-red-50">
                      <Trash2 size={14} /> Excluir
                    </BotaoTexto>
                  </Popover>
                </div>
              )}
            </div>
          )}
        </div>

        {pedido && (
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            {pedido.produto} · {pedido.qtd} un.
          </p>
        )}

        {(estiloPrazo ||
          card.descricao ||
          total > 0 ||
          (card.comentarios || []).length > 0 ||
          anexos.length > 0 ||
          membros.length > 0) && (
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {estiloPrazo && (
              <span
                title={estiloPrazo.titulo}
                className="text-[11px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ background: estiloPrazo.bg, color: estiloPrazo.fg }}
              >
                <Clock size={11} /> {estiloPrazo.label}
              </span>
            )}
            {card.descricao && <AlignLeft size={13} className="text-gray-400" title="Tem descrição" />}
            {total > 0 && (
              <span
                className={`text-[11px] flex items-center gap-1 ${
                  feitos === total ? "text-emerald-600 font-medium" : "text-gray-500"
                }`}
              >
                <CheckSquare size={12} /> {feitos}/{total}
              </span>
            )}
            {(card.comentarios || []).length > 0 && (
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <MessageSquare size={12} /> {card.comentarios.length}
              </span>
            )}
            {anexos.length > 0 && (
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <Paperclip size={12} /> {anexos.length}
              </span>
            )}
            {pedido && <Link2 size={12} className="text-blue-500" title="Ligado ao pedido" />}
            <div className="flex-1" />
            <div className="flex -space-x-1.5">
              {membros.slice(0, 3).map((m) => (
                <Avatar key={m.id} membro={m} size={22} />
              ))}
              {membros.length > 3 && (
                <span className="w-[22px] h-[22px] rounded-full bg-gray-200 text-[10px] text-gray-600 flex items-center justify-center font-semibold">
                  +{membros.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário rápido (nova lista / novo cartão)
// ---------------------------------------------------------------------------

function FormularioRapido({ placeholder, botao, onSubmit, onCancel, manterAberto }) {
  const [valor, setValor] = useState("");
  const ref = useRef(null);

  const enviar = () => {
    if (!valor.trim()) return;
    onSubmit(valor);
    setValor("");
    if (manterAberto) ref.current?.focus();
    else onCancel();
  };

  return (
    <div className="bg-white rounded-lg p-2 shadow-sm">
      <textarea
        ref={ref}
        autoFocus
        rows={2}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            enviar();
          }
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="w-full text-sm outline-none resize-none px-1.5 py-1 rounded border border-transparent focus:border-blue-400"
      />
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={enviar}
          className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-blue-700"
        >
          {botao}
        </button>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={17} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filtro e menu do quadro
// ---------------------------------------------------------------------------

function FiltroPopover({ quadro, filtro, setFiltro, onClose }) {
  const toggle = (campo, valor) =>
    setFiltro((f) => ({
      ...f,
      [campo]: f[campo].includes(valor) ? f[campo].filter((x) => x !== valor) : [...f[campo], valor],
    }));

  return (
    <Popover titulo="Filtrar cartões" onClose={onClose} largura="w-72" align="right">
      <input
        autoFocus
        value={filtro.texto}
        onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value }))}
        placeholder="Buscar por título, descrição, pedido..."
        className={`${inputCls} mb-3`}
      />

      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Prazo</p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {[
          ["", "Qualquer"],
          ["atrasado", "Atrasados"],
          ["semana", "Próx. 7 dias"],
          ["sem", "Sem prazo"],
          ["concluido", "Concluídos"],
        ].map(([v, label]) => (
          <button
            key={v || "todos"}
            onClick={() => setFiltro((f) => ({ ...f, prazo: v }))}
            className={`text-xs px-2 py-1.5 rounded-lg border ${
              filtro.prazo === v ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {quadro.etiquetas.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Etiquetas</p>
          <div className="space-y-1 mb-3">
            {quadro.etiquetas.map((e) => (
              <button
                key={e.id}
                onClick={() => toggle("etiquetas", e.id)}
                className="w-full flex items-center gap-2 px-1 py-1 rounded hover:bg-gray-50"
              >
                <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center">
                  {filtro.etiquetas.includes(e.id) && <Check size={11} />}
                </span>
                <span className="h-5 flex-1 rounded px-2 text-[11px] text-white font-medium flex items-center" style={{ background: ETIQUETA_CORES[e.cor] }}>
                  {e.nome}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {quadro.membros.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Membros</p>
          <div className="space-y-1 mb-3">
            {quadro.membros.map((m) => (
              <button
                key={m.id}
                onClick={() => toggle("membros", m.id)}
                className="w-full flex items-center gap-2 px-1 py-1 rounded hover:bg-gray-50"
              >
                <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center">
                  {filtro.membros.includes(m.id) && <Check size={11} />}
                </span>
                <Avatar membro={m} size={22} />
                <span className="text-sm text-gray-700">{m.nome}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => setFiltro({ texto: "", etiquetas: [], membros: [], prazo: "" })}
        className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg py-2 hover:bg-gray-50"
      >
        Limpar filtros
      </button>
    </Popover>
  );
}

function MenuQuadro({ quadro, api, totalCards, onSincronizar, onClose, onVoltar }) {
  const [aba, setAba] = useState("menu");
  const [confirmar, setConfirmar] = useState(false);
  const [novoMembro, setNovoMembro] = useState("");

  const addMembro = () => {
    if (!novoMembro.trim()) return;
    api.update(quadro.id, (q) => ({
      ...q,
      membros: [
        ...q.membros,
        { id: nid("mbr"), nome: novoMembro.trim(), cor: AVATAR_CORES[q.membros.length % AVATAR_CORES.length] },
      ],
    }));
    setNovoMembro("");
  };

  const removerMembro = (id) =>
    api.update(quadro.id, (q) => ({
      ...q,
      membros: q.membros.filter((m) => m.id !== id),
      listas: q.listas.map((l) => ({
        ...l,
        cards: l.cards.map((c) => ({ ...c, membros: (c.membros || []).filter((x) => x !== id) })),
      })),
    }));

  return (
    <>
      <Popover
        titulo={aba === "menu" ? "Menu do quadro" : aba === "fundo" ? "Mudar fundo" : "Membros"}
        onClose={onClose}
        largura="w-72"
        align="right"
      >
        {aba !== "menu" && (
          <button onClick={() => setAba("menu")} className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <ArrowLeft size={12} /> Voltar
          </button>
        )}

        {aba === "menu" && (
          <div className="space-y-0.5">
            <div className="px-3 py-2 bg-gray-50 rounded-lg mb-2">
              <p className="text-xs text-gray-500">
                {quadro.listas.length} lista(s) · {totalCards} cartão(ões)
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Criado em {dataBR(quadro.criadoEm)}</p>
            </div>
            <BotaoTexto onClick={() => setAba("fundo")}>
              <Palette size={14} /> Mudar fundo
            </BotaoTexto>
            <BotaoTexto onClick={() => setAba("membros")}>
              <Users size={14} /> Membros do quadro
            </BotaoTexto>
            {quadro.vinculoPedidos && (
              <BotaoTexto
                onClick={() => {
                  onSincronizar();
                  onClose();
                }}
              >
                <RefreshCw size={14} /> Sincronizar com pedidos
              </BotaoTexto>
            )}
            <BotaoTexto
              onClick={() => {
                api.duplicar(quadro.id);
                onClose();
              }}
            >
              <Copy size={14} /> Duplicar quadro
            </BotaoTexto>
            <BotaoTexto onClick={() => setConfirmar(true)} className="text-red-600 hover:bg-red-50">
              <Trash2 size={14} /> Excluir quadro
            </BotaoTexto>
          </div>
        )}

        {aba === "fundo" && (
          <div className="grid grid-cols-3 gap-2">
            {QUADRO_FUNDOS.map((f) => (
              <button
                key={f.id}
                onClick={() => api.patch(quadro.id, { fundo: f.id })}
                className="h-14 rounded-lg relative"
                style={{ background: f.css }}
                title={f.nome}
              >
                {quadro.fundo === f.id && <Check size={16} className="text-white absolute inset-0 m-auto drop-shadow" />}
              </button>
            ))}
          </div>
        )}

        {aba === "membros" && (
          <div>
            <div className="flex gap-1.5 mb-3">
              <input
                value={novoMembro}
                onChange={(e) => setNovoMembro(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMembro()}
                placeholder="Nome da pessoa"
                className={inputCls}
              />
              <button onClick={addMembro} className="bg-gray-900 text-white px-3 rounded-lg text-sm shrink-0">
                <Plus size={15} />
              </button>
            </div>
            {quadro.membros.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">Nenhum membro cadastrado.</p>
            ) : (
              <div className="space-y-1">
                {quadro.membros.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-1 py-1">
                    <Avatar membro={m} size={26} />
                    <span className="text-sm text-gray-700 flex-1 truncate">{m.nome}</span>
                    <button onClick={() => removerMembro(m.id)} className="text-gray-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Popover>

      {confirmar && (
        <ModalBase onClose={() => setConfirmar(false)} largura="max-w-sm">
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Excluir quadro</h3>
            <p className="text-sm text-gray-600 mb-5">
              “{quadro.titulo}” será apagado com todas as listas e cartões. Os pedidos do sistema continuam intactos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmar(false)}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onVoltar();
                  api.excluir(quadro.id);
                }}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Modal do cartão
// ---------------------------------------------------------------------------

function CardModal({ quadro, lista, card, pedidos, api, onClose, updCard, moverCard, removerCard, duplicarCard }) {
  const [popover, setPopover] = useState(null); // lista | menu | adicionar | etiquetas | membros | prazo | capa
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [descricaoEdit, setDescricaoEdit] = useState(false);
  const [descricao, setDescricao] = useState(card.descricao || "");
  const [comentario, setComentario] = useState("");
  const [novoChecklist, setNovoChecklist] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [erroAnexo, setErroAnexo] = useState("");
  const [visualizar, setVisualizar] = useState(null);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(true);
  const [previewExpandido, setPreviewExpandido] = useState(false);
  const fileRef = useRef(null);

  const pedido = card.pedidoId ? pedidos.find((p) => p.id === card.pedidoId) : null;
  const set = (fn) => updCard(lista.id, card.id, fn);

  const etiquetas = (card.etiquetas || []).map((id) => quadro.etiquetas.find((e) => e.id === id)).filter(Boolean);
  const membros = (card.membros || []).map((id) => quadro.membros.find((m) => m.id === id)).filter(Boolean);
  const { total, feitos } = contarChecklist(card);
  const prazo = card.prazo || pedido?.dataEntrega || null;
  const estiloPrazo = prazoStyle(prazo, card.prazoFeito);
  const votos = card.votos || [];
  const votou = votos.includes("Você");

  const toggleArr = (campo, valor) =>
    set((c) => {
      const atual = c[campo] || [];
      return { ...c, [campo]: atual.includes(valor) ? atual.filter((x) => x !== valor) : [...atual, valor] };
    });

  const registrarAtividade = (texto) =>
    set((c) => ({
      ...c,
      atividades: [
        { id: nid("atv"), texto, autor: "Você", data: new Date().toISOString() },
        ...(c.atividades || []),
      ],
    }));

  const addChecklist = (titulo) => {
    const nome = titulo.trim() || "Checklist";
    set((c) => ({
      ...c,
      checklists: [...(c.checklists || []), { id: nid("chk"), titulo: nome, itens: [] }],
    }));
    registrarAtividade(`adicionou o checklist "${nome}"`);
  };

  const anexos = card.anexos || [];

  const enviarArquivos = async (files) => {
    setErroAnexo("");
    const listaArqs = [...files];
    const novos = [];
    const avisos = [];

    for (const file of listaArqs) {
      const ehImagem = file.type.startsWith("image/");

      // Cabe direto no limite: anexa sem mexer.
      if (file.size <= LIMITE_ANEXO) {
        try {
          const url = await lerArquivo(file);
          novos.push({
            id: nid("anx"),
            nome: file.name,
            tipo: file.type,
            tamanho: file.size,
            url,
            criadoEm: new Date().toISOString(),
          });
        } catch {
          setErroAnexo(`Não foi possível ler “${file.name}”.`);
        }
        continue;
      }

      // Arquivo não-imagem (ex.: PDF) acima do limite: não dá para compactar no navegador.
      if (!ehImagem) {
        setErroAnexo(
          `“${file.name}” tem ${tamanhoLegivel(file.size)}. O limite é ${tamanhoLegivel(LIMITE_ANEXO)} por arquivo — reduza o arquivo antes de anexar.`
        );
        continue;
      }

      // Imagem grande: reduz o tamanho automaticamente (escala + qualidade) até caber.
      try {
        const resultado = await comprimirImagem(file, LIMITE_ANEXO);
        if (!resultado) {
          setErroAnexo(
            `“${file.name}” tem ${tamanhoLegivel(file.size)} e não foi possível reduzir abaixo de ${tamanhoLegivel(LIMITE_ANEXO)}. Tente uma foto menor.`
          );
          continue;
        }
        const url = await lerArquivo(resultado.blob);
        const nomeJpg = file.name.replace(/\.\w+$/, "") + ".jpg";
        novos.push({
          id: nid("anx"),
          nome: nomeJpg,
          tipo: "image/jpeg",
          tamanho: resultado.blob.size,
          url,
          criadoEm: new Date().toISOString(),
        });
        avisos.push(`“${file.name}” (${tamanhoLegivel(file.size)}) foi reduzida para ${tamanhoLegivel(resultado.blob.size)} automaticamente.`);
      } catch {
        setErroAnexo(`Não foi possível reduzir “${file.name}”. Tente uma foto menor.`);
      }
    }

    if (avisos.length) api.showToast(avisos.join(" "));
    if (!novos.length) return;
    set((c) => {
      const atuais = c.anexos || [];
      const primeiraImagem = novos.find((a) => a.tipo.startsWith("image/"));
      return {
        ...c,
        anexos: [...atuais, ...novos],
        capaImagem: c.capaImagem || (primeiraImagem ? primeiraImagem.id : null),
        atividades: [
          {
            id: nid("atv"),
            texto:
              novos.length === 1
                ? `anexou "${novos[0].nome}" a este cartão`
                : `anexou ${novos.length} arquivos a este cartão`,
            autor: "Você",
            data: new Date().toISOString(),
          },
          ...(c.atividades || []),
        ],
      };
    });
  };

  const removerAnexo = (id) => {
    const alvo = anexos.find((a) => a.id === id);
    set((c) => ({
      ...c,
      anexos: (c.anexos || []).filter((a) => a.id !== id),
      capaImagem: c.capaImagem === id ? null : c.capaImagem,
    }));
    if (alvo) registrarAtividade(`removeu o anexo "${alvo.nome}"`);
  };

  const addComentario = () => {
    if (!comentario.trim()) return;
    set((c) => ({
      ...c,
      comentarios: [
        { id: nid("cmt"), texto: comentario.trim(), autor: "Você", data: new Date().toISOString() },
        ...(c.comentarios || []),
      ],
    }));
    setComentario("");
  };

  const toggleVoto = () =>
    set((c) => {
      const atual = c.votos || [];
      return {
        ...c,
        votos: atual.includes("Você") ? atual.filter((v) => v !== "Você") : [...atual, "Você"],
      };
    });

  // feed combinado: comentários (sempre visíveis) + atividades do sistema (com "Mostrar Detalhes")
  const feed = [
    ...(card.comentarios || []).map((c) => ({ ...c, _tipo: "comentario" })),
    ...(mostrarDetalhes ? (card.atividades || []).map((a) => ({ ...a, _tipo: "atividade" })) : []),
  ].sort((a, b) => new Date(b.data) - new Date(a.data));

  const Secao = ({ icone: Icone, titulo, children, acao }) => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Icone size={15} className="text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-800 flex-1">{titulo}</h4>
        {acao}
      </div>
      <div className="pl-[23px]">{children}</div>
    </div>
  );

  const BotaoChip = ({ icone: Icone, children, onClick }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg"
    >
      <Icone size={13} /> {children}
    </button>
  );

  const ItemMenu = ({ icone: Icone, children, onClick, danger }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm ${
        danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icone size={14} /> {children}
    </button>
  );

  const capaImg = card.capaImagem ? anexos.find((a) => a.id === card.capaImagem) : null;

  const PopoverPrazo = ({ align = "left" }) => (
    <Popover titulo="Prazo de entrega" onClose={() => setPopover(null)} largura="w-60" align={align}>
      <input
        type="date"
        value={card.prazo ? card.prazo.slice(0, 10) : ""}
        onChange={(e) => set((c) => ({ ...c, prazo: e.target.value || null }))}
        className={inputCls}
      />
      <div className="flex gap-1.5 mt-2">
        {[
          ["Hoje", 0],
          ["Amanhã", 1],
          ["+7 dias", 7],
        ].map(([label, d]) => (
          <button
            key={label}
            onClick={() => {
              const dt = new Date();
              dt.setDate(dt.getDate() + d);
              set((c) => ({ ...c, prazo: dt.toISOString().slice(0, 10) }));
            }}
            className="flex-1 text-xs border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50"
          >
            {label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 mt-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={!!card.prazoFeito}
          onChange={(e) => set((c) => ({ ...c, prazoFeito: e.target.checked }))}
        />
        Marcar como concluído
      </label>
      {card.prazo && (
        <button
          onClick={() => set((c) => ({ ...c, prazo: null, prazoFeito: false }))}
          className="w-full mt-3 text-sm text-red-600 border border-red-200 rounded-lg py-1.5 hover:bg-red-50"
        >
          Remover prazo
        </button>
      )}
    </Popover>
  );

  const PopoverMembros = ({ align = "left" }) => (
    <Popover titulo="Membros" onClose={() => setPopover(null)} largura="w-60" align={align}>
      {quadro.membros.length === 0 ? (
        <p className="text-xs text-gray-400">Cadastre membros no menu do quadro (botão “…” no topo).</p>
      ) : (
        <div className="space-y-1">
          {quadro.membros.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleArr("membros", m.id)}
              className="w-full flex items-center gap-2 px-1 py-1.5 rounded hover:bg-gray-50"
            >
              <Avatar membro={m} size={26} />
              <span className="text-sm text-gray-700 flex-1 text-left truncate">{m.nome}</span>
              {(card.membros || []).includes(m.id) && <Check size={14} className="text-emerald-600" />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );

  const PopoverCapa = ({ align = "right" }) => (
    <Popover titulo="Capa do cartão" onClose={() => setPopover(null)} largura="w-56" align={align}>
      {anexos.filter((a) => a.tipo.startsWith("image/")).length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Imagens anexadas</p>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {anexos
              .filter((a) => a.tipo.startsWith("image/"))
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => set((c) => ({ ...c, capaImagem: c.capaImagem === a.id ? null : a.id }))}
                  className={`h-12 rounded-md overflow-hidden border-2 ${
                    card.capaImagem === a.id ? "border-gray-900" : "border-transparent"
                  }`}
                >
                  <img src={a.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
          </div>
        </>
      )}
      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Cor</p>
      <div className="grid grid-cols-5 gap-1.5">
        {Object.entries(ETIQUETA_CORES).map(([id, cor]) => (
          <button
            key={id}
            onClick={() => set((c) => ({ ...c, capa: c.capa === id ? null : id }))}
            className="h-8 rounded-md relative"
            style={{ background: cor }}
          >
            {card.capa === id && <Check size={13} className="text-white absolute inset-0 m-auto" />}
          </button>
        ))}
      </div>
      {(card.capa || card.capaImagem) && (
        <button
          onClick={() => set((c) => ({ ...c, capa: null, capaImagem: null }))}
          className="w-full mt-2 text-sm text-gray-600 border border-gray-200 rounded-lg py-1.5"
        >
          Remover capa
        </button>
      )}
    </Popover>
  );

  return (
    <ModalBase onClose={onClose} largura="max-w-4xl">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-2">
        <div className="relative">
          <button
            onClick={() => setPopover(popover === "lista" ? null : "lista")}
            className="flex items-center gap-1 text-xs font-semibold tracking-wide text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg uppercase"
          >
            {lista.titulo} <ChevronDown size={13} />
          </button>
          {popover === "lista" && (
            <Popover titulo="Mover para a lista" onClose={() => setPopover(null)} largura="w-60" align="left">
              <div className="space-y-1">
                {quadro.listas.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      if (l.id !== lista.id) moverCard(lista.id, card.id, l.id, l.cards.length);
                      setPopover(null);
                      onClose();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span className="truncate">{l.titulo}</span>
                    {l.id === lista.id && <span className="text-[11px] text-gray-400">atual</span>}
                  </button>
                ))}
              </div>
            </Popover>
          )}
        </div>

        <div className="flex items-center gap-1">
          {capaImg && (
            <button
              onClick={() => setVisualizar(capaImg)}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              title="Ver capa em tela cheia"
            >
              <ImageIcon size={17} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setPopover(popover === "menu" ? null : "menu")}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <MoreHorizontal size={18} />
            </button>
            {popover === "menu" && (
              <Popover titulo="Ações do cartão" onClose={() => setPopover(null)} largura="w-56" align="right">
                <div className="space-y-1">
                  <ItemMenu icone={Palette} onClick={() => setPopover("capa")}>
                    Alterar capa
                  </ItemMenu>
                  <ItemMenu icone={ArrowRight} onClick={() => setPopover("lista")}>
                    Mover
                  </ItemMenu>
                  <ItemMenu
                    icone={Copy}
                    onClick={() => {
                      duplicarCard(lista.id, card.id);
                      api.showToast("Cartão duplicado.");
                      onClose();
                    }}
                  >
                    Duplicar
                  </ItemMenu>
                  <ItemMenu
                    icone={Trash2}
                    danger
                    onClick={() => {
                      setPopover(null);
                      setConfirmarExcluir(true);
                    }}
                  >
                    Excluir
                  </ItemMenu>
                </div>
              </Popover>
            )}
            {popover === "capa" && <PopoverCapa align="right" />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
      </div>

      {capaImg ? (
        <img src={capaImg.url} alt="" className="w-full h-40 object-cover bg-gray-200" />
      ) : (
        card.capa && <div className="h-14" style={{ background: ETIQUETA_CORES[card.capa] }} />
      )}

      <div className="p-4 sm:p-5">
        {/* Título */}
        <div className="flex items-start gap-3 mb-5">
          <Columns3 size={18} className="text-gray-400 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            {editandoTitulo ? (
              <textarea
                autoFocus
                defaultValue={card.titulo}
                rows={2}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) set((c) => ({ ...c, titulo: v }));
                  setEditandoTitulo(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="w-full text-lg font-semibold border border-blue-400 rounded-lg px-2 py-1 outline-none resize-none"
              />
            ) : (
              <h3
                onClick={() => setEditandoTitulo(true)}
                className="text-lg font-semibold text-gray-900 leading-snug cursor-text hover:bg-gray-100 rounded px-1 -ml-1"
              >
                {pedido ? `${pedido.id} · ${pedido.cliente}` : card.titulo}
              </h3>
            )}
            {pedido && (
              <p className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1">
                <Link2 size={11} /> pedido {pedido.id}
              </p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Coluna principal */}
          <div className="min-w-0">
            {/* Linha de ações rápidas, como no Trello */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative">
                <BotaoChip icone={Plus} onClick={() => setPopover(popover === "adicionar" ? null : "adicionar")}>
                  Adicionar
                </BotaoChip>
                {popover === "adicionar" && (
                  <Popover titulo="Adicionar ao cartão" onClose={() => setPopover(null)} largura="w-52" align="left">
                    <div className="space-y-1">
                      <ItemMenu icone={Users} onClick={() => setPopover("membros")}>
                        Membros
                      </ItemMenu>
                      <ItemMenu icone={TagIcon} onClick={() => setPopover("etiquetas")}>
                        Etiquetas
                      </ItemMenu>
                      <ItemMenu
                        icone={CheckSquare}
                        onClick={() => {
                          setNovoChecklist(true);
                          setPopover(null);
                        }}
                      >
                        Checklist
                      </ItemMenu>
                      <ItemMenu icone={Calendar} onClick={() => setPopover("prazo")}>
                        Datas
                      </ItemMenu>
                      <ItemMenu
                        icone={Paperclip}
                        onClick={() => {
                          setPopover(null);
                          fileRef.current?.click();
                        }}
                      >
                        Anexo
                      </ItemMenu>
                      <ItemMenu icone={Palette} onClick={() => setPopover("capa")}>
                        Capa
                      </ItemMenu>
                    </div>
                  </Popover>
                )}
              </div>

              <div className="relative">
                <BotaoChip icone={Clock} onClick={() => setPopover(popover === "prazo" ? null : "prazo")}>
                  Datas
                </BotaoChip>
                {popover === "prazo" && <PopoverPrazo align="left" />}
              </div>

              <BotaoChip icone={CheckSquare} onClick={() => setNovoChecklist(true)}>
                Checklist
              </BotaoChip>

              <div className="relative">
                <BotaoChip icone={Users} onClick={() => setPopover(popover === "membros" ? null : "membros")}>
                  Membros
                </BotaoChip>
                {popover === "membros" && <PopoverMembros align="left" />}
              </div>

              <BotaoChip icone={Paperclip} onClick={() => fileRef.current?.click()}>
                Anexo
              </BotaoChip>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  enviarArquivos(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {erroAnexo && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2 mb-4">
                {erroAnexo}
              </p>
            )}

            {/* Chips: membros / etiquetas / prazo / votos */}
            <div className="flex flex-wrap gap-4 mb-5">
              {membros.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Membros</p>
                  <div className="flex gap-1">
                    {membros.map((m) => (
                      <Avatar key={m.id} membro={m} size={30} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Etiquetas</p>
                <div className="flex flex-wrap items-center gap-1">
                  {etiquetas.map((e) => (
                    <span
                      key={e.id}
                      className="h-7 px-2.5 rounded text-xs text-white font-medium flex items-center"
                      style={{ background: ETIQUETA_CORES[e.cor] }}
                    >
                      {e.nome || "—"}
                    </span>
                  ))}
                  <div className="relative">
                    <button
                      onClick={() => setPopover(popover === "etiquetas" ? null : "etiquetas")}
                      className="h-7 w-7 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                      title="Adicionar etiqueta"
                    >
                      <Plus size={14} />
                    </button>
                    {popover === "etiquetas" && (
                      <EtiquetasPopover
                        quadro={quadro}
                        card={card}
                        api={api}
                        onToggle={(id) => toggleArr("etiquetas", id)}
                        onClose={() => setPopover(null)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {estiloPrazo && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Prazo</p>
                  <button
                    onClick={() => set((c) => ({ ...c, prazoFeito: !c.prazoFeito }))}
                    className="h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5"
                    style={{ background: estiloPrazo.bg, color: estiloPrazo.fg }}
                    title="Marcar como concluído"
                  >
                    <span className="w-3.5 h-3.5 rounded border border-current flex items-center justify-center">
                      {card.prazoFeito && <Check size={10} />}
                    </span>
                    {dataBR(prazo)} · {estiloPrazo.titulo}
                  </button>
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Votos</p>
                <button
                  onClick={toggleVoto}
                  className={`h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 ${
                    votou ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <ThumbsUp size={12} />
                  {votou ? "Você votou" : "Votar"}
                  {votos.length > 0 && ` · ${votos.length}`}
                </button>
              </div>
            </div>

            {/* Dados do pedido */}
            {pedido && (
              <div className="mb-5 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1.5 flex items-center gap-1.5">
                  <Link2 size={12} /> Dados do pedido
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-900">
                  <p>Produto: {pedido.produto}</p>
                  <p>Quantidade: {pedido.qtd} un.</p>
                  <p>Entrega: {dataBR(pedido.dataEntrega)}</p>
                  <p>Status: {pedido.status}</p>
                </div>
                <p className="text-[11px] text-blue-700 mt-2">
                  Mover este cartão entre as listas atualiza o status do pedido automaticamente.
                </p>
              </div>
            )}

            {/* Descrição */}
            <Secao
              icone={AlignLeft}
              titulo="Descrição"
              acao={
                !descricaoEdit && (
                  <button
                    onClick={() => setDescricaoEdit(true)}
                    className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg"
                  >
                    Editar
                  </button>
                )
              }
            >
              {descricaoEdit ? (
                <div>
                  <textarea
                    autoFocus
                    rows={4}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className={inputCls}
                    placeholder="Detalhe o que precisa ser feito..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        set((c) => ({ ...c, descricao }));
                        setDescricaoEdit(false);
                      }}
                      className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setDescricao(card.descricao || "");
                        setDescricaoEdit(false);
                      }}
                      className="text-sm text-gray-500 px-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDescricaoEdit(true)}
                  className={`w-full text-left text-sm rounded-lg px-3 py-2.5 ${
                    card.descricao
                      ? "text-gray-700 bg-white border border-gray-200 whitespace-pre-wrap"
                      : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {card.descricao || "Adicionar uma descrição mais detalhada..."}
                </button>
              )}
            </Secao>

            {/* Prévia grande da imagem da capa, como no Trello */}
            {capaImg && (
              <div className="mb-5 pl-[23px] -mt-1">
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img
                    src={capaImg.url}
                    alt={capaImg.nome}
                    className={`w-full object-cover transition-all duration-200 ${
                      previewExpandido ? "max-h-[560px]" : "max-h-48"
                    }`}
                  />
                  <button
                    onClick={() => setVisualizar(capaImg)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5"
                    title="Ver detalhes"
                  >
                    <Info size={14} />
                  </button>
                </div>
                <button
                  onClick={() => setPreviewExpandido((v) => !v)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:bg-gray-100 py-1.5 rounded-lg mt-1"
                >
                  <ChevronDown size={13} className={`transition-transform ${previewExpandido ? "rotate-180" : ""}`} />
                  {previewExpandido ? "Mostrar menos" : "Mostrar mais"}
                </button>
              </div>
            )}

            {/* Checklists */}
            {(card.checklists || []).map((cl) => (
              <ChecklistBloco key={cl.id} checklist={cl} set={set} />
            ))}

            {novoChecklist && (
              <div className="mb-5 pl-[23px]">
                <FormularioRapido
                  placeholder="Nome do checklist (ex.: Etapas da arte)"
                  botao="Adicionar"
                  onSubmit={(v) => addChecklist(v)}
                  onCancel={() => setNovoChecklist(false)}
                />
              </div>
            )}

            {/* Anexos */}
            <Secao
              icone={Paperclip}
              titulo={`Anexos${anexos.length ? ` (${anexos.length})` : ""}`}
              acao={
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                >
                  <Upload size={12} /> Adicionar
                </button>
              }
            >
              {anexos.length === 0 ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-lg py-5 text-sm text-gray-400 hover:border-gray-300 hover:bg-gray-100 flex flex-col items-center gap-1"
                >
                  <ImageIcon size={18} />
                  Anexar layout, arte ou PDF — fotos grandes são reduzidas automaticamente (PDF até{" "}
                  {tamanhoLegivel(LIMITE_ANEXO)})
                </button>
              ) : (
                <div className="space-y-1.5">
                  {anexos.map((a) => (
                    <AnexoLinha
                      key={a.id}
                      anexo={a}
                      ehCapa={card.capaImagem === a.id}
                      ehImagem={a.tipo.startsWith("image/")}
                      onAbrir={() => (a.tipo.startsWith("image/") ? setVisualizar(a) : window.open(a.url, "_blank"))}
                      onDefinirCapa={() => set((c) => ({ ...c, capaImagem: c.capaImagem === a.id ? null : a.id }))}
                      onRemover={() => removerAnexo(a.id)}
                    />
                  ))}
                </div>
              )}
            </Secao>
          </div>

          {/* Coluna lateral: Comentários e Atividade */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare size={15} className="text-gray-500" /> Comentários e Atividade
              </p>
              <button
                onClick={() => setMostrarDetalhes((v) => !v)}
                className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg shrink-0"
              >
                {mostrarDetalhes ? "Ocultar Detalhes" : "Mostrar Detalhes"}
              </button>
            </div>

            <div className="mb-3">
              <textarea
                rows={2}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addComentario();
                }}
                placeholder="Escrever um comentário..."
                className={inputCls}
              />
              {comentario.trim() && (
                <button
                  onClick={addComentario}
                  className="mt-2 bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md"
                >
                  Comentar
                </button>
              )}
            </div>

            {total > 0 && (
              <div className="mb-4 bg-white border border-gray-200 rounded-lg p-2.5">
                <p className="text-[11px] text-gray-500 mb-1">
                  Checklist: {feitos}/{total}
                </p>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${total ? (feitos / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {feed.map((item) =>
                item._tipo === "comentario" ? (
                  <div key={item.id} className="flex gap-2">
                    <span className="w-7 h-7 rounded-full bg-gray-700 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {iniciais(item.autor)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{item.autor}</span> comentou
                      </p>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {item.texto}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-gray-400">{dataHoraBR(item.data)}</span>
                        <button
                          onClick={() =>
                            set((x) => ({ ...x, comentarios: (x.comentarios || []).filter((y) => y.id !== item.id) }))
                          }
                          className="text-[11px] text-gray-400 hover:text-red-600"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="flex gap-2">
                    <span className="w-7 h-7 rounded-full bg-gray-300 text-gray-600 text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {iniciais(item.autor)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-700">{item.autor}</span> {item.texto}
                      </p>
                      <p className="text-[11px] text-blue-600">{dataHoraBR(item.data)}</p>
                    </div>
                  </div>
                )
              )}
              {feed.length === 0 && <p className="text-xs text-gray-400">Nenhuma atividade ainda.</p>}
            </div>
          </div>
        </div>
      </div>

      {visualizar && (
        <div
          className="fixed inset-0 bg-black/80 z-[90] flex flex-col items-center justify-center p-4"
          onClick={() => setVisualizar(null)}
        >
          <img src={visualizar.url} alt={visualizar.nome} className="max-h-[85vh] max-w-full object-contain rounded-lg" />
          <div className="flex items-center gap-3 mt-3">
            <span className="text-white text-sm">{visualizar.nome}</span>
            <a
              href={visualizar.url}
              download={visualizar.nome}
              onClick={(e) => e.stopPropagation()}
              className="text-white/80 text-sm underline"
            >
              Baixar
            </a>
          </div>
        </div>
      )}

      {confirmarExcluir && (
        <ModalBase onClose={() => setConfirmarExcluir(false)} largura="max-w-sm">
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Excluir cartão</h3>
            <p className="text-sm text-gray-600 mb-5">
              Esta ação não pode ser desfeita.{pedido ? " O pedido do sistema não será apagado." : ""}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarExcluir(false)}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => removerCard(lista.id, card.id)}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </ModalBase>
  );
}

function AnexoLinha({ anexo, ehCapa, ehImagem, onAbrir, onDefinirCapa, onRemover }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex items-center gap-2.5 border border-gray-200 rounded-lg p-2 bg-white hover:bg-gray-50">
      <button
        onClick={onAbrir}
        className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400"
      >
        {ehImagem ? <img src={anexo.url} alt="" className="w-full h-full object-cover" /> : <FileText size={18} />}
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={onAbrir} className="text-sm text-gray-800 hover:underline truncate block text-left" title={anexo.nome}>
          {anexo.nome}
        </button>
        <p className="text-[11px] text-gray-400">
          Adicionado há {dataHoraBR(anexo.criadoEm)}
          {ehCapa && <span className="ml-1.5 text-gray-600 font-medium">· Capa</span>}
        </p>
      </div>
      <button onClick={onAbrir} className="text-gray-400 hover:text-gray-600 p-1 shrink-0" title="Abrir">
        <ExternalLink size={14} />
      </button>
      <div className="relative shrink-0">
        <button onClick={() => setMenu((v) => !v)} className="text-gray-400 hover:text-gray-600 p-1">
          <MoreHorizontal size={16} />
        </button>
        {menu && (
          <Popover titulo="Anexo" onClose={() => setMenu(false)} largura="w-48" align="right">
            <div className="space-y-1">
              {ehImagem && (
                <button
                  onClick={() => {
                    onDefinirCapa();
                    setMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-gray-100 text-gray-700"
                >
                  <Palette size={14} /> {ehCapa ? "Remover como capa" : "Usar como capa"}
                </button>
              )}
              <a
                href={anexo.url}
                download={anexo.nome}
                onClick={() => setMenu(false)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-gray-100 text-gray-700"
              >
                <Upload size={14} className="rotate-180" /> Baixar
              </a>
              <button
                onClick={() => {
                  onRemover();
                  setMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-red-50 text-red-600"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </Popover>
        )}
      </div>
    </div>
  );
}

function EtiquetasPopover({ quadro, card, api, onToggle, onClose }) {
  const [editando, setEditando] = useState(null);

  const salvarEtiqueta = (id, patch) =>
    api.update(quadro.id, (q) => ({
      ...q,
      etiquetas: q.etiquetas.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const criarEtiqueta = () =>
    api.update(quadro.id, (q) => ({
      ...q,
      etiquetas: [
        ...q.etiquetas,
        { id: nid("etq"), nome: "", cor: Object.keys(ETIQUETA_CORES)[q.etiquetas.length % 10] },
      ],
    }));

  const excluirEtiqueta = (id) =>
    api.update(quadro.id, (q) => ({
      ...q,
      etiquetas: q.etiquetas.filter((e) => e.id !== id),
      listas: q.listas.map((l) => ({
        ...l,
        cards: l.cards.map((c) => ({ ...c, etiquetas: (c.etiquetas || []).filter((x) => x !== id) })),
      })),
    }));

  return (
    <Popover titulo="Etiquetas" onClose={onClose} largura="w-64" align="right">
      <div className="space-y-1.5">
        {quadro.etiquetas.map((e) => (
          <div key={e.id}>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onToggle(e.id)}
                className="flex-1 h-8 rounded px-2.5 text-xs text-white font-medium flex items-center justify-between"
                style={{ background: ETIQUETA_CORES[e.cor] }}
              >
                <span className="truncate">{e.nome}</span>
                {(card.etiquetas || []).includes(e.id) && <Check size={13} />}
              </button>
              <button
                onClick={() => setEditando(editando === e.id ? null : e.id)}
                className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 shrink-0"
              >
                <Pencil size={12} />
              </button>
            </div>
            {editando === e.id && (
              <div className="mt-1.5 p-2 bg-gray-50 rounded-lg">
                <input
                  autoFocus
                  defaultValue={e.nome}
                  placeholder="Nome da etiqueta"
                  onBlur={(ev) => salvarEtiqueta(e.id, { nome: ev.target.value })}
                  className={`${inputCls} mb-2`}
                />
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {Object.entries(ETIQUETA_CORES).map(([id, cor]) => (
                    <button
                      key={id}
                      onClick={() => salvarEtiqueta(e.id, { cor: id })}
                      className="h-6 rounded"
                      style={{ background: cor }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    excluirEtiqueta(e.id);
                    setEditando(null);
                  }}
                  className="text-xs text-red-600"
                >
                  Excluir etiqueta
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={criarEtiqueta}
        className="w-full mt-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> Nova etiqueta
      </button>
    </Popover>
  );
}

function ChecklistBloco({ checklist, set }) {
  const [novoItem, setNovoItem] = useState(false);
  const [texto, setTexto] = useState("");
  const [editandoTitulo, setEditandoTitulo] = useState(false);

  const total = (checklist.itens || []).length;
  const feitos = (checklist.itens || []).filter((i) => i.feito).length;
  const pct = total ? Math.round((feitos / total) * 100) : 0;

  const patchChecklist = (fn) =>
    set((c) => ({ ...c, checklists: c.checklists.map((cl) => (cl.id === checklist.id ? fn(cl) : cl)) }));

  const addItem = () => {
    if (!texto.trim()) return;
    patchChecklist((cl) => ({ ...cl, itens: [...cl.itens, { id: nid("itm"), texto: texto.trim(), feito: false }] }));
    setTexto("");
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <CheckSquare size={15} className="text-gray-500" />
        {editandoTitulo ? (
          <input
            autoFocus
            defaultValue={checklist.titulo}
            onBlur={(e) => {
              patchChecklist((cl) => ({ ...cl, titulo: e.target.value.trim() || cl.titulo }));
              setEditandoTitulo(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="flex-1 text-sm font-semibold border border-blue-400 rounded px-2 py-1 outline-none"
          />
        ) : (
          <h4
            onClick={() => setEditandoTitulo(true)}
            className="text-sm font-semibold text-gray-800 flex-1 cursor-text hover:bg-gray-100 rounded px-1"
          >
            {checklist.titulo}
          </h4>
        )}
        <span className="text-xs text-gray-500">{pct}%</span>
        <button
          onClick={() => set((c) => ({ ...c, checklists: c.checklists.filter((cl) => cl.id !== checklist.id) }))}
          className="text-gray-400 hover:text-red-600"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="pl-[23px]">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="space-y-0.5 mb-1">
          {(checklist.itens || []).map((item) => (
            <div key={item.id} className="flex items-start gap-2 group px-1 py-1 rounded hover:bg-gray-100">
              <input
                type="checkbox"
                checked={item.feito}
                onChange={() =>
                  patchChecklist((cl) => ({
                    ...cl,
                    itens: cl.itens.map((i) => (i.id === item.id ? { ...i, feito: !i.feito } : i)),
                  }))
                }
                className="mt-0.5"
              />
              <span className={`text-sm flex-1 ${item.feito ? "line-through text-gray-400" : "text-gray-700"}`}>
                {item.texto}
              </span>
              <button
                onClick={() =>
                  patchChecklist((cl) => ({ ...cl, itens: cl.itens.filter((i) => i.id !== item.id) }))
                }
                className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        {novoItem ? (
          <div className="bg-white rounded-lg border border-gray-200 p-2">
            <textarea
              autoFocus
              rows={2}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addItem();
                }
                if (e.key === "Escape") setNovoItem(false);
              }}
              placeholder="Adicionar um item"
              className="w-full text-sm outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button onClick={addItem} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md font-medium">
                Adicionar
              </button>
              <button onClick={() => setNovoItem(false)} className="text-gray-500">
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setNovoItem(true)}
            className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg"
          >
            Adicionar item
          </button>
        )}
      </div>
    </div>
  );
}
