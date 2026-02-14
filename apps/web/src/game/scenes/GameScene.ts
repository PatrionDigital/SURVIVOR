import { Container, Graphics } from "pixi.js";
import { EntityManager } from "yuka";
import { Scene } from "../SceneManager";
import { InputSystem, InputState } from "../InputSystem";
import { Camera } from "../Camera";
import {
  createGameWorld,
  GameWorld,
  Entity,
  movementSystem,
  invincibilitySystem,
  renderSystem,
} from "../ecs";
import {
  PlayerWeaponSystem,
  projectileMovementSystem,
  projectileLifetimeSystem,
  projectileCollisionSystem,
  type WeaponConfig,
} from "../combat";
import { SpawningSystem, type SpawningConfig } from "../spawning";
import {
  EnemyTypeRegistry,
  enemyAISystem,
  collisionSystem,
  enemyDeathSystem,
  destroyEnemy,
} from "../enemies";
import {
  createXPGem,
  destroyPickup,
  pickupAttractionSystem,
  pickupCollectionSystem,
  DEFAULT_PICKUP_CONFIG,
} from "../pickups";
import {
  LevelingSystem,
  generateUpgradeChoices,
  type LevelUpResult,
  type Upgrade,
} from "../leveling";
import { WaveController, type WaveConfig, type TimedEvent, type EventWarning } from "../waves";
import { createEnemy, type EnemyStatModifiers } from "../enemies";

/**
 * GameScene - Main gameplay scene
 *
 * Handles:
 * - Player entity (ECS)
 * - Camera following player
 * - Enemy spawning
 * - Combat systems
 * - Pickups
 * - HUD elements
 */
// Grid settings for background
const GRID_SIZE = 64; // Size of each grid cell in pixels
const GRID_COLOR_PRIMARY = 0x1a1a2e; // Dark blue-purple
const GRID_COLOR_SECONDARY = 0x16213e; // Slightly lighter
const GRID_LINE_COLOR = 0x0f3460; // Grid lines

// Default player weapon configuration
const DEFAULT_WEAPON_CONFIG: WeaponConfig = {
  id: "basic-blaster",
  name: "Basic Blaster",
  damage: 25, // Increased for faster kills (4 hits to kill basic enemy)
  cooldown: 300, // Fire every 300ms (faster)
  projectileSpeed: 500, // Pixels per second (faster projectiles)
  projectileLifetime: 2000, // 2 seconds
  range: 400, // Maximum targeting range (about half viewport diagonal at 800x600)
  visual: {
    color: 0x00ffff, // Cyan projectiles
    radius: 6, // Slightly larger for visibility
  },
  projectilesPerShot: 1,
  spreadAngle: 0,
  pierce: 0,
};

// Default spawning configuration
const DEFAULT_SPAWNING_CONFIG: SpawningConfig = {
  baseSpawnInterval: 2000, // Spawn every 2 seconds
  minSpawnInterval: 500, // Minimum 0.5 seconds at max difficulty
  spawnDistanceFromViewport: 100, // Spawn 100px outside viewport
  maxEnemies: 30, // Cap at 30 enemies
  difficultyScaling: {
    intervalDecreasePerMinute: 100, // Get faster over time
    enemiesPerWaveIncreasePerMinute: 0.5,
  },
  enemyTypes: ["basic"],
};

