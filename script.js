// ==========================================
// PONTOVIGIA • SCRIPT PRINCIPAL (v2.9 / v6)
// ==========================================

let plantoes = JSON.parse(localStorage.getItem('pontovigia_plantoes')) || [];
let folhasArquivadas = JSON.parse(localStorage.getItem('pontovigia_folhas')) || [];
let metaMensal = parseFloat(localStorage.getItem('pontovigia_meta')) || 1000.00;
let diaPrevisaoCash = parseInt(localStorage.getItem('pontovigia_previsao')) || 5;
let limiteFechamentoRh = parseInt(localStorage.getItem('pontovigia_limite_rh')) || 25;

document.addEventListener('DOMContentLoaded', () => {
    inicializarDataAtual();
    carregarDadosInterface();
    configurarOuvintesEventos();
});

function inicializarDataAtual() {
    const hoje = new Date().toISOString().split('T')[0];
    const inputData = document.getElementById('inputData');
    if (inputData && !inputData.value) {
        inputData.value = hoje;
    }
}

function configurarOuvintesEventos() {
    const btnSalvar = document.getElementById('btnSalvarPlantao');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarPlantao);
    }

    const btnAjustarMeta = document.getElementById('btnAjustarMeta');
    if (btnAjustarMeta) {
        btnAjustarMeta.addEventListener('click', ajustarMetaMensal);
    }

    const btnFecharFolha = document.getElementById('btnFecharFolha');
    if (btnFecharFolha) {
        btnFecharFolha.addEventListener('click', fecharFolhaAtual);
    }

    const btnExportarCsv = document.getElementById('btnExportarCsv');
    if (btnExportarCsv) {
        btnExportarCsv.addEventListener('click', exportarParaCsv);
    }

    const selectTurno = document.getElementById('inputTurno');
    if (selectTurno) {
        selectTurno.addEventListener('change', (e) => {
            const inicio = document.getElementById('inputInicio');
            const fim = document.getElementById('inputFim');
            if (e.target.value === 'Manhã') {
                inicio.value = '06:00';
                fim.value = '18:00';
            } else if (e.target.value === 'Noturno') {
                inicio.value = '18:00';
                fim.value = '06:00';
            }
        });
    }
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

    const novoPlantao = {
        id: Date.now(),
        data,
        turno,
        inicio,
        fim,
        sono,
        valor,
        cobertura,
        obs
    };

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
    localStorage.setItem('pontovigia_previsao', diaPrevisaoCash);
    localStorage.setItem('pontovigia_limite_rh', limiteFechamentoRh);
}

function carregarDadosInterface() {
    atualizarTabelaHistorico();
    atualizarMetricasResumo();
    atualizarBarraMeta();
    atualizarFolhasArquivadas();
    atualizarPrevisoesPaineis();
}

