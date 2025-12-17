// Importar funções da API
import { carregarProdutosAPI, criarProdutoAPI, atualizarProdutoAPI, deletarProdutoAPI, alterarSenhaAPI } from './auth-api.js';

// ==================== VITRINE ====================
let produtos = []; // Será preenchido via API (fetchProdutos)
const container = document.getElementById('produtos');
// Formata preço para exibição (BRL). Aceita número ou string numérica.
function formatPreco(valor){
  if(valor===undefined || valor===null || valor==='') return '';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',','.'));
  if(Number.isNaN(num)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}
function gerarVitrine(filtro='all', search=''){
  const container = document.getElementById('produtos');
  container.innerHTML='';

  // Detectar se é pesquisa (search diferente de vazio)
  if(search){
    container.classList.add('search-active');
  } else {
    container.classList.remove('search-active');
  }

  produtos.forEach((produto,pIndex)=>{
    if(filtro!=='all' && produto.tipo!==filtro) return;
    if(search && !produto.nome.toLowerCase().includes(search.toLowerCase())) return;

    // Cria um único cartão por produto. A imagem mostrada depende da cor selecionada (dataset.cor)
    const a = document.createElement('a');
    a.href = "#galeria";
    a.className = "i";
    a.dataset.prod = pIndex;
    a.dataset.cor = 0; // cor padrão

    const firstImg = (produto.cores && produto.cores[0] && produto.cores[0].gallery && produto.cores[0].gallery[0]) ? produto.cores[0].gallery[0] : 'Imagens/Logo.jpg';
    const precoText = formatPreco(produto.preco);

    // Conteúdo básico do cartão
    a.innerHTML = `<img src="${firstImg}" alt="${produto.nome}" loading="lazy">
                   <div class="t">${produto.nome}</div>${precoText?`<div class="preco">${precoText}</div>`:''}`;

    // Criar swatches de cor dentro do cartão
    if(Array.isArray(produto.cores) && produto.cores.length){
      const swatches = document.createElement('div');
      swatches.className = 'card-colors';
      produto.cores.forEach((cor, cIndex)=>{
        const btn = document.createElement('button');
        btn.className = 'color-swatch';
        btn.title = cor.nome || '';
        btn.style.background = cor.hex || '#ccc';
        btn.addEventListener('click', (ev)=>{
          ev.preventDefault();
          ev.stopPropagation();
          // trocar imagem mostrada no cartão e marcar cor selecionada
          const img = a.querySelector('img');
          const src = (cor.gallery && cor.gallery[0]) ? cor.gallery[0] : 'Imagens/Logo.jpg';
          img.src = src;
          a.dataset.cor = cIndex;
          // atualizar estilo visual dos swatches
          swatches.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));
          btn.classList.add('selected');
        });
        swatches.appendChild(btn);
      });
      a.appendChild(swatches);
    }

    container.appendChild(a);
  });

  adicionarEventosCards();
}

// Carregar produtos da API e gerar vitrine
async function inicializarVitrine(){
  try {
    console.log('Carregando produtos da API...');
    const data = await carregarProdutosAPI();
    console.log('Produtos carregados:', data);
    if(Array.isArray(data) && data.length){
      produtos = data;
    } else if(data && Array.isArray(data.produtos)){
      produtos = data.produtos;
    }
    console.log('Array de produtos:', produtos);
  } catch(err){
    console.error('Erro ao carregar produtos:', err);
    // NÃO limpar os produtos se houver erro - manter os já carregados
    if(!produtos || produtos.length === 0){
      console.warn('Nenhum produto em cache, vitrine vazia');
    }
  }
  // Sempre gerar vitrine, carrosel e lista de produtos (com produtos carregados ou vazios)
  gerarVitrine();
  gerarCarousel();
  atualizarListaProdutos();
}

// Inicializar quando a página carrega (apenas uma vez)
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', inicializarVitrine, { once: true });
} else {
  inicializarVitrine();
}

