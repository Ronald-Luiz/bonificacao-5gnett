// 5GNETT — CONTROLE DE ATENDIMENTOS | SCRIPT.JS

const STORAGE_KEY = "5gnett_atendimentos_v2";
const LEGACY_KEY = "5gnett_atendimentos_v1";

let atendimentos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let editandoId = null;

const $ = id => document.getElementById(id);

const modal = $("modalAtendimento");
const modalRelato = $("modalRelato");
const form = $("formAtendimento");
const tabela = $("tabelaAtendimentos");

function salvarDados() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atendimentos));
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatarData(data) {
  if (!data) return "";
  const [a,m,d] = data.split("-");
  return `${d}/${m}/${a}`;
}

function escaparHTML(v = "") {
  return String(v)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function migrarDadosAntigos() {
  if (atendimentos.length) return;

  const antigos = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
  if (!Array.isArray(antigos) || !antigos.length) return;

  atendimentos = antigos.map(a => ({
    ...a,
    atendente: a.atendente || "Guilherme",
    canal: a.canal || "Chatmix",
    relato: a.relato || ""
  }));

  salvarDados();
}

function atualizarCamposCanal() {
  const canal = $("canal").value;
  const grupoLink = $("grupoLink");
  const grupoRelato = $("grupoRelato");

  if (canal === "Ligação") {
    grupoLink.style.display = "none";
    grupoRelato.classList.add("ativo");
    $("link").required = false;
    $("relato").required = true;
  } else {
    grupoLink.style.display = "flex";
    grupoRelato.classList.remove("ativo");
    $("link").required = true;
    $("relato").required = false;
  }
}

function abrirModal(item = null) {
  modal.classList.add("ativo");

  if (item) {
    editandoId = item.id;
    $("data").value = item.data || hojeISO();
    $("atendente").value = item.atendente || "";
    $("codigo").value = item.codigo || "";
    $("cidade").value = item.cidade || "";
    $("nome").value = item.nome || "";
    $("canal").value = item.canal || "Chatmix";
    $("servico").value = item.servico || "";
    $("resolutividade").value = item.resolutividade || "Resolvido";
    $("link").value = item.link || "";
    $("relato").value = item.relato || "";
    modal.querySelector(".modal-header h2").textContent = "Editar Atendimento";
  } else {
    editandoId = null;
    form.reset();
    $("data").value = hojeISO();
    $("canal").value = "Chatmix";
    $("resolutividade").value = "Resolvido";
    modal.querySelector(".modal-header h2").textContent = "Novo Atendimento";
  }

  atualizarCamposCanal();
}

function fecharModal() {
  modal.classList.remove("ativo");
  editandoId = null;
  form.reset();
}

function obterFiltrados() {
  const pesquisa = $("pesquisa").value.trim().toLowerCase();
  const dataInicial = $("dataInicial").value;
  const dataFinal = $("dataFinal").value;
  const atendente = $("filtroAtendente").value;
  const canal = $("filtroCanal").value;
  const resolutividade = $("filtroResolutividade").value;

  return atendimentos.filter(item => {
    const texto = `${item.codigo} ${item.nome} ${item.cidade} ${item.atendente} ${item.servico} ${item.relato || ""}`.toLowerCase();

    if (pesquisa && !texto.includes(pesquisa)) return false;
    if (dataInicial && item.data < dataInicial) return false;
    if (dataFinal && item.data > dataFinal) return false;
    if (atendente && item.atendente !== atendente) return false;
    if (canal && item.canal !== canal) return false;
    if (resolutividade && item.resolutividade !== resolutividade) return false;

    return true;
  });
}

function atualizarCards() {
  const total = atendimentos.length;
  const resolvidos = atendimentos.filter(a => a.resolutividade === "Resolvido").length;
  const naoResolvidos = total - resolvidos;
  const taxa = total ? Math.round((resolvidos / total) * 100) : 0;

  $("totalAtendimentos").textContent = total;
  $("totalResolvidos").textContent = resolvidos;
  $("totalNaoResolvidos").textContent = naoResolvidos;
  $("taxaResolutividade").textContent = `${taxa}%`;
}

function renderizarTabela() {
  const lista = obterFiltrados();

  $("contadorRegistros").textContent =
    `Total de ${lista.length} ${lista.length === 1 ? "registro" : "registros"}`;

  if (!lista.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center;padding:36px;color:#91a4b7">
          Nenhum atendimento encontrado.
        </td>
      </tr>`;
    return;
  }

  tabela.innerHTML = lista.map((item, i) => {
    const resolvido = item.resolutividade === "Resolvido";
    const canal = item.canal || "Chatmix";

    let conversa = "";

    if (canal === "Ligação") {
      conversa = `
        <button class="btn-relato" type="button"
          onclick="verRelato('${item.id}')">📞 Ver relato</button>`;
    } else if (item.link) {
      conversa = `
        <a class="link-chat"
          href="${escaparHTML(item.link)}"
          target="_blank"
          rel="noopener noreferrer">Abrir conversa ↗</a>`;
    } else {
      conversa = `<span style="color:#71879a">Sem link</span>`;
    }

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${formatarData(item.data)}</td>
        <td>${escaparHTML(item.codigo)}</td>
        <td>${escaparHTML(item.nome)}</td>
        <td><strong>${escaparHTML(item.atendente || "-")}</strong></td>
        <td>${escaparHTML(item.cidade)}</td>
        <td>
          <span class="${canal === "Ligação" ? "canal-ligacao" : "canal-chatmix"}">
            ${canal === "Ligação" ? "📞 Ligação" : "💬 Chatmix"}
          </span>
        </td>
        <td>${escaparHTML(item.servico)}</td>
        <td>
          <span class="${resolvido ? "status-resolvido" : "status-nao-resolvido"}">
            ${escaparHTML(item.resolutividade)}
          </span>
        </td>
        <td>${conversa}</td>
        <td>
          <button class="acao-editar" type="button"
            onclick="editarAtendimento('${item.id}')" title="Editar">✎</button>
          <button class="acao-excluir" type="button"
            onclick="excluirAtendimento('${item.id}')" title="Excluir">×</button>
        </td>
      </tr>`;
  }).join("");
}

