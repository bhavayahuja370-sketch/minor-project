/**
 * NOVA AI Sign-In Gateway
 * Interactive 3D Canvas, Card Tilt, ThreeUI Button Bridge & Zero-Storage Redirect
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Interactive 3D Background with Three.js
  // --------------------------------------------------------------------------
  const canvas = document.getElementById('webgl-canvas');
  let scene, camera, renderer;
  let coreGroup, innerSphere, outerMesh, ringMesh, particleSystem;
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isPageVisible = !document.hidden;

  function initThreeScene() {
    if (!canvas || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.0018);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 24;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Position group slightly toward the left on desktop for balanced composition
    if (window.innerWidth > 1024) {
      coreGroup.position.x = -4.5;
    }

    // 1.1 Outer Wireframe Icosahedron (Holographic AI Lattice)
    const outerGeo = new THREE.IcosahedronGeometry(4.8, 1);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    outerMesh = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerMesh);

    // 1.2 Inner Glowing Point Cloud (Neural Core)
    const innerGeo = new THREE.SphereGeometry(3.2, 32, 32);
    const innerCount = innerGeo.attributes.position.count;
    const innerColors = new Float32Array(innerCount * 3);
    const colorCyan = new THREE.Color(0x00f5d4);
    const colorViolet = new THREE.Color(0x9d4edd);

    for (let i = 0; i < innerCount; i++) {
      const mixed = colorCyan.clone().lerp(colorViolet, Math.random());
      innerColors[i * 3] = mixed.r;
      innerColors[i * 3 + 1] = mixed.g;
      innerColors[i * 3 + 2] = mixed.b;
    }
    innerGeo.setAttribute('color', new THREE.BufferAttribute(innerColors, 3));

    const innerMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    innerSphere = new THREE.Points(innerGeo, innerMat);
    coreGroup.add(innerSphere);

    // 1.3 Orbiting Radiant Ring
    const ringGeo = new THREE.TorusGeometry(6.6, 0.03, 16, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x9d4edd,
      transparent: true,
      opacity: 0.5,
    });
    ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    ringMesh.rotation.y = Math.PI / 6;
    coreGroup.add(ringMesh);

    // 1.4 Cosmic Dust Floating Particles
    const dustCount = window.innerWidth < 640 ? 300 : 750;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 60;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      const c = Math.random() > 0.5 ? colorCyan : colorViolet;
      dustColors[i * 3] = c.r;
      dustColors[i * 3 + 1] = c.g;
      dustColors[i * 3 + 2] = c.b;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

    const dustMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    particleSystem = new THREE.Points(dustGeo, dustMat);
    scene.add(particleSystem);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('visibilitychange', () => {
      isPageVisible = !document.hidden;
    });

    animateScene();
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (coreGroup) {
      coreGroup.position.x = window.innerWidth > 1024 ? -4.5 : 0;
    }
  }

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function animateScene() {
    requestAnimationFrame(animateScene);
    if (!isPageVisible || isReducedMotion) return;

    // Smooth cursor parallax lerp
    targetX += (mouseX * 0.8 - targetX) * 0.04;
    targetY += (mouseY * 0.8 - targetY) * 0.04;

    if (coreGroup) {
      coreGroup.rotation.y += 0.003;
      coreGroup.rotation.x += 0.0015;
      coreGroup.rotation.y += targetX * 0.01;
      coreGroup.rotation.x -= targetY * 0.01;
    }

    if (outerMesh) {
      outerMesh.rotation.y -= 0.001;
      outerMesh.rotation.z += 0.002;
    }

    if (ringMesh) {
      ringMesh.rotation.z += 0.004;
    }

    if (particleSystem) {
      particleSystem.rotation.y += 0.0006;
      particleSystem.position.x = targetX * 1.2;
      particleSystem.position.y = targetY * 1.2;
    }

    renderer.render(scene, camera);
  }

  // --------------------------------------------------------------------------
  // 2. 3D Card Interactive Perspective Tilt
  // --------------------------------------------------------------------------
  const cardContainer = document.querySelector('.card-perspective-container');
  const card = document.getElementById('signinCard');

  if (cardContainer && card && !isReducedMotion && window.matchMedia('(pointer: fine)').matches) {
    cardContainer.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -6.5; // Max 6.5 deg tilt
      const rotateY = ((x - centerX) / centerX) * 6.5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(10px)`;
    });

    cardContainer.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    });
  }

  // --------------------------------------------------------------------------
  // 3. Rotating Phrases Showcase
  // --------------------------------------------------------------------------
  const phraseEl = document.getElementById('phraseText');
  const phrases = [
    'Think smarter.',
    'Create faster.',
    'Explore anything.',
    'Master complex topics.',
    'Build study plans.'
  ];
  let phraseIdx = 0;

  if (phraseEl) {
    setInterval(() => {
      phraseEl.classList.add('changing');
      setTimeout(() => {
        phraseIdx = (phraseIdx + 1) % phrases.length;
        phraseEl.textContent = phrases[phraseIdx];
        phraseEl.classList.remove('changing');
      }, 350);
    }, 2800);
  }

  // --------------------------------------------------------------------------
  // 4. Password Visibility Toggle
  // --------------------------------------------------------------------------
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('passwordToggle');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');

  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      if (eyeIcon && eyeOffIcon) {
        eyeIcon.style.display = isPassword ? 'none' : 'block';
        eyeOffIcon.style.display = isPassword ? 'block' : 'none';
      }
      passwordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      passwordToggle.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
    });
  }

  // --------------------------------------------------------------------------
  // 5. ThreeUI SignUpButton Component Integration
  // --------------------------------------------------------------------------
  const buttonIframe = document.getElementById('signUpButtonIframe');
  const shaderOverlay = document.getElementById('shaderClickOverlay');
  let iframeBtn = null;

  function setupThreeUiBridge() {
    if (!buttonIframe) return;

    buttonIframe.addEventListener('load', () => {
      try {
        const iframeDoc = buttonIframe.contentDocument || buttonIframe.contentWindow.document;
        if (!iframeDoc) return;

        // Ensure button background blends cleanly into our dark glass card
        iframeDoc.body.style.background = 'transparent';

        // Adjust scale so the 540x540 authored stage fills the card's button slot comfortably
        const updateScale = () => {
          const width = buttonIframe.offsetWidth || 340;
          const s = Math.min(Math.max(width / 460, 0.58), 0.72);
          iframeDoc.documentElement.style.setProperty('--s', s.toString());
        };
        updateScale();
        window.addEventListener('resize', updateScale);

        iframeBtn = iframeDoc.getElementById('btn') || iframeDoc.querySelector('.btn');
        if (iframeBtn) {
          // Listen directly to pointerup on the authored button
          iframeBtn.addEventListener('pointerup', () => {
            handleGatewayAccess('threeui-click');
          });
          iframeBtn.addEventListener('keyup', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              handleGatewayAccess('threeui-key');
            }
          });
        }
      } catch (err) {
        console.warn('Note: ThreeUI iframe accessed via sandbox boundary:', err);
      }
    });

    // Also support clicking anywhere on the shader frame overlay
    if (shaderOverlay) {
      shaderOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        triggerThreeUiBurst();
        handleGatewayAccess('overlay-click');
      });
    }
  }

  function triggerThreeUiBurst() {
    try {
      if (buttonIframe && buttonIframe.contentWindow) {
        const win = buttonIframe.contentWindow;
        if (win.__btn) {
          if (win.__btn.potion && typeof win.__btn.potion.burst === 'function') {
            win.__btn.potion.burst();
          }
          if (typeof win.__btn.addPrint === 'function') {
            win.__btn.addPrint(150, 58, 0, 3000);
          }
          if (win.__btn.btn) {
            win.__btn.btn.classList.add('sent');
            setTimeout(() => win.__btn.btn.classList.remove('sent'), 600);
          }
        }
      }
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 6. Zero-Storage Instant Gateway Flow & Redirect
  // --------------------------------------------------------------------------
  const signinForm = document.getElementById('signinForm');
  const emailInput = document.getElementById('email');
  const instantGatewayBtn = document.getElementById('instantGatewayBtn');
  const transitionOverlay = document.getElementById('transitionOverlay');
  const transitionStep = document.getElementById('transitionStep');
  let isNavigating = false;

  function handleGatewayAccess(triggerSource) {
    if (isNavigating) return;
    isNavigating = true;

    // Trigger visual button burst
    triggerThreeUiBurst();

    // 1. Immediately wipe any form inputs from client memory (Zero-Storage requirement)
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    // 2. Show futuristic portal transition
    if (transitionOverlay) {
      transitionOverlay.classList.add('active');
    }

    // Step 1: Synchronizing
    if (transitionStep) {
      transitionStep.textContent = '✦ Synchronizing with Nova AI Core...';
    }

    // Step 2: Instant Access Ready
    setTimeout(() => {
      if (transitionStep) {
        transitionStep.textContent = '✦ Access granted • Entering workspace...';
      }
    }, 400);

    // Step 3: Seamless redirect to the existing chatbot route
    setTimeout(() => {
      window.location.href = '/chat';
    }, 850);
  }

  // Connect form submission (e.g. Enter key pressed inside input)
  if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGatewayAccess('form-submit');
    });
  }

  if (instantGatewayBtn) {
    instantGatewayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleGatewayAccess('instant-button');
    });
  }

  // --------------------------------------------------------------------------
  // 7. Initialize
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initThreeScene();
    setupThreeUiBridge();
  });

})();