// Default wave configuration for survival mode (20 minutes)
const DEFAULT_WAVE_CONFIG: WaveConfig = {
  id: "survival",
  name: "Survival Mode",
  version: "1.0.0",
  description: "Standard 20-minute survival with escalating difficulty",
  globalSettings: {
    baseSpawnInterval: 2000,
    minSpawnInterval: 500,
    maxGameTime: 20 * 60 * 1000, // 20 minutes
    spawnDistanceFromViewport: 100,
  },
  phases: [
    {
      id: "phase-1",
      name: "Early Game",
      startTime: 0,
      endTime: 3 * 60 * 1000, // 0-3 minutes
      enemyTypes: ["basic"],
      spawnRateMultiplier: 1.0,
      maxEnemies: 20,
      healthMultiplier: 1.0,
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
    },
    {
      id: "phase-2",
      name: "Mid Game",
      startTime: 3 * 60 * 1000,
      endTime: 10 * 60 * 1000, // 3-10 minutes
      enemyTypes: ["basic"],
      spawnRateMultiplier: 1.5,
      maxEnemies: 35,
      healthMultiplier: 1.25,
      damageMultiplier: 1.1,
      speedMultiplier: 1.1,
    },
    {
      id: "phase-3",
      name: "Late Game",
      startTime: 10 * 60 * 1000,
      endTime: 20 * 60 * 1000, // 10-20 minutes
      enemyTypes: ["basic"],
      spawnRateMultiplier: 2.0,
      maxEnemies: 50,
      healthMultiplier: 1.5,
      damageMultiplier: 1.25,
      speedMultiplier: 1.2,
    },
  ],
  events: [
    {
      id: "mini-boss-1",
      type: "boss_spawn",
      triggerTime: 3 * 60 * 1000, // 3 minutes
      data: {
        bossType: "basic",
        enemyType: "basic",
        count: 1,
      },
    },
    {
      id: "horde-1",
      type: "horde",
      triggerTime: 5 * 60 * 1000, // 5 minutes
      data: {
        enemyType: "basic",
        count: 15,
        duration: 5000,
      },
    },
    {
      id: "mini-boss-2",
      type: "boss_spawn",
      triggerTime: 10 * 60 * 1000, // 10 minutes
      data: {
        bossType: "basic",
        enemyType: "basic",
        count: 1,
      },
    },
    {
      id: "horde-2",
      type: "horde",
      triggerTime: 15 * 60 * 1000, // 15 minutes
      data: {
        enemyType: "basic",
        count: 25,
        duration: 5000,
      },
    },
  ],
};

export class GameScene extends Scene {
  private gameContainer: Container | null = null;
  private backgroundContainer: Container | null = null;
  private backgroundGraphics: Graphics | null = null;
  private inputSystem: InputSystem | null = null;

  // ECS
  private world: GameWorld | null = null;
  private playerEntity: Entity | null = null;

  // Camera
  private camera: Camera | null = null;

  // Combat
  private playerWeaponSystem: PlayerWeaponSystem | null = null;

  // Enemies
  private yukaManager: EntityManager | null = null;
  private enemyRegistry: EnemyTypeRegistry | null = null;
  private spawningSystem: SpawningSystem | null = null;

  // Leveling
  private levelingSystem: LevelingSystem | null = null;

  // Wave system
  private waveController: WaveController | null = null;
  private pendingWarnings: EventWarning[] = [];

  // Stats tracking
  private enemiesKilled = 0;
  private totalXPCollected = 0;
  private victoryTriggered = false;
  private appliedUpgrades: Upgrade[] = [];

  // Player stats (from upgrades)
  private playerStats = {
    damage: 0, // Bonus damage
    attackSpeed: 0, // Bonus attack speed multiplier
    moveSpeed: 0, // Bonus move speed
    maxHealth: 0, // Bonus max health
    healthRegen: 0, // HP/second
    pickupRange: 0, // Bonus pickup range
    xpBonus: 0, // Bonus XP percentage
  };

  // Game dimensions (set on resize)
  private width = 800;
  private height = 600;

  constructor() {
    super("game");
  }

  protected onEnter(): void {
    // Reset stats
    this.enemiesKilled = 0;
    this.totalXPCollected = 0;
    this.victoryTriggered = false;
    this.pendingWarnings = [];
    this.appliedUpgrades = [];
    this.playerStats = {
      damage: 0,
      attackSpeed: 0,
      moveSpeed: 0,
      maxHealth: 0,
      healthRegen: 0,
      pickupRange: 0,
      xpBonus: 0,
    };

    this.createBackground();
    this.createGameContainer();
    this.createWorld();
    this.createCamera();
    this.createPlayer();
    this.createWeaponSystem();
    this.createEnemySystems();
    this.createLevelingSystem();
    this.createWaveSystem();
  }

