
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
        { id: 'lachticek', element: null, x: 300, y: 200, direction: Math.random() * 2 * Math.PI, size: 50, growing: true, directionChanges: 0, speed: 1.5, randomness: 0.4, size_change: 0.2, rotateEvery: 5, reactionSpeed: 0.03 }
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
        if (Math.abs(Math.cos(animal.direction)) > 0.7) {
            if (animal.growing) {
                animal.size += animal.size_change;
                if (animal.size >= 100) animal.growing = false;
            } else {
                animal.size -= animal.size_change;
                if (animal.size <= 50) animal.growing = true;
            }

            animal.element.style.width = animal.size + 'px';
            animal.element.style.height = animal.size + 'px';
        }
    }

    function rotateAnimal(animal) {
        if (animal.directionChanges % animal.rotateEvery === 0) {
            animal.element.style.transform = `rotate(${animal.direction * (180 / Math.PI)}deg)`;
        }
    }

    function avoidCollision() {
        for (let i = 0; i < animals.length; i++) {
            for (let j = i + 1; j < animals.length; j++) {
                if (Math.abs(animals[i].x - animals[j].x) < animals[i].element.offsetWidth &&
                    Math.abs(animals[i].y - animals[j].y) < animals[i].element.offsetHeight) {
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