// Editar produto pelo índice
window.editarProduto = function(index){
  if(!produtos[index]){ alert('Produto não encontrado'); return; }
  const prod = produtos[index];
  document.getElementById('admin-nome').value = prod.nome;
  document.getElementById('admin-tipo').value = prod.tipo || 'masculino';
  document.getElementById('admin-preco').value = prod.preco || '';
  const coresContainer = document.getElementById('admin-cores');
  coresContainer.innerHTML='';
  (prod.cores || []).forEach(cor=> coresContainer.appendChild(createColorBlock(Date.now(), cor)));
  if(!prod.cores || !prod.cores.length) coresContainer.appendChild(createColorBlock(0));
  
  document.getElementById('admin-form').dataset.editIndex = index;
  document.getElementById('cancel-edit-btn').style.display = 'block';
  document.querySelector('details').open = true;
  window.scrollTo({top: 0, behavior:'smooth'});
};

// Cancelar edição
document.addEventListener('DOMContentLoaded', ()=>{
  const cancelBtn = document.getElementById('cancel-edit-btn');
  if(cancelBtn){
    cancelBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      document.getElementById('admin-form').removeAttribute('data-editIndex');
      document.getElementById('admin-form').reset();
      const coresContainer = document.getElementById('admin-cores');
      coresContainer.innerHTML='';
      coresContainer.appendChild(createColorBlock(0));
      document.getElementById('cancel-edit-btn').style.display = 'none';
    });
  }
});

// Excluir produto pelo índice
window.excluirProduto = function(index){
  if(!produtos[index]){ alert('Produto não encontrado'); return; }
  if(!confirm(`Tem certeza que deseja excluir "${produtos[index].nome}"?`)) return;
  
  const produtoId = produtos[index].id;
  if(!produtoId){
    alert('Produto sem ID, não pode ser excluído.');
    return;
  }
  
  deletarProdutoAPI(produtoId).then(async ()=>{
    try{
      const data = await carregarProdutosAPI();
      if(Array.isArray(data)) produtos = data;
    }catch(e){ console.error('Erro ao recarregar produtos após exclusão', e); }

    const filtro = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const pesquisa = document.getElementById('search')?.value || '';
    gerarVitrine(filtro, pesquisa);
    gerarCarousel();
    atualizarListaProdutos();
    alert('Produto excluído com sucesso.');
  }).catch(err=>{
    alert('Erro ao excluir produto: ' + err.message);
  });
};

// --- Formulário admin: adicionar cores dinamicamente e submeter ---
function createColorBlock(index, data){
  const wrapper = document.createElement('div');
  wrapper.className = 'admin-color-block';
  wrapper.style = 'display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;margin-bottom:8px;';
  wrapper.innerHTML = `
    <input class="adm-color-name" placeholder="Nome da cor (ex: Branco)" required style="flex:1;min-width:150px;">
    <input class="adm-color-hex" placeholder="Hex (ex: #ffffff)" style="width:110px;">
    <textarea class="adm-color-gallery" placeholder="URLs da galeria (uma por linha)" rows="3" style="flex:2;min-width:220px;"></textarea>
    <button type="button" class="adm-remove-color b" style="height:38px;">Remover</button>
  `;
  if(data){
    wrapper.querySelector('.adm-color-name').value = data.nome || '';
    wrapper.querySelector('.adm-color-hex').value = data.hex || '';
    wrapper.querySelector('.adm-color-gallery').value = (data.gallery||[]).join('\n');
  }
  wrapper.querySelector('.adm-remove-color').addEventListener('click', ()=> wrapper.remove());
  return wrapper;
} 

