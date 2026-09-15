// 5GNETT — CONTROLE DE ATENDIMENTOS | SCRIPT.JS

const STORAGE_KEY = "5gnett_atendimentos_v2";
const LEGACY_KEY = "5gnett_atendimentos_v1";

const SUPABASE_URL = "https://zgeenyqdbtxzkorfkmnq.supabase.co";
const SUPABASE_KEY = "sb_publishable_H2YIRxy8bVpA6UhUx2G2Yg_unN0ziVe";
const SUPABASE_TABLE = "atendimentos";

let atendimentos = [];
let editandoId = null;
let bancoOnline = false;
let sessaoGerencia = null;
let gerenciaAutorizada = false;
const GERENCIA_UID = "f29980e0-5fbd-4d35-a374-945ed68e99fd";
const AUTH_STORAGE_KEY = "5gnett_gerencia_session";

const $ = id => document.getElementById(id);

const modal = $("modalAtendimento");
const modalRelato = $("modalRelato");
const form = $("formAtendimento");
const tabela = $("tabelaAtendimentos");

function salvarBackupLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atendimentos));
}

function headersSupabase(prefer = "") {
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${sessaoGerencia?.access_token || SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  if (prefer) headers["Prefer"] = prefer;
  return headers;
}

async function carregarAtendimentosOnline() {
  const resposta = await fetch(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*&order=created_at.desc`,
    { headers: headersSupabase() }
  );

  if (!resposta.ok) {
    throw new Error(await resposta.text());
  }

  atendimentos = await resposta.json();
  bancoOnline = true;
  salvarBackupLocal();
  atualizarTela();
  atualizarRelatorios();
  atualizarBonificacao();
}

async function inserirAtendimentoOnline(registro) {
  const resposta = await fetch(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`,
    {
      method: "POST",
      headers: headersSupabase("return=representation"),
      body: JSON.stringify(registro)
    }
  );

  if (!resposta.ok) throw new Error(await resposta.text());
  const dados = await resposta.json();
  return dados[0];
}

async function atualizarAtendimentoOnline(id, registro) {
  const resposta = await fetch(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: headersSupabase("return=representation"),
      body: JSON.stringify(registro)
    }
  );

  if (!resposta.ok) throw new Error(await resposta.text());
  const dados = await resposta.json();
  return dados[0];
}

async function excluirAtendimentoOnline(id) {
  const resposta = await fetch(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: headersSupabase()
    }
  );

  if (!resposta.ok) throw new Error(await resposta.text());
}


function headersAuth(token = "") {
  const headers = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function abrirLoginGerencia() {
  $("erroLoginGerencia").hidden = true;
  $("erroLoginGerencia").textContent = "";
  $("modalLoginGerencia").classList.add("ativo");
  setTimeout(() => $("emailGerencia")?.focus(), 50);
}

function fecharLoginGerencia() {
  $("modalLoginGerencia").classList.remove("ativo");
  $("formLoginGerencia")?.reset();
  $("erroLoginGerencia").hidden = true;
}

function atualizarInterfaceGerencia() {
  document.body.classList.toggle("gerencia-logada", gerenciaAutorizada);

  if ($("btnLoginGerencia")) $("btnLoginGerencia").hidden = gerenciaAutorizada;
  if ($("btnSairGerencia")) $("btnSairGerencia").hidden = !gerenciaAutorizada;

  if ($("usuarioNome")) {
    $("usuarioNome").textContent = gerenciaAutorizada ? "Gerência 5GNETT" : "Equipe 5GNETT";
  }
  if ($("usuarioPerfil")) {
    $("usuarioPerfil").textContent = gerenciaAutorizada ? "Acesso administrativo" : "Suporte Técnico";
  }

  renderizarTabela();
}

async function validarGerencia(token, userId) {
  if (!token || !userId || String(userId) !== GERENCIA_UID) return false;

  const resposta = await fetch(
    `${SUPABASE_URL}/rest/v1/gerencia?user_id=eq.${encodeURIComponent(userId)}&select=user_id`,
    { headers: headersAuth(token) }
  );

  if (!resposta.ok) return false;
  const dados = await resposta.json();
  return Array.isArray(dados) && dados.some(item => String(item.user_id) === String(userId));
}

async function loginGerencia(email, senha) {
  const resposta = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: headersAuth(),
      body: JSON.stringify({ email, password: senha })
    }
  );

  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados?.msg || dados?.error_description || "E-mail ou senha inválidos.");
  }

  const autorizado = await validarGerencia(dados.access_token, dados.user?.id);
  if (!autorizado) {
    throw new Error("Esta conta não possui acesso à Gerência.");
  }

  sessaoGerencia = dados;
  gerenciaAutorizada = true;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(dados));
  atualizarInterfaceGerencia();
  return true;
}

