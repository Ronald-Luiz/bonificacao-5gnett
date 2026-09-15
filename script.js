// ==========================================
// 5GNETT — SISTEMA DE BONIFICAÇÃO
// script.js
// ==========================================

const STORAGE_KEY = "5gnett_atendimentos_v1";

let atendimentos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let editandoId = null;

const $ = (id) => document.getElementById(id);

const modal = $("modalAtendimento");
const form = $("formAtendimento");
const tabela = $("tabelaAtendimentos");

function salvarDados() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atendimentos));
}

function hojeISO() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function escaparHTML(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function abrirModal(atendimento = null) {
  modal.classList.add("ativo");

  if (atendimento) {
    editandoId = atendimento.id;
    $("data").value = atendimento.data;
    $("codigo").value = atendimento.codigo;
    $("nome").value = atendimento.nome;
    $("cidade").value = atendimento.cidade;
    $("servico").value = atendimento.servico;
    $("resolutividade").value = atendimento.resolutividade;
    $("link").value = atendimento.link;
    $("pontos").value = atendimento.pontos;

    const titulo = modal.querySelector(".modal-header h2");
    if (titulo) titulo.textContent = "Editar Atendimento";
  } else {
    editandoId = null;
    form.reset();
    $("data").value = hojeISO();
    $("pontos").value = 10;
    $("resolutividade").value = "Resolvido";

    const titulo = modal.querySelector(".modal-header h2");
    if (titulo) titulo.textContent = "Novo Atendimento";
  }
}

function fecharModal() {
  modal.classList.remove("ativo");
  editandoId = null;
  form.reset();
}

function obterAtendimentosFiltrados() {
  const pesquisa = $("pesquisa").value.trim().toLowerCase();
  const dataInicial = $("dataInicial").value;
  const dataFinal = $("dataFinal").value;
  const cidade = $("filtroCidade").value;
  const servico = $("filtroServico").value;
  const resolutividade = $("filtroResolutividade").value;

  return atendimentos.filter((item) => {
    const textoPesquisa = `${item.codigo} ${item.nome} ${item.cidade} ${item.servico}`.toLowerCase();

    if (pesquisa && !textoPesquisa.includes(pesquisa)) return false;
    if (dataInicial && item.data < dataInicial) return false;
    if (dataFinal && item.data > dataFinal) return false;
    if (cidade && item.cidade !== cidade) return false;
    if (servico && item.servico !== servico) return false;
    if (resolutividade && item.resolutividade !== resolutividade) return false;

    return true;
  });
}

function atualizarFiltros() {
  const cidadeAtual = $("filtroCidade").value;
  const servicoAtual = $("filtroServico").value;

  const cidades = [...new Set(atendimentos.map(a => a.cidade).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const servicos = [...new Set(atendimentos.map(a => a.servico).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  $("filtroCidade").innerHTML =
    '<option value="">Todas</option>' +
    cidades.map(c => `<option value="${escaparHTML(c)}">${escaparHTML(c)}</option>`).join("");

  $("filtroServico").innerHTML =
    '<option value="">Todos</option>' +
    servicos.map(s => `<option value="${escaparHTML(s)}">${escaparHTML(s)}</option>`).join("");

  if (cidades.includes(cidadeAtual)) $("filtroCidade").value = cidadeAtual;
  if (servicos.includes(servicoAtual)) $("filtroServico").value = servicoAtual;
}

function atualizarCards() {
  const total = atendimentos.length;
  const resolvidos = atendimentos.filter(a => a.resolutividade === "Resolvido").length;
  const naoResolvidos = total - resolvidos;

  // Nesta primeira versão, 1 ponto = R$ 1,00.
  // Depois vamos trocar pela regra real de bonificação da empresa.
  const bonificacao = atendimentos
    .filter(a => a.resolutividade === "Resolvido")
    .reduce((soma, a) => soma + Number(a.pontos || 0), 0);

  $("totalAtendimentos").textContent = total;
  $("totalResolvidos").textContent = resolvidos;
  $("totalNaoResolvidos").textContent = naoResolvidos;

  $("totalBonificacao").textContent = bonificacao.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function renderizarTabela() {
  const lista = obterAtendimentosFiltrados();

  $("contadorRegistros").textContent =
    `Total de ${lista.length} ${lista.length === 1 ? "registro" : "registros"}`;

  if (!lista.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:35px;color:#91a4b7;">
          Nenhum atendimento encontrado.
        </td>
      </tr>
    `;
    return;
  }

  tabela.innerHTML = lista.map((item, indice) => {
    const resolvido = item.resolutividade === "Resolvido";
    const statusClasse = resolvido ? "status-resolvido" : "status-nao-resolvido";

    return `
      <tr>
        <td>${indice + 1}</td>
        <td>${formatarData(item.data)}</td>
        <td>${escaparHTML(item.codigo)}</td>
        <td>${escaparHTML(item.nome)}</td>
        <td>${escaparHTML(item.cidade)}</td>
        <td>${escaparHTML(item.servico)}</td>
        <td>
          <span class="${statusClasse}">
            ${escaparHTML(item.resolutividade)}
          </span>
        </td>
        <td>
          <a
            class="link-chat"
            href="${escaparHTML(item.link)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir link ↗
          </a>
        </td>
        <td>${Number(item.pontos || 0)}</td>
        <td>
          <button
            class="acao-editar"
            type="button"
            title="Editar"
            onclick="editarAtendimento('${item.id}')"
          >✎</button>

          <button
            class="acao-excluir"
            type="button"
            title="Excluir"
            onclick="excluirAtendimento('${item.id}')"
          >×</button>
        </td>
      </tr>
    `;
  }).join("");
}

function atualizarTela() {
  atualizarFiltros();
  atualizarCards();
  renderizarTabela();
}

function editarAtendimento(id) {
  const atendimento = atendimentos.find(a => a.id === id);
  if (atendimento) abrirModal(atendimento);
}

function excluirAtendimento(id) {
  const atendimento = atendimentos.find(a => a.id === id);
  if (!atendimento) return;

  const confirmar = window.confirm(
    `Deseja excluir o atendimento de ${atendimento.nome}?`
  );

  if (!confirmar) return;

  atendimentos = atendimentos.filter(a => a.id !== id);
  salvarDados();
  atualizarTela();
}

window.editarAtendimento = editarAtendimento;
window.excluirAtendimento = excluirAtendimento;

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const novo = {
    id: editandoId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    data: $("data").value,
    codigo: $("codigo").value.trim(),
    nome: $("nome").value.trim(),
    cidade: $("cidade").value.trim(),
    servico: $("servico").value,
    resolutividade: $("resolutividade").value,
    link: $("link").value.trim(),
    pontos: Number($("pontos").value || 0)
  };

  if (editandoId) {
    atendimentos = atendimentos.map(a => a.id === editandoId ? novo : a);
  } else {
    atendimentos.unshift(novo);
  }

  salvarDados();
  fecharModal();
  atualizarTela();
});

$("btnNovoAtendimento").addEventListener("click", () => abrirModal());
$("menuNovoAtendimento").addEventListener("click", () => abrirModal());
$("fecharModal").addEventListener("click", fecharModal);
$("cancelarModal").addEventListener("click", fecharModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) fecharModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("ativo")) {
    fecharModal();
  }
});

$("pesquisa").addEventListener("input", renderizarTabela);
$("btnFiltrar").addEventListener("click", renderizarTabela);

$("btnLimpar").addEventListener("click", () => {
  $("pesquisa").value = "";
  $("dataInicial").value = "";
  $("dataFinal").value = "";
  $("filtroCidade").value = "";
  $("filtroServico").value = "";
  $("filtroResolutividade").value = "";
  renderizarTabela();
});

function mostrarDataAtual() {
  const agora = new Date();

  $("dataAtual").textContent = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

mostrarDataAtual();
atualizarTela();
