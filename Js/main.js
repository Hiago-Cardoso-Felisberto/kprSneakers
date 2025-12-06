const produtos = [
  {
    nome: "Yeezy Boost 350 v2 Zebra",
    tipo: "masculino",
    cores: [{nome:"Branco", hex:"#fff", gallery:[
      "https://droper-media.us-southeast-1.linodeobjects.com/311202319485086.webp",
      "https://droper-media.us-southeast-1.linodeobjects.com/3112023194855194.webp",
      "https://droper-media.us-southeast-1.linodeobjects.com/311202319505646.webp",
      "https://droper-media.us-southeast-1.linodeobjects.com/311202319511823.webp",
      "https://droper-media.us-southeast-1.linodeobjects.com/311202319516377.webp",
      "https://droper-media.us-southeast-1.linodeobjects.com/12202318113914.webp"
    ]}]
  },
  {
    nome: "Yeezy Boost 350 v2 Black",
    tipo: "masculino",
    cores: [{nome:"Preto", hex:"#000", gallery:[
      "https://droper-media.s3.amazonaws.com/1222021174124686.jpeg",
      "https://droper-media.s3.amazonaws.com/1222021174133851.jpeg",
      "https://droper-media.s3.amazonaws.com/1222021174141963.jpeg",
      "https://droper-media.s3.amazonaws.com/1222021174148244.jpeg"
    ]}]
  },
  {
    nome: "Adidas Campus 00s Aurora",
    tipo: "feminino",
    cores: [{nome:"Verde", hex:"#0f0", gallery:[
      "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009134354705-669.webp",
      "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009134354735-433.webp",
      "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009134354960-893.webp",
      "https://droper-lapse.us-southeast-1.linodeobjects.com/2025100913435520-425.webp",
      "https://droper-lapse.us-southeast-1.linodeobjects.com/2025100913435574-955.webp",
      "https://droper-lapse.us-southeast-1.linodeobjects.com/2025100913435583-226.webp"
    ]}]
  },
  {
    nome: "Adidas Samba",
    tipo: "feminino",
    cores: [
      {nome:"Branco", hex:"#fff", gallery:[
        "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009185934745-825.webp",
        "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009185935606-150.webp",
        "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009185935627-153.webp",
        "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009185935875-991.webp",
        "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009185935604-835.webp",
        "https://droper-lapse.us-southeast-1.linodeobjects.com/20251009185933861-588.webp"
      ]}
    ]
  }
];

// Vitrine
const container = document.getElementById('produtos');
function gerarVitrine(filtro='all', search=''){
  container.innerHTML='';
  produtos.forEach((produto,pIndex)=>{
    if(filtro!=='all' && produto.tipo!==filtro) return;
    if(search && !produto.nome.toLowerCase().includes(search.toLowerCase())) return;

    produto.cores.forEach((cor,cIndex)=>{
      const a = document.createElement('a');
      a.href="#galeria";
      a.className="i";
      a.dataset.prod = pIndex;
      a.dataset.cor = cIndex;
      a.innerHTML = `<img src="${cor.gallery[0]}" alt="${produto.nome}" loading="lazy">
                     <div class="t">${produto.nome}</div>`;
      container.appendChild(a);
    });
  });
  adicionarEventosCards();
}
gerarVitrine();

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
    produto.cores.forEach((cor,cIndex)=>{
      const a = document.createElement('a');
      a.href="#galeria";
      a.className="i";
      a.dataset.prod = pIndex;
      a.dataset.cor = cIndex;
      a.innerHTML = `<img src="${cor.gallery[0]}" alt="${produto.nome}" loading="lazy">
                     <div class="t">${produto.nome}</div>`;
      carousel.appendChild(a);
    });
  });
  carousel.innerHTML += carousel.innerHTML;
  adicionarEventosCards();
}
gerarCarousel();
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