  protected onExit(): void {
    // Destroy player sprite
    if (this.playerEntity?.sprite) {
      this.playerEntity.sprite.graphics.destroy();
    }

    // Clean up projectiles
    if (this.world) {
      for (const entity of this.world.with("projectile")) {
        if (entity.sprite?.graphics) {
          entity.sprite.graphics.destroy();
        }
      }
    }

    // Clean up enemies
    if (this.world && this.yukaManager) {
      for (const entity of this.world.with("enemy")) {
        destroyEnemy(this.world, this.yukaManager, entity);
      }
    }

    // Clean up pickups
    if (this.world) {
      for (const entity of this.world.with("pickup")) {
        destroyPickup(this.world, entity);
      }
    }

    // Clean up background
    if (this.backgroundGraphics) {
      this.backgroundGraphics.destroy();
    }

    // Clean up scene content
    this.container.removeChildren();
    this.gameContainer = null;
    this.backgroundContainer = null;
    this.backgroundGraphics = null;
    this.world = null;
    this.playerEntity = null;
    this.camera = null;
    this.playerWeaponSystem = null;
    this.yukaManager = null;
    this.enemyRegistry = null;
    this.spawningSystem = null;
    this.levelingSystem = null;
    this.waveController = null;
    this.pendingWarnings = [];
  }

