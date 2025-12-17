// API e autenticação
// Detecta automaticamente: localhost (ou file://) = dev, outro = produção
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const API_URL = isLocalhost
  ? 'http://localhost:3001/api'
  : `${window.location.protocol}//${window.location.hostname.replace('kprsneakers.vercel.app', 'kprsneakers-api.onrender.com')}/api`;

// Função para obter token do localStorage
function getToken() {
  return localStorage.getItem('authToken');
}

// Função para obter usuário logado
function getUsuario() {
  const usuario = localStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
}

// Fazer logout
function logout() {
  if (confirm('Tem certeza que deseja sair?')) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
  }
}

// Verificar autenticação - redirecionar para login se não autenticado
function verificarAutenticacao() {
  const token = getToken();
  if (!token) {
    // Se estamos em index.html (painel admin), redirecionar para login
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
      window.location.href = 'login.html';
    }
  }
  return !!token;
}

// Fetch com autenticação
async function fetchAPI(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Token expirado ou inválido
    localStorage.removeItem('authToken');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
    return;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.erro || 'Erro na requisição');
  }
  return data;
}

// Carregar produtos da API
async function carregarProdutosAPI() {
  try {
    const produtos = await fetchAPI('/produtos');
    return produtos;
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    return [];
  }
}

// Criar produto via API
async function criarProdutoAPI(produto) {
  try {
    const result = await fetchAPI('/produtos', {
      method: 'POST',
      body: JSON.stringify(produto)
    });
    return result;
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    throw err;
  }
}

// Atualizar produto via API
async function atualizarProdutoAPI(id, produto) {
  try {
    const result = await fetchAPI(`/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(produto)
    });
    return result;
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    throw err;
  }
}

// Deletar produto via API
async function deletarProdutoAPI(id) {
  try {
    const result = await fetchAPI(`/produtos/${id}`, {
      method: 'DELETE'
    });
    return result;
  } catch (err) {
    console.error('Erro ao deletar produto:', err);
    throw err;
  }
}

// Alterar senha
async function alterarSenhaAPI(senhaAtual, senhaNova) {
  try {
    const result = await fetchAPI('/auth/alterar-senha', {
      method: 'POST',
      body: JSON.stringify({ senhaAtual, senhaNova })
    });
    return result;
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    throw err;
  }
}

export {
  getToken,
  getUsuario,
  logout,
  verificarAutenticacao,
  fetchAPI,
  carregarProdutosAPI,
  criarProdutoAPI,
  atualizarProdutoAPI,
  deletarProdutoAPI,
  alterarSenhaAPI
};
