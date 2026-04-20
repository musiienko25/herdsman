import { Application, Container, Graphics, Text } from 'pixi.js';
import './style.css';

type Vec2 = { x: number; y: number };

const FIELD_WIDTH = 1000;
const FIELD_HEIGHT = 650;
const MAX_GROUP_SIZE = 5;
const HERO_SPEED = 240;
const ANIMAL_SPEED = 130;
const PATROL_SPEED = 45;
const FOLLOW_DISTANCE = 22;
const CATCH_DISTANCE = 36;

const randomInRange = (min: number, max: number): number => min + Math.random() * (max - min);

const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

class ScoreBoard {
  private readonly text: Text;
  private score = 0;

  constructor(parent: Container) {
    this.text = new Text({
      text: 'Score: 0',
      style: { fill: 0xffffff, fontSize: 30, fontWeight: 'bold' },
    });
    this.text.position.set(16, 10);
    parent.addChild(this.text);
  }

  increase(): void {
    this.score += 1;
    this.text.text = `Score: ${this.score}`;
  }
}

class Hero {
  readonly view: Graphics;
  private destination: Vec2;

  constructor(parent: Container, x: number, y: number) {
    this.view = new Graphics().circle(0, 0, 16).fill(0xff3b30);
    this.view.position.set(x, y);
    this.destination = { x, y };
    parent.addChild(this.view);
  }

  setDestination(target: Vec2): void {
    this.destination = target;
  }

  update(deltaTimeSec: number): void {
    const current = this.position;
    const dist = distance(current, this.destination);
    if (dist < 1) {
      return;
    }
    const step = Math.min(HERO_SPEED * deltaTimeSec, dist);
    const nx = (this.destination.x - current.x) / dist;
    const ny = (this.destination.y - current.y) / dist;
    this.view.position.set(current.x + nx * step, current.y + ny * step);
  }

  get position(): Vec2 {
    return { x: this.view.x, y: this.view.y };
  }
}

class Yard {
  readonly view: Graphics;
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;
  private readonly height: number;

  constructor(parent: Container) {
    this.width = 220;
    this.height = 140;
    this.x = FIELD_WIDTH - this.width - 18;
    this.y = FIELD_HEIGHT - this.height - 18;

    this.view = new Graphics()
      .roundRect(this.x, this.y, this.width, this.height, 12)
      .fill(0xffdf36);
    parent.addChild(this.view);
  }

  contains(point: Vec2): boolean {
    return (
      point.x >= this.x &&
      point.x <= this.x + this.width &&
      point.y >= this.y &&
      point.y <= this.y + this.height
    );
  }
}

const AnimalState = {
  Free: 'free',
  Following: 'following',
} as const;
type AnimalState = (typeof AnimalState)[keyof typeof AnimalState];

class Animal {
  readonly view: Graphics;
  state: AnimalState = AnimalState.Free;
  private patrolTarget: Vec2;
  private readonly radius = 10;

  constructor(parent: Container, x: number, y: number) {
    this.view = new Graphics().circle(0, 0, this.radius).fill(0xffffff);
    this.view.position.set(x, y);
    this.patrolTarget = this.generatePatrolTarget();
    parent.addChild(this.view);
  }

  update(deltaTimeSec: number, followTarget: Vec2 | null): void {
    if (this.state === AnimalState.Following && followTarget) {
      this.moveToward(followTarget, ANIMAL_SPEED, deltaTimeSec, FOLLOW_DISTANCE);
      return;
    }

    if (distance(this.position, this.patrolTarget) < 5) {
      this.patrolTarget = this.generatePatrolTarget();
    }
    this.moveToward(this.patrolTarget, PATROL_SPEED, deltaTimeSec, 0);
  }

  moveTo(point: Vec2): void {
    this.view.position.set(point.x, point.y);
  }

  get position(): Vec2 {
    return { x: this.view.x, y: this.view.y };
  }

  private moveToward(target: Vec2, speed: number, deltaTimeSec: number, stopDistance: number): void {
    const current = this.position;
    const dist = distance(current, target);
    if (dist <= stopDistance || dist < 0.001) {
      return;
    }
    const step = Math.min(speed * deltaTimeSec, Math.max(0, dist - stopDistance));
    const nx = (target.x - current.x) / dist;
    const ny = (target.y - current.y) / dist;
    this.moveTo({ x: current.x + nx * step, y: current.y + ny * step });
  }