  protected onUpdate(deltaMs: number): void {
    if (!this.world || !this.camera) return;

    // Get input state (default to no movement if no input system)
    const input = this.inputSystem?.getState() ?? {
      movement: { x: 0, y: 0 },
    };

    // Run ECS systems in order
    // 1. Movement (no bounds - infinite arena)
    movementSystem(this.world, deltaMs, input, this.playerStats.moveSpeed);

    // 2. Update camera to follow player
    if (this.playerEntity?.position) {
      this.camera.update(this.playerEntity.position.x, this.playerEntity.position.y, deltaMs);
    }

    // 3. Invincibility effects
    invincibilitySystem(this.world, deltaMs);

    // 3.25. Health regeneration
    if (this.playerStats.healthRegen > 0 && this.playerEntity?.health) {
      const regenAmount = (this.playerStats.healthRegen * deltaMs) / 1000; // HP per ms
      this.playerEntity.health.current = Math.min(
        this.playerEntity.health.current + regenAmount,
        this.playerEntity.health.max
      );
    }

    // 3.5. Wave system update
    if (this.waveController) {
      // Update wave time and get triggered events
      const events = this.waveController.update(deltaMs);

      // Process triggered events (bosses, hordes)
      for (const event of events) {
        this.handleWaveEvent(event);
      }

      // Check for upcoming warnings (5 second window)
      this.waveController.checkWarnings(this.waveController.getGameTime(), 5000);

      // Check for victory (survival complete)
      if (this.waveController.isComplete()) {
        this.triggerVictory();
      }

      // Update spawning config periodically based on wave state
      this.updateSpawningFromWave();
    }

    // 4. Enemy spawning
    if (this.spawningSystem) {
      this.spawningSystem.update(
        deltaMs,
        { x: this.camera.x, y: this.camera.y },
        this.width,
        this.height
      );
    }

    // 5. Enemy AI (Yuka steering behaviors)
    if (this.yukaManager) {
      const playerPos = this.playerEntity?.position ?? null;
      enemyAISystem(this.world, this.yukaManager, deltaMs, playerPos);
    }

    // 6. Enemy-player collision (contact damage)
    if (this.yukaManager) {
      const enemyCollision = collisionSystem(this.world, 20); // player radius

      if (enemyCollision.playerHit) {
        this.damagePlayer(enemyCollision.totalDamage);
      }
    }

    // 7. Combat systems (player weapon)
    if (this.playerEntity?.position && this.playerWeaponSystem) {
      // Player weapon auto-fires at nearest enemy
      this.playerWeaponSystem.update(deltaMs, this.playerEntity.position);
    }

    // 8. Projectile systems
    projectileMovementSystem(this.world, deltaMs);
    projectileLifetimeSystem(this.world, deltaMs);

    // 9. Projectile collision (player radius 20, projectile radius 5)
    const projectileResult = projectileCollisionSystem(this.world, 5, 20);

    // Apply player damage from enemy projectiles
    if (projectileResult.playerHit && this.playerEntity) {
      this.damagePlayer(projectileResult.playerDamageTaken);
    }

    // Clean up consumed projectiles
    this.cleanupConsumedProjectiles();

    // 10. Enemy death (check for dead enemies, spawn XP gems)
    if (this.yukaManager && this.gameContainer) {
      const deathResult = enemyDeathSystem(this.world, this.yukaManager);

      // Track kills and spawn XP gems at death positions
      this.enemiesKilled += deathResult.deaths.length;
      for (const death of deathResult.deaths) {
        createXPGem(this.world, this.gameContainer, death.position, death.xpValue);
      }
    }

    // 11. Pickup attraction (magnet effect) — apply pickup range bonus
    const playerPos = this.playerEntity?.position ?? null;
    const effectivePickupConfig =
      this.playerStats.pickupRange > 0
        ? {
            ...DEFAULT_PICKUP_CONFIG,
            magnetRange: DEFAULT_PICKUP_CONFIG.magnetRange + this.playerStats.pickupRange,
          }
        : DEFAULT_PICKUP_CONFIG;
    pickupAttractionSystem(this.world, deltaMs, playerPos, effectivePickupConfig);

    // 12. Pickup collection
    const collectionResult = pickupCollectionSystem(
      this.world,
      deltaMs,
      playerPos,
      effectivePickupConfig
    );

    // Add collected XP to leveling system — apply XP bonus
    if (collectionResult.totalXP > 0 && this.levelingSystem) {
      const xpMultiplier = 1 + this.playerStats.xpBonus / 100;
      const effectiveXP = Math.floor(collectionResult.totalXP * xpMultiplier);
      this.totalXPCollected += effectiveXP;
      const levelResult: LevelUpResult = this.levelingSystem.addXP(effectiveXP);

      if (levelResult.leveledUp) {
        // Level up occurred - game will pause for upgrade selection
        console.log(
          `Level up! Now level ${levelResult.newLevel} (gained ${levelResult.levelsGained} levels)`
        );
      }
    }

    // 13. Update background to follow camera
    this.updateBackground();

    // 14. Render with camera offset
    renderSystem(this.world, this.camera, this.width, this.height);
  }

  /**
   * Set the input system for player control
   */
  setInputSystem(input: InputSystem): void {
    this.inputSystem = input;
  }

  /**
   * Get the current input state
   */
  getInputState(): InputState | null {
    return this.inputSystem?.getState() ?? null;
  }

  /**
   * Resize the scene to fit container
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // No position clamping in infinite arena
  }

  /**
   * Get the player sprite (for external access)
   */
  getPlayer(): Graphics | null {
    return this.playerEntity?.sprite?.graphics ?? null;
  }

  /**
   * Get the camera (for viewport calculations, enemy spawning)
   */
  getCamera(): Camera | null {
    return this.camera;
  }

  /**
   * Get player position (for state persistence)
   */
  getPlayerPosition(): { x: number; y: number } | null {
    if (!this.playerEntity?.position) return null;
    return {
      x: this.playerEntity.position.x,
      y: this.playerEntity.position.y,
    };
  }

  /**
   * Set player position (for state restoration)
   */
  setPlayerPosition(x: number, y: number): void {
    if (this.playerEntity?.position) {
      this.playerEntity.position.x = x;
      this.playerEntity.position.y = y;
    }
  }

  /**
   * Get the leveling system (for UI access)
   */
  getLevelingSystem(): LevelingSystem | null {
    return this.levelingSystem;
  }