function initAdminForm(){
  const coresContainer = document.getElementById('admin-cores');
  const addColorBtn = document.getElementById('add-color-btn');
  const form = document.getElementById('admin-form');
  // adicionar um bloco de cor inicial
  coresContainer.appendChild(createColorBlock(0));
  addColorBtn.addEventListener('click', ()=> coresContainer.appendChild(createColorBlock(Date.now())));

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const nome = document.getElementById('admin-nome').value.trim();
    const tipo = document.getElementById('admin-tipo').value;
    const precoVal = document.getElementById('admin-preco').value;
    const preco = precoVal? Number(precoVal) : undefined;
    const cores = Array.from(coresContainer.querySelectorAll('.admin-color-block')).map(block=>{
      const nomeC = block.querySelector('.adm-color-name').value.trim();
      const hex = block.querySelector('.adm-color-hex').value.trim() || '#ccc';
      const galleryRaw = block.querySelector('.adm-color-gallery').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      return { nome: nomeC || 'Cor', hex, gallery: galleryRaw.length? galleryRaw : ['Imagens/Logo.jpg'] };
    }).filter(c=>c.gallery && c.gallery.length);

    if(!nome || !cores.length){
      alert('Preencha ao menos nome do produto e uma cor com pelo menos uma imagem.');
      return;
    }

    const editIndex = form.dataset.editIndex;
    const novo = { nome, tipo, cores };
    if(preco !== undefined) novo.preco = preco;
    
    if(editIndex !== undefined){
      // modo edição
      const produtoId = produtos[editIndex].id;
      atualizarProdutoAPI(produtoId, novo).then(async ()=>{
        try{
          const data = await carregarProdutosAPI();
          if(Array.isArray(data)) produtos = data;
        }catch(e){ console.error('Erro ao recarregar produtos após edição', e); }

        const filtro = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        const pesquisa = document.getElementById('search')?.value || '';
        gerarVitrine(filtro, pesquisa);
        gerarCarousel();
        atualizarListaProdutos();
        alert('Produto atualizado com sucesso.');
        form.removeAttribute('data-editIndex');
        form.reset(); 
        coresContainer.innerHTML=''; 
        coresContainer.appendChild(createColorBlock(0));
      }).catch(err=>{
        alert('Erro ao atualizar produto: ' + err.message);
      });
    } else {
      // modo adição
      criarProdutoAPI(novo).then(async (produtoCriado)=>{
        // Após criar, recarrega a lista de produtos do servidor para garantir formato completo
        try{
          const data = await carregarProdutosAPI();
          if(Array.isArray(data)) produtos = data;
        }catch(e){ console.error('Erro ao recarregar produtos após criação', e); }

        const filtro = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        const pesquisa = document.getElementById('search')?.value || '';
        gerarVitrine(filtro, pesquisa);
        gerarCarousel();
        atualizarListaProdutos();
        alert('Produto adicionado com sucesso.');
        form.reset(); 
        coresContainer.innerHTML=''; 
        coresContainer.appendChild(createColorBlock(0));
      }).catch(err=>{
        alert('Erro ao adicionar produto: ' + err.message);
      });
    }
  });
}

