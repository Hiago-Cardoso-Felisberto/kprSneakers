// Integração de autenticação com o sistema de produtos
// Este arquivo deve ser carregado ANTES de main.js

import { 
  getToken, 
  getUsuario, 
  logout, 
  carregarProdutosAPI,
  criarProdutoAPI,
  atualizarProdutoAPI,
  deletarProdutoAPI
} from './auth-api.js';

// Verificar autenticação ao carregar a página
function verificarAutenticacaoIndex() {
  const token = getToken();
  const usuario = getUsuario();

  const adminPanel = document.getElementById('admin-panel');
  const adminLink = document.getElementById('admin-link');
  const headerUser = document.getElementById('header-user');
  const headerUsuarioNome = document.getElementById('header-usuario-nome');

  if (token && usuario) {
    // mostrar painel admin e ocultar link de login discreto
    if (adminPanel) adminPanel.style.display = 'block';
    if (adminLink) adminLink.style.display = 'none';

    if (headerUser && headerUsuarioNome) {
      headerUser.style.display = 'flex';
      headerUsuarioNome.textContent = `Bem-vindo, ${usuario.nome}!`;
    }

    // Adicionar evento ao botão de logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', logout);

    // Inicializar formulários / lista de produtos (se exportados pelo main)
    if (typeof window.initAdmin === 'function') window.initAdmin();
    if (typeof window.atualizarListaProdutos === 'function') window.atualizarListaProdutos();
    if (typeof window.initChangePasswordForm === 'function') window.initChangePasswordForm();

    return true;
  } else {
    // usuário não autenticado: ocultar painel admin e mostrar link discreto
    if (adminPanel) adminPanel.style.display = 'none';
    if (adminLink) adminLink.style.display = 'inline';
    if (headerUser) headerUser.style.display = 'none';
    return false;
  }
}

// Sobrescrever as funções globais para usar a API
window.criarProdutoSeguro = async function(produto) {
  try {
    const result = await criarProdutoAPI(produto);
    console.log('Produto criado na API:', result);
    return result;
  } catch (err) {
    alert('Erro ao salvar produto na API: ' + err.message);
    throw err;
  }
};

window.atualizarProdutoSeguro = async function(id, produto) {
  try {
    const result = await atualizarProdutoAPI(id, produto);
    console.log('Produto atualizado na API:', result);
    return result;
  } catch (err) {
    alert('Erro ao atualizar produto na API: ' + err.message);
    throw err;
  }
};

window.deletarProdutoSeguro = async function(id) {
  try {
    const result = await deletarProdutoAPI(id);
    console.log('Produto deletado da API:', result);
    return result;
  } catch (err) {
    alert('Erro ao deletar produto da API: ' + err.message);
    throw err;
  }
};

// Chamar ao carregar
document.addEventListener('DOMContentLoaded', () => {
  verificarAutenticacaoIndex();
});

// Também verificar imediatamente se o DOM já carregou
if (document.readyState !== 'loading') {
  verificarAutenticacaoIndex();
}
