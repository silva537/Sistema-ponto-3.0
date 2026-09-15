// ==========================================
// PONTOVIGIA • MÓDULO DE EXPANSÃO INTERNA DO ADM (v3.0)
// Injeta as ferramentas apenas após o login com senha
// ==========================================

setInterval(() => {
    const conteudoProtegido = document.getElementById('conteudoProtegidoAdm');
    
    // Verifica se o painel protegido está visível na tela e se o bloco ainda não foi inserido
    if (conteudoProtegido && conteudoProtegido.style.display !== 'none' && !document.getElementById('extrasAdmProtegidos')) {
        
        const blocoExtras = document.createElement('div');
        blocoExtras.id = 'extrasAdmProtegidos';
        blocoExtras.innerHTML = `
            <hr class="dev-divider" style="margin: 12px 0; border-color: var(--border);">
            <span class="dev-label" style="margin-bottom: 4px; display:block; color: var(--accent); font-weight: bold;">🚀 Ferramentas Avançadas</span>
            <button class="btn-dev-action" onclick="executarSimulacaoAnual()" style="margin-top: 4px;">📊 Simular Projeção Anual</button>
            <button class="btn-dev-action" onclick="executarAuditoriaSistema()" style="margin-top: 4px;">🔍 Auditoria de Dados Locais</button>
        `;

        // Insere as ferramentas antes dos botões de logout/resetar do final
        conteudoProtegido.insertBefore(blocoExtras, conteudoProtegido.lastElementChild.previousElementSibling);
    }
}, 1000);

// Funções dos novos botões do ADM
function executarSimulacaoAnual() {
    const dados = JSON.parse(localStorage.getItem('pontovigia_plantoes')) || [];
    let totalAtual = 0;
    dados.forEach(p => totalAtual += (p.valor || 0));
    const projecao = totalAtual * 12;
    alert(`📊 PROJEÇÃO ANUAL:\n\nCom base nos registros atuais, a estimativa anual é de R$ ${projecao.toFixed(2)}.`);
}

function executarAuditoriaSistema() {
    const totalPlantoes = (JSON.parse(localStorage.getItem('pontovigia_plantoes')) || []).length;
    const tamanhoStorage = (JSON.stringify(localStorage).length / 1024).toFixed(2);
    alert(`🔍 AUDITORIA DO SISTEMA:\n\n• Plantões salvos: ${totalPlantoes}\n• Uso de memória local: ${tamanhoStorage} KB\n• Status: Operando normalmente.`);
}
