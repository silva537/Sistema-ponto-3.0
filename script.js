let plantoes = JSON.parse(localStorage.getItem('pontovigia_plantoes')) || [];
let folhasArquivadas = JSON.parse(localStorage.getItem('pontovigia_folhas')) || [];
let logsPlantao = JSON.parse(localStorage.getItem('pontovigia_logs')) || [];
let metaMensal = parseFloat(localStorage.getItem('pontovigia_meta')) || 1000.00;

// Configuração do Supabase (Carregada do LocalStorage ou vazia para configurar no ADM)
let supabaseUrl = localStorage.getItem('https://sgammtgdylghpufkidfi.supabase.co') || '';
let supabaseKey = localStorage.getItem('sb_publishable_YRz40KFT9DTNqBQooNRGPw_kpU2PhYi') || '';
let supabaseClient = null;

if (supabaseUrl && supabaseKey && window.supabase) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarDataAtual();
    carregarDadosInterface();
    configurarOuvintesEventos();
    atualizarUIPlantaoAtivo();
    renderizarTabelaLogs();
    
    // Inicializa carregamento do mural na nuvem se configurado
    carregarAnunciosTrocaCloud();
    
    // Preenche inputs do adm se já salvos
    if (document.getElementById('inputSupabaseUrl')) document.getElementById('inputSupabaseUrl').value = supabaseUrl;
    if (document.getElementById('inputSupabaseKey')) document.getElementById('inputSupabaseKey').value = supabaseKey;
});

function salvarCredenciaisSupabase() {
    const url = document.getElementById('inputSupabaseUrl').value.trim();
    const key = document.getElementById('inputSupabaseKey').value.trim();
    if (!url || !key) {
        alert('Preencha a URL e a Chave do Supabase.');
        return;
    }
    localStorage.setItem('pontovigia_sb_url', url);
    localStorage.setItem('pontovigia_sb_key', key);
    alert('Credenciais salvas com sucesso! Recarregando aplicação...');
    location.reload();
}

function inicializarDataAtual() {
    const hoje = new Date().toISOString().split('T')[0];
    const inputData = document.getElementById('inputData');
    if (inputData && !inputData.value) {
        inputData.value = hoje;
    }
}

function configurarOuvintesEventos() {
    const btnSalvar = document.getElementById('btnSalvarPlantao');
    if (btnSalvar) btnSalvar.addEventListener('click', salvarPlantao);

    const btnAjustarMeta = document.getElementById('btnAjustarMeta');
    if (btnAjustarMeta) btnAjustarMeta.addEventListener('click', ajustarMetaMensal);

    const btnFecharFolha = document.getElementById('btnFecharFolha');
    if (btnFecharFolha) btnFecharFolha.addEventListener('click', fecharFolhaAtual);

    const btnExportarCsv = document.getElementById('btnExportarCsv');
    if (btnExportarCsv) btnExportarCsv.addEventListener('click', exportarParaCsv);
}

function salvarPlantao() {
    const data = document.getElementById('inputData').value;
    const turno = document.getElementById('inputTurno').value;
    const inicio = document.getElementById('inputInicio').value;
    const fim = document.getElementById('inputFim').value;
    const sono = parseFloat(document.getElementById('inputSono').value) || 0;
    const valor = parseFloat(document.getElementById('inputValor').value) || 0;
    const cobertura = document.getElementById('inputCobertura').value.trim();
    const obs = document.getElementById('inputObs').value.trim();

    if (!data) {
        alert('Por favor, informe a data do plantão.');
        return;
    }

    const novoPlantao = { id: Date.now(), data, turno, inicio, fim, sono, valor, cobertura, obs };
    plantoes.push(novoPlantao);
    sincronizarBanco();
    carregarDadosInterface();
    limparFormulario();
}

function limparFormulario() {
    document.getElementById('inputSono').value = '0';
    document.getElementById('inputCobertura').value = '';
    document.getElementById('inputObs').value = '';
    inicializarDataAtual();
}

function excluirPlantao(id) {
    if (confirm('Deseja realmente excluir este plantão?')) {
        plantoes = plantoes.filter(p => p.id !== id);
        sincronizarBanco();
        carregarDadosInterface();
    }
}