  /**
   * Get current player level
   */
  getPlayerLevel(): number {
    return this.levelingSystem?.getLevel() ?? 1;
  }

  /**
   * Get XP progress toward next level (0-100)
   */
  getXPProgressPercent(): number {
    return this.levelingSystem?.getProgressPercent() ?? 0;
  }

  /**
   * Check if player is in level-up state (has pending upgrades)
   */
  isLevelingUp(): boolean {
    return this.levelingSystem?.isLevelingUp() ?? false;
  }

  /**
   * Get total enemies killed this session
   */
  getEnemiesKilled(): number {
    return this.enemiesKilled;
  }

  /**
   * Get total XP collected this session
   */
  getTotalXPCollected(): number {
    return this.totalXPCollected;
  }

  /**
   * Get current XP toward next level
   */
  getCurrentXP(): number {
    return this.levelingSystem?.getCurrentXP() ?? 0;
  }

  /**
   * Get player health stats
   */
  getPlayerHealth(): { current: number; max: number } {
    if (!this.playerEntity?.health) {
      return { current: 100, max: 100 };
    }
    return {
      current: this.playerEntity.health.current,
      max: this.playerEntity.health.max,
    };
  }

  /**
   * Check if player is dead (health <= 0)
   */
  isPlayerDead(): boolean {
    if (!this.playerEntity?.health) return false;
    return this.playerEntity.health.current <= 0;
  }

  /**
   * Check if player has achieved victory (survived full duration)
   */
  isVictory(): boolean {
    return this.victoryTriggered;
  }

  /**
   * Get current wave/phase name
   */
  getPhaseName(): string {
    return this.waveController?.getCurrentPhaseName() ?? "Unknown";
  }

  /**
   * Get wave progress (0-100)
   */
  getWaveProgress(): number {
    return (this.waveController?.getProgress() ?? 0) * 100;
  }

  /**
   * Get game time in seconds
   */
  getGameTime(): number {
    return (this.waveController?.getGameTime() ?? 0) / 1000;
  }

  /**
   * Get time remaining in seconds
   */
  getTimeRemaining(): number {
    return (this.waveController?.getTimeRemaining() ?? 0) / 1000;
  }

  /**
   * Get pending warnings for HUD display
   */
  getPendingWarnings(): EventWarning[] {
    return this.pendingWarnings;
  }

  /**
   * Clear a warning (after it's been displayed)
   */
  clearWarning(index: number): void {
    this.pendingWarnings.splice(index, 1);
  }

  /**
   * Clear all warnings
   */
  clearAllWarnings(): void {
    this.pendingWarnings = [];
  }

  /**
   * Update spawning system configuration
   * @param updates - Partial config updates to apply
   */
  updateSpawningConfig(updates: {
    baseSpawnInterval?: number;
    minSpawnInterval?: number;
    maxEnemies?: number;
  }): void {
    this.spawningSystem?.updateConfig(updates);
  }

  /**
   * Get XP required for next level
   */
  getXPToNextLevel(): number {
    return this.levelingSystem?.getXPToNextLevel() ?? 100;
  }

  /**
   * Get upgrade choices for the current level-up
   * @param count - Number of choices to generate (default 3)
   * @returns Array of upgrade choices
   */
  getUpgradeChoices(count: number = 3): Upgrade[] {
    return generateUpgradeChoices(count);
  }

