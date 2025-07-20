import * as THREE from 'https://unpkg.com/three/build/three.module.js';

// --- Scene Setup ---
let scene, camera, renderer;
let planets = []; // Array to hold planet objects and their properties
let planetRevolutions = {}; // { planetName: revolutionCount }
let sun;
let clock = new THREE.Clock();

function init() {
    // Make controls draggable and closable
    makeControlsDraggableAndClosable();
    // Add a twinkling stars background using a starfield texture
    const loader = new THREE.TextureLoader();
    loader.load('https://cdn.jsdelivr.net/gh/rajatdiptabiswas/planet-textures@main/stars_milky_way.jpg', function(texture) {
        scene.background = texture;
    });

    // 1. Scene
    scene = new THREE.Scene();

    // 2. Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 100); // Adjust camera position as needed
    camera.lookAt(0, 0, 0); // Look at the center of the scene

    // 3. Renderer
    const canvas = document.getElementById('solarCanvas');
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Set renderer background to match page
    renderer.setClearColor(0xe6e9f0); // Light background
    // Ensure canvas fills the screen and is behind controls
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '1';

    // 4. Lighting 
    const ambientLight = new THREE.AmbientLight(0x333333); // Soft ambient light
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2); // Simulating the Sun's light 
    pointLight.position.set(0, 0, 0); // At the center where the Sun is
    scene.add(pointLight);

    // 5. Create Sun
    const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Basic material for now, consider a texture later
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // 6. Create Planets
    // You'll need to define properties for each planet:
    // - radius
    // - distance from sun (orbit radius)
    // - color
    // - orbital speed (default)
    // - rotation speed (around its own axis - bonus)

    // Public domain or NASA planet textures
    const textureUrls = {
        Mercury: 'https://cdn.jsdelivr.net/gh/rajatdiptabiswas/planet-textures@main/mercury.jpg',
        Venus:   'https://cdn.jsdelivr.net/gh/rajatdiptabiswas/planet-textures@main/venus.jpg',
        Earth:   'https://www.solarsystemscope.com/assets/img/textures/full/earth_2048.jpg', // Updated Earth texture URL
        Mars:    'https://cdn.jsdelivr.net/gh/rajatdiptabiswas/planet-textures@main/mars.jpg',
        Jupiter: 'https://cdn.jsdelivr.net/gh/rajatdiptabiswas/planet-textures@main/jupiter.jpg',
        Saturn:  'https://cdn.jsdelivr.net/gh/rajatdiptabiswas/planet-textures@main/saturn.jpg',
        Uranus:  'https://cdn.jsdelivr.net/gh/rajatdiptabiswas/planet-textures@main/uranus.jpg',
        Neptune: 'https://cdn.jsdelivr.net/gh/rajatdiptabiswas/planet-textures@main/neptune.jpg',
    };

    const planetData = [
        { name: 'Mercury', radius: 2.2, orbitRadius: 15, orbitSpeed: 0.05 },
        { name: 'Venus', radius: 3.2, orbitRadius: 25, orbitSpeed: 0.03 },
        { name: 'Earth', radius: 3.8, orbitRadius: 35, orbitSpeed: 0.02 },
        { name: 'Mars', radius: 2.8, orbitRadius: 45, orbitSpeed: 0.018 },
        { name: 'Jupiter', radius: 7.0, orbitRadius: 60, orbitSpeed: 0.01 },
        { name: 'Saturn', radius: 6.0, orbitRadius: 75, orbitSpeed: 0.008 },
        { name: 'Uranus', radius: 4.5, orbitRadius: 85, orbitSpeed: 0.006 },
        { name: 'Neptune', radius: 4.2, orbitRadius: 95, orbitSpeed: 0.005 },
    ];

    const textureLoader = new THREE.TextureLoader();
    planetData.forEach(data => {
        const geometry = new THREE.SphereGeometry(data.radius, 48, 48);
        let material;
        if (textureUrls[data.name]) {
            material = new THREE.MeshStandardMaterial({
                map: textureLoader.load(textureUrls[data.name]),
                roughness: 1,
                metalness: 0.1
            });
        } else {
            material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        }
        const planetMesh = new THREE.Mesh(geometry, material);

        // Create an Object3D to act as the pivot for the orbit
        const planetOrbitPivot = new THREE.Object3D();
        planetOrbitPivot.add(planetMesh);
        scene.add(planetOrbitPivot);

        // Position the planet mesh relative to its pivot
        planetMesh.position.set(data.orbitRadius, 0, 0);

        planets.push({
            name: data.name,
            mesh: planetMesh,
            pivot: planetOrbitPivot,
            orbitRadius: data.orbitRadius,
            initialOrbitSpeed: data.orbitSpeed,
            currentOrbitSpeed: data.orbitSpeed,
            orbitAngle: 0 // Track current angle for revolution counting
        });
        planetRevolutions[data.name] = 0;
    });

    // 7. Add Speed Controls 
    createSpeedControls();

    // 8. Handle Window Resizing
    window.addEventListener('resize', onWindowResize, false);
}

