
/* Setting up the constraint */
var facingMode = "environment"; // Can be 'user' or 'environment' to access back or front camera (NEAT!)
var constraints = {
    audio: false,
    video: {
        facingMode: facingMode
    }
};

// Pose detection variables
let detector = null;
let lastPoseTime = 0;
const POSE_DETECTION_INTERVAL = 100; // Run pose detection every 100ms

// Global poses array for debugging - moved to window object for easier access
window.poses = [];

// Shake detection variables
let lastShakeTime = 0;
const shakeThreshold = 15;

// Global animals array for debugging and tweaking
let animals = [];

// Pose visualization variables
let showPoses = false;
let poseCanvas = null;
let poseCtx = null;


function startVideoStream() {
    navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
        const video = document.getElementById('video');
        video.srcObject = stream;
        // Initialize pose detection after video stream is ready
        video.addEventListener('loadeddata', () => {
            initializePoseDetection();
        });
    });
}

async function initializePoseDetection() {
    try {
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            minPoseScore: 0.25
        };
        
        detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            detectorConfig
        );
        
        console.log('Pose detector initialized');
    } catch (error) {
        console.error('Failed to initialize pose detection:', error);
    }
}
function requestMotionPermission() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('devicemotion', handleDeviceMotion);
                    window.addEventListener('deviceorientation', handleDeviceOrientation);
                }
            })
            .catch(console.error);
    } else {
        // Handle regular non-iOS 13+ devices
        window.addEventListener('devicemotion', handleDeviceMotion);
        window.addEventListener('deviceorientation', handleDeviceOrientation);
    }
}

function handleDeviceMotion(event) {
    const acceleration = event.accelerationIncludingGravity;
    const currentTime = new Date().getTime();

    if (currentTime - lastShakeTime > 1000) { // 1 second cooldown between shakes
        const shakeMagnitude = Math.sqrt(acceleration.x * acceleration.x + acceleration.y * acceleration.y + acceleration.z * acceleration.z);

        if (shakeMagnitude > shakeThreshold) {
            lastShakeTime = currentTime;
            resetAnimalPositions();
        }
    }
}

function handleDeviceOrientation(event) {
    tiltX = event.gamma; // left/right tilt in degrees
    tiltY = event.beta; // front/back tilt in degrees
}

