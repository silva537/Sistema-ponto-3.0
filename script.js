// --- VARIÁVEIS GLOBAIS E ESTADO DO SISTEMA ---
let dbPlantoes = JSON.parse(localStorage.getItem('valis_plantoes')) || [];
let dbLogsPonto = JSON.parse(localStorage.getItem('valis_logs_ponto')) || [];
let dbFolhasArquivadas = JSON.parse(localStorage.getItem('valis_folhas_arquivadas')) || [];
let metaMensal = parseFloat(localStorage.getItem('valis_meta')) || 1000.00;
let dataPrevisaoCash = localStorage.getItem('valis_previsao_cash') || '';
let dataFechamentoRh = localStorage.getItem('valis_fechamento_rh') || '';

// Configurações Supabase e Webhook
let supabaseUrlConfig = localStorage.getItem('valis_supabase_url') || '';
let supabaseKeyConfig = localStorage.getItem('valis_supabase_key') || '';
let webhookUrlConfig = localStorage.getItem('valis_webhook_url') || '';
let supabaseClient = null;

let plantaoAtivoState = JSON.parse(localStorage.getItem('valis_plantao_ativo_state')) || {
    ativo: false,
    checkInTime: null,
    intervaloInicio: null,
    totalMinutosIntervalo: 0,
    emPausa: false
};

// Inicialização Principal ao Carregar a Página
document.addEventListener('DOMContentLoaded', () => {
    inicializarSupabase();
    carregarConfiguracoesNaTela();
    definirDataAtualPadrao();
    atualizarTabelaHistorico();
    atualizarTabelaLogs();
    atualizarMetricasGerais();
    atualizarEstadoPlantaoUI();
    verificarAlertaFadiga();
    carregarMuralTrocasNuvem();

    // Event Listeners
    const btnSalvar = document.getElementById('btnSalvarPlantao');
    if (btnSalvar) btnSalvar.addEventListener('click', salvarNovoPlantao);

    const btnExportar = document.getElementById('btnExportarCsv');
    if (btnExportar) btnExportar.addEventListener('click', exportarParaCsvDiscriminado);

    const btnAjustarMeta = document.getElementById('btnAjustarMeta');
    if (btnAjustarMeta) btnAjustarMeta.addEventListener('click', ajustarMetaMensalPrompt);

    const btnFecharFolha = document.getElementById('btnFecharFolha');
    if (btnFecharFolha) btnFecharFolha.addEventListener('click', fecharFolhaAtual);

    // Timer para cronômetro de plantão ativo
    setInterval(atualizarCronometroPlantao, 1000);
});

// --- CLIENTE SUPABASE & CONFIGURAÇÕES ---
function inicializarSupabase() {
    if (supabaseUrlConfig && supabaseKeyConfig && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(supabaseUrlConfig, supabaseKeyConfig);
            console.log("Supabase inicializado com sucesso!");
        } catch (e) {
            console.error("Erro ao iniciar Supabase:", e);
        }
    }
}
function carregarConfiguracoesNaTela() {
    if (document.getElementById('inputSupabaseUrl')) document.getElementById('inputSupabaseUrl').value = supabaseUrlConfig;
    if (document.getElementById('inputSupabaseKey')) document.getElementById('inputSupabaseKey').value = supabaseKeyConfig;
    if (document.getElementById('inputWebhookUrl')) document.getElementById('inputWebhookUrl').value = webhookUrlConfig;
}

function tentarAbrirMenuDev() {
    document.getElementById('devSidebar').classList.add('open');
    document.getElementById('devOverlay').classList.add('open');
}

function fecharMenuDev() {
    document.getElementById('devSidebar').classList.remove('open');
    document.getElementById('devOverlay').classList.remove('open');
}

function tentarLogarAdm() {
    const senha = document.getElementById('inputSenhaAdm').value;
    if (senha === '2026' || senha === 'admin') {
        document.getElementById('painelLoginAdm').style.display = 'none';
        document.getElementById('conteudoProtegidoAdm').style.display = 'block';
        alert("Acesso autorizado!");
    } else {
        alert("Senha incorreta!");
    }
}