// Atualiza a lista de produtos para gerenciamento (editar/excluir)
function atualizarListaProdutos(){
  const listContainer = document.getElementById('produtos-list');
  if(!listContainer) return; // elemento ainda não existe se não foi criado no HTML
  listContainer.innerHTML='';
  produtos.forEach((prod, idx)=>{
    const item = document.createElement('div');
    item.className='produto-item';
    item.style='display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(202,165,106,0.1);border-radius:6px;margin-bottom:6px;';
    item.innerHTML=`
      <span><strong>${prod.nome}</strong> (${prod.tipo}) ${prod.preco?'- '+formatPreco(prod.preco):''}</span>
      <div style="display:flex;gap:6px;">
        <button onclick="editarProduto(${idx})" class="b" style="padding:4px 8px;font-size:0.85em;">✎ Editar</button>
        <button onclick="excluirProduto(${idx})" class="b" style="padding:4px 8px;font-size:0.85em;background:rgba(220,50,50,0.2);border-color:#dc3232;color:#dc3232;">🗑 Excluir</button>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// Expor inicializadores do admin para serem chamados externamente (por exemplo após login)
window.initAdmin = initAdminForm;
window.atualizarListaProdutos = atualizarListaProdutos;

// NÃO inicializar o painel admin automaticamente — o controle de exibição
// e a chamada a esses inicializadores ficará a cargo do módulo de autenticação.

// Filtros e pesquisa
document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    gerarVitrine(btn.dataset.filter, document.getElementById('search').value);
  });
});
document.getElementById('search').addEventListener('input', e=>{
  const filtro = document.querySelector('.filter-btn.active').dataset.filter;
  gerarVitrine(filtro, e.target.value);
});

// Carrossel
const carousel = document.getElementById('carousel');
let carouselPos = 0;
function gerarCarousel(){
  carousel.innerHTML='';
  produtos.forEach((produto,pIndex)=>{
    // usar imagem da primeira cor como capa do produto
    const firstImg = (produto.cores && produto.cores[0] && produto.cores[0].gallery && produto.cores[0].gallery[0]) ? produto.cores[0].gallery[0] : 'Imagens/Logo.jpg';
    const a = document.createElement('a');
    a.href = "#galeria";
    a.className = "i";
    a.dataset.prod = pIndex;
    a.dataset.cor = 0;
    const precoText = formatPreco(produto.preco);
    a.innerHTML = `<img src="${firstImg}" alt="${produto.nome}" loading="lazy">
                   <div class="t">${produto.nome}</div>${precoText?`<div class="preco">${precoText}</div>`:''}`;

    // swatches no carousel
    if(Array.isArray(produto.cores) && produto.cores.length){
      const swatches = document.createElement('div');
      swatches.className = 'card-colors';
      produto.cores.forEach((cor, cIndex)=>{
        const btn = document.createElement('button');
        btn.className = 'color-swatch';
        btn.title = cor.nome || '';
        btn.style.background = cor.hex || '#ccc';
        btn.addEventListener('click', (ev)=>{
          ev.preventDefault();
          ev.stopPropagation();
          const img = a.querySelector('img');
          const src = (cor.gallery && cor.gallery[0]) ? cor.gallery[0] : 'Imagens/Logo.jpg';
          img.src = src;
          a.dataset.cor = cIndex;
          swatches.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));
          btn.classList.add('selected');
        });
        swatches.appendChild(btn);
      });
      a.appendChild(swatches);
    }

    carousel.appendChild(a);
  });
  // duplicação não mais necessária — o movimento do carousel usa scrollWidth
  adicionarEventosCards();
}
// Carrossel será regenerado ao carregar produtos (em inicializarVitrine)
function animarCarousel(){
  carouselPos -= 0.3;
  if(carouselPos <= -carousel.scrollWidth/2) carouselPos = 0;
  carousel.style.transform = `translateX(${carouselPos}px)`;
  requestAnimationFrame(animarCarousel);
}
requestAnimationFrame(animarCarousel);

// Galeria
let currentGallery=[], currentIndex=0, currentProduto=0, currentCor=0;
const galeriaImg = document.getElementById('galeria-img');
const galeriaMini = document.getElementById('galeria-mini');
const galeriaCont = document.getElementById('galeria-cont');
const galeriaCores = document.getElementById('galeria-cores');

function adicionarEventosCards(){
  document.querySelectorAll('.i').forEach(el=>{
    el.addEventListener('click',()=>{
      currentProduto = parseInt(el.dataset.prod);
      currentCor = parseInt(el.dataset.cor);
      currentGallery = produtos[currentProduto].cores[currentCor].gallery;
      currentIndex = 0;
      atualizarGaleria();
      atualizarCores();
    });
  });
}

function atualizarGaleria(){
  galeriaImg.src = currentGallery[currentIndex];
  galeriaMini.innerHTML = '';
  currentGallery.forEach((src,i)=>{
    const img = document.createElement('img');
    img.src = src;
    img.className = 'mi' + (i===currentIndex?' a':'');
    img.onclick = ()=>{currentIndex=i; atualizarGaleria();};
    galeriaMini.appendChild(img);
  });
  galeriaCont.textContent = `${currentIndex+1} / ${currentGallery.length}`;
}

function atualizarCores(){
  galeriaCores.innerHTML = '';
  produtos[currentProduto].cores.forEach((cor,i)=>{
    const btn = document.createElement('div');
    btn.className = 'color-btn'+(i===currentCor?' selected':'');
    btn.style.background = cor.hex;
    btn.title = cor.nome;
    btn.onclick = ()=>{
      currentCor=i;
      currentGallery=produtos[currentProduto].cores[currentCor].gallery;
      currentIndex=0;
      atualizarGaleria();
      atualizarCores();
    };
    galeriaCores.appendChild(btn);
  });
  atualizarWhatsapp();
}

function atualizarWhatsapp(){
  const whatsappBtn = document.getElementById('whatsapp-btn');
  const nomeProduto = produtos[currentProduto].nome;
  const corProduto = produtos[currentProduto].cores[currentCor].nome;
  const mensagem = `Olá! Gostaria de falar com o vendedor sobre o produto: ${nomeProduto} na cor ${corProduto}`;
  const numeroWhatsapp = '554896752847';
  const url = `https://api.whatsapp.com/send?phone=${numeroWhatsapp}&text=${encodeURIComponent(mensagem)}`;
  whatsappBtn.href = url;
}

// Navegação galeria
document.getElementById('next').addEventListener('click',()=>{currentIndex=(currentIndex+1)%currentGallery.length; atualizarGaleria();});
document.getElementById('prev').addEventListener('click',()=>{currentIndex=(currentIndex-1+currentGallery.length)%currentGallery.length; atualizarGaleria();});

// Zoom mobile
let isTouch=false;
galeriaImg.addEventListener('mousemove',e=>{
  if(isTouch) return;
  const rect=galeriaImg.getBoundingClientRect();
  const x=((e.clientX-rect.left)/rect.width)*100;
  const y=((e.clientY-rect.top)/rect.height)*100;
  galeriaImg.style.transformOrigin=`${x}% ${y}%`;
  galeriaImg.style.transform='scale(2)';
});
galeriaImg.addEventListener('mouseleave',()=>{if(isTouch) return; galeriaImg.style.transformOrigin='center center';galeriaImg.style.transform='scale(1)';});
galeriaImg.addEventListener('touchstart',()=>{isTouch=true; galeriaImg.style.transform='scale(2)';});
galeriaImg.addEventListener('touchend',()=>{isTouch=false; galeriaImg.style.transform='scale(1)';});

// Teclado galeria
document.addEventListener('keydown',e=>{
  const l=document.querySelector('.l:target');
  if(l){
    if(e.key==='ArrowRight') currentIndex=(currentIndex+1)%currentGallery.length;
    else if(e.key==='ArrowLeft') currentIndex=(currentIndex-1+currentGallery.length)%currentGallery.length;
    else if(e.key==='Escape') window.location.hash='#';
    atualizarGaleria();
  }
});

  // Inicializar formulário de alterar senha (chamado após autenticação)
  function initChangePasswordForm(){
    const form = document.getElementById('change-password-form');
    if(!form) return;
  
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const senhaAtual = document.getElementById('senha-atual').value;
      const senhaNova = document.getElementById('senha-nova').value;
      const senhaConfirmacao = document.getElementById('senha-confirmacao').value;
      const msgEl = document.getElementById('change-password-msg');

      if(senhaNova !== senhaConfirmacao){
        msgEl.textContent = 'As senhas não coincidem!';
        msgEl.style.color = '#dc3232';
        return;
      }

      try {
        // Importar a função dynamicamente para evitar erro se não estiver carregada
        const { alterarSenhaAPI } = await import('./auth-api.js');
        const resultado = await alterarSenhaAPI(senhaAtual, senhaNova);
        msgEl.textContent = '✓ Senha alterada com sucesso!';
        msgEl.style.color = '#0f0';
        form.reset();
        setTimeout(()=>{
          msgEl.textContent = '';
        }, 3000);
      } catch(err){
        msgEl.textContent = err.message || 'Erro ao alterar senha';
        msgEl.style.color = '#dc3232';
      }
    });
  }

  window.initChangePasswordForm = initChangePasswordForm;