function sincronizarBanco() {
    localStorage.setItem('pontovigia_plantoes', JSON.stringify(plantoes));
    localStorage.setItem('pontovigia_folhas', JSON.stringify(folhasArquivadas));
    localStorage.setItem('pontovigia_meta', metaMensal);
}

function carregarDadosInterface() {
    atualizarTabelaHistorico();
    atualizarMetricasResumo();
    atualizarBarraMeta();
}

function atualizarTabelaHistorico() {
    const tbody = document.getElementById('tabelaHistoricoBody');
    const txtTotalFiltrado = document.getElementById('totalFiltradoValor');
    if (!tbody) return;

    tbody.innerHTML = '';
    let totalGeral = 0;

    if (plantoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 15px;">Nenhum plantão registrado.</td></tr>`;
        if (txtTotalFiltrado) txtTotalFiltrado.textContent = 'R$ 0.00';
        return;
    }

    plantoes.forEach(p => {
        totalGeral += p.valor;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.data.split('-').reverse().join('/')}</strong></td>
            <td>${p.turno} (${p.inicio}-${p.fim})</td>
            <td><strong>R$ ${p.valor.toFixed(2)}</strong></td>
            <td><button onclick="excluirPlantao(${p.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer;">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });

    if (txtTotalFiltrado) txtTotalFiltrado.textContent = `R$ ${totalGeral.toFixed(2)}`;
}

function atualizarMetricasResumo() {
    const totalQtd = plantoes.length;
    let somaValores = plantoes.reduce((acc, p) => acc + p.valor, 0);
    const mediaValor = totalQtd > 0 ? somaValores / totalQtd : 0;

    if (document.getElementById('totalPlantoesQtd')) document.getElementById('totalPlantoesQtd').textContent = totalQtd;
    if (document.getElementById('mediaPorPlantao')) document.getElementById('mediaPorPlantao').textContent = `R$ ${mediaValor.toFixed(2)}`;
}

function atualizarBarraMeta() {
    let somaValores = plantoes.reduce((acc, p) => acc + p.valor, 0);
    const porcentagem = metaMensal > 0 ? Math.min((somaValores / metaMensal) * 100, 100) : 0;

    if (document.getElementById('metaValorTexto')) document.getElementById('metaValorTexto').textContent = `R$ ${metaMensal.toFixed(2)}`;
    if (document.getElementById('metaPorcentagem')) document.getElementById('metaPorcentagem').textContent = `${porcentagem.toFixed(0)}%`;
    if (document.getElementById('progressBarFill')) document.getElementById('progressBarFill').style.width = `${porcentagem}%`;
}

function ajustarMetaMensal() {
    const novaMeta = prompt('Informe o valor da nova meta mensal (R$):', metaMensal);
    if (novaMeta !== null && !isNaN(novaMeta) && parseFloat(novaMeta) > 0) {
        metaMensal = parseFloat(novaMeta);
        sincronizarBanco();
        atualizarBarraMeta();
    }
}

function fecharFolhaAtual() {
    if (plantoes.length === 0) {
        alert('Não há plantões para fechar.');
        return;
    }
    if (confirm('Deseja arquivar a folha atual e zerar os registros?')) {
        folhasArquivadas.push({ id: Date.now(), dataFechamento: new Date().toLocaleDateString('pt-BR'), itens: [...plantoes] });
        plantoes = [];
        sincronizarBanco();
        carregarDadosInterface();
        alert('Folha fechada com sucesso!');
    }
}