function logoutAdm() {
    document.getElementById('painelLoginAdm').style.display = 'block';
    document.getElementById('conteudoProtegidoAdm').style.display = 'none';
    document.getElementById('inputSenhaAdm').value = '';
}

function salvarCredenciaisSupabase() {
    supabaseUrlConfig = document.getElementById('inputSupabaseUrl').value.trim();
    supabaseKeyConfig = document.getElementById('inputSupabaseKey').value.trim();
    localStorage.setItem('valis_supabase_url', supabaseUrlConfig);
    localStorage.setItem('valis_supabase_key', supabaseKeyConfig);
    inicializarSupabase();
    alert("Credenciais do Supabase salvas!");
    carregarMuralTrocasNuvem();
}

function salvarWebhookUrl() {
    webhookUrlConfig = document.getElementById('inputWebhookUrl').value.trim();
    localStorage.setItem('valis_webhook_url', webhookUrlConfig);
    alert("URL do Webhook salva com sucesso!");
}

async function testarEnvioWebhook() {
    if (!webhookUrlConfig) {
        alert("Configure a URL do Webhook primeiro!");
        return;
    }
    try {
        const payload = {
            content: "🚨 **Teste de Disparo** - Sistema Nexus Plantões Pro operando normalmente na nuvem!"
        };
        const resposta = await fetch(webhookUrlConfig, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (resposta.ok || resposta.status === 204) {
            alert("Disparo de teste enviado com sucesso!");
        } else {
            alert("Erro ao disparar webhook. Verifique a URL.");
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão ao enviar webhook.");
    }
}
function definirDataAtualPadrao() {
    const hoje = new Date().toISOString().split('T')[0];
    const el = document.getElementById('inputData');
    if (el && !el.value) el.value = hoje;
}

// --- MODO PLANTÃO ATIVO & PONTO ---
function realizarCheckIn() {
    const agora = new Date();
    plantaoAtivoState.ativo = true;
    plantaoAtivoState.checkInTime = agora.toISOString();
    plantaoAtivoState.intervaloInicio = null;
    plantaoAtivoState.totalMinutosIntervalo = 0;
    plantaoAtivoState.emPausa = false;

    salvarEstadoPlantaoLocal();
    atualizarEstadoPlantaoUI();
    
    // Adicionar log inicial
    const novoLog = {
        id: Date.now(),
        data: agora.toISOString().split('T')[0],
        entrada: agora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        refeicao: 'Não tirada',
        saida: '-'
    };
    dbLogsPonto.unshift(novoLog);
    salvarDadosLocais();
    atualizarTabelaLogs();
    alert("Check-in realizado com sucesso! Bom plantão.");
}

function realizarCheckOut() {
    if (!plantaoAtivoState.ativo) return;
    const agora = new Date();
    const horaSaida = agora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    if (dbLogsPonto.length > 0) {
        dbLogsPonto[0].saida = horaSaida;
        salvarDadosLocais();
        atualizarTabelaLogs();
    }

    plantaoAtivoState.ativo = false;
    plantaoAtivoState.emPausa = false;
    salvarEstadoPlantaoLocal();
    atualizarEstadoPlantaoUI();
    alert("Check-out registrado com sucesso!");
}

function registrarPausaRefeicao() {
    if (!plantaoAtivoState.ativo) return;
    const agora = new Date();
    const horaStr = agora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    if (!plantaoAtivoState.emPausa) {
        plantaoAtivoState.emPausa = true;
        plantaoAtivoState.intervaloInicio = agora.getTime();
        if (dbLogsPonto.length > 0) {
            dbLogsPonto[0].refeicao = `Início: ${horaStr}`;
            salvarDadosLocais();
            atualizarTabelaLogs();
        }
        alert("Pausa para refeição iniciada.");
    } else {
        plantaoAtivoState.emPausa = false;
        const duracaoMin = Math.round((agora.getTime() - plantaoAtivoState.intervaloInicio) / 60000);
        if (dbLogsPonto.length > 0) {
            dbLogsPonto[0].refeicao += ` | Fim: ${horaStr} (${duracaoMin}m)`;
            salvarDadosLocais();
            atualizarTabelaLogs();
        }
        alert(`Retorno da refeição registrado! Duração: ${duracaoMin} minutos.`);
    }
    salvarEstadoPlantaoLocal();
    atualizarEstadoPlantaoUI();
}

function salvarEstadoPlantaoLocal() {
    localStorage.setItem('valis_plantao_ativo_state', JSON.stringify(plantaoAtivoState));
}

function atualizarEstadoPlantaoUI() {
    const tag = document.getElementById('statusPlantaoAtivoTag');
    const btnIn = document.getElementById('btnCheckIn');
    const btnOut = document.getElementById('btnCheckOut');
    const btnPausa = document.getElementById('btnPausaRefeicao');

    if (plantaoAtivoState.ativo) {
        if (tag) {
            tag.innerText = plantaoAtivoState.emPausa ? '🍽️ EM REFEIÇÃO' : '🟢 EM ANDAMENTO';
            tag.style.background = 'rgba(5,150,105,0.1)';
            tag.style.color = '#34d399';
        }
        if (btnIn) btnIn.disabled = true;
        if (btnOut) btnOut.disabled = false;
        if (btnPausa) {
            btnPausa.disabled = false;
            btnPausa.innerText = plantaoAtivoState.emPausa ? '▶️ Retornar do Almoço / Janta' : '🍽️ Registrar Almoço / Janta (Início/Fim)';
        }
    } else {
        if (tag) {
            tag.innerText = '🔴 INATIVO';
            tag.style.background = 'rgba(59,130,246,0.1)';
            tag.style.color = '#60a5fa';
        }
        if (btnIn) btnIn.disabled = false;
        if (btnOut) btnOut.disabled = true;
        if (btnPausa) {
            btnPausa.disabled = true;
            btnPausa.innerText = '🍽️ Registrar Almoço / Janta (Início/Fim)';
        }
    }
}

function atualizarCronometroPlantao() {
    if (!plantaoAtivoState.ativo || !plantaoAtivoState.checkInTime) {
        const txt = document.getElementById('txtCronometroPlantao');
        if (txt && txt.innerText !== 'Nenhum plantão em andamento.') {
            txt.innerText = 'Nenhum plantão em andamento.';
        }
        return;
    }
    const inicio = new Date(plantaoAtivoState.checkInTime).getTime();
    const agora = new Date().getTime();
    const diffMs = agora - inicio;

    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diffMs % (1000 * 60)) / 1000);

    const txt = document.getElementById('txtCronometroPlantao');
    if (txt) {
        txt.innerText = `Tempo decorrido: ${String(horas).padStart(2,'0')}:${String(minutos).padStart(2,'0')}:${String(segundos).padStart(2,'0')}`;
    }
}