function atualizarTabelaHistorico() {
    const tbody = document.getElementById('tabelaHistoricoBody');
    const txtTotalFiltrado = document.getElementById('totalFiltradoValor');
    if (!tbody) return;

    tbody.innerHTML = '';
    let totalGeral = 0;

    if (plantoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 15px;">Nenhum plantão registrado no período atual.</td></tr>`;
        if (txtTotalFiltrado) txtTotalFiltrado.textContent = 'R$ 0.00';
        return;
    }

    // Ordenar do mais recente para o mais antigo
    const plantoesOrdenados = [...plantoes].sort((a, b) => new Date(b.data) - new Date(a.data));

    plantoesOrdenados.forEach(p => {
        totalGeral += p.valor;
        const tr = document.createElement('tr');
        
        const dataFormatada = p.data.split('-').reverse().join('/');
        const infoExtra = p.cobertura ? `<br><small style="color: #f59e0b;">Cobriu: ${p.cobertura}</small>` : '';
        const obsExtra = p.obs ? `<br><small style="color: var(--text-muted);">${p.obs}</small>` : '';

        tr.innerHTML = `
            <td>
                <strong>${dataFormatada}</strong>
                ${infoExtra}
                ${obsExtra}
            </td>
            <td>
                <span style="font-size: 11px; background: var(--bg-base); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">${p.turno}</span>
                <br><small style="color: var(--text-muted);">${p.inicio} às ${p.fim}</small>
            </td>
            <td><strong>R$ ${p.valor.toFixed(2)}</strong></td>
            <td>
                <button onclick="excluirPlantao(${p.id})" style="background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 14px;" title="Excluir">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (txtTotalFiltrado) {
        txtTotalFiltrado.textContent = `R$ ${totalGeral.toFixed(2)}`;
    }
}

function atualizarMetricasResumo() {
    const totalQtd = plantoes.length;
    let proprios = 0;
    let coberturas = 0;
    let somaValores = 0;
    let somaSono = 0;

    plantoes.forEach(p => {
        somaValores += p.valor;
        somaSono += p.sono;
        if (p.cobertura && p.cobertura.trim() !== '') {
            coberturas++;
        } else {
            proprios++;
        }
    });

    const mediaValor = totalQtd > 0 ? somaValores / totalQtd : 0;
    const mediaSono = totalQtd > 0 ? somaSono / totalQtd : 0;

    document.getElementById('totalPlantoesQtd').textContent = totalQtd;
    document.getElementById('propriosCoberturasQtd').textContent = `${proprios} / ${coberturas}`;
    document.getElementById('mediaPorPlantao').textContent = `R$ ${mediaValor.toFixed(2)}`;
    document.getElementById('mediaSonoVal').textContent = `${mediaSono.toFixed(1)}h`;
}

function atualizarBarraMeta() {
    let somaValores = plantoes.reduce((acc, p) => acc + p.valor, 0);
    const porcentagem = metaMensal > 0 ? Math.min((somaValores / metaMensal) * 100, 100) : 0;

    document.getElementById('metaValorTexto').textContent = `R$ ${metaMensal.toFixed(2)}`;
    document.getElementById('metaPorcentagem').textContent = `${porcentagem.toFixed(0)}%`;
    document.getElementById('progressBarFill').style.width = `${porcentagem}%`;
}

function atualizarPrevisoesPaineis() {
    const txtPrevisao = document.getElementById('txtPrevisaoCash');
    const txtRh = document.getElementById('txtFechamentoRh');

    const hoje = new Date();
    // Zerar horas para comparar apenas os dias perfeitamente
    hoje.setHours(0, 0, 0, 0);

    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    const diaAtual = hoje.getDate();

    // 1. Cálculo para o Cash (Previsão de Pagamento)
    let dataCash = new Date(anoAtual, mesAtual, diaPrevisaoCash);
    if (diaAtual > diaPrevisaoCash) {
        dataCash = new Date(anoAtual, mesAtual + 1, diaPrevisaoCash);
    }
    const diffTimeCash = dataCash - hoje;
    const diffDiasCash = Math.round(diffTimeCash / (1000 * 60 * 60 * 24));

    if (txtPrevisao) {
        if (diffDiasCash === 0) {
            txtPrevisao.textContent = "É hoje!";
        } else if (diffDiasCash === 1) {
            txtPrevisao.textContent = "Falta 1 dia";
        } else if (diffDiasCash > 1) {
            txtPrevisao.textContent = `Faltam ${diffDiasCash} dias`;
        } else {
            txtPrevisao.textContent = `Dia ${diaPrevisaoCash} do mês`;
        }
    }

    // 2. Cálculo para o Fechamento RH
    let dataRh = new Date(anoAtual, mesAtual, limiteFechamentoRh);
    if (diaAtual > limiteFechamentoRh) {
        dataRh = new Date(anoAtual, mesAtual + 1, limiteFechamentoRh);
    }
    const diffTimeRh = dataRh - hoje;
    const diffDiasRh = Math.round(diffTimeRh / (1000 * 60 * 60 * 24));

    if (txtRh) {
        if (diffDiasRh === 0) {
            txtRh.textContent = "Fecha hoje!";
        } else if (diffDiasRh === 1) {
            txtRh.textContent = "Falta 1 dia";
        } else if (diffDiasRh > 1) {
            txtRh.textContent = `Faltam ${diffDiasRh} dias`;
        } else {
            txtRh.textContent = `Até dia ${limiteFechamentoRh}`;
        }
    }
}

function ajustarMetaMensal() {
    const novaMeta = prompt('Informe o valor da nova meta mensal (R$):', metaMensal);
    if (novaMeta !== null && !isNaN(novaMeta) && parseFloat(novaMeta) > 0) {
        metaMensal = parseFloat(novaMeta);
        sincronizarBanco();
        atualizarBarraMeta();
    }
}

function configurarPrevisaoCash() {
    const dia = prompt('Informe o dia padrão para Previsão de Pagamento/Cash:', diaPrevisaoCash);
    if (dia !== null && !isNaN(dia) && parseInt(dia) >= 1 && parseInt(dia) <= 31) {
        diaPrevisaoCash = parseInt(dia);
        sincronizarBanco();
        atualizarPrevisoesPaineis();
    }
}

function configurarLimiteRh() {
    const dia = prompt('Informe o dia limite para fechamento da folha no RH:', limiteFechamentoRh);
    if (dia !== null && !isNaN(dia) && parseInt(dia) >= 1 && parseInt(dia) <= 31) {
        limiteFechamentoRh = parseInt(dia);
        sincronizarBanco();
        atualizarPrevisoesPaineis();
    }
}

function fecharFolhaAtual() {
    if (plantoes.length === 0) {
        alert('Não há plantões na folha atual para fechar.');
        return;
    }

    if (confirm('Deseja arquivar a folha atual e zerar os registros para o próximo ciclo?')) {
        const novaFolhaArquivada = {
            id: Date.now(),
            dataFechamento: new Date().toLocaleDateString('pt-BR'),
            quantidade: plantoes.length,
            total: plantoes.reduce((acc, p) => acc + p.valor, 0),
            itens: [...plantoes]
        };

        folhasArquivadas.push(novaFolhaArquivada);
        plantoes = [];
        sincronizarBanco();
        carregarDadosInterface();
        alert('Folha fechada e arquivada com sucesso!');
    }
}

function atualizarFolhasArquivadas() {
    const container = document.getElementById('listaFolhasArquivadas');
    if (!container) return;

    if (folhasArquivadas.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 10px;">Nenhuma folha arquivada ainda.</p>`;
        return;
    }

    container.innerHTML = '';
    folhasArquivadas.forEach(f => {
        const div = document.createElement('div');
        div.style.cssText = "background: var(--bg-base); border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;";
        div.innerHTML = `
            <div>
                <strong style="font-size: 13px; color: var(--text-main);">Fechamento em ${f.dataFechamento}</strong>
                <br><small style="color: var(--text-muted);">${f.quantidade} plantões • Total: R$ ${f.total.toFixed(2)}</small>
            </div>
            <button onclick="rerevisarFolhaArquivada(${f.id})" style="background: var(--bg-card); border: 1px solid var(--border); color: var(--accent); padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 11px;">Ver</button>
        `;
        container.appendChild(div);
    });
}

function rerevisarFolhaArquivada(id) {
    const folha = folhasArquivadas.find(f => f.id === id);
    if (folha) {
        alert(`Detalhes da Folha (${folha.dataFechamento}):\nTotal de Plantões: ${folha.quantidade}\nValor Total: R$ ${folha.total.toFixed(2)}`);
    }
}

function exportarParaCsv() {
    if (plantoes.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Data;Turno;Inicio;Fim;Sono;Valor;Cobertura;Observacao\r\n";
    plantoes.forEach(p => {
        csvContent += `${p.data};${p.turno};${p.inicio};${p.fim};${p.sono};${p.valor};${p.cobertura};${p.obs}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_plantoes_pontovigia.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