// Skeleton connections for MoveNet
const SKELETON_CONNECTIONS = [
    ['nose', 'left_eye'],
    ['nose', 'right_eye'],
    ['left_eye', 'left_ear'],
    ['right_eye', 'right_ear'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'],
    ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'],
    ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'],
    ['right_knee', 'right_ankle']
];

function drawKeypoint(ctx, keypoint) {
    if (keypoint.score < 0.3) return;
    
    ctx.beginPath();
    ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = keypoint.score > 0.5 ? '#00ff00' : '#ffff00';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawSkeleton(ctx, keypoints) {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    SKELETON_CONNECTIONS.forEach(([start, end]) => {
        const startPoint = keypoints.find(kp => kp.name === start);
        const endPoint = keypoints.find(kp => kp.name === end);
        
        if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();
        }
    });
}

function drawPoses() {
    if (!showPoses || !poseCanvas || !poseCtx || !window.poses) return;
    
    // Clear canvas
    poseCtx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
    
    // Draw each pose
    window.poses.forEach(pose => {
        if (pose.score < 0.3) return;
        
        // Draw skeleton connections first
        drawSkeleton(poseCtx, pose.keypoints);
        
        // Draw keypoints on top
        pose.keypoints.forEach(keypoint => {
            drawKeypoint(poseCtx, keypoint);
        });
        
        // Draw pose score
        poseCtx.fillStyle = '#00ff00';
        poseCtx.font = '16px Arial';
        poseCtx.fillText(`Score: ${pose.score.toFixed(2)}`, 10, 30);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const video = document.getElementById('video');
    const toggleCameraButton = document.getElementById('toggleCameraButton');
    const togglePoseButton = document.getElementById('togglePoseButton');
    
    // Initialize pose canvas
    poseCanvas = document.getElementById('poseCanvas');
    poseCtx = poseCanvas.getContext('2d');
    
    // Set canvas size to match video
    video.addEventListener('loadedmetadata', () => {
        poseCanvas.width = video.videoWidth;
        poseCanvas.height = video.videoHeight;
        // Adjust canvas position and size when video loads
        const resizeCanvas = () => {
            poseCanvas.style.width = video.offsetWidth + 'px';
            poseCanvas.style.height = video.offsetHeight + 'px';
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    });
    
    // Toggle pose visualization
    togglePoseButton.addEventListener('click', function() {
        showPoses = !showPoses;
        this.textContent = showPoses ? 'Hide Poses' : 'Show Poses';
        this.style.backgroundColor = showPoses ? '#90EE90' : '#fff';
        if (!showPoses) {
            poseCtx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
        }
    });
    
    // Initialize global animals array
    animals = [
        {
            id: 'big_brouk',
            element: null,
            x: 150, y: 100,
            direction: Math.random() * 2 * Math.PI,
            size: 55, growing: true,
            directionChanges: 0,
            speed: 0.1,
            randomness: 0.3,
            size_change: 1.2,
            rotateEvery: 3,
            reactionSpeed: 0.1,
            movementPattern: { type: 'oscillation', amplitude: 1, frequency: 0.05 }, // Oscillation pattern
            trackingBehavior: { type: 'nose', offset: { x: 0, y: -200 } } // Track nose with offset
        },
        {
            id: 'brouk_medium',
            element: null,
            x: 300, y: 200,
            direction: Math.random() * 2 * Math.PI,
            size: 50,
            growing: true,
            directionChanges: 0,
            speed: 0.2,
            randomness: 0.2,
            size_change: 0.5,
            rotateEvery: 5,
            reactionSpeed: 0.5,
            // movementPattern: { type: 'jitter', intensity: 0.001 } // Jitter pattern
            movementPattern: { type: 'jump', jumpDistance: 5, jumpInterval: 1 } // Jumping pattern
        },
        {
            id: 'small_brouk',
            element: null,
            x: 300, y: 200,
            direction: Math.random() * 2 * Math.PI,
            size: 45,
            growing: true,
            directionChanges: 0,
            speed: 0.3,
            randomness: 0.2,
            size_change: 0.9,
            rotateEvery: 7,
            reactionSpeed: 0.5,
            movementPattern: { type: 'loop', radius: 1, speed: 0.1 }, // Fixed: Loop pattern with correct parameters
            trackingBehavior: { type: 'raised_palm', offset: { x: 0, y: 0 } } // Track raised palm
        },
        // {
        //     id: 'blecha',
        //     element: null,
        //     x: 300, y: 200,
        //     direction: Math.random() * 2 * Math.PI,
        //     size: 50,
        //     growing: true,
        //     directionChanges: 0,
        //     speed: 0.4,
        //     randomness: 0.4,
        //     size_change: 0.2,
        //     rotateEvery: 5,
        //     reactionSpeed: 0.03,
        //     movementPattern: { type: 'loop', radius: 5, speed: 0.5 } // Looping pattern
        // }
    ];

    animals.forEach(animal => {
        animal.element = document.getElementById(animal.id);
        animal.element.style.left = animal.x + 'px';
        animal.element.style.top = animal.y + 'px';
    });
    toggleCameraButton.addEventListener('click', function () {
        facingMode = facingMode === "user" ? "environment" : "user";
        constraints.video.facingMode = facingMode;
        startVideoStream();
    });
    startVideoStream();
    requestMotionPermission();
    let tiltX = 0;
    let tiltY = 0;

    function updateDirection(animal) {
        animal.direction += (Math.random() - 0.5) * animal.randomness;
        animal.direction += animal.reactionSpeed * (tiltX / 90); // adjust direction based on tilt
    }

    function updatePositionOld(animal) {
        animal.x += animal.speed * Math.cos(animal.direction);
        animal.y += animal.speed * Math.sin(animal.direction);

        if (animal.x <= video.offsetLeft || animal.x >= video.offsetLeft + video.offsetWidth - animal.element.offsetWidth ||
            animal.y <= video.offsetTop || animal.y >= video.offsetTop + video.offsetHeight - animal.element.offsetHeight) {
            animal.direction = Math.random() * 2 * Math.PI;
            animal.growing = !animal.growing;
            animal.directionChanges++;
        }

        animal.x = Math.max(video.offsetLeft, Math.min(animal.x, video.offsetLeft + video.offsetWidth - animal.element.offsetWidth));
        animal.y = Math.max(video.offsetTop, Math.min(animal.y, video.offsetTop + video.offsetHeight - animal.element.offsetHeight));

        animal.element.style.left = animal.x + 'px';
        animal.element.style.top = animal.y + 'px';
    }
    function updatePosition(animal) {
        // Base movement (from updatePositionOld)
        animal.x += animal.speed * Math.cos(animal.direction);
        animal.y += animal.speed * Math.sin(animal.direction);

        if (animal.x <= video.offsetLeft || animal.x >= video.offsetLeft + video.offsetWidth - animal.element.offsetWidth ||
            animal.y <= video.offsetTop || animal.y >= video.offsetTop + video.offsetHeight - animal.element.offsetHeight) {
            animal.direction = Math.random() * 2 * Math.PI;
            animal.growing = !animal.growing;
            animal.directionChanges++;
        }

        // Apply movement pattern (but not when escaping from a person)
        const pattern = animal.movementPattern;
        if (pattern && !animal.escaping) {
            const time = performance.now() / 1000; // Time in seconds

            if (pattern.type === 'oscillation') {
                // Oscillate along the direction of movement
                const freq = pattern.frequency || 0.05;
                const amp = pattern.amplitude || 1;
                animal.x += Math.sin(time * freq) * amp;
                animal.y += Math.cos(time * freq) * amp;
            } else if (pattern.type === 'jitter') {
                // Random jitter around the current position
                animal.x += (Math.random() - 0.05) * pattern.intensity;
                animal.y += (Math.random() - 0.05) * pattern.intensity;
            } else if (pattern.type === 'loop') {
                // Circular looping movement
                animal.x += Math.cos(time * pattern.speed) * pattern.radius;
                animal.y += Math.sin(time * pattern.speed) * pattern.radius;
            } else if (pattern.type === 'jump') {
                // Jumping movement
                if (!animal.lastJumpTime || time - animal.lastJumpTime > pattern.jumpInterval) {
                    animal.lastJumpTime = time; // Update the last jump time
                    const jumpAngle = Math.random() * 2 * Math.PI; // Random jump direction
                    animal.x += Math.cos(jumpAngle) * pattern.jumpDistance;
                    animal.y += Math.sin(jumpAngle) * pattern.jumpDistance;
                }
            }
        }

        // Check for NaN and reset if needed
        if (isNaN(animal.x) || isNaN(animal.y)) {
            console.warn(`NaN detected for ${animal.id}, resetting position`);
            animal.x = video.offsetLeft + Math.random() * (video.offsetWidth - animal.element.offsetWidth);
            animal.y = video.offsetTop + Math.random() * (video.offsetHeight - animal.element.offsetHeight);
        }
        
        // Keep the animal within bounds
        animal.x = Math.max(video.offsetLeft, Math.min(animal.x, video.offsetLeft + video.offsetWidth - animal.element.offsetWidth));
        animal.y = Math.max(video.offsetTop, Math.min(animal.y, video.offsetTop + video.offsetHeight - animal.element.offsetHeight));

        // Update the animal's position
        animal.element.style.left = animal.x + 'px';
        animal.element.style.top = animal.y + 'px';
    }
    function updateSize(animal) {
        const centerX = video.offsetLeft + video.offsetWidth / 2;
        const centerY = video.offsetTop + video.offsetHeight / 2;

        // Calculate the distance from the center of the video
        const distanceFromCenter = Math.sqrt(
            Math.pow(animal.x + animal.element.offsetWidth / 2 - centerX, 2) +
            Math.pow(animal.y + animal.element.offsetHeight / 2 - centerY, 2)
        );

        // Calculate the maximum possible distance (diagonal of the video)
        const maxDistance = Math.sqrt(
            Math.pow(video.offsetWidth / 2, 2) + Math.pow(video.offsetHeight / 2, 2)
        );

        // Scale the size based on the distance (closer to center = larger size)
        const sizeFactor = 1 - distanceFromCenter / maxDistance; // Scale between 0 and 1
        const newSize = 50 + sizeFactor * (80 * animal.size_change); // Base size is 50px, scaled by size_change

        animal.size = newSize;
        animal.element.style.width = animal.size + 'px';
        animal.element.style.height = animal.size + 'px';
    }

    function rotateAnimal(animal) {
        if (animal.directionChanges % animal.rotateEvery === 0) {
            animal.element.style.transform = `rotate(${animal.direction * (180 / Math.PI)}deg)`;
        }
    }
    function checkEdgeAndTeleport(animal) {
        const videoLeft = video.offsetLeft;
        const videoRight = video.offsetLeft + video.offsetWidth;
        const videoTop = video.offsetTop;
        const videoBottom = video.offsetTop + video.offsetHeight;

        // Check if the animal is near the edges
        if (animal.x <= videoLeft || animal.x >= videoRight - animal.element.offsetWidth ||
            animal.y <= videoTop || animal.y >= videoBottom - animal.element.offsetHeight) {

            // Randomly decide if the animal should disappear
            const shouldDisappear = Math.random() < 0.2; // 20% chance to disappear

            if (shouldDisappear) {
                // Temporarily hide the animal
                animal.element.style.display = 'none';

                // Teleport the animal to the opposite side
                if (animal.x <= videoLeft) {
                    animal.x = videoRight - animal.element.offsetWidth;
                } else if (animal.x >= videoRight - animal.element.offsetWidth) {
                    animal.x = videoLeft;
                }

                if (animal.y <= videoTop) {
                    animal.y = videoBottom - animal.element.offsetHeight;
                } else if (animal.y >= videoBottom - animal.element.offsetHeight) {
                    animal.y = videoTop;
                }

                // Update the position and make the animal visible again after a longer delay
                setTimeout(() => {
                    animal.element.style.left = animal.x + 'px';
                    animal.element.style.top = animal.y + 'px';
                    animal.element.style.display = 'block';
                }, 10000);
            } else {
                // Teleport without disappearing
                if (animal.x <= videoLeft) {
                    animal.x = videoRight - animal.element.offsetWidth;
                } else if (animal.x >= videoRight - animal.element.offsetWidth) {
                    animal.x = videoLeft;
                }

                if (animal.y <= videoTop) {
                    animal.y = videoBottom - animal.element.offsetHeight;
                } else if (animal.y >= videoBottom - animal.element.offsetHeight) {
                    animal.y = videoTop;
                }

                // Update the position immediately
                animal.element.style.left = animal.x + 'px';
                animal.element.style.top = animal.y + 'px';
            }
        }
    }
    function avoidCollision() {
        for (let i = 0; i < animals.length; i++) {
            // Skip collision detection for animals that are actively tracking
            if (animals[i].isCurrentlyTracking) continue;
            
            for (let j = i + 1; j < animals.length; j++) {
                // Skip if the other animal is tracking
                if (animals[j].isCurrentlyTracking) continue;
                
                const dx = animals[i].x - animals[j].x;
                const dy = animals[i].y - animals[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Use average size for collision detection
                const avgSize = (animals[i].size + animals[j].size) / 2;
                const minDistance = avgSize * 0.8; // Slightly smaller to prevent entanglement

                if (distance < minDistance && distance > 0) { // Collision detected
                    // Calculate separation force
                    const overlap = minDistance - distance;
                    const separationForce = Math.min(overlap * 0.3, 3); // Limit the force
                    
                    const angle = Math.atan2(dy, dx);
                    
                    // Apply separation with damping to prevent jittering
                    animals[i].x += Math.cos(angle) * separationForce;
                    animals[i].y += Math.sin(angle) * separationForce;
                    animals[j].x -= Math.cos(angle) * separationForce;
                    animals[j].y -= Math.sin(angle) * separationForce;
                    
                    // Smoothly adjust directions instead of random changes
                    const directionChange = 0.5; // Radians
                    animals[i].direction = angle + directionChange;
                    animals[j].direction = angle + Math.PI - directionChange;
                }
            }
        }
    }
    function resetAnimalPositions() {
        const corners = [
            { x: 0, y: 0 },
            { x: video.offsetWidth - 50, y: 0 },
            { x: 0, y: video.offsetHeight - 50 },
            { x: video.offsetWidth - 50, y: video.offsetHeight - 50 }
        ];

        animals.forEach((animal, index) => {
            const corner = corners[index % corners.length];
            animal.x = video.offsetLeft + corner.x;
            animal.y = video.offsetTop + corner.y;
            animal.element.style.left = animal.x + 'px';
            animal.element.style.top = animal.y + 'px';
            animal.direction = Math.random() * 2 * Math.PI;
        });
    }

    window.addEventListener('devicemotion', function (event) {
        const acceleration = event.accelerationIncludingGravity;
        const currentTime = new Date().getTime();

        if (currentTime - lastShakeTime > 1000) { // 1 second cooldown between shakes
            const shakeMagnitude = Math.sqrt(acceleration.x * acceleration.x + acceleration.y * acceleration.y + acceleration.z * acceleration.z);

            if (shakeMagnitude > shakeThreshold) {
                lastShakeTime = currentTime;
                resetAnimalPositions();
            }
        }
    });

    async function detectPoses() {
        if (!detector) return;
        
        const currentTime = performance.now();
        if (currentTime - lastPoseTime < POSE_DETECTION_INTERVAL) return;
        
        lastPoseTime = currentTime;
        
        try {
            const video = document.getElementById('video');
            window.poses = await detector.estimatePoses(video);
            // console.log('Detected poses:', window.poses);
        } catch (error) {
            console.error('Pose detection error:', error);
        }
    }

    function avoidPeople(animal) {
        if (!window.poses || window.poses.length === 0) return;
        
        // Check if animal has tracking behavior
        if (animal.trackingBehavior && window.poses.length > 0) {
            const pose = window.poses[0]; // Use the first detected pose
            
            if (animal.trackingBehavior.type === 'nose') {
                const noseKeypoint = pose.keypoints.find(kp => kp.name === 'nose');
                
                if (noseKeypoint && noseKeypoint.score > 0.3) {
                    // Convert keypoint coordinates to video element coordinates
                    const scaleX = video.offsetWidth / video.videoWidth;
                    const scaleY = video.offsetHeight / video.videoHeight;
                    
                    // Target position with offset, scaled to match video display size
                    const targetX = (noseKeypoint.x * scaleX) + video.offsetLeft - animal.element.offsetWidth / 2 + animal.trackingBehavior.offset.x;
                    const targetY = (noseKeypoint.y * scaleY) + video.offsetTop + animal.trackingBehavior.offset.y;
                    
                    // Smoothly move towards the target position
                    const moveSpeed = 0.15; // How quickly to follow (0-1)
                    animal.x += (targetX - animal.x) * moveSpeed;
                    animal.y += (targetY - animal.y) * moveSpeed;
                    
                    // Update DOM position
                    animal.element.style.left = animal.x + 'px';
                    animal.element.style.top = animal.y + 'px';
                    
                    // Override normal movement for this animal
                    return;
                }
            } else if (animal.trackingBehavior.type === 'raised_palm') {
                // Check if palm is raised (wrist above elbow)
                const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
                const leftElbow = pose.keypoints.find(kp => kp.name === 'left_elbow');
                const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');
                const rightElbow = pose.keypoints.find(kp => kp.name === 'right_elbow');
                
                let targetWrist = null;
                
                // Check left hand
                if (leftWrist && leftElbow && leftWrist.score > 0.3 && leftElbow.score > 0.3) {
                    if (leftWrist.y <= leftElbow.y) { // Wrist is at or above elbow
                        targetWrist = leftWrist;
                    }
                }
                
                // Check right hand (prefer if both are raised)
                if (rightWrist && rightElbow && rightWrist.score > 0.3 && rightElbow.score > 0.3) {
                    if (rightWrist.y <= rightElbow.y) { // Wrist is at or above elbow
                        targetWrist = rightWrist;
                    }
                }
                
                if (targetWrist) {
                    // Convert keypoint coordinates to video element coordinates
                    const scaleX = video.offsetWidth / video.videoWidth;
                    const scaleY = video.offsetHeight / video.videoHeight;
                    
                    // Target position at the palm/wrist with offset, scaled to match video display size
                    const targetX = (targetWrist.x * scaleX) + video.offsetLeft - animal.element.offsetWidth / 2 + animal.trackingBehavior.offset.x;
                    const targetY = (targetWrist.y * scaleY) + video.offsetTop - animal.element.offsetHeight / 2 + animal.trackingBehavior.offset.y;
                    
                    // Smoothly move towards the target position
                    const moveSpeed = 0.2; // Slightly faster for hand tracking
                    animal.x += (targetX - animal.x) * moveSpeed;
                    animal.y += (targetY - animal.y) * moveSpeed;
                    
                    // Update DOM position
                    animal.element.style.left = animal.x + 'px';
                    animal.element.style.top = animal.y + 'px';
                    
                    // Override normal movement for this animal
                    return;
                }
            }
        }
        
        const avoidanceMargin = 50; // Pixels to add around the bounding box
        const repulsionStrength = 8; // How strongly to push away
        
        window.poses.forEach(pose => {
            if (pose.score < 0.3) return; // Skip low confidence poses
            
            // Calculate bounding box around all keypoints
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            let validPoints = 0;
            
            // Get video scaling factors
            const scaleX = video.offsetWidth / video.videoWidth;
            const scaleY = video.offsetHeight / video.videoHeight;
            
            // Find the bounds of all keypoints
            pose.keypoints.forEach(keypoint => {
                if (keypoint.score > 0.2) { // Lower threshold to include more points
                    const scaledX = keypoint.x * scaleX + video.offsetLeft;
                    const scaledY = keypoint.y * scaleY + video.offsetTop;
                    minX = Math.min(minX, scaledX);
                    minY = Math.min(minY, scaledY);
                    maxX = Math.max(maxX, scaledX);
                    maxY = Math.max(maxY, scaledY);
                    validPoints++;
                }
            });
            
            if (validPoints > 0) {
                // Expand the bounding box by the avoidance margin
                minX -= avoidanceMargin;
                minY -= avoidanceMargin;
                maxX += avoidanceMargin;
                maxY += avoidanceMargin;
                
                // Get animal center position
                const animalCenterX = animal.x + animal.element.offsetWidth / 2;
                const animalCenterY = animal.y + animal.element.offsetHeight / 2;
                
                // Check if animal is inside or near the bounding box
                if (animalCenterX >= minX && animalCenterX <= maxX && 
                    animalCenterY >= minY && animalCenterY <= maxY) {
                    
                    // Calculate the center of the bounding box
                    const boxCenterX = (minX + maxX) / 2;
                    const boxCenterY = (minY + maxY) / 2;
                    
                    // Calculate repulsion direction from box center
                    const dx = animalCenterX - boxCenterX;
                    const dy = animalCenterY - boxCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Prevent division by zero and handle center position
                    if (distance < 1) {
                        // If animal is at center, push in a random direction
                        const randomAngle = Math.random() * 2 * Math.PI;
                        animal.x += Math.cos(randomAngle) * repulsionStrength;
                        animal.y += Math.sin(randomAngle) * repulsionStrength;
                        animal.direction = randomAngle;
                    } else {
                        const angle = Math.atan2(dy, dx);
                        
                        // Calculate distance to nearest edge of the box
                        const distToLeft = animalCenterX - minX;
                        const distToRight = maxX - animalCenterX;
                        const distToTop = animalCenterY - minY;
                        const distToBottom = maxY - animalCenterY;
                        const minEdgeDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
                        
                        // Use a minimum push force to ensure movement
                        const pushForce = Math.max(repulsionStrength * 0.5, repulsionStrength * (1 - minEdgeDist / avoidanceMargin));
                        
                        // Apply repulsion force
                        animal.x += Math.cos(angle) * pushForce;
                        animal.y += Math.sin(angle) * pushForce;
                        
                        // Set direction consistently away from center
                        animal.direction = angle;
                        
                        // Temporarily increase speed to escape
                        animal.escaping = true;
                        animal.originalSpeed = animal.originalSpeed || animal.speed;
                        animal.speed = animal.originalSpeed * 2;
                    }
                } else if (animal.escaping) {
                    // Reset speed when outside bounding box
                    animal.speed = animal.originalSpeed || animal.speed;
                    animal.escaping = false;
                }
            }
        });
    }

    function animateAnimals() {
        detectPoses(); // Run pose detection
        
        animals.forEach(animal => {
            // Check if animal is actively tracking something
            let isTracking = false;
            
            if (animal.trackingBehavior && window.poses.length > 0) {
                const pose = window.poses[0];
                
                if (animal.trackingBehavior.type === 'nose') {
                    const noseKeypoint = pose.keypoints.find(kp => kp.name === 'nose');
                    isTracking = noseKeypoint && noseKeypoint.score > 0.3;
                } else if (animal.trackingBehavior.type === 'raised_palm') {
                    // Check both hands for raised palm
                    const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
                    const leftElbow = pose.keypoints.find(kp => kp.name === 'left_elbow');
                    const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');
                    const rightElbow = pose.keypoints.find(kp => kp.name === 'right_elbow');
                    
                    const leftRaised = leftWrist && leftElbow && leftWrist.score > 0.3 && 
                                      leftElbow.score > 0.3 && leftWrist.y <= leftElbow.y;
                    const rightRaised = rightWrist && rightElbow && rightWrist.score > 0.3 && 
                                       rightElbow.score > 0.3 && rightWrist.y <= rightElbow.y;
                    
                    isTracking = leftRaised || rightRaised;
                }
            }
            
            // Store tracking state for collision avoidance
            animal.isCurrentlyTracking = isTracking;
            
            if (!isTracking) {
                updateDirection(animal);
            }
            
            avoidPeople(animal); // Make animals avoid detected people or track specific body parts
            
            if (!isTracking) {
                updatePosition(animal);
            }
            
            updateSize(animal);
            rotateAnimal(animal);
            
            if (!isTracking) {
                checkEdgeAndTeleport(animal); // Check and teleport if near the edge
            }
        });

        avoidCollision();
        
        // Draw poses if enabled
        drawPoses();

        // if (Math.random() < 0.01) {
        //     const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
        //     randomAnimal.element.style.display = randomAnimal.element.style.display === 'none' ? 'block' : 'none';
        // }

        requestAnimationFrame(animateAnimals);
    }

    animateAnimals();
});