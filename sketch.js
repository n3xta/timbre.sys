// Audio setup with Tone.js
let player;
let filter;
let distortion;
let reverb;
let audioInitialized = false;

// Three.js variables
let scene, camera, renderer;
let cube, wireframe;
let dragControls, orbitControls;
let draggableCubePoints = [];
let isDragging = false;
let originalCubeSize = { width: 4, height: 4, depth: 4 }; // Increased size to be larger relative to plane
let minSize = 2.5; // Increased minimum size
let maxSize = 6.0; // Increased maximum size
let isReversed = false; // Track audio reversal state

// Monochrome color scheme
let cubeColor = 0xffffff; // White

// DOM elements
let playButton;
let reverseButton;

// Start with setup to configure UI
function setup() {
	// Configure p5 elements
	playButton = createButton("<i class='fas fa-play'></i>");
	playButton.parent('play-button');
	playButton.addClass('play-btn');
	playButton.mouseClicked(togglePlayback);
	
	// Configure reverse button
	reverseButton = select('#reverse-btn');
	reverseButton.mouseClicked(toggleReverse);
	
	// Initialize Three.js scene
	init();
	
	// Space bar for play/pause
	window.addEventListener('keydown', function(e) {
		if (e.code === 'Space') {
			e.preventDefault(); // Prevent page scrolling
			togglePlayback();
		}
	});
}

// Initialize audio with effects chain
function initAudio() {
	if (audioInitialized) return;
	
	// Create player and effects
	player = new Tone.Player("samples/drum_loop.wav");
	filter = new Tone.Filter(800, "lowpass");
	distortion = new Tone.Distortion(0.2);
	reverb = new Tone.Reverb(1.5);
	
	// Wait for reverb to initialize
	reverb.generate().then(() => {
		// Connect player to effects chain
		player.chain(filter, distortion, reverb, Tone.Master);
		
		// Set audio properties
		player.loop = true;
		
		audioInitialized = true;
		console.log("Audio initialized");
	});
}

// Initialize the Three.js scene
function init() {
	// Create scene, camera and renderer
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x000000); // Black background
	
	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.set(8, 8, 12);
	
	renderer = new THREE.WebGLRenderer({ 
		antialias: true,
		alpha: true,
		powerPreference: "high-performance"
	});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
	document.getElementById('three-container').appendChild(renderer.domElement);
	
	// Add OrbitControls for camera rotation
	orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
	orbitControls.enableDamping = true;
	orbitControls.dampingFactor = 0.1;
	orbitControls.enableZoom = true;
	orbitControls.target.set(0, originalCubeSize.height / 2 + 1, 0); // Set orbit target to cube's center
	orbitControls.update();
	
	// Create a cube
	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshPhysicalMaterial({ 
		color: cubeColor,
		metalness: 0.2,
		roughness: 0.7,
		emissive: 0x000000,
		transparent: true,
		opacity: 0.9
	});
	
	cube = new THREE.Mesh(geometry, material);
	// Apply initial scale to make the cube larger
	cube.scale.set(originalCubeSize.width, originalCubeSize.height, originalCubeSize.depth);
	// Position the cube higher above the floor
	cube.position.y = originalCubeSize.height / 2 + 1;
	scene.add(cube);
	
	// Add wireframe overlay for visual interest
	const wireGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
	const wireMaterial = new THREE.MeshBasicMaterial({
		color: 0x333333,
		wireframe: true,
		transparent: true,
		opacity: 0.3
	});
	
	wireframe = new THREE.Mesh(wireGeometry, wireMaterial);
	wireframe.scale.copy(cube.scale);
	wireframe.position.copy(cube.position);
	scene.add(wireframe);
	
	// Create handles for resizing the cube
	createResizeHandles();
	
	// Add lighting effects
	addLighting();
	
	// Add floor and grid
	addEnvironment();
	
	// Add window resize handler
	window.addEventListener('resize', onWindowResize, false);
	
	// Initialize audio
	initAudio();
	
	// Start the animation
	animate();
}

// Add enhanced lighting to the scene
function addLighting() {
	// Ambient light (soft overall illumination)
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
	scene.add(ambientLight);
	
	// Main directional light
	const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
	directionalLight1.position.set(5, 8, 5);
	scene.add(directionalLight1);
	
	// Secondary directional light
	const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
	directionalLight2.position.set(-5, 3, -5);
	scene.add(directionalLight2);
	
	// Point light to create highlights
	const pointLight = new THREE.PointLight(0xffffff, 0.5, 20);
	pointLight.position.set(0, 5, 0);
	scene.add(pointLight);
}

// Add floor and environment elements
function addEnvironment() {
	// Add a circular floor
	const floorGeometry = new THREE.CircleGeometry(12, 32); // Reduced from 20 to 12
	const floorMaterial = new THREE.MeshStandardMaterial({
		color: 0x111111,
		roughness: 0.9,
		metalness: 0.1,
		emissive: 0x000000
	});
	const floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.rotation.x = -Math.PI / 2; // Rotate to horizontal
	floor.position.y = 0; // Floor at y=0
	scene.add(floor);
	
	// Add grid lines
	const gridHelper = new THREE.GridHelper(24, 24, 0x333333, 0x222222); // Reduced from 40 to 24, and grid divisions from 40 to 24
	gridHelper.position.y = 0.01; // Slightly above floor to avoid z-fighting
	scene.add(gridHelper);
}

