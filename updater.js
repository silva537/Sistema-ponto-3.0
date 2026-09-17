// ==========================================
// PONTOVIGIA • ATUALIZADOR AUTOMÁTICO (v3.0)
// ==========================================

const VERSAO_ATUAL = "3.0"; 
const URL_VERIFICACAO_VERSAO = "https://raw.githubusercontent.com/silva537/Sistema-ponto-3.0/main/versao.json";

async function verificarAtualizacoesDisponiveis() {
    try {
        const resposta = await fetch(`${URL_VERIFICACAO_VERSAO}?t=${new Date().getTime()}`);
        if (!resposta.ok) return;

        const dados = await resposta.json();
        if (dados.versao && dados.versao !== VERSAO_ATUAL) {
            exibirModalAtualizacao(dados.versao, dados.mensagem);
        } else {
            alert(`O sistema já está na versão mais recente (${VERSAO_ATUAL}).`);
        }
    } catch (error) {
        console.log("Modo offline ou falha ao checar atualizações:", error);
        alert('Não foi possível conectar ao servidor para verificar atualizações.');
    }
}

function forcarChecagemAtualizacao() {
    alert('Verificando atualizações no servidor...');
    verificarAtualizacoesDisponiveis();
}

function exibirModalAtualizacao(novaVersao, mensagem) {
    const txtVersaoAtual = document.getElementById('txtVersaoAtual');
    const txtVersaoNova = document.getElementById('txtVersaoNova');
    const listaNovidades = document.getElementById('listaNovidades');
    const updateModal = document.getElementById('updateModal');

    if (txtVersaoAtual) txtVersaoAtual.textContent = VERSAO_ATUAL;
    if (txtVersaoNova) txtVersaoNova.textContent = novaVersao;
    if (listaNovidades) listaNovidades.innerHTML = `<li>${mensagem || 'Correções de bugs e otimizações gerais.'}</li>`;
    if (updateModal) updateModal.style.display = 'flex';
}

function fecharModalAtualizacao() {
    const updateModal = document.getElementById('updateModal');
    if (updateModal) updateModal.style.display = 'none';
}

function executarAtualizacao() {
    if ('caches' in window) {
        caches.keys().then((names) => {
            names.forEach((name) => { caches.delete(name); });
        });
    }
    alert('Baixando nova versão...');
    window.location.reload(true);
}
