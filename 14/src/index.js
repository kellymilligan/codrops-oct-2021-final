const canvasSketch = require("canvas-sketch");

// Import ThreeJS and assign it to global scope
// This way examples/ folder can use it too
const THREE = require("three");
global.THREE = THREE;

// Import extra THREE plugins
require("three/examples/js/controls/OrbitControls");
require("three/examples/js/geometries/RoundedBoxGeometry.js");
require("three/examples/js/loaders/RGBELoader.js");
require("three/examples/js/postprocessing/EffectComposer.js");
require("three/examples/js/postprocessing/RenderPass.js");
require("three/examples/js/postprocessing/ShaderPass.js");
require("three/examples/js/postprocessing/UnrealBloomPass.js");
require("three/examples/js/shaders/LuminosityHighPassShader.js");
require("three/examples/js/shaders/CopyShader.js");

const Stats = require("stats-js");
const { GUI } = require("dat.gui");

const settings = {
  animate: true,
  context: "webgl",
};

const sketch = ({ context, canvas, width, height }) => {
  const stats = new Stats();
  document.body.appendChild(stats.dom);
  const gui = new GUI();

  const options = {
    enableControls: true,
    enableRotation: true,
    transmission: 1,
    thickness: 1.2,
    roughness: 0.05,
    envMapIntensity: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    normalScale: 1,
    clearcoatNormalScale: 0.3,
    normalRepeat: 1,
    bloomThreshold: 0.85,
    bloomStrength: 0.5,
    bloomRadius: 0.33,
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

  const renderPass = new THREE.RenderPass(scene, camera);
  const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(width, height));
  bloomPass.threshold = options.bloomThreshold;
  bloomPass.strength = options.bloomStrength;
  bloomPass.radius = options.bloomRadius;

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  // Content
  // -------

  const textureLoader = new THREE.TextureLoader();

  const bgTexture = textureLoader.load("src/texture.jpg");
  const bgGeometry = new THREE.PlaneGeometry(5, 5);
  const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture });
  const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
  bgMesh.position.set(0, 0, -1);
  scene.add(bgMesh);

  const geometry = new THREE.RoundedBoxGeometry(1, 1, 1, 16, 0.2);

  const hdrEquirect = new THREE.RGBELoader().load(
    "src/empty_warehouse_01_2k.hdr",
    () => {
      hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    }
  );

  const normalMapTexture = textureLoader.load("src/normal.jpg");
  normalMapTexture.wrapS = THREE.RepeatWrapping;
  normalMapTexture.wrapT = THREE.RepeatWrapping;
  normalMapTexture.repeat.set(options.normalRepeat, options.normalRepeat);

  const material = new THREE.MeshPhysicalMaterial({
    transmission: options.transmission,
    thickness: options.thickness,
    roughness: options.roughness,
    envMap: hdrEquirect,
    envMapIntensity: options.envMapIntensity,
    clearcoat: options.clearcoat,
    clearcoatRoughness: options.clearcoatRoughness,
    normalScale: new THREE.Vector2(options.normalScale),
    normalMap: normalMapTexture,
    clearcoatNormalMap: normalMapTexture,
    clearcoatNormalScale: new THREE.Vector2(options.clearcoatNormalScale),
  });

  const MESH_COUNT = 500;
  const mesh = new THREE.InstancedMesh(geometry, material, MESH_COUNT);
  scene.add(mesh);

  const matrixDummy = new THREE.Object3D();

  const instanceData = [...Array(MESH_COUNT)].map(() => {
    const position = new THREE.Vector3(
      1.5 * (-1 + 2 * Math.random()),
      1.5 * (-1 + 2 * Math.random()),
      0.2 + (-1 + 2 * Math.random())
    );

    const rotation = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const axis = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );

    const BASE_SCALE = 0.2;
    const scale = BASE_SCALE * (0.25 + 0.75 * Math.random());

    const rotateTime = 5 + 15 * Math.random();

    return {
      position,
      rotation,
      axis,
      scale: new THREE.Vector3(scale, scale, scale),
      rotateTime,
    };
  });

  const updateInstances = (deltaTime) => {
    for (let i = 0; i < MESH_COUNT; i++) {
      const data = instanceData[i];

      matrixDummy.position.copy(data.position);
      matrixDummy.scale.copy(data.scale);
      matrixDummy.quaternion.setFromEuler(data.rotation);
      if (options.enableRotation) {
        matrixDummy.rotateOnWorldAxis(data.axis, deltaTime / data.rotateTime);
        data.rotation.copy(matrixDummy.rotation);
      }
      matrixDummy.updateMatrix();
      mesh.setMatrixAt(i, matrixDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  // GUI
  // ---

  gui.add(options, "enableControls").onChange((val) => {
    controls.enabled = val;
    controls.reset();
  });

  gui.add(options, "enableRotation").onChange(() => {
    mesh.rotation.set(0, 0, 0);
  });

  gui.add(options, "transmission", 0, 1, 0.01).onChange((val) => {
    material.transmission = val;
  });

  gui.add(options, "thickness", 0, 5, 0.1).onChange((val) => {
    material.thickness = val;
  });

  gui.add(options, "roughness", 0, 1, 0.01).onChange((val) => {
    material.roughness = val;
  });

  gui.add(options, "envMapIntensity", 0, 3, 0.1).onChange((val) => {
    material.envMapIntensity = val;
  });

  gui.add(options, "clearcoat", 0, 1, 0.01).onChange((val) => {
    material.clearcoat = val;
  });

  gui.add(options, "clearcoatRoughness", 0, 1, 0.01).onChange((val) => {
    material.clearcoatRoughness = val;
  });

  gui.add(options, "normalScale", 0, 5, 0.01).onChange((val) => {
    material.normalScale.set(val, val);
  });

  gui.add(options, "clearcoatNormalScale", 0, 5, 0.01).onChange((val) => {
    material.clearcoatNormalScale.set(val, val);
  });

  gui.add(options, "normalRepeat", 1, 4, 1).onChange((val) => {
    normalMapTexture.repeat.set(val, val);
  });

  const postprocessing = gui.addFolder("Post Processing");
  postprocessing.open();

  postprocessing.add(options, "bloomThreshold", 0, 1, 0.01).onChange((val) => {
    bloomPass.threshold = val;
  });

  postprocessing.add(options, "bloomStrength", 0, 5, 0.01).onChange((val) => {
    bloomPass.strength = val;
  });

  postprocessing.add(options, "bloomRadius", 0, 1, 0.01).onChange((val) => {
    bloomPass.radius = val;
  });

  // Update
  // ------

  const update = (time, deltaTime) => {
    updateInstances(deltaTime);

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
      const dpr = Math.min(pixelRatio, 2); // Cap DPR scaling to 2x
      renderer.setPixelRatio(dpr);
      renderer.setSize(viewportWidth, viewportHeight);
      composer.setPixelRatio(dpr);
      composer.setSize(viewportWidth, viewportHeight);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ time, deltaTime }) {
      stats.begin();
      controls.update();
      update(time, deltaTime);
      // renderer.render(scene, camera);
      composer.render();
      stats.end();
    },
    unload() {
      geometry.dispose();
      material.dispose();
      controls.dispose();
      renderer.dispose();
      bloomPass.dispose();
      gui.destroy();
    },
  };
};

canvasSketch(sketch, settings);