// Create resizable cube handles
function createResizeHandles() {
	// Create small spheres at the middle of each face (removed corner handles)
	const vertices = [
		// Face centers only
		new THREE.Vector3(0, 0, -0.5), // Front
		new THREE.Vector3(0, 0, 0.5),  // Back
		new THREE.Vector3(-0.5, 0, 0), // Left
		new THREE.Vector3(0.5, 0, 0),  // Right
		new THREE.Vector3(0, -0.5, 0), // Bottom
		new THREE.Vector3(0, 0.5, 0)   // Top
	];
	
	const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16); // Made handles slightly larger
	const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 }); // Gray handles
	
	vertices.forEach((position, index) => {
		const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
		sphere.position.copy(position);
		// Apply the initial scale to handles
		sphere.position.x *= originalCubeSize.width;
		sphere.position.y *= originalCubeSize.height;
		sphere.position.z *= originalCubeSize.depth;
		// Apply the cube position offset to handles
		sphere.position.add(cube.position);
		sphere.userData = { index, isHandle: true, faceDirection: position.clone().normalize() };
		scene.add(sphere);
		draggableCubePoints.push(sphere);
	});
	
	// Setup drag controls
	dragControls = new THREE.DragControls(draggableCubePoints, camera, renderer.domElement);
	
	dragControls.addEventListener('dragstart', function(event) {
		isDragging = true;
		event.object.material.color.set(0xaaaaaa); // Lighter gray when dragging
		// Disable orbit controls while dragging
		orbitControls.enabled = false;
		
		// Make the cube pulse with an emissive color when dragging starts
		if (cube.material) {
			cube.material.emissive = new THREE.Color(0x222222);
		}
	});
	
	dragControls.addEventListener('drag', function(event) {
		const handle = event.object;
		const index = handle.userData.index;
		
		// Determine which dimension to change based on the handle's position
		let newSize = { 
			width: cube.scale.x, 
			height: cube.scale.y, 
			depth: cube.scale.z 
		};
		
		// Calculate handle position relative to cube center
		const relativePos = handle.position.clone().sub(cube.position);
		
		// Handle face centers (single dimension scaling)
		if (index === 0 || index === 1) { // Front/Back handles (Z axis)
			newSize.depth = Math.max(minSize, Math.min(maxSize, Math.abs(relativePos.z * 2)));
			// Constrain handle to z-axis movement
			handle.position.x = cube.position.x;
			handle.position.y = cube.position.y;
			// Keep handle on the surface
			handle.position.z = cube.position.z + (index === 1 ? newSize.depth/2 : -newSize.depth/2);
		} else if (index === 2 || index === 3) { // Left/Right handles (X axis)
			newSize.width = Math.max(minSize, Math.min(maxSize, Math.abs(relativePos.x * 2)));
			// Constrain handle to x-axis movement
			handle.position.y = cube.position.y;
			handle.position.z = cube.position.z;
			// Keep handle on the surface
			handle.position.x = cube.position.x + (index === 3 ? newSize.width/2 : -newSize.width/2);
		} else if (index === 4 || index === 5) { // Bottom/Top handles (Y axis)
			newSize.height = Math.max(minSize, Math.min(maxSize, Math.abs(relativePos.y * 2)));
			// Constrain handle to y-axis movement
			handle.position.x = cube.position.x;
			handle.position.z = cube.position.z;
			// Keep handle on the surface
			handle.position.y = cube.position.y + (index === 5 ? newSize.height/2 : -newSize.height/2);
		}
		
		// Update cube dimensions
		cube.scale.set(newSize.width, newSize.height, newSize.depth);
		// Update wireframe dimensions
		wireframe.scale.copy(cube.scale);
		
		// Make sure the bottom of the cube stays above the floor
		const bottomY = cube.position.y - (newSize.height / 2);
		if (bottomY < 0.1) {
			const offset = 0.1 - bottomY;
			cube.position.y += offset;
			wireframe.position.y += offset;
			// Update all handle positions as well
			updateHandlePositions();
		}
		
		// Update the cube appearance based on size
		updateCubeAppearance(newSize);
		
		// Map cube dimensions to audio effects
		updateAudioEffects(newSize);
	});
	
	dragControls.addEventListener('dragend', function(event) {
		isDragging = false;
		event.object.material.color.set(0x666666); // Back to original handle color
		// Re-enable orbit controls after dragging
		orbitControls.enabled = true;
		
		// Reset emissive color
		if (cube.material) {
			cube.material.emissive = new THREE.Color(0x000000);
		}
	});
}

