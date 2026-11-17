import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const socket = io();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(20, 30, 10);
sunlight.castShadow = true;
scene.add(sunlight);

const material = color => new THREE.MeshStandardMaterial({ color });

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  material(0x555b50)
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function createBox(x, y, z, sx, sy, sz, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    material(color)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Magazyny
createBox(-12, 4, -15, 12, 8, 20, 0x777777);
createBox(12, 4, -15, 12, 8, 20, 0x888888);
createBox(-12, 4, 15, 12, 8, 20, 0x777777);
createBox(12, 4, 15, 12, 8, 20, 0x888888);

// Skrzynie
for (let i = 0; i < 15; i++) {
  createBox(
    Math.random() * 35 - 17,
    1,
    Math.random() * 35 - 17,
    2,
    2,
    2,
    0x80552e
  );
}

// Postać
function createCharacter(color = 0x2455cc) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.9, 0.35),
    material(color)
  );
  body.position.y = 1.35;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 16, 16),
    material(0xffc58a)
  );
  head.position.y = 2.05;
  group.add(head);

  const armMaterial = material(0xffc58a);
  const legMaterial = material(0x222222);

  const arms = [];
  const legs = [];

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.75, 0.2),
      armMaterial
    );
    arm.position.set(side * 0.45, 1.35, 0);
    group.add(arm);
    arms.push(arm);

    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.75, 0.25),
      legMaterial
    );
    leg.position.set(side * 0.18, 0.55, 0);
    group.add(leg);
    legs.push(leg);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.15, 0.4),
      material(0x111111)
    );
    shoe.position.set(side * 0.18, 0.12, -0.06);
    group.add(shoe);
  }

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.8),
    material(0x222222)
  );
  gun.position.set(0.35, 1.35, -0.55);
  group.add(gun);

  group.userData.arms = arms;
  group.userData.legs = legs;

  group.traverse(obj => {
    if (obj.isMesh) obj.castShadow = true;
  });

  scene.add(group);
  return group;
}

const player = createCharacter();
player.position.set(0, 0, 0);

const otherPlayers = new Map();
const enemies = [];

function createEnemy(x, z) {
  const enemy = createCharacter(0xb22222);
  enemy.position.set(x, 0, z);
  enemy.userData.health = 100;
  enemy.userData.speed = 0.025;
  enemies.push(enemy);
}

for (let i = 0; i < 7; i++) {
  createEnemy(
    Math.random() * 30 - 15,
    Math.random() * 30 - 15
  );
}

let coins = 0;
let health = 100;
let wave = 1;
let yaw = 0;
let pitch = 0.15;
let moving = false;

const keys = {};

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

// Kamera
function updateCamera() {
  const distance = 5;
  const target = new THREE.Vector3(
    player.position.x,
    player.position.y + 2,
    player.position.z
  );

  camera.position.set(
    target.x + Math.sin(yaw) * distance,
    target.y + 2 + pitch * 5,
    target.z + Math.cos(yaw) * distance
  );

  camera.lookAt(target);
}

// Ruch i sterowanie
function movePlayer() {
  let forward = 0;
  let sideways = 0;

  if (keys["w"] || keys["arrowup"]) forward = 1;
  if (keys["s"] || keys["arrowdown"]) forward = -1;
  if (keys["a"] || keys["arrowleft"]) sideways = -1;
  if (keys["d"] || keys["arrowright"]) sideways = 1;

  forward += joystickY;
  sideways += joystickX;

  moving = forward !== 0 || sideways !== 0;

  if (!moving) return;

  const speed = 0.12;

  const dx = Math.sin(yaw) * forward + Math.cos(yaw) * sideways;
  const dz = Math.cos(yaw) * forward - Math.sin(yaw) * sideways;

  player.position.x += dx * speed;
  player.position.z += dz * speed;

  player.rotation.y = Math.atan2(dx, dz);

  const t = performance.now() * 0.012;

  player.userData.legs[0].rotation.x = Math.sin(t) * 0.6;
  player.userData.legs[1].rotation.x = -Math.sin(t) * 0.6;
  player.userData.arms[0].rotation.x = -Math.sin(t) * 0.3;
  player.userData.arms[1].rotation.x = Math.sin(t) * 0.3;
}