// --- SALVAR PLANTÃO MANUAL ---
function salvarNovoPlantao() {
    const data = document.getElementById('inputData').value;
    const turno = document.getElementById('inputTurno').value;
    const inicio = document.getElementById('inputInicio').value;
    const fim = document.getElementById('inputFim').value;
    const sono = parseFloat(document.getElementById('inputSono').value) || 0;
    const valorBase = parseFloat(document.getElementById('inputValor').value) || 0;
    const horasExtras = parseFloat(document.getElementById('inputHorasExtras').value) || 0;
    const adicionalNoturno = parseFloat(document.getElementById('inputAdicionalNoturno').value) || 0;
    const cobertura = document.getElementById('inputCobertura').value.trim();
    const obs = document.getElementById('inputObs').value.trim();

    if (!data) {
        alert("Por favor, preencha a data do plantão.");
        return;
    }

    let valorHeTotal = horasExtras * (valorBase / 12); 
    let valorAdicionalTotal = (valorBase * (adicionalNoturno / 100));
    let valorTotal = valorBase + valorHeTotal + valorAdicionalTotal;

    const novoPlantao = {
        id: Date.now(),
        data,
        turno,
        inicio,
        fim,
        sono,
        valorBase,
        horasExtras,
        adicionalNoturno,
        valorTotal,
        cobertura,
        obs,
        tipo: cobertura ? 'Cobertura' : 'Próprio'
    };

    dbPlantoes.unshift(novoPlantao);
    salvarDadosLocais();
    atualizarTabelaHistorico();
    atualizarMetricasGerais();
    verificarAlertaFadiga();

    alert("Plantão salvo com sucesso!");
    document.getElementById('inputObs').value = '';
    document.getElementById('inputCobertura').value = '';
}