  private generatePatrolTarget(): Vec2 {
    return {
      x: randomInRange(20, FIELD_WIDTH - 20),
      y: randomInRange(56, FIELD_HEIGHT - 20),
    };
  }
}

class AnimalSpawner {
  private readonly scene: Container;
  private spawnCooldownSec = randomInRange(1.5, 4.5);

  constructor(scene: Container) {
    this.scene = scene;
  }

  update(deltaTimeSec: number, addAnimal: (animal: Animal) => void): void {
    this.spawnCooldownSec -= deltaTimeSec;
    if (this.spawnCooldownSec > 0) {
      return;
    }
    const spawnPoint = {
      x: randomInRange(20, FIELD_WIDTH - 20),
      y: randomInRange(56, FIELD_HEIGHT - 20),
    };
    addAnimal(new Animal(this.scene, spawnPoint.x, spawnPoint.y));
    this.spawnCooldownSec = randomInRange(1.5, 4.5);
  }
}

class Game {
  private readonly app: Application;
  private readonly scene: Container;
  private readonly hero: Hero;
  private readonly yard: Yard;
  private readonly scoreBoard: ScoreBoard;
  private readonly spawner: AnimalSpawner;
  private readonly animals: Animal[] = [];

  constructor(app: Application) {
    this.app = app;
    this.scene = app.stage;

    this.drawGameField();
    this.scoreBoard = new ScoreBoard(this.scene);
    this.yard = new Yard(this.scene);
    this.hero = new Hero(this.scene, 120, FIELD_HEIGHT / 2);
    this.spawner = new AnimalSpawner(this.scene);

    const initialAnimalCount = Math.floor(randomInRange(6, 12));
    for (let i = 0; i < initialAnimalCount; i += 1) {
      this.animals.push(
        new Animal(this.scene, randomInRange(20, FIELD_WIDTH - 20), randomInRange(56, FIELD_HEIGHT - 20)),
      );
    }

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', (event) => {
      this.hero.setDestination({
        x: event.globalX,
        y: Math.max(54, event.globalY),
      });
    });

    this.app.ticker.add(() => {
      const deltaTimeSec = this.app.ticker.deltaMS / 1000;
      this.update(deltaTimeSec);
    });
  }

  private drawGameField(): void {
    const background = new Graphics().rect(0, 0, FIELD_WIDTH, FIELD_HEIGHT).fill(0x2fa447);
    this.scene.addChild(background);
  }

  private update(deltaTimeSec: number): void {
    this.hero.update(deltaTimeSec);
    this.tryCollectNearbyAnimals();

    const followers = this.animals.filter((animal) => animal.state === AnimalState.Following);
    followers.forEach((animal, index) => {
      const lead = index === 0 ? this.hero.position : followers[index - 1].position;
      animal.update(deltaTimeSec, lead);
    });

    this.animals
      .filter((animal) => animal.state === AnimalState.Free)
      .forEach((animal) => animal.update(deltaTimeSec, null));

    this.handleYardDelivery();
    this.spawner.update(deltaTimeSec, (animal) => {
      this.animals.push(animal);
    });
  }

  private tryCollectNearbyAnimals(): void {
    const groupSize = this.animals.filter((animal) => animal.state === AnimalState.Following).length;
    if (groupSize >= MAX_GROUP_SIZE) {
      return;
    }

    const freeAnimals = this.animals.filter((animal) => animal.state === AnimalState.Free);
    const slots = MAX_GROUP_SIZE - groupSize;
    freeAnimals
      .filter((animal) => distance(animal.position, this.hero.position) <= CATCH_DISTANCE)
      .slice(0, slots)
      .forEach((animal) => {
        animal.state = AnimalState.Following;
      });
  }

  private handleYardDelivery(): void {
    for (let i = this.animals.length - 1; i >= 0; i -= 1) {
      const animal = this.animals[i];
      if (animal.state !== AnimalState.Following || !this.yard.contains(animal.position)) {
        continue;
      }
      this.scoreBoard.increase();
      animal.view.destroy();
      this.animals.splice(i, 1);
    }
  }
}

const app = new Application();

await app.init({
  width: FIELD_WIDTH,
  height: FIELD_HEIGHT,
  antialias: true,
  background: '#2fa447',
});

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) {
  throw new Error('App root element not found.');
}

appRoot.appendChild(app.canvas);
new Game(app);
