
/* Setting up the constraint */
var facingMode = "environment"; // Can be 'user' or 'environment' to access back or front camera (NEAT!)
var constraints = {
    audio: false,
    video: {
        facingMode: facingMode
    }
};


function startVideoStream() {
    navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
        const video = document.getElementById('video');
        video.srcObject = stream;
    });
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

document.addEventListener('DOMContentLoaded', function () {
    const video = document.getElementById('video');
    const toggleCameraButton = document.getElementById('toggleCameraButton');
    const animals = [
        { id: 'beetle', element: null, x: 150, y: 100, direction: Math.random() * 2 * Math.PI, size: 50, growing: true, directionChanges: 0, speed: 1, randomness: 0.3, size_change: 0.3, rotateEvery: 3, reactionSpeed: 0.05 },
        { id: 'lachticek', element: null, x: 300, y: 200, direction: Math.random() * 2 * Math.PI, size: 50, growing: true, directionChanges: 0, speed: 1.5, randomness: 0.4, size_change: 0.2, rotateEvery: 5, reactionSpeed: 0.03 },
        { id: 'kudlanka', element: null, x: 300, y: 200, direction: Math.random() * 2 * Math.PI, size: 50, growing: true, directionChanges: 0, speed: 1.5, randomness: 0.4, size_change: 0.2, rotateEvery: 5, reactionSpeed: 0.03 },
        { id: 'blecha', element: null, x: 300, y: 200, direction: Math.random() * 2 * Math.PI, size: 50, growing: true, directionChanges: 0, speed: 1.5, randomness: 0.4, size_change: 0.2, rotateEvery: 5, reactionSpeed: 0.03 }
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

    function updatePosition(animal) {
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
        const newSize = 50 + sizeFactor * 50; // Base size is 50px, max size is 100px

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

            // Update the position and make the animal visible again after a short delay
            setTimeout(() => {
                animal.element.style.left = animal.x + 'px';
                animal.element.style.top = animal.y + 'px';
                animal.element.style.display = 'block';
            }, 800); // 200ms delay
        }
    }
    function avoidCollision() {
        for (let i = 0; i < animals.length; i++) {
            for (let j = i + 1; j < animals.length; j++) {
                const dx = animals[i].x - animals[j].x;
                const dy = animals[i].y - animals[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < animals[i].element.offsetWidth) { // Collision detected
                    // Adjust positions to push animals apart
                    const overlap = animals[i].element.offsetWidth - distance;
                    const pushFactor = overlap / 2;

                    const angle = Math.atan2(dy, dx);
                    animals[i].x += Math.cos(angle) * pushFactor;
                    animals[i].y += Math.sin(angle) * pushFactor;
                    animals[j].x -= Math.cos(angle) * pushFactor;
                    animals[j].y -= Math.sin(angle) * pushFactor;

                    // Update their positions
                    animals[i].element.style.left = animals[i].x + 'px';
                    animals[i].element.style.top = animals[i].y + 'px';
                    animals[j].element.style.left = animals[j].x + 'px';
                    animals[j].element.style.top = animals[j].y + 'px';

                    // Change their directions randomly to avoid getting stuck
                    animals[i].direction = Math.random() * 2 * Math.PI;
                    animals[j].direction = Math.random() * 2 * Math.PI;
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

    let lastShakeTime = 0;
    const shakeThreshold = 15; // Adjust this value as needed

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

    function animateAnimals() {
        animals.forEach(animal => {
            updateDirection(animal);
            updatePosition(animal);
            updateSize(animal);
            rotateAnimal(animal);
            checkEdgeAndTeleport(animal); // Check and teleport if near the edge
        });

        avoidCollision();

        // if (Math.random() < 0.01) {
        //     const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
        //     randomAnimal.element.style.display = randomAnimal.element.style.display === 'none' ? 'block' : 'none';
        // }

        requestAnimationFrame(animateAnimals);
    }

    animateAnimals();
});