// Update the cube's appearance based on its dimensions
function updateCubeAppearance(size) {
	if (!cube || !cube.material) return;
	
	// Calculate monochrome shade based on the average size
	const avg = (size.width + size.height + size.depth) / 3;
	const brightness = THREE.MathUtils.mapLinear(avg, minSize, maxSize, 0.3, 1.0);
	
	// Update the cube's color (monochrome white-to-gray scale)
	const grayValue = Math.floor(brightness * 255);
	cube.material.color.setRGB(grayValue/255, grayValue/255, grayValue/255);
	
	// Update opacity - larger cube is more solid
	cube.material.opacity = THREE.MathUtils.mapLinear(avg, minSize, maxSize, 0.7, 0.95);
}

// Update audio effects based on cube dimensions
function updateAudioEffects(size) {
	if (!audioInitialized) return;
	
	// Map width to filter frequency (wider = higher frequency)
	const frequency = THREE.MathUtils.mapLinear(size.width, minSize, maxSize, 200, 5000);
	filter.frequency.value = frequency;
	
	// Map height to distortion amount (taller = more distortion)
	const distortionAmount = THREE.MathUtils.mapLinear(size.height, minSize, maxSize, 0, 0.8);
	distortion.distortion = distortionAmount;
	
	// Map depth to playback rate (deeper = slower rate)
	const baseRate = isReversed ? -1 : 1;
	const playbackRate = baseRate * THREE.MathUtils.mapLinear(size.depth, minSize, maxSize, 0.5, 1.5);
	player.playbackRate = playbackRate;
}

// Animate the scene
function animate() {
	requestAnimationFrame(animate);
	
	if (!isDragging) {
		// Reduced rotation speed for slower revolution
		cube.rotation.y += 0.0003;
		cube.rotation.x += 0.0001;
		
		// Sync wireframe rotation with the cube
		wireframe.rotation.copy(cube.rotation);
		
		// Update handle positions to follow the cube
		updateHandlePositions();
	}
	
	// Update orbit controls
	orbitControls.update();
	
	renderer.render(scene, camera);
}

// Update handle positions when the cube rotates
function updateHandlePositions() {
	// Skip if dragging to avoid conflicts
	if (isDragging) return;
	
	const positions = [
		// Face centers only (to match the handles we created)
		new THREE.Vector3(0, 0, -0.5), // Front
		new THREE.Vector3(0, 0, 0.5),  // Back
		new THREE.Vector3(-0.5, 0, 0), // Left
		new THREE.Vector3(0.5, 0, 0),  // Right
		new THREE.Vector3(0, -0.5, 0), // Bottom
		new THREE.Vector3(0, 0.5, 0)   // Top
	];
	
	// Calculate rotated positions while keeping handles on the cube surfaces
	draggableCubePoints.forEach((handle, index) => {
		if (index < positions.length) {
			// Get non-rotated position
			const basePosition = positions[index].clone();
			
			// Create a vector pointing from the center to the face
			const direction = basePosition.clone().normalize();
			
			// Apply cube rotation to the direction
			const rotatedDirection = direction.clone().applyEuler(cube.rotation);
			
			// Scale based on the current cube dimensions
			const halfSize = new THREE.Vector3(
				cube.scale.x / 2,
				cube.scale.y / 2,
				cube.scale.z / 2
			);
			
			// Determine the face dimension based on the largest component of the direction
			let distance;
			const absDir = rotatedDirection.clone().set(
				Math.abs(rotatedDirection.x),
				Math.abs(rotatedDirection.y),
				Math.abs(rotatedDirection.z)
			);
			
			if (absDir.x > absDir.y && absDir.x > absDir.z) {
				// X-axis face
				distance = halfSize.x;
			} else if (absDir.y > absDir.x && absDir.y > absDir.z) {
				// Y-axis face
				distance = halfSize.y;
			} else {
				// Z-axis face
				distance = halfSize.z;
			}
			
			// Position the handle on the face
			const finalPosition = rotatedDirection.multiplyScalar(distance).add(cube.position);
			
			// Update handle position
			handle.position.copy(finalPosition);
		}
	});
}

// Toggle audio playback
async function togglePlayback() {
	// Start audio context if needed
	if (Tone.context.state !== 'running') {
		await Tone.start();
	}
	
	// Toggle play/pause state and button icon
	if (!audioInitialized) {
		await initAudio();
	}
	
	if (player.state === 'started') {
		player.stop();
		playButton.html("<i class='fas fa-play'></i>");
	} else {
		player.start();
		playButton.html("<i class='fas fa-pause'></i>");
	}
}

// Toggle reverse audio
function toggleReverse() {
	isReversed = !isReversed;
	
	// Update visual state of button
	if (isReversed) {
		reverseButton.addClass('active');
	} else {
		reverseButton.removeClass('active');
	}
	
	// Update the playback rate to reverse audio
	if (audioInitialized) {
		const currentRate = Math.abs(player.playbackRate);
		player.playbackRate = isReversed ? -currentRate : currentRate;
	}
}

// Handle window resize
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

// Empty draw function as we're using Three.js for rendering
function draw() {}