import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Scanner {
  constructor({ onStatus, onFound, onLost, onError }) { Object.assign(this, { onStatus, onFound, onLost, onError }); this.running = false; this.piece = null; this.model = null; this.gesture = null; this.markerId = 0; }
  async start() {
    if (this.running) return;
    if (!window.isSecureContext) throw new Error('La cámara requiere HTTPS o localhost.');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador no ofrece acceso a la cámara.');
    this.inventory ||= await (await fetch('/data/inventory.json')).json();
    this.piece ||= this.inventory[0];
    if (!this.piece) throw new Error('Aún no hay piezas en el inventario.');
    if (!window.AR?.Detector || !window.POS?.Posit) throw new Error('No se pudo cargar el detector ArUco. Comprueba la conexión e inténtalo de nuevo.');
    this.onStatus('Busca la etiqueta correspondiente a la pieza', 'Permite el acceso a la cámara para escanear.');
    const video = document.createElement('video'); video.autoplay = true; video.muted = true; video.playsInline = true; video.className = 'aruco-video';
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    video.srcObject = this.stream; this.video = video; const host = document.querySelector('#camera'); host.replaceChildren(video); await video.play();
    await new Promise((resolve) => video.videoWidth ? resolve() : video.addEventListener('loadedmetadata', resolve, { once: true }));
    this.detector = new window.AR.Detector({ dictionaryName: 'ARUCO' });
    this.canvas = document.createElement('canvas'); this.canvas.width = 640; this.canvas.height = Math.round(640 * video.videoHeight / video.videoWidth); this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.posit = new window.POS.Posit(120, this.canvas.width);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); this.renderer.setClearColor(0x000000, 0); this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.setSize(host.clientWidth, host.clientHeight); this.renderer.domElement.className = 'aruco-renderer'; this.renderer.domElement.style.display = 'none'; host.append(this.renderer.domElement);
    this.scene = new THREE.Scene(); const focal = this.canvas.width * 0.9; const fov = THREE.MathUtils.radToDeg(2 * Math.atan(this.canvas.height / (2 * focal))); this.camera = new THREE.PerspectiveCamera(fov, host.clientWidth / host.clientHeight, 0.001, 100); this.camera.position.set(0, 0, 0); this.scene.add(new THREE.HemisphereLight(0xffffff, 0x64533a, 2.4)); const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(1, 2, 3); this.scene.add(light);
    this.resizeRenderer = () => { if (!this.renderer) return; const { clientWidth, clientHeight } = host; this.renderer.setSize(clientWidth, clientHeight); this.camera.aspect = clientWidth / clientHeight; this.camera.updateProjectionMatrix(); };
    window.addEventListener('resize', this.resizeRenderer);
    this.anchor = new THREE.Group(); this.scene.add(this.anchor); this.running = true; this.visible = false;
    try { await this.loadModel(this.piece); } catch (error) { this.onError('No se pudo cargar el modelo 3D.'); }
    this.onStatus('Busca la etiqueta correspondiente a la pieza', 'Escanéala con la cámara de tu dispositivo.'); this.bindGestures(); this.tick();
  }
  async loadModel(piece) {
    this.disposeModel(); this.piece = piece; this.markerId = piece.markerId ?? 0;
    const gltf = await new GLTFLoader().loadAsync(piece.model);
    const asset = gltf.scene;
    rotateColorTextures(asset, piece.textureRotation || 0);
    const bounds = new THREE.Box3().setFromObject(asset);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const max = Math.max(size.x,size.y,size.z) || 1;
    const baseScale = (piece.scale || 0.24) / max;
    this.model = new THREE.Group();
    this.model.name = `${piece.id}-pivot-center`;
    this.model.rotation.order = 'YXZ';
    this.initialRotation = new THREE.Euler(...(piece.previewRotation || [0, 0, 0]), 'YXZ');
    this.model.rotation.copy(this.initialRotation);
    asset.scale.setScalar(baseScale);
    asset.position.copy(center).multiplyScalar(-baseScale);
    this.model.add(asset);
    this.initialScale = 1;
    this.model.scale.setScalar(this.initialScale);
    this.anchor.add(this.model);
  }
  tick() {
    if (!this.running) return;
    if (!this.previewMode && this.video.readyState >= 2) {
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      const markers = this.detector.detect(this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height));
      const marker = markers.find((item) => this.inventory.some((piece) => (piece.markerId ?? 0) === item.id));
      if (marker) {
        const piece = this.inventory.find((item) => (item.markerId ?? 0) === marker.id);
        this.lastDetectedMarkerId = marker.id;
        const points = marker.corners.map((point) => ({ x: point.x-this.canvas.width/2, y: this.canvas.height/2-point.y })); const pose = this.posit.pose(points);
        if (pose?.bestRotation && pose?.bestTranslation) {
          const r = pose.bestRotation, t = pose.bestTranslation, m = new THREE.Matrix4().set(r[0][0],r[0][1],r[0][2],t[0]/1000,r[1][0],r[1][1],r[1][2],t[1]/1000,r[2][0],r[2][1],r[2][2],-t[2]/1000,0,0,0,1);
          this.anchor.matrixAutoUpdate = false; this.anchor.matrix.copy(m); this.anchor.visible = true;
          if (piece.id !== this.piece?.id || (!this.model && !this.loadingPieceId)) {
            if (!this.loadingPieceId) {
              this.loadingPieceId = piece.id;
              this.onStatus('Cargando modelo', piece.name);
              this.loadModel(piece).then(() => {
                this.loadingPieceId = null;
                if (this.running && this.lastDetectedMarkerId === (piece.markerId ?? 0) && !this.previewMode) { this.visible = true; this.enterPreview(); }
              }).catch(() => { this.loadingPieceId = null; this.onError(`No se pudo cargar el modelo de ${piece.name}.`); });
            }
          } else if (!this.visible && this.model && !this.loadingPieceId) { this.visible = true; this.enterPreview(); }
        }
      } else if (this.visible) { this.visible = false; this.anchor.visible = false; this.onLost(this.piece); }
    }
    if (this.autoRotate && this.model) this.model.rotation.y += 0.002;
    if (this.previewMode) this.anchor.position.y = (this.previewOffsetY || 0) + Math.sin(performance.now() * 0.0014) * 0.018;
    this.renderer.render(this.scene,this.camera); this.frame = requestAnimationFrame(() => this.tick());
  }
  enterPreview() {
    this.previewMode = true;
    this.renderer.domElement.style.display = '';
    this.autoRotate = true;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.pause(); this.video.srcObject = null;
    this.anchor.matrixAutoUpdate = true; this.previewOffsetY = window.matchMedia?.('(pointer: coarse) and (orientation: portrait)').matches ? 0.015 : 0; this.anchor.position.set(0,this.previewOffsetY,0); this.anchor.quaternion.identity(); this.anchor.scale.setScalar(1); this.anchor.visible = true;
    this.camera.position.set(0,0,0.55); this.camera.lookAt(0,0,0);
    this.onFound(this.piece);
  }
  async resumeScanning() {
    if (!this.running || !this.previewMode) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio:false, video:{ facingMode:{ideal:'environment'}, width:{ideal:1280}, height:{ideal:720} } });
    this.video.srcObject = this.stream; await this.video.play(); this.renderer.domElement.style.display = 'none';
    this.camera.position.set(0,0,0); this.previewMode = false; this.visible = false; this.anchor.visible = false;
  }
  setPiece(piece) { if (!piece || this.piece?.id === piece.id) return; this.markerId = piece.markerId ?? 0; if (this.running) this.loadModel(piece).catch(() => this.onError('No se pudo cargar el modelo de esta pieza.')); else this.piece = piece; }
  rotate(value) { if (this.model) this.model.rotation.y += value; }
  toggle360() { this.autoRotate = !this.autoRotate; return this.autoRotate; }
  scale(value) { if (!this.model) return; this.model.scale.multiplyScalar(value); this.model.scale.clampLength(this.initialScale*0.35,this.initialScale*2.5); }
  reset() { if (this.model) { this.model.rotation.copy(this.initialRotation); this.model.scale.setScalar(this.initialScale); } }
  bindGestures() {
    const el = document.querySelector('#camera');
    this.pointers = new Map();
    this.lastPinchDistance = 0;
    el.onpointerdown = (event) => {
      if (!this.model || event.target.closest('button,.tech-sheet')) return;
      event.preventDefault(); el.setPointerCapture?.(event.pointerId);
      this.pointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
      if (this.pointers.size === 2) this.lastPinchDistance = pointerDistance([...this.pointers.values()]);
    };
    el.onpointermove = (event) => {
      if (!this.pointers?.has(event.pointerId) || !this.model) return;
      const previous = this.pointers.get(event.pointerId);
      this.pointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
      if (this.pointers.size === 1) {
        this.model.rotation.y += (event.clientX - previous.x) * 0.009;
        this.model.rotation.x = THREE.MathUtils.clamp(this.model.rotation.x + (event.clientY - previous.y) * 0.009, -Math.PI, Math.PI);
      } else if (this.pointers.size === 2) {
        const distance = pointerDistance([...this.pointers.values()]);
        if (this.lastPinchDistance > 0) this.scale(distance / this.lastPinchDistance);
        this.lastPinchDistance = distance;
      }
    };
    const end = (event) => { this.pointers?.delete(event.pointerId); this.lastPinchDistance = this.pointers?.size === 2 ? pointerDistance([...this.pointers.values()]) : 0; };
    el.onpointerup = end; el.onpointercancel = end;
  }
  disposeModel() { if (!this.model) return; this.anchor?.remove(this.model); this.model.traverse((n)=>{n.geometry?.dispose();for(const m of (Array.isArray(n.material)?n.material:[n.material]))if(m){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});this.model=null; }
  async stop() { if (!this.running && !this.stream) return; this.running=false; this.previewMode=false; cancelAnimationFrame(this.frame); window.removeEventListener('resize', this.resizeRenderer); this.resizeRenderer=null; this.stream?.getTracks().forEach(t=>t.stop()); this.stream=null; this.disposeModel(); this.renderer?.dispose(); this.renderer=null; document.querySelector('#camera').replaceChildren(); }
}
function pointerDistance(points) { return Math.hypot(points[0].x-points[1].x, points[0].y-points[1].y); }
function rotateColorTextures(root, radians) {
  const rotated = new Set();
  root.traverse((node) => {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      const texture = material?.map;
      if (!texture?.isTexture || rotated.has(texture)) continue;
      texture.center.set(0.5, 0.5);
      texture.rotation = radians;
      texture.updateMatrix();
      rotated.add(texture);
    }
  });
}