function salvarDadosLocais() {
    localStorage.setItem('valis_plantoes', JSON.stringify(dbPlantoes));
    localStorage.setItem('valis_logs_ponto', JSON.stringify(dbLogsPonto));
    localStorage.setItem('valis_folhas_arquivadas', JSON.stringify(dbFolhasArquivadas));
    localStorage.setItem('valis_meta', metaMensal);
    localStorage.setItem('valis_previsao_cash', dataPrevisaoCash);
    localStorage.setItem('valis_fechamento_rh', dataFechamentoRh);
}
// --- MÉTRICAS, FADIGA E EXTRATOS ---
function atualizarMetricasGerais() {
    let totalAcumulado = 0;
    let qtdProprios = 0;
    let qtdCoberturas = 0;
    let somaSono = 0;

    dbPlantoes.forEach(p => {
        totalAcumulado += p.valorTotal;
        somaSono += p.sono;
        if (p.tipo === 'Cobertura') qtdCoberturas++;
        else qtdProprios++;
    });

    const totalQtd = dbPlantoes.length;
    const mediaPlantao = totalQtd > 0 ? (totalAcumulado / totalQtd) : 0;
    const mediaSono = totalQtd > 0 ? (somaSono / totalQtd).toFixed(1) : 0;

    if (document.getElementById('totalPlantoesQtd')) document.getElementById('totalPlantoesQtd').innerText = totalQtd;
    if (document.getElementById('propriosCoberturasQtd')) document.getElementById('propriosCoberturasQtd').innerText = `${qtdProprios} / ${qtdCoberturas}`;
    if (document.getElementById('mediaPorPlantao')) document.getElementById('mediaPorPlantao').innerText = `R$ ${mediaPlantao.toFixed(2)}`;
    if (document.getElementById('mediaSonoVal')) document.getElementById('mediaSonoVal').innerText = `${mediaSono}h`;
    if (document.getElementById('totalFiltradoValor')) document.getElementById('totalFiltradoValor').innerText = `R$ ${totalAcumulado.toFixed(2)}`;

    const porcentagemMeta = metaMensal > 0 ? Math.min(Math.round((totalAcumulado / metaMensal) * 100), 100) : 100;
    if (document.getElementById('metaValorTexto')) document.getElementById('metaValorTexto').innerText = `R$ ${metaMensal.toFixed(2)}`;
    if (document.getElementById('metaPorcentagem')) document.getElementById('metaPorcentagem').innerText = `${porcentagemMeta}%`;
    if (document.getElementById('progressBarFill')) document.getElementById('progressBarFill').style.width = `${porcentagemMeta}%`;
}

function verificarAlertaFadiga() {
    const box = document.getElementById('alertaFadigaBox');
    if (!box) return;

    let plantoesBaixoSono = dbPlantoes.filter(p => p.sono < 5);
    if (plantoesBaixoSono.length >= 2) {
        box.style.display = 'flex';
        document.getElementById('txtMensagemFadiga').innerText = `Detectados ${plantoesBaixoSono.length} plantões com menos de 5h de sono. Cuidado com o desgaste!`;
    } else {
        box.style.display = 'none';
    }
}