  /**
   * Apply an upgrade and consume one pending level-up
   * @param upgrade - The upgrade to apply
   * @returns true if upgrade was applied, false if no pending level-ups
   */
  applyUpgrade(upgrade: Upgrade): boolean {
    if (!this.levelingSystem) return false;

    // Consume one pending level-up
    const consumed = this.levelingSystem.consumeLevelUp();
    if (!consumed) return false;

    // Track the applied upgrade
    this.appliedUpgrades.push(upgrade);

    // Apply upgrade effects to player stats
    switch (upgrade.type) {
      case "damage":
        this.playerStats.damage += upgrade.value;
        break;
      case "attackSpeed":
        this.playerStats.attackSpeed += upgrade.value;
        break;
      case "moveSpeed":
        this.playerStats.moveSpeed += upgrade.value;
        break;
      case "maxHealth":
        this.playerStats.maxHealth += upgrade.value;
        // Also increase current max health on player entity
        if (this.playerEntity?.health) {
          this.playerEntity.health.max += upgrade.value;
          // Optionally heal the amount added (feels better in gameplay)
          this.playerEntity.health.current = Math.min(
            this.playerEntity.health.current + upgrade.value,
            this.playerEntity.health.max
          );
        }
        break;
      case "healthRegen":
        this.playerStats.healthRegen += upgrade.value;
        break;
      case "pickupRange":
        this.playerStats.pickupRange += upgrade.value;
        break;
      case "xpBonus":
        this.playerStats.xpBonus += upgrade.value;
        break;
    }

    // Propagate stat bonuses to game systems
    this.syncStatsToSystems();

    console.log(`Applied upgrade: ${upgrade.name} (${upgrade.description})`);
    return true;
  }

  /**
   * Push current player stat bonuses to relevant game systems
   */
  private syncStatsToSystems(): void {
    if (this.playerWeaponSystem) {
      this.playerWeaponSystem.setDamageBonus(this.playerStats.damage);
      this.playerWeaponSystem.setAttackSpeedBonus(this.playerStats.attackSpeed);
    }
    // moveSpeed, pickupRange, xpBonus are applied per-frame in onUpdate
  }

  /**
   * Get current player stats (bonuses from upgrades)
   */
  getPlayerStats() {
    return { ...this.playerStats };
  }

  /**
   * Get list of upgrades applied during this session
   */
  getAppliedUpgrades(): Upgrade[] {
    return [...this.appliedUpgrades];
  }

  /**
   * Damage the player (triggers invincibility frames)
   * @param amount - Damage amount
   * @returns true if player took damage, false if invincible
   */
  damagePlayer(amount: number): boolean {
    if (!this.world || !this.playerEntity) return false;

    // Can't take damage while invincible
    if (this.playerEntity.invincibility) {
      return false;
    }

    // Apply damage to health
    if (this.playerEntity.health) {
      this.playerEntity.health.current = Math.max(0, this.playerEntity.health.current - amount);
    }

    // Add invincibility frames (1 second)
    this.world.addComponent(this.playerEntity, "invincibility", {
      remaining: 1000,
      duration: 1000,
    });

    return true;
  }

  private createWeaponSystem(): void {
    if (!this.world || !this.gameContainer) return;

    this.playerWeaponSystem = new PlayerWeaponSystem(
      this.world,
      this.gameContainer,
      DEFAULT_WEAPON_CONFIG
    );
  }

  private createLevelingSystem(): void {
    this.levelingSystem = new LevelingSystem();
  }

  private createWaveSystem(): void {
    // Create wave controller with default survival config
    this.waveController = new WaveController(DEFAULT_WAVE_CONFIG);

    // Register phase change callback
    this.waveController.onPhaseChange((newPhase, _oldPhase) => {
      console.log(`Phase transition: ${newPhase.name}`);
      // Update spawning config based on new phase
      this.updateSpawningFromWave();
    });

    // Register warning callback
    this.waveController.onWarning((_event, warning) => {
      this.pendingWarnings.push(warning);
      console.log(`Warning: ${warning.title} - ${warning.description}`);
    });

    // Initialize stat modifiers from first phase
    this.updateSpawningFromWave();
  }