// Strzelanie
const raycaster = new THREE.Raycaster();

function shoot() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const targets = enemies.filter(e => e.visible);
  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length > 0) {
    let enemy = hits[0].object;

    while (enemy.parent && !enemies.includes(enemy)) {
      enemy = enemy.parent;
    }

    if (enemies.includes(enemy)) {
      enemy.userData.health -= 50;

      if (enemy.userData.health <= 0) {
        scene.remove(enemy);
        enemies.splice(enemies.indexOf(enemy), 1);

        coins += 15;
        document.getElementById("coins").textContent = coins;

        if (enemies.length === 0) {
          wave++;
          document.getElementById("wave").textContent = wave;

          for (let i = 0; i < 5 + wave; i++) {
            createEnemy(
              Math.random() * 30 - 15,
              Math.random() * 30 - 15
            );
          }
        }
      }
    }
  }
}

window.addEventListener("mousedown", e => {
  if (e.button === 0) shoot();
});

document.getElementById("shootButton").addEventListener("click", shoot);

// Sterowanie dotykowe
let joystickX = 0;
let joystickY = 0;

const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

joystick.addEventListener("pointermove", e => {
  if (!e.buttons) return;

  const rect = joystick.getBoundingClientRect();
  const x = e.clientX - (rect.left + rect.width / 2);
  const y = e.clientY - (rect.top + rect.height / 2);

  const distance = Math.min(35, Math.hypot(x, y));
  const angle = Math.atan2(y, x);

  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;

  stick.style.transform = `translate(${dx}px, ${dy}px)`;

  joystickX = dx / 35;
  joystickY = -dy / 35;
});

function stopJoystick() {
  joystickX = 0;
  joystickY = 0;
  stick.style.transform = "translate(0,0)";
}

joystick.addEventListener("pointerup", stopJoystick);
joystick.addEventListener("pointercancel", stopJoystick);
joystick.addEventListener("pointerleave", e => {
  if (!e.buttons) stopJoystick();
});

// Obracanie kamery na telefonie
const lookArea = document.getElementById("lookArea");

let lastX = 0;
let lastY = 0;
let looking = false;

lookArea.addEventListener("pointerdown", e => {
  looking = true;
  lastX = e.clientX;
  lastY = e.clientY;
  lookArea.setPointerCapture(e.pointerId);
});

lookArea.addEventListener("pointermove", e => {
  if (!looking) return;

  yaw -= (e.clientX - lastX) * 0.006;
  pitch += (e.clientY - lastY) * 0.003;

  pitch = Math.max(-0.5, Math.min(0.8, pitch));

  lastX = e.clientX;
  lastY = e.clientY;
});

lookArea.addEventListener("pointerup", () => {
  looking = false;
});

lookArea.addEventListener("pointercancel", () => {
  looking = false;
});

// Multiplayer – inni gracze
socket.on("playerMove", data => {
  let other = otherPlayers.get(data.id);

  if (!other) {
    other = createCharacter(0x22bb55);
    otherPlayers.set(data.id, other);
  }

  other.position.set(data.x, data.y, data.z);
  other.rotation.y = data.rotation;
});

socket.on("playerLeft", id => {
  const other = otherPlayers.get(id);

  if (other) {
    scene.remove(other);
    otherPlayers.delete(id);
  }
});

let lastSync = 0;

function animate() {
  requestAnimationFrame(animate);

  movePlayer();

  const now = performance.now();

  if (now - lastSync > 50) {
    socket.emit("playerMove", {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      rotation: player.rotation.y
    });

    lastSync = now;
  }

  // Przeciwnicy podążają w stronę gracza
  for (const enemy of enemies) {
    const dx = player.position.x - enemy.position.x;
    const dz = player.position.z - enemy.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance > 1.5) {
      enemy.position.x += (dx / distance) * enemy.userData.speed;
      enemy.position.z += (dz / distance) * enemy.userData.speed;
      enemy.rotation.y = Math.atan2(dx, dz);
    }
  }

  updateCamera();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