function atualizarTabelaHistorico() {
    const tbody = document.getElementById('tabelaHistoricoBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (dbPlantoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhum plantão registrado.</td></tr>`;
        return;
    }

    dbPlantoes.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${p.data}</strong><br>
                <span style="font-size: 10px; color: var(--text-muted);">${p.obs || p.tipo}</span>
            </td>
            <td>${p.turno}<br><span style="font-size: 10px; color: var(--text-muted);">${p.inicio} - ${p.fim}</span></td>
            <td><strong>R$ ${p.valorTotal.toFixed(2)}</strong></td>
            <td><button onclick="deletarPlantao(${p.id})" style="background: rgba(239,68,68,0.2); color: #ef4444; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Excluir</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarTabelaLogs() {
    const tbody = document.getElementById('tabelaLogsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (dbLogsPonto.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum log de ponto registrado.</td></tr>`;
        return;
    }

    dbLogsPonto.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size: 11px;">${l.data}</td>
            <td style="font-size: 11px; color: #34d399;">${l.entrada}</td>
            <td style="font-size: 11px; color: #fbbf24;">${l.refeicao}</td>
            <td style="font-size: 11px; color: #f87171;">${l.saida}</td>
            <td><button onclick="deletarLog(${l.id})" style="background: rgba(239,68,68,0.2); color: #ef4444; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 10px;">✕</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function deletarPlantao(id) {
    if (confirm("Deseja realmente excluir este plantão?")) {
        dbPlantoes = dbPlantoes.filter(p => p.id !== id);
        salvarDadosLocais();
        atualizarTabelaHistorico();
        atualizarMetricasGerais();
        verificarAlertaFadiga();
    }
}

function deletarLog(id) {
    dbLogsPonto = dbLogsPonto.filter(l => l.id !== id);
    salvarDadosLocais();
    atualizarTabelaLogs();
}

// --- MURAL DE TROCA GLOBAL (NUVEM) ---
function abrirModalAnunciarTroca() {
    const modal = document.getElementById('modalTrocaPlantao');
    if (modal) modal.style.display = 'flex';
    const inputD = document.getElementById('inputTrocaData');
    if (inputD && !inputD.value) inputD.value = new Date().toISOString().split('T')[0];
}

function fecharModalTroca() {
    const modal = document.getElementById('modalTrocaPlantao');
    if (modal) modal.style.display = 'none';
}

async function publicarAnuncioTrocaCloud() {
    const data = document.getElementById('inputTrocaData').value;
    const nome = document.getElementById('inputTrocaNome').value.trim();
    const motivo = document.getElementById('inputTrocaMotivo').value.trim();

    if (!data || !nome) {
        alert("Preencha a data e o seu nome.");
        return;
    }

    if (!supabaseClient) {
        alert("Configure o Supabase no Painel ADM para usar o mural em nuvem.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('mural_trocas')
            .insert([{ data, nome, motivo, status: 'Disponível' }]);

        if (error) throw error;

        alert("Anúncio publicado na nuvem com sucesso!");
        fecharModalTroca();
        carregarMuralTrocasNuvem();

        if (webhookUrlConfig) {
            fetch(webhookUrlConfig, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `🤝 **Nova Troca / Carona Anunciada!**\nColaborador: **${nome}**\nData: **${data}**\nMotivo: ${motivo || 'Não informado'}` })
            }).catch(err => console.log(err));
        }

    } catch (e) {
        console.error(e);
        alert("Erro ao publicar no Supabase. Verifique se a tabela 'mural_trocas' existe.");
    }
}

async function carregarMuralTrocasNuvem() {
    const container = document.getElementById('muralTrocasContainer');
    if (!container) return;

    if (!supabaseClient) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 10px;">Supabase não configurado. Mural offline.</p>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('mural_trocas')
            .select('*')
            .order('id', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 10px;">Nenhuma troca anunciada no momento.</p>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            html += `
                <div style="background: var(--bg-base); border: 1px solid var(--border); border-radius: 6px; padding: 8px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 12px; color: var(--accent);">${item.nome}</strong>
                        <span style="font-size: 11px; display: block; color: var(--text-muted);">Data: ${item.data} - ${item.motivo || 'Sem detalhes'}</span>
                    </div>
                    <button onclick="removerAnuncioTroca(${item.id})" style="background: rgba(5,150,105,0.2); color: #34d399; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">Assumir</button>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 10px;">Erro ao carregar dados do Supabase.</p>`;
    }
}

async function removerAnuncioTroca(id) {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('mural_trocas').delete().eq('id', id);
        alert("Plantão assumido com sucesso!");
        carregarMuralTrocasNuvem();
    } catch (e) {
        console.error(e);
    }
}

