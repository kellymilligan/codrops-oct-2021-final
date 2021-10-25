const canvasSketch = require("canvas-sketch");

// Import ThreeJS and assign it to global scope
// This way examples/ folder can use it too
const THREE = require("three");
global.THREE = THREE;

// Import extra THREE plugins
require("three/examples/js/controls/OrbitControls");

const Stats = require("stats-js");
const { GUI } = require("dat.gui");

const settings = {
  animate: true,
  context: "webgl",
};

const sketch = ({ context, canvas }) => {
  const stats = new Stats();
  document.body.appendChild(stats.dom);
  const gui = new GUI();

  const options = {
    enableCameraSwoop: false,
  };

  // Setup
  // -----

  const renderer = new THREE.WebGLRenderer({ context });
  renderer.setClearColor(0x1f1e1c, 1);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0, 5);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enabled = false;

  const scene = new THREE.Scene();

  // Content
  // -------

  const bgTexture = new THREE.TextureLoader().load("src/texture.jpg");
  const bgGeometry = new THREE.PlaneGeometry(5, 5);
  const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture });
  const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
  bgMesh.position.set(0, 0, -1);
  scene.add(bgMesh);

  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshPhysicalMaterial({
    roughness: 0.7,
    transmission: 1,
    thickness: 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // GUI
  // ---

  gui.add(options, "enableCameraSwoop").onChange((val) => {
    controls.enabled = !val;
    controls.reset();
  });

  // Update
  // ------

  const update = (time, deltaTime) => {
    const ROTATE_TIME = 30; // Time in seconds for a full rotation
    const xAxis = new THREE.Vector3(1, 0, 0);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const rotateX = (deltaTime / ROTATE_TIME) * Math.PI * 2;
    const rotateY = (deltaTime / ROTATE_TIME) * Math.PI * 2;

    mesh.rotateOnWorldAxis(xAxis, rotateX);
    mesh.rotateOnWorldAxis(yAxis, rotateY);

    if (options.enableCameraSwoop) {
      camera.position.x = Math.sin((time / 10) * Math.PI * 2) * 3;
      camera.position.y = Math.cos((time / 10) * Math.PI * 2) * 3;
      camera.position.z = 4;
      camera.lookAt(scene.position);
    }
  };

  // Lifecycle
  // ---------

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ time, deltaTime }) {
      stats.begin();
      controls.update();
      update(time, deltaTime);
      renderer.render(scene, camera);
      stats.end();
    },
    unload() {
      geometry.dispose();
      material.dispose();
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);