async function restaurarSessaoGerencia() {
  try {
    const salva = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
    if (!salva?.access_token || !salva?.user?.id) return;

    const resposta = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: headersAuth(salva.access_token)
    });

    if (!resposta.ok) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    const usuario = await resposta.json();
    const autorizado = await validarGerencia(salva.access_token, usuario.id);

    if (autorizado) {
      sessaoGerencia = salva;
      gerenciaAutorizada = true;
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  atualizarInterfaceGerencia();
}

async function sairGerencia() {
  const token = sessaoGerencia?.access_token;

  try {
    if (token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: headersAuth(token)
      });
    }
  } catch (erro) {
    console.warn("Não foi possível encerrar a sessão no servidor:", erro);
  }

  sessaoGerencia = null;
  gerenciaAutorizada = false;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  atualizarInterfaceGerencia();
  mostrarPagina("inicio");
}

function exigirGerencia() {
  if (gerenciaAutorizada) return true;
  abrirLoginGerencia();
  return false;
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

  salvarBackupLocal();
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


const REGRAS_PONTUACAO = { Simples: 3, Normal: 4, Complexo: 5, Excelente: 6 };
const REGRAS_PENALIZACAO = { "": 0, Leve: -2, Grave: -5 };

function pontosLiquidos(item) {
  return Number(item?.pontos || 0) + Number(item?.penalizacao || 0);
}

function rotuloPontuacao(item) {
  const classificacao = item?.classificacao || "Sem classificação";
  const erro = item?.tipo_erro ? ` • Erro ${String(item.tipo_erro).toLowerCase()}` : "";
  return `${classificacao} • ${pontosLiquidos(item)} pts${erro}`;
}

async function pontuarAtendimento(id) {
  if (!exigirGerencia()) return;
  const item = atendimentos.find(a => String(a.id) === String(id));
  if (!item) return;

  const escolha = prompt(
    `Classifique o atendimento de ${item.nome}:\n\n` +
    `1 = Simples (3 pts)\n2 = Normal (4 pts)\n3 = Complexo (5 pts)\n4 = Excelente (6 pts)\n0 = Remover classificação`
  );
  if (escolha === null) return;

  const mapa = { "1":"Simples", "2":"Normal", "3":"Complexo", "4":"Excelente", "0":"" };
  if (!(escolha.trim() in mapa)) return alert("Opção de classificação inválida.");

  const classificacao = mapa[escolha.trim()];
  const pontos = classificacao ? REGRAS_PONTUACAO[classificacao] : 0;

  const escolhaErro = prompt(
    `Penalização:\n\n0 = Sem erro\n1 = Erro leve (-2 pts)\n2 = Erro grave (-5 pts)\n\nAtual: ${item.tipo_erro || "Sem erro"}`
  );
  if (escolhaErro === null) return;

  const mapaErro = { "0":"", "1":"Leve", "2":"Grave" };
  if (!(escolhaErro.trim() in mapaErro)) return alert("Opção de penalização inválida.");

  const tipoErro = mapaErro[escolhaErro.trim()];
  const registro = {
    classificacao: classificacao || null,
    pontos,
    penalizacao: REGRAS_PENALIZACAO[tipoErro],
    tipo_erro: tipoErro || null
  };

  try {
    const atualizado = await atualizarAtendimentoOnline(id, registro);
    atendimentos = atendimentos.map(a => String(a.id) === String(id) ? atualizado : a);
    salvarBackupLocal();
    atualizarTela();
    atualizarRelatorios();
    atualizarBonificacao();
  } catch (erro) {
    console.error("Erro ao pontuar atendimento:", erro);
    alert("Não foi possível salvar a pontuação no banco online.");
  }
}

function renderizarTabela() {
  const lista = obterFiltrados();

  $("contadorRegistros").textContent =
    `Total de ${lista.length} ${lista.length === 1 ? "registro" : "registros"}`;

  if (!lista.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="12" style="text-align:center;padding:36px;color:#91a4b7">
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
        <td>
          ${gerenciaAutorizada
            ? `<button class="acao-pontuar" type="button" onclick="pontuarAtendimento('${item.id}')" title="Classificar pontuação">⭐ ${escaparHTML(rotuloPontuacao(item))}</button>`
            : `<span class="pontuacao-leitura">⭐ ${escaparHTML(rotuloPontuacao(item))}</span>`}
        </td>
        <td>${conversa}</td>
        <td>
          <button class="acao-editar" type="button"
            onclick="editarAtendimento('${item.id}')" title="Editar">✎</button>
          ${gerenciaAutorizada ? `<button class="acao-excluir" type="button"
            onclick="excluirAtendimento('${item.id}')" title="Excluir">×</button>` : ""}
        </td>
      </tr>`;
  }).join("");
}

function atualizarTela() {
  atualizarCards();
  renderizarTabela();
}

function editarAtendimento(id) {
  const item = atendimentos.find(a => String(a.id) === String(id));
  if (item) abrirModal(item);
}

async function excluirAtendimento(id) {
  if (!exigirGerencia()) return;

  const item = atendimentos.find(a => String(a.id) === String(id));
  if (!item) return;

  if (!confirm(`Deseja excluir o atendimento de ${item.nome}?`)) return;

  try {
    await excluirAtendimentoOnline(id);
    atendimentos = atendimentos.filter(a => String(a.id) !== String(id));
    salvarBackupLocal();
    atualizarTela();
    atualizarRelatorios();
    atualizarBonificacao();
  } catch (erro) {
    console.error("Erro ao excluir atendimento:", erro);
    alert("Não foi possível excluir o atendimento do banco online.");
  }
}

function verRelato(id) {
  const item = atendimentos.find(a => String(a.id) === String(id));
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
window.pontuarAtendimento = pontuarAtendimento;

form.addEventListener("submit", async e => {
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

  try {
    if (editandoId !== null) {
      const atualizado = await atualizarAtendimentoOnline(editandoId, registro);
      atendimentos = atendimentos.map(a =>
        String(a.id) === String(editandoId) ? atualizado : a
      );
    } else {
      const novo = await inserirAtendimentoOnline(registro);
      atendimentos.unshift(novo);
    }

    salvarBackupLocal();
    fecharModal();
    atualizarTela();
    atualizarRelatorios();
    atualizarBonificacao();
  } catch (erro) {
    console.error("Erro ao salvar atendimento:", erro);
    alert("Não foi possível salvar o atendimento no banco online. Verifique a conexão e as políticas do Supabase.");
  }
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
    if ($("modalLoginGerencia")?.classList.contains("ativo")) fecharLoginGerencia();
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
    $("paginaBonificacao"),
    $("paginaRelatorios"),
    $("paginaConfiguracoes")
  ].filter(Boolean);

  paginas.forEach(pagina => pagina.classList.remove("ativa"));

  if (nome === "atendimentos") {
    $("paginaAtendimentos").classList.add("ativa");
    marcarMenuAtivo($("menuAtendimentos"));
    renderizarTabela();
  } else if (nome === "bonificacao") {
    if (!exigirGerencia()) return;
    $("paginaBonificacao").classList.add("ativa");
    marcarMenuAtivo($("menuBonificacao"));
    atualizarBonificacao();
  } else if (nome === "relatorios") {
    if (!exigirGerencia()) return;
    $("paginaRelatorios").classList.add("ativa");
    marcarMenuAtivo($("menuRelatorios"));
    atualizarRelatorios();
  } else if (nome === "configuracoes") {
    if (!exigirGerencia()) return;
    $("paginaConfiguracoes").classList.add("ativa");
    marcarMenuAtivo($("menuConfiguracoes"));
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


function obterDadosBonificacao() {
  const inicial = $("bonificacaoDataInicial")?.value || "";
  const final = $("bonificacaoDataFinal")?.value || "";

  return atendimentos.filter(item => {
    if (inicial && item.data < inicial) return false;
    if (final && item.data > final) return false;
    return true;
  });
}

function atualizarBonificacao() {
  if (!$("paginaBonificacao")) return;

  const lista = obterDadosBonificacao();
  const total = lista.length;
  const resolvidos = lista.filter(a => a.resolutividade === "Resolvido").length;
  const taxaEquipe = total ? Math.round((resolvidos / total) * 100) : 0;

  if ($("bonifTotal")) $("bonifTotal").textContent = total;
  if ($("bonifResolvidos")) $("bonifResolvidos").textContent = resolvidos;
  if ($("bonifTaxaEquipe")) $("bonifTaxaEquipe").textContent = `${taxaEquipe}%`;

  const nomes = ["Guilherme", "Ronald", "Ivo", "Juarez"];
  const ranking = nomes.map(nome => {
    const itens = lista.filter(a => a.atendente === nome);
    const qtd = itens.length;
    const ok = itens.filter(a => a.resolutividade === "Resolvido").length;
    const percentual = qtd ? Math.round((ok / qtd) * 100) : 0;
    const pontosBase = itens.reduce((s,a) => s + Number(a.pontos || 0), 0);
    const penalizacoes = itens.reduce((s,a) => s + Number(a.penalizacao || 0), 0);
    const pontos = pontosBase + penalizacoes;
    const classificados = itens.filter(a => a.classificacao).length;
    const media = classificados ? pontos / classificados : 0;
    return { nome, qtd, ok, percentual, pontos, penalizacoes, classificados, media };
  }).sort((a,b) =>
    b.pontos-a.pontos || b.media-a.media || b.percentual-a.percentual ||
    b.ok-a.ok || b.qtd-a.qtd || a.nome.localeCompare(b.nome)
  );

  const rankingEl = $("rankingBonificacao");
  if (rankingEl) {
    rankingEl.innerHTML = ranking.map((item, indice) => {
      const medalha = indice===0 ? "🥇" : indice===1 ? "🥈" : indice===2 ? "🥉" : "🏅";
      const faixa = item.pontos >= 350 ? "Faixa superior • +20%" :
                    item.pontos >= 250 ? "Meta atingida" :
                    `${Math.max(0,250-item.pontos)} pts para a meta`;
      return `
        <article class="ranking-card">
          <div class="ranking-posicao">${indice+1}º</div>
          <div class="ranking-medalha">${medalha}</div>
          <h4>${escaparHTML(item.nome)}</h4>
          <strong>${item.pontos} pts</strong>
          <span>${item.qtd} atendimentos • média ${item.media.toFixed(2).replace(".",",")} pts • ${item.percentual}% resolutividade</span>
          <span>${faixa}${item.penalizacoes ? ` • penalizações ${item.penalizacoes} pts` : ""}</span>
        </article>`;
    }).join("");
  }

  const lider = ranking.find(item => item.qtd > 0);
  if (lider) {
    if ($("bonifLiderNome")) $("bonifLiderNome").textContent = lider.nome;
    if ($("bonifLiderTaxa")) $("bonifLiderTaxa").textContent = `${lider.pontos} pts`;
    if ($("bonifLiderResumo")) $("bonifLiderResumo").textContent =
      `${lider.qtd} atendimentos • média ${lider.media.toFixed(2).replace(".",",")} pts • ${lider.percentual}% de resolutividade.`;
  } else {
    if ($("bonifLiderNome")) $("bonifLiderNome").textContent = "Nenhum atendimento";
    if ($("bonifLiderTaxa")) $("bonifLiderTaxa").textContent = "0 pts";
    if ($("bonifLiderResumo")) $("bonifLiderResumo").textContent =
      "Cadastre e classifique atendimentos para gerar o ranking da equipe.";
  }
}

const menuInicio = $("menuInicio");
const menuAtendimentos = $("menuAtendimentos");
const menuRelatorios = $("menuRelatorios");
const menuConfiguracoes = $("menuConfiguracoes");
const menuBonificacao = $("menuBonificacao");
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

if (menuBonificacao) {
  menuBonificacao.addEventListener("click", () => mostrarPagina("bonificacao"));
}

if (menuConfiguracoes) {
  menuConfiguracoes.addEventListener("click", () => mostrarPagina("configuracoes"));
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


if ($("btnFiltrarBonificacao")) {
  $("btnFiltrarBonificacao").addEventListener("click", atualizarBonificacao);
}

if ($("btnLimparBonificacao")) {
  $("btnLimparBonificacao").addEventListener("click", () => {
    $("bonificacaoDataInicial").value = "";
    $("bonificacaoDataFinal").value = "";
    atualizarBonificacao();
  });
}


if ($("btnLoginGerencia")) $("btnLoginGerencia").addEventListener("click", abrirLoginGerencia);
if ($("fecharLoginGerencia")) $("fecharLoginGerencia").addEventListener("click", fecharLoginGerencia);
if ($("cancelarLoginGerencia")) $("cancelarLoginGerencia").addEventListener("click", fecharLoginGerencia);
if ($("btnSairGerencia")) $("btnSairGerencia").addEventListener("click", sairGerencia);

if ($("modalLoginGerencia")) {
  $("modalLoginGerencia").addEventListener("click", e => {
    if (e.target === $("modalLoginGerencia")) fecharLoginGerencia();
  });
}

if ($("formLoginGerencia")) {
  $("formLoginGerencia").addEventListener("submit", async e => {
    e.preventDefault();

    const email = $("emailGerencia").value.trim();
    const senha = $("senhaGerencia").value;
    const erro = $("erroLoginGerencia");
    const botao = e.submitter;

    erro.hidden = true;
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Entrando...";
    }

    try {
      await loginGerencia(email, senha);
      fecharLoginGerencia();
    } catch (falha) {
      console.error("Falha no login da Gerência:", falha);
      erro.textContent = falha.message || "Não foi possível entrar na Gerência.";
      erro.hidden = false;
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Entrar na Gerência";
      }
    }
  });
}

async function iniciarSistema() {
  mostrarDataAtual();
  await restaurarSessaoGerencia();

  try {
    await carregarAtendimentosOnline();
    console.log("5GNETT: banco online conectado.");
  } catch (erro) {
    console.error("5GNETT: falha ao carregar Supabase.", erro);

    const backup = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    atendimentos = Array.isArray(backup) ? backup : [];

    atualizarTela();
    atualizarRelatorios();
    atualizarBonificacao();

    alert("Não foi possível conectar ao banco online. O sistema exibirá o backup local deste navegador.");
  }
}

iniciarSistema();