// --- UTILITÁRIOS, EXPORTAÇÃO CSV E FECHAMENTO DE FOLHA ---
function exportarParaCsvDiscriminado() {
    if (dbPlantoes.length === 0) {
        alert("Não há dados para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Data;Turno;Inicio;Fim;Sono;ValorBase;HorasExtras;AdicionalNoturno;ValorTotal;Tipo;Cobertura;Observacao\n";

    dbPlantoes.forEach(p => {
        const linha = [
            p.data,
            p.turno,
            p.inicio,
            p.fim,
            p.sono,
            p.valorBase,
            p.horasExtras,
            p.adicionalNoturno,
            p.valorTotal.toFixed(2),
            p.tipo,
            `"${p.cobertura || ''}"`,
            `"${p.obs || ''}"`
        ].join(";");
        csvContent += linha + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_plantoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function fecharFolhaAtual() {
    if (dbPlantoes.length === 0) {
        alert("Nenhum plantão na folha atual para arquivar.");
        return;
    }

    if (confirm("Deseja fechar a folha atual, arquivar os registros e zerar o painel para o novo ciclo?")) {
        const folhaArquivada = {
            id: Date.now(),
            dataFechamento: new Date().toLocaleDateString(),
            totalPlantoes: dbPlantoes.length,
            somaTotal: dbPlantoes.reduce((acc, p) => acc + p.valorTotal, 0),
            itens: [...dbPlantoes]
        };

        dbFolhasArquivadas.unshift(folhaArquivada);
        dbPlantoes = [];
        salvarDadosLocais();
        atualizarTabelaHistorico();
        atualizarMetricasGerais();
        renderizarFolhasArquivadas();
        alert("Folha fechada e arquivada com sucesso!");
    }
}

function renderizarFolhasArquivadas() {
    const container = document.getElementById('listaFolhasArquivadas');
    if (!container) return;

    if (dbFolhasArquivadas.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 10px;">Nenhuma folha arquivada ainda.</p>`;
        return;
    }

    let html = '';
    dbFolhasArquivadas.forEach(f => {
        html += `
            <div style="background: var(--bg-base); border: 1px solid var(--border); border-radius: 6px; padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 12px; color: var(--accent);">Fechamento: ${f.dataFechamento}</strong>
                    <span style="font-size: 11px; display: block; color: var(--text-muted);">${f.totalPlantoes} plantões • Total: R$ ${f.somaTotal.toFixed(2)}</span>
                </div>
                <button onclick="excluirFolhaArquivada(${f.id})" style="background: rgba(239,68,68,0.2); color: #ef4444; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">Excluir</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function excluirFolhaArquivada(id) {
    if (confirm("Deseja excluir este arquivo de folha?")) {
        dbFolhasArquivadas = dbFolhasArquivadas.filter(f => f.id !== id);
        salvarDadosLocais();
        renderizarFolhasArquivadas();
    }
}

function ajustarMetaMensalPrompt() {
    const nova = prompt("Digite o novo valor da meta mensal (R$):", metaMensal);
    if (nova !== null && !isNaN(nova)) {
        metaMensal = parseFloat(nova);
        salvarDadosLocais();
        atualizarMetricasGerais();
    }
}

function ajustarDataPrevisao() {
    const d = prompt("Digite a data prevista para o pagamento/cash (AAAA-MM-DD):", dataPrevisaoCash);
    if (d !== null) {
        dataPrevisaoCash = d;
        localStorage.setItem('valis_previsao_cash', dataPrevisaoCash);
        document.getElementById('txtPrevisaoCash').innerText = dataPrevisaoCash ? `Data: ${dataPrevisaoCash}` : 'Não definida';
    }
}

function ajustarDataFechamentoRh() {
    const d = prompt("Digite a data limite de fechamento do RH (AAAA-MM-DD):", dataFechamentoRh);
    if (d !== null) {
        dataFechamentoRh = d;
        localStorage.setItem('valis_fechamento_rh', dataFechamentoRh);
        document.getElementById('txtFechamentoRh').innerText = dataFechamentoRh ? `Limite: ${dataFechamentoRh}` : 'Não definida';
    }
}

// --- BACKUP JSON ---
function exportarBackupJSON() {
    const dadosGerais = {
        plantoes: dbPlantoes,
        logs: dbLogsPonto,
        folhas: dbFolhasArquivadas,
        meta: metaMensal,
        previsao: dataPrevisaoCash,
        rh: dataFechamentoRh
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosGerais, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_valis_plantoes_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importarBackupJSON() {
    document.getElementById('fileJsonInput').click();
}

function processarImportacaoJSON(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const conteudo = JSON.parse(e.target.result);
            if (conteudo.plantoes) dbPlantoes = conteudo.plantoes;
            if (conteudo.logs) dbLogsPonto = conteudo.logs;
            if (conteudo.folhas) dbFolhasArquivadas = conteudo.folhas;
            if (conteudo.meta) metaMensal = conteudo.meta;
            if (conteudo.previsao) dataPrevisaoCash = conteudo.previsao;
            if (conteudo.rh) dataFechamentoRh = conteudo.rh;

            salvarDadosLocais();
            atualizarTabelaHistorico();
            atualizarTabelaLogs();
            atualizarMetricasGerais();
            renderizarFolhasArquivadas();
            alert("Backup restaurado com sucesso!");
        } catch (err) {
            console.error(err);
            alert("Erro ao processar o arquivo JSON de backup.");
        }
    };
    reader.readAsText(arquivo);
}

function limparBancoDadosLocal() {
    if (confirm("⚠️ ATENÇÃO: Isso apagará todos os dados locais salvos neste dispositivo. Deseja continuar?")) {
        localStorage.clear();
        dbPlantoes = [];
        dbLogsPonto = [];
        dbFolhasArquivadas = [];
        metaMensal = 1000.00;
        location.reload();
    }
}
function abrirModalTermos() {
    const modal = document.getElementById('modalTermosUso');
    if (modal) modal.style.display = 'flex';
}

function fecharModalTermos() {
    const modal = document.getElementById('modalTermosUso');
    if (modal) modal.style.display = 'none';
}
// --- CENTRAL DE NOTIFICAÇÕES E ATUALIZAÇÕES AUTOMÁTICAS ---

let versaoAtualSistema = "v3.2 Cloud"; // Versão atual rodando no app
let intervaloLembreteAtualizacao = null;

// Função para abrir e fechar o modal da Central
function abrirModalCentralNotificacoes() {
    const modal = document.getElementById('modalCentralNotificacoes');
    if (modal) modal.style.display = 'flex';
    verificarAtualizacaoDisponivelNuvem(); // Checa ao abrir
}

function fecharModalCentralNotificacoes() {
    const modal = document.getElementById('modalCentralNotificacoes');
    if (modal) modal.style.display = 'none';
}

// Simulação / Consulta estruturada ao Supabase (próxima etapa conectaremos real)
function verificarAtualizacaoDisponivelNuvem() {
    // Exemplo de dados que virão da tabela do Supabase
    // Na próxima etapa, faremos o SELECT na tabela de updates do Supabase
    const dadosNuvemMock = {
        versao: "v3.3 Cloud",
        changelog: "• Correção de bugs no layout\n• Otimização do banco de dados\n• Novos recursos de ponto",
        linkDownload: "#" // Aqui entrará o link do arquivo hospedado no Storage do Supabase
    };

    const txtDetalhes = document.getElementById('txtVersaoDetalhesNuvem');
    const txtChangelog = document.getElementById('txtChangelogNuvem');
    const btnBaixar = document.getElementById('btnBaixarInstalador');
    const badge = document.getElementById('badgeNotificacao');

    // Compara versões (se houver nova versão)
    if (dadosNuvemMock.versao !== versaoAtualSistema) {
        if (txtDetalhes) txtDetalhes.innerHTML = `Nova versão <strong>${dadosNuvemMock.versao}</strong> encontrada. Sua versão atual é ${versaoAtualSistema}.`;
        if (txtChangelog) txtChangelog.innerText = dadosNuvemMock.changelog;
        
        if (btnBaixar) {
            btnBaixar.href = dadosNuvemMock.linkDownload;
            btnBaixar.style.display = 'block';
            // Quando o usuário clicar em baixar, marcamos que ele atualizou
            btnBaixar.onclick = function() {
                registrarUsuarioAtualizou(dadosNuvemMock.versao);
            };
        }

        // Acende a bolinha vermelha no sino
        if (badge) badge.style.display = 'block';

        // Ativa o lembrete de 1 em 1 hora caso ainda não esteja rodando
        iniciarLembreteHorario();
    } else {
        if (txtDetalhes) txtDetalhes.innerText = "Seu aplicativo já está na versão mais recente!";
        if (badge) badge.style.display = 'none';
    }
}

// Lembrete periódico de 1 em 1 hora
function iniciarLembreteHorario() {
    if (intervaloLembreteAtualizacao) return; // Evita duplicar o timer

    // 1 hora em milissegundos = 3600000 ms
    intervaloLembreteHorario = setInterval(() => {
        const ultimaVersaoBaixada = localStorage.getItem('valis_ultima_versao_atualizada');
        const versaoPendente = "v3.3 Cloud"; // Versão alvo da nuvem

        if (ultimaVersaoBaixada !== versaoPendente) {
            // Dispara notificação no navegador / tela
            alert("⏰ Lembrete: Há uma nova atualização pendente para o seu aplicativo Ponto Plantões. Toque no ícone de sino para baixar!");
            const badge = document.getElementById('badgeNotificacao');
            if (badge) badge.style.display = 'block';
        }
    }, 3600000); 
}

// Reconhece que o usuário clicou e baixou a atualização
function registrarUsuarioAtualizou(novaVersao) {
    localStorage.setItem('valis_ultima_versao_atualizada', novaVersao);
    const badge = document.getElementById('badgeNotificacao');
    if (badge) badge.style.display = 'none';
    if (intervaloLembreteHorario) clearInterval(intervaloLembreteHorario);
    alert("Download iniciado! Após instalar o novo APK/PWA, o sistema reconhecerá a nova versão.");
}

// Executa a verificação inicial ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(verificarAtualizacaoDisponivelNuvem, 2000);
});

// --- CONSULTA REAL NO SUPABASE PARA ATUALIZAÇÕES ---
async function verificarAtualizacaoDisponivelNuvem() {
    const txtDetalhes = document.getElementById('txtVersaoDetalhesNuvem');
    const txtChangelog = document.getElementById('txtChangelogNuvem');
    const btnBaixar = document.getElementById('btnBaixarInstalador');
    const badge = document.getElementById('badgeNotificacao');

    try {
        // Faz a consulta na tabela 'atualizacoes_app' ordenando pela mais recente
        const { data, error } = await supabaseClient
            .from('atualizacoes_app')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            console.log("Nenhuma atualização encontrada na nuvem.");
            return;
        }

        const versaoNuvem = data.versao;
        const changelogNuvem = data.changelog;
        const linkDownloadNuvem = data.link_download;

        // Compara com a versão atual do app
        if (versaoNuvem !== versaoAtualSistema) {
            if (txtDetalhes) txtDetalhes.innerHTML = `Nova versão <strong>${versaoNuvem}</strong> disponível. Sua versão atual é ${versaoAtualSistema}.`;
            if (txtChangelog) txtChangelog.innerText = changelogNuvem;
            
            if (btnBaixar) {
                btnBaixar.href = linkDownloadNuvem;
                btnBaixar.style.display = 'block';
                btnBaixar.onclick = function() {
                    registrarUsuarioAtualizou(versaoNuvem);
                };
            }

            // Acende a bolinha vermelha no sino
            if (badge) badge.style.display = 'block';

            // Garante o alerta periódico de 1 em 1 hora
            iniciarLembreteHorario(versaoNuvem);
        } else {
            if (txtDetalhes) txtDetalhes.innerText = "Seu aplicativo já está na versão mais recente!";
            if (badge) badge.style.display = 'none';
        }

    } catch (err) {
        console.error("Erro ao verificar atualizações:", err);
    }
}

function iniciarLembreteHorario(versaoPendente) {
    if (intervaloLembreteAtualizacao) return;

    intervaloLembreteAtualizacao = setInterval(() => {
        const ultimaVersaoBaixada = localStorage.getItem('valis_ultima_versao_atualizada');

        if (ultimaVersaoBaixada !== versaoPendente) {
            alert("⏰ Lembrete: Há uma nova atualização pendente no sistema. Toque no ícone de sino (🔔) para baixar a nova versão!");
            const badge = document.getElementById('badgeNotificacao');
            if (badge) badge.style.display = 'block';
        }
    }, 3600000); // 1 hora
}