  /**
   * Handle a wave event (boss spawn, horde, etc.)
   */
  private handleWaveEvent(event: TimedEvent): void {
    if (!this.waveController || !this.world || !this.yukaManager || !this.gameContainer) return;

    const commands = this.waveController.getSpawnCommandsForEvent(event);
    const config = this.waveController.getSpawnConfig();

    console.log(`Wave event: ${event.type} - ${event.id} (${commands.length} spawn commands)`);

    for (const command of commands) {
      // Get enemy config from registry
      const enemyConfig = this.enemyRegistry?.get(command.enemyType);
      if (!enemyConfig) {
        console.warn(`Enemy type '${command.enemyType}' not found for event ${event.id}`);
        continue;
      }

      // Calculate spawn position (use command position if provided, else random)
      const position = command.position ?? this.getRandomSpawnPosition();

      // Apply stat modifiers (bosses get extra health)
      const modifiers: EnemyStatModifiers = {
        healthMultiplier: config.healthMultiplier * (command.isBoss ? 5 : 1),
        damageMultiplier: config.damageMultiplier * (command.isBoss ? 1.5 : 1),
        speedMultiplier: config.speedMultiplier * (command.isBoss ? 0.8 : 1), // Bosses are slower
        isBoss: command.isBoss, // For visual differentiation
      };

      // Spawn the enemy
      createEnemy(
        this.world,
        this.yukaManager,
        this.gameContainer,
        enemyConfig,
        position,
        modifiers
      );
    }
  }

  /**
   * Get a random spawn position outside the viewport
   */
  private getRandomSpawnPosition(): { x: number; y: number } {
    if (!this.camera) return { x: 0, y: 0 };

    const offset = 100; // Distance from viewport edge
    const edges = ["top", "bottom", "left", "right"] as const;
    const edge = edges[Math.floor(Math.random() * edges.length)];

    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    switch (edge) {
      case "top":
        return {
          x: this.camera.x - halfWidth + Math.random() * this.width,
          y: this.camera.y - halfHeight - offset,
        };
      case "bottom":
        return {
          x: this.camera.x - halfWidth + Math.random() * this.width,
          y: this.camera.y + halfHeight + offset,
        };
      case "left":
        return {
          x: this.camera.x - halfWidth - offset,
          y: this.camera.y - halfHeight + Math.random() * this.height,
        };
      case "right":
        return {
          x: this.camera.x + halfWidth + offset,
          y: this.camera.y - halfHeight + Math.random() * this.height,
        };
    }
  }

  /**
   * Trigger victory (survival complete)
   */
  private triggerVictory(): void {
    // Only trigger once
    if (this.victoryTriggered) return;
    this.victoryTriggered = true;

    console.log("VICTORY! Survival complete!");
    // Victory handling will be done by GamePage checking isVictory()
  }

  /**
   * Update spawning system config from wave controller
   */
  private updateSpawningFromWave(): void {
    if (!this.waveController || !this.spawningSystem) return;

    const config = this.waveController.getSpawnConfig();

    // Update spawning system
    this.spawningSystem.updateConfig({
      enemyTypes: config.enemyTypes,
      maxEnemies: config.maxEnemies,
    });
    // Note: Stat modifiers are applied in handleWaveEvent for event spawns
    // Regular spawns use base stats from SpawningSystem
  }

  private createEnemySystems(): void {
    if (!this.world || !this.gameContainer) return;

    // Create Yuka EntityManager for AI steering
    this.yukaManager = new EntityManager();

    // Create enemy type registry
    this.enemyRegistry = new EnemyTypeRegistry();

    // Load enemy configs, then create spawning system
    // Using async IIFE since onEnter is synchronous
    (async () => {
      const config = await this.enemyRegistry!.load("basic");

      if (!config) {
        console.error("Failed to load basic enemy config - spawning disabled");
        return;
      }

      // Create spawning system after configs are loaded
      this.spawningSystem = new SpawningSystem(
        this.world!,
        this.yukaManager!,
        this.gameContainer!,
        this.enemyRegistry!,
        DEFAULT_SPAWNING_CONFIG
      );
    })().catch((err) => {
      console.error("Failed to initialize enemy systems:", err);
    });
  }

  private cleanupConsumedProjectiles(): void {
    if (!this.world) return;

    const toRemove: Entity[] = [];

    for (const entity of this.world.with("projectile")) {
      if (entity.projectile!.consumed || entity.projectile!.lifetime <= 0) {
        toRemove.push(entity);
      }
    }

    for (const entity of toRemove) {
      if (entity.sprite?.graphics) {
        entity.sprite.graphics.destroy();
      }
      this.world.remove(entity);
    }
  }

