
/* Setting up the constraint */
var facingMode = "environment"; // Can be 'user' or 'environment' to access back or front camera (NEAT!)
var constraints = {
    audio: false,
    video: {
        facingMode: facingMode
    }
};

navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
    video.srcObject = stream;
});

document.addEventListener('DOMContentLoaded', function () {
    const video = document.getElementById('video');
    const animals = [
        { id: 'beetle', element: null, x: 150, y: 100, direction: Math.random() * 2 * Math.PI, size: 50, growing: true, directionChanges: 0, speed: 1, randomness: 0.3, size_change: 0.3, rotateEvery: 3 },
        { id: 'lachticek', element: null, x: 300, y: 200, direction: Math.random() * 2 * Math.PI, size: 50, growing: true, directionChanges: 0, speed: 1.5, randomness: 0.4, size_change: 0.2, rotateEvery: 3 }
    ];

    animals.forEach(animal => {
        animal.element = document.getElementById(animal.id);
        animal.element.style.left = animal.x + 'px';
        animal.element.style.top = animal.y + 'px';
    });

    function updateDirection(animal) {
        animal.direction += (Math.random() - 0.5) * animal.randomness;
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

    function animateAnimals() {
        animals.forEach(animal => {
            updateDirection(animal);
            updatePosition(animal);
            updateSize(animal);
            rotateAnimal(animal);
        });

        avoidCollision();

        if (Math.random() < 0.01) {
            const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
            randomAnimal.element.style.display = randomAnimal.element.style.display === 'none' ? 'block' : 'none';
        }

        requestAnimationFrame(animateAnimals);
    }

    animateAnimals();
});