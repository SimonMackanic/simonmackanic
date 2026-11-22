(()=>{
"use strict";

// Selectors
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

// Elements
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(pointer:fine)');
const art=$('.art');
const tilt=$('.art-tilt');
const sculpt=$('.sculpture');
const loop=$('#loop');
const motion=$('#motion');
const header=$('.header');

// Motion state
let setting=null;
try{setting=localStorage.getItem('sm-motion')}catch(e){}
let paused=setting==='off'||reduced.matches;
let near=true;
let frame=0;
let px=0, py=0;
let lastScroll=0;

// === PREMIUM TILT EFFECT (inspired by motion spot 3D camera movement) ===
function setTilt(){
	frame=0;
	if(paused||!fine.matches||reduced.matches){
		tilt.style.setProperty('--rx','0deg');
		tilt.style.setProperty('--ry','0deg');
		return;
	}

	// Smooth easing with cubic-bezier(0.18, 0.85, 0.25, 1.0) - from motion spot
	const targetRx=(-py*4).toFixed(2);
	const targetRy=(px*6).toFixed(2);

	tilt.style.setProperty('--rx',targetRx+'deg');
	tilt.style.setProperty('--ry',targetRy+'deg');
}

// Parallax pointer tracking with anticipation (nájezd)
art?.addEventListener('pointermove',e=>{
	if(paused||!fine.matches||reduced.matches)return;
	const r=art.getBoundingClientRect();
	const newPx=(e.clientX-r.left)/r.width*2-1;
	const newPy=(e.clientY-r.top)/r.height*2-1;

	// Smooth interpolation with anticipation
	px=px*0.85+newPx*0.15;
	py=py*0.85+newPy*0.15;

	if(!frame)frame=requestAnimationFrame(setTilt);
});

art?.addEventListener('pointerleave',()=>{
	// Smooth return to center with ease-out
	const returnToZero=()=>{
		px*=0.9;
		py*=0.9;
		if(Math.abs(px)>0.01||Math.abs(py)>0.01){
			setTilt();
			requestAnimationFrame(returnToZero);
		}else{
			px=py=0;
			setTilt();
		}
	};
	returnToZero();
});

// Video loop handling
loop?.addEventListener('playing',()=>sculpt?.classList.add('live'));
loop?.addEventListener('error',()=>sculpt?.classList.remove('live'));

// Motion sync
function sync(){
	const stop=paused||document.hidden||!near;
	document.body.classList.toggle('pause-motion',paused);
	motion?.setAttribute('aria-pressed',String(paused));
	motion?.setAttribute('aria-label',paused?'Spustit pohyb':'Pozastavit pohyb');
	const label=$('#motion-label');
	if(label)label.textContent=paused?'Spustit':'Pohyb';

	if(stop){
		loop?.pause();
		return;
	}

	if(loop&&!loop.getAttribute('src'))loop.src='assets/smycka.mp4';
	loop?.play().catch(()=>{
		if(loop.readyState<2)sculpt?.classList.remove('live');
	});
}

// Motion toggle
if(motion){
	motion.hidden=false;
	motion.addEventListener('click',()=>{
		paused=!paused;
		try{localStorage.setItem('sm-motion',paused?'off':'on')}catch(e){}
		sync();
	});
}

reduced.addEventListener('change',e=>{
	paused=e.matches||setting==='off';
	sync();
});

document.addEventListener('visibilitychange',sync);

// === PREMIUM SCROLL EFFECTS ===
let scrollTicking=false;

function handleScroll(){
	const scroll=window.pageYOffset||document.documentElement.scrollTop;

	// Header backdrop enhancement on scroll
	if(header){
		if(scroll>50){
			header.classList.add('scrolled');
		}else{
			header.classList.remove('scrolled');
		}
	}

	lastScroll=scroll;
	scrollTicking=false;
}

window.addEventListener('scroll',()=>{
	if(!scrollTicking){
		requestAnimationFrame(handleScroll);
		scrollTicking=true;
	}
},{passive:true});

// === INTERSECTION OBSERVER FOR REVEALS (motion spot timing) ===
if('IntersectionObserver' in window){
	// Art proximity observer
	if(art){
		new IntersectionObserver(es=>{
			near=es[0].isIntersecting;
			sync();
		},{rootMargin:'100px'}).observe(art);
	}

	// Premium reveal observer with stagger (inspired by motion spot sequential reveals)
	const revealOb=new IntersectionObserver(es=>{
		es.forEach(e=>{
			if(e.isIntersecting){
				// Add stagger delay based on index
				const siblings=Array.from(e.target.parentElement?.children||[]).filter(el=>el.classList.contains('reveal'));
				const index=siblings.indexOf(e.target);
				const delay=index*100; // 100ms stagger

				setTimeout(()=>{
					e.target.classList.add('in-view');
				},delay);

				revealOb.unobserve(e.target);
			}
		});
	},{threshold:0.15,rootMargin:'-5% 0px -10% 0px'});

	$$('.reveal').forEach(el=>revealOb.observe(el));

	// Stats counter animation (motion spot style number reveal)
	const statsOb=new IntersectionObserver(es=>{
		es.forEach(e=>{
			if(e.isIntersecting){
				e.target.classList.add('in-view');

				// Animate numbers with easing
				const nums=e.target.querySelectorAll('.num');
				nums.forEach(num=>{
					const text=num.textContent;
					const match=text.match(/\d+/);
					if(match){
						const target=parseInt(match[0]);
						const duration=1200; // 1.2s like motion spot
						const start=performance.now();
						const initialText=text;

						const animate=(now)=>{
							const elapsed=now-start;
							const progress=Math.min(elapsed/duration,1);
							// Cubic bezier(0.62, 0, 0.32, 1) approximation
							const eased=progress<0.5?2*progress*progress:1-Math.pow(-2*progress+2,2)/2;
							const current=Math.floor(target*eased);
							num.innerHTML=initialText.replace(/\d+/,current);

							if(progress<1){
								requestAnimationFrame(animate);
							}else{
								num.innerHTML=initialText;
							}
						};

						requestAnimationFrame(animate);
					}
				});

				statsOb.unobserve(e.target);
			}
		});
	},{threshold:0.3});

	const stats=$('.stats');
	if(stats)statsOb.observe(stats);

	// Project cards observer
	const projectOb=new IntersectionObserver(es=>{
		es.forEach(e=>{
			if(e.isIntersecting){
				e.target.classList.add('in-view');
				projectOb.unobserve(e.target);
			}
		});
	},{threshold:0.2});

	$$('.project').forEach(el=>projectOb.observe(el));

	// Service list observer
	const serviceOb=new IntersectionObserver(es=>{
		es.forEach(e=>{
			if(e.isIntersecting){
				e.target.classList.add('in-view');
				serviceOb.unobserve(e.target);
			}
		});
	},{threshold:0.25});

	$$('.service-list').forEach(el=>serviceOb.observe(el));

	// Section glow observer
	const sectionOb=new IntersectionObserver(es=>{
		es.forEach(e=>{
			if(e.isIntersecting){
				e.target.classList.add('in-view');
			}
		});
	},{threshold:0.1});

	$$('.section, .services-band, .contact, .profile').forEach(el=>sectionOb.observe(el));

	// Navigation active state with smooth transitions
	const navOb=new IntersectionObserver(es=>{
		for(const e of es){
			if(e.isIntersecting){
				$$('.navlinks a').forEach(l=>{
					if(l.hash==='#'+e.target.id){
						// Smooth transition with delay
						setTimeout(()=>{
							l.setAttribute('aria-current','location');
						},100);
					}else{
						l.removeAttribute('aria-current');
					}
				});
			}
		}
	},{rootMargin:'-10% 0px -55% 0px'});

	$$('main section[id]').forEach(el=>navOb.observe(el));
}else{
	sync();
}

// === MOBILE MENU (enhanced with smooth transitions) ===
const menu=$('.menu-toggle');
const links=$('#site-links');

if(menu&&links){
	menu.hidden=false;

	function toggleMenu(open){
		menu.setAttribute('aria-expanded',String(open));
		menu.textContent=open?'Zavřít':'Menu';
		links.classList.toggle('open',open);

		// Prevent body scroll when menu open
		document.body.style.overflow=open?'hidden':'';
	}

	menu.addEventListener('click',()=>toggleMenu(!links.classList.contains('open')));

	header?.addEventListener('click',e=>{
		if(e.target.closest('a'))toggleMenu(false);
	});

	document.addEventListener('keydown',e=>{
		if(e.key==='Escape'&&links.classList.contains('open')){
			toggleMenu(false);
			menu.focus();
		}
	});

	document.addEventListener('pointerdown',e=>{
		if(!e.target.closest('.header')&&links.classList.contains('open')){
			toggleMenu(false);
		}
	});
}

// === VIDEO PLAYER DIALOG (premium reveal animation) ===
const dialog=$('#player');
const video=$('#player-video');
const title=$('#player-title');
const direct=$('#direct-video');
let origin=null;

function showVideo(e,src,name,poster){
	if(typeof dialog?.showModal!=='function')return;

	e.preventDefault();
	origin=e.currentTarget;
	title.textContent=name;
	video.preload='metadata';
	video.src=src;
	video.poster=poster||'';
	video.load();
	direct.href=src;

	dialog.showModal();

	// Focus with smooth transition
	setTimeout(()=>{
		$('#close-player')?.focus();
	},100);

	// Autoplay with error handling
	video.play().catch(()=>{});
}

const introBtn=$('[data-intro]');
if(introBtn){
	introBtn.addEventListener('click',e=>
		showVideo(e,e.currentTarget.href,'Moje představení · anglicky','assets/predstaveni.webp')
	);
}

const closeBtn=$('#close-player');
if(closeBtn){
	closeBtn.addEventListener('click',()=>dialog?.close());
}

// Click outside to close (with smooth transition)
if(dialog){
	dialog.addEventListener('click',e=>{
		if(e.target!==dialog)return;
		const r=dialog.getBoundingClientRect();
		if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){
			dialog.close();
		}
	});

	dialog.addEventListener('close',()=>{
		video.pause();
		video.removeAttribute('src');
		video.load();
		if(origin){
			setTimeout(()=>{
				origin.focus({preventScroll:true});
			},100);
		}
	});
}

// === GALLERY ITEMS (if present) ===
const items=(window.MOTION_VYBER||[]).filter(v=>v&&v.src&&v.title);
const galleryEmpty=$('#gallery-empty');
const galleryItems=$('#gallery-items');

if(items.length&&galleryEmpty&&galleryItems){
	galleryEmpty.hidden=true;

	items.forEach((item,index)=>{
		const c=document.createElement('a');
		c.className='clip';
		c.href=item.src;
		c.style.opacity='0';
		c.style.transform='translateY(20px)';

		if(item.poster){
			c.style.backgroundImage='url('+JSON.stringify(item.poster)+')';
		}

		const name=document.createElement('strong');
		name.textContent=item.title;

		const note=document.createElement('span');
		note.textContent=item.note||'Přehrát video';

		c.append(name,note);
		c.addEventListener('click',e=>showVideo(e,c.href,item.title,item.poster));
		galleryItems.append(c);

		// Staggered reveal
		setTimeout(()=>{
			c.style.transition='all 0.6s cubic-bezier(0.18, 0.85, 0.25, 1.0)';
			c.style.opacity='1';
			c.style.transform='none';
		},index*100);
	});
}

// === COPY EMAIL (enhanced with smooth feedback) ===
const copyBtn=$('#copy-mail');
const copyMsg=$('#copy-message');

if(copyBtn&&copyMsg&&navigator.clipboard?.writeText){
	copyBtn.hidden=false;

	copyBtn.addEventListener('click',async()=>{
		try{
			await navigator.clipboard.writeText('simon10mac@gmail.com');
			copyMsg.textContent='E-mail zkopírován.';

			// Add success animation
			copyBtn.style.transform='scale(1.2) rotate(15deg)';
			setTimeout(()=>{
				copyBtn.style.transform='';
			},200);
		}catch(e){
			copyMsg.textContent='Adresu můžeš zkopírovat označením textu.';
		}

		// Clear message after 4s with fade
		setTimeout(()=>{
			copyMsg.style.transition='opacity 0.5s';
			copyMsg.style.opacity='0';
			setTimeout(()=>{
				copyMsg.textContent='';
				copyMsg.style.opacity='';
			},500);
		},3500);
	});
}

// === SMOOTH CURSOR EFFECTS (premium touch) ===
if(fine.matches&&!reduced.matches){
	// Add subtle cursor trail on interactive elements
	$$('a, button, summary').forEach(el=>{
		el.addEventListener('mouseenter',e=>{
			el.style.transition='transform 0.4s cubic-bezier(0.18, 0.85, 0.25, 1.0)';
		});
	});
}

// === PERFORMANCE OPTIMIZATION ===
// Debounce resize events
let resizeTimer;
window.addEventListener('resize',()=>{
	clearTimeout(resizeTimer);
	resizeTimer=setTimeout(()=>{
		// Recalculate any dynamic values if needed
		if(art&&!paused)setTilt();
	},150);
},{passive:true});

// === PRELOAD CRITICAL ASSETS ===
if(!reduced.matches){
	// Preload video when near viewport
	const preloadVideo=()=>{
		if(loop&&!loop.getAttribute('src')&&near){
			const tempLink=document.createElement('link');
			tempLink.rel='preload';
			tempLink.as='video';
			tempLink.href='assets/smycka.mp4';
			document.head.appendChild(tempLink);
		}
	};

	if(document.readyState==='complete'){
		setTimeout(preloadVideo,1000);
	}else{
		window.addEventListener('load',()=>setTimeout(preloadVideo,1000));
	}
}

// === KEYBOARD NAVIGATION ENHANCEMENTS ===
document.addEventListener('keydown',e=>{
	// Enhanced focus management
	if(e.key==='Tab'){
		document.body.classList.add('keyboard-nav');
	}
});

document.addEventListener('mousedown',()=>{
	document.body.classList.remove('keyboard-nav');
});

// === INITIALIZE ===
console.log('🎬 Premium motion system loaded');
sync();

})();