function createSpeedControls() {
    const controlsDiv = document.getElementById('controls');
    planets.forEach(planet => {
        const planetControlDiv = document.createElement('div');
        planetControlDiv.className = 'planet-control';

        const label = document.createElement('label');
        label.textContent = `${planet.name} Speed:`;
        planetControlDiv.appendChild(label);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = planet.initialOrbitSpeed * 3; // Example max, adjust as needed
        slider.step = planet.initialOrbitSpeed / 10; // Example step
        slider.value = planet.initialOrbitSpeed;
        slider.id = `slider-${planet.name}`;

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = planet.initialOrbitSpeed.toFixed(3);
        valueDisplay.style.marginLeft = '10px';
        slider.addEventListener('input', (event) => {
            planet.currentOrbitSpeed = parseFloat(event.target.value);
            valueDisplay.textContent = planet.currentOrbitSpeed.toFixed(3);
        });

        planetControlDiv.appendChild(slider);
        planetControlDiv.appendChild(valueDisplay);
        controlsDiv.appendChild(planetControlDiv);
    });
}

// --- Revolution Panel Update ---
function updateRevolutionsPanel() {
    const panel = document.getElementById('revolutions-list');
    if (!panel) return;
    panel.innerHTML = '';
    planets.forEach(planet => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.marginBottom = '6px';
        div.innerHTML = `<span style="font-weight:500;">${planet.name}</span> <span style="font-family:monospace;min-width:40px;text-align:right;">${planetRevolutions[planet.name]}</span>`;
        panel.appendChild(div);
    });
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Time elapsed since last frame 

    // Animate Sun rotation (optional)
    sun.rotation.y += 0.001;

    // Animate Planet Orbits and count revolutions
    planets.forEach(planet => {
        // Calculate angle increment
        const angleInc = planet.currentOrbitSpeed * delta * 60;
        planet.orbitAngle += angleInc;
        // Count revolutions
        if (planet.orbitAngle >= Math.PI * 2) {
            planet.orbitAngle -= Math.PI * 2;
            planetRevolutions[planet.name] += 1;
        }
        // Rotate the pivot for the orbit
        planet.pivot.rotation.y += angleInc;
    });

    updateRevolutionsPanel();
    renderer.render(scene, camera);
}

// Initialize and start the animation
init();
animate();

// --- Draggable and Closable Controls ---
function makeControlsDraggableAndClosable() {
    const controls = document.getElementById('controls');
    const closeBtn = controls.querySelector('.close-btn');
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    // Drag logic
    const header = controls.querySelector('h2');
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - controls.offsetLeft;
        offsetY = e.clientY - controls.offsetTop;
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        controls.style.left = (e.clientX - offsetX) + 'px';
        controls.style.top = (e.clientY - offsetY) + 'px';
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });

    // Close logic
    const showBtn = document.getElementById('show-controls-btn');
    closeBtn.addEventListener('click', () => {
        controls.style.display = 'none';
        showBtn.style.display = 'block';
    });
    showBtn.addEventListener('click', () => {
        controls.style.display = 'block';
        showBtn.style.display = 'none';
    });
}