function exportarParaCsv() {
    if (plantoes.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,Data;Turno;Inicio;Fim;Valor\r\n";
    plantoes.forEach(p => { csvContent += `${p.data};${p.turno};${p.inicio};${p.fim};${p.valor}\r\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "relatorio_plantoes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// MÓDULO DE PLANTÃO ATIVO, LOGS E REFEIÇÕES
// ==========================================
let plantaoAtivoTimer = null;

function realizarCheckIn() {
    if (localStorage.getItem('pontovigia_ativo')) {
        alert('Já existe um plantão em andamento!');
        return;
    }

    const agora = new Date();
    const dados = {
        id: Date.now(),
        data: agora.toISOString().split('T')[0],
        entrada: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        inicioTimestamp: agora.getTime(),
        pausaInicio: null,
        pausaFim: null,
        saida: null,
        status: 'Em andamento'
    };

    localStorage.setItem('pontovigia_ativo', JSON.stringify(dados));
    atualizarUIPlantaoAtivo();
    alert('Check-in (Entrada) realizado com sucesso!');
}

function registrarPausaRefeicao() {
    const ativo = localStorage.getItem('pontovigia_ativo');
    if (!ativo) {
        alert('Você precisa estar com um plantão ativo para registrar o intervalo de almoço/janta.');
        return;
    }

    let dados = JSON.parse(ativo);
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (!dados.pausaInicio) {
        dados.pausaInicio = horaFormatada;
        localStorage.setItem('pontovigia_ativo', JSON.stringify(dados));
        alert(`Início de refeição (Almoço/Janta) registrado às ${horaFormatada}. Clique novamente quando retornar.`);
    } else if (!dados.pausaFim) {
        dados.pausaFim = horaFormatada;
        localStorage.setItem('pontovigia_ativo', JSON.stringify(dados));
        alert(`Fim de refeição registrado às ${horaFormatada}.`);
    } else {
        alert('Você já registrou a saída e o retorno da refeição para este plantão.');
    }
}

function realizarCheckOut() {
    const ativo = localStorage.getItem('pontovigia_ativo');
    if (!ativo) return;

    let dados = JSON.parse(ativo);
    const agora = new Date();
    
    dados.saida = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    dados.status = 'Concluído';

    logsPlantao.push(dados);
    localStorage.setItem('pontovigia_logs', JSON.stringify(logsPlantao));

    if (document.getElementById('inputData')) document.getElementById('inputData').value = dados.data;
    if (document.getElementById('inputInicio')) document.getElementById('inputInicio').value = dados.entrada;
    if (document.getElementById('inputFim')) document.getElementById('inputFim').value = dados.saida;

    localStorage.removeItem('pontovigia_ativo');
    if (plantaoAtivoTimer) clearInterval(plantaoAtivoTimer);

    atualizarUIPlantaoAtivo();
    renderizarTabelaLogs();
    alert('Check-out realizado! O log detalhado foi salvo no histórico.');
}

function atualizarUIPlantaoAtivo() {
    const ativo = localStorage.getItem('pontovigia_ativo');
    const txt = document.getElementById('txtCronometroPlantao');
    const btnIn = document.getElementById('btnCheckIn');
    const btnOut = document.getElementById('btnCheckOut');
    const btnPausa = document.getElementById('btnPausaRefeicao');
    const tag = document.getElementById('statusPlantaoAtivoTag');

    if (!txt) return;

    if (ativo) {
        const dados = JSON.parse(ativo);
        if (btnIn) btnIn.disabled = true;
        if (btnOut) btnOut.disabled = false;
        if (btnPausa) btnPausa.disabled = false;
        if (tag) {
            tag.textContent = "🟢 ATIVO";
            tag.style.background = "rgba(16, 185, 129, 0.1)";
            tag.style.color = "#34d399";
        }

        if (plantaoAtivoTimer) clearInterval(plantaoAtivoTimer);
        plantaoAtivoTimer = setInterval(() => {
            const diff = Math.floor((new Date().getTime() - dados.inicioTimestamp) / 1000);
            const h = Math.floor(diff / 3600).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            txt.textContent = `Iniciado às ${dados.entrada} • Tempo: ${h}:${m}:${s}`;
        }, 1000);
    } else {
        txt.textContent = "Nenhum plantão em andamento.";
        if (btnIn) btnIn.disabled = false;
        if (btnOut) btnOut.disabled = true;
        if (btnPausa) btnPausa.disabled = true;
        if (tag) {
            tag.textContent = "🔴 INATIVO";
            tag.style.background = "rgba(59,130,246,0.1)";
            tag.style.color = "#60a5fa";
        }
        if (plantaoAtivoTimer) clearInterval(plantaoAtivoTimer);
    }
}

function renderizarTabelaLogs() {
    const containerLogs = document.getElementById('tabelaLogsBody');
    if (!containerLogs) return;

    containerLogs.innerHTML = '';
    if (logsPlantao.length === 0) {
        containerLogs.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum log de ponto registrado.</td></tr>`;
        return;
    }

    logsPlantao.slice().reverse().forEach(log => {
        const tr = document.createElement('tr');
        const pausaTexto = log.pausaInicio ? `${log.pausaInicio} até ${log.pausaFim || 'em aberto'}` : 'Não reg.';
        tr.innerHTML = `
            <td>${log.data.split('-').reverse().join('/')}</td>
            <td>${log.entrada}</td>
            <td>${pausaTexto}</td>
            <td>${log.saida || 'Em aberto'}</td>
            <td><button onclick="excluirLog(${log.id})" style="background:transparent; border:none; color:#ef4444; cursor:pointer;">🗑️</button></td>
        `;
        containerLogs.appendChild(tr);
    });
}

function excluirLog(id) {
    if (confirm('Deseja excluir este registro de log?')) {
        logsPlantao = logsPlantao.filter(l => l.id !== id);
        localStorage.setItem('pontovigia_logs', JSON.stringify(logsPlantao));
        renderizarTabelaLogs();
    }
}

// ==========================================
// MURAL DE TROCAS & CARONA SOLIDÁRIA (SUPABASE)
// ==========================================
function abrirModalAnunciarTroca() {
    const modal = document.getElementById('modalTrocaPlantao');
    if (modal) modal.style.display = 'flex';
}

function fecharModalTroca() {
    const modal = document.getElementById('modalTrocaPlantao');
    if (modal) modal.style.display = 'none';
}

async function carregarAnunciosTrocaCloud() {
    const container = document.getElementById('muralTrocasContainer');
    if (!container) return;

    if (!supabaseClient) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 10px;">⚠️ Supabase não configurado. Abra o menu lateral (⚙️ ADM) para inserir as credenciais e habilitar o mural em nuvem.</p>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('mural_trocas')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 10px;">Nenhum plantão anunciado para troca no momento.</p>`;
            return;
        }

        container.innerHTML = '';
        data.forEach(anuncio => {
            const dataFmt = anuncio.data.includes('-') ? anuncio.data.split('-').reverse().join('/') : anuncio.data;
            const item = document.createElement('div');
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-bottom: 6px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid var(--border); font-size: 12px;";
            item.innerHTML = `
                <div>
                    <strong style="color: var(--accent);">${dataFmt}</strong> • <span>${anuncio.nome}</span>
                    <div style="color: var(--text-muted); font-size: 11px;">${anuncio.motivo}</div>
                </div>
                <button onclick="excluirAnuncioTrocaCloud(${anuncio.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer;">🗑️</button>
            `;
            container.appendChild(item);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color: #ef4444; font-size: 11px; text-align: center; padding: 10px;">Erro ao carregar dados da nuvem. Verifique a tabela "mural_trocas" no Supabase.</p>`;
    }
}

async function publicarAnuncioTrocaCloud() {
    const data = document.getElementById('inputTrocaData').value;
    const nome = document.getElementById('inputTrocaNome').value.trim();
    const motivo = document.getElementById('inputTrocaMotivo').value.trim();

    if (!data || !nome) {
        alert('Preencha a data e o seu nome para anunciar.');
        return;
    }

    if (!supabaseClient) {
        alert('Configure as credenciais do Supabase no painel administrativo primeiro.');
        return;
    }

    const novoAnuncio = {
        id: Date.now(),
        data: data,
        nome,
        motivo: motivo || 'Sem observações'
    };

    try {
        const { error } = await supabaseClient.from('mural_trocas').insert([novoAnuncio]);
        if (error) throw error;

        carregarAnunciosTrocaCloud();
        fecharModalTroca();
        alert('Anúncio publicado na nuvem com sucesso para todos os colegas!');
    } catch (err) {
        console.error(err);
        alert('Erro ao publicar anúncio na nuvem.');
    }
}

async function excluirAnuncioTrocaCloud(id) {
    if (!supabaseClient) return;
    if (confirm('Deseja remover este anúncio do mural global?')) {
        try {
            const { error } = await supabaseClient.from('mural_trocas').delete().eq('id', id);
            if (error) throw error;
            carregarAnunciosTrocaCloud();
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir anúncio.');
        }
    }
}