function atualizarTela() {
  atualizarCards();
  renderizarTabela();
}

function editarAtendimento(id) {
  const item = atendimentos.find(a => a.id === id);
  if (item) abrirModal(item);
}

function excluirAtendimento(id) {
  const item = atendimentos.find(a => a.id === id);
  if (!item) return;

  if (!confirm(`Deseja excluir o atendimento de ${item.nome}?`)) return;

  atendimentos = atendimentos.filter(a => a.id !== id);
  salvarDados();
  atualizarTela();
}

function verRelato(id) {
  const item = atendimentos.find(a => a.id === id);
  if (!item) return;

  $("relatoIdentificacao").textContent =
    `${item.nome} • ${item.atendente} • ${formatarData(item.data)}`;

  $("textoRelato").textContent = item.relato || "Nenhum relato registrado.";
  modalRelato.classList.add("ativo");
}

function fecharRelato() {
  modalRelato.classList.remove("ativo");
}

window.editarAtendimento = editarAtendimento;
window.excluirAtendimento = excluirAtendimento;
window.verRelato = verRelato;

form.addEventListener("submit", e => {
  e.preventDefault();

  const canal = $("canal").value;

  if (canal === "Chatmix" && !$("link").value.trim()) {
    alert("Informe o link da conversa no Chatmix.");
    $("link").focus();
    return;
  }

  if (canal === "Ligação" && !$("relato").value.trim()) {
    alert("Informe o que o cliente relatou durante a ligação.");
    $("relato").focus();
    return;
  }

  const registro = {
    id: editandoId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    data: $("data").value,
    atendente: $("atendente").value,
    codigo: $("codigo").value.trim(),
    nome: $("nome").value.trim(),
    cidade: $("cidade").value.trim(),
    canal,
    servico: $("servico").value,
    resolutividade: $("resolutividade").value,
    link: canal === "Chatmix" ? $("link").value.trim() : "",
    relato: canal === "Ligação" ? $("relato").value.trim() : ""
  };

  if (editandoId) {
    atendimentos = atendimentos.map(a => a.id === editandoId ? registro : a);
  } else {
    atendimentos.unshift(registro);
  }

  salvarDados();
  fecharModal();
  atualizarTela();
});

$("canal").addEventListener("change", atualizarCamposCanal);
$("btnNovoAtendimento").addEventListener("click", () => abrirModal());
$("menuNovoAtendimento").addEventListener("click", () => abrirModal());
$("fecharModal").addEventListener("click", fecharModal);
$("cancelarModal").addEventListener("click", fecharModal);

$("fecharModalRelato").addEventListener("click", fecharRelato);
$("okRelato").addEventListener("click", fecharRelato);

modal.addEventListener("click", e => {
  if (e.target === modal) fecharModal();
});

modalRelato.addEventListener("click", e => {
  if (e.target === modalRelato) fecharRelato();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (modal.classList.contains("ativo")) fecharModal();
    if (modalRelato.classList.contains("ativo")) fecharRelato();
  }
});

$("pesquisa").addEventListener("input", renderizarTabela);
$("btnFiltrar").addEventListener("click", renderizarTabela);

$("btnLimpar").addEventListener("click", () => {
  $("pesquisa").value = "";
  $("dataInicial").value = "";
  $("dataFinal").value = "";
  $("filtroAtendente").value = "";
  $("filtroCanal").value = "";
  $("filtroResolutividade").value = "";
  renderizarTabela();
});