  private createBackground(): void {
    this.backgroundContainer = new Container();
    this.container.addChild(this.backgroundContainer);

    this.backgroundGraphics = new Graphics();
    this.backgroundContainer.addChild(this.backgroundGraphics);
  }

  private updateBackground(): void {
    if (!this.backgroundGraphics || !this.camera) return;

    const g = this.backgroundGraphics;
    g.clear();

    // Calculate visible area with padding for smooth scrolling
    const padding = GRID_SIZE * 2;
    const startX = Math.floor((this.camera.x - this.width / 2 - padding) / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor((this.camera.y - this.height / 2 - padding) / GRID_SIZE) * GRID_SIZE;
    const endX = this.camera.x + this.width / 2 + padding;
    const endY = this.camera.y + this.height / 2 + padding;

    // Camera offset for world-to-screen conversion
    const offsetX = this.width / 2 - this.camera.x;
    const offsetY = this.height / 2 - this.camera.y;

    // Draw checkerboard pattern
    for (let worldX = startX; worldX < endX; worldX += GRID_SIZE) {
      for (let worldY = startY; worldY < endY; worldY += GRID_SIZE) {
        // Checkerboard pattern based on grid position
        const gridX = Math.floor(worldX / GRID_SIZE);
        const gridY = Math.floor(worldY / GRID_SIZE);
        const isEven = (gridX + gridY) % 2 === 0;

        const screenX = worldX + offsetX;
        const screenY = worldY + offsetY;

        // Fill cell
        g.rect(screenX, screenY, GRID_SIZE, GRID_SIZE);
        g.fill({ color: isEven ? GRID_COLOR_PRIMARY : GRID_COLOR_SECONDARY });

        // Draw grid lines
        g.rect(screenX, screenY, GRID_SIZE, GRID_SIZE);
        g.stroke({ width: 1, color: GRID_LINE_COLOR, alpha: 0.5 });
      }
    }

    // Draw origin marker (cross at 0,0)
    const originScreenX = 0 + offsetX;
    const originScreenY = 0 + offsetY;

    // Only draw if origin is visible
    if (
      originScreenX > -50 &&
      originScreenX < this.width + 50 &&
      originScreenY > -50 &&
      originScreenY < this.height + 50
    ) {
      g.moveTo(originScreenX - 30, originScreenY);
      g.lineTo(originScreenX + 30, originScreenY);
      g.moveTo(originScreenX, originScreenY - 30);
      g.lineTo(originScreenX, originScreenY + 30);
      g.stroke({ width: 2, color: 0xff6b6b, alpha: 0.8 });
    }
  }

  private createGameContainer(): void {
    this.gameContainer = new Container();
    this.container.addChild(this.gameContainer);
  }

  private createWorld(): void {
    this.world = createGameWorld();
  }

  private createCamera(): void {
    // Create camera with smooth follow (lerp 0.1)
    this.camera = new Camera({ lerpFactor: 0.1 });
    // Initialize camera at origin (where player starts)
    this.camera.x = 0;
    this.camera.y = 0;
  }

  private createPlayer(): void {
    if (!this.world || !this.gameContainer) return;

    // Create player graphics
    const graphics = new Graphics();
    graphics.circle(0, 0, 20);
    graphics.fill({ color: 0x00ff88 });
    graphics.stroke({ width: 3, color: 0xffffff });

    // Player starts at world origin (0, 0)
    // Sprite will be positioned by RenderSystem based on camera
    const startX = 0;
    const startY = 0;

    this.gameContainer.addChild(graphics);

    // Create player entity with all components
    this.playerEntity = this.world.add({
      position: { x: startX, y: startY },
      velocity: { vx: 0, vy: 0 },
      health: { current: 100, max: 100 },
      sprite: { graphics },
      playerControlled: true,
    });
  }
}
