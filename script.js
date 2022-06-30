const CONFIG_WIDTH = 800;
const CONFIG_HEIGHT = 600;
const PIPE_DISTANCE_BETWEEN_Y = CONFIG_HEIGHT / 6;
const PIPES_IN_SCENE = 3;
const PIPE_DISTANCE_BETWEEN_X = CONFIG_WIDTH / PIPES_IN_SCENE;
const BIRD_OFFSET_X = 100;

const config = {
  type: Phaser.AUTO, // WebGL - canvas fallback
  width: CONFIG_WIDTH,
  height: CONFIG_HEIGHT,
  physics: {
    default: 'arcade', // 2 types of physics bodies: dynamic and static
    arcade: {
      gravity: { y: 500 }, // higher - more grav pull
      debug: true, // shows debugging
    },
  },

  scene: {
    preload, // loading assets for scene
    create, // create game objects in scene
    update, // game loop
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CONFIG_WIDTH,
    height: CONFIG_HEIGHT,
  },
};

let bird;
let pipes;
let pipeWidth;
let cursors;
let gameOver = false;
let collider;
let score = 0;
let scoreText;

const game = new Phaser.Game(config);

function preload() {
  this.load.image('bg', 'assets/bg.png');
  this.load.image('pipe', 'assets/pipe.png');
  this.load.image('bird', 'assets/bird.png');
}

function collisionCallback() {
  gameOver = true;
  collider.active = false; // turn off so that bird falls to the ground on collision
  bird.setFlipY(true);
}

function debounce(callback, wait) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
}

function setScore() {
  score += 1;
  scoreText.setText(`Score: ${score}`);
}

const throttledSetScore = debounce(setScore, 100);

function create() {
  const image = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'bg'); // add to center of scene
  const scaleX = this.cameras.main.width / image.width;
  const scaleY = this.cameras.main.height / image.height;
  const scale = Math.max(scaleX, scaleY);
  image.setScale(scale);

  pipes = this.physics.add.group({
    key: 'pipe',
    repeat: PIPES_IN_SCENE * 2 + 1, // 1 repeat = 2 pipes created / 3 pairs in a scene + 1 extra pair
    setXY: {
      y: CONFIG_HEIGHT,
    },
  });

  let pipeDistanceBtn = PIPE_DISTANCE_BETWEEN_X + BIRD_OFFSET_X; // offset of bird from left along x-axis
  let heightDiff = Phaser.Math.Between(-PIPE_DISTANCE_BETWEEN_Y, PIPE_DISTANCE_BETWEEN_Y);

  pipes.children.iterate((child, i) => {
    if (i === 0) {
      child.x = pipeDistanceBtn;
      child.y += heightDiff;
      pipeWidth = child.width;
    }
    // even
    if (i !== 0 && i % 2 === 0) {
      pipeDistanceBtn += PIPE_DISTANCE_BETWEEN_X;
      child.x = pipeDistanceBtn;
      child.y += heightDiff;
    }

    // odd
    if (i % 2 === 1) {
      child.x = pipeDistanceBtn;
      child.y += heightDiff - CONFIG_HEIGHT;
      child.angle += 180;
      heightDiff = Phaser.Math.Between(-PIPE_DISTANCE_BETWEEN_Y, PIPE_DISTANCE_BETWEEN_Y);
    }
    // make pipes partly static
    child.setImmovable(true);
    child.body.allowGravity = false;
  });

  bird = this.physics.add.sprite(BIRD_OFFSET_X, CONFIG_HEIGHT / 2, 'bird');
  bird.setBounce(0.5);
  bird.setCollideWorldBounds(true);
  cursors = this.input.keyboard.createCursorKeys();
  collider = this.physics.add.collider(bird, pipes, collisionCallback);
  scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });
}

function update() {
  if (gameOver) {
    pipes.children.iterate((x) => x.setVelocityX(0));
    return;
  }

  // reposition pipes after they move out of scene - illusion of continuous scene
  pipes.children.iterate((child) => {
    const childXPos = child.x;
    if (childXPos < -pipeWidth) {
      child.x += CONFIG_WIDTH + PIPE_DISTANCE_BETWEEN_X;
    } else {
      child.x -= 2; // move pipes left
    }
    if (childXPos < BIRD_OFFSET_X + 10 && childXPos > BIRD_OFFSET_X) {
      // need to debounce so that only 1 point each time bird passes through gap in pipes
      throttledSetScore();
    }
  });

  // arrow key up, click or touch
  if (cursors.up.isDown || this.input.activePointer.isDown) {
    bird.setVelocityY(-200);
  }
}
