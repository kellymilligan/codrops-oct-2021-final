const canvasSketch = require("canvas-sketch");

// Import ThreeJS and assign it to global scope
// This way examples/ folder can use it too
const THREE = require("three");
global.THREE = THREE;

// Import extra THREE plugins
require("three/examples/js/controls/OrbitControls");
require("three/examples/js/geometries/RoundedBoxGeometry.js");
require("three/examples/js/loaders/GLTFLoader.js");
require("three/examples/js/loaders/RGBELoader.js");

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
    enableControls: true,
    enableRotation: true,
    transmission: 1,
    thickness: 1.5,
    roughness: 0.07,
    envMapIntensity: 1.5,
  };

  // Setup
  // -----

  const renderer = new THREE.WebGLRenderer({
    context,
    antialias: false,
  });
  renderer.setClearColor(0x1f1e1c, 1);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0, 5);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enabled = options.enableControls;

  const scene = new THREE.Scene();

  // Content
  // -------

  const bgTexture = new THREE.TextureLoader().load("src/texture.jpg");
  const bgGeometry = new THREE.PlaneGeometry(5, 5);
  const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture });
  const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
  bgMesh.position.set(0, 0, -1);
  scene.add(bgMesh);

  const positions = [
    [-0.85, 0.85, 0],
    [0.85, 0.85, 0],
    [-0.85, -0.85, 0],
    [0.85, -0.85, 0],
  ];

  const geometries = [
    new THREE.IcosahedronGeometry(0.75, 0), // Faceted
    new THREE.IcosahedronGeometry(0.67, 24), // Sphere
    new THREE.RoundedBoxGeometry(1.12, 1.12, 1.12, 16, 0.2),
  ];

  const hdrEquirect = new THREE.RGBELoader().load(
    "src/empty_warehouse_01_2k.hdr",
    () => {
      hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    }
  );

  const material = new THREE.MeshPhysicalMaterial({
    transmission: options.transmission,
    thickness: options.thickness,
    roughness: options.roughness,
    envMap: hdrEquirect,
  });

  const meshes = geometries.map(
    (geometry) => new THREE.Mesh(geometry, material)
  );

  meshes.forEach((mesh, i) => {
    scene.add(mesh);
    mesh.position.set(...positions[i]);
  });

  // Add dragon GLTF model
  new THREE.GLTFLoader().load("src/dragon.glb", (gltf) => {
    const dragon = gltf.scene.children.find((mesh) => mesh.name === "Dragon");

    // Just copy the geometry from the loaded model
    const geometry = dragon.geometry.clone();

    // Adjust geometry to suit our scene
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, -4, 0);

    // Create a new mesh and place it in the scene
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...positions[3]);
    mesh.scale.set(0.135, 0.135, 0.135);
    meshes.push(mesh);
    scene.add(mesh);

    // Discard the model
    dragon.geometry.dispose();
    dragon.material.dispose();
  });

  // GUI
  // ---

  gui
    .add(options, "enableControls")
    .name("Enable controls")
    .onChange((val) => {
      controls.enabled = val;
      controls.reset();
    });

  gui
    .add(options, "enableRotation")
    .name("Enable rotation")
    .onChange(() => {
      meshes.forEach((mesh) => mesh.rotation.set(0, 0, 0));
    });

  gui
    .add(options, "transmission", 0, 1, 0.01)
    .name("Transmission")
    .onChange((val) => {
      material.transmission = val;
    });

  gui
    .add(options, "thickness", 0, 5, 0.1)
    .name("Thickness")
    .onChange((val) => {
      material.thickness = val;
    });

  gui
    .add(options, "roughness", 0, 1, 0.01)
    .name("Roughness")
    .onChange((val) => {
      material.roughness = val;
    });

  gui
    .add(options, "envMapIntensity", 0, 3, 0.1)
    .name("Env Map Intensity")
    .onChange((val) => {
      material.envMapIntensity = val;
    });

  // Update
  // ------

  const update = (time, deltaTime) => {
    const ROTATE_TIME = 10; // Time in seconds for a full rotation
    const xAxis = new THREE.Vector3(1, 0, 0);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const rotateX = (deltaTime / ROTATE_TIME) * Math.PI * 2;
    const rotateY = (deltaTime / ROTATE_TIME) * Math.PI * 2;

    if (options.enableRotation) {
      meshes.forEach((mesh) => {
        mesh.rotateOnWorldAxis(xAxis, rotateX);
        mesh.rotateOnWorldAxis(yAxis, rotateY);
      });
    }

    if (!options.enableControls) {
      camera.position.x = Math.sin((time / 10) * Math.PI * 2) * 2;
      camera.position.y = Math.cos((time / 10) * Math.PI * 2) * 2;
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
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
      controls.dispose();
      renderer.dispose();
      gui.destroy();
    },
  };
};

canvasSketch(sketch, settings);