function mostrarDataAtual() {
  $("dataAtual").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday:"long", day:"2-digit", month:"long", year:"numeric"
  });
}


// =========================
// NAVEGAÇÃO DO PAINEL
// =========================
function marcarMenuAtivo(botao) {
  document.querySelectorAll(".menu-item").forEach(item => {
    item.classList.remove("active");
  });

  if (botao) botao.classList.add("active");
}

function mostrarPagina(nome) {
  const paginas = [
    $("paginaInicio"),
    $("paginaAtendimentos"),
    $("paginaRelatorios")
  ].filter(Boolean);

  paginas.forEach(pagina => pagina.classList.remove("ativa"));

  if (nome === "atendimentos") {
    $("paginaAtendimentos").classList.add("ativa");
    marcarMenuAtivo($("menuAtendimentos"));
    renderizarTabela();
  } else if (nome === "relatorios") {
    $("paginaRelatorios").classList.add("ativa");
    marcarMenuAtivo($("menuRelatorios"));
    atualizarRelatorios();
  } else {
    $("paginaInicio").classList.add("ativa");
    marcarMenuAtivo($("menuInicio"));
    atualizarCards();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// =========================
// RELATÓRIOS
// =========================
function obterDadosRelatorio() {
  const inicial = $("relatorioDataInicial")?.value || "";
  const final = $("relatorioDataFinal")?.value || "";
  const atendente = $("relatorioAtendente")?.value || "";

  return atendimentos.filter(item => {
    if (inicial && item.data < inicial) return false;
    if (final && item.data > final) return false;
    if (atendente && item.atendente !== atendente) return false;
    return true;
  });
}

function atualizarRelatorios() {
  if (!$("paginaRelatorios")) return;

  const lista = obterDadosRelatorio();
  const total = lista.length;
  const resolvidos = lista.filter(a => a.resolutividade === "Resolvido").length;
  const naoResolvidos = total - resolvidos;
  const taxa = total ? Math.round((resolvidos / total) * 100) : 0;
  const chatmix = lista.filter(a => (a.canal || "Chatmix") === "Chatmix").length;
  const ligacoes = lista.filter(a => a.canal === "Ligação").length;

  $("relTotal").textContent = total;
  $("relResolvidos").textContent = resolvidos;
  $("relNaoResolvidos").textContent = naoResolvidos;
  $("relTaxa").textContent = `${taxa}%`;
  $("relChatmix").textContent = chatmix;
  $("relLigacoes").textContent = ligacoes;

  const nomes = ["Guilherme", "Ronald", "Ivo", "Juarez"];
  const filtroAtendente = $("relatorioAtendente").value;
  const nomesExibidos = filtroAtendente ? [filtroAtendente] : nomes;

  $("tabelaRelatorioAtendentes").innerHTML = nomesExibidos.map(nome => {
    const itens = lista.filter(a => a.atendente === nome);
    const qtd = itens.length;
    const ok = itens.filter(a => a.resolutividade === "Resolvido").length;
    const nao = qtd - ok;
    const chats = itens.filter(a => (a.canal || "Chatmix") === "Chatmix").length;
    const calls = itens.filter(a => a.canal === "Ligação").length;
    const percentual = qtd ? Math.round((ok / qtd) * 100) : 0;

    return `
      <tr>
        <td><strong>${escaparHTML(nome)}</strong></td>
        <td>${qtd}</td>
        <td>${ok}</td>
        <td>${nao}</td>
        <td>${chats}</td>
        <td>${calls}</td>
        <td><strong>${percentual}%</strong></td>
      </tr>
    `;
  }).join("");
}

const menuInicio = $("menuInicio");
const menuAtendimentos = $("menuAtendimentos");
const menuRelatorios = $("menuRelatorios");
const btnNovoAtendimentoTopo = $("btnNovoAtendimentoTopo");

if (menuInicio) {
  menuInicio.addEventListener("click", () => mostrarPagina("inicio"));
}

if (menuAtendimentos) {
  menuAtendimentos.addEventListener("click", () => mostrarPagina("atendimentos"));
}

if (menuRelatorios) {
  menuRelatorios.addEventListener("click", () => mostrarPagina("relatorios"));
}

if (btnNovoAtendimentoTopo) {
  btnNovoAtendimentoTopo.addEventListener("click", () => abrirModal());
}

if ($("btnFiltrarRelatorio")) {
  $("btnFiltrarRelatorio").addEventListener("click", atualizarRelatorios);
}

if ($("btnLimparRelatorio")) {
  $("btnLimparRelatorio").addEventListener("click", () => {
    $("relatorioDataInicial").value = "";
    $("relatorioDataFinal").value = "";
    $("relatorioAtendente").value = "";
    atualizarRelatorios();
  });
}

migrarDadosAntigos();
mostrarDataAtual();
atualizarTela();
atualizarRelatorios();
