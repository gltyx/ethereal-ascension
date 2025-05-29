 // BigNumber class for handling extremely large numbers
 class BigNumber {
    constructor(value = 0) {
        if (value instanceof BigNumber) {
            this.mantissa = value.mantissa;
            this.exponent = value.exponent;
        } else if (typeof value === 'string') {
            if (value.includes('e')) {
                const parts = value.split('e');
                this.mantissa = parseFloat(parts[0]);
                this.exponent = parseInt(parts[1]);
            } else {
                const num = parseFloat(value);
                if (isNaN(num)) {
                    this.mantissa = 0;
                    this.exponent = 0;
                } else {
                    this.mantissa = num;
                    this.exponent = 0;
                    this.normalize();
                }
            }
        } else {
            this.mantissa = value;
            this.exponent = 0;
            this.normalize();
        }
    }

    normalize() {
        // Handle zero case
        if (this.mantissa === 0) {
            this.exponent = 0;
            return;
        }

        // Handle very small numbers that might underflow
        if (!isFinite(this.mantissa) || Math.abs(this.mantissa) < 1e-308) {
            //console.warn('BigNumber: Detected potential underflow, resetting to 1');
            this.mantissa = 1;
            this.exponent = 0;
            return;
        }

        // Normalize mantissa to be between 1 and 10
        while (Math.abs(this.mantissa) >= 10) {
            this.mantissa /= 10;
            this.exponent++;
        }

        while (Math.abs(this.mantissa) < 1) {
            this.mantissa *= 10;
            this.exponent--;
        }

        // Final check to ensure we have a valid number
        if (isNaN(this.mantissa) || !isFinite(this.mantissa)) {
            //console.warn('BigNumber: Invalid mantissa after normalization, resetting to 1');
            this.mantissa = 1;
            this.exponent = 0;
        }
    }

    add(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);

        // If one number is much larger than the other, just return the larger one
        if (this.exponent > otherBN.exponent + 15) return new BigNumber(this);
        if (otherBN.exponent > this.exponent + 15) return new BigNumber(otherBN);

        // Align exponents
        const expDiff = this.exponent - otherBN.exponent;
        let result = new BigNumber();

        if (expDiff >= 0) {
            result.mantissa = this.mantissa + otherBN.mantissa * Math.pow(10, -expDiff);
            result.exponent = this.exponent;
        } else {
            result.mantissa = this.mantissa * Math.pow(10, expDiff) + otherBN.mantissa;
            result.exponent = otherBN.exponent;
        }

        result.normalize();
        return result;
    }

    subtract(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);

        // If this number is much larger than the other, just return this
        if (this.exponent > otherBN.exponent + 15) return new BigNumber(this);

        // If other number is much larger, return negative of other
        if (otherBN.exponent > this.exponent + 15) {
            const result = new BigNumber(otherBN);
            result.mantissa = -result.mantissa;
            return result;
        }

        // Align exponents
        const expDiff = this.exponent - otherBN.exponent;
        let result = new BigNumber();

        if (expDiff >= 0) {
            result.mantissa = this.mantissa - otherBN.mantissa * Math.pow(10, -expDiff);
            result.exponent = this.exponent;
        } else {
            result.mantissa = this.mantissa * Math.pow(10, expDiff) - otherBN.mantissa;
            result.exponent = otherBN.exponent;
        }

        result.normalize();
        return result;
    }

    multiply(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);

        let result = new BigNumber();
        result.mantissa = this.mantissa * otherBN.mantissa;
        result.exponent = this.exponent + otherBN.exponent;

        result.normalize();
        return result;
    }

    divide(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);

        if (otherBN.mantissa === 0) {
            throw new Error("Division by zero");
        }

        let result = new BigNumber();
        result.mantissa = this.mantissa / otherBN.mantissa;
        result.exponent = this.exponent - otherBN.exponent;

        result.normalize();
        return result;
    }

    pow(n) {
        if (n === 0) return new BigNumber(1);

        let result = new BigNumber();

        // For fractional exponents or negative mantissa, use logarithmic approach
        if (n % 1 !== 0 || this.mantissa < 0) {
            const logMantissa = Math.log10(Math.abs(this.mantissa));
            const totalLog = logMantissa + this.exponent;
            const newTotalLog = totalLog * n;

            result.exponent = Math.floor(newTotalLog);
            result.mantissa = Math.pow(10, newTotalLog - result.exponent);

            if (this.mantissa < 0 && n % 2 === 1) {
                result.mantissa = -result.mantissa;
            }
        } else {
            // For integer exponents with positive mantissa, use simpler approach
            result.mantissa = Math.pow(this.mantissa, n);
            result.exponent = this.exponent * n;
            result.normalize();
        }

        return result;
    }

    sqrt() {
        return this.pow(0.5);
    }

    log10() {
        return Math.log10(this.mantissa) + this.exponent;
    }

    equals(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);
        return this.mantissa === otherBN.mantissa && this.exponent === otherBN.exponent;
    }

    greaterThan(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);

        if (this.exponent > otherBN.exponent) return true;
        if (this.exponent < otherBN.exponent) return false;
        return this.mantissa > otherBN.mantissa;
    }

    lessThan(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);

        if (this.exponent < otherBN.exponent) return true;
        if (this.exponent > otherBN.exponent) return false;
        return this.mantissa < otherBN.mantissa;
    }

    greaterThanOrEqual(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);
        return this.greaterThan(otherBN) || this.equals(otherBN);
    }

    lessThanOrEqual(other) {
        const otherBN = other instanceof BigNumber ? other : new BigNumber(other);
        return this.lessThan(otherBN) || this.equals(otherBN);
    }

    toString(format = 'standard') {
        // Handle cases where mantissa is not a number
        if (typeof this.mantissa !== 'number') {
            console.warn('BigNumber.toString: mantissa is not a number', this);
            return '0.00';
        }

        if (this.exponent === 0) {
            return this.mantissa.toFixed(2);
        }

        if (format === 'scientific') {
            return `${this.mantissa.toFixed(2)}e${this.exponent}`;
        } else if (format === 'engineering') {
            const engExponent = Math.floor(this.exponent / 3) * 3;
            const engMantissa = this.mantissa * Math.pow(10, this.exponent - engExponent);

            let suffix = '';
            if (engExponent === 3) suffix = 'K';
            else if (engExponent === 6) suffix = 'M';
            else if (engExponent === 9) suffix = 'B';
            else if (engExponent === 12) suffix = 'T';
            else if (engExponent === 15) suffix = 'Qa';
            else if (engExponent === 18) suffix = 'Qi';
            else if (engExponent === 21) suffix = 'Sx';
            else if (engExponent === 24) suffix = 'Sp';
            else if (engExponent === 27) suffix = 'Oc';
            else if (engExponent === 30) suffix = 'No';
            else if (engExponent > 30) suffix = `e${engExponent}`;

            return `${engMantissa.toFixed(2)}${suffix}`;
        } else {
            // Standard format
            if (this.exponent <= 6) {
                const value = this.mantissa * Math.pow(10, this.exponent);
                // Always show 2 decimal places
                return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                return this.toString('scientific');
            }
        }
    }

    valueOf() {
        return this.mantissa * Math.pow(10, this.exponent);
    }

    static fromJSON(json) {
        const bn = new BigNumber();
        bn.mantissa = json.mantissa;
        bn.exponent = json.exponent;
        return bn;
    }

    toJSON() {
        return {
            mantissa: this.mantissa,
            exponent: this.exponent
        };
    }
}

// Game class
class Game {
    constructor() {
        // Initialize filter states
        this._showAllLockedArtifacts = false;
        this._artifactFilterListenersSet = false;
        this._featsFilterListenersSet = false;
        this._lockedArtifactsShowCount = 4;

        // Basic game state
        this.resources = {
            essence: new BigNumber(0),
            totalEssence: new BigNumber(0),
            powerPoints: new BigNumber(0)
        };

        this.statistics = {
            gameStarted: new Date(),
            totalClicks: 0,
            criticalClicks: 0,
            highestEssence: new BigNumber(0),
            totalPowerPoints: new BigNumber(0),
            ascensionCount: 0
        };

        this.essencePerClick = new BigNumber(1);
        this.productionMultiplier = new BigNumber(1);
        this.ascensionMultiplier = new BigNumber(1);
        this.powerPointsOnReset = new BigNumber(0);

        // Settings
        this.settings = {
            numberFormat: 'standard',
            saveFrequency: 30, // seconds
            gameSpeed: 1,
            visualEffects: 'medium', // high, medium, low
            particleCount: 8, // number of background particles
            uiUpdateRate: 100 // milliseconds between UI updates
        };

        // Optimization: UI update flags
        this.uiUpdateFlags = {
            counters: true,    // For numeric counter updates only
            resources: true,   // For full resource UI rebuilds
            realms: true,
            artifacts: true,
            powers: true,
            ascension: true,
            feats: true,
            statistics: true,
            bonuses: true,
            dungeon: true
        };

        // Pagination state
        this.pagination = {
            available: { page: 1, totalPages: 1, itemsPerPage: 8 },
            acquired: { page: 1, totalPages: 1, itemsPerPage: 8 },
            locked: { page: 1, totalPages: 1, itemsPerPage: 8 }
        };

        // Flag to track if pagination listeners are set up
        this._artifactPaginationListenersSet = false;

        // Dungeon state
        this.dungeon = {
            active: false,
            currentRoom: null,
            map: [],
            player: {
                health: 100,
                maxHealth: 100,
                attack: 10,
                defense: 5,
                effects: [],
                skillPoints: 0,
                skills: {
                    strength: 0,  // Increases attack
                    vitality: 0,  // Increases health
                    defense: 0,   // Increases defense
                    luck: 0       // Increases critical hit chance and rewards
                }
            },
            currentEnemy: null,
            combatActive: false,
            combatLog: [],
            turn: 'player',
            rewards: {
                essence: new BigNumber(0),
                powerPoints: new BigNumber(0),
                artifacts: [],
                skillPoints: 0
            },
            statistics: {
                totalDungeons: 0,
                totalRooms: 0,
                totalEnemiesDefeated: 0,
                totalBossesDefeated: 0,
                totalTreasuresFound: 0,
                artifactsFound: 0,
                totalSkillPointsEarned: 0,
                enemyKillCounter: 0  // Counter for skill point rewards
            }
        };

        // Optimization: DOM element cache
        this.domCache = {};

        // Realms (formerly generators)
        this.realms = [
            {
                id: 'realm1',
                name: 'Luminous Garden',
                description: 'A serene garden where essence flowers bloom naturally in eternal light.',
                icon: '🌸',
                baseCost: new BigNumber(10),
                costMultiplier: 1.15,
                baseProduction: new BigNumber(0.1),
                count: 0,
                unlocked: true
            },
            {
                id: 'realm2',
                name: 'Whispering Woods',
                description: 'Ancient trees channel the essence from deep earth currents into the air.',
                icon: '🌳',
                baseCost: new BigNumber(100),
                costMultiplier: 1.18,
                baseProduction: new BigNumber(1),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(50) }
            },
            {
                id: 'realm3',
                name: 'Crystal Caverns',
                description: 'Glowing crystals resonate with cosmic energies, amplifying essence naturally.',
                icon: '💎',
                baseCost: new BigNumber(1100),
                costMultiplier: 1.2,
                baseProduction: new BigNumber(8),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(500) }
            },
            {
                id: 'realm4',
                name: 'Astral Waterfall',
                description: 'Water falling from celestial planes carries concentrated essence droplets.',
                icon: '🌊',
                baseCost: new BigNumber(12000),
                costMultiplier: 1.22,
                baseProduction: new BigNumber(47),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(5000) }
            },
            {
                id: 'realm5',
                name: 'Phoenix Volcano',
                description: 'The eternal fire of rebirth generates immense amounts of essence.',
                icon: '🔥',
                baseCost: new BigNumber(130000),
                costMultiplier: 1.25,
                baseProduction: new BigNumber(260),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(50000) }
            },
            {
                id: 'realm6',
                name: 'Celestial Observatory',
                description: 'A tower reaching the stars, drawing essence directly from celestial bodies.',
                icon: '🌌',
                baseCost: new BigNumber(1400000),
                costMultiplier: 1.28,
                baseProduction: new BigNumber(1400),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(500000) }
            },
            {
                id: 'realm7',
                name: 'Void Gateway',
                description: 'A tear in reality that harnesses the infinite potential of the void.',
                icon: '⚫',
                baseCost: new BigNumber(20000000),
                costMultiplier: 1.3,
                baseProduction: new BigNumber(7800),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(10000000) }
            },
            {
                id: 'realm8',
                name: 'Divine Nexus',
                description: 'The convergence point of all realities where essence flows without limitation.',
                icon: '✨',
                baseCost: new BigNumber(330000000),
                costMultiplier: 1.32,
                baseProduction: new BigNumber(44000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(100000000) }
            },
            // New realms
            {
                id: 'realm9',
                name: 'Ethereal Library',
                description: 'Ancient tomes containing the knowledge of essence manipulation throughout the ages.',
                icon: '📚',
                baseCost: new BigNumber(5000000000),
                costMultiplier: 1.34,
                baseProduction: new BigNumber(260000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(1000000000) }
            },
            {
                id: 'realm10',
                name: 'Temporal Oasis',
                description: 'A sanctuary where time flows differently, accelerating essence generation.',
                icon: '⏳',
                baseCost: new BigNumber(75000000000),
                costMultiplier: 1.36,
                baseProduction: new BigNumber(1600000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(10000000000) }
            },
            {
                id: 'realm11',
                name: 'Mindscape Labyrinth',
                description: 'A realm formed from pure thought, where consciousness itself generates essence.',
                icon: '🧩',
                baseCost: new BigNumber(1000000000000),
                costMultiplier: 1.38,
                baseProduction: new BigNumber(10000000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(100000000000) }
            },
            {
                id: 'realm12',
                name: 'Elemental Forge',
                description: 'Primordial elements combine and recombine, forging pure essence in the process.',
                icon: '⚒️',
                baseCost: new BigNumber(15000000000000),
                costMultiplier: 1.4,
                baseProduction: new BigNumber(65000000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(1000000000000) }
            },
            {
                id: 'realm13',
                name: 'Harmonic Spire',
                description: 'A crystalline tower that resonates with the fundamental frequencies of reality.',
                icon: '🔔',
                baseCost: new BigNumber(250000000000000),
                costMultiplier: 1.42,
                baseProduction: new BigNumber(420000000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(10000000000000) }
            },
            {
                id: 'realm14',
                name: 'Quantum Nebula',
                description: 'A cloud of probability where all possible states of essence exist simultaneously.',
                icon: '☁️',
                baseCost: new BigNumber(3500000000000000),
                costMultiplier: 1.44,
                baseProduction: new BigNumber(2700000000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(100000000000000) }
            },
            {
                id: 'realm15',
                name: 'Astral Sanctuary',
                description: 'A sacred space where the boundaries between dimensions are thinnest.',
                icon: '🏯',
                baseCost: new BigNumber(50000000000000000),
                costMultiplier: 1.46,
                baseProduction: new BigNumber(17500000000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(1000000000000000) }
            },
            {
                id: 'realm16',
                name: 'Primordial Ocean',
                description: 'The original sea from which all life and essence first emerged.',
                icon: '🌊',
                baseCost: new BigNumber(750000000000000000),
                costMultiplier: 1.48,
                baseProduction: new BigNumber(115000000000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(10000000000000000) }
            },
            {
                id: 'realm17',
                name: 'Cosmic Loom',
                description: 'Where the fabric of reality is woven, with essence as the primary thread.',
                icon: '🧵',
                baseCost: new BigNumber(10000000000000000000),
                costMultiplier: 1.5,
                baseProduction: new BigNumber(750000000000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(100000000000000000) }
            },
            {
                id: 'realm18',
                name: 'Infinity Wellspring',
                description: 'An endless fountain of pure essence flowing from beyond the known universe.',
                icon: '♾️',
                baseCost: new BigNumber(150000000000000000000),
                costMultiplier: 1.52,
                baseProduction: new BigNumber(5000000000000),
                count: 0,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(1000000000000000000) }
            },
            {
                id: 'realm19',
                name: 'Transcendent Citadel',
                description: 'A fortress existing beyond time and space, channeling essence from all realities.',
                icon: '🏰',
                baseCost: new BigNumber(2500000000000000000000),
                costMultiplier: 1.54,
                baseProduction: new BigNumber(33000000000000),
                count: 0,
                unlocked: false,
                unlockAt: { ascensionCount: 5 }
            },
            {
                id: 'realm20',
                name: 'Omniscient Core',
                description: 'The sentient heart of all existence, generating essence through pure awareness.',
                icon: '👁️',
                baseCost: new BigNumber(40000000000000000000000),
                costMultiplier: 1.56,
                baseProduction: new BigNumber(220000000000000),
                count: 0,
                unlocked: false,
                unlockAt: { ascensionCount: 10 }
            }
        ];

        // Artifacts (formerly upgrades)
        this.artifacts = [
            // Rare Dungeon Artifacts - these persist through ascension and can only be found in dungeons
            {
                id: 'dungeon_artifact1',
                name: 'Philosopher\'s Stone',
                description: 'The legendary alchemical substance capable of turning base metals into gold. Enhances your essence transmutation abilities.',
                icon: '🔴',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'legendary',
                effect: { essenceMultiplier: 1.25, dungeonLootChance: 1.2 },
                lore: 'Sought by alchemists for centuries, this crimson stone radiates with primordial power. It seems to bend reality around it, making the impossible possible.'
            },
            {
                id: 'dungeon_artifact2',
                name: 'Celestial Compass',
                description: 'A navigation tool that points to sources of cosmic power. Increases essence gain from all realms.',
                icon: '🧭',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { realmProductionMultiplier: 1.15 },
                lore: 'The needle doesn\'t point north, but rather seems to indicate the direction of the strongest essence flows. Ancient astronomers used it to map the invisible currents of power.'
            },
            {
                id: 'dungeon_artifact3',
                name: 'Chronos Fragment',
                description: 'A shard of crystallized time. Speeds up essence generation.',
                icon: '⏳',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { gameSpeed: 1.1 },
                lore: 'Time flows differently around this fragment. Scholars debate whether it\'s a piece of a larger artifact or a natural formation from the temporal planes.'
            },
            {
                id: 'dungeon_artifact4',
                name: 'Void Chalice',
                description: 'A cup carved from the emptiness between stars. Increases your maximum health in dungeons.',
                icon: '🏺',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { dungeonHealthMultiplier: 1.3 },
                lore: 'The chalice appears to be made of solid darkness. When you look inside, you see what might be stars - or perhaps the reflections of souls it has consumed.'
            },
            {
                id: 'dungeon_artifact5',
                name: 'Ethereal Blade',
                description: 'A sword forged from solidified essence. Increases your attack power in dungeons.',
                icon: '⚔️',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { dungeonAttackMultiplier: 1.3 },
                lore: 'The blade phases in and out of reality, making it nearly impossible to block or dodge. It cuts through physical matter and spiritual essence with equal ease.'
            },
            {
                id: 'dungeon_artifact6',
                name: 'Arcane Shield',
                description: 'A shield that absorbs magical energy. Increases your defense in dungeons.',
                icon: '🛡️',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { dungeonDefenseMultiplier: 1.3 },
                lore: 'The shield\'s surface ripples like water when struck, dispersing harmful energies into the aether. Ancient runes along its edge glow when danger approaches.'
            },
            {
                id: 'dungeon_artifact7',
                name: 'Fortune\'s Dice',
                description: 'A pair of dice that always roll in your favor. Increases critical hit chance and treasure find rate.',
                icon: '🎲',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { criticalChanceBonus: 0.1, dungeonLootChance: 1.25 },
                lore: 'These dice were crafted by the goddess of fortune herself. They\'re said to bend probability in favor of their owner - but beware, for luck is a fickle mistress.'
            },
            {
                id: 'dungeon_artifact8',
                name: 'Essence Prism',
                description: 'A crystal that refracts essence into its component energies. Increases essence gain from channeling.',
                icon: '🔷',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { clickMultiplier: 1.5 },
                lore: 'When held up to the light, the prism splits essence into a spectrum of energies previously unknown to scholars. Each color seems to resonate with different realms.'
            },
            {
                id: 'dungeon_artifact9',
                name: 'Ascendant\'s Hourglass',
                description: 'An hourglass filled with glittering stardust. Increases power point gain.',
                icon: '⌛',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'legendary',
                effect: { powerPointMultiplier: 1.2 },
                lore: 'The sand never seems to run out, yet the flow changes with the cosmic tides. Those who meditate upon it report visions of past and future ascensions.'
            },
            {
                id: 'dungeon_artifact10',
                name: 'Realm Keystone',
                description: 'A stone that resonates with the fundamental frequencies of all realms. Reduces realm costs.',
                icon: '🗝️',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { costReduction: 0.9 },
                lore: 'This keystone was once part of the foundation of reality itself. By attuning to its vibrations, you can more easily manipulate the barriers between realms.'
            },
            {
                id: 'dungeon_artifact11',
                name: 'Soul Lantern',
                description: 'A lantern that burns with the fire of consciousness. Increases skill point gain in dungeons.',
                icon: '🏮',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'rare',
                effect: { dungeonSkillPointBonus: 1.5 },
                lore: 'The flame never needs fuel, burning with the pure energy of thought and will. It illuminates not just physical space, but the hidden potential within your soul.'
            },
            {
                id: 'dungeon_artifact12',
                name: 'Crown of Dominion',
                description: 'A crown worn by rulers of forgotten empires. Increases all dungeon stats.',
                icon: '👑',
                purchased: false,
                unlocked: false,
                type: 'dungeon',
                rarity: 'legendary',
                effect: { dungeonHealthMultiplier: 1.15, dungeonAttackMultiplier: 1.15, dungeonDefenseMultiplier: 1.15, dungeonEssenceReward: 1.15 },
                lore: 'Legends speak of an emperor who ruled a thousand realms. This crown channels the authority of that ancient sovereign, empowering its wearer with dominion over the forces of the dungeon.'
            },

            {
                id: 'artifact1',
                name: 'Channeling Crystal',
                description: 'Double the essence gained from channeling.',
                icon: '💠',
                cost: new BigNumber(100),
                purchased: false,
                unlocked: true,
                type: 'channeling',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact2',
                name: 'Essence Amplifier',
                description: 'Triple the essence gained from channeling.',
                icon: '🔮',
                cost: new BigNumber(1000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(500) },
                type: 'channeling',
                effect: { multiplier: 3 }
            },
            {
                id: 'artifact3',
                name: 'Ancient Focus',
                description: 'Quadruple the essence gained from channeling.',
                icon: '🧿',
                cost: new BigNumber(10000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(5000) },
                type: 'channeling',
                effect: { multiplier: 4 }
            },
            {
                id: 'artifact4',
                name: 'Luminous Fertilizer',
                description: 'Double the production of Luminous Gardens.',
                icon: '✨',
                cost: new BigNumber(500),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm1', count: 10 } },
                type: 'realm',
                target: 'realm1',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact5',
                name: 'Sylvan Whisper',
                description: 'Double the production of Whispering Woods.',
                icon: '🍃',
                cost: new BigNumber(2500),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm2', count: 10 } },
                type: 'realm',
                target: 'realm2',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact6',
                name: 'Crystal Resonator',
                description: 'Double the production of Crystal Caverns.',
                icon: '🔋',
                cost: new BigNumber(12000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm3', count: 10 } },
                type: 'realm',
                target: 'realm3',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact7',
                name: 'Essence Conduit',
                description: 'Increase all production by 50%',
                icon: '⚡',
                cost: new BigNumber(5000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(2500) },
                type: 'global',
                effect: { multiplier: 1.5 }
            },
            {
                id: 'artifact8',
                name: 'Reality Weaver',
                description: 'Increase all production by 75%',
                icon: '🕸️',
                cost: new BigNumber(50000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(25000) },
                type: 'global',
                effect: { multiplier: 1.75 }
            },
            {
                id: 'artifact9',
                name: 'Soul Catalyst',
                description: 'Increase power point gain by 50%',
                icon: '👁️',
                cost: new BigNumber(1),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'powerPoints', amount: new BigNumber(1) },
                type: 'ascension',
                effect: { multiplier: 1.5 }
            },
            // New artifacts
            {
                id: 'artifact10',
                name: 'Celestial Prism',
                description: 'Quintuple the essence gained from channeling.',
                icon: '🔰',
                cost: new BigNumber(100000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(50000) },
                type: 'channeling',
                effect: { multiplier: 5 }
            },
            {
                id: 'artifact11',
                name: 'Astral Cascade',
                description: 'Double the production of Astral Waterfalls.',
                icon: '🌊',
                cost: new BigNumber(60000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm4', count: 10 } },
                type: 'realm',
                target: 'realm4',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact12',
                name: 'Phoenix Feather',
                description: 'Double the production of Phoenix Volcanoes.',
                icon: '🪶',
                cost: new BigNumber(650000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm5', count: 10 } },
                type: 'realm',
                target: 'realm5',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact13',
                name: 'Starlight Lens',
                description: 'Double the production of Celestial Observatories.',
                icon: '🔬',
                cost: new BigNumber(7000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm6', count: 10 } },
                type: 'realm',
                target: 'realm6',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact14',
                name: 'Void Fragment',
                description: 'Double the production of Void Gateways.',
                icon: '🌌',
                cost: new BigNumber(100000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm7', count: 10 } },
                type: 'realm',
                target: 'realm7',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact15',
                name: 'Divine Chalice',
                description: 'Double the production of Divine Nexuses.',
                icon: '🫗',
                cost: new BigNumber(1650000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm8', count: 10 } },
                type: 'realm',
                target: 'realm8',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact16',
                name: 'Cosmic Harmony',
                description: 'Increase all production by 100%',
                icon: '☯️',
                cost: new BigNumber(500000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(250000) },
                type: 'global',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact17',
                name: 'Magic Stone',
                description: 'Increase all production by 150%',
                icon: '🤌',
                cost: new BigNumber(5000000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(2500000) },
                type: 'global',
                effect: { multiplier: 2.5 }
            },
            {
                id: 'artifact18',
                name: 'Transcendence Elixir',
                description: 'Increase power point gain by 100%',
                icon: '🧪',
                cost: new BigNumber(3),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'powerPoints', amount: new BigNumber(3) },
                type: 'ascension',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact19',
                name: 'Ethereal Codex',
                description: 'Double the production of Ethereal Libraries.',
                icon: '📖',
                cost: new BigNumber(25000000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm9', count: 10 } },
                type: 'realm',
                target: 'realm9',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact20',
                name: 'Chronos Hourglass',
                description: 'Double the production of Temporal Oases.',
                icon: '⌛️',
                cost: new BigNumber(375000000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm10', count: 10 } },
                type: 'realm',
                target: 'realm10',
                effect: { multiplier: 2 }
            },
            {
                id: 'artifact21',
                name: 'Essence Matrix',
                description: 'Increase all production by 200%',
                icon: '🗺️',
                cost: new BigNumber(50000000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(25000000) },
                type: 'global',
                effect: { multiplier: 3 }
            },
            {
                id: 'artifact22',
                name: 'Ascension Catalyst',
                description: 'Increase power point gain by 150%',
                icon: '🕉️',
                cost: new BigNumber(10),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'powerPoints', amount: new BigNumber(10) },
                type: 'ascension',
                effect: { multiplier: 2.5 }
            },

            // First batch of new artifacts (low-mid tier)
            {
                id: 'artifact23',
                name: 'Essence Droplet',
                description: 'Increase essence gained from channeling by 25%',
                icon: '💧',
                cost: new BigNumber(50),
                purchased: false,
                unlocked: true,
                type: 'channeling',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact24',
                name: 'Whispering Leaf',
                description: 'Increase Whispering Woods production by 25%',
                icon: '🍃',
                cost: new BigNumber(200),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm2', count: 5 } },
                type: 'realm',
                target: 'realm2',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact25',
                name: 'Crystal Shard',
                description: 'Increase Crystal Caverns production by 25%',
                icon: '✨',
                cost: new BigNumber(1000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm3', count: 5 } },
                type: 'realm',
                target: 'realm3',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact26',
                name: 'Dungeon Map',
                description: 'Increase essence rewards from dungeons by 10%',
                icon: '🗺️',
                cost: new BigNumber(2000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(1500) },
                type: 'dungeon',
                effect: { dungeonEssenceReward: 1.1 }
            },
            {
                id: 'artifact27',
                name: 'Minor Essence Stone',
                description: 'Increase all production by 10%',
                icon: '🪨',
                cost: new BigNumber(1500),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(1000) },
                type: 'global',
                effect: { multiplier: 1.1 }
            },
            {
                id: 'artifact28',
                name: 'Waterfall Vial',
                description: 'Increase Astral Waterfall production by 25%',
                icon: '🧪',
                cost: new BigNumber(5000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm4', count: 5 } },
                type: 'realm',
                target: 'realm4',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact29',
                name: 'Ember Fragment',
                description: 'Increase Phoenix Volcano production by 25%',
                icon: '🔥',
                cost: new BigNumber(50000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm5', count: 5 } },
                type: 'realm',
                target: 'realm5',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact30',
                name: 'Dungeon Compass',
                description: 'Increase chance of finding treasure rooms in dungeons by 15%',
                icon: '🧭',
                cost: new BigNumber(7500),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(5000) },
                type: 'dungeon',
                effect: { dungeonLootChance: 1.15 }
            },
            {
                id: 'artifact31',
                name: 'Essence Lens',
                description: 'Channeling has a 1% chance to give 5x essence',
                icon: '🔍',
                cost: new BigNumber(10000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(7500) },
                type: 'channeling',
                effect: { criticalClick: { chance: 0.01, multiplier: 5 } }
            },
            {
                id: 'artifact32',
                name: 'Novice Ascension Rune',
                description: 'Increase power point gain by 10%',
                icon: '🔣',
                cost: new BigNumber(0.5),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'powerPoints', amount: new BigNumber(0.5) },
                type: 'ascension',
                effect: { multiplier: 1.1 }
            },

            // Second batch of new artifacts (low-mid tier)
            {
                id: 'artifact33',
                name: 'Celestial Dust',
                description: 'Increase Celestial Observatory production by 25%',
                icon: '☄️',
                cost: new BigNumber(500000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm6', count: 5 } },
                type: 'realm',
                target: 'realm6',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact34',
                name: 'Void Splinter',
                description: 'Increase Void Gateway production by 25%',
                icon: '🌌',
                cost: new BigNumber(5000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm7', count: 5 } },
                type: 'realm',
                target: 'realm7',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact35',
                name: 'Divine Spark',
                description: 'Increase Divine Nexus production by 25%',
                icon: '⚡',
                cost: new BigNumber(50000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm8', count: 5 } },
                type: 'realm',
                target: 'realm8',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact36',
                name: 'Dungeon Defender',
                description: 'Increase player defense in dungeons by 10%',
                icon: '🛡️',
                cost: new BigNumber(15000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(10000) },
                type: 'dungeon',
                effect: { dungeonDefenseMultiplier: 1.1 }
            },
            {
                id: 'artifact37',
                name: 'Warrior\'s Pendant',
                description: 'Increase player attack in dungeons by 10%',
                icon: '👹',
                cost: new BigNumber(20000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(15000) },
                type: 'dungeon',
                effect: { dungeonAttackMultiplier: 1.1 }
            },
            {
                id: 'artifact38',
                name: 'Healer\'s Charm',
                description: 'Increase player health in dungeons by 10%',
                icon: '❤️',
                cost: new BigNumber(25000),
                purchased: false,
                unlocked: false,
                unlockAt: { resource: 'essence', amount: new BigNumber(20000) },
                type: 'dungeon',
                effect: { dungeonHealthMultiplier: 1.1 }
            },
            {
                id: 'artifact39',
                name: 'Essence Infused Quill',
                description: 'Increase Ethereal Library production by 25%',
                icon: '📝',
                cost: new BigNumber(500000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm9', count: 5 } },
                type: 'realm',
                target: 'realm9',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact40',
                name: 'Temporal Sand',
                description: 'Increase Temporal Oasis production by 25%',
                icon: '🐌',
                cost: new BigNumber(5000000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm10', count: 5 } },
                type: 'realm',
                target: 'realm10',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact41',
                name: 'Thought Fragment',
                description: 'Increase Mindscape Labyrinth production by 25%',
                icon: '🧠',
                cost: new BigNumber(50000000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm11', count: 5 } },
                type: 'realm',
                target: 'realm11',
                effect: { multiplier: 1.25 }
            },
            {
                id: 'artifact42',
                name: 'Elemental Catalyst',
                description: 'Increase Elemental Forge production by 25%',
                icon: '🔥',
                cost: new BigNumber(500000000000),
                purchased: false,
                unlocked: false,
                unlockAt: { realmCount: { id: 'realm12', count: 5 } },
                type: 'realm',
                target: 'realm12',
                effect: { multiplier: 1.25 }
            },

            // Third batch - Ascension-locked artifacts (scaling from 1 to 20 ascensions)
            {
                id: 'artifact43',
                name: 'Ascendant\'s Blessing',
                description: 'Increase essence production by 5% for each ascension completed (currently: 5%)',
                icon: '👼',
                cost: new BigNumber(5),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 1 },
                type: 'ascension',
                effect: { ascensionProductionBonus: 0.05 }
            },
            {
                id: 'artifact44',
                name: 'Realm Harmonizer',
                description: 'Each realm type boosts overall production by 1% for each ascension completed (currently: 1%)',
                icon: '🎵',
                cost: new BigNumber(8),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 2 },
                type: 'ascension',
                effect: { ascensionSynergyBonus: 0.01 }
            },
            {
                id: 'artifact45',
                name: 'Dungeon Master\'s Sigil',
                description: 'Increase dungeon rewards by 3% for each ascension completed (currently: 3%)',
                icon: '🎲',
                cost: new BigNumber(12),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 3 },
                type: 'ascension',
                effect: { ascensionDungeonRewardBonus: 0.03 }
            },
            {
                id: 'artifact46',
                name: 'Channeler\'s Focus',
                description: 'Increase essence from channeling by 10% for each ascension completed (currently: 10%)',
                icon: '🔮',
                cost: new BigNumber(15),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 4 },
                type: 'ascension',
                effect: { ascensionChannelingBonus: 0.1 }
            },
            {
                id: 'artifact47',
                name: 'Cosmic Keystone',
                description: 'Reduce realm costs by 1% for each ascension completed (currently: 1%)',
                icon: '🔑',
                cost: new BigNumber(20),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 5 },
                type: 'ascension',
                effect: { ascensionCostReduction: 0.01 }
            },
            {
                id: 'artifact48',
                name: 'Essence Nexus',
                description: 'Gain 2% more essence for each realm owned for each ascension completed (currently: 2%)',
                icon: '🔹',
                cost: new BigNumber(25),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 7 },
                type: 'ascension',
                effect: { ascensionRealmCountBonus: 0.02 }
            },
            {
                id: 'artifact49',
                name: 'Transcendent Hourglass',
                description: 'Increase game speed by 2% for each ascension completed (currently: 2%)',
                icon: '⏳',
                cost: new BigNumber(30),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 9 },
                type: 'ascension',
                effect: { ascensionGameSpeedBonus: 0.02 }
            },
            {
                id: 'artifact50',
                name: 'Dimensional Anchor',
                description: 'Increase power point gain by 5% for each ascension completed (currently: 5%)',
                icon: '⚓️',
                cost: new BigNumber(40),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 12 },
                type: 'ascension',
                effect: { ascensionPowerPointBonus: 0.05 }
            },
            {
                id: 'artifact51',
                name: 'Quantum Stabilizer',
                description: 'Each realm boosts the production of all others by 0.5% for each ascension completed (currently: 0.5%)',
                icon: '🔄',
                cost: new BigNumber(50),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 15 },
                type: 'ascension',
                effect: { ascensionQuantumSynergyBonus: 0.005 }
            },
            {
                id: 'artifact52',
                name: 'Infinity Prism',
                description: 'All effects are 1% stronger for each ascension completed (currently: 1%)',
                icon: '⊛',
                cost: new BigNumber(75),
                costResource: 'powerPoints',
                purchased: false,
                unlocked: false,
                unlockAt: { ascensionCount: 20 },
                type: 'ascension',
                effect: { ascensionMetaMultiplierBonus: 0.01 }
            }
        ];

       // Powers (formerly skills)
       this.powers = [
        // Cost: 1
        {
            id: 'power1',
            name: 'Essence Mastery',
            description: 'Increase all production by 25%',
            icon: '✦',
            cost: new BigNumber(1),
            purchased: false,
            unlocked: true,
            effect: { multiplier: 1.25 },
            position: { x: 0, y: 0 }
        },
        {
            id: 'power2',
            name: 'Efficient Channeling',
            description: 'Reduce all realm costs by 10%',
            icon: '🔄',
            cost: new BigNumber(1),
            purchased: false,
            unlocked: true,
            effect: { costReduction: 0.9 },
            position: { x: 1, y: 0 }
        },
        {
            id: 'power3',
            name: 'Focused Will',
            description: 'Double essence from channeling',
            icon: '🧠',
            cost: new BigNumber(1),
            purchased: false,
            unlocked: true,
            effect: { clickMultiplier: 2 },
            position: { x: 2, y: 0 }
        },

        // Cost: 3
        {
            id: 'power21',
            name: 'Dungeon Mastery',
            description: 'Increase dungeon player attack by 20%',
            icon: '⚔️',
            cost: new BigNumber(3),
            purchased: false,
            unlocked: true,
            effect: { dungeonAttackMultiplier: 1.2 },
            position: { x: 3, y: 0 }
        },
        {
            id: 'power22',
            name: 'Vitality Surge',
            description: 'Increase dungeon player health by 25%',
            icon: '❤️',
            cost: new BigNumber(3),
            purchased: false,
            unlocked: false,
            requires: ['power21'],
            effect: { dungeonHealthMultiplier: 1.25 },
            position: { x: 4, y: 0 }
        },
        {
            id: 'power4',
            name: 'Harmonic Nature',
            description: 'Triple production of natural realms',
            icon: '☯',
            cost: new BigNumber(3),
            purchased: false,
            unlocked: false,
            requires: ['power1'],
            effect: { realmMultiplier: { targets: ['realm1', 'realm2', 'realm3'], multiplier: 3 } },
            position: { x: 0, y: 1 }
        },
        {
            id: 'power5',
            name: 'Cosmic Attunement',
            description: 'Triple production of celestial realms',
            icon: '🌠',
            cost: new BigNumber(3),
            purchased: false,
            unlocked: false,
            requires: ['power1'],
            effect: { realmMultiplier: { targets: ['realm6', 'realm7', 'realm8'], multiplier: 3 } },
            position: { x: 1, y: 1 }
        },
        {
            id: 'power6',
            name: 'Resource Manipulation',
            description: 'Further reduce realm costs by 15%',
            icon: '💰',
            cost: new BigNumber(3),
            purchased: false,
            unlocked: false,
            requires: ['power2'],
            effect: { costReduction: 0.85 },
            position: { x: 2, y: 1 }
        },

        // Cost: 6
        {
            id: 'power7',
            name: 'Essence Synergy',
            description: 'Each realm type boosts overall production by 5%',
            icon: '🔗',
            cost: new BigNumber(6),
            purchased: false,
            unlocked: false,
            requires: ['power4', 'power5'],
            effect: { synergy: true },
            position: { x: 3, y: 1 }
        },

        // Cost: 7
        {
            id: 'power9',
            name: 'Elemental Mastery',
            description: 'Triple production of elemental realms',
            icon: '🔥',
            cost: new BigNumber(7),
            purchased: false,
            unlocked: false,
            requires: ['power4'],
            effect: { realmMultiplier: { targets: ['realm4', 'realm5'], multiplier: 3 } },
            position: { x: 4, y: 1 }
        },
        {
            id: 'power23',
            name: 'Defensive Stance',
            description: 'Increase dungeon player defense by 30%',
            icon: '🛡️',
            cost: new BigNumber(7),
            purchased: false,
            unlocked: false,
            requires: ['power21'],
            effect: { dungeonDefenseMultiplier: 1.3 },
            position: { x: 0, y: 2 }
        },

        // Cost: 8
        {
            id: 'power8',
            name: 'Soul Amplification',
            description: 'Increase power point gain by 100%',
            icon: '⭐',
            cost: new BigNumber(8),
            purchased: false,
            unlocked: false,
            requires: ['power7'],
            effect: { ascensionMultiplier: 2 },
            position: { x: 1, y: 2 }
        },
        {
            id: 'power24',
            name: 'Lucky Explorer',
            description: 'Increase chance of finding treasure in dungeons by 20%',
            icon: '🍀',
            cost: new BigNumber(8),
            purchased: false,
            unlocked: false,
            requires: ['power22'],
            effect: { dungeonLootChance: 1.2 },
            position: { x: 2, y: 2 }
        },

        // Cost: 10
        {
            id: 'power27',
            name: 'Essence Acceleration',
            description: 'Gain 1% more essence for each realm owned',
            icon: '🚀',
            cost: new BigNumber(10),
            purchased: false,
            unlocked: false,
            requires: ['power3'],
            effect: { realmCountBonus: true },
            position: { x: 3, y: 2 }
        },

        // Cost: 12
        {
            id: 'power10',
            name: 'Quantum Entanglement',
            description: 'Each realm boosts the production of all others by 2%',
            icon: '🔄',
            cost: new BigNumber(12),
            purchased: false,
            unlocked: false,
            requires: ['power7'],
            effect: { quantumSynergy: true },
            position: { x: 4, y: 2 }
        },

        // Cost: 15
        {
            id: 'power11',
            name: 'Dimensional Folding',
            description: 'Reduce all realm costs by 20%',
            icon: '🗺️',
            cost: new BigNumber(15),
            purchased: false,
            unlocked: false,
            requires: ['power6'],
            effect: { costReduction: 0.8 },
            position: { x: 0, y: 3 }
        },
        {
            id: 'power25',
            name: 'Essence Hunter',
            description: 'Increase essence rewards from dungeons by 50%',
            icon: '💎',
            cost: new BigNumber(15),
            purchased: false,
            unlocked: false,
            requires: ['power24'],
            effect: { dungeonEssenceReward: 1.5 },
            position: { x: 1, y: 3 }
        },

        // Cost: 20
        {
            id: 'power13',
            name: 'Essence Crystallization',
            description: 'Clicking has a 5% chance to give 10x essence',
            icon: '💎',
            cost: new BigNumber(20),
            purchased: false,
            unlocked: false,
            requires: ['power3'],
            effect: { criticalClick: { chance: 0.05, multiplier: 10 } },
            position: { x: 2, y: 3 }
        },
        {
            id: 'power29',
            name: 'Realm Harmony',
            description: 'Each realm type reduces the cost of all realms by 1%',
            icon: '🎵',
            cost: new BigNumber(20),
            purchased: false,
            unlocked: false,
            requires: ['power6'],
            effect: { realmTypeCostReduction: true },
            position: { x: 3, y: 3 }
        },

        // Cost: 25
        {
            id: 'power12',
            name: 'Temporal Acceleration',
            description: 'Increase game speed by 25%',
            icon: '⏳',
            cost: new BigNumber(25),
            purchased: false,
            unlocked: false,
            requires: ['power11'],
            effect: { gameSpeed: 1.25 },
            position: { x: 4, y: 3 }
        },

        // Cost: 30
        {
            id: 'power14',
            name: 'Cosmic Insight',
            description: 'Increase all production by 50%',
            icon: '🌌',
            cost: new BigNumber(30),
            purchased: false,
            unlocked: false,
            requires: ['power5'],
            effect: { multiplier: 1.5 },
            position: { x: 0, y: 4 }
        },
        {
            id: 'power26',
            name: 'Skill Savant',
            description: 'Gain 25% more dungeon skill points',
            icon: '📚',
            cost: new BigNumber(30),
            purchased: false,
            unlocked: false,
            requires: ['power23', 'power25'],
            effect: { dungeonSkillPointBonus: 1.25 },
            position: { x: 1, y: 4 }
        },

        // Cost: 40
        {
            id: 'power15',
            name: 'Ethereal Resonance',
            description: 'Triple production of mystical realms',
            icon: '🌊',
            cost: new BigNumber(40),
            purchased: false,
            unlocked: false,
            requires: ['power5', 'power9'],
            effect: { realmMultiplier: { targets: ['realm9', 'realm10', 'realm11'], multiplier: 3 } },
            position: { x: 2, y: 4 }
        },
        {
            id: 'power28',
            name: 'Midas Touch',
            description: 'Channeling has a 2% chance to give 50x essence',
            icon: '👆',
            cost: new BigNumber(40),
            purchased: false,
            unlocked: false,
            requires: ['power13'],
            effect: { criticalClick: { chance: 0.02, multiplier: 50 } },
            position: { x: 3, y: 4 }
        },

        // Cost: 50
        {
            id: 'power16',
            name: 'Ascendant Will',
            description: 'Increase power point gain by 150%',
            icon: '💥',
            cost: new BigNumber(50),
            purchased: false,
            unlocked: false,
            requires: ['power8'],
            effect: { ascensionMultiplier: 2.5 },
            position: { x: 4, y: 4 }
        },
        {
            id: 'power31',
            name: 'Essence Overflow',
            description: 'Gain 10% more essence for each realm owned',
            icon: '🌊',
            cost: new BigNumber(50),
            purchased: false,
            unlocked: false,
            requires: ['power14'],
            effect: { realmCountBonus10: true },
            position: { x: 0, y: 5 }
        },

        // Cost: 60
        {
            id: 'power30',
            name: 'Time Dilation',
            description: 'Increase game speed by an additional 25%',
            icon: '⏱️',
            cost: new BigNumber(60),
            purchased: false,
            unlocked: false,
            requires: ['power12'],
            effect: { gameSpeed: 1.25 },
            position: { x: 1, y: 5 }
        },

        // Cost: 75
        {
            id: 'power17',
            name: 'Reality Manipulation',
            description: 'Increase all production by 100%',
            icon: '🌎',
            cost: new BigNumber(75),
            purchased: false,
            unlocked: false,
            requires: ['power14', 'power15'],
            effect: { multiplier: 2 },
            position: { x: 2, y: 5 }
        },

        // Cost: 80
        {
            id: 'power32',
            name: 'Cosmic Balance',
            description: 'Gain 10% more power points and essence',
            icon: '☯️',
            cost: new BigNumber(80),
            purchased: false,
            unlocked: false,
            requires: ['power16', 'power29'],
            effect: { balanceBonus: 1.1 },
            position: { x: 3, y: 5 }
        },

        // Cost: 100
        {
            id: 'power18',
            name: 'Transcendent Essence',
            description: 'Multiply essence from channeling by 5',
            icon: '✨',
            cost: new BigNumber(100),
            purchased: false,
            unlocked: false,
            requires: ['power13', 'power16'],
            effect: { clickMultiplier: 5 },
            position: { x: 4, y: 5 }
        },

        // Cost: 120
        {
            id: 'power19',
            name: 'Cosmic Synergy',
            description: 'Each realm type boosts overall production by 10%',
            icon: '⚛️',
            cost: new BigNumber(120),
            purchased: false,
            unlocked: false,
            requires: ['power10', 'power18'],
            effect: { synergy: true, synergyMultiplier: 0.1 },
            position: { x: 0, y: 6 }
        },

        // Cost: 200
        {
            id: 'power20',
            name: 'Omniscience',
            description: 'All effects are 50% stronger',
            icon: '👁️',
            cost: new BigNumber(200),
            purchased: false,
            unlocked: false,
            requires: ['power17'],
            effect: { metaMultiplier: 1.5 },
            position: { x: 1, y: 6 }
        }
    ];

        // Feats (formerly achievements)
        this.feats = [
            // Early Game Feats
            {
                id: 'feat1',
                name: 'First Steps',
                description: 'Channel your first 10 essence',
                icon: '🌱',
                earned: false,
                hidden: false,
                condition: { resource: 'essence', amount: new BigNumber(10) }
            },
            {
                id: 'feat2',
                name: 'Gathering Power',
                description: 'Channel 1,000 essence',
                icon: '🌿',
                earned: false,
                hidden: false,
                condition: { resource: 'essence', amount: new BigNumber(1000) }
            },
            {
                id: 'feat3',
                name: 'Essence Sovereign',
                description: 'Channel 1,000,000 essence',
                icon: '🌲',
                earned: false,
                hidden: false,
                condition: { resource: 'essence', amount: new BigNumber(1000000) }
            },
            {
                id: 'feat4',
                name: 'Garden Keeper',
                description: 'Own 50 Luminous Gardens',
                icon: '🏡',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm1', count: 50 } }
            },
            {
                id: 'feat5',
                name: 'Forest Guardian',
                description: 'Own 50 Whispering Woods',
                icon: '🌳',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm2', count: 50 } }
            },
            {
                id: 'feat6',
                name: 'Crystal Collector',
                description: 'Own 50 Crystal Caverns',
                icon: '💎',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm3', count: 50 } }
            },
            {
                id: 'feat7',
                name: 'Transcendence',
                description: 'Perform your first ascension',
                icon: '🔆',
                earned: false,
                hidden: false,
                condition: { ascensionCount: 1 }
            },
            {
                id: 'feat8',
                name: 'Archmage',
                description: 'Master 5 arcane powers',
                icon: '🧙',
                earned: false,
                hidden: false,
                condition: { powerCount: 5 }
            },
            // New Early Game Feats
            {
                id: 'feat_early1',
                name: 'First Bloom',
                description: 'Create your first Luminous Garden',
                icon: '🌷',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm1', count: 1 } }
            },
            {
                id: 'feat_early2',
                name: 'Whispers of Nature',
                description: 'Create your first Whispering Wood',
                icon: '🍃',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm2', count: 1 } }
            },
            {
                id: 'feat_early3',
                name: 'Crystal Finder',
                description: 'Create your first Crystal Cavern',
                icon: '✨',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm3', count: 1 } }
            },
            {
                id: 'feat_early4',
                name: 'Essence Novice',
                description: 'Channel 100 essence',
                icon: '💫',
                earned: false,
                hidden: false,
                condition: { resource: 'essence', amount: new BigNumber(100) }
            },
            {
                id: 'feat_early5',
                name: 'Essence Adept',
                description: 'Channel 10,000 essence',
                icon: '🔮',
                earned: false,
                hidden: false,
                condition: { resource: 'essence', amount: new BigNumber(10000) }
            },
            {
                id: 'feat_early6',
                name: 'Realm Enthusiast',
                description: 'Own a total of 10 realms',
                icon: '🏞️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'totalRealmCount10' }
            },
            {
                id: 'feat_early7',
                name: 'Realm Explorer',
                description: 'Own at least one of 3 different realm types',
                icon: '🧭',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'differentRealmTypes3' }
            },
            {
                id: 'feat_early8',
                name: 'First Power',
                description: 'Master your first arcane power',
                icon: '⚡',
                earned: false,
                hidden: false,
                condition: { powerCount: 1 }
            },
            {
                id: 'feat_early9',
                name: 'Artifact Discoverer',
                description: 'Acquire your first artifact',
                icon: '🏺',
                earned: false,
                hidden: false,
                condition: { artifactCount: 1 }
            },
            {
                id: 'feat_early10',
                name: 'Feat Collector',
                description: 'Earn 5 feats',
                icon: '🎯',
                earned: false,
                hidden: false,
                condition: { featCount: 5 }
            },
            // New feats
            {
                id: 'feat9',
                name: 'Waterfall Keeper',
                description: 'Own 50 Astral Waterfalls',
                icon: '🌊',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm4', count: 50 } }
            },
            {
                id: 'feat10',
                name: 'Flame Tamer',
                description: 'Own 50 Phoenix Volcanoes',
                icon: '🔥',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm5', count: 50 } }
            },
            {
                id: 'feat11',
                name: 'Stargazer',
                description: 'Own 50 Celestial Observatories',
                icon: '🌌',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm6', count: 50 } }
            },
            {
                id: 'feat12',
                name: 'Void Walker',
                description: 'Own 50 Void Gateways',
                icon: '⚫',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm7', count: 50 } }
            },
            {
                id: 'feat13',
                name: 'Divine Favor',
                description: 'Own 50 Divine Nexuses',
                icon: '✨',
                earned: false,
                hidden: false,
                condition: { realmCount: { id: 'realm8', count: 50 } }
            },
            {
                id: 'feat14',
                name: 'Essence Billionaire',
                description: 'Channel 1,000,000,000 essence',
                icon: '🌟',
                earned: false,
                hidden: false,
                condition: { resource: 'essence', amount: new BigNumber(1000000000) }
            },
            {
                id: 'feat15',
                name: 'Essence Trillionaire',
                description: 'Channel 1,000,000,000,000 essence',
                icon: '🌠',
                earned: false,
                hidden: false,
                condition: { resource: 'essence', amount: new BigNumber(1000000000000) }
            },
            {
                id: 'feat16',
                name: 'Ascension Master',
                description: 'Perform 10 ascensions',
                icon: '🚀',
                earned: false,
                hidden: false,
                condition: { ascensionCount: 10 }
            },
            {
                id: 'feat17',
                name: 'Ascension Grandmaster',
                description: 'Perform 25 ascensions',
                icon: '👽',
                earned: false,
                hidden: false,
                condition: { ascensionCount: 25 }
            },
            {
                id: 'feat18',
                name: 'Power Overwhelming',
                description: 'Master 10 arcane powers',
                icon: '🧠',
                earned: false,
                hidden: false,
                condition: { powerCount: 10 }
            },
            {
                id: 'feat19',
                name: 'Supreme Archmage',
                description: 'Master 15 arcane powers',
                icon: '👑',
                earned: false,
                hidden: false,
                condition: { powerCount: 15 }
            },
            {
                id: 'feat20',
                name: 'Omnipotent',
                description: 'Master all arcane powers',
                icon: '🌍',
                earned: false,
                hidden: false,
                condition: { powerCount: 20 }
            },
            {
                id: 'feat21',
                name: 'Realm Collector',
                description: 'Own at least one of each realm type',
                icon: '🌎',
                earned: false,
                hidden: false,
                condition: { allRealms: true }
            },
            {
                id: 'feat22',
                name: 'Artifact Hunter',
                description: 'Acquire 10 artifacts',
                icon: '🔮',
                earned: false,
                hidden: false,
                condition: { artifactCount: 10 }
            },
            {
                id: 'feat23',
                name: 'Artifact Collector',
                description: 'Acquire 20 artifacts',
                icon: '💎',
                earned: false,
                hidden: false,
                condition: { artifactCount: 20 }
            },
            {
                id: 'feat24',
                name: 'Legendary Feat',
                description: 'Earn 20 feats',
                icon: '🏆',
                earned: false,
                hidden: false,
                condition: { featCount: 20 }
            },
            // Legendary Feats - Batch 1
            {
                id: 'feat25',
                name: 'Philosopher King',
                description: 'Find the Philosopher\'s Stone and reach 1 trillion essence',
                icon: '🔴',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'philosopherStoneAndEssence' }
            },
            {
                id: 'feat26',
                name: 'Celestial Navigator',
                description: 'Own the Celestial Compass and 100 of each celestial realm',
                icon: '🧭',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'compassAndCelestialRealms' }
            },
            {
                id: 'feat27',
                name: 'Time Lord',
                description: 'Possess the Chronos Fragment and Temporal Acceleration power',
                icon: '⏱️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'chronosAndTemporal' }
            },
            {
                id: 'feat28',
                name: 'Void Emperor',
                description: 'Own 100 Void Gateways and the Void Chalice',
                icon: '⚫',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'voidGatewaysAndChalice' }
            },
            {
                id: 'feat29',
                name: 'Ethereal Warrior',
                description: 'Defeat 100 dungeon enemies with the Ethereal Blade',
                icon: '⚔️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'etherealBladeKills' }
            },
            {
                id: 'feat30',
                name: 'Arcane Defender',
                description: 'Survive 50 dungeon encounters with the Arcane Shield',
                icon: '🛡️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'arcaneShieldSurvival' }
            },
            {
                id: 'feat31',
                name: 'Fortune\'s Favorite',
                description: 'Find 25 treasures with Fortune\'s Dice',
                icon: '🎲',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'fortuneDiceTreasures' }
            },
            {
                id: 'feat32',
                name: 'Essence Channeler',
                description: 'Channel 1 quadrillion essence with the Essence Prism',
                icon: '🔷',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'essencePrismChanneling' }
            },
            {
                id: 'feat33',
                name: 'Ascendant Being',
                description: 'Perform 50 ascensions with the Ascendant\'s Hourglass',
                icon: '⌛',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'hourglassAscensions' }
            },
            {
                id: 'feat34',
                name: 'Realm Architect',
                description: 'Own 100 of each realm with the Realm Keystone',
                icon: '🗝️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'keystoneAllRealms' }
            },
            // Legendary Feats - Batch 2
            {
                id: 'feat35',
                name: 'Soul Illuminator',
                description: 'Earn 100 skill points with the Soul Lantern',
                icon: '🏮',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'soulLanternSkillPoints' }
            },
            {
                id: 'feat36',
                name: 'Crown of Creation',
                description: 'Defeat 10 dungeon bosses with the Crown of Dominion',
                icon: '👑',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'crownBossDefeats' }
            },
            {
                id: 'feat37',
                name: 'Elemental Overlord',
                description: 'Master Elemental Mastery power and own 200 of each elemental realm',
                icon: '🔥',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'elementalMasteryAndRealms' }
            },
            {
                id: 'feat38',
                name: 'Quantum Architect',
                description: 'Master Quantum Entanglement power and own 20 of each realm type',
                icon: '🔄',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'quantumEntanglementAndRealms' }
            },
            {
                id: 'feat39',
                name: 'Dimensional Weaver',
                description: 'Master Dimensional Folding power and own 1000 total realms',
                icon: '🗺️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dimensionalFoldingAndRealms' }
            },
            {
                id: 'feat40',
                name: 'Chronomancer',
                description: 'Master Temporal Acceleration and Time Dilation powers',
                icon: '⏳',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'temporalAndTimeDilation' }
            },
            {
                id: 'feat41',
                name: 'Crystal Sage',
                description: 'Master Essence Crystallization power and own 200 Crystal Caverns',
                icon: '💎',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'crystallizationAndCaverns' }
            },
            {
                id: 'feat42',
                name: 'Cosmic Visionary',
                description: 'Master Cosmic Insight and Cosmic Attunement powers',
                icon: '🌌',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'cosmicInsightAndAttunement' }
            },
            {
                id: 'feat43',
                name: 'Ethereal Resonator',
                description: 'Master Ethereal Resonance power and own 150 of each mystical realm',
                icon: '🌊',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'etherealResonanceAndRealms' }
            },
            {
                id: 'feat44',
                name: 'Ascension Master',
                description: 'Master Ascendant Will power and perform 100 ascensions',
                icon: '💥',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'ascendantWillAndAscensions' }
            },
            // Legendary Feats - Batch 3
            {
                id: 'feat45',
                name: 'Reality Shaper',
                description: 'Master Reality Manipulation power and own 500 of each realm',
                icon: '🌎',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'realityManipulationAndRealms' }
            },
            {
                id: 'feat46',
                name: 'Transcendent One',
                description: 'Master Transcendent Essence power and channel 1 quintillion essence',
                icon: '✨',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'transcendentEssenceAndChanneling' }
            },
            {
                id: 'feat47',
                name: 'Cosmic Harmonizer',
                description: 'Master Cosmic Synergy power and own at least 50 of each realm',
                icon: '⚛️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'cosmicSynergyAndRealms' }
            },
            {
                id: 'feat48',
                name: 'All-Seeing',
                description: 'Master Omniscience power and discover all artifacts',
                icon: '👁️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'omniscienceAndArtifacts' }
            },
            {
                id: 'feat49',
                name: 'Dungeon Master',
                description: 'Master all dungeon-related powers and defeat 300 enemies',
                icon: '⚔️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonPowersAndEnemies' }
            },
            {
                id: 'feat50',
                name: 'Essence Accelerator',
                description: 'Master Essence Acceleration power and own 2000 total realms',
                icon: '🚀',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'essenceAccelerationAndRealms' }
            },
            {
                id: 'feat51',
                name: 'Golden Touch',
                description: 'Master Midas Touch power and trigger 100 critical clicks',
                icon: '👆',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'midasTouchAndCriticals' }
            },
            {
                id: 'feat52',
                name: 'Harmonic Convergence',
                description: 'Master Realm Harmony power and own all realm types',
                icon: '🎵',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'realmHarmonyAndAllTypes' }
            },
            {
                id: 'feat53',
                name: 'Essence Tsunami',
                description: 'Master Essence Overflow power and reach 1 quintillion essence',
                icon: '🌊',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'essenceOverflowAndAmount' }
            },
            {
                id: 'feat54',
                name: 'Perfect Balance',
                description: 'Master Cosmic Balance power, perform 50 ascensions, and own 100 of each realm',
                icon: '☯️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'cosmicBalanceAscensionsAndRealms' }
            },
            // Manual Click Feats - Block 1
            {
                id: 'feat55',
                name: 'Essence Tapper',
                description: 'Channel essence manually 100 times',
                icon: '👆',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'manualClicks100' }
            },
            {
                id: 'feat56',
                name: 'Dedicated Channeler',
                description: 'Channel essence manually 500 times',
                icon: '✌️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'manualClicks500' }
            },
            {
                id: 'feat57',
                name: 'Essence Devotee',
                description: 'Channel essence manually 1,000 times',
                icon: '👐',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'manualClicks1000' }
            },
            {
                id: 'feat58',
                name: 'Essence Fanatic',
                description: 'Channel essence manually 5,000 times',
                icon: '🙌',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'manualClicks5000' }
            },
            {
                id: 'feat59',
                name: 'Essence Zealot',
                description: 'Channel essence manually 10,000 times',
                icon: '🤲',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'manualClicks10000' }
            },
            // Production Feats - Block 1
            {
                id: 'feat60',
                name: 'Essence Flow',
                description: 'Reach 100 essence per second production',
                icon: '💧',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'production100' }
            },
            {
                id: 'feat61',
                name: 'Essence Stream',
                description: 'Reach 1,000 essence per second production',
                icon: '🌊',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'production1000' }
            },
            {
                id: 'feat62',
                name: 'Essence River',
                description: 'Reach 10,000 essence per second production',
                icon: '🌊',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'production10000' }
            },
            {
                id: 'feat63',
                name: 'Essence Ocean',
                description: 'Reach 100,000 essence per second production',
                icon: '🌊',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'production100000' }
            },
            {
                id: 'feat64',
                name: 'Essence Tsunami',
                description: 'Reach 1,000,000 essence per second production',
                icon: '🌊',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'production1000000' }
            },
            // Dungeon Feats - Block 1 (Runs)
            {
                id: 'feat65',
                name: 'Dungeon Novice',
                description: 'Enter a dungeon for the first time',
                icon: '🚩',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRuns1' }
            },
            {
                id: 'feat66',
                name: 'Dungeon Explorer',
                description: 'Complete 5 dungeon runs',
                icon: '🔓',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRuns5' }
            },
            {
                id: 'feat67',
                name: 'Dungeon Delver',
                description: 'Complete 25 dungeon runs',
                icon: '🗝️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRuns25' }
            },
            {
                id: 'feat68',
                name: 'Dungeon Master',
                description: 'Complete 100 dungeon runs',
                icon: '💼',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRuns100' }
            },
            {
                id: 'feat69',
                name: 'Dungeon Legend',
                description: 'Complete 500 dungeon runs',
                icon: '🎖️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRuns500' }
            },
            // Dungeon Feats - Block 2 (Wins)
            {
                id: 'feat70',
                name: 'First Victory',
                description: 'Win your first dungeon by defeating the boss',
                icon: '🌟',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonWins1' }
            },
            {
                id: 'feat71',
                name: 'Dungeon Conqueror',
                description: 'Win 10 dungeons by defeating the boss',
                icon: '🎆',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonWins10' }
            },
            {
                id: 'feat72',
                name: 'Dungeon Overlord',
                description: 'Win 50 dungeons by defeating the boss',
                icon: '🎇',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonWins50' }
            },
            {
                id: 'feat73',
                name: 'Dungeon Sovereign',
                description: 'Win 100 dungeons by defeating the boss',
                icon: '🎈',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonWins100' }
            },
            {
                id: 'feat74',
                name: 'Dungeon God',
                description: 'Win 250 dungeons by defeating the boss',
                icon: '🎉',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonWins250' }
            },
            // Dungeon Feats - Block 3 (Rooms)
            {
                id: 'feat75',
                name: 'Room Explorer',
                description: 'Visit 50 dungeon rooms',
                icon: '🚪',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRooms50' }
            },
            {
                id: 'feat76',
                name: 'Room Cartographer',
                description: 'Visit 250 dungeon rooms',
                icon: '🗺️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRooms250' }
            },
            {
                id: 'feat77',
                name: 'Room Surveyor',
                description: 'Visit 500 dungeon rooms',
                icon: '📍',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRooms500' }
            },
            {
                id: 'feat78',
                name: 'Room Collector',
                description: 'Visit 1,000 dungeon rooms',
                icon: '📋',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRooms1000' }
            },
            {
                id: 'feat79',
                name: 'Room Archivist',
                description: 'Visit 2,500 dungeon rooms',
                icon: '📂',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'dungeonRooms2500' }
            },
            // Dungeon Feats - Block 4 (Enemies)
            {
                id: 'feat80',
                name: 'Enemy Novice',
                description: 'Defeat 10 dungeon enemies',
                icon: '👻',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'enemiesDefeated10' }
            },
            {
                id: 'feat81',
                name: 'Enemy Apprentice',
                description: 'Defeat 50 dungeon enemies',
                icon: '💀',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'enemiesDefeated50' }
            },
            {
                id: 'feat82',
                name: 'Enemy Slayer',
                description: 'Defeat 100 dungeon enemies',
                icon: '⚔️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'enemiesDefeated100' }
            },
            {
                id: 'feat83',
                name: 'Enemy Hunter',
                description: 'Defeat 500 dungeon enemies',
                icon: '🗡️',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'enemiesDefeated500' }
            },
            {
                id: 'feat84',
                name: 'Enemy Vanquisher',
                description: 'Defeat 1,000 dungeon enemies',
                icon: '💥',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'enemiesDefeated1000' }
            },
            // Critical Click Feats
            {
                id: 'feat85',
                name: 'Lucky Channel',
                description: 'Get your first critical essence channel',
                icon: '🍀',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'criticalClicks1' }
            },
            {
                id: 'feat86',
                name: 'Critical Channeler',
                description: 'Get 50 critical essence channels',
                icon: '🍁',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'criticalClicks50' }
            },
            {
                id: 'feat87',
                name: 'Critical Master',
                description: 'Get 250 critical essence channels',
                icon: '🌻',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'criticalClicks250' }
            },
            {
                id: 'feat88',
                name: 'Critical Expert',
                description: 'Get 1,000 critical essence channels',
                icon: '🌟',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'criticalClicks1000' }
            },
            {
                id: 'feat89',
                name: 'Critical Virtuoso',
                description: 'Get 5,000 critical essence channels',
                icon: '✨',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'criticalClicks5000' }
            },
            // Treasure Room Feats
            {
                id: 'feat90',
                name: 'Treasure Hunter',
                description: 'Find 10 treasure rooms in dungeons',
                icon: '💰',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'treasureRooms10' }
            },
            {
                id: 'feat91',
                name: 'Treasure Seeker',
                description: 'Find 50 treasure rooms in dungeons',
                icon: '💸',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'treasureRooms50' }
            },
            {
                id: 'feat92',
                name: 'Treasure Collector',
                description: 'Find 100 treasure rooms in dungeons',
                icon: '💲',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'treasureRooms100' }
            },
            {
                id: 'feat93',
                name: 'Treasure Hoarder',
                description: 'Find 250 treasure rooms in dungeons',
                icon: '🥞',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'treasureRooms250' }
            },
            {
                id: 'feat94',
                name: 'Treasure Master',
                description: 'Find 500 treasure rooms in dungeons',
                icon: '💎',
                earned: false,
                hidden: false,
                condition: { specialCondition: 'treasureRooms500' }
            }
        ];

        // Game loop variables
        this.lastUpdate = Date.now();
        this.saveTimer = 0;

        // Initialize
        this.init();
    }

    init() {
        // Cache DOM elements for better performance
        this.cacheDOMElements();

        // Try to load saved game
        this.loadGame();

        // Try to load active dungeon state
        const dungeonLoaded = this.loadDungeonState();

        // Initialize UI update interval from settings
        this._uiUpdateInterval = this.settings.uiUpdateRate;

        // Initialize realm update tracking
        this._realmUpdateState = {
            lastFullUpdate: 0,
            needsFullUpdate: true, // Force initial update
            needsAffordabilityUpdate: false,
            updateInterval: 2000, // 2 seconds between full realm grid updates
            isUpdating: false // Flag to prevent concurrent updates
        }

        // Initialize affordability update tracking
        this._affordabilityUpdateInProgress = false;
        this._lastAffordabilityUpdate = 0;
        this._affordabilityUpdateInterval = 250; // 250ms between affordability updates

        // Apply performance settings
        this.applyVisualEffectsSettings();

        // Set initial values for performance settings in the UI
        document.getElementById('visual-effects').value = this.settings.visualEffects;
        document.getElementById('particle-count').value = this.settings.particleCount;
        document.getElementById('ui-update-rate').value = this.settings.uiUpdateRate;

        // Update UI
        this.updateUI();

        // Create particles based on settings
        this.createParticles();

        // Initialize dungeon UI
        this.initDungeonUI();

        // If a dungeon was loaded and is active, switch to the dungeon tab
        if (dungeonLoaded && this.dungeon.active) {
            // Force the dungeon interface to be visible
            if (this.domCache.dungeonPlaceholder) {
                this.domCache.dungeonPlaceholder.style.display = 'none';
            }
            const dungeonInterface = document.getElementById('dungeon-interface');
            if (dungeonInterface) {
                dungeonInterface.style.display = 'flex';
            }

            // Switch to the dungeon tab with a slight delay to ensure everything is loaded
            setTimeout(() => {
                const dungeonTab = document.querySelector('.tab[data-tab="dungeons"]');
                if (dungeonTab) {
                    dungeonTab.click();
                }
                this.updateDungeonUI();
            }, 200);
        }

        // Start game loop
        this.gameLoop();

        // Set up event listeners
        this.setupEventListeners();
    }

    cacheDOMElements() {
        // Cache frequently accessed DOM elements
        this.domCache = {
            // Resources
            resourcesContainer: document.getElementById('resources-container'),
            energyPerClick: document.getElementById('energy-per-click'),

            // Resource values for counter updates
            essenceValue: null, // Will be set after first UI update
            essenceRate: null,  // Will be set after first UI update
            powerPointsValue: null, // Will be set after first UI update

            // Realms
            realmsContainer: document.getElementById('realms-container'),

            // Artifacts
            availableArtifactsContainer: document.getElementById('available-artifacts-container'),
            acquiredArtifactsContainer: document.getElementById('acquired-artifacts-container'),
            lockedArtifactsContainer: document.getElementById('locked-artifacts-container'),

            // Powers
            powerTreeContainer: document.getElementById('power-tree-container'),
            skillConnections: document.getElementById('skill-connections'),
            skillPoints: document.getElementById('skill-points'),
            powerDetailsPlaceholder: document.getElementById('power-details-placeholder'),
            powerDetails: document.getElementById('power-details'),
            powerIcon: document.getElementById('power-icon'),
            powerName: document.getElementById('power-name'),
            powerDescription: document.getElementById('power-description'),
            powerCost: document.getElementById('power-cost'),
            powerRequirements: document.getElementById('power-requirements'),
            powerEffectsList: document.getElementById('power-effects-list'),
            powerPurchaseButton: document.getElementById('power-purchase-button'),

            // Ascension
            currentPrestige: document.getElementById('current-prestige'),
            prestigeGainAmount: document.getElementById('prestige-gain-amount'),
            prestigeMultiplierValue: document.getElementById('prestige-multiplier-value'),
            prestigeCount: document.getElementById('prestige-count'),
            prestigeButton: document.getElementById('prestige-button'),

            // Feats
            achievementsContainer: document.getElementById('achievements-container'),
            achievementSearch: document.getElementById('achievement-search'),
            achievementFilterTabs: document.querySelectorAll('.filter-tab'),

            // Bonuses
            bonusesContainer: document.getElementById('bonuses-container'),

            // Statistics
            statisticsContainer: document.getElementById('statistics'),

            // Notifications
            notificationsContainer: document.getElementById('notifications'),
            featNotificationsContainer: document.getElementById('feat-notifications'),

            // Click button
            clickButton: document.getElementById('click-button'),

            // Tab indicator
            tabIndicator: document.querySelector('.tab-indicator'),

            // Dungeon
            dungeonMapContainer: document.getElementById('dungeon-map-container'),
            dungeonPlaceholder: document.getElementById('dungeon-placeholder'),
            startDungeonButton: document.getElementById('start-dungeon-button'),
            dungeonCombatContainer: document.getElementById('dungeon-combat-container'),
            dungeonEnemyContainer: document.getElementById('dungeon-enemy-container'),
            dungeonCombatLog: document.getElementById('dungeon-combat-log'),
            dungeonDetailsPanel: document.getElementById('dungeon-details-panel'),
            dungeonDetailsContent: document.getElementById('dungeon-details-content'),
            dungeonPlayerStats: document.getElementById('dungeon-player-stats'),
            dungeonActions: document.getElementById('dungeon-actions'),
            dungeonActiveEffects: document.getElementById('dungeon-active-effects'),
            dungeonMessageWindow: document.getElementById('dungeon-message-window'),
            dungeonMessageContainer: document.getElementById('dungeon-message-container'),

            // New Combat UI Elements
            combatTurnDisplay: document.getElementById('combat-turn-display'),
            playerHealthFill: document.getElementById('player-health-fill'),
            playerHealthText: document.getElementById('player-health-text'),
            playerCombatStats: document.getElementById('player-combat-stats'),
            combatActionsContainer: document.getElementById('combat-actions-container'),
            combatExpFill: document.getElementById('combat-exp-fill'),
            combatExpText: document.getElementById('combat-exp-text')
        };
    }

    createParticles() {
        const container = document.getElementById('particles-container');

        // Clear existing particles
        container.innerHTML = '';

        // Use particle count from settings
        const particleCount = this.settings.particleCount;

        // If particle count is 0, don't create any particles
        if (particleCount <= 0) return;

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Random size
            const size = Math.random() * 4 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            // Random color
            const colors = ['var(--magic)', 'var(--crystal)', 'var(--secondary)', 'var(--accent)'];
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

            // Random position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;

            // Random delay
            particle.style.animationDelay = `${Math.random() * 15}s`;

            // Random duration - longer duration means fewer redraws
            const duration = Math.random() * 20 + 15; // Increased duration
            particle.style.animationDuration = `${duration}s`;

            fragment.appendChild(particle);
        }

        container.appendChild(fragment);
    }

    applyVisualEffectsSettings() {
        const root = document.documentElement;

        // Apply visual effects settings
        switch (this.settings.visualEffects) {
            case 'low':
                // Disable most animations
                root.style.setProperty('--enable-animations', '0');

                // Add a CSS class to the body to disable animations
                document.body.classList.add('low-effects');

                // Disable skill node animations
                document.querySelectorAll('.skill-node').forEach(node => {
                    node.style.animation = 'none';
                });
                break;

            case 'medium':
                // Enable some animations
                root.style.setProperty('--enable-animations', '1');

                // Remove low-effects class
                document.body.classList.remove('low-effects');
                document.body.classList.add('medium-effects');

                // Disable only intensive animations
                document.querySelectorAll('.skill-node.available').forEach(node => {
                    node.style.animation = 'none';
                });
                document.querySelectorAll('.skill-node.selected').forEach(node => {
                    node.style.animation = 'none';
                });
                break;

            case 'high':
                // Enable all animations
                root.style.setProperty('--enable-animations', '1');

                // Remove effect limitation classes
                document.body.classList.remove('low-effects');
                document.body.classList.remove('medium-effects');

                // Re-enable all animations
                document.querySelectorAll('.skill-node.available').forEach(node => {
                    node.style.animation = 'pulse-subtle 2s infinite ease-in-out';
                });
                document.querySelectorAll('.skill-node.selected').forEach(node => {
                    node.style.animation = 'pulse 1.5s infinite ease-in-out';
                });
                break;
        }
    }

    // Track if mouse is over an interactive element to prevent unnecessary UI updates
    _isHovering = false;
    _lastUIUpdate = 0;
    _uiUpdateInterval = 100; // ms between UI updates

    // Realm update state tracking
    _realmUpdateState = {
        lastFullUpdate: 0,
        needsFullUpdate: false,
        needsAffordabilityUpdate: false,
        updateInterval: 2000, // 2 seconds between full realm grid updates
        isUpdating: false // Flag to prevent concurrent updates
    }

    gameLoop() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000 * this.settings.gameSpeed;

        // Set flag to indicate we're updating from the game loop
        // This prevents artifacts from being redrawn on every tick
        this._updatingFromGameLoop = true;

        // Optimization: Track if any resources changed
        const oldEssence = this.resources.essence.toString();
        const oldPowerPoints = this.resources.powerPoints.toString();

        // Update resources
        this.updateResources(deltaTime);

        // Track if we need structural UI updates vs just counter updates
        let needsStructuralUpdate = false;

        // Set update flags based on what changed
        if (oldEssence !== this.resources.essence.toString()) {
            // Always update counters
            this.uiUpdateFlags.counters = true;

            // Check if we need structural updates (new unlocks, etc.)
            const oldEssenceNum = new BigNumber(oldEssence);
            const newEssenceNum = this.resources.essence;

            // If essence has changed significantly (doubled or halved), we might need to update realm affordability UI
            // Add safety checks to prevent division by zero
            const significantEssenceChange = (
                (oldEssenceNum.mantissa !== 0 && newEssenceNum.divide(oldEssenceNum).greaterThan(2)) ||
                (newEssenceNum.mantissa !== 0 && oldEssenceNum.divide(newEssenceNum).greaterThan(2)) ||
                (oldEssenceNum.mantissa === 0 && newEssenceNum.mantissa !== 0) ||
                (newEssenceNum.mantissa === 0 && oldEssenceNum.mantissa !== 0)
            );

            if (significantEssenceChange) {
                this.uiUpdateFlags.resources = true;

                // Mark realm affordability for update, but don't trigger a full rebuild
                this._realmUpdateState.needsAffordabilityUpdate = true;

                // Only force a full realms update if it's been long enough since the last one
                const timeSinceLastRealmsUpdate = now - this._realmUpdateState.lastFullUpdate;
                if (timeSinceLastRealmsUpdate > this._realmUpdateState.updateInterval) {
                    // Schedule a full realm update, but don't do it in the game loop
                    this._realmUpdateState.needsFullUpdate = true;
                    // console.log('Scheduling realm update due to significant essence change');
                }

                // Schedule an affordability update
                const timeSinceLastAffordabilityUpdate = now - this._lastAffordabilityUpdate;
                if (timeSinceLastAffordabilityUpdate > this._affordabilityUpdateInterval) {
                    this.updateAllAffordability();
                    this._lastAffordabilityUpdate = now;
                }

                needsStructuralUpdate = true;
            } else if (oldEssence !== this.resources.essence.toString()) {
                // Even for small changes, we should update affordability occasionally
                const timeSinceLastAffordabilityUpdate = now - this._lastAffordabilityUpdate;
                if (timeSinceLastAffordabilityUpdate > this._affordabilityUpdateInterval * 2) {
                    this.updateAllAffordability();
                    this._lastAffordabilityUpdate = now;
                }
            }
        }

        if (oldPowerPoints !== this.resources.powerPoints.toString()) {
            this.uiUpdateFlags.counters = true;
            this.uiUpdateFlags.powers = true;
            needsStructuralUpdate = true;

            // Update power affordability when power points change
            const timeSinceLastAffordabilityUpdate = now - this._lastAffordabilityUpdate;
            if (timeSinceLastAffordabilityUpdate > this._affordabilityUpdateInterval) {
                this.updateAllAffordability();
                this._lastAffordabilityUpdate = now;
            }
        }

        // Check unlocks - only if resources changed significantly
        if (oldEssence !== this.resources.essence.toString()) {
            const unlocksChanged = this.checkUnlocks();
            if (unlocksChanged) {
                // Force realm update if new realms were unlocked
                this._forceRealmsUpdate = true;
                needsStructuralUpdate = true;
            }
        }

        // Check achievements - only if resources changed
        if (oldEssence !== this.resources.essence.toString()) {
            const featsEarned = this.checkFeats();
            if (featsEarned) {
                needsStructuralUpdate = true;
            }
        }

        // Always update counters on every frame if DOM elements are cached
        if (this.uiUpdateFlags.counters && this.domCache.essenceValue) {
            this.updateCountersOnly();
        }

        // Only do full UI updates if not hovering over an interactive element
        // or if enough time has passed since the last update
        const timeSinceLastUpdate = now - this._lastUIUpdate;
        if (needsStructuralUpdate && (!this._isHovering || timeSinceLastUpdate > this._uiUpdateInterval)) {
            // Update UI - only what needs updating
            this.updateSelectiveUI();
            this._lastUIUpdate = now;

            // Reset update flags after UI update
            Object.keys(this.uiUpdateFlags).forEach(key => {
                this.uiUpdateFlags[key] = false;
            });
        }

        // Handle auto-save
        this.saveTimer += deltaTime;
        if (this.saveTimer >= this.settings.saveFrequency) {
            this.saveGame();

            // Save dungeon state if active
            if (this.dungeon.active) {
                this.saveDungeonState();
            }

            this.saveTimer = 0;
        }

        // Reset the updating flag
        this._updatingFromGameLoop = false;

        this.lastUpdate = now;
        requestAnimationFrame(() => this.gameLoop());
    }

    // New method to selectively update only what changed
    updateSelectiveUI() {
        if (this.uiUpdateFlags.resources) {
            this.updateResourcesUI();
        }

        // Handle realm updates separately from the game loop
        // Check if we need to schedule realm updates
        if (this.uiUpdateFlags.realms) {
            this._realmUpdateState.needsAffordabilityUpdate = true;
        }

        // Update artifacts only if explicitly requested and not from game loop
        // or if forced update is requested
        if (this.uiUpdateFlags.artifacts) {
            // The updateArtifactsUI method will check _updatingFromGameLoop flag
            // and only update if not called from game loop or if forced
            this.updateArtifactsUI();
        }

        if (this.uiUpdateFlags.powers) {
            this.updatePowersUI();
        }

        if (this.uiUpdateFlags.ascension) {
            this.updateAscensionUI();
        }

        if (this.uiUpdateFlags.feats) {
            this.updateFeatsUI();
        }

        if (this.uiUpdateFlags.statistics) {
            this.updateStatisticsUI();
        }

        if (this.uiUpdateFlags.bonuses) {
            this.updateBonusesUI();
        }

        if (this.uiUpdateFlags.dungeon) {
            this.updateDungeonUI();
        }
    }

    // New method to update only counter values without rebuilding UI
    updateCountersOnly() {
        // Update resource counters
        if (this.domCache.essenceValue) {
            this.domCache.essenceValue.textContent = this.formatNumber(this.resources.essence);
        }

        if (this.domCache.essenceRate) {
            // Calculate essence per second with ascension multiplier properly applied
            let totalProduction = this.calculateTotalProduction();
            // Convert to per second by multiplying by game speed
            this.domCache.essenceRate.textContent = this.formatNumber(totalProduction.multiply(this.settings.gameSpeed)) + '/sec';
        }

        if (this.domCache.powerPointsValue) {
            this.domCache.powerPointsValue.textContent = this.formatPowerPoints(this.resources.powerPoints);
        }

        // Update essence per click
        if (this.domCache.energyPerClick) {
            this.domCache.energyPerClick.textContent = this.formatNumber(this.essencePerClick);
        }

        // Update power points display in powers tab
        const skillPointsElement = document.getElementById('skill-points');
        if (skillPointsElement) {
            skillPointsElement.textContent = this.formatPowerPoints(this.resources.powerPoints);
        }

        // Update ascension values
        if (this.domCache.currentPrestige) {
            this.domCache.currentPrestige.textContent = this.formatPowerPoints(this.resources.powerPoints);
        }

        if (this.domCache.prestigeGainAmount) {
            this.domCache.prestigeGainAmount.textContent = this.formatPowerPoints(this.powerPointsOnReset);
        }

        // Update ascension status
        const ascensionStatus = document.getElementById('ascension-status');
        if (ascensionStatus) {
            if (this.powerPointsOnReset.lessThanOrEqual(0)) {
                ascensionStatus.textContent = 'Not ready to ascend - Need more essence';
                ascensionStatus.classList.remove('ready');
            } else {
                ascensionStatus.textContent = 'Ready to ascend!';
                ascensionStatus.classList.add('ready');
            }
        }

        // Update formula breakdown
        const basePowerPoints = document.getElementById('base-power-points');
        const totalPowerMultiplier = document.getElementById('total-power-multiplier');

        if (basePowerPoints && totalPowerMultiplier) {
            // Calculate base power points (without multipliers)
            const basePoints = this.resources.totalEssence.pow(0.15).divide(100);
            basePowerPoints.textContent = this.formatPowerPoints(basePoints);

            // Calculate total multiplier (simplified version for counter updates)
            totalPowerMultiplier.textContent = this.formatPowerPoints(this.powerPointsOnReset.divide(basePoints));
        }

        // Don't update realm affordability here - it's handled separately
    }

    // Helper method to calculate total production without updating UI
    calculateTotalProduction() {
        let totalProduction = new BigNumber(0);

        // Calculate production for each realm and sum them up
        for (const realm of this.realms) {
            if (realm.count > 0) {
                const realmProduction = this.calculateRealmProduction(realm);
                totalProduction = totalProduction.add(realmProduction);
            }
        }

        return totalProduction;
    }

    // Helper method to calculate production for a single realm
    calculateRealmProduction(realm) {
        if (realm.count <= 0) {
            return new BigNumber(0);
        }

        // Debug for Luminous Garden
        const isLuminousGarden = realm.id === 'realm1';
        if (isLuminousGarden) {
            // console.log('Calculating production for Luminous Garden');
        }

        // Get active realms for quantum synergy calculation
        const activeRealms = this.realms.filter(r => r.count > 0);
        const realmTypes = activeRealms.length;

        // Check for meta multiplier from Omniscience power
        const metaPower = this.powers.find(p => p.purchased && p.effect.metaMultiplier);
        const metaMultiplier = metaPower ? metaPower.effect.metaMultiplier : 1;

        // Check for Essence Acceleration power (1% more essence for each realm owned)
        const realmCountBonus = this.powers.find(p => p.purchased && p.effect.realmCountBonus);
        const totalRealmCount = this.realms.reduce((sum, realm) => sum + realm.count, 0);

        // Start with base production times count
        let realmProduction = realm.baseProduction.multiply(realm.count);

        if (isLuminousGarden) {
            // console.log(`Base production × count: ${realmProduction}`);
        }

        // Apply realm-specific artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'realm' && artifact.target === realm.id) {
                let multiplier = artifact.effect.multiplier;
                if (metaPower) {
                    // Apply meta multiplier to artifact effect
                    multiplier = 1 + ((multiplier - 1) * metaMultiplier);
                }
                realmProduction = realmProduction.multiply(multiplier);

                if (isLuminousGarden) {
                    // console.log(`After artifact ${artifact.name}: ${realmProduction}`);
                }
            }
        }

        // Apply power effects
        for (const power of this.powers) {
            if (power.purchased) {
                if (power.effect.realmMultiplier && power.effect.realmMultiplier.targets.includes(realm.id)) {
                    let multiplier = power.effect.realmMultiplier.multiplier;
                    if (metaPower) {
                        // Apply meta multiplier to power effect
                        multiplier = 1 + ((multiplier - 1) * metaMultiplier);
                    }
                    realmProduction = realmProduction.multiply(multiplier);
                }
            }
        }

        // Apply quantum synergy if active
        const quantumSynergyPower = this.powers.find(p => p.purchased && p.effect.quantumSynergy);
        if (quantumSynergyPower) {
            // Each realm boosts all others
            const otherRealmsCount = activeRealms.length - 1;
            if (otherRealmsCount > 0) {
                const quantumBoost = 1 + (otherRealmsCount * 0.02 * (metaPower ? metaMultiplier : 1));
                realmProduction = realmProduction.multiply(quantumBoost);
            }
        }

        // Apply global multipliers
        let globalMultiplier = this.productionMultiplier;
        if (metaPower) {
            // Apply meta multiplier to global multiplier
            globalMultiplier = new BigNumber(1).add(this.productionMultiplier.subtract(1).multiply(metaMultiplier));
        }

        if (isLuminousGarden) {
            // console.log(`Global multiplier: ${globalMultiplier}`);
        }

        realmProduction = realmProduction.multiply(globalMultiplier);

        if (isLuminousGarden) {
            // console.log(`After global multiplier: ${realmProduction}`);
        }

        // Apply ascension multiplier
        if (isLuminousGarden) {
            // console.log(`Ascension multiplier: ${this.ascensionMultiplier}`);
        }

        realmProduction = realmProduction.multiply(this.ascensionMultiplier);

        if (isLuminousGarden) {
            // console.log(`After ascension multiplier: ${realmProduction}`);
        }

        // Apply synergy effect from powers
        const synergyPower = this.powers.find(p => p.purchased && p.effect.synergy);
        if (synergyPower) {
            // Use custom synergy multiplier if specified, otherwise default to 5%
            const synergyPercentage = synergyPower.effect.synergyMultiplier || 0.05;
            const synergyMultiplier = 1 + (realmTypes * synergyPercentage * (metaPower ? metaMultiplier : 1));
            realmProduction = realmProduction.multiply(synergyMultiplier);
        }

        // Apply ascension synergy bonus from artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionSynergyBonus) {
                // Each realm type boosts overall production by X% for each ascension completed
                const bonusPerRealmType = artifact.effect.ascensionSynergyBonus * this.statistics.ascensionCount;
                const synergyMultiplier = 1 + (realmTypes * bonusPerRealmType);
                realmProduction = realmProduction.multiply(synergyMultiplier);

                if (isLuminousGarden) {
                    // console.log(`After ascension synergy bonus (${realmTypes} realm types): ${realmProduction}`);
                }
            }
        }

        // Apply Essence Acceleration power (1% more essence for each realm owned)
        if (realmCountBonus && totalRealmCount > 0) {
            const realmBonus = 1 + (totalRealmCount * 0.01);

            if (isLuminousGarden) {
                // console.log(`Essence Acceleration bonus (${totalRealmCount} realms): ${realmBonus}`);
            }

            realmProduction = realmProduction.multiply(realmBonus);

            if (isLuminousGarden) {
                // console.log(`After Essence Acceleration: ${realmProduction}`);
            }
        }

        // Apply Essence Overflow power (10% more essence for each realm owned)
        const realmCountBonus10 = this.powers.find(p => p.purchased && p.effect.realmCountBonus10);
        if (realmCountBonus10 && totalRealmCount > 0) {
            const realmBonus10 = 1 + (totalRealmCount * 0.1);

            if (isLuminousGarden) {
                // console.log(`Essence Overflow bonus (${totalRealmCount} realms): ${realmBonus10}`);
            }

            realmProduction = realmProduction.multiply(realmBonus10);

            if (isLuminousGarden) {
                // console.log(`After Essence Overflow: ${realmProduction}`);
            }
        }

        // Apply ascension realm count bonus from artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionRealmCountBonus && totalRealmCount > 0) {
                // Gain X% more essence for each realm owned for each ascension completed
                const bonusPerRealm = artifact.effect.ascensionRealmCountBonus * this.statistics.ascensionCount;
                const realmCountMultiplier = 1 + (totalRealmCount * bonusPerRealm);
                realmProduction = realmProduction.multiply(realmCountMultiplier);

                if (isLuminousGarden) {
                    // console.log(`After ascension realm count bonus (${totalRealmCount} realms): ${realmProduction}`);
                }
            }
        }

        // Apply quantum synergy bonus from artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionQuantumSynergyBonus && activeRealms.length > 1) {
                // Each realm boosts the production of all others by X% for each ascension completed
                const bonusPerRealm = artifact.effect.ascensionQuantumSynergyBonus * this.statistics.ascensionCount;
                const otherRealmsCount = activeRealms.length - 1;
                const quantumSynergyMultiplier = 1 + (otherRealmsCount * bonusPerRealm);
                realmProduction = realmProduction.multiply(quantumSynergyMultiplier);

                if (isLuminousGarden) {
                    // console.log(`After ascension quantum synergy bonus (${otherRealmsCount} other realms): ${realmProduction}`);
                }
            }
        }

        // Apply meta multiplier bonus from artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionMetaMultiplierBonus) {
                // All effects are X% stronger for each ascension completed
                // This is a meta-effect that would be applied to all other multipliers
                // For simplicity, we'll just apply it as a final multiplier here
                const metaBonus = 1 + (artifact.effect.ascensionMetaMultiplierBonus * this.statistics.ascensionCount);
                realmProduction = realmProduction.multiply(metaBonus);

                if (isLuminousGarden) {
                    // console.log(`After ascension meta multiplier bonus: ${realmProduction}`);
                }
            }
        }

        if (isLuminousGarden) {
            // console.log(`Final production for ${realm.count} Luminous Gardens: ${realmProduction}`);
            // console.log(`Production per garden: ${realmProduction.divide(realm.count)}`);
        }

        return realmProduction;
    }

    // Update realm affordability without rebuilding the UI
    updateRealmAffordability() {
        const realmButtons = document.querySelectorAll('.realm-action');
        if (realmButtons.length === 0) {
            // No buttons to update, possibly because the UI hasn't been built yet
            return;
        }

        try {
            realmButtons.forEach(button => {
                const realmId = button.dataset.id;
                const realm = this.realms.find(r => r.id === realmId);
                if (realm) {
                    const cost = this.calculateRealmCost(realm);
                    const canAfford = this.resources.essence.greaterThanOrEqual(cost);

                    // Just update the disabled state without replacing the button
                    button.disabled = !canAfford;

                    // Update cost display if it exists
                    const costElement = button.closest('.realm')?.querySelector('.realm-cost');
                    if (costElement) {
                        costElement.textContent = `Cost: ${this.formatNumber(cost)} essence`;
                    }
                }
            });

            // Mark that affordability update is done
            this._realmUpdateState.needsAffordabilityUpdate = false;
        } catch (error) {
            console.error('Error updating realm affordability:', error);
        }
    }

    // Update power affordability without rebuilding the UI
    updatePowerAffordability() {
        // Check if the power tree is visible
        const powerTree = document.getElementById('power-tree-container');
        if (!powerTree || powerTree.children.length === 0) {
            // Power tree not visible or not built yet
            return;
        }

        try {
            // Update all power nodes
            const powerNodes = document.querySelectorAll('.skill-node');
            powerNodes.forEach(node => {
                const powerId = node.dataset.id;
                const power = this.powers.find(p => p.id === powerId);

                if (power && !power.purchased && power.unlocked) {
                    // Check if player can afford it
                    const canAfford = this.resources.powerPoints.greaterThanOrEqual(power.cost);

                    // Update node appearance
                    if (canAfford) {
                        node.classList.add('available');
                    } else {
                        node.classList.remove('available');
                    }
                }
            });

            // Update the purchase button if a power is selected
            if (this.selectedPowerId) {
                const power = this.powers.find(p => p.id === this.selectedPowerId);
                if (power && !power.purchased) {
                    const purchaseButton = document.getElementById('power-purchase-button');
                    if (purchaseButton) {
                        const canAfford = this.resources.powerPoints.greaterThanOrEqual(power.cost);

                        // Special handling for power20 and power30
                        if (power.id === 'power20' || power.id === 'power30') {
                            // For these problematic powers, only check if they're unlocked and affordable
                            purchaseButton.disabled = !(power.unlocked && canAfford);
                        } else {
                            // For all other powers, use the normal logic
                            const requirementsMet = !power.requires || power.requires.every(req =>
                                this.powers.find(p => p.id === req && p.purchased)
                            );
                            purchaseButton.disabled = !(power.unlocked && canAfford && requirementsMet);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error updating power affordability:', error);
        }
    }

    // Update ascension affordability
    updateAscensionAffordability() {
        // Check if the ascension button exists
        const ascensionButton = document.getElementById('prestige-button');
        if (!ascensionButton) {
            return;
        }

        try {
            // Check if ascension would yield any power points
            const canAscend = this.powerPointsOnReset.greaterThan(0);

            // Update button state
            ascensionButton.disabled = !canAscend;

            // Update ascension status text
            const ascensionStatus = document.getElementById('ascension-status');
            if (ascensionStatus) {
                if (canAscend) {
                    ascensionStatus.textContent = 'Ready to ascend!';
                    ascensionStatus.classList.add('ready');
                } else {
                    ascensionStatus.textContent = 'Not ready to ascend - Need more essence';
                    ascensionStatus.classList.remove('ready');
                }
            }
        } catch (error) {
            console.error('Error updating ascension affordability:', error);
        }
    }

    updateResources(deltaTime) {
        // Calculate production using the helper method to ensure consistency
        // This ensures the ascension multiplier is properly applied
        let totalProduction = this.calculateTotalProduction();

        // Add production to resources
        const deltaProduction = totalProduction.multiply(deltaTime);
        this.resources.essence = this.resources.essence.add(deltaProduction);
        this.resources.totalEssence = this.resources.totalEssence.add(deltaProduction);

        // Update highest essence statistic
        if (this.resources.essence.greaterThan(this.statistics.highestEssence)) {
            this.statistics.highestEssence = new BigNumber(this.resources.essence);
        }

        // Update power points calculation
        this.updatePowerPoints();
    }

    updatePowerPoints() {
        // Calculate power points based on total essence
        const basePoints = this.resources.totalEssence.pow(0.15).divide(100);

        // Apply prestige upgrades
        let multiplier = new BigNumber(1);

        // Check for meta multiplier from Omniscience power
        const metaPower = this.powers.find(p => p.purchased && p.effect.metaMultiplier);
        const metaMultiplier = metaPower ? metaPower.effect.metaMultiplier : 1;

        // Apply power effects
        for (const power of this.powers) {
            if (power.purchased && power.effect.ascensionMultiplier) {
                let powerMultiplier = power.effect.ascensionMultiplier;
                if (metaPower) {
                    // Apply meta multiplier to power effect
                    powerMultiplier = 1 + ((powerMultiplier - 1) * metaMultiplier);
                }
                multiplier = multiplier.multiply(powerMultiplier);
            }
        }

        // Apply artifact effects
        for (const artifact of this.artifacts) {
            // Apply ascension artifact multipliers
            if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.multiplier) {
                let artifactMultiplier = artifact.effect.multiplier;
                if (metaPower) {
                    // Apply meta multiplier to artifact effect
                    artifactMultiplier = 1 + ((artifactMultiplier - 1) * metaMultiplier);
                }
                multiplier = multiplier.multiply(artifactMultiplier);
            }

            // Apply ascension-locked artifacts with scaling power point bonus
            if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionPowerPointBonus) {
                // Calculate bonus based on ascension count
                const bonusPerAscension = artifact.effect.ascensionPowerPointBonus * this.statistics.ascensionCount;
                const ascensionBonus = 1 + bonusPerAscension;
                multiplier = multiplier.multiply(ascensionBonus);
            }

            // Apply dungeon artifact power point multipliers
            if (artifact.purchased && artifact.type === 'dungeon' && artifact.effect.powerPointMultiplier) {
                let dungeonArtifactMultiplier = artifact.effect.powerPointMultiplier;
                if (metaPower) {
                    // Apply meta multiplier to artifact effect
                    dungeonArtifactMultiplier = 1 + ((dungeonArtifactMultiplier - 1) * metaMultiplier);
                }
                multiplier = multiplier.multiply(dungeonArtifactMultiplier);
            }
        }

        // Apply Cosmic Balance power (10% more power points)
        const cosmicBalancePower = this.powers.find(p => p.purchased && p.effect.balanceBonus);
        if (cosmicBalancePower) {
            multiplier = multiplier.multiply(cosmicBalancePower.effect.balanceBonus);
        }

        this.powerPointsOnReset = basePoints.multiply(multiplier);
    }

    // Format Power Points consistently
    formatPowerPoints(number) {
        if (!(number instanceof BigNumber)) {
            number = new BigNumber(number);
        }

        // Always use standard format for Power Points regardless of user settings
        // This ensures Power Points are always displayed in a readable format with 2 decimal places
        const standardStr = number.toString('standard');

        // Check if the string already has a decimal point
        if (standardStr.includes('.')) {
            // If it has a decimal point, ensure it has exactly 2 decimal places
            const parts = standardStr.split('.');
            if (parts[1].length === 1) {
                return `${parts[0]}.${parts[1]}0`;
            }
            return standardStr;
        } else {
            // If it doesn't have a decimal point, add .00
            return `${standardStr}.00`;
        }
    }

    checkUnlocks() {
        let realmsUnlocked = false;
        let artifactsUnlocked = false;
        let powersUnlocked = false;

        // Check realm unlocks
        for (const realm of this.realms) {
            if (!realm.unlocked && realm.unlockAt) {
                if (realm.unlockAt.resource && this.resources[realm.unlockAt.resource].greaterThanOrEqual(realm.unlockAt.amount)) {
                    realm.unlocked = true;
                    realmsUnlocked = true;
                    this.showNotification(`Discovered new realm: ${realm.name}!`);
                }
            }
        }

        // Check artifact unlocks
        for (const artifact of this.artifacts) {
            if (!artifact.unlocked && artifact.unlockAt) {
                if (artifact.unlockAt.resource && this.resources[artifact.unlockAt.resource].greaterThanOrEqual(artifact.unlockAt.amount)) {
                    artifact.unlocked = true;
                    artifactsUnlocked = true;
                    this.showNotification(`Discovered artifact: ${artifact.name}!`, 'upgrade');
                } else if (artifact.unlockAt.realmCount) {
                    const realm = this.realms.find(r => r.id === artifact.unlockAt.realmCount.id);
                    if (realm && realm.count >= artifact.unlockAt.realmCount.count) {
                        artifact.unlocked = true;
                        artifactsUnlocked = true;
                        this.showNotification(`Discovered artifact: ${artifact.name}!`, 'upgrade');
                    }
                }
            }
        }

        // Check power unlocks
        for (const power of this.powers) {
            if (!power.unlocked && power.requires) {
                const allRequirementsMet = power.requires.every(req =>
                    this.powers.find(p => p.id === req && p.purchased)
                );

                if (allRequirementsMet) {
                    power.unlocked = true;
                    powersUnlocked = true;
                    this.showNotification(`Unlocked power: ${power.name}!`);
                }
            }
        }

        // Set update flags based on what was unlocked
        if (realmsUnlocked) {
            // Schedule a full realm update when new realms are unlocked
            this._realmUpdateState.needsFullUpdate = true;
            // console.log('New realm unlocked, scheduling realm UI update');

            // Trigger the update immediately if it's been a while
            const now = Date.now();
            const timeSinceLastUpdate = now - this._realmUpdateState.lastFullUpdate;
            if (timeSinceLastUpdate > this._realmUpdateState.updateInterval) {
                this.updateRealmsUI();
                this._realmUpdateState.lastFullUpdate = now;
                this._realmUpdateState.needsFullUpdate = false;
            }
        }

        if (artifactsUnlocked) {
            this.uiUpdateFlags.artifacts = true;

            // Force an immediate update of the artifacts UI
            this.updateArtifactsUI();

            // Update affordability
            const now = Date.now();
            this.updateAllAffordability();
            this._lastAffordabilityUpdate = now;
        }

        if (powersUnlocked) {
            this.uiUpdateFlags.powers = true;
        }

        // Return whether any unlocks happened
        return realmsUnlocked || artifactsUnlocked || powersUnlocked;
    }

    checkFeats() {
        let featsEarned = false;

        for (const feat of this.feats) {
            if (!feat.earned) {
                let earned = false;

                if (feat.condition.resource) {
                    if (this.resources[feat.condition.resource].greaterThanOrEqual(feat.condition.amount)) {
                        earned = true;
                    }
                } else if (feat.condition.realmCount) {
                    const realm = this.realms.find(r => r.id === feat.condition.realmCount.id);
                    if (realm && realm.count >= feat.condition.realmCount.count) {
                        earned = true;
                    }
                } else if (feat.condition.ascensionCount !== undefined) {
                    if (this.statistics.ascensionCount >= feat.condition.ascensionCount) {
                        earned = true;
                    }
                } else if (feat.condition.powerCount !== undefined) {
                    const purchasedPowers = this.powers.filter(p => p.purchased).length;
                    if (purchasedPowers >= feat.condition.powerCount) {
                        earned = true;
                    }
                } else if (feat.condition.artifactCount !== undefined) {
                    const purchasedArtifacts = this.artifacts.filter(a => a.purchased).length;
                    if (purchasedArtifacts >= feat.condition.artifactCount) {
                        earned = true;
                    }
                } else if (feat.condition.featCount !== undefined) {
                    const earnedFeats = this.feats.filter(f => f.earned).length;
                    if (earnedFeats >= feat.condition.featCount) {
                        earned = true;
                    }
                } else if (feat.condition.allRealms) {
                    // Check if player has at least one of each realm type
                    const hasAllRealms = this.realms.every(realm => realm.count > 0);
                    if (hasAllRealms) {
                        earned = true;
                    }
                } else if (feat.condition.specialCondition) {
                    // Handle special conditions for early game feats
                    if (feat.condition.specialCondition === 'totalRealmCount10') {
                        // Check if player has a total of 10 realms
                        const totalRealmCount = this.realms.reduce((sum, realm) => sum + realm.count, 0);
                        if (totalRealmCount >= 10) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'differentRealmTypes3') {
                        // Check if player has at least one of 3 different realm types
                        const differentRealmTypes = this.realms.filter(realm => realm.count > 0).length;
                        if (differentRealmTypes >= 3) {
                            earned = true;
                        }
                    }
                    // Handle special conditions for manual clicks feats
                    if (feat.condition.specialCondition === 'manualClicks100') {
                        if (this.statistics.totalClicks >= 100) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'manualClicks500') {
                        if (this.statistics.totalClicks >= 500) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'manualClicks1000') {
                        if (this.statistics.totalClicks >= 1000) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'manualClicks5000') {
                        if (this.statistics.totalClicks >= 5000) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'manualClicks10000') {
                        if (this.statistics.totalClicks >= 10000) {
                            earned = true;
                        }
                    }

                    // Handle special conditions for production feats
                    else if (feat.condition.specialCondition === 'production100') {
                        const totalProduction = this.calculateTotalProduction();
                        if (totalProduction.greaterThanOrEqual(new BigNumber(100))) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'production1000') {
                        const totalProduction = this.calculateTotalProduction();
                        if (totalProduction.greaterThanOrEqual(new BigNumber(1000))) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'production10000') {
                        const totalProduction = this.calculateTotalProduction();
                        if (totalProduction.greaterThanOrEqual(new BigNumber(10000))) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'production100000') {
                        const totalProduction = this.calculateTotalProduction();
                        if (totalProduction.greaterThanOrEqual(new BigNumber(100000))) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'production1000000') {
                        const totalProduction = this.calculateTotalProduction();
                        if (totalProduction.greaterThanOrEqual(new BigNumber(1000000))) {
                            earned = true;
                        }
                    }

                    // Handle special conditions for dungeon runs feats
                    else if (feat.condition.specialCondition === 'dungeonRuns1') {
                        if (this.dungeon.statistics.totalDungeons >= 1) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonRuns5') {
                        if (this.dungeon.statistics.totalDungeons >= 5) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonRuns25') {
                        if (this.dungeon.statistics.totalDungeons >= 25) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonRuns100') {
                        if (this.dungeon.statistics.totalDungeons >= 100) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonRuns500') {
                        if (this.dungeon.statistics.totalDungeons >= 500) {
                            earned = true;
                        }
                    }

                    // Handle special conditions for dungeon wins feats
                    else if (feat.condition.specialCondition === 'dungeonWins1') {
                        if (this.dungeon.statistics.totalBossesDefeated >= 1) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonWins10') {
                        if (this.dungeon.statistics.totalBossesDefeated >= 10) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonWins50') {
                        if (this.dungeon.statistics.totalBossesDefeated >= 50) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonWins100') {
                        if (this.dungeon.statistics.totalBossesDefeated >= 100) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonWins250') {
                        if (this.dungeon.statistics.totalBossesDefeated >= 250) {
                            earned = true;
                        }
                    }

                    // Handle special conditions for dungeon rooms feats
                    else if (feat.condition.specialCondition === 'dungeonRooms50') {
                        if (this.dungeon.statistics.totalRooms >= 50) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonRooms250') {
                        if (this.dungeon.statistics.totalRooms >= 250) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonRooms500') {
                        if (this.dungeon.statistics.totalRooms >= 500) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonRooms1000') {
                        if (this.dungeon.statistics.totalRooms >= 1000) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'dungeonRooms2500') {
                        if (this.dungeon.statistics.totalRooms >= 2500) {
                            earned = true;
                        }
                    }

                    // Handle special conditions for enemies defeated feats
                    else if (feat.condition.specialCondition === 'enemiesDefeated10') {
                        if (this.dungeon.statistics.totalEnemiesDefeated >= 10) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'enemiesDefeated50') {
                        if (this.dungeon.statistics.totalEnemiesDefeated >= 50) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'enemiesDefeated100') {
                        if (this.dungeon.statistics.totalEnemiesDefeated >= 100) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'enemiesDefeated500') {
                        if (this.dungeon.statistics.totalEnemiesDefeated >= 500) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'enemiesDefeated1000') {
                        if (this.dungeon.statistics.totalEnemiesDefeated >= 1000) {
                            earned = true;
                        }
                    }

                    // Handle special conditions for critical clicks feats
                    else if (feat.condition.specialCondition === 'criticalClicks1') {
                        if (this.statistics.criticalClicks >= 1) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'criticalClicks50') {
                        if (this.statistics.criticalClicks >= 50) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'criticalClicks250') {
                        if (this.statistics.criticalClicks >= 250) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'criticalClicks1000') {
                        if (this.statistics.criticalClicks >= 1000) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'criticalClicks5000') {
                        if (this.statistics.criticalClicks >= 5000) {
                            earned = true;
                        }
                    }

                    // Handle special conditions for treasure rooms feats
                    else if (feat.condition.specialCondition === 'treasureRooms10') {
                        if (this.dungeon.statistics.totalTreasuresFound >= 10) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'treasureRooms50') {
                        if (this.dungeon.statistics.totalTreasuresFound >= 50) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'treasureRooms100') {
                        if (this.dungeon.statistics.totalTreasuresFound >= 100) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'treasureRooms250') {
                        if (this.dungeon.statistics.totalTreasuresFound >= 250) {
                            earned = true;
                        }
                    } else if (feat.condition.specialCondition === 'treasureRooms500') {
                        if (this.dungeon.statistics.totalTreasuresFound >= 500) {
                            earned = true;
                        }
                    }

                    // Handle special conditions for legendary feats
                    switch (feat.condition.specialCondition) {
                        case 'philosopherStoneAndEssence':
                            // Philosopher King: Find the Philosopher's Stone and reach 1 trillion essence
                            const philosophersStone = this.artifacts.find(a => a.id === 'dungeon_artifact1' && a.purchased);
                            if (philosophersStone && this.resources.essence.greaterThanOrEqual(new BigNumber(1000000000000))) {
                                earned = true;
                            }
                            break;
                        case 'compassAndCelestialRealms':
                            // Celestial Navigator: Own the Celestial Compass and 100 of each celestial realm
                            const celestialCompass = this.artifacts.find(a => a.id === 'dungeon_artifact2' && a.purchased);
                            const celestialRealms = ['realm6', 'realm7', 'realm8']; // Celestial Observatory, Void Gateway, Divine Nexus
                            const hasCelestialRealms = celestialRealms.every(id => {
                                const realm = this.realms.find(r => r.id === id);
                                return realm && realm.count >= 100;
                            });
                            if (celestialCompass && hasCelestialRealms) {
                                earned = true;
                            }
                            break;
                        case 'chronosAndTemporal':
                            // Time Lord: Possess the Chronos Fragment and Temporal Acceleration power
                            const chronosFragment = this.artifacts.find(a => a.id === 'dungeon_artifact3' && a.purchased);
                            const temporalAcceleration = this.powers.find(p => p.id === 'power12' && p.purchased);
                            if (chronosFragment && temporalAcceleration) {
                                earned = true;
                            }
                            break;
                        case 'voidGatewaysAndChalice':
                            // Void Emperor: Own 100 Void Gateways and the Void Chalice
                            const voidChalice = this.artifacts.find(a => a.id === 'dungeon_artifact4' && a.purchased);
                            const voidGateway = this.realms.find(r => r.id === 'realm7');
                            if (voidChalice && voidGateway && voidGateway.count >= 100) {
                                earned = true;
                            }
                            break;
                        case 'etherealBladeKills':
                            // Ethereal Warrior: Defeat 100 dungeon enemies with the Ethereal Blade
                            const etherealBlade = this.artifacts.find(a => a.id === 'dungeon_artifact5' && a.purchased);
                            if (etherealBlade && this.dungeon.statistics.totalEnemiesDefeated >= 100) {
                                earned = true;
                            }
                            break;
                        case 'arcaneShieldSurvival':
                            // Arcane Defender: Survive 50 dungeon encounters with the Arcane Shield
                            const arcaneShield = this.artifacts.find(a => a.id === 'dungeon_artifact6' && a.purchased);
                            if (arcaneShield && this.dungeon.statistics.totalRooms >= 50) {
                                earned = true;
                            }
                            break;
                        case 'fortuneDiceTreasures':
                            // Fortune's Favorite: Find 25 treasures with Fortune's Dice
                            const fortuneDice = this.artifacts.find(a => a.id === 'dungeon_artifact7' && a.purchased);
                            if (fortuneDice && this.dungeon.statistics.totalTreasuresFound >= 25) {
                                earned = true;
                            }
                            break;
                        case 'essencePrismChanneling':
                            // Essence Channeler: Channel 1 quadrillion essence with the Essence Prism
                            const essencePrism = this.artifacts.find(a => a.id === 'dungeon_artifact8' && a.purchased);
                            if (essencePrism && this.resources.totalEssence.greaterThanOrEqual(new BigNumber(1000000000000000))) {
                                earned = true;
                            }
                            break;
                        case 'hourglassAscensions':
                            // Ascendant Being: Perform 50 ascensions with the Ascendant's Hourglass
                            const ascendantsHourglass = this.artifacts.find(a => a.id === 'dungeon_artifact9' && a.purchased);
                            if (ascendantsHourglass && this.statistics.ascensionCount >= 50) {
                                earned = true;
                            }
                            break;
                        case 'keystoneAllRealms':
                            // Realm Architect: Own 100 of each realm with the Realm Keystone
                            const realmKeystone = this.artifacts.find(a => a.id === 'dungeon_artifact10' && a.purchased);
                            const hasAllRealms100 = this.realms.every(realm => realm.count >= 100);
                            if (realmKeystone && hasAllRealms100) {
                                earned = true;
                            }
                            break;
                        case 'soulLanternSkillPoints':
                            // Soul Illuminator: Earn 100 skill points with the Soul Lantern
                            const soulLantern = this.artifacts.find(a => a.id === 'dungeon_artifact11' && a.purchased);
                            if (soulLantern && this.dungeon.statistics.totalSkillPointsEarned >= 100) {
                                earned = true;
                            }
                            break;
                        case 'crownBossDefeats':
                            // Crown of Creation: Defeat 10 dungeon bosses with the Crown of Dominion
                            const crownOfDominion = this.artifacts.find(a => a.id === 'dungeon_artifact12' && a.purchased);
                            if (crownOfDominion && this.dungeon.statistics.totalBossesDefeated >= 10) {
                                earned = true;
                            }
                            break;
                        case 'elementalMasteryAndRealms':
                            // Elemental Overlord: Master Elemental Mastery power and own 200 of each elemental realm
                            const elementalMastery = this.powers.find(p => p.id === 'power9' && p.purchased);
                            const elementalRealms = ['realm4', 'realm5']; // Astral Waterfall, Phoenix Volcano
                            const hasElementalRealms = elementalRealms.every(id => {
                                const realm = this.realms.find(r => r.id === id);
                                return realm && realm.count >= 200;
                            });
                            if (elementalMastery && hasElementalRealms) {
                                earned = true;
                            }
                            break;
                        case 'quantumEntanglementAndRealms':
                            // Quantum Architect: Master Quantum Entanglement power and own 20 of each realm type
                            const quantumEntanglement = this.powers.find(p => p.id === 'power10' && p.purchased);
                            const hasAllRealms20 = this.realms.every(realm => realm.count >= 20);
                            if (quantumEntanglement && hasAllRealms20) {
                                earned = true;
                            }
                            break;
                        case 'dimensionalFoldingAndRealms':
                            // Dimensional Weaver: Master Dimensional Folding power and own 1000 total realms
                            const dimensionalFolding = this.powers.find(p => p.id === 'power11' && p.purchased);
                            const totalRealmCount = this.realms.reduce((sum, realm) => sum + realm.count, 0);
                            if (dimensionalFolding && totalRealmCount >= 1000) {
                                earned = true;
                            }
                            break;
                        case 'temporalAndTimeDilation':
                            // Chronomancer: Master Temporal Acceleration and Time Dilation powers
                            const temporalAccel = this.powers.find(p => p.id === 'power12' && p.purchased);
                            const timeDilation = this.powers.find(p => p.id === 'power30' && p.purchased);
                            if (temporalAccel && timeDilation) {
                                earned = true;
                            }
                            break;
                        case 'crystallizationAndCaverns':
                            // Crystal Sage: Master Essence Crystallization power and own 200 Crystal Caverns
                            const essenceCrystallization = this.powers.find(p => p.id === 'power13' && p.purchased);
                            const crystalCaverns = this.realms.find(r => r.id === 'realm3');
                            if (essenceCrystallization && crystalCaverns && crystalCaverns.count >= 200) {
                                earned = true;
                            }
                            break;
                        case 'cosmicInsightAndAttunement':
                            // Cosmic Visionary: Master Cosmic Insight and Cosmic Attunement powers
                            const cosmicInsight = this.powers.find(p => p.id === 'power14' && p.purchased);
                            const cosmicAttunement = this.powers.find(p => p.id === 'power5' && p.purchased);
                            if (cosmicInsight && cosmicAttunement) {
                                earned = true;
                            }
                            break;
                        case 'etherealResonanceAndRealms':
                            // Ethereal Resonator: Master Ethereal Resonance power and own 150 of each mystical realm
                            const etherealResonance = this.powers.find(p => p.id === 'power15' && p.purchased);
                            const mysticalRealms = ['realm9', 'realm10', 'realm11']; // Ethereal Library, Temporal Oasis, Mindscape Labyrinth
                            const hasMysticalRealms = mysticalRealms.every(id => {
                                const realm = this.realms.find(r => r.id === id);
                                return realm && realm.count >= 150;
                            });
                            if (etherealResonance && hasMysticalRealms) {
                                earned = true;
                            }
                            break;
                        case 'ascendantWillAndAscensions':
                            // Ascension Master: Master Ascendant Will power and perform 100 ascensions
                            const ascendantWill = this.powers.find(p => p.id === 'power16' && p.purchased);
                            if (ascendantWill && this.statistics.ascensionCount >= 100) {
                                earned = true;
                            }
                            break;
                        case 'realityManipulationAndRealms':
                            // Reality Shaper: Master Reality Manipulation power and own 500 of each realm
                            const realityManipulation = this.powers.find(p => p.id === 'power17' && p.purchased);
                            const hasAllRealms500 = this.realms.every(realm => realm.count >= 500);
                            if (realityManipulation && hasAllRealms500) {
                                earned = true;
                            }
                            break;
                        case 'transcendentEssenceAndChanneling':
                            // Transcendent One: Master Transcendent Essence power and channel 1 quintillion essence
                            const transcendentEssence = this.powers.find(p => p.id === 'power18' && p.purchased);
                            if (transcendentEssence && this.resources.totalEssence.greaterThanOrEqual(new BigNumber('1000000000000000000'))) {
                                earned = true;
                            }
                            break;
                        case 'cosmicSynergyAndRealms':
                            // Cosmic Harmonizer: Master Cosmic Synergy power and own at least 50 of each realm
                            const cosmicSynergy = this.powers.find(p => p.id === 'power19' && p.purchased);
                            const hasAllRealms50 = this.realms.every(realm => realm.count >= 50);
                            if (cosmicSynergy && hasAllRealms50) {
                                earned = true;
                            }
                            break;
                        case 'omniscienceAndArtifacts':
                            // All-Seeing: Master Omniscience power and discover all artifacts
                            const omniscience = this.powers.find(p => p.id === 'power20' && p.purchased);
                            const allArtifactsDiscovered = this.artifacts.every(artifact => artifact.purchased);
                            if (omniscience && allArtifactsDiscovered) {
                                earned = true;
                            }
                            break;
                        case 'dungeonPowersAndEnemies':
                            // Dungeon Master: Master all dungeon-related powers and defeat 300 enemies
                            const dungeonPowers = ['power21', 'power22', 'power23', 'power24', 'power25', 'power26'];
                            const hasAllDungeonPowers = dungeonPowers.every(id => {
                                const power = this.powers.find(p => p.id === id);
                                return power && power.purchased;
                            });
                            if (hasAllDungeonPowers && this.dungeon.statistics.totalEnemiesDefeated >= 300) {
                                earned = true;
                            }
                            break;
                        case 'essenceAccelerationAndRealms':
                            // Essence Accelerator: Master Essence Acceleration power and own 2000 total realms
                            const essenceAcceleration = this.powers.find(p => p.id === 'power27' && p.purchased);
                            const totalRealms = this.realms.reduce((sum, realm) => sum + realm.count, 0);
                            if (essenceAcceleration && totalRealms >= 2000) {
                                earned = true;
                            }
                            break;
                        case 'midasTouchAndCriticals':
                            // Golden Touch: Master Midas Touch power and trigger 100 critical clicks
                            const midasTouch = this.powers.find(p => p.id === 'power28' && p.purchased);
                            // We'll need to track critical clicks in statistics
                            if (midasTouch && this.statistics.criticalClicks >= 100) {
                                earned = true;
                            }
                            break;
                        case 'realmHarmonyAndAllTypes':
                            // Harmonic Convergence: Master Realm Harmony power and own all realm types
                            const realmHarmony = this.powers.find(p => p.id === 'power29' && p.purchased);
                            const hasAllRealmTypes = this.realms.every(realm => realm.count > 0);
                            if (realmHarmony && hasAllRealmTypes) {
                                earned = true;
                            }
                            break;
                        case 'essenceOverflowAndAmount':
                            // Essence Tsunami: Master Essence Overflow power and reach 1 quintillion essence
                            const essenceOverflow = this.powers.find(p => p.id === 'power31' && p.purchased);
                            if (essenceOverflow && this.resources.essence.greaterThanOrEqual(new BigNumber('1000000000000000000'))) {
                                earned = true;
                            }
                            break;
                        case 'cosmicBalanceAscensionsAndRealms':
                            // Perfect Balance: Master Cosmic Balance power, perform 50 ascensions, and own 100 of each realm
                            const cosmicBalance = this.powers.find(p => p.id === 'power32' && p.purchased);
                            const hasAllRealms100Again = this.realms.every(realm => realm.count >= 100);
                            if (cosmicBalance && this.statistics.ascensionCount >= 50 && hasAllRealms100Again) {
                                earned = true;
                            }
                            break;
                    }
                }

                if (earned) {
                    feat.earned = true;
                    featsEarned = true;
                    this.showNotification(`Feat achieved: ${feat.name}!`, 'achievement');
                }
            }
        }

        // Only update feats UI if new feats were earned
        if (featsEarned) {
            this.uiUpdateFlags.feats = true;
            this.uiUpdateFlags.statistics = true; // Statistics might show feat counts
        }

        // Return whether any feats were earned
        return featsEarned;
    }

    calculateRealmCost(realm) {
        let baseCost = new BigNumber(realm.baseCost);
        let costMultiplier = realm.costMultiplier;

        // Calculate the base cost with the standard multiplier
        let finalCost = baseCost.multiply(Math.pow(costMultiplier, realm.count));

        // Apply cost reduction powers to the final cost, not to the multiplier
        let totalReduction = 1.0;

        // Apply cost reduction powers
        for (const power of this.powers) {
            if (power.purchased && power.effect.costReduction) {
                totalReduction *= power.effect.costReduction;
            }
        }

        // Apply Realm Harmony power (each realm type reduces cost by 1%)
        const realmHarmonyPower = this.powers.find(p => p.purchased && p.effect.realmTypeCostReduction);
        if (realmHarmonyPower) {
            const activeRealmTypes = this.realms.filter(r => r.count > 0).length;
            if (activeRealmTypes > 0) {
                const harmonyReduction = Math.max(0, 1 - (activeRealmTypes * 0.01));
                totalReduction *= harmonyReduction;
            }
        }

        // Apply cost reduction from dungeon artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'dungeon' && artifact.effect.costReduction) {
                totalReduction *= artifact.effect.costReduction;
            }
        }

        // Apply cost reduction from ascension artifacts with scaling effects
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionCostReduction) {
                // Calculate reduction based on ascension count
                const reductionPerAscension = artifact.effect.ascensionCostReduction * this.statistics.ascensionCount;
                const ascensionReduction = Math.max(0, 1 - reductionPerAscension);
                totalReduction *= ascensionReduction;
            }
        }

        // Apply the total reduction to the final cost
        return finalCost.multiply(totalReduction);
    }

    buyRealm(realmId) {
        const realm = this.realms.find(r => r.id === realmId);
        if (!realm || !realm.unlocked) return false;

        const cost = this.calculateRealmCost(realm);

        // For the first realm purchase (Luminous Garden), charge slightly less to prevent division by zero
        let actualCost = cost;
        if (realm.id === 'realm1' && realm.count === 0 && cost.equals(new BigNumber(10))) {
            actualCost = cost.subtract(0.1);
        }

        if (this.resources.essence.greaterThanOrEqual(actualCost)) {
            this.resources.essence = this.resources.essence.subtract(actualCost);
            realm.count++;

            // Clear production cache for this realm
            if (this._realmProductionCache) {
                Object.keys(this._realmProductionCache).forEach(key => {
                    if (key.startsWith(`${realm.id}_`)) {
                        delete this._realmProductionCache[key];
                    }
                });
            }

            // Set update flags
            this.uiUpdateFlags.resources = true;
            this.uiUpdateFlags.realms = true;
            this.uiUpdateFlags.bonuses = true; // Update bonuses UI when realm is purchased

            // Check if this purchase unlocks any artifacts
            for (const artifact of this.artifacts) {
                if (!artifact.unlocked && artifact.unlockAt && artifact.unlockAt.realmCount) {
                    if (artifact.unlockAt.realmCount.id === realm.id && realm.count >= artifact.unlockAt.realmCount.count) {
                        this.uiUpdateFlags.artifacts = true;
                        break;
                    }
                }
            }

            // Check if this affects synergy
            if (this.powers.find(p => p.purchased && p.effect.synergy)) {
                // If this is the first of this realm type, synergy will change
                if (realm.count === 1) {
                    // Clear all realm production caches as synergy affects all
                    this._realmProductionCache = {};
                }
            }

            // Ensure the UI is fully updated after a realm purchase
            // This is important to make sure the buttons work correctly
            // console.log(`Successfully purchased realm: ${realm.name}`);

            // Immediately update the realms UI
            const now = Date.now();
            this.updateRealmsUI();
            this._realmUpdateState.lastFullUpdate = now;
            this._realmUpdateState.needsFullUpdate = false;
            this._realmUpdateState.needsAffordabilityUpdate = false;

            // Update affordability for all purchase buttons
            this.updateAllAffordability();
            this._lastAffordabilityUpdate = now;

            // Update other UI components selectively
            this.updateResourcesUI(); // Update resources immediately

            // Reset update flags
            Object.keys(this.uiUpdateFlags).forEach(key => {
                this.uiUpdateFlags[key] = false;
            });

            return true;
        }

        return false;
    }

    buyArtifact(artifactId) {
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact || !artifact.unlocked || artifact.purchased) {
            console.warn(`Cannot buy artifact: ${artifactId} - not found, not unlocked, or already purchased`);
            return false;
        }

        const costResource = artifact.costResource || 'essence';

        // Ensure we have the resource type
        if (!this.resources[costResource]) {
            console.error(`Invalid resource type: ${costResource} for artifact ${artifact.name}`);
            return false;
        }

        // Detailed logging for debugging
        //console.log(`Attempting to buy artifact: ${artifact.name}`);
        //console.log(`Cost resource: ${costResource}`);
        //console.log(`Current ${costResource}: ${this.resources[costResource].toString()}`);
        //console.log(`Cost: ${artifact.cost.toString()}`);

        // Perform a strict affordability check
        // First convert both to raw numbers for a direct comparison
        const resourceValue = this.resources[costResource].valueOf();
        const costValue = artifact.cost.valueOf();

        // Log the raw values
        //console.log(`Resource value: ${resourceValue}`);
        //console.log(`Cost value: ${costValue}`);

        // Check using both methods for redundancy
        const canAffordDirect = resourceValue >= costValue;
        const canAffordBigNumber = this.resources[costResource].greaterThanOrEqual(artifact.cost);

        //console.log(`Can afford (direct): ${canAffordDirect}`);
        //console.log(`Can afford (BigNumber): ${canAffordBigNumber}`);

        // Only proceed if both checks pass
        if (!canAffordDirect || !canAffordBigNumber) {
            console.warn(`Cannot afford artifact ${artifact.name}: ${this.resources[costResource].toString()} < ${artifact.cost.toString()}`);
            // Force update the UI to reflect correct affordability
            this._forceArtifactsUpdate = true;
            this.updateArtifactsUI();
            return false;
        }

        // If we can afford it, proceed with the purchase
        this.resources[costResource] = this.resources[costResource].subtract(artifact.cost);
        artifact.purchased = true;

        // Apply artifact effects
        this.applyArtifactEffect(artifact);

        // Validate essencePerClick after applying artifact effects
        // This is a safety check to prevent the bug where essence per channel becomes 0
        if (this.essencePerClick.mantissa === 0 || !isFinite(this.essencePerClick.mantissa) || this.essencePerClick.valueOf() <= 0) {
            console.warn(`Invalid essencePerClick detected after buying ${artifact.name}: ${this.essencePerClick.toString()}. Resetting to 1.`);
            this.essencePerClick = new BigNumber(1);

            // Calculate total multiplier from all channeling artifacts
            let totalMultiplier = 1;
            for (const a of this.artifacts) {
                if (a.purchased && a.type === 'channeling') {
                    const multiplier = a.effect.multiplier || 1;
                    totalMultiplier *= multiplier;
                    console.log(`Including multiplier from ${a.name}: ${multiplier}x (total now: ${totalMultiplier}x)`);
                }
            }

            // Apply the total multiplier directly
            if (totalMultiplier > 1) {
                this.essencePerClick = new BigNumber(totalMultiplier);
                console.log(`Applied total channeling multiplier: ${totalMultiplier}x, new value: ${this.essencePerClick.toString()}`);
            } else {
                // If no valid multipliers, set to 10 as a fallback
                this.essencePerClick = new BigNumber(10);
                console.log(`No valid multipliers found, setting to default: ${this.essencePerClick.toString()}`);
            }
        }

        // Flag bonuses UI for update
        this.uiUpdateFlags.bonuses = true;

        // Force an immediate update of the artifacts UI
        this._forceArtifactsUpdate = true;
        this.updateArtifactsUI();

        // Update other UI elements
        this.uiUpdateFlags.resources = true;
        this.updateSelectiveUI();

        // Update affordability for all purchase buttons
        const now = Date.now();
        this.updateAllAffordability();
        this._lastAffordabilityUpdate = now;

        this.showNotification(`Acquired artifact: ${artifact.name}!`, 'upgrade');
        return true;
    }

    applyArtifactEffect(artifact) {
        if (artifact.type === 'channeling') {
            // Safety check: ensure essencePerClick is valid before multiplying
            if (this.essencePerClick.mantissa === 0 || !isFinite(this.essencePerClick.mantissa)) {
                console.warn(`Resetting essencePerClick to 1 before applying ${artifact.name} effect`);
                this.essencePerClick = new BigNumber(1);
            }

            // Get the multiplier with a fallback to 1 if undefined
            const multiplier = artifact.effect.multiplier || 1;

            // Apply the multiplier using direct calculation instead of BigNumber.multiply
            const oldValue = this.essencePerClick.toString();
            const newValue = parseFloat(oldValue) * multiplier;
            this.essencePerClick = new BigNumber(newValue);

            console.log(`Applied ${artifact.name} channeling effect: ${oldValue} × ${multiplier} = ${this.essencePerClick.toString()}`);

            // Verify the result is valid
            if (this.essencePerClick.mantissa === 0 || !isFinite(this.essencePerClick.mantissa) || this.essencePerClick.valueOf() <= 0) {
                console.warn(`Invalid essencePerClick after applying ${artifact.name}: ${this.essencePerClick.toString()}. Setting to ${multiplier}.`);
                this.essencePerClick = new BigNumber(multiplier);
            }
        } else if (artifact.type === 'global') {
            // Apply global artifact effects
            if (artifact.effect.multiplier) {
                this.productionMultiplier = this.productionMultiplier.multiply(artifact.effect.multiplier);
            }
            // Don't apply dungeonEssenceReward here - it's applied during dungeon reward calculations
        } else if (artifact.type === 'dungeon') {
            // Apply dungeon artifact effects
            if (artifact.effect.essenceMultiplier) {
                this.productionMultiplier = this.productionMultiplier.multiply(artifact.effect.essenceMultiplier);
            }
            if (artifact.effect.realmProductionMultiplier) {
                this.productionMultiplier = this.productionMultiplier.multiply(artifact.effect.realmProductionMultiplier);
            }
            if (artifact.effect.clickMultiplier) {
                this.essencePerClick = this.essencePerClick.multiply(artifact.effect.clickMultiplier);
            }
            if (artifact.effect.gameSpeed) {
                this.settings.gameSpeed *= artifact.effect.gameSpeed;
                // Update game speed UI if it exists
                const gameSpeedElement = document.getElementById('game-speed');
                const gameSpeedValueElement = document.getElementById('game-speed-value');
                if (gameSpeedElement && gameSpeedValueElement) {
                    gameSpeedElement.value = this.settings.gameSpeed;
                    gameSpeedValueElement.textContent = `${this.settings.gameSpeed}x`;
                }
            }
            if (artifact.effect.costReduction) {
                // This will be applied dynamically when calculating costs
            }
            if (artifact.effect.powerPointMultiplier) {
                // This will be applied during power point calculations
            }
            // Other dungeon-specific effects will be applied during dungeon calculations
        } else if (artifact.type === 'ascension') {
            // Handle regular ascension artifacts with fixed multipliers
            if (artifact.effect.multiplier) {
                // These are applied during power point calculations
            }

            // Handle ascension-locked artifacts with scaling effects
            if (artifact.effect.ascensionProductionBonus) {
                // Increase essence production by X% for each ascension completed
                const bonus = 1 + (artifact.effect.ascensionProductionBonus * this.statistics.ascensionCount);
                this.productionMultiplier = this.productionMultiplier.multiply(bonus);

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionProductionBonus * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionSynergyBonus) {
                // Each realm type boosts overall production by X% for each ascension completed
                // This will be applied dynamically during production calculations

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionSynergyBonus * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionDungeonRewardBonus) {
                // Increase dungeon rewards by X% for each ascension completed
                // This will be applied dynamically during dungeon reward calculations

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionDungeonRewardBonus * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionChannelingBonus) {
                // Increase essence from channeling by X% for each ascension completed
                const bonus = 1 + (artifact.effect.ascensionChannelingBonus * this.statistics.ascensionCount);
                this.essencePerClick = this.essencePerClick.multiply(bonus);

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionChannelingBonus * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionCostReduction) {
                // Reduce realm costs by X% for each ascension completed
                // This will be applied dynamically when calculating costs

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionCostReduction * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionRealmCountBonus) {
                // Gain X% more essence for each realm owned for each ascension completed
                // This will be applied dynamically during production calculations

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionRealmCountBonus * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionGameSpeedBonus) {
                // Increase game speed by X% for each ascension completed
                const bonus = 1 + (artifact.effect.ascensionGameSpeedBonus * this.statistics.ascensionCount);
                this.settings.gameSpeed *= bonus;

                // Update game speed UI if it exists
                const gameSpeedElement = document.getElementById('game-speed');
                const gameSpeedValueElement = document.getElementById('game-speed-value');
                if (gameSpeedElement && gameSpeedValueElement) {
                    gameSpeedElement.value = this.settings.gameSpeed;
                    gameSpeedValueElement.textContent = `${this.settings.gameSpeed}x`;
                }

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionGameSpeedBonus * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionPowerPointBonus) {
                // Increase power point gain by X% for each ascension completed
                // This will be applied during power point calculations

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionPowerPointBonus * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionQuantumSynergyBonus) {
                // Each realm boosts the production of all others by X% for each ascension completed
                // This will be applied dynamically during production calculations

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionQuantumSynergyBonus * this.statistics.ascensionCount * 100).toFixed(1);
                artifact.description = artifact.description.replace(/\(currently: [\d\.]+%\)/, `(currently: ${currentBonus}%)`);
            }
            if (artifact.effect.ascensionMetaMultiplierBonus) {
                // All effects are X% stronger for each ascension completed
                // This will be applied dynamically during various calculations

                // Update description to show current bonus
                const currentBonus = (artifact.effect.ascensionMetaMultiplierBonus * this.statistics.ascensionCount * 100).toFixed(0);
                artifact.description = artifact.description.replace(/\(currently: \d+%\)/, `(currently: ${currentBonus}%)`);
            }
        }
        // Realm-specific artifacts are applied during production calculation
    }

    buyPower(powerId) {
        const power = this.powers.find(p => p.id === powerId);
        if (!power) {
            // console.log(`Power not found: ${powerId}`);
            return false;
        }

        if (!power.unlocked) {
            // console.log(`Power not unlocked: ${power.name}`);
            return false;
        }

        if (power.purchased) {
            // console.log(`Power already purchased: ${power.name}`);
            return false;
        }

        // Special handling for power20 and power30
        if (power.id === 'power20' || power.id === 'power30') {
            // For these problematic powers, skip the requirements check
            // Just make sure they're unlocked (which we already checked) and affordable
        } else {
            // Check if all requirements are met for normal powers
            if (power.requires) {
                const allRequirementsMet = power.requires.every(req =>
                    this.powers.find(p => p.id === req && p.purchased)
                );
                if (!allRequirementsMet) {
                    // console.log(`Requirements not met for: ${power.name}`);
                    return false;
                }
            }
        }

        // Check if player can afford it
        const canAfford = this.resources.powerPoints.greaterThanOrEqual(power.cost);
        // console.log(`Can afford ${power.name}? ${canAfford} (${this.resources.powerPoints} >= ${power.cost})`);
        if (!canAfford) return false;

        // Purchase the power
        this.resources.powerPoints = this.resources.powerPoints.subtract(power.cost);
        power.purchased = true;
        // console.log(`Purchased power: ${power.name}`);

        // Apply power effects
        this.applyPowerEffects(power);

        // Flag bonuses UI for update
        this.uiUpdateFlags.bonuses = true;

        // Update UI
        this.updateUI();

        // Update affordability for all purchase buttons
        const now = Date.now();
        this.updateAllAffordability();
        this._lastAffordabilityUpdate = now;

        this.showNotification(`Mastered power: ${power.name}!`);

        return true;
    }

    applyPowerEffects(power) {
        // Apply various power effects
        if (power.effect.multiplier) {
            this.productionMultiplier = this.productionMultiplier.multiply(power.effect.multiplier);
        }
        if (power.effect.clickMultiplier) {
            this.essencePerClick = this.essencePerClick.multiply(power.effect.clickMultiplier);
        }
        if (power.effect.gameSpeed) {
            this.settings.gameSpeed *= power.effect.gameSpeed;
            document.getElementById('game-speed').value = this.settings.gameSpeed;
            document.getElementById('game-speed-value').textContent = `${this.settings.gameSpeed}x`;
        }
        if (power.effect.ascensionMultiplier) {
            this.ascensionMultiplier = this.ascensionMultiplier.multiply(power.effect.ascensionMultiplier);
        }
        // Apply Cosmic Balance power (10% more power points and essence)
        if (power.effect.balanceBonus) {
            this.productionMultiplier = this.productionMultiplier.multiply(power.effect.balanceBonus);
            // Power points bonus will be applied in updatePowerPoints
        }
        // Clear production cache when applying power effects
        this._realmProductionCache = {};
        // Other effects will be applied dynamically during production calculations
    }

    channelEssence() {
        let essenceGained = new BigNumber(this.essencePerClick);
        let isCritical = false;

        // Check for critical click from Essence Crystallization power
        const criticalPower = this.powers.find(p => p.purchased && p.effect.criticalClick);
        if (criticalPower) {
            const critChance = criticalPower.effect.criticalClick.chance;
            const critMultiplier = criticalPower.effect.criticalClick.multiplier;

            // Check for meta multiplier from Omniscience power
            const metaPower = this.powers.find(p => p.purchased && p.effect.metaMultiplier);
            const metaMultiplier = metaPower ? metaPower.effect.metaMultiplier : 1;

            // Apply meta multiplier to crit chance and multiplier if applicable
            const adjustedCritChance = metaPower ? critChance * metaMultiplier : critChance;
            const adjustedCritMultiplier = metaPower ? 1 + ((critMultiplier - 1) * metaMultiplier) : critMultiplier;

            // Roll for critical click
            if (Math.random() < adjustedCritChance) {
                essenceGained = essenceGained.multiply(adjustedCritMultiplier);
                isCritical = true;
                this.statistics.criticalClicks++;
            }
        }

        // Check for Midas Touch power (2% chance to give 50x essence)
        if (!isCritical) { // Only apply if not already critical
            const midasPower = this.powers.find(p => p.purchased && p.effect.criticalClick && p.id === 'power28');
            if (midasPower) {
                const midasChance = midasPower.effect.criticalClick.chance;
                const midasMultiplier = midasPower.effect.criticalClick.multiplier;

                // Roll for Midas Touch
                if (Math.random() < midasChance) {
                    essenceGained = essenceGained.multiply(midasMultiplier);
                    isCritical = true;
                    this.statistics.criticalClicks++;
                    this.showNotification('Midas Touch activated! 50x essence gained!', 'critical');
                }
            }
        }

        this.resources.essence = this.resources.essence.add(essenceGained);
        this.resources.totalEssence = this.resources.totalEssence.add(essenceGained);
        this.statistics.totalClicks++;

        if (this.resources.essence.greaterThan(this.statistics.highestEssence)) {
            this.statistics.highestEssence = new BigNumber(this.resources.essence);
        }

        // Add a click effect
        this.createClickEffect(essenceGained, isCritical);

        // Set update flags
        this.uiUpdateFlags.resources = true;
        this.uiUpdateFlags.realms = true; // Realm affordability might have changed
        this.uiUpdateFlags.statistics = true;

        // Selective UI update instead of full update
        this.updateSelectiveUI();

        // Reset update flags
        Object.keys(this.uiUpdateFlags).forEach(key => {
            this.uiUpdateFlags[key] = false;
        });
    }

    // Optimization: Throttle click effects to reduce DOM operations
    createClickEffect(essenceGained, isCritical = false) {
        // Use cached button element
        const button = this.domCache.clickButton;

        // Optimization: Limit the number of click effects that can be active at once
        if (this._clickEffectsActive >= 5) return;
        if (!this._clickEffectsActive) this._clickEffectsActive = 0;
        this._clickEffectsActive++;

        const rect = button.getBoundingClientRect();

        // Create effect element
        const effect = document.createElement('div');
        effect.className = isCritical ? 'click-effect critical' : 'click-effect'; // Use a class instead of inline styles
        effect.style.left = `${rect.left + rect.width / 2}px`;
        effect.style.top = `${rect.top + rect.height / 2}px`;
        effect.textContent = `+${this.formatNumber(essenceGained)}`;

        // Add keyframe animation only once
        if (!document.getElementById('click-animation')) {
            const style = document.createElement('style');
            style.id = 'click-animation';
            style.textContent = `
                .click-effect {
                    position: absolute;
                    transform: translate(-50%, -50%);
                    font-size: 1.5rem;
                    color: var(--accent);
                    font-weight: bold;
                    text-shadow: 0 0 10px var(--accent);
                    z-index: 100;
                    pointer-events: none;
                    animation: floatUp 1.5s ease-out forwards;
                }
                .click-effect.critical {
                    color: var(--magic);
                    text-shadow: 0 0 15px var(--magic);
                    font-size: 2rem;
                    animation: floatUpCritical 2s ease-out forwards;
                }
                @keyframes floatUp {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -150%) scale(1.5);
                    }
                }
                @keyframes floatUpCritical {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    }
                    50% {
                        opacity: 0.8;
                        transform: translate(-50%, -100%) scale(1.8) rotate(10deg);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -200%) scale(2.5) rotate(-10deg);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(effect);

        // Remove after animation
        setTimeout(() => {
            if (document.body.contains(effect)) {
                document.body.removeChild(effect);
            }
            this._clickEffectsActive--;
        }, isCritical ? 2000 : 1500);
    }

    ascend() {
        if (this.powerPointsOnReset.lessThanOrEqual(0)) return false;

        const pointsGained = new BigNumber(this.powerPointsOnReset);

        // Add power points
        this.resources.powerPoints = this.resources.powerPoints.add(pointsGained);
        this.statistics.totalPowerPoints = this.statistics.totalPowerPoints.add(pointsGained);
        this.statistics.ascensionCount++;

        // Update ascension multiplier (base formula: 1 + log10(total power points))
        this.ascensionMultiplier = new BigNumber(1 + Math.log10(this.statistics.totalPowerPoints.valueOf() + 1));

        // Reset generators and essence
        this.resources.essence = new BigNumber(0);
        this.resources.totalEssence = new BigNumber(0);

        for (const realm of this.realms) {
            realm.count = 0;

            // Keep realm unlock status if it was unlocked by ascension count
            if (realm.unlockAt && realm.unlockAt.ascensionCount) {
                realm.unlocked = this.statistics.ascensionCount >= realm.unlockAt.ascensionCount;
            } else if (realm.id === 'realm1') {
                // Always keep the first realm unlocked
                realm.unlocked = true;
            } else {
                realm.unlocked = false;
            }
        }

        // Reset artifacts, keeping ascension and dungeon artifacts
        if (this.artifacts && this.artifacts.length > 0) {
            for (const artifact of this.artifacts) {
                if (artifact.type !== 'ascension' && artifact.type !== 'dungeon') {
                    // Reset purchase status for all non-ascension and non-dungeon artifacts
                    artifact.purchased = false;

                    // Keep artifact unlock status if it was unlocked by ascension count
                    if (artifact.unlockAt && artifact.unlockAt.ascensionCount) {
                        artifact.unlocked = this.statistics.ascensionCount >= artifact.unlockAt.ascensionCount;
                    } else if (artifact.id === 'artifact1') {
                        // Always keep the first artifact unlocked
                        artifact.unlocked = true;
                    } else {
                        // Reset unlock status for all other artifacts
                        artifact.unlocked = false;
                    }
                }
            }

            // Log artifact reset for debugging
            // console.log('Artifacts reset during ascension');
            // console.log('Remaining purchased artifacts:', this.artifacts.filter(a => a.purchased).map(a => a.name));
        } else {
            // console.log('No artifacts to reset during ascension');
        }

        // Reset all multipliers and effects
        this.essencePerClick = new BigNumber(1);
        this.productionMultiplier = new BigNumber(1);

        // Reset any cached production values
        this._realmProductionCache = {};

        // Apply ascension and dungeon artifacts again
        if (this.artifacts && this.artifacts.length > 0) {
            // console.log('Reapplying persistent artifacts');
            for (const artifact of this.artifacts) {
                if (artifact.purchased && (artifact.type === 'ascension' || artifact.type === 'dungeon')) {
                    // console.log(`Reapplying effect of ${artifact.name}`);
                    this.applyArtifactEffect(artifact);
                }
            }
        }

        // Reapply power effects for purchased powers
        if (this.powers && this.powers.length > 0) {
            // console.log('Reapplying power effects');
            for (const power of this.powers) {
                if (power.purchased) {
                    // console.log(`Reapplying effect of ${power.name}`);
                    this.applyPowerEffects(power);
                }
            }
        }

        // Flag UI components for update
        this.uiUpdateFlags.bonuses = true;
        this.uiUpdateFlags.artifacts = true; // Ensure artifacts UI is updated
        this.uiUpdateFlags.realms = true;    // Ensure realms UI is updated
        this.uiUpdateFlags.resources = true; // Ensure resources UI is updated

        // Update the UI
        this.updateUI();

        // Update affordability for all purchase buttons
        const now = Date.now();
        this.updateAllAffordability();
        this._lastAffordabilityUpdate = now;

        // Show notification
        this.showNotification(`Ascension complete! Gained ${this.formatPowerPoints(pointsGained)} power points.`, 'prestige');
        return true;
    }

    formatNumber(number) {
        if (!(number instanceof BigNumber)) {
            number = new BigNumber(number);
        }

        return number.toString(this.settings.numberFormat);
    }

    showNotification(message, type = 'default') {
        // Determine if this is a feat notification
        const isFeatNotification = type === 'achievement';

        // Get the appropriate container
        const maxNotifications = 5;
        let container;

        if (isFeatNotification) {
            // Use the feat notifications container
            if (!this.domCache.featNotificationsContainer) {
                this.domCache.featNotificationsContainer = document.getElementById('feat-notifications');
            }
            container = this.domCache.featNotificationsContainer;
        } else {
            // Use the regular notifications container
            container = this.domCache.notificationsContainer;
        }

        // If we have too many notifications, remove the oldest one
        if (container.children.length >= maxNotifications) {
            container.removeChild(container.firstChild);
        }

        // Create the notification element
        const notification = document.createElement('div');

        if (isFeatNotification) {
            // Create a special feat notification
            notification.className = 'feat-notification';

            // Create confetti container
            const confettiContainer = document.createElement('div');
            confettiContainer.className = 'confetti-container';

            // Add confetti pieces
            const confettiCount = 30;
            const colors = ['gold', 'blue', 'purple', 'red', 'green'];

            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]}`;

                // Random position and delay
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.animationDelay = `${Math.random() * 1.5}s`;
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

                // Random shape
                if (Math.random() > 0.5) {
                    confetti.style.borderRadius = '50%';
                } else if (Math.random() > 0.5) {
                    confetti.style.width = '7px';
                    confetti.style.height = '14px';
                }

                confettiContainer.appendChild(confetti);
            }

            // Add balloons
            const balloonCount = 6;
            const balloonEmojis = ['🎈', '🎊', '✨', '🎉', '🏆', '🌟'];

            for (let i = 0; i < balloonCount; i++) {
                const balloon = document.createElement('div');
                balloon.className = 'balloon';
                balloon.textContent = balloonEmojis[i % balloonEmojis.length];

                // Random position and delay
                balloon.style.left = `${10 + (i * 15) + (Math.random() * 5)}%`;
                balloon.style.animationDelay = `${Math.random() * 0.5}s`;

                confettiContainer.appendChild(balloon);
            }

            notification.appendChild(confettiContainer);

            // Create content with icon
            const content = document.createElement('div');
            content.className = 'notification-content';
            content.innerHTML = `<span style="font-size: 1.3rem; margin-right: 10px;">🏆</span> ${message}`;

            notification.appendChild(content);

            // Longer display time for feat notifications
            setTimeout(() => {
                if (notification.parentNode) {
                    container.removeChild(notification);
                }
            }, 7000);
        } else {
            // Regular notification
            notification.className = `notification ${type}`;

            const content = document.createElement('div');
            content.className = 'notification-content';
            content.textContent = message;

            notification.appendChild(content);

            // Standard display time for regular notifications
            setTimeout(() => {
                if (notification.parentNode) {
                    container.removeChild(notification);
                }
            }, 5000);
        }

        // Add the notification to the appropriate container
        container.appendChild(notification);
    }

    saveGame() {
        const saveData = {
            resources: {
                essence: this.resources.essence ? this.resources.essence.toJSON() : null,
                totalEssence: this.resources.totalEssence ? this.resources.totalEssence.toJSON() : null,
                powerPoints: this.resources.powerPoints ? this.resources.powerPoints.toJSON() : null
            },
            statistics: {
                ...this.statistics,
                gameStarted: this.statistics.gameStarted ? this.statistics.gameStarted.toISOString() : new Date().toISOString(),
                highestEssence: this.statistics.highestEssence ? this.statistics.highestEssence.toJSON() : null,
                totalPowerPoints: this.statistics.totalPowerPoints ? this.statistics.totalPowerPoints.toJSON() : null
            },
            realms: this.realms.map(r => ({
                ...r,
                baseCost: r.baseCost ? r.baseCost.toJSON() : null,
                baseProduction: r.baseProduction ? r.baseProduction.toJSON() : null
            })),
            artifacts: this.artifacts.map(a => ({
                ...a,
                cost: a.cost ? a.cost.toJSON() : null
            })),
            powers: this.powers.map(p => ({
                ...p,
                cost: p.cost ? p.cost.toJSON() : null
            })),
            feats: this.feats,
            essencePerClick: this.essencePerClick ? this.essencePerClick.toJSON() : null,
            productionMultiplier: this.productionMultiplier ? this.productionMultiplier.toJSON() : null,
            ascensionMultiplier: this.ascensionMultiplier ? this.ascensionMultiplier.toJSON() : null,
            powerPointsOnReset: this.powerPointsOnReset ? this.powerPointsOnReset.toJSON() : null,
            dungeon: {
                statistics: this.dungeon.statistics,
                player: {
                    skillPoints: this.dungeon.player.skillPoints,
                    skills: this.dungeon.player.skills
                }
                // Only save persistent data, not active dungeon state
            },
            settings: {
                numberFormat: this.settings.numberFormat,
                saveFrequency: this.settings.saveFrequency,
                gameSpeed: this.settings.gameSpeed,
                visualEffects: this.settings.visualEffects,
                particleCount: this.settings.particleCount,
                uiUpdateRate: this.settings.uiUpdateRate
            },
            version: '1.0'
        };

        localStorage.setItem('etherealAscensionSave', JSON.stringify(saveData));
    }

    loadGame() {
        const saveData = localStorage.getItem('etherealAscensionSave');
        if (!saveData) return;

        try {
            const data = JSON.parse(saveData);

            // Load settings
            if (data.settings) {
                // Load each setting individually to handle new settings in newer versions
                if (data.settings.numberFormat) this.settings.numberFormat = data.settings.numberFormat;
                if (data.settings.saveFrequency) this.settings.saveFrequency = data.settings.saveFrequency;
                if (data.settings.gameSpeed) this.settings.gameSpeed = data.settings.gameSpeed;
                if (data.settings.visualEffects) this.settings.visualEffects = data.settings.visualEffects;
                if (data.settings.particleCount) this.settings.particleCount = data.settings.particleCount;
                if (data.settings.uiUpdateRate) this.settings.uiUpdateRate = data.settings.uiUpdateRate;

                // Update settings UI
                document.getElementById('number-format').value = this.settings.numberFormat;
                document.getElementById('save-frequency').value = this.settings.saveFrequency;
                document.getElementById('game-speed').value = this.settings.gameSpeed;
                document.getElementById('game-speed-value').textContent = `${this.settings.gameSpeed}x`;

                // Update performance settings UI
                document.getElementById('visual-effects').value = this.settings.visualEffects;
                document.getElementById('particle-count').value = this.settings.particleCount;
                document.getElementById('ui-update-rate').value = this.settings.uiUpdateRate;

                // Apply performance settings
                this._uiUpdateInterval = this.settings.uiUpdateRate;
                this.applyVisualEffectsSettings();
            }

            // Load resources
            if (data.resources) {
                this.resources.essence = data.resources.essence ? BigNumber.fromJSON(data.resources.essence) : new BigNumber(0);
                this.resources.totalEssence = data.resources.totalEssence ? BigNumber.fromJSON(data.resources.totalEssence) : new BigNumber(0);
                this.resources.powerPoints = data.resources.powerPoints ? BigNumber.fromJSON(data.resources.powerPoints) : new BigNumber(0);
            }

            // Load statistics
            if (data.statistics) {
                this.statistics = {
                    ...data.statistics,
                    gameStarted: data.statistics.gameStarted ? new Date(data.statistics.gameStarted) : new Date(),
                    highestEssence: data.statistics.highestEssence ? BigNumber.fromJSON(data.statistics.highestEssence) : new BigNumber(0),
                    totalPowerPoints: data.statistics.totalPowerPoints ? BigNumber.fromJSON(data.statistics.totalPowerPoints) : new BigNumber(0),
                    criticalClicks: data.statistics.criticalClicks || 0 // Initialize criticalClicks if it doesn't exist
                };
            }

            // Load realms
            if (data.realms) {
                for (let i = 0; i < data.realms.length; i++) {
                    const savedRealm = data.realms[i];
                    if (i < this.realms.length) {
                        this.realms[i].count = savedRealm.count;
                        this.realms[i].unlocked = savedRealm.unlocked;
                        this.realms[i].baseCost = savedRealm.baseCost ? BigNumber.fromJSON(savedRealm.baseCost) : new BigNumber(this.realms[i].baseCost || 10);
                        this.realms[i].baseProduction = savedRealm.baseProduction ? BigNumber.fromJSON(savedRealm.baseProduction) : new BigNumber(this.realms[i].baseProduction || 1);
                    }
                }
            }

            // Load artifacts
            if (data.artifacts) {
                for (let i = 0; i < data.artifacts.length; i++) {
                    const savedArtifact = data.artifacts[i];
                    if (i < this.artifacts.length) {
                        this.artifacts[i].purchased = savedArtifact.purchased;
                        this.artifacts[i].unlocked = savedArtifact.unlocked;
                        this.artifacts[i].cost = savedArtifact.cost ? BigNumber.fromJSON(savedArtifact.cost) : new BigNumber(this.artifacts[i].cost || 100);

                        // Apply purchased artifact effects
                        if (savedArtifact.purchased) {
                            this.applyArtifactEffect(this.artifacts[i]);
                        }
                    }
                }
            }

            // Load powers
            if (data.powers) {
                for (let i = 0; i < data.powers.length; i++) {
                    const savedPower = data.powers[i];
                    if (i < this.powers.length) {
                        this.powers[i].purchased = savedPower.purchased;
                        this.powers[i].unlocked = savedPower.unlocked;
                        this.powers[i].cost = savedPower.cost ? BigNumber.fromJSON(savedPower.cost) : new BigNumber(this.powers[i].cost || 1);
                    }
                }
            }

            // Load feats
            if (data.feats) {
                for (let i = 0; i < data.feats.length; i++) {
                    const savedFeat = data.feats[i];
                    if (i < this.feats.length) {
                        this.feats[i].earned = savedFeat.earned;
                    }
                }
            }

            // Load other values
            if (data.essencePerClick) {
                this.essencePerClick = data.essencePerClick ? BigNumber.fromJSON(data.essencePerClick) : new BigNumber(1);

                // Validate essencePerClick after loading
                if (this.essencePerClick.mantissa === 0 || !isFinite(this.essencePerClick.mantissa) || this.essencePerClick.valueOf() <= 0) {
                    console.warn(`Invalid essencePerClick detected during load: ${this.essencePerClick.toString()}. Resetting to 10.`);
                    this.essencePerClick = new BigNumber(10);

                    // Flag to recalculate channeling after loading all artifacts
                    this._recalculateChannelingAfterLoad = true;
                }
            } else {
                this.essencePerClick = new BigNumber(1);
            }

            if (data.productionMultiplier) this.productionMultiplier = data.productionMultiplier ? BigNumber.fromJSON(data.productionMultiplier) : new BigNumber(1);
            if (data.ascensionMultiplier) this.ascensionMultiplier = data.ascensionMultiplier ? BigNumber.fromJSON(data.ascensionMultiplier) : new BigNumber(1);
            if (data.powerPointsOnReset) this.powerPointsOnReset = data.powerPointsOnReset ? BigNumber.fromJSON(data.powerPointsOnReset) : new BigNumber(0);

            // Load dungeon data
            if (data.dungeon) {
                if (data.dungeon.statistics) {
                    this.dungeon.statistics = data.dungeon.statistics;
                }

                // Load dungeon player skills
                if (data.dungeon.player) {
                    if (data.dungeon.player.skillPoints) {
                        this.dungeon.player.skillPoints = data.dungeon.player.skillPoints;
                    }

                    if (data.dungeon.player.skills) {
                        this.dungeon.player.skills = data.dungeon.player.skills;
                    }
                }
            }

            console.log('Game loaded successfully!');

            // Check if we need to recalculate channeling after load
            if (this._recalculateChannelingAfterLoad) {
                console.log('Recalculating channeling values after load...');

                // Reset to base value
                this.essencePerClick = new BigNumber(1);

                // Calculate total multiplier from all channeling artifacts
                let totalMultiplier = 1;
                const channelingArtifacts = this.artifacts.filter(a => a.purchased && a.type === 'channeling');

                for (const artifact of channelingArtifacts) {
                    const multiplier = artifact.effect.multiplier || 1;
                    totalMultiplier *= multiplier;
                    console.log(`Including multiplier from ${artifact.name}: ${multiplier}x (total now: ${totalMultiplier}x)`);
                }

                // Apply the total multiplier directly
                if (totalMultiplier > 1) {
                    this.essencePerClick = new BigNumber(totalMultiplier);
                    console.log(`Applied total channeling multiplier: ${totalMultiplier}x, new value: ${this.essencePerClick.toString()}`);
                } else if (channelingArtifacts.length > 0) {
                    // If we have channeling artifacts but the multiplier is 1 or less, set to 10 as a fallback
                    this.essencePerClick = new BigNumber(10);
                    console.log(`Invalid total multiplier (${totalMultiplier}), setting to default: ${this.essencePerClick.toString()}`);
                }

                // Apply channeling effects from powers
                let powerMultiplier = 1;
                const channelingPowers = this.powers.filter(p => p.purchased && p.effect && p.effect.clickMultiplier);

                for (const power of channelingPowers) {
                    const multiplier = power.effect.clickMultiplier || 1;
                    powerMultiplier *= multiplier;
                    console.log(`Including multiplier from ${power.name}: ${multiplier}x (power total now: ${powerMultiplier}x)`);
                }

                if (powerMultiplier > 1) {
                    const oldValue = this.essencePerClick.toString();
                    this.essencePerClick = new BigNumber(parseFloat(oldValue) * powerMultiplier);
                    console.log(`Applied power multipliers: ${oldValue} \u2192 ${this.essencePerClick.toString()}`);
                }

                // Apply ascension channeling bonuses
                let ascensionMultiplier = 1;
                const ascensionChannelingArtifacts = this.artifacts.filter(a => a.purchased && a.effect && a.effect.ascensionChannelingBonus);

                for (const artifact of ascensionChannelingArtifacts) {
                    const bonus = 1 + (artifact.effect.ascensionChannelingBonus * this.statistics.ascensionCount);
                    ascensionMultiplier *= bonus;
                    console.log(`Including bonus from ${artifact.name}: ${bonus}x (ascension total now: ${ascensionMultiplier}x)`);
                }

                if (ascensionMultiplier > 1) {
                    const oldValue = this.essencePerClick.toString();
                    this.essencePerClick = new BigNumber(parseFloat(oldValue) * ascensionMultiplier);
                    console.log(`Applied ascension bonuses: ${oldValue} \u2192 ${this.essencePerClick.toString()}`);
                }

                // Final check
                if (this.essencePerClick.mantissa === 0 || !isFinite(this.essencePerClick.mantissa) || this.essencePerClick.valueOf() <= 1) {
                    console.warn('Invalid or too low value detected after recalculation. Setting to 10.0');
                    this.essencePerClick = new BigNumber(10);
                }

                console.log(`Channeling recalculation complete. New essence per channel: ${this.essencePerClick.toString()}`);
                this._recalculateChannelingAfterLoad = false;
            }
        } catch (error) {
            console.error('Error loading saved game:', error);
            this.showNotification('Error loading saved journey!');
        }
    }

    exportSave() {
        // Save the main game state
        this.saveGame();

        // Save the dungeon state if active
        if (this.dungeon.active) {
            this.saveDungeonState();
        }

        // Create a combined save object with both game and dungeon state
        const combinedSave = {
            gameState: JSON.parse(localStorage.getItem('etherealAscensionSave') || '{}'),
            dungeonState: JSON.parse(localStorage.getItem('etherealDungeonState') || 'null')
        };

        // Convert the combined save to a string
        const combinedSaveString = JSON.stringify(combinedSave);

        // Use a safe encoding method that handles all characters
        const encodedData = this.safeEncode(combinedSaveString);

        // Create a downloadable file using Blob for better browser compatibility
        const blob = new Blob([encodedData], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", "ethereal-ascension-save.txt");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(downloadAnchorNode);
            URL.revokeObjectURL(url);
        }, 100);

        return encodedData;
    }

    // Safe encoding/decoding methods that handle all characters
    safeEncode(str) {
        // Convert to base64 using encodeURIComponent to handle non-Latin1 characters
        return btoa(encodeURIComponent(str));
    }

    safeDecode(str) {
        // Decode from base64 and then URI decode
        return decodeURIComponent(atob(str));
    }

    importSave(saveString) {
        try {
            // Use the safe decode method to handle all characters
            const decodedData = this.safeDecode(saveString.trim());

            // Try to parse as a combined save first
            try {
                const combinedSave = JSON.parse(decodedData);

                // Check if this is a combined save with both game and dungeon state
                if (combinedSave.gameState) {
                    // Save the game state
                    localStorage.setItem('etherealAscensionSave', JSON.stringify(combinedSave.gameState));

                    // Save the dungeon state if it exists
                    if (combinedSave.dungeonState) {
                        localStorage.setItem('etherealDungeonState', JSON.stringify(combinedSave.dungeonState));
                    } else {
                        // Clear any existing dungeon state
                        localStorage.removeItem('etherealDungeonState');
                    }

                    // Load the game and dungeon state
                    this.loadGame();
                    this.loadDungeonState();
                    this.updateUI();

                    if (combinedSave.dungeonState) {
                        this.showNotification('Journey imported successfully with active dungeon!');
                    } else {
                        this.showNotification('Journey imported successfully!');
                    }
                    return true;
                }
            } catch (parseError) {
                // If parsing as combined save fails, try as legacy save format
                // console.log('Not a combined save format, trying legacy format...');
            }

            // Legacy format handling (just game state)
            localStorage.setItem('etherealAscensionSave', decodedData);
            this.loadGame();
            this.updateUI();
            this.showNotification('Journey imported successfully (legacy format)!');
            return true;
        } catch (error) {
            console.error('Error importing save:', error);
            this.showNotification('Error importing journey! Please ensure you\'ve pasted the correct save data.');
            return false;
        }
    }

    resetGame() {
        if (confirm('Are you sure you want to unravel your existence? All progress will be lost!')) {
            // Clear all game data from localStorage

            // First, clear the specific game keys we know about
            localStorage.removeItem('etherealAscensionSave');
            localStorage.removeItem('etherealDungeonState');

            // Then, to be thorough, clear any other keys that might be related to the game
            // by looking for keys that start with 'ethereal'
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.toLowerCase().startsWith('ethereal')) {
                    localStorage.removeItem(key);
                    // Adjust the index since we're removing items
                    i--;
                }
            }

            // For absolute certainty, we can also clear session storage
            // in case any game data was stored there
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.toLowerCase().startsWith('ethereal')) {
                    sessionStorage.removeItem(key);
                    // Adjust the index since we're removing items
                    i--;
                }
            }

            // Log the reset for debugging purposes
            // console.log('Game reset: All ethereal data cleared from storage');

            // Reload the page to start fresh
            location.reload();
        }
    }

    // Special function to fix the essence per channel bug
    fixEssencePerChannel() {
        console.log('Running essence per channel fix...');
        console.log(`Current essence per channel: ${this.essencePerClick.toString()}`);

        // Dump all artifacts to console for debugging
        console.log('All artifacts:');
        this.artifacts.forEach(a => {
            console.log(`${a.name}: purchased=${a.purchased}, type=${a.type}, effect=`, a.effect);
        });

        // Reset to base value
        this.essencePerClick = new BigNumber(1);
        console.log(`Reset to base value: ${this.essencePerClick.toString()}`);

        // Count channeling artifacts
        const channelingArtifacts = this.artifacts.filter(a => a.purchased && a.type === 'channeling');
        console.log(`Found ${channelingArtifacts.length} channeling artifacts:`);
        channelingArtifacts.forEach(a => console.log(`- ${a.name}: ${JSON.stringify(a.effect)}`));

        // Check if we have any channeling artifacts
        if (channelingArtifacts.length === 0) {
            console.log('No channeling artifacts found. Adding a default multiplier.');
            // Add a default multiplier to fix the issue
            this.essencePerClick = new BigNumber(10);
        } else {
            // Apply each channeling artifact effect individually
            let totalMultiplier = 1;

            for (const artifact of channelingArtifacts) {
                const multiplier = artifact.effect.multiplier || 1;
                totalMultiplier *= multiplier;
                console.log(`Adding multiplier from ${artifact.name}: ${multiplier}x (total now: ${totalMultiplier}x)`);
            }

            console.log(`Total multiplier from all channeling artifacts: ${totalMultiplier}x`);
            this.essencePerClick = new BigNumber(totalMultiplier);
            console.log(`New essence per click: ${this.essencePerClick.toString()}`);
        }

        // Apply channeling effects from powers
        const channelingPowers = this.powers.filter(p => p.purchased && p.effect && p.effect.clickMultiplier);
        console.log(`Found ${channelingPowers.length} channeling powers:`);
        channelingPowers.forEach(p => console.log(`- ${p.name}: ${p.effect.clickMultiplier}x`));

        let powerMultiplier = 1;
        for (const power of channelingPowers) {
            const multiplier = power.effect.clickMultiplier || 1;
            powerMultiplier *= multiplier;
            console.log(`Adding multiplier from ${power.name}: ${multiplier}x (power total now: ${powerMultiplier}x)`);
        }

        if (powerMultiplier > 1) {
            const oldValue = this.essencePerClick.toString();
            this.essencePerClick = new BigNumber(parseFloat(oldValue) * powerMultiplier);
            console.log(`Applied power multipliers: ${oldValue} → ${this.essencePerClick.toString()}`);
        }

        // Apply ascension channeling bonuses
        const ascensionChannelingArtifacts = this.artifacts.filter(a => a.purchased && a.effect && a.effect.ascensionChannelingBonus);
        console.log(`Found ${ascensionChannelingArtifacts.length} ascension channeling artifacts:`);
        ascensionChannelingArtifacts.forEach(a => console.log(`- ${a.name}: ${a.effect.ascensionChannelingBonus} per ascension`));

        let ascensionMultiplier = 1;
        for (const artifact of ascensionChannelingArtifacts) {
            const bonus = 1 + (artifact.effect.ascensionChannelingBonus * this.statistics.ascensionCount);
            ascensionMultiplier *= bonus;
            console.log(`Adding bonus from ${artifact.name}: ${bonus}x (ascension total now: ${ascensionMultiplier}x)`);
        }

        if (ascensionMultiplier > 1) {
            const oldValue = this.essencePerClick.toString();
            this.essencePerClick = new BigNumber(parseFloat(oldValue) * ascensionMultiplier);
            console.log(`Applied ascension bonuses: ${oldValue} → ${this.essencePerClick.toString()}`);
        }

        // Final check
        if (this.essencePerClick.mantissa === 0 || !isFinite(this.essencePerClick.mantissa) || this.essencePerClick.valueOf() <= 1) {
            console.warn('Invalid or too low value detected after fix. Setting to 10.0');
            this.essencePerClick = new BigNumber(10);
        }

        // Update UI
        this.updateUI();

        console.log(`Fix complete. New essence per channel: ${this.essencePerClick.toString()}`);
        this.showNotification(`Essence per channel fixed! New value: ${this.formatNumber(this.essencePerClick)}`, 'success');

        // No UI elements needed as this is now an internal function

        return this.essencePerClick.toString();
    }

    updateUI() {
        // Update resources
        this.updateResourcesUI();

        // Update realms
        this.updateRealmsUI();

        // Update artifacts - only if not called from game loop or if forced
        this.updateArtifactsUI();

        // Update powers
        this.updatePowersUI();

        // Update ascension
        this.updateAscensionUI();

        // Update feats
        this.updateFeatsUI();

        // Update statistics
        this.updateStatisticsUI();

        // Update bonuses
        this.updateBonusesUI();

        // Update dungeon
        this.updateDungeonUI();
    }

    updateResourcesUI() {
        const container = this.domCache.resourcesContainer;

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        container.innerHTML = '';

        // Calculate essence per second using the helper method
        // This ensures the ascension multiplier is properly applied
        let totalProduction = this.calculateTotalProduction();

        // Essence
        const essenceDiv = document.createElement('div');
        essenceDiv.className = 'resource';
        essenceDiv.innerHTML = `
            <div class="resource-icon">✨</div>
            <div class="resource-info">
                <div class="resource-name">Etheric Essence</div>
                <div class="resource-value">${this.formatNumber(this.resources.essence)}</div>
                <div class="resource-rate">${this.formatNumber(totalProduction.multiply(this.settings.gameSpeed))}/sec</div>
            </div>
        `;
        fragment.appendChild(essenceDiv);

        // Power Points
        const powerPointsDiv = document.createElement('div');
        powerPointsDiv.className = 'resource';
        powerPointsDiv.innerHTML = `
            <div class="resource-icon">⚡</div>
            <div class="resource-info">
                <div class="resource-name">Power Points</div>
                <div class="resource-value">${this.formatPowerPoints(this.resources.powerPoints)}</div>
            </div>
        `;
        fragment.appendChild(powerPointsDiv);

        // Append all at once
        container.appendChild(fragment);

        // Essence per click - use cached element
        this.domCache.energyPerClick.textContent = this.formatNumber(this.essencePerClick);

        // Cache DOM elements for counter updates
        // We do this after the first UI update to ensure the elements exist
        this.domCache.essenceValue = container.querySelector('.resource:first-child .resource-value');
        this.domCache.essenceRate = container.querySelector('.resource:first-child .resource-rate');
        this.domCache.powerPointsValue = container.querySelector('.resource:nth-child(2) .resource-value');
    }

    updateRealmsUI() {
        // Don't update if we're already in the middle of an update
        if (this._realmUpdateState.isUpdating) {
            return;
        }

        // Mark that we're updating to prevent concurrent updates
        this._realmUpdateState.isUpdating = true;

        try {
            const container = this.domCache.realmsContainer;
            if (!container) {
                console.error('Realms container not found');
                return;
            }

            container.innerHTML = '';

            // Use document fragment for better performance
            const fragment = document.createDocumentFragment();

            // Cache realm production calculations
            if (!this._realmProductionCache) {
                this._realmProductionCache = {};
            }

        // First show all unlocked realms
        for (const realm of this.realms) {
            if (realm.unlocked) {
                const cost = this.calculateRealmCost(realm);
                const canAfford = this.resources.essence.greaterThanOrEqual(cost);

                // For consistency, use the same calculation method as calculateTotalProduction
                // but only for this specific realm
                let totalProduction;
                let eachProduction;

                // If the realm count is 0, we'll calculate what a single realm would produce
                if (realm.count === 0) {
                    // Create a temporary copy of the realm with count = 1 for calculation
                    const tempRealm = {...realm, count: 1};
                    const tempRealms = this.realms.map(r => r.id === realm.id ? tempRealm : r);

                    // Save the original realms
                    const originalRealms = this.realms;

                    // Temporarily replace realms with our modified version
                    this.realms = tempRealms;

                    // Calculate what this realm would produce if we had one
                    totalProduction = this.calculateRealmProduction(tempRealm);
                    eachProduction = totalProduction;

                    // Restore the original realms
                    this.realms = originalRealms;
                } else {
                    // Calculate the actual production for this realm
                    totalProduction = this.calculateRealmProduction(realm);

                    // Calculate production per realm
                    if (realm.id === 'realm1') {
                        // Special case for Luminous Garden - calculate directly
                        const basePerRealm = realm.baseProduction;

                        // Get active realms for quantum synergy calculation
                        const activeRealms = this.realms.filter(r => r.count > 0);
                        const realmTypes = activeRealms.length;
                        const totalRealmCount = this.realms.reduce((sum, r) => sum + r.count, 0);

                        // Check for meta multiplier from Omniscience power
                        const metaPower = this.powers.find(p => p.purchased && p.effect.metaMultiplier);
                        const metaMultiplier = metaPower ? metaPower.effect.metaMultiplier : 1;

                        // Start with base production
                        let singleProduction = basePerRealm;

                        // Apply realm-specific artifacts
                        for (const artifact of this.artifacts) {
                            if (artifact.purchased && artifact.type === 'realm' && artifact.target === realm.id) {
                                let multiplier = artifact.effect.multiplier;
                                if (metaPower) {
                                    // Apply meta multiplier to artifact effect
                                    multiplier = 1 + ((multiplier - 1) * metaMultiplier);
                                }
                                singleProduction = singleProduction.multiply(multiplier);
                            }
                        }

                        // Apply power effects
                        for (const power of this.powers) {
                            if (power.purchased) {
                                if (power.effect.realmMultiplier && power.effect.realmMultiplier.targets.includes(realm.id)) {
                                    let multiplier = power.effect.realmMultiplier.multiplier;
                                    if (metaPower) {
                                        // Apply meta multiplier to power effect
                                        multiplier = 1 + ((multiplier - 1) * metaMultiplier);
                                    }
                                    singleProduction = singleProduction.multiply(multiplier);
                                }
                            }
                        }

                        // Apply quantum synergy if active
                        const quantumSynergyPower = this.powers.find(p => p.purchased && p.effect.quantumSynergy);
                        if (quantumSynergyPower) {
                            // Each realm boosts all others
                            const otherRealmsCount = activeRealms.length - 1;
                            if (otherRealmsCount > 0) {
                                const quantumBoost = 1 + (otherRealmsCount * 0.02 * (metaPower ? metaMultiplier : 1));
                                singleProduction = singleProduction.multiply(quantumBoost);
                            }
                        }

                        // Apply global multipliers
                        let globalMultiplier = this.productionMultiplier;
                        if (metaPower) {
                            // Apply meta multiplier to global multiplier
                            globalMultiplier = new BigNumber(1).add(this.productionMultiplier.subtract(1).multiply(metaMultiplier));
                        }
                        singleProduction = singleProduction.multiply(globalMultiplier);

                        // Apply ascension multiplier
                        singleProduction = singleProduction.multiply(this.ascensionMultiplier);

                        // Apply synergy effect from powers
                        const synergyPower = this.powers.find(p => p.purchased && p.effect.synergy);
                        if (synergyPower) {
                            // Use custom synergy multiplier if specified, otherwise default to 5%
                            const synergyPercentage = synergyPower.effect.synergyMultiplier || 0.05;
                            const synergyMultiplier = 1 + (realmTypes * synergyPercentage * (metaPower ? metaMultiplier : 1));
                            singleProduction = singleProduction.multiply(synergyMultiplier);
                        }

                        // Apply Essence Acceleration power (1% more essence for each realm owned)
                        const realmCountBonus = this.powers.find(p => p.purchased && p.effect.realmCountBonus);
                        if (realmCountBonus && totalRealmCount > 0) {
                            const realmBonus = 1 + (totalRealmCount * 0.01);
                            singleProduction = singleProduction.multiply(realmBonus);
                        }

                        // Apply Essence Overflow power (10% more essence for each realm owned)
                        const realmCountBonus10 = this.powers.find(p => p.purchased && p.effect.realmCountBonus10);
                        if (realmCountBonus10 && totalRealmCount > 0) {
                            const realmBonus10 = 1 + (totalRealmCount * 0.1);
                            singleProduction = singleProduction.multiply(realmBonus10);
                        }

                        eachProduction = singleProduction;
                    } else {
                        // Normal calculation for other realms
                        eachProduction = new BigNumber(totalProduction).divide(realm.count);
                    }
                }

                const realmDiv = document.createElement('div');
                realmDiv.className = 'realm';
                realmDiv.innerHTML = `
                    <div class="realm-header">
                        <div class="realm-icon">${realm.icon}</div>
                        <div class="realm-name">${realm.name}</div>
                        <div class="realm-count">${realm.count}</div>
                    </div>
                    <div class="realm-info">${realm.description}</div>
                    <div class="realm-production">
                        <span>Each: ${this.formatNumber(eachProduction.multiply(this.settings.gameSpeed))}/sec</span>
                        <span>Total: ${this.formatNumber(totalProduction.multiply(this.settings.gameSpeed))}/sec</span>
                    </div>
                    <div class="realm-cost">Cost: ${this.formatNumber(cost)} essence</div>
                    <button class="realm-action" data-id="${realm.id}" ${canAfford ? '' : 'disabled'}>Create Realm</button>
                `;
                fragment.appendChild(realmDiv);
            }
        }

        // Then show the next unlockable realm
        const nextRealm = this.realms.find(r => !r.unlocked && r.unlockAt && r.unlockAt.resource);
        if (nextRealm) {
            const unlockResource = nextRealm.unlockAt.resource;
            const unlockAmount = nextRealm.unlockAt.amount;
            const percentComplete = Math.min(100, this.resources[unlockResource].valueOf() / unlockAmount.valueOf() * 100);

            const realmDiv = document.createElement('div');
            realmDiv.className = 'realm locked';
            realmDiv.innerHTML = `
                <div class="realm-header">
                    <div class="realm-icon">?</div>
                    <div class="realm-name">Unknown Realm</div>
                </div>
                <div class="realm-info">A mysterious realm awaits discovery...</div>
                <div class="realm-unlock-requirement">
                    Required: ${this.formatNumber(unlockAmount)} ${unlockResource}
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${percentComplete}%"></div>
                    </div>
                </div>
            `;
            fragment.appendChild(realmDiv);
        }

        // Append all at once
        container.appendChild(fragment);

        // Add event listeners
        const buyButtons = container.querySelectorAll('.realm-action');
        buyButtons.forEach(button => {
            // Remove any existing event listeners to prevent duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            // Add the event listener to the new button
            newButton.addEventListener('click', () => {
                // console.log(`Buying realm: ${newButton.dataset.id}`);
                this.buyRealm(newButton.dataset.id);
            });
        });

        // Mark that the full update is done
        this._realmUpdateState.needsFullUpdate = false;
        this._realmUpdateState.lastFullUpdate = Date.now();
        } catch (error) {
            console.error('Error updating realms UI:', error);
        } finally {
            // Always mark that we're done updating
            this._realmUpdateState.isUpdating = false;
        }
    }

    updateArtifactsUI() {
        // Don't update artifacts UI on game clock - only update when explicitly called
        // This prevents the artifacts from being redrawn constantly
        if (this._updatingFromGameLoop && !this._forceArtifactsUpdate) {
            return;
        }

        // Reset force update flag
        this._forceArtifactsUpdate = false;

        const availableContainer = document.getElementById('available-artifacts-container');
        const acquiredContainer = document.getElementById('acquired-artifacts-container');
        const lockedContainer = document.getElementById('locked-artifacts-container');
        const progressBar = document.getElementById('artifacts-progress-bar');
        const artifactsCollected = document.getElementById('artifacts-collected');
        const artifactsTotal = document.getElementById('artifacts-total');

        // Get current filter
        const activeFilter = document.querySelector('.artifacts-filter-tabs .artifact-filter-tab.active');
        const currentFilter = activeFilter ? activeFilter.dataset.filter : 'all';

        // Setup filter tab event listeners if not already set
        if (!this._artifactFilterListenersSet) {
            // Get the container element by ID
            const filterTabsContainer = document.getElementById('artifacts-filter-tabs');
            if (filterTabsContainer) {
                // Remove any existing listeners by cloning and replacing
                const newContainer = filterTabsContainer.cloneNode(true);
                filterTabsContainer.parentNode.replaceChild(newContainer, filterTabsContainer);

                // Add a single event listener to the container (event delegation)
                newContainer.addEventListener('click', (e) => {
                    // Only process clicks on artifact-filter-tab elements
                    if (e.target.classList.contains('artifact-filter-tab')) {
                        // Stop event propagation completely
                        e.stopPropagation();
                        e.preventDefault();

                        // Get all tabs within this container only
                        const tabs = newContainer.querySelectorAll('.artifact-filter-tab');

                        // Remove active class from all tabs in this container
                        tabs.forEach(t => t.classList.remove('active'));

                        // Add active class to clicked tab
                        e.target.classList.add('active');

                        // Update the artifacts UI
                        this.updateArtifactsUI();
                    }
                });

                this._artifactFilterListenersSet = true;
            }
        }

        // Create a container for dungeon artifacts if it doesn't exist
        let dungeonArtifactsContainer = document.getElementById('dungeon-artifacts-container');
        if (!dungeonArtifactsContainer) {
            // Create a new section for dungeon artifacts
            const dungeonSection = document.createElement('div');
            dungeonSection.className = 'artifacts-section';
            dungeonSection.id = 'dungeon-artifacts-section';

            // Create the section header with icon
            const dungeonHeaderDiv = document.createElement('div');
            dungeonHeaderDiv.className = 'section-header-with-icon';

            const sectionIcon = document.createElement('div');
            sectionIcon.className = 'section-icon';
            sectionIcon.textContent = '🏆';
            dungeonHeaderDiv.appendChild(sectionIcon);

            const dungeonHeader = document.createElement('h3');
            dungeonHeader.textContent = 'Legendary Dungeon Artifacts';
            dungeonHeader.className = 'artifacts-section-title';
            dungeonHeaderDiv.appendChild(dungeonHeader);

            dungeonSection.appendChild(dungeonHeaderDiv);

            // Add description
            const dungeonDescription = document.createElement('p');
            dungeonDescription.className = 'section-description';
            dungeonDescription.textContent = 'These rare artifacts can only be found in dungeons and persist through ascension.';
            dungeonSection.appendChild(dungeonDescription);

            // Create the container
            dungeonArtifactsContainer = document.createElement('div');
            dungeonArtifactsContainer.id = 'dungeon-artifacts-container';
            dungeonArtifactsContainer.className = 'artifacts-container';
            dungeonSection.appendChild(dungeonArtifactsContainer);

            // Insert the entire section into the DOM in the artifacts-sections-container
            const sectionsContainer = document.querySelector('.artifacts-sections-container');
            if (sectionsContainer) {
                // Insert before the locked artifacts section if it exists
                const lockedSection = sectionsContainer.querySelector('.artifacts-section:last-child');
                if (lockedSection) {
                    sectionsContainer.insertBefore(dungeonSection, lockedSection);
                } else {
                    // Otherwise just append to the end
                    sectionsContainer.appendChild(dungeonSection);
                }
            } else {
                // Fallback: just append to the artifacts tab
                const artifactsTab = document.getElementById('artifacts-tab');
                if (artifactsTab) {
                    artifactsTab.appendChild(dungeonSection);
                }
            }
        }

        // Update progress bar
        const totalArtifacts = this.artifacts.filter(a => a.type !== 'dungeon').length;
        const collectedArtifacts = this.artifacts.filter(a => a.purchased && a.type !== 'dungeon').length;
        const progressPercentage = totalArtifacts > 0 ? (collectedArtifacts / totalArtifacts) * 100 : 0;

        if (progressBar) progressBar.style.width = `${progressPercentage}%`;
        if (artifactsCollected) artifactsCollected.textContent = collectedArtifacts;
        if (artifactsTotal) artifactsTotal.textContent = totalArtifacts;

        // Clear containers
        availableContainer.innerHTML = '';
        acquiredContainer.innerHTML = '';
        dungeonArtifactsContainer.innerHTML = '';
        lockedContainer.innerHTML = '';

        // Available artifacts
        let availableArtifacts = this.artifacts.filter(a => a.unlocked && !a.purchased);

        // Apply filter
        if (currentFilter !== 'all') {
            availableArtifacts = availableArtifacts.filter(a => a.type === currentFilter);
        }

        // Update pagination for available artifacts
        this.updatePagination('available', availableArtifacts.length);

        // Get artifacts for current page
        const availableStart = (this.pagination.available.page - 1) * this.pagination.available.itemsPerPage;
        const availableEnd = availableStart + this.pagination.available.itemsPerPage;
        const availableArtifactsPage = availableArtifacts.slice(availableStart, availableEnd);

        if (availableArtifacts.length === 0) {
            availableContainer.innerHTML = '<p>No artifacts available for discovery at this time.</p>';
        } else {
            for (const artifact of availableArtifactsPage) {
                const costResource = artifact.costResource || 'essence';
                const resourceName = costResource === 'essence' ? 'essence' : 'power points';

                // Perform a strict affordability check using both methods
                // First convert both to raw numbers for a direct comparison
                const resourceValue = this.resources[costResource].valueOf();
                const costValue = artifact.cost.valueOf();

                // Check using both methods for redundancy
                const canAffordDirect = resourceValue >= costValue;
                const canAffordBigNumber = this.resources[costResource].greaterThanOrEqual(artifact.cost);

                // Only consider affordable if both checks pass
                const canAfford = canAffordDirect && canAffordBigNumber;

                // Log for debugging power point artifacts
                if (costResource === 'powerPoints') {
                    //console.log(`Creating card for ${artifact.name}:`);
                    //console.log(`Resource: ${this.resources[costResource].toString()}, Cost: ${artifact.cost.toString()}`);
                    //console.log(`Resource value: ${resourceValue}, Cost value: ${costValue}`);
                    //console.log(`Can afford (direct): ${canAffordDirect}, Can afford (BigNumber): ${canAffordBigNumber}`);
                    //console.log(`Final can afford: ${canAfford}`);
                }

                const artifactDiv = document.createElement('div');
                artifactDiv.className = `upgrade-card ${canAfford ? '' : 'locked'}`;
                artifactDiv.dataset.id = artifact.id;
                artifactDiv.dataset.type = artifact.type;

                // Add a data attribute to track affordability state
                artifactDiv.dataset.affordable = canAfford ? 'true' : 'false';

                // Get type label
                const typeLabel = this.getArtifactTypeLabel(artifact.type);

                artifactDiv.innerHTML = `
                    <div class="upgrade-header">
                        <div class="upgrade-icon">${artifact.icon}</div>
                        <div class="upgrade-name">${artifact.name}</div>
                        <div class="artifact-type ${artifact.type}">${typeLabel}</div>
                    </div>
                    <div class="upgrade-description">${artifact.description}</div>
                    <div class="upgrade-cost">${resourceName === 'power points' ? this.formatPowerPoints(artifact.cost) : this.formatNumber(artifact.cost)} ${resourceName}</div>
                    <button class="upgrade-purchase-button" data-id="${artifact.id}" ${canAfford ? '' : 'disabled'}>Acquire</button>
                `;

                availableContainer.appendChild(artifactDiv);
            }

            // Add event listeners
            const purchaseButtons = availableContainer.querySelectorAll('.upgrade-purchase-button');
            purchaseButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const artifactId = button.dataset.id;
                    const artifact = this.artifacts.find(a => a.id === artifactId);
                    if (artifact) {
                        const costResource = artifact.costResource || 'essence';

                        // Perform a strict affordability check
                        // First convert both to raw numbers for a direct comparison
                        const resourceValue = this.resources[costResource].valueOf();
                        const costValue = artifact.cost.valueOf();

                        // Check using both methods for redundancy
                        const canAffordDirect = resourceValue >= costValue;
                        const canAffordBigNumber = this.resources[costResource].greaterThanOrEqual(artifact.cost);

                        // Only proceed if both checks pass
                        if (canAffordDirect && canAffordBigNumber) {
                            this.buyArtifact(artifactId);
                        } else {
                            console.warn(`Cannot afford artifact ${artifact.name}: ${this.resources[costResource].toString()} < ${artifact.cost.toString()}`);
                            //console.log(`Resource value: ${resourceValue}, Cost value: ${costValue}`);
                            //console.log(`Can afford (direct): ${canAffordDirect}, Can afford (BigNumber): ${canAffordBigNumber}`);

                            // Disable the button to prevent further clicks
                            button.disabled = true;
                            // Force the card to be locked
                            const parentCard = button.closest('.upgrade-card');
                            if (parentCard && !parentCard.classList.contains('locked')) {
                                parentCard.classList.add('locked');
                            }
                            // Update the UI to reflect the correct affordability
                            this.updateArtifactsUI();
                        }
                    }
                });
            });

            const artifactCards = availableContainer.querySelectorAll('.upgrade-card:not(.locked)');
            artifactCards.forEach(card => {
                card.addEventListener('click', () => {
                    const artifactId = card.dataset.id;
                    const artifact = this.artifacts.find(a => a.id === artifactId);
                    if (artifact) {
                        const costResource = artifact.costResource || 'essence';

                        // Perform a strict affordability check
                        // First convert both to raw numbers for a direct comparison
                        const resourceValue = this.resources[costResource].valueOf();
                        const costValue = artifact.cost.valueOf();

                        // Check using both methods for redundancy
                        const canAffordDirect = resourceValue >= costValue;
                        const canAffordBigNumber = this.resources[costResource].greaterThanOrEqual(artifact.cost);

                        // Only proceed if both checks pass
                        if (canAffordDirect && canAffordBigNumber) {
                            this.buyArtifact(artifactId);
                        } else {
                            console.warn(`Cannot afford artifact ${artifact.name}: ${this.resources[costResource].toString()} < ${artifact.cost.toString()}`);
                            //console.log(`Resource value: ${resourceValue}, Cost value: ${costValue}`);
                            //console.log(`Can afford (direct): ${canAffordDirect}, Can afford (BigNumber): ${canAffordBigNumber}`);

                            // Force the card to be locked
                            if (!card.classList.contains('locked')) {
                                card.classList.add('locked');
                            }
                            // Update the UI to reflect the correct affordability
                            this.updateArtifactsUI();
                        }
                    }
                });
            });
        }

        // Acquired artifacts (excluding dungeon artifacts)
        let acquiredArtifacts = this.artifacts.filter(a => a.purchased && a.type !== 'dungeon');

        // Apply filter
        if (currentFilter !== 'all') {
            acquiredArtifacts = acquiredArtifacts.filter(a => a.type === currentFilter);
        }

        // Update pagination for acquired artifacts
        this.updatePagination('acquired', acquiredArtifacts.length);

        // Get artifacts for current page
        const acquiredStart = (this.pagination.acquired.page - 1) * this.pagination.acquired.itemsPerPage;
        const acquiredEnd = acquiredStart + this.pagination.acquired.itemsPerPage;
        const acquiredArtifactsPage = acquiredArtifacts.slice(acquiredStart, acquiredEnd);

        if (acquiredArtifacts.length === 0) {
            acquiredContainer.innerHTML = '<p>You have not acquired any artifacts yet.</p>';
        } else {
            for (const artifact of acquiredArtifactsPage) {
                const artifactDiv = document.createElement('div');
                artifactDiv.className = 'upgrade-card purchased';
                artifactDiv.dataset.type = artifact.type;

                let effectText = '';
                if (artifact.effect.multiplier) {
                    if (artifact.type === 'channeling') {
                        effectText = `Multiplies essence per click by ${artifact.effect.multiplier}`;
                    } else if (artifact.type === 'global') {
                        effectText = `Multiplies all production by ${artifact.effect.multiplier}`;
                    } else if (artifact.type === 'realm') {
                        const realm = this.realms.find(r => r.id === artifact.target);
                        effectText = `Multiplies ${realm ? realm.name : 'realm'} production by ${artifact.effect.multiplier}`;
                    } else if (artifact.type === 'ascension') {
                        effectText = `Multiplies power point gain by ${artifact.effect.multiplier}`;
                    }
                }

                // Get type label
                const typeLabel = this.getArtifactTypeLabel(artifact.type);

                artifactDiv.innerHTML = `
                    <div class="upgrade-header">
                        <div class="upgrade-icon">${artifact.icon}</div>
                        <div class="upgrade-name">${artifact.name}</div>
                        <div class="artifact-type ${artifact.type}">${typeLabel}</div>
                    </div>
                    <div class="upgrade-description">${artifact.description}</div>
                    <div class="upgrade-effect">${effectText}</div>
                `;

                acquiredContainer.appendChild(artifactDiv);
            }
        }

        // Dungeon artifacts
        let dungeonArtifacts = this.artifacts.filter(a => a.type === 'dungeon' && a.purchased);

        // Only apply filter if it's specifically for dungeon artifacts or showing all
        if (currentFilter !== 'all' && currentFilter !== 'dungeon') {
            // If filtering for a non-dungeon type, hide the dungeon section
            if (dungeonArtifactsContainer.parentElement) {
                dungeonArtifactsContainer.parentElement.style.display = 'none';
            }
        } else {
            // Show the section when relevant
            if (dungeonArtifactsContainer.parentElement) {
                dungeonArtifactsContainer.parentElement.style.display = 'block';
            }

            if (dungeonArtifacts.length === 0) {
                dungeonArtifactsContainer.innerHTML = '<p>You have not discovered any legendary dungeon artifacts yet. Explore dungeons to find these rare treasures.</p>';
            } else {
                for (const artifact of dungeonArtifacts) {
                const artifactDiv = document.createElement('div');
                artifactDiv.className = 'upgrade-card purchased legendary';

                // Create effect text based on the artifact's effects
                let effectText = '';
                if (artifact.effect.essenceMultiplier) {
                    effectText += `Multiplies essence production by ${artifact.effect.essenceMultiplier}<br>`;
                }
                if (artifact.effect.realmProductionMultiplier) {
                    effectText += `Multiplies realm production by ${artifact.effect.realmProductionMultiplier}<br>`;
                }
                if (artifact.effect.clickMultiplier) {
                    effectText += `Multiplies essence per click by ${artifact.effect.clickMultiplier}<br>`;
                }
                if (artifact.effect.gameSpeed) {
                    effectText += `Increases game speed by ${Math.round((artifact.effect.gameSpeed - 1) * 100)}%<br>`;
                }
                if (artifact.effect.costReduction) {
                    effectText += `Reduces realm costs by ${Math.round((1 - artifact.effect.costReduction) * 100)}%<br>`;
                }
                if (artifact.effect.powerPointMultiplier) {
                    effectText += `Multiplies power point gain by ${artifact.effect.powerPointMultiplier}<br>`;
                }
                if (artifact.effect.dungeonHealthMultiplier) {
                    effectText += `Increases dungeon health by ${Math.round((artifact.effect.dungeonHealthMultiplier - 1) * 100)}%<br>`;
                }
                if (artifact.effect.dungeonAttackMultiplier) {
                    effectText += `Increases dungeon attack by ${Math.round((artifact.effect.dungeonAttackMultiplier - 1) * 100)}%<br>`;
                }
                if (artifact.effect.dungeonDefenseMultiplier) {
                    effectText += `Increases dungeon defense by ${Math.round((artifact.effect.dungeonDefenseMultiplier - 1) * 100)}%<br>`;
                }
                if (artifact.effect.dungeonLootChance) {
                    effectText += `Increases dungeon loot by ${Math.round((artifact.effect.dungeonLootChance - 1) * 100)}%<br>`;
                }
                if (artifact.effect.criticalChanceBonus) {
                    effectText += `Increases critical hit chance by ${Math.round(artifact.effect.criticalChanceBonus * 100)}%<br>`;
                }
                if (artifact.effect.dungeonSkillPointBonus) {
                    effectText += `Increases skill point gain by ${Math.round((artifact.effect.dungeonSkillPointBonus - 1) * 100)}%<br>`;
                }
                if (artifact.effect.dungeonEssenceReward) {
                    effectText += `Increases dungeon essence rewards by ${Math.round((artifact.effect.dungeonEssenceReward - 1) * 100)}%<br>`;
                }

                artifactDiv.innerHTML = `
                    <div class="upgrade-header">
                        <div class="upgrade-icon">${artifact.icon}</div>
                        <div class="upgrade-name">${artifact.name}</div>
                        <div class="artifact-rarity ${artifact.rarity}">${artifact.rarity}</div>
                    </div>
                    <div class="upgrade-description">${artifact.description}</div>
                    <div class="upgrade-effect">${effectText}</div>
                    <div class="artifact-lore">${artifact.lore}</div>
                `;

                    dungeonArtifactsContainer.appendChild(artifactDiv);
                }
            }
        }

        // Locked artifacts
        let lockedArtifacts = this.artifacts.filter(a => !a.unlocked && a.type !== 'dungeon');

        // Apply filter
        if (currentFilter !== 'all') {
            lockedArtifacts = lockedArtifacts.filter(a => a.type === currentFilter);
        }

        // Update pagination for locked artifacts
        this.updatePagination('locked', lockedArtifacts.length);

        // Get artifacts for current page
        const lockedStart = (this.pagination.locked.page - 1) * this.pagination.locked.itemsPerPage;
        const lockedEnd = lockedStart + this.pagination.locked.itemsPerPage;
        const visibleLockedArtifacts = lockedArtifacts.slice(lockedStart, lockedEnd);

        if (visibleLockedArtifacts.length === 0) {
            lockedContainer.innerHTML = '<p>No more artifacts to discover at this time.</p>';
        } else {
            for (const artifact of visibleLockedArtifacts) {
                const artifactDiv = document.createElement('div');
                artifactDiv.className = 'upgrade-card locked';
                artifactDiv.dataset.type = artifact.type;

                let unlockText = 'Unlock requirements unknown';
                if (artifact.unlockAt) {
                    if (artifact.unlockAt.resource) {
                        unlockText = `Requires ${this.formatNumber(artifact.unlockAt.amount)} ${artifact.unlockAt.resource}`;
                    } else if (artifact.unlockAt.realmCount) {
                        const realm = this.realms.find(r => r.id === artifact.unlockAt.realmCount.id);
                        unlockText = `Requires ${artifact.unlockAt.realmCount.count} ${realm ? realm.name : 'realm'}`;
                    }
                }

                artifactDiv.innerHTML = `
                    <div class="upgrade-header">
                        <div class="upgrade-icon">?</div>
                        <div class="upgrade-name">Unknown Artifact</div>
                    </div>
                    <div class="upgrade-description">A mystical artifact awaits discovery...</div>
                    <div class="upgrade-unlock-requirement">${unlockText}</div>
                `;

                lockedContainer.appendChild(artifactDiv);
            }

            // Set up pagination event listeners
            this.setupArtifactPaginationListeners();
        }
    }

    // Helper method to get artifact type label
    getArtifactTypeLabel(type) {
        switch(type) {
            case 'channeling': return 'Channeling';
            case 'realm': return 'Realm';
            case 'global': return 'Global';
            case 'ascension': return 'Ascension';
            case 'dungeon': return 'Dungeon';
            default: return 'Unknown';
        }
    }

    updatePowersUI() {
        // Clear any existing selected node
        this.selectedPowerId = null;

        // Update power points display - use formatPowerPoints for consistency
        document.getElementById('skill-points').textContent = this.formatPowerPoints(this.resources.powerPoints);

        // Reset the power tree container
        const container = document.getElementById('power-tree-container');
        container.innerHTML = '';

        // Create all power nodes
        for (const power of this.powers) {
            const isPurchased = power.purchased;
            const isAvailable = power.unlocked && !isPurchased;

            const powerDiv = document.createElement('div');
            powerDiv.className = `skill-node ${isAvailable ? 'available' : ''} ${isPurchased ? 'purchased' : ''} ${!isAvailable && !isPurchased ? 'locked' : ''}`;
            powerDiv.dataset.id = power.id;
            powerDiv.style.gridColumn = power.position.x + 1;
            powerDiv.style.gridRow = power.position.y + 1;

            // Node content - just the icon
            powerDiv.innerHTML = `<div class="skill-icon">${power.icon}</div>`;

            container.appendChild(powerDiv);
        }

        // Draw connections between nodes
        //this.drawPowerConnections();

        // Add event listeners for all nodes
        this.setupPowerNodeListeners();

        // Initialize the details panel
        this.showPowerDetailsPlaceholder();

        // Add event listener for the purchase button
        this.setupPowerPurchaseButton();
    }

    setupPowerNodeListeners() {
        // Use event delegation instead of attaching listeners to each node
        const container = document.getElementById('power-tree-container');

        // Remove any existing listeners to avoid duplicates
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);

        // Add a single event listener to the container
        newContainer.addEventListener('click', (e) => {
            // Find the closest skill-node parent of the clicked element
            const node = e.target.closest('.skill-node');

            // If we clicked on a skill node
            if (node) {
                e.stopPropagation();
                const powerId = node.dataset.id;

                // Remove selected class from all nodes
                const allNodes = newContainer.querySelectorAll('.skill-node');
                allNodes.forEach(n => n.classList.remove('selected'));

                // Add selected class to this node
                node.classList.add('selected');

                // Update the detail panel with this power's info
                this.selectedPowerId = powerId;
                this.showPowerDetails(powerId);
            }
        });
    }

    setupPowerPurchaseButton() {
        const purchaseButton = document.getElementById('power-purchase-button');

        // Remove existing listeners
        const newButton = purchaseButton.cloneNode(true);
        purchaseButton.parentNode.replaceChild(newButton, purchaseButton);

        // Add new listener
        newButton.addEventListener('click', () => {
            if (this.selectedPowerId) {
                // console.log(`Attempting to buy power: ${this.selectedPowerId}`);
                const power = this.powers.find(p => p.id === this.selectedPowerId);
                if (power) {
                    // console.log(`Power found: ${power.name}, Unlocked: ${power.unlocked}, Purchased: ${power.purchased}`);
                    // console.log(`Power Points: ${this.resources.powerPoints}, Cost: ${power.cost}`);
                    // console.log(`Can afford: ${this.resources.powerPoints.greaterThanOrEqual(power.cost)}`);
                }

                const success = this.buyPower(this.selectedPowerId);
                // console.log(`Buy power result: ${success}`);

                if (success) {
                    // Update connections
                    //this.drawPowerConnections();

                    // Update the selected node's appearance
                    const selectedNode = document.querySelector(`.skill-node[data-id="${this.selectedPowerId}"]`);
                    if (selectedNode) {
                        selectedNode.classList.remove('available');
                        selectedNode.classList.add('purchased');
                    }

                    // Update the details panel
                    this.showPowerDetails(this.selectedPowerId);

                    // Check for newly unlocked powers
                    this.checkPowerUnlocks();
                } else {
                    // console.log('Failed to purchase power');
                }
            } else {
                // console.log('No power selected');
            }
        });
    }

    showPowerDetailsPlaceholder() {
        // Show placeholder and hide details
        document.getElementById('power-details-placeholder').style.display = 'flex';
        document.getElementById('power-details').style.display = 'none';
    }

    showPowerDetails(powerId) {
        const power = this.powers.find(p => p.id === powerId);
        if (!power) return;

        // Hide placeholder and show details
        document.getElementById('power-details-placeholder').style.display = 'none';
        document.getElementById('power-details').style.display = 'block';

        const isPurchased = power.purchased;
        const isAvailable = power.unlocked && !isPurchased;
        const canAfford = this.resources.powerPoints.greaterThanOrEqual(power.cost);

        // Check if all requirements are met
        let requirementsMet = true;
        if (power.requires) {
            requirementsMet = power.requires.every(req =>
                this.powers.find(p => p.id === req && p.purchased)
            );
        }

        // Update header
        document.getElementById('power-icon').innerHTML = power.icon;
        document.getElementById('power-name').textContent = power.name;

        // Update description
        document.getElementById('power-description').textContent = power.description;

        // Update cost - use formatPowerPoints for consistency
        const costElement = document.getElementById('power-cost');
        if (!isPurchased) {
            // Create a clearer cost display with comparison
            const costValue = this.formatPowerPoints(power.cost);
            const currentPoints = this.formatPowerPoints(this.resources.powerPoints);

            if (canAfford) {
                costElement.innerHTML = `Cost: <span style="color: var(--success);">${costValue} / ${currentPoints} Power Points</span> <span style="font-size: 0.9em;">✓</span>`;
            } else {
                costElement.innerHTML = `Cost: <span style="color: var(--danger);">${costValue} / ${currentPoints} Power Points</span> <span style="font-size: 0.9em;">✗</span>`;
            }
            costElement.style.display = 'block';
        } else {
            costElement.style.display = 'none';
        }

        // Update requirements with more detailed information
        const requirementsElement = document.getElementById('power-requirements');

        // Special handling for power20 and power30
        if (power.id === 'power20') {
            const power17 = this.powers.find(p => p.id === 'power17');
            const isPurchased = power17 && power17.purchased;
            const statusIcon = isPurchased ? '✅' : '❌';
            const statusClass = isPurchased ? 'met' : 'unmet';

            requirementsElement.innerHTML = `
                <span class="requirement-title">Special Power Requirements:</span><br>
                <span class="requirement ${statusClass}">${statusIcon} Reality Manipulation</span><br>
                <span class="requirement met">✨ This is a powerful ability that requires only Reality Manipulation</span>
            `;
            requirementsElement.className = 'power-requirements';
            requirementsElement.style.display = 'block';
        } else if (power.id === 'power30') {
            const power12 = this.powers.find(p => p.id === 'power12');
            const isPurchased = power12 && power12.purchased;
            const statusIcon = isPurchased ? '✅' : '❌';
            const statusClass = isPurchased ? 'met' : 'unmet';

            requirementsElement.innerHTML = `
                <span class="requirement-title">Special Power Requirements:</span><br>
                <span class="requirement ${statusClass}">${statusIcon} Temporal Acceleration</span><br>
                <span class="requirement met">✨ This advanced time power builds directly on Temporal Acceleration</span>
            `;
            requirementsElement.className = 'power-requirements';
            requirementsElement.style.display = 'block';
        } else if (power.requires) {
            // Create a more detailed requirements display for normal powers
            const requirementDetails = power.requires.map(req => {
                const reqPower = this.powers.find(p => p.id === req);
                if (reqPower) {
                    const isPurchased = reqPower.purchased;
                    const statusIcon = isPurchased ? '✅' : '❌';
                    const statusClass = isPurchased ? 'met' : 'unmet';
                    return `<span class="requirement ${statusClass}">${statusIcon} ${reqPower.name}</span>`;
                }
                return req;
            }).join('<br>');

            if (requirementsMet) {
                requirementsElement.innerHTML = '<span class="requirement-title met">Requirements met!</span>';
                requirementsElement.className = 'power-requirements met';
            } else {
                requirementsElement.innerHTML = `<span class="requirement-title">Requirements:</span><br>${requirementDetails}`;
                requirementsElement.className = 'power-requirements';
            }
            requirementsElement.style.display = 'block';
        } else {
            requirementsElement.innerHTML = '<span class="requirement-title met">No prerequisites required</span>';
            requirementsElement.className = 'power-requirements met';
            requirementsElement.style.display = 'block';
        }

        // Update effects
        const effectsList = document.getElementById('power-effects-list');
        effectsList.innerHTML = '';

        // Add effect items
        if (power.effect.multiplier) {
            this.addEffectItem(effectsList, `Multiplies all production by ${power.effect.multiplier}`);
        }
        if (power.effect.clickMultiplier) {
            this.addEffectItem(effectsList, `Multiplies essence from channeling by ${power.effect.clickMultiplier}`);
        }
        if (power.effect.costReduction) {
            this.addEffectItem(effectsList, `Reduces realm costs by ${Math.round((1 - power.effect.costReduction) * 100)}%`);
        }
        if (power.effect.ascensionMultiplier) {
            this.addEffectItem(effectsList, `Increases power point gain by ${Math.round((power.effect.ascensionMultiplier - 1) * 100)}%`);
        }
        if (power.effect.realmCountBonus) {
            this.addEffectItem(effectsList, `Increases essence production by 1% for each realm owned`);
        }
        if (power.effect.criticalClick && power.id === 'power28') { // Midas Touch
            this.addEffectItem(effectsList, `${Math.round(power.effect.criticalClick.chance * 100)}% chance to get ${power.effect.criticalClick.multiplier}x essence from channeling`);
        }
        if (power.effect.realmTypeCostReduction) {
            this.addEffectItem(effectsList, `Reduces realm costs by 1% for each active realm type`);
        }
        if (power.effect.gameSpeed && power.id === 'power30') { // Time Dilation
            this.addEffectItem(effectsList, `Increases game speed by ${Math.round((power.effect.gameSpeed - 1) * 100)}%`);
        }
        if (power.effect.realmCountBonus10) {
            this.addEffectItem(effectsList, `Increases essence production by 10% for each realm owned`);
        }
        if (power.effect.balanceBonus) {
            this.addEffectItem(effectsList, `Increases essence production and power point gain by ${Math.round((power.effect.balanceBonus - 1) * 100)}%`);
        }
        if (power.effect.synergy) {
            this.addEffectItem(effectsList, `Each realm type boosts overall production by 5%`);
        }
        if (power.effect.realmMultiplier) {
            const targetNames = power.effect.realmMultiplier.targets.map(targetId => {
                const realm = this.realms.find(r => r.id === targetId);
                return realm ? realm.name : targetId;
            }).join(', ');
            this.addEffectItem(effectsList, `Multiplies production of ${targetNames} by ${power.effect.realmMultiplier.multiplier}`);
        }
        if (power.effect.quantumSynergy) {
            this.addEffectItem(effectsList, `Each active realm boosts all other realms by 2%`);
        }
        if (power.effect.criticalClick && power.id !== 'power28') {
            this.addEffectItem(effectsList, `${Math.round(power.effect.criticalClick.chance * 100)}% chance for ${power.effect.criticalClick.multiplier}x essence from channeling`);
        }
        if (power.effect.metaMultiplier) {
            this.addEffectItem(effectsList, `Multiplies the effect of all other powers by ${power.effect.metaMultiplier}`);
        }
        if (power.effect.gameSpeed && power.id !== 'power30') {
            this.addEffectItem(effectsList, `Increases game speed by ${Math.round((power.effect.gameSpeed - 1) * 100)}%`);
        }
        if (power.effect.dungeonHealthMultiplier) {
            this.addEffectItem(effectsList, `Increases dungeon health by ${Math.round((power.effect.dungeonHealthMultiplier - 1) * 100)}%`);
        }
        if (power.effect.dungeonAttackMultiplier) {
            this.addEffectItem(effectsList, `Increases dungeon attack by ${Math.round((power.effect.dungeonAttackMultiplier - 1) * 100)}%`);
        }
        if (power.effect.dungeonDefenseMultiplier) {
            this.addEffectItem(effectsList, `Increases dungeon defense by ${Math.round((power.effect.dungeonDefenseMultiplier - 1) * 100)}%`);
        }
        if (power.effect.dungeonLootChance) {
            this.addEffectItem(effectsList, `Increases dungeon loot chance by ${Math.round((power.effect.dungeonLootChance - 1) * 100)}%`);
        }
        if (power.effect.dungeonEssenceReward) {
            this.addEffectItem(effectsList, `Increases dungeon essence rewards by ${Math.round((power.effect.dungeonEssenceReward - 1) * 100)}%`);
        }
        if (power.effect.dungeonSkillPointBonus) {
            this.addEffectItem(effectsList, `Increases dungeon skill point rewards by ${Math.round((power.effect.dungeonSkillPointBonus - 1) * 100)}%`);
        }

        // Update purchase button
        const purchaseButton = document.getElementById('power-purchase-button');
        if (isPurchased) {
            purchaseButton.textContent = 'Mastered';
            purchaseButton.disabled = true;
        } else {
            purchaseButton.textContent = 'Master Power';
            // Debug log to check values
            // console.log(`Power ${power.name} - isAvailable: ${isAvailable}, canAfford: ${canAfford}, requirementsMet: ${requirementsMet}`);

            // Special handling for power20 and power30
            if (power.id === 'power20' || power.id === 'power30') {
                // For these problematic powers, only check if they're unlocked and affordable
                purchaseButton.disabled = !(isAvailable && canAfford);
            } else {
                // For all other powers, use the normal logic
                purchaseButton.disabled = false;
                if (!(isAvailable && canAfford && requirementsMet)) {
                    purchaseButton.disabled = true;
                }
            }
        }
    }

    addEffectItem(list, text) {
        const item = document.createElement('li');
        item.textContent = text;
        list.appendChild(item);
    }

    checkPowerUnlocks() {
        let anyUnlocked = false;

        // Special handling for power20 and power30 which have been problematic
        const power20 = this.powers.find(p => p.id === 'power20');
        const power30 = this.powers.find(p => p.id === 'power30');
        const power17 = this.powers.find(p => p.id === 'power17');
        const power12 = this.powers.find(p => p.id === 'power12');

        // Force unlock power20 if power17 is purchased
        if (power20 && !power20.unlocked && power17 && power17.purchased) {
            power20.unlocked = true;
            anyUnlocked = true;
            this.showNotification(`Unlocked power: ${power20.name}!`);
        }

        // Force unlock power30 if power12 is purchased
        if (power30 && !power30.unlocked && power12 && power12.purchased) {
            power30.unlocked = true;
            anyUnlocked = true;
            this.showNotification(`Unlocked power: ${power30.name}!`);
        }

        // Regular unlock logic for other powers
        for (const power of this.powers) {
            if (!power.unlocked && power.requires) {
                const allRequirementsMet = power.requires.every(req =>
                    this.powers.find(p => p.id === req && p.purchased)
                );

                if (allRequirementsMet) {
                    power.unlocked = true;
                    anyUnlocked = true;
                    this.showNotification(`Unlocked power: ${power.name}!`);
                }
            }
        }

        if (anyUnlocked) {
            // Update the UI to reflect newly unlocked powers
            this.updatePowersUI();
        }
    }

    drawPowerConnections() {
        const container = document.getElementById('skill-connections');
        container.innerHTML = '';

        // Get the grid cell size based on the container size and number of columns/rows
        const gridContainer = document.getElementById('power-tree-container');
        const gridWidth = gridContainer.offsetWidth;
        const gridHeight = gridContainer.offsetHeight;
        const cellWidth = gridWidth / 5; // 5 columns
        const cellHeight = gridHeight / 6; // 6 rows

        // Draw connections between powers based on requirements
        for (const power of this.powers) {
            if (power.requires) {
                for (const requiredId of power.requires) {
                    const requiredPower = this.powers.find(p => p.id === requiredId);
                    if (requiredPower) {
                        // Create a connection line
                        const connection = document.createElement('div');
                        connection.className = 'skill-connection';
                        connection.dataset.from = requiredId;
                        connection.dataset.to = power.id;

                        // Get positions of both powers
                        const startX = Math.round(requiredPower.position.x);
                        const startY = Math.round(requiredPower.position.y);
                        const endX = Math.round(power.position.x);
                        const endY = Math.round(power.position.y);

                        // Calculate line properties
                        const length = Math.sqrt(Math.pow((endX - startX) * cellWidth, 2) + Math.pow((endY - startY) * cellHeight, 2));
                        const angle = Math.atan2((endY - startY) * cellHeight, (endX - startX) * cellWidth) * 180 / Math.PI;

                        // Position the line
                        connection.style.width = `${length}px`;
                        connection.style.left = `${(startX + 0.5) * cellWidth}px`; // Center of start node
                        connection.style.top = `${(startY + 0.5) * cellHeight}px`; // Center of start node
                        connection.style.transform = `rotate(${angle}deg)`;

                        // Add a class if the power is purchased
                        if (power.purchased && requiredPower.purchased) {
                            connection.classList.add('active');
                        } else if (power.unlocked && requiredPower.purchased) {
                            connection.classList.add('unlocked');
                        }

                        container.appendChild(connection);
                    }
                }
            }
        }
    }

    updateAscensionUI() {
        // Use cached DOM elements
        this.domCache.currentPrestige.textContent = this.formatPowerPoints(this.resources.powerPoints);
        this.domCache.prestigeGainAmount.textContent = this.formatPowerPoints(this.powerPointsOnReset);
        this.domCache.prestigeMultiplierValue.textContent = this.formatNumber(this.ascensionMultiplier);
        this.domCache.prestigeCount.textContent = this.statistics.ascensionCount;

        // Update ascension status
        const ascensionStatus = document.getElementById('ascension-status');
        if (ascensionStatus) {
            if (this.powerPointsOnReset.lessThanOrEqual(0)) {
                ascensionStatus.textContent = 'Not ready to ascend - Need more essence';
                ascensionStatus.classList.remove('ready');
            } else {
                ascensionStatus.textContent = 'Ready to ascend!';
                ascensionStatus.classList.add('ready');
            }
        }

        // Update formula breakdown
        const basePowerPoints = document.getElementById('base-power-points');
        const totalPowerMultiplier = document.getElementById('total-power-multiplier');

        if (basePowerPoints && totalPowerMultiplier) {
            // Calculate base power points (without multipliers)
            const basePoints = this.resources.totalEssence.pow(0.15).divide(100);
            basePowerPoints.textContent = this.formatPowerPoints(basePoints);

            // Add explanation of the formula
            const formulaExplanation = document.getElementById('formula-explanation');
            if (formulaExplanation) {
                formulaExplanation.innerHTML = `<strong>Formula:</strong> (Total Essence)<sup>0.15</sup> ÷ 100 × Multipliers<br><small>This converts large essence values (e.g., 1e10) to more manageable Power Points values.</small>`;
            }

            // Calculate total multiplier
            let multiplier = new BigNumber(1);

            // Check for powers with ascension multipliers
            for (const power of this.powers) {
                if (power.purchased && power.effect.ascensionMultiplier) {
                    multiplier = multiplier.multiply(power.effect.ascensionMultiplier);
                }
            }

            // Check for artifacts with power point multipliers
            for (const artifact of this.artifacts) {
                if (artifact.purchased && artifact.type === 'ascension') {
                    multiplier = multiplier.multiply(artifact.effect.multiplier);
                }
                if (artifact.purchased && artifact.type === 'dungeon' && artifact.effect.powerPointMultiplier) {
                    multiplier = multiplier.multiply(artifact.effect.powerPointMultiplier);
                }
            }

            // Apply Cosmic Balance power if purchased
            const cosmicBalancePower = this.powers.find(p => p.purchased && p.effect.balanceBonus);
            if (cosmicBalancePower) {
                multiplier = multiplier.multiply(cosmicBalancePower.effect.balanceBonus);
            }

            totalPowerMultiplier.textContent = this.formatPowerPoints(multiplier);
        }

        // Disable ascension button if no points would be gained
        if (this.powerPointsOnReset.lessThanOrEqual(0)) {
            this.domCache.prestigeButton.disabled = true;
        } else {
            this.domCache.prestigeButton.disabled = false;
        }
    }

    updateFeatsUI() {
        const container = this.domCache.achievementsContainer;
        if (!container) return;
        container.innerHTML = '';

        // Get current filter and search term - use the specific ID for the feats filter tabs
        const activeFilterElement = document.querySelector('#feats-filter-tabs .filter-tab.active');
        const activeFilter = activeFilterElement ? activeFilterElement.dataset.filter : 'all';
        const searchTerm = this.domCache.achievementSearch ? this.domCache.achievementSearch.value.toLowerCase() : '';

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();

        // Separate earned and unearned feats
        const earnedFeats = [];
        const unearnedFeats = [];

        // Categorize feats
        for (const feat of this.feats) {
            if (feat.earned || !feat.hidden) {
                // Determine feat category using the helper method
                const category = this._determineFeatCategory(feat);

                // Store the category on the feat object for future reference
                feat.category = category;

                // Apply filtering
                const matchesFilter = activeFilter === 'all' || category === activeFilter;
                const matchesSearch = !searchTerm ||
                                     feat.name.toLowerCase().includes(searchTerm) ||
                                     feat.description.toLowerCase().includes(searchTerm);

                if (matchesFilter && matchesSearch) {
                    // Create feat div
                    const featDiv = document.createElement('div');
                    featDiv.className = `achievement ${feat.earned ? 'earned' : ''}`;
                    featDiv.dataset.category = category;

                    featDiv.innerHTML = `
                        <div class="achievement-icon">${feat.icon}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">${feat.name}</div>
                            <div class="achievement-desc">${feat.description}</div>
                        </div>
                    `;

                    // Add to appropriate array
                    if (feat.earned) {
                        earnedFeats.push(featDiv);
                    } else {
                        unearnedFeats.push(featDiv);
                    }
                }
            }
        }

        // Add all earned feats to the fragment
        earnedFeats.forEach(featDiv => {
            fragment.appendChild(featDiv);
        });

        // Add a separator if there are both earned and unearned feats
        if (earnedFeats.length > 0 && unearnedFeats.length > 0) {
            const separator = document.createElement('div');
            separator.className = 'achievement-separator';
            separator.innerHTML = '<div class="separator-line"></div><div class="separator-text">Locked Feats</div><div class="separator-line"></div>';
            fragment.appendChild(separator);
        }

        // Add unearned feats (limited to 10) to the fragment
        const initialUnearnedCount = 10;
        const hasMoreUnearned = unearnedFeats.length > initialUnearnedCount;

        // Add the first 10 unearned feats (in their original order, not shuffled)
        for (let i = 0; i < Math.min(initialUnearnedCount, unearnedFeats.length); i++) {
            fragment.appendChild(unearnedFeats[i]);
        }

        // Add 'Show More' button if there are more than 10 unearned feats
        if (hasMoreUnearned) {
            const showMoreDiv = document.createElement('div');
            showMoreDiv.className = 'show-more-feats';
            showMoreDiv.innerHTML = `<button id="show-more-feats-btn">Show More Feats (${unearnedFeats.length - initialUnearnedCount} remaining)</button>`;
            fragment.appendChild(showMoreDiv);

            // Store the remaining feats for later use (in their original order)
            this._remainingFeats = unearnedFeats.slice(initialUnearnedCount);

            // Create the hidden feats container but don't populate it yet
            const hiddenFeatsDiv = document.createElement('div');
            hiddenFeatsDiv.className = 'hidden-feats';
            hiddenFeatsDiv.style.display = 'none';
            fragment.appendChild(hiddenFeatsDiv);
        }

        // Append all at once
        container.appendChild(fragment);

        // Add event listener to the 'Show More' button
        const showMoreBtn = document.getElementById('show-more-feats-btn');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', () => {
                const hiddenFeats = document.querySelector('.hidden-feats');
                if (hiddenFeats && this._remainingFeats && this._remainingFeats.length > 0) {
                    // Clear any existing content
                    hiddenFeats.innerHTML = '';

                    // Shuffle the remaining feats
                    this._remainingFeats = this._shuffleArray([...this._remainingFeats]);

                    // Add the shuffled feats to the container
                    this._remainingFeats.forEach(featDiv => {
                        hiddenFeats.appendChild(featDiv);
                    });

                    // Show the container with proper spacing
                    hiddenFeats.style.display = 'block';
                    showMoreBtn.parentElement.style.display = 'none';
                }
            });
        }
    }

    // Helper method to determine the category of a feat
    _determineFeatCategory(feat) {
        // Check for dungeon-related feats first (categorize as dungeon)
        if (feat.name.toLowerCase().includes('dungeon') ||
            feat.description.toLowerCase().includes('dungeon') ||
            feat.name.toLowerCase().includes('victory') ||
            feat.name.toLowerCase().includes('room') ||
            feat.name.toLowerCase().includes('cartographer') ||
            feat.name.toLowerCase().includes('surveyor') ||
            (feat.condition.specialCondition &&
             (feat.condition.specialCondition.includes('dungeon') ||
              feat.condition.specialCondition.includes('Runs') ||
              feat.condition.specialCondition.includes('Wins') ||
              feat.condition.specialCondition.includes('Rooms') ||
              feat.condition.specialCondition.includes('treasure')))) {
            return 'dungeon';
        }

        // Check for artifact-related feats (categorize as power)
        if (feat.name.toLowerCase().includes('artifact') ||
            feat.description.toLowerCase().includes('artifact') ||
            feat.name.toLowerCase().includes('discoverer') ||
            feat.name.toLowerCase().includes('hunter') ||
            feat.name.toLowerCase().includes('collector') ||
            (feat.condition.specialCondition &&
             (feat.condition.specialCondition.includes('artifact') ||
              feat.condition.specialCondition.includes('Stone')))) {
            return 'power';
        }

        // Check for essence-related feats
        if (feat.condition.resource === 'essence' ||
            feat.name.toLowerCase().includes('essence') ||
            feat.description.toLowerCase().includes('essence') ||
            feat.name.toLowerCase().includes('channel') ||
            feat.description.toLowerCase().includes('channel') ||
            feat.name.toLowerCase().includes('production') ||
            feat.description.toLowerCase().includes('production') ||
            feat.name.toLowerCase().includes('tapper') ||
            feat.name.toLowerCase().includes('channeler') ||
            feat.name.toLowerCase().includes('devotee') ||
            feat.name.toLowerCase().includes('fanatic') ||
            feat.name.toLowerCase().includes('zealot') ||
            feat.name.toLowerCase().includes('flow') ||
            feat.name.toLowerCase().includes('stream') ||
            feat.name.toLowerCase().includes('river') ||
            feat.name.toLowerCase().includes('ocean') ||
            feat.name.toLowerCase().includes('tsunami') ||
            feat.name.toLowerCase().includes('billionaire') ||
            feat.name.toLowerCase().includes('trillionaire') ||
            feat.name.toLowerCase().includes('sovereign') ||
            feat.name.toLowerCase().includes('novice') ||
            feat.name.toLowerCase().includes('adept') ||
            (feat.condition.specialCondition &&
             (feat.condition.specialCondition.includes('production') ||
              feat.condition.specialCondition.includes('essence') ||
              feat.condition.specialCondition.includes('Clicks') ||
              feat.condition.specialCondition.includes('Channeling')))) {
            return 'essence';
        }

        // Check for realm-related feats
        if (feat.condition.realmCount ||
            feat.name.toLowerCase().includes('realm') ||
            feat.name.toLowerCase().includes('garden') ||
            feat.name.toLowerCase().includes('forest') ||
            feat.name.toLowerCase().includes('waterfall') ||
            feat.name.toLowerCase().includes('flame') ||
            feat.name.toLowerCase().includes('stargazer') ||
            feat.name.toLowerCase().includes('void') ||
            feat.name.toLowerCase().includes('nexus') ||
            feat.name.toLowerCase().includes('library') ||
            feat.name.toLowerCase().includes('oasis') ||
            feat.name.toLowerCase().includes('labyrinth') ||
            feat.name.toLowerCase().includes('forge') ||
            feat.name.toLowerCase().includes('spire') ||
            feat.name.toLowerCase().includes('nebula') ||
            feat.name.toLowerCase().includes('sanctuary') ||
            feat.name.toLowerCase().includes('ocean') ||
            feat.name.toLowerCase().includes('loom') ||
            feat.name.toLowerCase().includes('wellspring') ||
            feat.name.toLowerCase().includes('citadel') ||
            feat.name.toLowerCase().includes('core') ||
            feat.name.toLowerCase().includes('keeper') ||
            feat.name.toLowerCase().includes('guardian') ||
            feat.name.toLowerCase().includes('tamer') ||
            feat.name.toLowerCase().includes('walker') ||
            feat.name.toLowerCase().includes('favor') ||
            feat.name.toLowerCase().includes('bloom') ||
            feat.name.toLowerCase().includes('whispers') ||
            feat.name.toLowerCase().includes('finder') ||
            feat.name.toLowerCase().includes('enthusiast') ||
            feat.name.toLowerCase().includes('explorer') ||
            feat.description.toLowerCase().includes('realm') ||
            (feat.condition.specialCondition &&
             (feat.condition.specialCondition.includes('realm') ||
              feat.condition.specialCondition.includes('Realms')))) {
            return 'realm';
        }

        // Check for power-related feats
        if (feat.condition.powerCount ||
            feat.name.toLowerCase().includes('power') ||
            feat.name.toLowerCase().includes('archmage') ||
            feat.name.toLowerCase().includes('master') ||
            feat.name.toLowerCase().includes('overlord') ||
            feat.name.toLowerCase().includes('architect') ||
            feat.name.toLowerCase().includes('sage') ||
            feat.name.toLowerCase().includes('visionary') ||
            feat.name.toLowerCase().includes('resonator') ||
            feat.name.toLowerCase().includes('shaper') ||
            feat.name.toLowerCase().includes('harmonizer') ||
            feat.name.toLowerCase().includes('overwhelming') ||
            feat.name.toLowerCase().includes('supreme') ||
            feat.name.toLowerCase().includes('omnipotent') ||
            feat.name.toLowerCase().includes('philosopher') ||
            feat.name.toLowerCase().includes('navigator') ||
            feat.name.toLowerCase().includes('lord') ||
            feat.name.toLowerCase().includes('emperor') ||
            feat.name.toLowerCase().includes('warrior') ||
            feat.name.toLowerCase().includes('defender') ||
            feat.name.toLowerCase().includes('favorite') ||
            feat.name.toLowerCase().includes('illuminator') ||
            feat.name.toLowerCase().includes('creation') ||
            feat.description.toLowerCase().includes('power') ||
            (feat.condition.specialCondition &&
             (feat.condition.specialCondition.includes('power') ||
              feat.condition.specialCondition.includes('Mastery') ||
              feat.condition.specialCondition.includes('Entanglement') ||
              feat.condition.specialCondition.includes('Folding') ||
              feat.condition.specialCondition.includes('Acceleration') ||
              feat.condition.specialCondition.includes('Crystallization') ||
              feat.condition.specialCondition.includes('Insight') ||
              feat.condition.specialCondition.includes('Resonance') ||
              feat.condition.specialCondition.includes('Will') ||
              feat.condition.specialCondition.includes('Manipulation') ||
              feat.condition.specialCondition.includes('Synergy') ||
              feat.condition.specialCondition.includes('Omniscience') ||
              feat.condition.specialCondition.includes('Harmony') ||
              feat.condition.specialCondition.includes('Overflow') ||
              feat.condition.specialCondition.includes('Balance')))) {
            return 'power';
        }

        // Check for ascension-related feats
        if (feat.condition.ascensionCount ||
            feat.name.toLowerCase().includes('ascension') ||
            feat.name.toLowerCase().includes('ascend') ||
            feat.name.toLowerCase().includes('transcend') ||
            feat.name.toLowerCase().includes('transcendence') ||
            feat.name.toLowerCase().includes('being') ||
            feat.description.toLowerCase().includes('ascension') ||
            feat.description.toLowerCase().includes('ascend') ||
            (feat.condition.specialCondition &&
             (feat.condition.specialCondition.includes('ascension') ||
              feat.condition.specialCondition.includes('Ascensions') ||
              feat.condition.specialCondition.includes('hourglass')))) {
            return 'ascension';
        }

        // Default to power category if no other category matches
        // This ensures no feat is left uncategorized
        return 'power';
    }

    // Helper method to shuffle an array (Fisher-Yates algorithm)
    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    updateStatisticsUI() {
        const container = this.domCache.statisticsContainer;
        container.innerHTML = '';

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();

        const stats = [
            { name: 'Journey Began', value: this.statistics.gameStarted.toLocaleString() },
            { name: 'Essence Channels', value: this.statistics.totalClicks.toLocaleString() },
            { name: 'Critical Channels', value: (this.statistics.criticalClicks || 0).toLocaleString() },
            { name: 'Peak Essence', value: this.formatNumber(this.statistics.highestEssence) },
            { name: 'Total Ascensions', value: this.statistics.ascensionCount.toLocaleString() },
            { name: 'Power Points Earned', value: this.formatPowerPoints(this.statistics.totalPowerPoints) }
        ];

        stats.forEach(stat => {
            const statDiv = document.createElement('div');
            statDiv.className = 'stat-item';
            statDiv.innerHTML = `
                <div class="stat-name">${stat.name}</div>
                <div class="stat-value">${stat.value}</div>
            `;
            fragment.appendChild(statDiv);
        });

        // Append all at once
        container.appendChild(fragment);
    }

    updateBonusesUI() {
        const container = this.domCache.bonusesContainer;
        if (!container) return;

        container.innerHTML = '';

        // Create categories for different types of bonuses
        const bonusCategories = {
            essence: { title: 'Essence Generation', bonuses: [] },
            realm: { title: 'Realm Production', bonuses: [] },
            cost: { title: 'Cost Reduction', bonuses: [] },
            power: { title: 'Power Point Gain', bonuses: [] },
            meta: { title: 'Meta Effects', bonuses: [] },
            dungeon: { title: 'Dungeon Bonuses', bonuses: [] }
        };

        // Calculate total channeling multiplier
        let totalChannelingMultiplier = new BigNumber(1);
        let channelingSources = [];

        // From artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'channeling') {
                totalChannelingMultiplier = totalChannelingMultiplier.multiply(artifact.effect.multiplier);
                channelingSources.push(artifact.name);
            }
        }

        // From powers
        for (const power of this.powers) {
            if (power.purchased && power.effect.clickMultiplier) {
                totalChannelingMultiplier = totalChannelingMultiplier.multiply(power.effect.clickMultiplier);
                channelingSources.push(power.name);
            }
        }

        // Add channeling multiplier if it's greater than 1
        if (totalChannelingMultiplier.greaterThan(1)) {
            bonusCategories.essence.bonuses.push({
                name: 'Essence per Channel',
                value: `×${this.formatNumber(totalChannelingMultiplier)}`,
                sources: channelingSources.join(', ')
            });
        }

        // Calculate total global production multiplier
        let totalProductionMultiplier = new BigNumber(1);
        let productionSources = [];

        // From artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'global') {
                totalProductionMultiplier = totalProductionMultiplier.multiply(artifact.effect.multiplier);
                productionSources.push(artifact.name);
            }
        }

        // From powers with direct multipliers
        for (const power of this.powers) {
            if (power.purchased && power.effect.multiplier) {
                totalProductionMultiplier = totalProductionMultiplier.multiply(power.effect.multiplier);
                productionSources.push(power.name);
            }
        }

        // Add ascension multiplier
        if (this.ascensionMultiplier.greaterThan(1)) {
            totalProductionMultiplier = totalProductionMultiplier.multiply(this.ascensionMultiplier);
            productionSources.push('Ascension Bonus');
        }

        // Add global production multiplier if it's greater than 1
        if (totalProductionMultiplier.greaterThan(1)) {
            bonusCategories.realm.bonuses.push({
                name: 'All Realms Production',
                value: `×${this.formatNumber(totalProductionMultiplier)}`,
                sources: productionSources.join(', ')
            });
        }

        // Add synergy effects
        const activeRealmTypes = this.realms.filter(r => r.count > 0).length;
        if (activeRealmTypes > 0) {
            for (const power of this.powers) {
                if (power.purchased && power.effect.synergy) {
                    const synergyMultiplier = power.effect.synergyMultiplier || 0.05;
                    const totalBonus = Math.round(activeRealmTypes * synergyMultiplier * 100);
                    bonusCategories.realm.bonuses.push({
                        name: 'Realm Type Synergy',
                        value: `+${totalBonus}%`,
                        sources: `${power.name} (${activeRealmTypes} realm types)`
                    });
                }
            }
        }

        // Add quantum synergy effects
        const activeRealms = this.realms.filter(r => r.count > 0);
        if (activeRealms.length > 1) {
            for (const power of this.powers) {
                if (power.purchased && power.effect.quantumSynergy) {
                    const otherRealmsCount = activeRealms.length - 1;
                    const quantumBoost = Math.round(otherRealmsCount * 0.02 * 100);
                    bonusCategories.realm.bonuses.push({
                        name: 'Quantum Realm Synergy',
                        value: `+${quantumBoost}% per realm`,
                        sources: `${power.name} (${activeRealms.length} active realms)`
                    });
                }
            }
        }

        // Add Essence Acceleration bonus
        for (const power of this.powers) {
            if (power.purchased && power.effect.realmCountBonus) {
                const totalRealmCount = this.realms.reduce((sum, realm) => sum + realm.count, 0);
                const realmCountBonus = Math.round(totalRealmCount * 1);
                bonusCategories.realm.bonuses.push({
                    name: 'Essence Acceleration',
                    value: `+${realmCountBonus}%`,
                    sources: `${power.name} (${totalRealmCount} total realms)`
                });
            }
        }

        // Add Essence Overflow bonus
        for (const power of this.powers) {
            if (power.purchased && power.effect.realmCountBonus10) {
                const totalRealmCount = this.realms.reduce((sum, realm) => sum + realm.count, 0);
                const realmCountBonus10 = Math.round(totalRealmCount * 10);
                bonusCategories.realm.bonuses.push({
                    name: 'Essence Overflow',
                    value: `+${realmCountBonus10}%`,
                    sources: `${power.name} (${totalRealmCount} total realms)`
                });
            }
        }

        // Add realm-specific multipliers
        const realmMultipliers = {};

        // From artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'realm') {
                const realm = this.realms.find(r => r.id === artifact.target);
                if (realm) {
                    if (!realmMultipliers[realm.name]) {
                        realmMultipliers[realm.name] = {
                            multiplier: new BigNumber(1),
                            sources: []
                        };
                    }
                    realmMultipliers[realm.name].multiplier = realmMultipliers[realm.name].multiplier.multiply(artifact.effect.multiplier);
                    realmMultipliers[realm.name].sources.push(artifact.name);
                }
            }
        }

        // From powers
        for (const power of this.powers) {
            if (power.purchased && power.effect.realmMultiplier) {
                for (const targetId of power.effect.realmMultiplier.targets) {
                    const realm = this.realms.find(r => r.id === targetId);
                    if (realm) {
                        if (!realmMultipliers[realm.name]) {
                            realmMultipliers[realm.name] = {
                                multiplier: new BigNumber(1),
                                sources: []
                            };
                        }
                        realmMultipliers[realm.name].multiplier = realmMultipliers[realm.name].multiplier.multiply(power.effect.realmMultiplier.multiplier);
                        realmMultipliers[realm.name].sources.push(power.name);
                    }
                }
            }
        }

        // Add realm-specific multipliers
        for (const realmName in realmMultipliers) {
            const { multiplier, sources } = realmMultipliers[realmName];
            if (multiplier.greaterThan(1)) {
                bonusCategories.realm.bonuses.push({
                    name: `${realmName} Production`,
                    value: `×${this.formatNumber(multiplier)}`,
                    sources: sources.join(', ')
                });
            }
        }

        // Calculate total cost reduction
        let totalCostReduction = 1;
        let costReductionSources = [];

        for (const power of this.powers) {
            if (power.purchased && power.effect.costReduction) {
                totalCostReduction *= power.effect.costReduction;
                costReductionSources.push(power.name);
            }
        }

        // Add cost reduction if it's less than 1
        if (totalCostReduction < 1) {
            bonusCategories.cost.bonuses.push({
                name: 'Realm Cost Reduction',
                value: `-${Math.round((1 - totalCostReduction) * 100)}%`,
                sources: costReductionSources.join(', ')
            });
        }

        // Add Realm Harmony cost reduction
        for (const power of this.powers) {
            if (power.purchased && power.effect.realmTypeCostReduction) {
                const activeRealmTypes = this.realms.filter(r => r.count > 0).length;
                const harmonyReduction = Math.round(activeRealmTypes * 1);
                bonusCategories.cost.bonuses.push({
                    name: 'Realm Harmony',
                    value: `-${harmonyReduction}%`,
                    sources: `${power.name} (${activeRealmTypes} realm types)`
                });
            }
        }

        // Calculate total power point multiplier
        let totalPowerPointMultiplier = new BigNumber(1);
        let powerPointSources = [];

        // From artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'ascension') {
                totalPowerPointMultiplier = totalPowerPointMultiplier.multiply(artifact.effect.multiplier);
                powerPointSources.push(artifact.name);
            }
        }

        // From powers
        for (const power of this.powers) {
            if (power.purchased && power.effect.ascensionMultiplier) {
                totalPowerPointMultiplier = totalPowerPointMultiplier.multiply(power.effect.ascensionMultiplier);
                powerPointSources.push(power.name);
            }
        }

        // Add power point multiplier if it's greater than 1
        if (totalPowerPointMultiplier.greaterThan(1)) {
            bonusCategories.power.bonuses.push({
                name: 'Power Point Gain',
                value: `×${this.formatPowerPoints(totalPowerPointMultiplier)}`,
                sources: powerPointSources.join(', ')
            });
        }

        // Add ascension-locked artifact bonuses
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'ascension') {
                // Add ascension production bonus
                if (artifact.effect.ascensionProductionBonus) {
                    const bonus = Math.round(artifact.effect.ascensionProductionBonus * this.statistics.ascensionCount * 100);
                    bonusCategories.realm.bonuses.push({
                        name: 'Ascension Production Bonus',
                        value: `+${bonus}%`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions)`
                    });
                }

                // Add ascension synergy bonus
                if (artifact.effect.ascensionSynergyBonus) {
                    const activeRealmTypes = this.realms.filter(r => r.count > 0).length;
                    const bonusPerType = Math.round(artifact.effect.ascensionSynergyBonus * this.statistics.ascensionCount * 100);
                    const totalBonus = Math.round(activeRealmTypes * bonusPerType);
                    bonusCategories.realm.bonuses.push({
                        name: 'Ascension Realm Synergy',
                        value: `+${bonusPerType}% per realm type (total: +${totalBonus}%)`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions, ${activeRealmTypes} realm types)`
                    });
                }

                // Add ascension dungeon reward bonus
                if (artifact.effect.ascensionDungeonRewardBonus) {
                    const bonus = Math.round(artifact.effect.ascensionDungeonRewardBonus * this.statistics.ascensionCount * 100);
                    bonusCategories.dungeon.bonuses.push({
                        name: 'Ascension Dungeon Rewards',
                        value: `+${bonus}%`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions)`
                    });
                }

                // Add ascension channeling bonus
                if (artifact.effect.ascensionChannelingBonus) {
                    const bonus = Math.round(artifact.effect.ascensionChannelingBonus * this.statistics.ascensionCount * 100);
                    bonusCategories.essence.bonuses.push({
                        name: 'Ascension Channeling Bonus',
                        value: `+${bonus}%`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions)`
                    });
                }

                // Add ascension cost reduction
                if (artifact.effect.ascensionCostReduction) {
                    const reduction = Math.round(artifact.effect.ascensionCostReduction * this.statistics.ascensionCount * 100);
                    bonusCategories.cost.bonuses.push({
                        name: 'Ascension Cost Reduction',
                        value: `-${reduction}%`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions)`
                    });
                }

                // Add ascension realm count bonus
                if (artifact.effect.ascensionRealmCountBonus) {
                    const totalRealmCount = this.realms.reduce((sum, realm) => sum + realm.count, 0);
                    const bonusPerRealm = Math.round(artifact.effect.ascensionRealmCountBonus * this.statistics.ascensionCount * 100);
                    const totalBonus = Math.round(totalRealmCount * bonusPerRealm / 100);
                    bonusCategories.realm.bonuses.push({
                        name: 'Ascension Realm Count Bonus',
                        value: `+${bonusPerRealm}% per realm (total: +${totalBonus}%)`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions, ${totalRealmCount} realms)`
                    });
                }

                // Add ascension game speed bonus
                if (artifact.effect.ascensionGameSpeedBonus) {
                    const bonus = Math.round(artifact.effect.ascensionGameSpeedBonus * this.statistics.ascensionCount * 100);
                    bonusCategories.meta.bonuses.push({
                        name: 'Ascension Game Speed',
                        value: `+${bonus}%`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions)`
                    });
                }

                // Add ascension power point bonus
                if (artifact.effect.ascensionPowerPointBonus) {
                    const bonus = Math.round(artifact.effect.ascensionPowerPointBonus * this.statistics.ascensionCount * 100);
                    bonusCategories.power.bonuses.push({
                        name: 'Ascension Power Point Bonus',
                        value: `+${bonus}%`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions)`
                    });
                }

                // Add ascension quantum synergy bonus
                if (artifact.effect.ascensionQuantumSynergyBonus) {
                    const activeRealms = this.realms.filter(r => r.count > 0);
                    if (activeRealms.length > 1) {
                        const otherRealmsCount = activeRealms.length - 1;
                        const bonusPerRealm = (artifact.effect.ascensionQuantumSynergyBonus * this.statistics.ascensionCount * 100).toFixed(1);
                        const totalBonus = (otherRealmsCount * parseFloat(bonusPerRealm)).toFixed(1);
                        bonusCategories.realm.bonuses.push({
                            name: 'Ascension Quantum Synergy',
                            value: `+${bonusPerRealm}% per other realm (total: +${totalBonus}%)`,
                            sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions, ${activeRealms.length} active realms)`
                        });
                    }
                }

                // Add ascension meta multiplier bonus
                if (artifact.effect.ascensionMetaMultiplierBonus) {
                    const bonus = Math.round(artifact.effect.ascensionMetaMultiplierBonus * this.statistics.ascensionCount * 100);
                    bonusCategories.meta.bonuses.push({
                        name: 'Ascension Meta Multiplier',
                        value: `+${bonus}%`,
                        sources: `${artifact.name} (${this.statistics.ascensionCount} ascensions)`
                    });
                }
            }
        }

        // Add Cosmic Balance bonus
        for (const power of this.powers) {
            if (power.purchased && power.effect.balanceBonus) {
                bonusCategories.power.bonuses.push({
                    name: 'Cosmic Balance (Power Points)',
                    value: `+${Math.round((power.effect.balanceBonus - 1) * 100)}%`,
                    sources: power.name
                });
                bonusCategories.realm.bonuses.push({
                    name: 'Cosmic Balance (Essence)',
                    value: `+${Math.round((power.effect.balanceBonus - 1) * 100)}%`,
                    sources: power.name
                });
            }
        }

        // Add meta multiplier
        for (const power of this.powers) {
            if (power.purchased && power.effect.metaMultiplier) {
                bonusCategories.meta.bonuses.push({
                    name: 'All Effects Amplification',
                    value: `×${power.effect.metaMultiplier}`,
                    sources: power.name
                });
            }
        }

        // Add dungeon bonuses
        for (const power of this.powers) {
            if (power.purchased) {
                if (power.effect.dungeonHealthMultiplier) {
                    bonusCategories.dungeon.bonuses.push({
                        name: 'Dungeon Health',
                        value: `+${Math.round((power.effect.dungeonHealthMultiplier - 1) * 100)}%`,
                        sources: power.name
                    });
                }
                if (power.effect.dungeonAttackMultiplier) {
                    bonusCategories.dungeon.bonuses.push({
                        name: 'Dungeon Attack',
                        value: `+${Math.round((power.effect.dungeonAttackMultiplier - 1) * 100)}%`,
                        sources: power.name
                    });
                }
                if (power.effect.dungeonDefenseMultiplier) {
                    bonusCategories.dungeon.bonuses.push({
                        name: 'Dungeon Defense',
                        value: `+${Math.round((power.effect.dungeonDefenseMultiplier - 1) * 100)}%`,
                        sources: power.name
                    });
                }
                if (power.effect.dungeonLootChance) {
                    bonusCategories.dungeon.bonuses.push({
                        name: 'Dungeon Loot Chance',
                        value: `+${Math.round((power.effect.dungeonLootChance - 1) * 100)}%`,
                        sources: power.name
                    });
                }
                if (power.effect.dungeonEssenceReward) {
                    bonusCategories.dungeon.bonuses.push({
                        name: 'Dungeon Essence Rewards',
                        value: `+${Math.round((power.effect.dungeonEssenceReward - 1) * 100)}%`,
                        sources: power.name
                    });
                }
                if (power.effect.dungeonSkillPointBonus) {
                    bonusCategories.dungeon.bonuses.push({
                        name: 'Dungeon Skill Point Rewards',
                        value: `+${Math.round((power.effect.dungeonSkillPointBonus - 1) * 100)}%`,
                        sources: power.name
                    });
                }
            }
        }

        // Create the UI for each category
        for (const category in bonusCategories) {
            const { title, bonuses } = bonusCategories[category];

            if (bonuses.length > 0) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'bonus-category';

                const titleDiv = document.createElement('div');
                titleDiv.className = 'bonus-category-title';
                titleDiv.textContent = title;
                categoryDiv.appendChild(titleDiv);

                for (const bonus of bonuses) {
                    const bonusDiv = document.createElement('div');
                    bonusDiv.className = 'bonus-item';

                    bonusDiv.innerHTML = `
                        <div>
                            <div class="bonus-name">${bonus.name}</div>
                            <div class="bonus-value">${bonus.value}</div>
                        </div>
                        <div class="bonus-sources">From: ${bonus.sources}</div>
                    `;

                    categoryDiv.appendChild(bonusDiv);
                }

                container.appendChild(categoryDiv);
            }
        }

        // If no bonuses, show a message
        if (container.children.length === 0) {
            container.innerHTML = '<p>No active bonuses yet.</p>';
        }
    }

    // Update artifact affordability without rebuilding the UI
    updateArtifactAffordability() {
        // Check if the artifacts tab is visible
        const availableContainer = document.getElementById('available-artifacts-container');
        if (!availableContainer) {
            return;
        }

        try {
            // Get all available artifacts
            const availableArtifacts = this.artifacts.filter(a => a.unlocked && !a.purchased);

            // If no artifacts are available, nothing to update
            if (availableArtifacts.length === 0) {
                return;
            }

            // Check if we need to rebuild the artifacts UI
            let needsRebuild = false;

            // Check each artifact's affordability
            for (const artifact of availableArtifacts) {
                const costResource = artifact.costResource || 'essence';

                // Ensure we're comparing BigNumber objects correctly
                let canAfford = false;
                if (this.resources[costResource] && artifact.cost) {
                    // Perform a strict affordability check using both methods
                    // First convert both to raw numbers for a direct comparison
                    const resourceValue = this.resources[costResource].valueOf();
                    const costValue = artifact.cost.valueOf();

                    // Check using both methods for redundancy
                    const canAffordDirect = resourceValue >= costValue;
                    const canAffordBigNumber = this.resources[costResource].greaterThanOrEqual(artifact.cost);

                    // Only consider affordable if both checks pass
                    canAfford = canAffordDirect && canAffordBigNumber;
                }

                // Log for debugging power point artifacts
                if (costResource === 'powerPoints') {
                    // Uncomment for debugging
                    /*
                    const resourceValue = this.resources[costResource].valueOf();
                    const costValue = artifact.cost.valueOf();
                    console.log(`Checking affordability for ${artifact.name}:`);
                    console.log(`Resource: ${this.resources[costResource].toString()}, Cost: ${artifact.cost.toString()}`);
                    console.log(`Resource value: ${resourceValue}, Cost value: ${costValue}`);
                    console.log(`Can afford: ${canAfford}`);
                    */
                }

                // Find the artifact card
                const artifactCard = availableContainer.querySelector(`.upgrade-card[data-id="${artifact.id}"]`);

                if (artifactCard) {
                    // Update the card's appearance based on affordability
                    if (canAfford && artifactCard.classList.contains('locked')) {
                        artifactCard.classList.remove('locked');
                        artifactCard.dataset.affordable = 'true';
                        needsRebuild = true; // Need to rebuild to add click event listener
                    } else if (!canAfford && !artifactCard.classList.contains('locked')) {
                        artifactCard.classList.add('locked');
                        artifactCard.dataset.affordable = 'false';
                    }

                    // Update the purchase button
                    const purchaseButton = artifactCard.querySelector('.upgrade-purchase-button');
                    if (purchaseButton) {
                        purchaseButton.disabled = !canAfford;
                    }
                } else {
                    // If we can't find the card, we need to rebuild the UI
                    needsRebuild = true;
                }
            }

            // If we need to rebuild, do it
            if (needsRebuild) {
                // console.log('Rebuilding artifacts UI due to affordability changes');
                this.updateArtifactsUI();
            }
        } catch (error) {
            console.error('Error updating artifact affordability:', error);
        }
    }

    // Centralized affordability update system for all purchase buttons
    updateAllAffordability() {
        // Don't update if we're already in the middle of an update
        if (this._affordabilityUpdateInProgress) {
            return;
        }

        this._affordabilityUpdateInProgress = true;

        try {
            // Update realm affordability
            this.updateRealmAffordability();

            // Update power affordability
            this.updatePowerAffordability();

            // Update ascension affordability
            this.updateAscensionAffordability();

            // Update artifact affordability
            this.updateArtifactAffordability();

            // console.log('Updated all affordability checks');
        } catch (error) {
            console.error('Error updating affordability:', error);
        } finally {
            this._affordabilityUpdateInProgress = false;
        }
    }

    // Handle realm updates separately from the game loop
    handleRealmUpdates() {
        // Check if we need to update realms
        if (this._realmUpdateState.needsFullUpdate) {
            const now = Date.now();
            const timeSinceLastUpdate = now - this._realmUpdateState.lastFullUpdate;

            // Only do a full update if it's been long enough since the last one
            if (timeSinceLastUpdate > this._realmUpdateState.updateInterval) {
                // console.log('Performing scheduled full realm update');
                this.updateRealmsUI();
            }
        } else if (this._realmUpdateState.needsAffordabilityUpdate) {
            // Just update affordability
            this.updateRealmAffordability();
        }
    }

    updatePagination(section, totalItems) {
        const totalPages = Math.max(1, Math.ceil(totalItems / this.pagination[section].itemsPerPage));
        this.pagination[section].totalPages = totalPages;

        // Adjust current page if it's out of bounds
        if (this.pagination[section].page > totalPages) {
            this.pagination[section].page = totalPages;
        }

        // Update pagination UI
        const paginationInfo = document.getElementById(`${section}-pagination-info`);
        const prevButton = document.getElementById(`${section}-prev-page`);
        const nextButton = document.getElementById(`${section}-next-page`);

        if (paginationInfo) {
            paginationInfo.textContent = `Page ${this.pagination[section].page} of ${totalPages}`;
        }

        if (prevButton) {
            prevButton.disabled = this.pagination[section].page <= 1;
        }

        if (nextButton) {
            nextButton.disabled = this.pagination[section].page >= totalPages;
        }

        // Hide pagination if only one page
        const paginationContainer = document.getElementById(`${section}-artifacts-pagination`);
        if (paginationContainer) {
            paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    setupArtifactPaginationListeners() {
        // Only set up listeners once to avoid performance issues
        if (this._artifactPaginationListenersSet) return;

        const sections = ['available', 'acquired', 'locked'];

        sections.forEach(section => {
            const prevButton = document.getElementById(`${section}-prev-page`);
            const nextButton = document.getElementById(`${section}-next-page`);

            if (prevButton) {
                // Remove existing listeners
                const newPrevButton = prevButton.cloneNode(true);
                prevButton.parentNode.replaceChild(newPrevButton, prevButton);

                // Add new listener
                newPrevButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    if (this.pagination[section].page > 1) {
                        this.pagination[section].page--;
                        this.updateArtifactsUI();
                    }
                });
            }

            if (nextButton) {
                // Remove existing listeners
                const newNextButton = nextButton.cloneNode(true);
                nextButton.parentNode.replaceChild(newNextButton, nextButton);

                // Add new listener
                newNextButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    if (this.pagination[section].page < this.pagination[section].totalPages) {
                        this.pagination[section].page++;
                        this.updateArtifactsUI();
                    }
                });
            }
        });

        // Set flag to indicate listeners are set up
        this._artifactPaginationListenersSet = true;
    }

    setupEventListeners() {
        // Channel button
        document.getElementById('click-button').addEventListener('click', () => {
            this.channelEssence();
        });

        // Set up interval for realm updates
        setInterval(() => this.handleRealmUpdates(), 500); // Check for realm updates every 500ms

        // Set up interval for affordability updates
        setInterval(() => {
            const now = Date.now();
            const timeSinceLastUpdate = now - this._lastAffordabilityUpdate;
            if (timeSinceLastUpdate > this._affordabilityUpdateInterval) {
                this.updateAllAffordability();
                this._lastAffordabilityUpdate = now;
            }
        }, 500); // Check for affordability updates every 500ms

        // Ascension button
        document.getElementById('prestige-button').addEventListener('click', () => {
            this.ascend();
        });

        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');

                // Update tab indicator
                this.updateTabIndicator(tab);

                // Special handling for dungeon tab to ensure requirements are updated
                if (tab.dataset.tab === 'dungeons') {
                    // Force update of the dungeon UI to refresh requirements
                    this.updateDungeonUI();
                }
            });
        });

        // Track hover state for performance optimization
        // Add hover tracking to all interactive elements
        const interactiveElements = document.querySelectorAll('.skill-node, .realm, .resource, .upgrade-card, .tab');

        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                this._isHovering = true;
            });

            element.addEventListener('mouseleave', () => {
                this._isHovering = false;
            });
        });

        // Also track touch events for mobile
        document.addEventListener('touchstart', () => {
            this._isHovering = true;
        });

        document.addEventListener('touchend', () => {
            this._isHovering = false;
        });

        // Initialize tab indicator
        this.updateTabIndicator(document.querySelector('.tab.active'));

        // Panel toggling
        document.querySelectorAll('.panel-header').forEach(header => {
            header.addEventListener('click', () => {
                const panel = header.parentElement;
                panel.classList.toggle('collapsed');
            });
        });

        // Achievement filter tabs - completely separate from artifact filters
        if (!this._featsFilterListenersSet) {
            const featsFilterContainer = document.getElementById('feats-filter-tabs');
            if (featsFilterContainer) {
                // Remove any existing listeners by cloning and replacing
                const newFeatsContainer = featsFilterContainer.cloneNode(true);
                featsFilterContainer.parentNode.replaceChild(newFeatsContainer, featsFilterContainer);

                // Add a single event listener to the container (event delegation)
                newFeatsContainer.addEventListener('click', (e) => {
                    // Only process clicks on filter-tab elements
                    if (e.target.classList.contains('filter-tab')) {
                        // Stop event propagation completely
                        e.stopPropagation();
                        e.preventDefault();

                        // Get all tabs within this container only
                        const tabs = newFeatsContainer.querySelectorAll('.filter-tab');

                        // Remove active class from all tabs in this container
                        tabs.forEach(t => t.classList.remove('active'));

                        // Add active class to clicked tab
                        e.target.classList.add('active');

                        // Update the feats UI
                        this.updateFeatsUI();
                    }
                });

                this._featsFilterListenersSet = true;
            }
        }

        // Achievement search
        if (this.domCache.achievementSearch) {
            this.domCache.achievementSearch.addEventListener('input', () => {
                this.updateFeatsUI();
            });
        }

        // Help button
        document.getElementById('help-button').addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'block';
        });

        // Close modal
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Settings button
        document.getElementById('settings-button').addEventListener('click', () => {
            document.getElementById('settings-modal').style.display = 'block';
        });

        // Number format setting
        document.getElementById('number-format').addEventListener('change', (e) => {
            this.settings.numberFormat = e.target.value;
            this.updateUI();
        });

        // Save frequency setting
        document.getElementById('save-frequency').addEventListener('change', (e) => {
            this.settings.saveFrequency = parseInt(e.target.value);
        });

        // Game speed setting
        document.getElementById('game-speed').addEventListener('input', (e) => {
            this.settings.gameSpeed = parseFloat(e.target.value);
            document.getElementById('game-speed-value').textContent = `${this.settings.gameSpeed}x`;
        });

        // Performance settings
        document.getElementById('visual-effects').addEventListener('change', (e) => {
            this.settings.visualEffects = e.target.value;
            this.applyVisualEffectsSettings();
        });

        document.getElementById('particle-count').addEventListener('change', (e) => {
            this.settings.particleCount = parseInt(e.target.value);
            this.createParticles(); // Recreate particles with new count
        });

        document.getElementById('ui-update-rate').addEventListener('change', (e) => {
            this.settings.uiUpdateRate = parseInt(e.target.value);
            this._uiUpdateInterval = this.settings.uiUpdateRate;
        });

        // Export save
        document.getElementById('export-save').addEventListener('click', () => {
            // This will trigger the download and also return the encoded save string
            const saveString = this.exportSave();

            // Also copy to clipboard for convenience
            const textarea = document.getElementById('import-export');
            textarea.style.display = 'none'; // Don't show the textarea for export

            // Use the newer clipboard API if available
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(saveString)
                    .then(() => this.showNotification('Journey data downloaded and copied to clipboard!'))
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                        this.showNotification('Journey data downloaded successfully!');
                    });
            } else {
                this.showNotification('Journey data downloaded successfully!');
            }
        });

        // Import save
        document.getElementById('import-save').addEventListener('click', () => {
            const textarea = document.getElementById('import-export');
            textarea.style.display = 'block';
            textarea.value = '';
            textarea.placeholder = 'Paste your journey data here and click Confirm Import...';
            textarea.focus();

            // Create confirm button if it doesn't exist
            let confirmButton = document.querySelector('.confirm-import');
            if (!confirmButton) {
                // Create a container for the button to center it
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'confirm-import-container';
                buttonContainer.style.textAlign = 'center';
                buttonContainer.style.marginTop = '10px';

                // Create the button
                confirmButton = document.createElement('button');
                confirmButton.className = 'settings-button confirm-import';
                confirmButton.textContent = 'Confirm Import';

                // Add the button to the container
                buttonContainer.appendChild(confirmButton);

                // Find the Knowledge Transfer settings group
                const knowledgeTransferGroup = document.querySelector('.settings-group:nth-child(4)');
                if (knowledgeTransferGroup && knowledgeTransferGroup.querySelector('.settings-title').textContent === 'Knowledge Transfer') {
                    // Insert the button container after the textarea
                    const textarea = knowledgeTransferGroup.querySelector('#import-export');
                    if (textarea && textarea.nextSibling) {
                        knowledgeTransferGroup.insertBefore(buttonContainer, textarea.nextSibling);
                    } else {
                        knowledgeTransferGroup.appendChild(buttonContainer);
                    }
                } else {
                    // Fallback: find the group by title
                    const allGroups = document.querySelectorAll('.settings-group');
                    for (const group of allGroups) {
                        if (group.querySelector('.settings-title').textContent === 'Knowledge Transfer') {
                            const textarea = group.querySelector('#import-export');
                            if (textarea && textarea.nextSibling) {
                                group.insertBefore(buttonContainer, textarea.nextSibling);
                            } else {
                                group.appendChild(buttonContainer);
                            }
                            break;
                        }
                    }
                }

                confirmButton.addEventListener('click', () => {
                    if (textarea.value.trim()) {
                        this.importSave(textarea.value.trim());
                        textarea.style.display = 'none';
                        buttonContainer.style.display = 'none';
                    } else {
                        this.showNotification('Please paste your save data first!');
                    }
                });
            } else {
                // Find the container and show it
                const buttonContainer = document.querySelector('.confirm-import-container');
                if (buttonContainer) {
                    buttonContainer.style.display = 'block';
                } else {
                    confirmButton.style.display = 'block';
                }
            }
        });

        // Reset game
        document.getElementById('reset-game').addEventListener('click', () => {
            this.resetGame();
        });

        // Collapsible help sections
        document.querySelectorAll('.help-title').forEach(title => {
            title.addEventListener('click', () => {
                title.classList.toggle('active');
                const content = title.nextElementSibling;
                content.classList.toggle('active');
            });
        });

        // Collapsible help subsections
        document.querySelectorAll('.help-subtitle').forEach(subtitle => {
            subtitle.addEventListener('click', () => {
                subtitle.classList.toggle('active');
                const subcontent = subtitle.nextElementSibling;
                subcontent.classList.toggle('active');
            });
        });

        // Save before closing
        window.addEventListener('beforeunload', () => {
            this.saveGame();
        });

        // Hide modals when clicking outside content
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    updateTabIndicator(activeTab) {
        const indicator = this.domCache.tabIndicator;
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.left = `${activeTab.offsetLeft}px`;
    }

    // Dungeon Crawler Methods

    // Initialize dungeon crawler UI and event listeners
    initDungeonUI() {
        // Add event listener for the start dungeon button
        if (this.domCache.startDungeonButton) {
            this.domCache.startDungeonButton.addEventListener('click', () => {
                this.startDungeon();
            });
        }

        // Add event listeners for skill upgrade buttons
        document.getElementById('upgrade-strength').addEventListener('click', () => {
            this.upgradeDungeonSkill('strength');
        });

        document.getElementById('upgrade-vitality').addEventListener('click', () => {
            this.upgradeDungeonSkill('vitality');
        });

        document.getElementById('upgrade-defense').addEventListener('click', () => {
            this.upgradeDungeonSkill('defense');
        });

        document.getElementById('upgrade-luck').addEventListener('click', () => {
            this.upgradeDungeonSkill('luck');
        });
    }

    // Show the dungeon skills UI
    showDungeonSkillsUI() {
        // Show the skills container
        const skillsContainer = document.getElementById('dungeon-skills-container');
        if (skillsContainer) {
            skillsContainer.style.display = 'block';
        }

        // Update the skills UI
        this.updateDungeonSkillsUI();
    }

    // Update the dungeon skills UI
    updateDungeonSkillsUI() {
        // Update available points
        document.getElementById('dungeon-skill-points-available').textContent = this.dungeon.player.skillPoints;

        // Update skill levels
        document.getElementById('strength-skill-level').textContent = this.dungeon.player.skills.strength;
        document.getElementById('vitality-skill-level').textContent = this.dungeon.player.skills.vitality;
        document.getElementById('defense-skill-level').textContent = this.dungeon.player.skills.defense;
        document.getElementById('luck-skill-level').textContent = this.dungeon.player.skills.luck;

        // Update current stats
        document.getElementById('dungeon-stat-health').textContent = this.dungeon.player.maxHealth;
        document.getElementById('dungeon-stat-attack').textContent = this.dungeon.player.attack;
        document.getElementById('dungeon-stat-defense').textContent = this.dungeon.player.defense;

        // Calculate critical hit chance (1% per luck level)
        const critChance = this.dungeon.player.skills.luck * 1;
        document.getElementById('dungeon-stat-crit').textContent = critChance;

        // Enable/disable upgrade buttons based on available points
        const hasPoints = this.dungeon.player.skillPoints > 0;
        document.getElementById('upgrade-strength').disabled = !hasPoints;
        document.getElementById('upgrade-vitality').disabled = !hasPoints;
        document.getElementById('upgrade-defense').disabled = !hasPoints;
        document.getElementById('upgrade-luck').disabled = !hasPoints;
    }

    // Upgrade a dungeon skill
    upgradeDungeonSkill(skillName) {
        // Check if player has skill points
        if (this.dungeon.player.skillPoints <= 0) return;

        // Upgrade the skill
        this.dungeon.player.skills[skillName]++;
        this.dungeon.player.skillPoints--;

        // Recalculate player stats
        this.calculatePlayerStats();

        // Update the UI
        this.updateDungeonSkillsUI();

        // Show notification
        this.showNotification(`Upgraded ${skillName} to level ${this.dungeon.player.skills[skillName]}!`);
    }

    // Generate a new random dungeon
    generateDungeon() {
        // Clear existing dungeon
        this.dungeon.map = [];

        // Dungeon size parameters
        const width = 5;
        const height = 5;
        const totalRooms = Math.floor(width * height * 0.7); // 70% of grid filled with rooms

        // Create entrance room at the center bottom
        const entranceX = Math.floor(width / 2);
        const entranceY = height - 1;

        const entranceRoom = {
            id: 'entrance',
            type: 'entrance',
            x: entranceX,
            y: entranceY,
            connections: [],
            visited: true,
            cleared: false
        };

        this.dungeon.map.push(entranceRoom);

        // Create boss room at the center top
        const bossX = Math.floor(width / 2);
        const bossY = 0;

        const bossRoom = {
            id: 'boss',
            type: 'boss',
            x: bossX,
            y: bossY,
            connections: [],
            visited: false,
            cleared: false
        };

        this.dungeon.map.push(bossRoom);

        // Generate other rooms
        let roomCount = 2; // Already have entrance and boss

        // Room type distribution
        const roomTypes = {
            enemy: 0.4,     // 40% enemy rooms
            treasure: 0.2,  // 20% treasure rooms
            event: 0.1,     // 10% event rooms
            empty: 0.1,     // 10% empty rooms
            luck: 0.05,     // 5% luck rooms
            trap: 0.05,     // 5% trap rooms
            heal: 0.05,     // 5% healing rooms
            artifact: 0.05  // 5% artifact rooms
        };

        // Create a grid to track room positions
        const grid = Array(width).fill().map(() => Array(height).fill(null));
        grid[entranceX][entranceY] = entranceRoom;
        grid[bossX][bossY] = bossRoom;

        // Start from the entrance and expand outward
        const queue = [entranceRoom];

        while (queue.length > 0 && roomCount < totalRooms) {
            const currentRoom = queue.shift();

            // Try to add rooms in each direction
            const directions = [
                { dx: 0, dy: -1 }, // Up
                { dx: 1, dy: 0 },  // Right
                { dx: 0, dy: 1 },  // Down
                { dx: -1, dy: 0 }  // Left
            ];

            // Shuffle directions for randomness
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }

            for (const dir of directions) {
                if (roomCount >= totalRooms) break;

                const newX = currentRoom.x + dir.dx;
                const newY = currentRoom.y + dir.dy;

                // Check if position is valid and empty
                if (newX >= 0 && newX < width && newY >= 0 && newY < height && grid[newX][newY] === null) {
                    // Determine room type
                    let roomType = 'empty';
                    const rand = Math.random();
                    let cumulative = 0;

                    for (const [type, probability] of Object.entries(roomTypes)) {
                        cumulative += probability;
                        if (rand < cumulative) {
                            roomType = type;
                            break;
                        }
                    }

                    // Create new room
                    const newRoom = {
                        id: `room-${roomCount}`,
                        type: roomType,
                        x: newX,
                        y: newY,
                        connections: [],
                        visited: false,
                        cleared: false
                    };

                    // Connect rooms
                    newRoom.connections.push(currentRoom.id);
                    currentRoom.connections.push(newRoom.id);

                    // Add to dungeon map and grid
                    this.dungeon.map.push(newRoom);
                    grid[newX][newY] = newRoom;

                    // Add to queue for further expansion
                    queue.push(newRoom);

                    roomCount++;
                }
            }
        }

        // Ensure there's a path from entrance to boss
        this.ensurePathToBoss();

        return this.dungeon.map;
    }

    // Ensure there's a path from entrance to boss
    ensurePathToBoss() {
        const entranceRoom = this.dungeon.map.find(r => r.id === 'entrance');
        const bossRoom = this.dungeon.map.find(r => r.id === 'boss');

        if (!entranceRoom || !bossRoom) return;

        // Check if there's already a path
        const visited = new Set();
        const queue = [entranceRoom.id];

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (currentId === bossRoom.id) return; // Path exists

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const currentRoom = this.dungeon.map.find(r => r.id === currentId);
            if (currentRoom && currentRoom.connections) {
                for (const connectedId of currentRoom.connections) {
                    queue.push(connectedId);
                }
            }
        }

        // If no path exists, create one
        let currentRoom = entranceRoom;
        const path = [];

        // Create a path from entrance toward boss
        while (currentRoom.y > bossRoom.y) {
            // Find or create a room above
            let nextRoom = this.dungeon.map.find(r => r.x === currentRoom.x && r.y === currentRoom.y - 1);

            if (!nextRoom) {
                // Create a new room
                nextRoom = {
                    id: `room-${this.dungeon.map.length}`,
                    type: Math.random() < 0.7 ? 'enemy' : 'empty',
                    x: currentRoom.x,
                    y: currentRoom.y - 1,
                    connections: [currentRoom.id],
                    visited: false,
                    cleared: false
                };

                this.dungeon.map.push(nextRoom);
                currentRoom.connections.push(nextRoom.id);
            } else if (!currentRoom.connections.includes(nextRoom.id)) {
                // Connect existing rooms
                currentRoom.connections.push(nextRoom.id);
                nextRoom.connections.push(currentRoom.id);
            }

            path.push(nextRoom);
            currentRoom = nextRoom;
        }

        // Connect horizontally to boss if needed
        while (currentRoom.x !== bossRoom.x) {
            const dx = currentRoom.x < bossRoom.x ? 1 : -1;

            // Find or create a room to the side
            let nextRoom = this.dungeon.map.find(r => r.x === currentRoom.x + dx && r.y === currentRoom.y);

            if (!nextRoom) {
                // Create a new room
                nextRoom = {
                    id: `room-${this.dungeon.map.length}`,
                    type: Math.random() < 0.7 ? 'enemy' : 'empty',
                    x: currentRoom.x + dx,
                    y: currentRoom.y,
                    connections: [currentRoom.id],
                    visited: false,
                    cleared: false
                };

                this.dungeon.map.push(nextRoom);
                currentRoom.connections.push(nextRoom.id);
            } else if (!currentRoom.connections.includes(nextRoom.id)) {
                // Connect existing rooms
                currentRoom.connections.push(nextRoom.id);
                nextRoom.connections.push(currentRoom.id);
            }

            path.push(nextRoom);
            currentRoom = nextRoom;
        }

        // Finally, connect to boss
        if (!currentRoom.connections.includes(bossRoom.id)) {
            currentRoom.connections.push(bossRoom.id);
            bossRoom.connections.push(currentRoom.id);
        }
    }

    // Start a new dungeon run
    startDungeon() {
        // Prevent starting a new dungeon if one is already active
        if (this.dungeon.active) {
            // console.log('Cannot start a new dungeon - one is already active');
            return;
        }

        // Check if player meets the requirements to enter the dungeon
        // Player must have at least 1 ascension OR 5000 total essence earned

        // Always get the latest total essence value
        const currentTotalEssence = this.resources.totalEssence;
        const essenceRequirementMet = currentTotalEssence.greaterThanOrEqual(new BigNumber(5000));
        const ascensionRequirementMet = this.statistics.ascensionCount > 0;

        if (!ascensionRequirementMet && !essenceRequirementMet) {
            // Show a friendly message explaining the requirements
            this.showNotification('The dungeon entrance is shrouded in a mysterious barrier.', 'warning');

            // Create a modal to explain the requirements
            const modalContent = document.createElement('div');
            modalContent.className = 'dungeon-requirements-modal';

            modalContent.innerHTML = `
                <h3>Dungeon Requirements</h3>
                <p>The ethereal dungeon is currently locked. To enter, you need:</p>
                <ul>
                    <li>At least 1 Ascension <span class="requirement-status">OR</span></li>
                    <li>At least 5,000 total essence earned</li>
                </ul>
                <p>Current progress:</p>
                <div class="requirement-progress">
                    <div>Ascensions: <span class="${ascensionRequirementMet ? 'met' : 'unmet'}">${this.statistics.ascensionCount}</span></div>
                    <div>Total Essence: <span class="${essenceRequirementMet ? 'met' : 'unmet'}">${this.formatNumber(currentTotalEssence)}</span></div>
                </div>
                <p>Continue your journey to unlock the dungeon's mysteries!</p>
            `;

            // Add the modal to the dungeon placeholder
            const placeholder = this.domCache.dungeonPlaceholder;

            // Remove any existing requirements modal
            const existingModal = placeholder.querySelector('.dungeon-requirements-modal');
            if (existingModal) {
                placeholder.removeChild(existingModal);
            }

            // Insert the modal before the start button
            const startButton = this.domCache.startDungeonButton;
            placeholder.insertBefore(modalContent, startButton);

            // Hide the start button
            startButton.style.display = 'none';

            return;
        }

        // Calculate player stats based on game progress
        this.calculatePlayerStats();

        // Generate a new dungeon
        this.generateDungeon();

        // Set initial dungeon state
        this.dungeon.active = true;
        this.dungeon.currentRoom = 'entrance';
        this.dungeon.combatActive = false;
        this.dungeon.currentEnemy = null;
        this.dungeon.combatLog = [];
        this.dungeon.player.effects = []; // Reset player effects when starting a new dungeon
        this.dungeon.rewards = {
            essence: new BigNumber(0),
            artifacts: [],
            skillPoints: 0
        };

        // Add welcome message
        this.addCombatMessage('You enter the ethereal dungeon...', 'system');
        this.addCombatMessage('Navigate through the rooms to find the boss and claim your rewards!', 'system');

        // Save dungeon state immediately
        this.saveDungeonState();

        // Update UI
        this.uiUpdateFlags.dungeon = true;
        this.updateDungeonUI();
    }

    // End the current dungeon run
    endDungeon(success = false) {
        if (!this.dungeon.active) return;

        // Distribute rewards if successful
        if (success) {
            // Make sure rewards are valid BigNumber objects
            if (!(this.dungeon.rewards.essence instanceof BigNumber)) {
                console.warn('Invalid essence reward, resetting to 0');
                this.dungeon.rewards.essence = new BigNumber(0);
            }

            // Add essence rewards
            this.resources.essence = this.resources.essence.add(this.dungeon.rewards.essence);
            this.resources.totalEssence = this.resources.totalEssence.add(this.dungeon.rewards.essence);

            // Add skill points to player
            this.dungeon.player.skillPoints += this.dungeon.rewards.skillPoints;

            // Show reward summary
            let rewardMessage = `Dungeon completed! Gained ${this.formatNumber(this.dungeon.rewards.essence)} essence.`;
            if (this.dungeon.rewards.skillPoints > 0) {
                rewardMessage += ` Also gained ${this.dungeon.rewards.skillPoints} dungeon skill points!`;
            }
            this.showNotification(rewardMessage);

            // Show skill points UI if points were earned
            if (this.dungeon.rewards.skillPoints > 0) {
                this.showDungeonSkillsUI();
            }

            // Update statistics
            this.dungeon.statistics.totalDungeons++;
        } else {
            this.showNotification('You have retreated from the dungeon.');
        }

        // Clear all player effects when leaving the dungeon
        if (this.dungeon.player.effects && this.dungeon.player.effects.length > 0) {
            // Apply expiration effects for all active effects
            for (const effect of this.dungeon.player.effects) {
                if (effect.onExpire) {
                    effect.onExpire();
                }
            }
            // Clear the effects array
            this.dungeon.player.effects = [];
        }

        // Reset dungeon state
        this.dungeon.active = false;
        this.dungeon.currentRoom = null;
        this.dungeon.map = [];
        this.dungeon.combatActive = false;
        this.dungeon.currentEnemy = null;

        // Clear saved dungeon state
        localStorage.removeItem('etherealDungeonState');
        // console.log('Dungeon state cleared from localStorage');

        // Update UI flags
        this.uiUpdateFlags.resources = true;
        this.uiUpdateFlags.dungeon = true;
        this.uiUpdateFlags.powers = true;

        // Update UI
        this.updateUI();

        // Save the game to ensure dungeon skills and statistics are preserved
        this.saveGame();
    }

    // Update the dungeon UI
    updateDungeonUI() {
        // Get the dungeon tab
        const dungeonTab = document.getElementById('dungeons-tab');

        // If we have an active dungeon but the dungeon tab is not active, activate it
        if (this.dungeon.active && dungeonTab && !dungeonTab.classList.contains('active')) {
            // Activate the dungeon tab
            const dungeonTabButton = document.querySelector('.tab[data-tab="dungeons"]');
            if (dungeonTabButton) {
                dungeonTabButton.click();
            }
        }

        // Update UI based on dungeon state
        if (this.dungeon.active) {
            // Hide placeholder, show dungeon interface
            this.domCache.dungeonPlaceholder.style.display = 'none';
            document.getElementById('dungeon-interface').style.display = 'flex';

            // Hide or disable the start dungeon button when a dungeon is active
            if (this.domCache.startDungeonButton) {
                this.domCache.startDungeonButton.style.display = 'none';
            }

            // Render the dungeon map
            this.renderDungeonMap();

            // Update room details
            this.updateRoomDetails(this.dungeon.currentRoom);

            // Update player stats
            this.updateDungeonPlayerStats();

            // Update action buttons
            this.updateDungeonActions();

            // Update navigation buttons
            this.updateDungeonNavigation();

            // Update active effects
            this.updateDungeonEffects();

            // Update message window
            this.updateMessageWindow();

            // Update combat UI if in combat
            if (this.dungeon.combatActive) {
                this.domCache.dungeonCombatContainer.style.display = 'flex';
                this.updateDungeonCombatUI();
            } else {
                this.domCache.dungeonCombatContainer.style.display = 'none';
            }
        } else {
            // Show placeholder, hide dungeon interface
            this.domCache.dungeonPlaceholder.style.display = 'flex';
            document.getElementById('dungeon-interface').style.display = 'none';
            this.domCache.dungeonCombatContainer.style.display = 'none';

            // Always get the latest total essence value
            const currentTotalEssence = this.resources.totalEssence;
            const essenceRequirementMet = currentTotalEssence.greaterThanOrEqual(new BigNumber(5000));
            const ascensionRequirementMet = this.statistics.ascensionCount > 0;

            // Check if player meets the requirements to enter the dungeon
            // Player must have at least 1 ascension OR 5000 total essence earned
            if (!ascensionRequirementMet && !essenceRequirementMet) {
                // Create a modal to explain the requirements
                const modalContent = document.createElement('div');
                modalContent.className = 'dungeon-requirements-modal';

                modalContent.innerHTML = `
                    <h3>Dungeon Requirements</h3>
                    <p>The ethereal dungeon is currently locked. To enter, you need:</p>
                    <ul>
                        <li>At least 1 Ascension <span class="requirement-status">OR</span></li>
                        <li>At least 5,000 total essence earned</li>
                    </ul>
                    <p>Current progress:</p>
                    <div class="requirement-progress">
                        <div>Ascensions: <span class="${ascensionRequirementMet ? 'met' : 'unmet'}">${this.statistics.ascensionCount}</span></div>
                        <div>Total Essence: <span class="${essenceRequirementMet ? 'met' : 'unmet'}">${this.formatNumber(currentTotalEssence)}</span></div>
                    </div>
                    <p>Continue your journey to unlock the dungeon's mysteries!</p>
                `;

                // Add the modal to the dungeon placeholder
                const placeholder = this.domCache.dungeonPlaceholder;

                // Remove any existing requirements modal
                const existingModal = placeholder.querySelector('.dungeon-requirements-modal');
                if (existingModal) {
                    placeholder.removeChild(existingModal);
                }

                // Insert the modal before the start button
                const startButton = this.domCache.startDungeonButton;
                placeholder.insertBefore(modalContent, startButton);

                // Hide the start button
                startButton.style.display = 'none';

                // If the player just crossed the threshold, show a notification
                if (this._lastEssenceCheck && this._lastEssenceCheck.lessThan(new BigNumber(5000)) && essenceRequirementMet) {
                    this.showNotification('The barrier to the Ethereal Dungeon has weakened! You can now enter.', 'success');
                }
            } else {
                // Show the start dungeon button when no dungeon is active and requirements are met
                if (this.domCache.startDungeonButton) {
                    this.domCache.startDungeonButton.style.display = 'block';
                }

                // Remove any existing requirements modal
                const placeholder = this.domCache.dungeonPlaceholder;
                const existingModal = placeholder.querySelector('.dungeon-requirements-modal');
                if (existingModal) {
                    placeholder.removeChild(existingModal);
                }

                // If the player just crossed the threshold, show a notification
                if (this._lastEssenceCheck && this._lastEssenceCheck.lessThan(new BigNumber(5000)) && essenceRequirementMet && !ascensionRequirementMet) {
                    this.showNotification('The barrier to the Ethereal Dungeon has weakened! You can now enter.', 'success');
                }
            }

            // Store the current essence value for next check
            this._lastEssenceCheck = new BigNumber(currentTotalEssence);
        }
    }

    // Render the dungeon map
    renderDungeonMap() {
        // Clear the map container
        const mapContainer = this.domCache.dungeonMapContainer;

        // Check if the map div exists, if not create it
        let mapDiv = mapContainer.querySelector('.dungeon-map');
        if (!mapDiv) {
            mapDiv = document.createElement('div');
            mapDiv.className = 'dungeon-map';
            mapContainer.appendChild(mapDiv);
        }

        // Clear existing map
        mapDiv.innerHTML = '';

        // Get current room to determine which rooms are adjacent
        const currentRoom = this.dungeon.map.find(r => r.id === this.dungeon.currentRoom);
        const adjacentRoomIds = currentRoom ? currentRoom.connections : [];

        // Render each room
        for (const room of this.dungeon.map) {
            const roomDiv = document.createElement('div');

            // Determine if room should be visible
            const isCurrentRoom = room.id === this.dungeon.currentRoom;
            const isVisited = room.visited;
            const isAdjacent = adjacentRoomIds.includes(room.id);
            const isVisible = isCurrentRoom || isVisited || isAdjacent;

            // Set appropriate classes
            if (isVisible) {
                roomDiv.className = `dungeon-room ${room.type}`;
            } else {
                roomDiv.className = `dungeon-room fog`;
            }

            roomDiv.dataset.id = room.id;

            // Add additional classes based on room state
            if (isCurrentRoom) {
                roomDiv.classList.add('current');
            }
            if (isVisited) {
                roomDiv.classList.add('visited');
            } else {
                roomDiv.classList.add('unvisited');
            }
            if (isAdjacent && !isVisited) {
                roomDiv.classList.add('adjacent');
            }

            // Set room icon based on visibility and type
            let icon = '?';

            if (isVisible) {
                switch (room.type) {
                    case 'entrance':
                        icon = '🚪'; // Door
                        break;
                    case 'boss':
                        icon = '👑'; // Crown
                        break;
                    case 'treasure':
                        icon = '💰'; // Money bag
                        break;
                    case 'enemy':
                        icon = '👹'; // Ogre
                        break;
                    case 'event':
                        icon = '❓'; // Question mark
                        break;
                    case 'empty':
                        icon = '⬥'; // Square
                        break;
                    case 'luck':
                        icon = '🍀'; // Four leaf clover
                        break;
                    case 'trap':
                        icon = '💥'; // Collision
                        break;
                    case 'heal':
                        icon = '❤️'; // Heart
                        break;
                    case 'artifact':
                        icon = '🔮'; // Crystal ball
                        break;
                }
            } else {
                // Use fog icon for unexplored, non-adjacent rooms
                icon = '🌫️'; // Fog emoji for unexplored rooms
            }

            roomDiv.innerHTML = `<div class="room-icon">${icon}</div>`;

            // Position the room
            roomDiv.style.gridColumn = room.x + 1;
            roomDiv.style.gridRow = room.y + 1;

            // Add click event listener for room navigation
            roomDiv.addEventListener('click', () => {
                // Only allow movement to adjacent rooms that are connected
                if (this.canMoveToRoom(room.id)) {
                    this.moveToRoom(room.id);
                }
            });

            mapDiv.appendChild(roomDiv);
        }

        // Draw connections between rooms
        this.drawDungeonConnections(mapDiv);

        // Update room details if a room is selected
        if (this.dungeon.currentRoom) {
            this.updateRoomDetails(this.dungeon.currentRoom);
        }
    }

    // Draw connections between dungeon rooms
    drawDungeonConnections(mapDiv) {
        // Get current room to determine which rooms are adjacent
        const currentRoom = this.dungeon.map.find(r => r.id === this.dungeon.currentRoom);
        const adjacentRoomIds = currentRoom ? currentRoom.connections : [];

        // Create connections between rooms
        for (const room of this.dungeon.map) {
            if (room.connections && room.connections.length > 0) {
                for (const connectedRoomId of room.connections) {
                    const connectedRoom = this.dungeon.map.find(r => r.id === connectedRoomId);
                    if (connectedRoom) {
                        // Only draw connections for:
                        // 1. Visited rooms
                        // 2. Current room to adjacent rooms
                        // 3. Between visited rooms
                        const isCurrentToAdjacent = (room.id === this.dungeon.currentRoom && adjacentRoomIds.includes(connectedRoomId)) ||
                                                  (connectedRoom.id === this.dungeon.currentRoom && adjacentRoomIds.includes(room.id));
                        const isBothVisited = room.visited && connectedRoom.visited;

                        if (isCurrentToAdjacent || isBothVisited) {
                            // Create a connection element
                            const connection = document.createElement('div');
                            connection.className = 'room-connection';

                            // Determine if connection is horizontal or vertical
                            if (room.y === connectedRoom.y) {
                                // Horizontal connection
                                connection.classList.add('horizontal');

                                // Position the connection
                                const startX = Math.min(room.x, connectedRoom.x);
                                const endX = Math.max(room.x, connectedRoom.x);

                                connection.style.gridColumn = `${startX + 1} / ${endX + 1}`;
                                connection.style.gridRow = room.y + 1;
                                connection.style.justifySelf = 'center';
                            } else {
                                // Vertical connection
                                connection.classList.add('vertical');

                                // Position the connection
                                const startY = Math.min(room.y, connectedRoom.y);
                                const endY = Math.max(room.y, connectedRoom.y);

                                connection.style.gridColumn = room.x + 1;
                                connection.style.gridRow = `${startY + 1} / ${endY + 1}`;
                                connection.style.alignSelf = 'center';
                            }

                            mapDiv.appendChild(connection);
                        }
                    }
                }
            }
        }
    }

    // Update room details panel
    updateRoomDetails(roomId) {
        const room = this.dungeon.map.find(r => r.id === roomId);
        if (!room) return;

        const roomDetailsElement = document.getElementById('dungeon-room-details');
        if (!roomDetailsElement) return;

        // Room title
        let roomTitle = 'Unknown Room';
        let roomDescription = '';

        switch (room.type) {
            case 'entrance':
                roomTitle = 'Dungeon Entrance';
                roomDescription = 'The entrance to the dungeon. You can leave from here.';
                break;
            case 'boss':
                roomTitle = 'Boss Chamber';
                roomDescription = 'A powerful entity resides here. Defeat it to claim rewards.';
                break;
            case 'treasure':
                roomTitle = 'Treasure Room';
                roomDescription = 'A room filled with valuable treasures.';
                break;
            case 'enemy':
                roomTitle = 'Monster Den';
                roomDescription = 'Hostile creatures lurk here, ready to attack.';
                break;
            case 'event':
                roomTitle = 'Mysterious Room';
                roomDescription = 'Something unusual awaits in this room.';
                break;
            case 'empty':
                roomTitle = 'Empty Chamber';
                roomDescription = 'An empty chamber with nothing of interest.';
                break;
            case 'luck':
                roomTitle = 'Fortune Chamber';
                roomDescription = 'A room filled with mystical fortune energy.';
                break;
            case 'trap':
                roomTitle = 'Trapped Room';
                roomDescription = 'A dangerous room filled with hidden traps.';
                break;
            case 'heal':
                roomTitle = 'Healing Sanctuary';
                roomDescription = 'A tranquil sanctuary with healing energies.';
                break;
            case 'artifact':
                roomTitle = 'Artifact Chamber';
                roomDescription = 'A sacred chamber housing a powerful artifact.';
                break;
        }

        // Status indicator
        let statusIndicator = '';
        if (room.cleared) {
            statusIndicator = '<span class="room-status cleared">Cleared</span>';
        } else if (room.type === 'enemy' || room.type === 'boss') {
            statusIndicator = '<span class="room-status danger">Combat</span>';
        } else if (room.type === 'trap') {
            statusIndicator = '<span class="room-status warning">Danger</span>';
        } else if (room.type === 'treasure' || room.type === 'artifact') {
            statusIndicator = '<span class="room-status treasure">Loot</span>';
        } else if (room.type === 'heal') {
            statusIndicator = '<span class="room-status heal">Healing</span>';
        }

        // Create compact display
        let content = `<span class="room-title">${roomTitle}</span> ${statusIndicator} — <span class="room-description">${roomDescription}</span>`;

        // If room has specific details, add them
        if (room.description) {
            content += ` <span class="room-specific">${room.description}</span>`;
        }

        roomDetailsElement.innerHTML = content;
    }

    // Process player effects (decrement durations, apply onTurn effects, remove expired effects)
    processPlayerEffects() {
        if (!this.dungeon.active || !this.dungeon.player.effects || this.dungeon.player.effects.length === 0) return;

        // Create a new array to hold effects that haven't expired
        const remainingEffects = [];

        // Process each effect
        for (const effect of this.dungeon.player.effects) {
            // Decrement duration
            effect.duration--;

            // Check if effect has expired
            if (effect.duration <= 0) {
                // Apply expiration effect if it exists
                if (effect.onExpire) {
                    effect.onExpire();
                }
                // Don't add to remaining effects (let it expire)
            } else {
                // Apply turn effect if it exists
                if (effect.onTurn) {
                    effect.onTurn();
                }
                // Keep the effect
                remainingEffects.push(effect);
            }
        }

        // Update player effects with remaining effects
        this.dungeon.player.effects = remainingEffects;

        // Update UI to reflect changes
        this.updateDungeonEffects();
    }

    // Move to a different room
    moveToRoom(roomId) {
        // Handle player movement between rooms
        const targetRoom = this.dungeon.map.find(r => r.id === roomId);
        if (!targetRoom) return;

        // Check if the move is valid
        if (!this.canMoveToRoom(roomId)) return;

        // Process effects when changing rooms (counts as a turn)
        this.processPlayerEffects();

        // Update current room
        this.dungeon.currentRoom = roomId;

        // Mark room as visited
        targetRoom.visited = true;

        // Enter the room
        this.enterRoom(targetRoom);

        // Update UI
        this.uiUpdateFlags.dungeon = true;
        this.updateDungeonUI();

        // Save dungeon state after moving to a new room
        this.saveDungeonState();
    }

    // Check if player can move to a room
    canMoveToRoom(roomId) {
        if (!this.dungeon.currentRoom) return false;
        if (this.dungeon.combatActive) return false;

        const currentRoom = this.dungeon.map.find(r => r.id === this.dungeon.currentRoom);
        if (!currentRoom || !currentRoom.connections) return false;

        // Check if the target room is connected to the current room
        return currentRoom.connections.includes(roomId);
    }

    // Get a friendly name for a room type
    getRoomName(roomType) {
        switch (roomType) {
            case 'entrance': return 'Dungeon Entrance';
            case 'boss': return 'Boss Chamber';
            case 'treasure': return 'Treasure Room';
            case 'enemy': return 'Monster Den';
            case 'event': return 'Mysterious Room';
            case 'empty': return 'Empty Chamber';
            case 'luck': return 'Fortune Chamber';
            case 'trap': return 'Trapped Room';
            case 'heal': return 'Healing Sanctuary';
            case 'artifact': return 'Artifact Chamber';
            default: return 'Unknown Room';
        }
    }

    // Add an immersive entry message when entering a room
    addRoomEntryMessage(roomType) {
        switch (roomType) {
            case 'entrance':
                this.addCombatMessage('You stand at the entrance to the dungeon. The air is cool and still.', 'system');
                break;
            case 'boss':
                this.addCombatMessage('You enter a massive chamber. The air feels heavy with power and danger.', 'system');
                break;
            case 'treasure':
                this.addCombatMessage('You enter a room filled with glittering treasures and ancient artifacts.', 'system');
                break;
            case 'enemy':
                this.addCombatMessage('As you enter the room, you sense hostile presences lurking in the shadows.', 'system');
                break;
            case 'event':
                this.addCombatMessage('You enter a room where reality seems to shift and waver around you.', 'system');
                break;
            case 'empty':
                this.addCombatMessage('You enter a seemingly empty chamber. Your footsteps echo in the silence.', 'system');
                break;
            case 'luck':
                this.addCombatMessage('You enter a room bathed in golden light. Fortune seems to favor this place.', 'system');
                break;
            case 'trap':
                this.addCombatMessage('You enter a room that feels... wrong. Your instincts warn of hidden dangers.', 'system');
                break;
            case 'heal':
                this.addCombatMessage('You enter a tranquil chamber filled with soothing blue light. You feel at peace here.', 'system');
                break;
            case 'artifact':
                this.addCombatMessage('You enter a sacred chamber. In the center floats a powerful artifact, pulsing with energy.', 'system');
                break;
            default:
                this.addCombatMessage('You enter a mysterious room in the dungeon.', 'system');
                break;
        }
    }

    // Handle room entry based on room type
    enterRoom(room) {
        // Skip if room is already cleared
        if (room.cleared) {
            // Add a message about re-entering a cleared room
            this.addCombatMessage(`You return to the ${this.getRoomName(room.type)}. It has already been explored.`, 'system');
            return;
        }

        // Add an entry message based on room type
        this.addRoomEntryMessage(room.type);

        // Handle room based on type
        switch (room.type) {
            case 'entrance':
                // Nothing special happens at entrance
                this.addCombatMessage('The entrance provides a safe haven in this dangerous dungeon.', 'system');
                room.cleared = true;
                break;

            case 'enemy':
                // Generate an enemy and start combat
                const enemy = this.generateEnemy();
                this.startCombat(enemy);
                break;

            case 'boss':
                // Generate a boss enemy and start combat
                const boss = this.generateEnemy(true);
                this.addCombatMessage('The air crackles with powerful energy as a formidable presence makes itself known...', 'system');
                this.startCombat(boss);
                break;

            case 'treasure':
                // Process treasure room
                this.addCombatMessage('Glittering treasures catch your eye. What riches await?', 'system');
                this.processTreasureRoom();
                room.cleared = true;
                break;

            case 'event':
                // Process random event
                this.addCombatMessage('Something unusual is happening in this room...', 'system');
                this.processEventRoom();
                room.cleared = true;
                break;

            case 'empty':
                // Small chance to find something in empty rooms
                this.addCombatMessage('The room appears empty, but perhaps there\'s something worth investigating.', 'system');
                const findSomething = Math.random() < 0.2;
                if (findSomething) {
                    const essenceFound = Math.floor(this.resources.essence.valueOf() * 0.01);
                    this.resources.essence = this.resources.essence.add(essenceFound);
                    this.addCombatMessage(`You search carefully and find ${this.formatNumber(essenceFound)} essence hidden in a crack in the wall!`, 'system');
                } else {
                    this.addCombatMessage('After a thorough search, you find nothing of interest.', 'system');
                }
                room.cleared = true;
                break;

            case 'luck':
                // Luck room - increases player's luck for a few turns
                this.addCombatMessage('The air shimmers with golden particles. You feel fortune smiling upon you.', 'system');
                this.processLuckRoom();
                room.cleared = true;
                break;

            case 'trap':
                // Trap room - player takes damage or gets debuffed
                this.addCombatMessage('Something feels off about this room. You sense danger...', 'system');
                this.processTrapRoom();
                room.cleared = true;
                break;

            case 'heal':
                // Healing room - restores player's health
                this.addCombatMessage('A soothing blue light fills the room. You feel its restorative energy.', 'system');
                this.processHealRoom();
                room.cleared = true;
                break;

            case 'artifact':
                // Artifact room - gives a special item or permanent buff
                this.addCombatMessage('A powerful artifact floats in the center of the room, pulsing with ancient energy.', 'system');
                this.processArtifactRoom();
                room.cleared = true;
                break;
        }

        // Update dungeon statistics
        this.dungeon.statistics.totalRooms++;

        // Update UI
        this.uiUpdateFlags.dungeon = true;
        this.updateDungeonUI();
    }

    // Start combat with an enemy
    startCombat(enemy) {
        // Set current enemy
        this.dungeon.currentEnemy = enemy;

        // Set combat state
        this.dungeon.combatActive = true;
        this.dungeon.turn = 'player';

        // Clear combat log
        this.dungeon.combatLog = [];

        // Add initial combat message
        this.addCombatMessage(`Combat started with ${enemy.name}!`, 'system');
        this.addCombatMessage(`${enemy.name} has ${enemy.health} health and ${enemy.attack} attack power.`, 'system');
        this.addCombatMessage(`Your turn to act. Choose your action wisely!`, 'system');

        // Initialize player health display
        if (this.domCache.playerHealthFill && this.domCache.playerHealthText) {
            const playerHealthPercent = Math.max(0, (this.dungeon.player.health / this.dungeon.player.maxHealth) * 100);
            this.domCache.playerHealthFill.style.width = `${playerHealthPercent}%`;
            this.domCache.playerHealthText.textContent = `${this.dungeon.player.health} / ${this.dungeon.player.maxHealth}`;
        }

        // Initialize experience progress display
        this.updateExpProgress();

        // Update UI
        this.uiUpdateFlags.dungeon = true;
        this.updateDungeonUI();
        this.updateDungeonCombatUI();
    }

    // Process a combat turn
    processCombatTurn(action) {
        // Check if combat is active
        if (!this.dungeon.combatActive || !this.dungeon.currentEnemy) return;

        // Process player turn
        if (this.dungeon.turn === 'player') {
            // Process effects at the start of player's turn
            this.processPlayerEffects();

            // Handle player action
            switch (action) {
                case 'attack':
                    // Improved defense calculation with diminishing returns
                    // First 50 points of defense are worth 1.5% damage reduction each (up to 75%)
                    // Additional defense has diminishing returns (0.5% per point up to 90% max)
                    const enemyDefense = this.dungeon.currentEnemy.defense;
                    let attackDefenseReduction;

                    if (enemyDefense <= 50) {
                        // First 50 points of defense - full effectiveness
                        attackDefenseReduction = Math.min(0.75, enemyDefense * 0.015);
                    } else {
                        // Base 75% from first 50 points, then diminishing returns
                        const baseReduction = 0.75;
                        const additionalReduction = Math.min(0.15, (enemyDefense - 50) * 0.005);
                        attackDefenseReduction = baseReduction + additionalReduction;
                    }

                    // Ensure damage is never reduced below 10% of original value
                    let damage = Math.max(Math.floor(this.dungeon.player.attack * 0.1), Math.floor(this.dungeon.player.attack * (1 - attackDefenseReduction)));

                    // Check for critical hit based on luck
                    let attackCritChance = this.dungeon.player.skills.luck * 1; // 1% per luck level
                    let attackIsCritical = Math.random() * 100 < attackCritChance;

                    if (attackIsCritical) {
                        // Critical hit does double damage
                        damage = Math.floor(damage * 3);
                        this.addCombatMessage(`CRITICAL HIT! You attack ${this.dungeon.currentEnemy.name} for ${damage} damage!`, 'player');
                    } else {
                        // Normal attack
                        damage = Math.floor(damage * 1.5);
                        this.addCombatMessage(`You attack ${this.dungeon.currentEnemy.name} for ${damage} damage!`, 'player');
                    }

                    // Apply damage to enemy
                    this.dungeon.currentEnemy.health -= damage;

                    // Check if enemy is defeated
                    if (this.dungeon.currentEnemy.health <= 0) {
                        this.endCombat(true);
                        return;
                    }
                    break;

                case 'skill':
                    // Get total essence production with dungeon artifact/power bonuses applied
                    let totalProduction = this.getTotalProduction();

                    // Deduct 10% of available essence when using this skill
                    const essenceCost = this.resources.essence.multiply(0.3);
                    this.resources.essence = this.resources.essence.subtract(essenceCost);
                    this.addCombatMessage(`You channel ${this.formatNumber(essenceCost)} essence (30% of your reserves) into a powerful attack!`, 'player');

                    // Calculate essence skill damage using logarithmic scaling to handle high essence values
                    // Base damage is calculated from total production with diminishing returns
                    const essenceValue = totalProduction.valueOf();
                    // Use logarithmic scaling to prevent damage from growing too quickly at high essence levels
                    // but still allow it to scale meaningfully
                    let baseDamage = Math.max(5, Math.log10(1 + essenceValue) * 100);

                    // Apply scaling based on player's ascension count to ensure damage remains relevant
                    const ascensionBonus = 1 + (this.statistics.ascensionCount * 0.2); // 20% more damage per ascension
                    baseDamage *= ascensionBonus;

                    // Apply skill point bonuses - strength affects essence damage too
                    const strengthBonus = 1 + (this.dungeon.player.skills.strength * 0.05); // 5% more damage per strength point
                    baseDamage *= strengthBonus;

                    // Essence skills have improved defense penetration
                    // Defense effectiveness is reduced against essence attacks
                    let skillDefenseReduction = Math.min(0.6, this.dungeon.currentEnemy.defense * 0.008); // More penetration than regular attacks
                    let skillDamage = Math.floor((baseDamage * (1 - skillDefenseReduction)) / 2);

                    // Check for critical hit based on luck
                    let skillCritChance = this.dungeon.player.skills.luck * 1; // 1% per luck level
                    let skillIsCritical = Math.random() * 100 < skillCritChance;

                    if (skillIsCritical) {
                        // Critical hit does double damage
                        skillDamage = Math.floor(skillDamage * 1.33);
                        this.addCombatMessage(`CRITICAL HIT! Your essence blast strikes ${this.dungeon.currentEnemy.name} for ${skillDamage} damage!`, 'player');
                    } else {
                        // Normal attack
                        this.addCombatMessage(`Your essence blast strikes ${this.dungeon.currentEnemy.name} for ${skillDamage} damage!`, 'player');
                    }

                    // Apply damage to enemy
                    this.dungeon.currentEnemy.health -= skillDamage;

                    // Check if enemy is defeated
                    if (this.dungeon.currentEnemy.health <= 0) {
                        this.endCombat(true);
                        return;
                    }

                    // Update UI to reflect essence change
                    this.uiUpdateFlags.resources = true;
                    this.updateSelectiveUI();
                    break;

                case 'flee':
                    // Attempt to flee
                    const fleeChance = 0.4; // 40% chance to flee
                    if (Math.random() < fleeChance) {
                        // Successful flee
                        this.addCombatMessage('You successfully flee from combat!', 'system');
                        this.dungeon.combatActive = false;
                        this.dungeon.currentEnemy = null;

                        // Update UI
                        this.uiUpdateFlags.dungeon = true;
                        this.updateDungeonUI();
                        return;
                    } else {
                        // Failed flee attempt
                        this.addCombatMessage('You failed to flee!', 'system');
                    }
                    break;
            }

            // Switch to enemy turn
            this.dungeon.turn = 'enemy';

            // Process enemy turn after a short delay
            setTimeout(() => {
                this.processEnemyTurn();
            }, 1000);
        }

        // Update combat UI
        this.updateDungeonCombatUI();
    }

    // Process healing room
    processHealRoom() {
        this.addCombatMessage('You step into the center of the room where the blue light is strongest.', 'system');
        this.addCombatMessage('The healing energy surrounds you, seeping into your wounds.', 'system');

        // Restore health
        const healAmount = Math.floor(this.dungeon.player.maxHealth * 0.5);
        this.dungeon.player.health = Math.min(this.dungeon.player.maxHealth, this.dungeon.player.health + healAmount);

        this.addCombatMessage(`Your wounds close and your pain fades as ${healAmount} health is restored!`, 'system');

        // Also remove negative effects
        const hadDebuffs = this.dungeon.player.effects.some(e => e.type === 'debuff');
        this.dungeon.player.effects = this.dungeon.player.effects.filter(e => e.type !== 'debuff');

        if (hadDebuffs) {
            this.addCombatMessage('The purifying light washes over you, cleansing your body of all negative effects!', 'system');
        }

        // Small chance for a permanent health boost
        const healthBoostChance = 0.15 + (this.dungeon.player.skills.luck * 0.05); // 15% base + 5% per luck level
        if (Math.random() < healthBoostChance) {
            const healthBoost = Math.max(5, Math.floor(this.dungeon.player.maxHealth * 0.02));
            this.dungeon.player.maxHealth += healthBoost;
            this.dungeon.player.health += healthBoost;
            this.addCombatMessage(`The healing energy strengthens your life force, permanently increasing your maximum health by ${healthBoost}!`, 'system');
        }

        this.addCombatMessage('You feel refreshed and rejuvenated as you leave the healing sanctuary.', 'system');

        // Save dungeon state after processing heal room
        this.saveDungeonState();
    }

    // Process artifact room
    processArtifactRoom() {
        this.addCombatMessage('You approach the floating artifact cautiously, feeling its power radiating through the room.', 'system');

        // Check for rare dungeon artifact discovery
        // Apply luck bonus to rare artifact chance (base 2% + 0.5% per luck level - reduced to make rare artifacts more rare)
        const rareFindChance = 0.02 + (this.dungeon.player.skills.luck * 0.005);
        const isRareFind = Math.random() < rareFindChance;

        if (isRareFind) {
            // Get all unlocked dungeon artifacts
            const unlockedDungeonArtifacts = this.artifacts.filter(a =>
                a.type === 'dungeon' && !a.purchased
            );

            // If there are no more dungeon artifacts to find, fall back to regular artifacts
            if (unlockedDungeonArtifacts.length === 0) {
                this.addCombatMessage('The artifact shimmers with familiar energy. You sense you have already discovered all the legendary artifacts.', 'system');
                this.processRegularArtifact();
                return;
            }

            // Select a random dungeon artifact
            const dungeonArtifact = unlockedDungeonArtifacts[Math.floor(Math.random() * unlockedDungeonArtifacts.length)];

            // Mark it as purchased
            dungeonArtifact.purchased = true;
            dungeonArtifact.unlocked = true;

            // Apply its effects
            this.applyArtifactEffect(dungeonArtifact);

            // Show discovery message
            this.addCombatMessage(`You found a legendary artifact: ${dungeonArtifact.name}!`, 'system');
            this.addCombatMessage(dungeonArtifact.description, 'system');
            this.addCombatMessage(dungeonArtifact.lore, 'system');
            this.addCombatMessage('This powerful artifact will remain with you even through ascension!', 'system');

            // Add to statistics
            if (!this.dungeon.statistics.artifactsFound) {
                this.dungeon.statistics.artifactsFound = 0;
            }
            this.dungeon.statistics.artifactsFound++;

            // Flag bonuses UI for update
            this.uiUpdateFlags.bonuses = true;
            this.updateUI();
        } else {
            // Process regular artifact
            this.processRegularArtifact();
        }

        // Save dungeon state after processing artifact room
        this.saveDungeonState();
    }

    // Process regular (temporary) artifact
    processRegularArtifact() {
        // Define possible artifacts with more detailed descriptions and effects
        const artifacts = [
            {
                name: 'Essence Crystal',
                description: 'A multifaceted crystal that pulses with ethereal energy. Ancient runes are etched into its surface.',
                effect: () => {
                    this.addCombatMessage('As you touch the crystal, it dissolves into pure energy that flows into your body.', 'system');
                    // Increase essence production multiplier
                    this.productionMultiplier = this.productionMultiplier.multiply(1.05);
                    this.addCombatMessage('You feel a connection to the essence realms strengthening within you.', 'system');
                    this.addCombatMessage('Your essence generation is permanently increased by 5%!', 'system');
                }
            },
            {
                name: 'Warrior\'s Pendant',
                description: 'A pendant forged from crimson metal, emanating an aura of strength and power.',
                effect: () => {
                    this.addCombatMessage('You place the pendant around your neck. It grows warm against your skin.', 'system');
                    // Add a permanent attack bonus
                    const attackBonus = Math.max(5, Math.floor(this.dungeon.player.attack * 0.1));
                    if (!this.dungeon.player.permanentBonuses) {
                        this.dungeon.player.permanentBonuses = { attack: 0, defense: 0 };
                    }
                    this.dungeon.player.permanentBonuses.attack += attackBonus;
                    this.dungeon.player.attack += attackBonus;
                    this.addCombatMessage('A surge of power flows through your arms, making them feel stronger.', 'system');
                    this.addCombatMessage(`Your attack is permanently increased by ${attackBonus}!`, 'system');
                }
            },
            {
                name: 'Guardian Shield',
                description: 'A small shield-shaped amulet that shimmers with protective magic.',
                effect: () => {
                    this.addCombatMessage('The amulet attaches itself to your armor, spreading a faint blue glow across it.', 'system');
                    // Add a permanent defense bonus
                    const defenseBonus = Math.max(3, Math.floor(this.dungeon.player.defense * 0.1));
                    if (!this.dungeon.player.permanentBonuses) {
                        this.dungeon.player.permanentBonuses = { attack: 0, defense: 0 };
                    }
                    this.dungeon.player.permanentBonuses.defense += defenseBonus;
                    this.dungeon.player.defense += defenseBonus;
                    this.addCombatMessage('Your skin tingles as a protective barrier forms around you.', 'system');
                    this.addCombatMessage(`Your defense is permanently increased by ${defenseBonus}!`, 'system');
                }
            },
            {
                name: 'Vitality Stone',
                description: 'A smooth, heart-shaped stone that pulses with a gentle red glow, like a heartbeat.',
                effect: () => {
                    this.addCombatMessage('You hold the stone against your chest. It beats in rhythm with your heart before dissolving into your body.', 'system');
                    // Add a permanent health bonus
                    const healthBonus = Math.max(10, Math.floor(this.dungeon.player.maxHealth * 0.1));
                    if (!this.dungeon.player.permanentBonuses) {
                        this.dungeon.player.permanentBonuses = { health: 0 };
                    } else if (!this.dungeon.player.permanentBonuses.health) {
                        this.dungeon.player.permanentBonuses.health = 0;
                    }
                    this.dungeon.player.permanentBonuses.health += healthBonus;
                    this.dungeon.player.maxHealth += healthBonus;
                    this.dungeon.player.health += healthBonus;
                    this.addCombatMessage('You feel your life force growing stronger, more resilient.', 'system');
                    this.addCombatMessage(`Your maximum health is permanently increased by ${healthBonus}!`, 'system');
                }
            },
            {
                name: 'Ethereal Hourglass',
                description: 'A strange hourglass where the sand flows upward instead of downward, defying gravity.',
                effect: () => {
                    this.addCombatMessage('As you touch the hourglass, time seems to slow around you. Your reflexes feel sharper.', 'system');
                    // Add a permanent luck bonus
                    if (!this.dungeon.player.skills.luck) {
                        this.dungeon.player.skills.luck = 0;
                    }
                    this.dungeon.player.skills.luck += 1;
                    this.addCombatMessage('Your perception of time and space has been permanently altered.', 'system');
                    this.addCombatMessage('Your luck is permanently increased by 1!', 'system');
                }
            }
        ];

        // Select a random artifact
        const artifact = artifacts[Math.floor(Math.random() * artifacts.length)];

        // Apply the artifact effect
        this.addCombatMessage(`You found a ${artifact.name}!`, 'system');
        this.addCombatMessage(artifact.description, 'system');
        artifact.effect();

        this.addCombatMessage('The artifact\'s power has been absorbed into your being, forever changing you.', 'system');

        // Add to statistics
        if (!this.dungeon.statistics.artifactsFound) {
            this.dungeon.statistics.artifactsFound = 0;
        }
        this.dungeon.statistics.artifactsFound++;

        // Save dungeon state after processing regular artifact
        this.saveDungeonState();
    }

    // Process enemy turn in combat
    processEnemyTurn() {
        // Check if combat is still active
        if (!this.dungeon.combatActive || !this.dungeon.currentEnemy) return;

        // Process effects at the start of enemy's turn
        this.processPlayerEffects();

        // Improved defense calculation with diminishing returns for player defense
        // First 50 points of defense are worth 1.5% damage reduction each (up to 75%)
        // Additional defense has diminishing returns (0.5% per point up to 90% max)
        const playerDefense = this.dungeon.player.defense;
        let enemyAttackDefenseReduction;

        if (playerDefense <= 50) {
            // First 50 points of defense - full effectiveness
            enemyAttackDefenseReduction = Math.min(0.75, playerDefense * 0.015);
        } else {
            // Base 75% from first 50 points, then diminishing returns
            const baseReduction = 0.75;
            const additionalReduction = Math.min(0.15, (playerDefense - 50) * 0.005);
            enemyAttackDefenseReduction = baseReduction + additionalReduction;
        }

        // Ensure damage is never reduced below 10% of original value
        const damage = Math.max(Math.floor(this.dungeon.currentEnemy.attack * 0.1), Math.floor(this.dungeon.currentEnemy.attack * (1 - enemyAttackDefenseReduction)));

        // Apply damage to player
        this.dungeon.player.health -= damage;

        // Add combat message
        this.addCombatMessage(`${this.dungeon.currentEnemy.name} attacks you for ${damage} damage!`, 'enemy');

        // Check if player is defeated
        if (this.dungeon.player.health <= 0) {
            this.endCombat(false);
            return;
        }

        // Switch back to player turn
        this.dungeon.turn = 'player';

        // Update combat UI only if combat is still active
        if (this.dungeon.combatActive && this.dungeon.currentEnemy) {
            this.updateDungeonCombatUI();
        }
    }

    // End combat
    endCombat(playerWon) {
        // Check if combat is active
        if (!this.dungeon.combatActive) return;

        // Get current room
        const currentRoom = this.dungeon.map.find(r => r.id === this.dungeon.currentRoom);
        if (!currentRoom) return;

        if (playerWon) {
            // Player won the combat
            this.addCombatMessage(`You defeated ${this.dungeon.currentEnemy.name}!`, 'system');

            // Calculate base reward with improved scaling
            // Use the reward multiplier from difficulty scaling
            const rewardMultiplier = this.rewardMultiplier || 1.0;
            let essenceReward = Math.floor(this.dungeon.currentEnemy.maxHealth * 10 * rewardMultiplier);

            // Apply dungeon essence reward multiplier from powers
            for (const power of this.powers) {
                if (power.purchased && power.effect.dungeonEssenceReward) {
                    essenceReward = Math.floor(essenceReward * power.effect.dungeonEssenceReward);
                }
            }

            // Apply dungeon essence reward multiplier from all artifacts
            for (const artifact of this.artifacts) {
                // Apply dungeon essence reward from dungeon artifacts
                if (artifact.purchased && artifact.type === 'dungeon' && artifact.effect.dungeonEssenceReward) {
                    essenceReward = Math.floor(essenceReward * artifact.effect.dungeonEssenceReward);
                }

                // Apply dungeon essence reward from global artifacts
                if (artifact.purchased && artifact.type === 'global' && artifact.effect.dungeonEssenceReward) {
                    essenceReward = Math.floor(essenceReward * artifact.effect.dungeonEssenceReward);
                }

                // Apply ascension dungeon reward bonus
                if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionDungeonRewardBonus) {
                    const bonus = 1 + (artifact.effect.ascensionDungeonRewardBonus * this.statistics.ascensionCount);
                    essenceReward = Math.floor(essenceReward * bonus);
                }
            }

            // Make sure rewards.essence is a valid BigNumber before adding to it
            if (!(this.dungeon.rewards.essence instanceof BigNumber)) {
                this.dungeon.rewards.essence = new BigNumber(0);
            }

            // Add the reward as a BigNumber
            this.dungeon.rewards.essence = this.dungeon.rewards.essence.add(new BigNumber(essenceReward));

            // Add additional essence for boss kills instead of power points
            if (currentRoom.type === 'boss') {
                // Apply the reward multiplier to boss rewards as well
                const rewardMultiplier = this.rewardMultiplier || 1.0;
                let bossEssenceReward = Math.max(10, Math.floor(this.dungeon.currentEnemy.maxHealth * 30 * rewardMultiplier));

                // Apply dungeon essence reward multiplier from powers
                for (const power of this.powers) {
                    if (power.purchased && power.effect.dungeonEssenceReward) {
                        bossEssenceReward = Math.floor(bossEssenceReward * power.effect.dungeonEssenceReward);
                    }
                }

                // Apply dungeon essence reward multiplier from all artifacts
                for (const artifact of this.artifacts) {
                    // Apply dungeon essence reward from dungeon artifacts
                    if (artifact.purchased && artifact.type === 'dungeon' && artifact.effect.dungeonEssenceReward) {
                        bossEssenceReward = Math.floor(bossEssenceReward * artifact.effect.dungeonEssenceReward);
                    }

                    // Apply dungeon essence reward from global artifacts
                    if (artifact.purchased && artifact.type === 'global' && artifact.effect.dungeonEssenceReward) {
                        bossEssenceReward = Math.floor(bossEssenceReward * artifact.effect.dungeonEssenceReward);
                    }

                    // Apply ascension dungeon reward bonus
                    if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionDungeonRewardBonus) {
                        const bonus = 1 + (artifact.effect.ascensionDungeonRewardBonus * this.statistics.ascensionCount);
                        bossEssenceReward = Math.floor(bossEssenceReward * bonus);
                    }
                }

                // Make sure rewards.essence is a valid BigNumber before adding to it
                if (!(this.dungeon.rewards.essence instanceof BigNumber)) {
                    this.dungeon.rewards.essence = new BigNumber(0);
                }

                // Add the reward as a BigNumber
                this.dungeon.rewards.essence = this.dungeon.rewards.essence.add(new BigNumber(bossEssenceReward));
                this.addCombatMessage(`You gained an additional ${this.formatNumber(bossEssenceReward)} essence for defeating the boss!`, 'system');

                // Boss kills always award a skill point
                // Base skill point reward
                let bossSkillPointReward = 1;

                // Apply skill point bonus from powers
                for (const power of this.powers) {
                    if (power.purchased && power.effect.dungeonSkillPointBonus) {
                        bossSkillPointReward = Math.floor(bossSkillPointReward * power.effect.dungeonSkillPointBonus);
                    }
                }

                // Apply skill point bonus from dungeon artifacts
                for (const artifact of this.artifacts) {
                    if (artifact.purchased && artifact.type === 'dungeon' && artifact.effect.dungeonSkillPointBonus) {
                        bossSkillPointReward = Math.floor(bossSkillPointReward * artifact.effect.dungeonSkillPointBonus);
                    }

                    // Apply ascension dungeon reward bonus
                    if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionDungeonRewardBonus) {
                        const bonus = 1 + (artifact.effect.ascensionDungeonRewardBonus * this.statistics.ascensionCount);
                        bossSkillPointReward = Math.floor(bossSkillPointReward * bonus);
                    }
                }

                this.dungeon.rewards.skillPoints += bossSkillPointReward;
                this.dungeon.statistics.totalSkillPointsEarned += bossSkillPointReward;

                if (bossSkillPointReward > 1) {
                    this.addCombatMessage(`Boss defeated! You gained ${bossSkillPointReward} dungeon skill points!`, 'system');
                } else {
                    this.addCombatMessage('Boss defeated! You gained 1 dungeon skill point!', 'system');
                }

                // Update statistics
                this.dungeon.statistics.totalBossesDefeated++;

                // Reset kill counter after boss kill
                this.dungeon.statistics.enemyKillCounter = 0;

                // Automatically end the dungeon with rewards when boss is defeated
                setTimeout(() => {
                    this.addCombatMessage('You have conquered the dungeon! Returning with your rewards...', 'system');

                    // Clear saved dungeon state immediately to prevent reloading after boss defeat
                    localStorage.removeItem('etherealDungeonState');

                    setTimeout(() => {
                        this.endDungeon(true);
                    }, 2000);
                }, 1000);
            } else {
                // Update statistics for regular enemies
                this.dungeon.statistics.totalEnemiesDefeated++;

                // Increment kill counter for skill points
                this.dungeon.statistics.enemyKillCounter++;

                // Show progress message
                const progressPercent = Math.floor((this.dungeon.statistics.enemyKillCounter / 4) * 100);
                this.addCombatMessage(`Experience gained: ${progressPercent}% progress toward next level`, 'system');

                // Award a skill point every 4 kills
                if (this.dungeon.statistics.enemyKillCounter >= 4) {
                    this.dungeon.statistics.enemyKillCounter = 0;

                    // Base skill point reward
                    let skillPointReward = 1;

                    // Apply skill point bonus from powers
                    for (const power of this.powers) {
                        if (power.purchased && power.effect.dungeonSkillPointBonus) {
                            skillPointReward = Math.floor(skillPointReward * power.effect.dungeonSkillPointBonus);
                        }
                    }

                    // Apply skill point bonus from dungeon artifacts
                    for (const artifact of this.artifacts) {
                        if (artifact.purchased && artifact.type === 'dungeon' && artifact.effect.dungeonSkillPointBonus) {
                            skillPointReward = Math.floor(skillPointReward * artifact.effect.dungeonSkillPointBonus);
                        }

                        // Apply ascension dungeon reward bonus
                        if (artifact.purchased && artifact.type === 'ascension' && artifact.effect.ascensionDungeonRewardBonus) {
                            const bonus = 1 + (artifact.effect.ascensionDungeonRewardBonus * this.statistics.ascensionCount);
                            skillPointReward = Math.floor(skillPointReward * bonus);
                        }
                    }

                    this.dungeon.rewards.skillPoints += skillPointReward;
                    this.dungeon.statistics.totalSkillPointsEarned += skillPointReward;

                    if (skillPointReward > 1) {
                        this.addCombatMessage(`Level up! You gained ${skillPointReward} dungeon skill points!`, 'system');
                    } else {
                        this.addCombatMessage('Level up! You gained 1 dungeon skill point!', 'system');
                    }
                }
            }

            // Update the experience progress bar
            this.updateExpProgress();

            this.addCombatMessage(`You gained ${this.formatNumber(essenceReward)} essence!`, 'system');

            // Mark room as cleared
            currentRoom.cleared = true;
        } else {
            // Player lost the combat
            this.addCombatMessage(`You were defeated by ${this.dungeon.currentEnemy.name}!`, 'system');
            this.addCombatMessage('Your journey in this dungeon has come to an end.', 'system');

            // Clear saved dungeon state immediately to prevent reloading after death
            localStorage.removeItem('etherealDungeonState');

            // End the dungeon run with failure
            setTimeout(() => {
                this.endDungeon(false);
            }, 3000);
        }

        // Reset combat state
        this.dungeon.combatActive = false;
        this.dungeon.currentEnemy = null;

        // Update UI
        this.uiUpdateFlags.dungeon = true;
        this.updateDungeonUI();
    }

    // Update player stats display
    updateDungeonPlayerStats() {
        const statsContainer = this.domCache.dungeonPlayerStats;
        statsContainer.innerHTML = '';

        // Create player health bar
        const healthPercent = (this.dungeon.player.health / this.dungeon.player.maxHealth) * 100;
        const healthBar = `
            <div class="player-stat">
                <div class="player-stat-name">Health</div>
                <div class="player-stat-value">${this.dungeon.player.health}/${this.dungeon.player.maxHealth}</div>
            </div>
            <div class="player-health-bar">
                <div class="player-health-fill" style="width: ${healthPercent}%"></div>
            </div>
        `;

        // Create player stats
        const attackStat = `
            <div class="player-stat">
                <div class="player-stat-name">Attack</div>
                <div class="player-stat-value">${this.dungeon.player.attack}</div>
            </div>
        `;

        const defenseStat = `
            <div class="player-stat">
                <div class="player-stat-name">Defense</div>
                <div class="player-stat-value">${this.dungeon.player.defense}</div>
            </div>
        `;

        // Get total essence production for display
        const totalProduction = this.getTotalProduction();

        const essenceStat = `
            <div class="player-stat">
                <div class="player-stat-name">Essence Power</div>
                <div class="player-stat-value">${this.formatNumber(totalProduction)}/s</div>
            </div>
        `;

        // Calculate critical hit chance (1% per luck level)
        const critChance = this.dungeon.player.skills.luck * 1;
        const critStat = `
            <div class="player-stat">
                <div class="player-stat-name">Crit Chance</div>
                <div class="player-stat-value">${critChance}%</div>
            </div>
        `;

        // Show skill points and progress
        const skillPointsAvailable = this.dungeon.player.skillPoints;
        const enemyKillCounter = this.dungeon.statistics.enemyKillCounter;
        const skillPointProgress = `
            <div class="player-stat">
                <div class="player-stat-name">Skill Points</div>
                <div class="player-stat-value">${skillPointsAvailable}</div>
            </div>
            <div class="player-stat">
                <div class="player-stat-name">Experience</div>
                <div class="player-stat-value">${Math.floor((enemyKillCounter / 4) * 100)}%</div>
            </div>
        `;

        // Add skill levels
        const skillLevels = `
            <div class="player-skills-header">Skill Levels</div>
            <div class="player-skills-grid">
                <div class="player-skill">
                    <div class="player-skill-name">Strength</div>
                    <div class="player-skill-value">${this.dungeon.player.skills.strength}</div>
                </div>
                <div class="player-skill">
                    <div class="player-skill-name">Vitality</div>
                    <div class="player-skill-value">${this.dungeon.player.skills.vitality}</div>
                </div>
                <div class="player-skill">
                    <div class="player-skill-name">Defense</div>
                    <div class="player-skill-value">${this.dungeon.player.skills.defense}</div>
                </div>
                <div class="player-skill">
                    <div class="player-skill-name">Luck</div>
                    <div class="player-skill-value">${this.dungeon.player.skills.luck}</div>
                </div>
            </div>
        `;

        // Add skill upgrade button if points are available
        let skillUpgradeButton = '';
        if (skillPointsAvailable > 0) {
            skillUpgradeButton = `
                <button id="dungeon-upgrade-skills-button" class="dungeon-action-button skill">
                    Upgrade Skills
                </button>
            `;
        }

        // Combine all stats
        statsContainer.innerHTML = healthBar + attackStat + defenseStat + essenceStat + critStat + skillPointProgress + skillLevels + skillUpgradeButton;

        // Add event listener to the upgrade button if it exists
        const upgradeButton = document.getElementById('dungeon-upgrade-skills-button');
        if (upgradeButton) {
            upgradeButton.addEventListener('click', () => {
                this.showDungeonSkillsUI();
            });
        }
    }

    // Update dungeon action buttons
    updateDungeonActions() {
        // Clear existing buttons
        const actionsContainer = document.getElementById('dungeon-actions-container');
        if (!actionsContainer) return;
        actionsContainer.innerHTML = '';

        // Skip if no current room
        if (!this.dungeon.currentRoom) return;

        // Get current room
        const currentRoom = this.dungeon.map.find(r => r.id === this.dungeon.currentRoom);
        if (!currentRoom) return;

        // If in combat, show combat actions
        if (this.dungeon.combatActive && this.dungeon.currentEnemy) {
            // Attack button
            const attackButton = document.createElement('button');
            attackButton.className = 'dungeon-action-button attack';
            attackButton.textContent = 'Attack';
            attackButton.addEventListener('click', () => {
                this.processCombatTurn('attack');
            });
            actionsContainer.appendChild(attackButton);

            // Skill button (if player has essence production)
            const totalProduction = this.getTotalProduction();
            if (totalProduction.greaterThan(0)) {
                const skillButton = document.createElement('button');
                skillButton.className = 'dungeon-action-button skill';
                skillButton.textContent = 'Essence Blast';
                skillButton.addEventListener('click', () => {
                    this.processCombatTurn('skill');
                });
                actionsContainer.appendChild(skillButton);
            }

            // Flee button (not available for boss fights)
            if (currentRoom.type !== 'boss') {
                const fleeButton = document.createElement('button');
                fleeButton.className = 'dungeon-action-button move';
                fleeButton.textContent = 'Flee';
                fleeButton.addEventListener('click', () => {
                    this.processCombatTurn('flee');
                });
                actionsContainer.appendChild(fleeButton);
            }
        } else {
            // Room-specific actions
            switch (currentRoom.type) {
                case 'entrance':
                    // Exit dungeon button
                    const exitButton = document.createElement('button');
                    exitButton.className = 'dungeon-action-button';
                    exitButton.textContent = 'Exit Dungeon';
                    exitButton.addEventListener('click', () => {
                        this.endDungeon(true);
                    });
                    actionsContainer.appendChild(exitButton);
                    break;

                case 'treasure':
                    if (!currentRoom.cleared) {
                        // Loot treasure button
                        const lootButton = document.createElement('button');
                        lootButton.className = 'dungeon-action-button item';
                        lootButton.textContent = 'Loot Treasure';
                        lootButton.addEventListener('click', () => {
                            this.processTreasureRoom();
                            currentRoom.cleared = true;
                            this.updateDungeonUI();
                        });
                        actionsContainer.appendChild(lootButton);
                    }
                    break;

                case 'event':
                    if (!currentRoom.cleared) {
                        // Investigate event button
                        const investigateButton = document.createElement('button');
                        investigateButton.className = 'dungeon-action-button';
                        investigateButton.textContent = 'Investigate';
                        investigateButton.addEventListener('click', () => {
                            this.processEventRoom();
                            currentRoom.cleared = true;
                            this.updateDungeonUI();
                        });
                        actionsContainer.appendChild(investigateButton);
                    }
                    break;

                case 'empty':
                    if (!currentRoom.cleared) {
                        // Search room button
                        const searchButton = document.createElement('button');
                        searchButton.className = 'dungeon-action-button';
                        searchButton.textContent = 'Search Room';
                        searchButton.addEventListener('click', () => {
                            // Small chance to find something in empty rooms
                            const findSomething = Math.random() < 0.2;
                            if (findSomething) {
                                const essenceFound = Math.floor(this.resources.essence.valueOf() * 0.01);
                                this.resources.essence = this.resources.essence.add(essenceFound);
                                this.addCombatMessage(`You found ${this.formatNumber(essenceFound)} essence hidden in the room!`, 'system');
                            } else {
                                this.addCombatMessage('You search the room but find nothing of interest.', 'system');
                            }
                            currentRoom.cleared = true;
                            this.updateDungeonUI();
                        });
                        actionsContainer.appendChild(searchButton);
                    }
                    break;

                case 'luck':
                    if (!currentRoom.cleared) {
                        // Absorb luck button
                        const luckButton = document.createElement('button');
                        luckButton.className = 'dungeon-action-button';
                        luckButton.textContent = 'Absorb Energy';
                        luckButton.addEventListener('click', () => {
                            this.processLuckRoom();
                            currentRoom.cleared = true;
                            this.updateDungeonUI();
                        });
                        actionsContainer.appendChild(luckButton);
                    }
                    break;

                case 'trap':
                    if (!currentRoom.cleared) {
                        // Disarm trap button
                        const trapButton = document.createElement('button');
                        trapButton.className = 'dungeon-action-button';
                        trapButton.textContent = 'Disarm Trap';
                        trapButton.addEventListener('click', () => {
                            this.processTrapRoom();
                            currentRoom.cleared = true;
                            this.updateDungeonUI();
                        });
                        actionsContainer.appendChild(trapButton);
                    }
                    break;

                case 'heal':
                    if (!currentRoom.cleared) {
                        // Heal button
                        const healButton = document.createElement('button');
                        healButton.className = 'dungeon-action-button';
                        healButton.textContent = 'Meditate';
                        healButton.addEventListener('click', () => {
                            this.processHealRoom();
                            currentRoom.cleared = true;
                            this.updateDungeonUI();
                        });
                        actionsContainer.appendChild(healButton);
                    }
                    break;

                case 'artifact':
                    if (!currentRoom.cleared) {
                        // Claim artifact button
                        const artifactButton = document.createElement('button');
                        artifactButton.className = 'dungeon-action-button item';
                        artifactButton.textContent = 'Claim Artifact';
                        artifactButton.addEventListener('click', () => {
                            this.processArtifactRoom();
                            currentRoom.cleared = true;
                            this.updateDungeonUI();
                        });
                        actionsContainer.appendChild(artifactButton);
                    }
                    break;
            }
        }
    }

    // Update navigation buttons
    updateDungeonNavigation() {
        // Clear existing buttons
        const navigationContainer = document.getElementById('dungeon-navigation-container');
        if (!navigationContainer) return;
        navigationContainer.innerHTML = '';

        // Skip if no current room or in combat
        if (!this.dungeon.currentRoom || this.dungeon.combatActive) return;

        // Get current room
        const currentRoom = this.dungeon.map.find(r => r.id === this.dungeon.currentRoom);
        if (!currentRoom || !currentRoom.connections) return;

        // Movement buttons for connected rooms
        for (const connectedRoomId of currentRoom.connections) {
            const connectedRoom = this.dungeon.map.find(r => r.id === connectedRoomId);
            if (connectedRoom) {
                const moveButton = document.createElement('button');
                moveButton.className = 'dungeon-action-button move';

                // Determine direction
                let direction = '';
                if (connectedRoom.y < currentRoom.y) direction = 'North';
                else if (connectedRoom.y > currentRoom.y) direction = 'South';
                else if (connectedRoom.x < currentRoom.x) direction = 'West';
                else if (connectedRoom.x > currentRoom.x) direction = 'East';

                // Add room type indicator
                let roomTypeIcon = '';
                switch (connectedRoom.type) {
                    case 'boss': roomTypeIcon = '👑 '; break;
                    case 'treasure': roomTypeIcon = '💰 '; break;
                    case 'enemy': roomTypeIcon = '👹 '; break;
                    case 'event': roomTypeIcon = '❓ '; break;
                    case 'luck': roomTypeIcon = '🍀 '; break;
                    case 'trap': roomTypeIcon = '⚠️ '; break;
                    case 'heal': roomTypeIcon = '💚 '; break;
                    case 'artifact': roomTypeIcon = '🔮 '; break;
                    case 'entrance': roomTypeIcon = '🚪 '; break;
                    default: roomTypeIcon = '';
                }

                // Show room type if visited
                if (connectedRoom.visited) {
                    moveButton.textContent = `${roomTypeIcon}${direction}`;
                } else {
                    moveButton.textContent = `${direction} ?`;
                }

                // Add cleared indicator
                if (connectedRoom.cleared) {
                    moveButton.textContent += ' (Cleared)';
                    moveButton.style.opacity = '0.7';
                }

                moveButton.addEventListener('click', () => {
                    this.moveToRoom(connectedRoomId);
                });
                navigationContainer.appendChild(moveButton);
            }
        }
    }

    // Update dungeon active effects
    updateDungeonEffects() {
        const effectsContainer = this.domCache.dungeonActiveEffects;
        effectsContainer.innerHTML = '';

        // Display active effects
        if (this.dungeon.player.effects.length === 0) {
            effectsContainer.innerHTML = '<div class="no-effects">No active effects</div>';
            return;
        }

        for (const effect of this.dungeon.player.effects) {
            const effectDiv = document.createElement('div');
            effectDiv.className = 'active-effect';

            let icon = '✨';
            if (effect.type === 'buff') icon = '⬆️';
            if (effect.type === 'debuff') icon = '⬇️';

            effectDiv.innerHTML = `
                <div class="effect-icon">${icon}</div>
                <div class="effect-info">
                    <div class="effect-name">${effect.name}</div>
                    <div class="effect-duration">${effect.duration} turns remaining</div>
                </div>
            `;

            effectsContainer.appendChild(effectDiv);
        }
    }

    // Update the combat UI
    updateDungeonCombatUI() {
        // Safety check - don't update if combat is not active or there's no enemy
        if (!this.dungeon.combatActive || !this.dungeon.currentEnemy) {
            return;
        }

        // Update turn display
        if (this.domCache.combatTurnDisplay) {
            this.domCache.combatTurnDisplay.textContent = this.dungeon.turn === 'player' ? 'Your Turn' : 'Enemy Turn';
        }

        // Update player health and stats
        if (this.domCache.playerHealthFill && this.domCache.playerHealthText && this.domCache.playerCombatStats) {
            // Calculate health percentage
            const playerHealthPercent = Math.max(0, (this.dungeon.player.health / this.dungeon.player.maxHealth) * 100);
            this.domCache.playerHealthFill.style.width = `${playerHealthPercent}%`;
            this.domCache.playerHealthText.textContent = `${this.dungeon.player.health} / ${this.dungeon.player.maxHealth}`;

            // Update player stats
            this.domCache.playerCombatStats.innerHTML = `
                <div class="combat-stats-grid">
                    <div class="combat-stat">
                        <div class="combat-stat-label">Attack</div>
                        <div class="combat-stat-value">${this.dungeon.player.attack}</div>
                    </div>
                    <div class="combat-stat">
                        <div class="combat-stat-label">Defense</div>
                        <div class="combat-stat-value">${this.dungeon.player.defense}</div>
                    </div>
                    <div class="combat-stat">
                        <div class="combat-stat-label">Crit</div>
                        <div class="combat-stat-value">${this.dungeon.player.skills.luck * 1}%</div>
                    </div>
                    <div class="combat-stat">
                        <div class="combat-stat-label">Power</div>
                        <div class="combat-stat-value">${this.formatNumber(this.getTotalProduction())}</div>
                    </div>
                </div>
            `;
        }

        // Update enemy display
        const enemyContainer = this.domCache.dungeonEnemyContainer;
        if (!enemyContainer) return;
        enemyContainer.innerHTML = '';

        if (this.dungeon.currentEnemy) {
            // Calculate health percentage
            const healthPercent = Math.max(0, (this.dungeon.currentEnemy.health / this.dungeon.currentEnemy.maxHealth) * 100);

            // Determine enemy state based on health
            let enemyState = 'normal';
            if (healthPercent < 30) enemyState = 'critical';
            else if (healthPercent < 70) enemyState = 'wounded';

            enemyContainer.innerHTML = `
                <div class="combat-entity-name">${this.dungeon.currentEnemy.name}</div>
                <div class="enemy-icon ${enemyState === 'wounded' ? 'enemy-wounded' : ''} ${enemyState === 'critical' ? 'enemy-critical' : ''}">${this.dungeon.currentEnemy.icon}</div>
                <div class="combat-health-bar-container">
                    <div class="combat-health-bar enemy-health-bar">
                        <div class="combat-health-fill enemy-health-fill" style="width: ${healthPercent}%"></div>
                    </div>
                    <div class="combat-health-text">${this.dungeon.currentEnemy.health} / ${this.dungeon.currentEnemy.maxHealth}</div>
                </div>
                <div class="combat-stats">
                    <div class="combat-stats-grid">
                        <div class="combat-stat">
                            <div class="combat-stat-label">Attack</div>
                            <div class="combat-stat-value">${this.dungeon.currentEnemy.attack}</div>
                        </div>
                        <div class="combat-stat">
                            <div class="combat-stat-label">Defense</div>
                            <div class="combat-stat-value">${this.dungeon.currentEnemy.defense}</div>
                        </div>
                        <div class="combat-stat">
                            <div class="combat-stat-label">Type</div>
                            <div class="combat-stat-value">${this.dungeon.currentEnemy.isBoss ? 'Boss' : 'Normal'}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Update combat log - safely handle null element
        const combatLog = this.domCache.dungeonCombatLog;
        if (combatLog) {
            combatLog.innerHTML = '<div class="combat-log-header">Combat Log</div>';

            const logContainer = document.createElement('div');
            logContainer.className = 'combat-log-container';

            for (const message of this.dungeon.combatLog) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `combat-message ${message.type}`;
                messageDiv.textContent = message.text;
                logContainer.appendChild(messageDiv);
            }

            combatLog.appendChild(logContainer);

            // Scroll to bottom of combat log
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        // Update combat actions
        this.updateCombatActions();

        // Update experience progress
        this.updateExpProgress();
    }

    // Get total essence production
    getTotalProduction() {
        // For consistency, we'll use the same calculation method as calculateTotalProduction
        // This ensures all multipliers, including ascension, are properly applied
        let totalProduction = this.calculateTotalProduction();

        // Apply dungeon-specific artifacts and powers to essence production
        // This is only used for dungeon combat calculations
        if (this.dungeon && this.dungeon.active) {
            // Apply dungeon artifact effects to essence production
            for (const artifact of this.artifacts) {
                if (artifact.purchased && artifact.type === 'dungeon') {
                    // Apply essence multiplier from dungeon artifacts if it exists
                    if (artifact.effect.essenceMultiplier) {
                        totalProduction = totalProduction.multiply(artifact.effect.essenceMultiplier);
                    }
                    // Also apply dungeon essence reward multiplier if it exists
                    if (artifact.effect.dungeonEssenceReward) {
                        totalProduction = totalProduction.multiply(artifact.effect.dungeonEssenceReward);
                    }
                }
            }

            // Apply dungeon power effects to essence production
            for (const power of this.powers) {
                if (power.purchased && power.effect.dungeonEssenceReward) {
                    totalProduction = totalProduction.multiply(power.effect.dungeonEssenceReward);
                }
                // Also apply multiplier effect if it exists
                if (power.purchased && power.effect.multiplier) {
                    // Apply a portion of the general multiplier to dungeon essence power
                    // This makes powers that boost general production also help in dungeons
                    const dungeonMultiplierBoost = 1 + ((power.effect.multiplier - 1) * 0.5); // 50% effectiveness
                    totalProduction = totalProduction.multiply(dungeonMultiplierBoost);
                }
            }
        }

        return totalProduction;
    }

    // Update combat actions in the new UI
    updateCombatActions() {
        if (!this.domCache.combatActionsContainer) return;

        // Clear existing buttons
        this.domCache.combatActionsContainer.innerHTML = '';

        // Only show actions if it's player's turn
        if (!this.dungeon.combatActive || !this.dungeon.currentEnemy || this.dungeon.turn !== 'player') return;

        // Attack button
        const attackButton = document.createElement('button');
        attackButton.className = 'combat-action-button attack';
        attackButton.innerHTML = `<span class="action-icon">⚔️</span> Attack`;
        attackButton.addEventListener('click', () => {
            this.processCombatTurn('attack');
        });
        this.domCache.combatActionsContainer.appendChild(attackButton);

        // Essence Blast button (if player has essence production)
        const totalProduction = this.getTotalProduction();
        if (totalProduction.greaterThan(0)) {
            const skillButton = document.createElement('button');
            skillButton.className = 'combat-action-button skill';
            skillButton.innerHTML = `<span class="action-icon">✨</span> Essence Blast`;
            skillButton.addEventListener('click', () => {
                this.processCombatTurn('skill');
            });
            this.domCache.combatActionsContainer.appendChild(skillButton);
        }

        // Flee button (not available for boss fights)
        if (this.dungeon.currentEnemy && !this.dungeon.currentEnemy.isBoss) {
            const fleeButton = document.createElement('button');
            fleeButton.className = 'combat-action-button flee';
            fleeButton.innerHTML = `<span class="action-icon">🏃</span> Flee`;
            fleeButton.addEventListener('click', () => {
                this.processCombatTurn('flee');
            });
            this.domCache.combatActionsContainer.appendChild(fleeButton);
        }
    }

    // Update experience progress bar
    updateExpProgress() {
        if (this.domCache.combatExpFill && this.domCache.combatExpText) {
            // Calculate progress percentage (0-4 kills)
            const killCounter = this.dungeon.statistics.enemyKillCounter;
            const progressPercent = (killCounter / 4) * 100;

            // Update the progress bar
            this.domCache.combatExpFill.style.width = `${progressPercent}%`;
            this.domCache.combatExpText.textContent = `${Math.floor(progressPercent)}% to next level`;
        }
    }

    // Add a message to the combat log
    addCombatMessage(message, type = 'system') {
        this.dungeon.combatLog.push({ text: message, type, timestamp: Date.now() });

        // Limit log size
        if (this.dungeon.combatLog.length > 100) {
            this.dungeon.combatLog.shift();
        }

        // Update combat log if visible and element exists
        if (this.dungeon.combatActive) {
            const combatLog = this.domCache.dungeonCombatLog;
            if (combatLog) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `combat-message ${type}`;
                messageDiv.textContent = message;
                combatLog.appendChild(messageDiv);

                // Scroll to bottom
                combatLog.scrollTop = combatLog.scrollHeight;
            }
        }

        // Always update the message window
        this.updateMessageWindow();
    }

    // Update the message window with the last few messages
    updateMessageWindow() {
        const messageContainer = document.getElementById('dungeon-message-container');
        if (!messageContainer) return;

        // Clear the message container
        messageContainer.innerHTML = '';

        // Get the last 5 messages (or all if less than 5)
        const messages = this.dungeon.combatLog.slice(-5);

        // Add messages to the container
        for (const message of messages) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `dungeon-message ${message.type}`;
            messageDiv.textContent = message.text;
            messageContainer.appendChild(messageDiv);
        }

        // Scroll to bottom
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    // Calculate player stats based on game progress
    calculatePlayerStats() {
        // Base stats
        const baseHealth = 100;
        const baseAttack = 10;
        const baseDefense = 5;

        // Get total essence production
        const totalProduction = this.getTotalProduction();

        // Scale stats based on essence production and ascensions
        const essencePower = totalProduction.valueOf();
        const ascensionBonus = this.statistics.ascensionCount * 5;

        // Calculate skill bonuses
        const strengthBonus = this.dungeon.player.skills.strength * 2; // Each point gives +2 attack
        const vitalityBonus = this.dungeon.player.skills.vitality * 10; // Each point gives +10 health
        const defenseBonus = this.dungeon.player.skills.defense * 1; // Each point gives +1 defense
        // Luck is handled separately in combat calculations

        // Calculate base stats with improved scaling for high essence values
        // Use logarithmic scaling to ensure stats remain relevant at high essence levels
        // but don't grow too quickly to maintain game balance
        let health = baseHealth + Math.floor(Math.log10(1 + essencePower) * 20) + ascensionBonus + vitalityBonus;
        let attack = baseAttack + Math.floor(Math.log10(1 + essencePower) * 8) + Math.floor(ascensionBonus * 0.5) + strengthBonus;
        let defense = baseDefense + Math.floor(Math.log10(1 + essencePower) * 4) + Math.floor(ascensionBonus * 0.2) + defenseBonus;

        // Apply minimum values to ensure stats are never too low
        health = Math.max(100, health);
        attack = Math.max(10, attack);
        defense = Math.max(5, defense);

        // Apply dungeon power multipliers
        for (const power of this.powers) {
            if (power.purchased) {
                // Apply health multiplier from powers
                if (power.effect.dungeonHealthMultiplier) {
                    health = Math.floor(health * power.effect.dungeonHealthMultiplier);
                }

                // Apply attack multiplier from powers
                if (power.effect.dungeonAttackMultiplier) {
                    attack = Math.floor(attack * power.effect.dungeonAttackMultiplier);
                }

                // Apply defense multiplier from powers
                if (power.effect.dungeonDefenseMultiplier) {
                    defense = Math.floor(defense * power.effect.dungeonDefenseMultiplier);
                }
            }
        }

        // Apply dungeon artifact multipliers
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'dungeon') {
                // Apply health multiplier from dungeon artifacts
                if (artifact.effect.dungeonHealthMultiplier) {
                    health = Math.floor(health * artifact.effect.dungeonHealthMultiplier);
                }

                // Apply attack multiplier from dungeon artifacts
                if (artifact.effect.dungeonAttackMultiplier) {
                    attack = Math.floor(attack * artifact.effect.dungeonAttackMultiplier);
                }

                // Apply defense multiplier from dungeon artifacts
                if (artifact.effect.dungeonDefenseMultiplier) {
                    defense = Math.floor(defense * artifact.effect.dungeonDefenseMultiplier);
                }
            }
        }

        // Update player stats
        this.dungeon.player.maxHealth = health;
        this.dungeon.player.health = health; // Restore to full health
        this.dungeon.player.attack = attack;
        this.dungeon.player.defense = defense;

        return this.dungeon.player;
    }

    // Generate a random enemy based on dungeon level and ascension count
    generateEnemy(isBoss = false) {
        // Enemy types
        const enemyTypes = [
            { name: 'Shadow Wraith', icon: '👻', healthMult: 0.8, attackMult: 1.2, defenseMult: 0.7 },
            { name: 'Stone Golem', icon: '🧑', healthMult: 1.5, attackMult: 0.8, defenseMult: 1.3 },
            { name: 'Essence Devourer', icon: '👹', healthMult: 1.0, attackMult: 1.0, defenseMult: 1.0 },
            { name: 'Void Serpent', icon: '🐍', healthMult: 0.9, attackMult: 1.3, defenseMult: 0.8 },
            { name: 'Arcane Construct', icon: '🤖', healthMult: 1.2, attackMult: 0.9, defenseMult: 1.1 }
        ];

        // Boss types
        const bossTypes = [
            { name: 'Ancient Guardian', icon: '🐲', healthMult: 2.0, attackMult: 1.5, defenseMult: 1.5 },
            { name: 'Essence Overlord', icon: '👑', healthMult: 1.8, attackMult: 1.8, defenseMult: 1.2 },
            { name: 'Void Harbinger', icon: '👾', healthMult: 2.2, attackMult: 1.3, defenseMult: 1.4 }
        ];

        // Select enemy type
        const enemyType = isBoss ?
            bossTypes[Math.floor(Math.random() * bossTypes.length)] :
            enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        // Calculate base stats based on player stats and essence power
        const playerStats = this.dungeon.player;

        // Get total essence production for scaling
        const totalProduction = this.getTotalProduction();

        // Scale enemy stats based on essence power and player stats with improved balance
        // Use logarithmic scaling to handle high essence values better
        const essenceValue = totalProduction.valueOf();
        const essencePowerFactor = Math.log10(1 + essenceValue) * 0.05; // Logarithmic scaling for more balanced progression
        const attackFactor = Math.log10(1 + playerStats.attack) * 0.2; // Logarithmic scaling for attack factor

        // Cap the scaling factor to prevent enemies from becoming too powerful
        // but ensure they remain challenging at high essence levels
        const scalingFactor = Math.max(1, Math.min(essencePowerFactor + attackFactor, 10));

        // Calculate base stats with better balance between health, attack and defense
        // Health scales more aggressively to give players time to defeat enemies
        // Attack scales moderately to maintain challenge without being overwhelming
        // Defense scales conservatively to ensure player attacks remain effective
        let baseHealth = playerStats.maxHealth * (0.9 + (scalingFactor * 0.1));
        let baseAttack = playerStats.attack * (0.8 + (scalingFactor * 0.05));
        let baseDefense = playerStats.defense * (0.7 + (scalingFactor * 0.03));

        // Improved difficulty scaling based on ascension count
        // Easiest on 0 ascensions, easier on 1, easy on 2, normal on 3+
        // Higher ascensions now provide better rewards rather than just higher difficulty
        const ascensionCount = this.statistics.ascensionCount;
        let difficultyMultiplier;
        let rewardMultiplier = 1.0; // Base reward multiplier

        if (ascensionCount === 0) {
            // Easiest - 60% of normal difficulty
            difficultyMultiplier = 0.6;
            rewardMultiplier = 1.0; // Base rewards
            if (!isBoss) {
                this.addCombatMessage('This enemy seems weak compared to your power.', 'system');
            }
        } else if (ascensionCount === 1) {
            // Easier - 75% of normal difficulty
            difficultyMultiplier = 0.75;
            rewardMultiplier = 1.2; // 20% more rewards
            if (!isBoss) {
                this.addCombatMessage('This enemy appears somewhat challenging.', 'system');
            }
        } else if (ascensionCount === 2) {
            // Easy - 90% of normal difficulty
            difficultyMultiplier = 0.9;
            rewardMultiplier = 1.4; // 40% more rewards
            if (!isBoss) {
                this.addCombatMessage('This enemy looks formidable.', 'system');
            }
        } else {
            // Normal difficulty - 100%
            difficultyMultiplier = 1.0;
            // Additional reward scaling for higher ascensions
            rewardMultiplier = 1.5 + (Math.min(ascensionCount - 3, 7) * 0.1); // Up to +70% more rewards at ascension 10+
            if (!isBoss) {
                this.addCombatMessage('This enemy appears to be a serious threat.', 'system');
            }
        }

        // Store reward multiplier on the enemy for later use when calculating rewards
        this.rewardMultiplier = rewardMultiplier;

        // Apply difficulty multiplier to enemy stats
        baseHealth *= difficultyMultiplier;
        baseAttack *= difficultyMultiplier;
        baseDefense *= difficultyMultiplier;

        // Apply enemy type multipliers
        const health = Math.floor(baseHealth * enemyType.healthMult);
        const attack = Math.floor(baseAttack * enemyType.attackMult);
        const defense = Math.floor(baseDefense * enemyType.defenseMult);

        // Create enemy object
        const enemy = {
            name: enemyType.name,
            icon: enemyType.icon,
            health: health,
            maxHealth: health,
            attack: attack,
            defense: defense,
            isBoss: isBoss
        };

        return enemy;
    }

    // Handle treasure room rewards
    processTreasureRoom() {
        // Apply luck bonus to rewards (5% per luck level - reduced from 10%)
        let luckBonus = 1 + (this.dungeon.player.skills.luck * 0.05);

        // Apply additional luck bonus from powers
        for (const power of this.powers) {
            if (power.purchased && power.effect.dungeonLootChance) {
                luckBonus *= power.effect.dungeonLootChance;
            }
        }

        // Apply additional luck bonus from dungeon artifacts
        for (const artifact of this.artifacts) {
            if (artifact.purchased && artifact.type === 'dungeon' && artifact.effect.dungeonLootChance) {
                luckBonus *= artifact.effect.dungeonLootChance;
            }
        }

        // Calculate essence reward based on player stats with luck bonus
        // Reduced base multiplier from 20 to 15 to make treasures more rare
        const essenceReward = Math.floor(this.dungeon.player.maxHealth * 15 * luckBonus);

        // Apply essence reward bonus from powers
        let finalEssenceReward = essenceReward;
        for (const power of this.powers) {
            if (power.purchased && power.effect.dungeonEssenceReward) {
                finalEssenceReward = Math.floor(finalEssenceReward * power.effect.dungeonEssenceReward);
            }
        }

        // Make sure rewards.essence is a valid BigNumber before adding to it
        if (!(this.dungeon.rewards.essence instanceof BigNumber)) {
            this.dungeon.rewards.essence = new BigNumber(0);
        }

        // Add the reward as a BigNumber
        this.dungeon.rewards.essence = this.dungeon.rewards.essence.add(new BigNumber(finalEssenceReward));

        // Increased essence reward with luck bonus
        this.addCombatMessage(`You found a treasure chest containing ${this.formatNumber(finalEssenceReward)} essence!`, 'system');

        if (luckBonus > 1) {
            this.addCombatMessage(`Your luck increased the essence reward!`, 'system');
        }

        // Update statistics
        this.dungeon.statistics.totalTreasuresFound++;

        // Save dungeon state after processing treasure room
        this.saveDungeonState();
    }

    // Process luck room
    processLuckRoom() {
        // Increase player's luck (critical hit chance and essence find)
        const luckBuff = {
            name: 'Fortune Favor',
            type: 'buff',
            duration: 5,
            onApply: () => {
                // Store original stats to restore later
                this.dungeon.player.luckOriginalAttack = this.dungeon.player.attack;
                // Increase attack by 20%
                this.dungeon.player.attack = Math.floor(this.dungeon.player.attack * 1.2);
                this.addCombatMessage('The fortune energy surrounds you, increasing your attack by 20%!', 'system');
            },
            onExpire: () => {
                // Restore original attack
                if (this.dungeon.player.luckOriginalAttack) {
                    this.dungeon.player.attack = this.dungeon.player.luckOriginalAttack;
                    delete this.dungeon.player.luckOriginalAttack;
                }
                this.addCombatMessage('The fortune effect has worn off.', 'system');
            }
        };

        // Apply the buff
        if (luckBuff.onApply) luckBuff.onApply();
        this.dungeon.player.effects.push(luckBuff);

        // Also give some essence
        const essenceBonus = Math.floor(this.resources.essence.valueOf() * 0.05);

        // Make sure rewards.essence is a valid BigNumber before adding to it
        if (!(this.dungeon.rewards.essence instanceof BigNumber)) {
            this.dungeon.rewards.essence = new BigNumber(0);
        }

        // Add the reward as a BigNumber
        this.dungeon.rewards.essence = this.dungeon.rewards.essence.add(new BigNumber(essenceBonus));
        this.addCombatMessage(`You also found ${this.formatNumber(essenceBonus)} essence in the fortune chamber!`, 'system');

        // Save dungeon state after processing luck room
        this.saveDungeonState();
    }

    // Process trap room
    processTrapRoom() {
        // Different types of traps
        const trapTypes = [
            {
                name: 'Spike Trap',
                description: 'Sharp spikes shoot up from the floor!',
                effect: () => {
                    // Deal damage based on max health
                    const damage = Math.floor(this.dungeon.player.maxHealth * 0.2);
                    this.dungeon.player.health = Math.max(1, this.dungeon.player.health - damage);
                    this.addCombatMessage(`You try to dodge but the spikes catch you, dealing ${damage} damage!`, 'system');
                    this.addCombatMessage('You carefully navigate around the remaining spikes.', 'system');
                }
            },
            {
                name: 'Poison Gas',
                description: 'A cloud of noxious green gas fills the room!',
                effect: () => {
                    // Apply poison effect
                    const poisonEffect = {
                        name: 'Poison',
                        type: 'debuff',
                        duration: 3,
                        onTurn: () => {
                            const damage = Math.floor(this.dungeon.player.maxHealth * 0.05);
                            this.dungeon.player.health = Math.max(1, this.dungeon.player.health - damage);
                            this.addCombatMessage(`The poison courses through your veins, dealing ${damage} damage!`, 'system');
                        },
                        onExpire: () => {
                            this.addCombatMessage('Your body has fought off the poison. You feel better now.', 'system');
                        }
                    };
                    this.dungeon.player.effects.push(poisonEffect);
                    this.addCombatMessage('You inhale some of the gas before covering your mouth. You feel poison spreading through your body!', 'system');
                }
            },
            {
                name: 'Weakening Runes',
                description: 'Ancient runes on the floor glow with a sickly purple light!',
                effect: () => {
                    // Reduce attack temporarily
                    const weakenEffect = {
                        name: 'Weakened',
                        type: 'debuff',
                        duration: 3,
                        onApply: () => {
                            this.dungeon.player.weakenOriginalAttack = this.dungeon.player.attack;
                            this.dungeon.player.attack = Math.floor(this.dungeon.player.attack * 0.7);
                            this.addCombatMessage(`The runes pulse with energy, sapping your strength. Your attack is reduced by 30%!`, 'system');
                        },
                        onExpire: () => {
                            if (this.dungeon.player.weakenOriginalAttack) {
                                this.dungeon.player.attack = this.dungeon.player.weakenOriginalAttack;
                                delete this.dungeon.player.weakenOriginalAttack;
                            }
                            this.addCombatMessage('Your strength returns as the weakening effect wears off.', 'system');
                        }
                    };
                    if (weakenEffect.onApply) weakenEffect.onApply();
                    this.dungeon.player.effects.push(weakenEffect);
                }
            },
            {
                name: 'Essence Drain',
                description: 'A swirling vortex of dark energy appears in the center of the room!',
                effect: () => {
                    // Steal some essence from the player
                    const essenceDrained = Math.min(
                        this.resources.essence.valueOf() * 0.05,
                        this.dungeon.player.maxHealth * 10
                    );

                    if (essenceDrained > 0) {
                        this.resources.essence = this.resources.essence.subtract(new BigNumber(essenceDrained));
                        this.addCombatMessage(`The vortex pulls ${this.formatNumber(essenceDrained)} essence from your reserves!`, 'system');

                        // Give a small health boost as compensation
                        const healthBoost = Math.floor(this.dungeon.player.maxHealth * 0.1);
                        this.dungeon.player.health = Math.min(this.dungeon.player.maxHealth, this.dungeon.player.health + healthBoost);
                        this.addCombatMessage(`However, as the vortex dissipates, you feel revitalized, recovering ${healthBoost} health.`, 'system');
                    } else {
                        this.addCombatMessage('The vortex tries to drain your essence, but you have too little for it to take.', 'system');
                    }
                }
            },
            {
                name: 'Defense Breaker',
                description: 'Magical hammers materialize and strike at your armor!',
                effect: () => {
                    // Reduce defense temporarily
                    const defenseEffect = {
                        name: 'Broken Defense',
                        type: 'debuff',
                        duration: 4,
                        onApply: () => {
                            this.dungeon.player.defenseOriginal = this.dungeon.player.defense;
                            this.dungeon.player.defense = Math.floor(this.dungeon.player.defense * 0.6);
                            this.addCombatMessage(`The magical hammers weaken your defenses by 40%!`, 'system');
                        },
                        onExpire: () => {
                            if (this.dungeon.player.defenseOriginal) {
                                this.dungeon.player.defense = this.dungeon.player.defenseOriginal;
                                delete this.dungeon.player.defenseOriginal;
                            }
                            this.addCombatMessage('Your defenses have been restored.', 'system');
                        }
                    };
                    if (defenseEffect.onApply) defenseEffect.onApply();
                    this.dungeon.player.effects.push(defenseEffect);
                }
            }
        ];

        // Select a random trap
        const trap = trapTypes[Math.floor(Math.random() * trapTypes.length)];

        // Trigger the trap
        this.addCombatMessage(`Trap: ${trap.name}`, 'system');
        this.addCombatMessage(trap.description, 'system');
        this.addCombatMessage('You attempt to disarm the trap...', 'system');

        // Small chance to successfully disarm based on luck
        const disarmChance = 0.1 + (this.dungeon.player.skills.luck * 0.05); // 10% base + 5% per luck level
        if (Math.random() < disarmChance) {
            this.addCombatMessage('Success! You managed to disarm the trap without triggering it!', 'system');

            // Small essence reward for successful disarm
            const essenceReward = Math.floor(this.dungeon.player.maxHealth * 5);

            // Make sure rewards.essence is a valid BigNumber before adding to it
            if (!(this.dungeon.rewards.essence instanceof BigNumber)) {
                this.dungeon.rewards.essence = new BigNumber(0);
            }

            // Add the reward as a BigNumber
            this.dungeon.rewards.essence = this.dungeon.rewards.essence.add(new BigNumber(essenceReward));
            this.addCombatMessage(`You salvage ${this.formatNumber(essenceReward)} essence from the trap components.`, 'system');
        } else {
            this.addCombatMessage('You failed to disarm the trap!', 'system');
            trap.effect();
        }

        // Check if player died from trap
        if (this.dungeon.player.health <= 0) {
            this.dungeon.player.health = 1; // Prevent death from traps
            this.addCombatMessage('You barely survive the trap with 1 health remaining!', 'system');
        }

        // Save dungeon state after processing trap room
        this.saveDungeonState();
    }

    // Handle random events
    processEventRoom() {
        // Define possible events
        const events = [
            {
                name: 'Healing Fountain',
                description: 'You discover a fountain of pure essence that glows with restorative energy.',
                effect: () => {
                    this.addCombatMessage('The shimmering liquid calls to you. You cup your hands and drink.', 'system');
                    const healAmount = Math.floor(this.dungeon.player.maxHealth * 0.3);
                    this.dungeon.player.health = Math.min(this.dungeon.player.maxHealth, this.dungeon.player.health + healAmount);
                    this.addCombatMessage(`A warm sensation spreads through your body as you recover ${healAmount} health!`, 'system');
                }
            },
            {
                name: 'Essence Surge',
                description: 'A swirling vortex of raw essence energy appears before you.',
                effect: () => {
                    this.addCombatMessage('You reach out and touch the vortex. Power surges through your body!', 'system');
                    const buffAmount = Math.floor(this.dungeon.player.attack * 0.2);
                    this.dungeon.player.attack += buffAmount;
                    this.dungeon.player.effects.push({
                        name: 'Essence Surge',
                        type: 'buff',
                        duration: 5,
                        onExpire: () => {
                            this.dungeon.player.attack -= buffAmount;
                            this.addCombatMessage('The surge of power fades away.', 'system');
                        }
                    });
                    this.addCombatMessage(`The essence surge increases your attack by ${buffAmount} for the next 5 rooms!`, 'system');
                }
            },
            {
                name: 'Protective Ward',
                description: 'You find an ancient altar with glowing runes of protection.',
                effect: () => {
                    this.addCombatMessage('You place your hand on the altar. The runes glow brighter and transfer to your armor!', 'system');
                    const buffAmount = Math.floor(this.dungeon.player.defense * 0.3);
                    this.dungeon.player.defense += buffAmount;
                    this.dungeon.player.effects.push({
                        name: 'Protective Ward',
                        type: 'buff',
                        duration: 5,
                        onExpire: () => {
                            this.dungeon.player.defense -= buffAmount;
                            this.addCombatMessage('The protective runes fade from your armor.', 'system');
                        }
                    });
                    this.addCombatMessage(`The protective ward increases your defense by ${buffAmount} for the next 5 rooms!`, 'system');
                }
            },
            {
                name: 'Essence Cache',
                description: 'You notice a hidden compartment in the wall with a faint glow coming from within.',
                effect: () => {
                    this.addCombatMessage('You carefully open the compartment to reveal crystals of pure essence!', 'system');
                    const essenceReward = Math.floor(this.dungeon.player.maxHealth * 15);

                    // Make sure rewards.essence is a valid BigNumber before adding to it
                    if (!(this.dungeon.rewards.essence instanceof BigNumber)) {
                        this.dungeon.rewards.essence = new BigNumber(0);
                    }

                    // Add the reward as a BigNumber
                    this.dungeon.rewards.essence = this.dungeon.rewards.essence.add(new BigNumber(essenceReward));
                    this.addCombatMessage(`You collect ${this.formatNumber(essenceReward)} essence from the hidden cache!`, 'system');
                }
            },
            {
                name: 'Unstable Rift',
                description: 'A tear in reality pulses with chaotic energy in the center of the room.',
                effect: () => {
                    this.addCombatMessage('You approach the rift cautiously. Suddenly, tendrils of energy lash out and envelop you!', 'system');
                    const healthLoss = Math.floor(this.dungeon.player.maxHealth * 0.2);
                    this.dungeon.player.health = Math.max(1, this.dungeon.player.health - healthLoss);

                    const attackGain = Math.floor(this.dungeon.player.attack * 0.15);
                    this.dungeon.player.attack += attackGain;

                    this.addCombatMessage(`The energy painfully drains ${healthLoss} health from you, but as it recedes, you feel permanently stronger!`, 'system');
                    this.addCombatMessage(`Your attack has increased by ${attackGain} permanently.`, 'system');
                }
            },
            {
                name: 'Meditation Chamber',
                description: 'You enter a perfectly silent room with a cushion in the center.',
                effect: () => {
                    this.addCombatMessage('You sit on the cushion and close your eyes, entering a deep meditative state.', 'system');

                    // Clear all negative effects
                    const hadDebuffs = this.dungeon.player.effects.some(e => e.type === 'debuff');
                    this.dungeon.player.effects = this.dungeon.player.effects.filter(e => e.type !== 'debuff');

                    if (hadDebuffs) {
                        this.addCombatMessage('Your meditation cleanses your mind and body of all negative effects.', 'system');
                    }

                    // Small health recovery
                    const healAmount = Math.floor(this.dungeon.player.maxHealth * 0.15);
                    this.dungeon.player.health = Math.min(this.dungeon.player.maxHealth, this.dungeon.player.health + healAmount);
                    this.addCombatMessage(`The meditation restores ${healAmount} health and leaves you feeling refreshed.`, 'system');
                }
            },
            {
                name: 'Essence Infusion',
                description: 'A strange apparatus with glowing tubes and chambers stands in the center of the room.',
                effect: () => {
                    this.addCombatMessage('You step into the apparatus. It hums to life and bathes you in ethereal light!', 'system');

                    // Permanent small boost to max health
                    const healthBoost = Math.max(5, Math.floor(this.dungeon.player.maxHealth * 0.05));
                    this.dungeon.player.maxHealth += healthBoost;
                    this.dungeon.player.health += healthBoost;

                    this.addCombatMessage(`The essence infusion has permanently increased your maximum health by ${healthBoost}!`, 'system');
                    this.addCombatMessage('You feel stronger and more resilient.', 'system');
                }
            }
        ];

        // Select a random event
        const event = events[Math.floor(Math.random() * events.length)];

        // Display event information
        this.addCombatMessage(`Event: ${event.name}`, 'system');
        this.addCombatMessage(event.description, 'system');

        // Apply event effect
        event.effect();

        // Save dungeon state after processing event room
        this.saveDungeonState();
    }

    // This is a comment to prevent duplicate function definition
    // The actual addCombatMessage function is defined earlier in the code

    // Update the dungeon save data
    saveDungeonState() {
        // Only save if there's an active dungeon
        if (!this.dungeon.active) return;

        // Create a simplified version of the dungeon state for saving
        const dungeonSave = {
            active: this.dungeon.active,
            currentRoom: this.dungeon.currentRoom,
            map: this.dungeon.map,
            player: {
                health: this.dungeon.player.health,
                maxHealth: this.dungeon.player.maxHealth,
                attack: this.dungeon.player.attack,
                defense: this.dungeon.player.defense,
                effects: this.dungeon.player.effects,
                skillPoints: this.dungeon.player.skillPoints,
                skills: this.dungeon.player.skills
            },
            combatActive: this.dungeon.combatActive,
            combatLog: this.dungeon.combatLog,
            turn: this.dungeon.turn,
            rewards: {
                essence: this.dungeon.rewards.essence.toJSON(),
                artifacts: this.dungeon.rewards.artifacts,
                skillPoints: this.dungeon.rewards.skillPoints
            },
            statistics: this.dungeon.statistics
        };

        // If in combat, save the enemy state
        if (this.dungeon.combatActive && this.dungeon.currentEnemy) {
            dungeonSave.currentEnemy = this.dungeon.currentEnemy;
        }

        // Save to localStorage
        localStorage.setItem('etherealDungeonState', JSON.stringify(dungeonSave));
    }

    // Load dungeon state from save data
    loadDungeonState() {
        const savedDungeon = localStorage.getItem('etherealDungeonState');
        if (!savedDungeon) return false;

        try {
            const dungeonData = JSON.parse(savedDungeon);

            // Restore dungeon state
            this.dungeon.active = dungeonData.active;
            this.dungeon.currentRoom = dungeonData.currentRoom;
            this.dungeon.map = dungeonData.map;

            // Restore player state
            this.dungeon.player.health = dungeonData.player.health;
            this.dungeon.player.maxHealth = dungeonData.player.maxHealth;
            this.dungeon.player.attack = dungeonData.player.attack;
            this.dungeon.player.defense = dungeonData.player.defense;
            this.dungeon.player.effects = dungeonData.player.effects;
            this.dungeon.player.skillPoints = dungeonData.player.skillPoints;
            this.dungeon.player.skills = dungeonData.player.skills;

            // Restore combat state
            this.dungeon.combatActive = dungeonData.combatActive;
            this.dungeon.combatLog = dungeonData.combatLog;
            this.dungeon.turn = dungeonData.turn;

            // Restore rewards
            this.dungeon.rewards.essence = new BigNumber(dungeonData.rewards.essence);
            this.dungeon.rewards.artifacts = dungeonData.rewards.artifacts;
            this.dungeon.rewards.skillPoints = dungeonData.rewards.skillPoints;

            // Restore statistics
            this.dungeon.statistics = dungeonData.statistics;

            // Restore enemy if in combat
            if (dungeonData.combatActive && dungeonData.currentEnemy) {
                this.dungeon.currentEnemy = dungeonData.currentEnemy;
            }

            // Add a message to the combat log about resuming the dungeon
            if (this.dungeon.active) {
                this.addCombatMessage('You have returned to your dungeon expedition...', 'system');
                this.showNotification('Dungeon expedition resumed!');
                // console.log('Dungeon state loaded successfully');

                // Force the dungeon interface to be visible
                if (this.domCache.dungeonPlaceholder) {
                    this.domCache.dungeonPlaceholder.style.display = 'none';
                }
                const dungeonInterface = document.getElementById('dungeon-interface');
                if (dungeonInterface) {
                    dungeonInterface.style.display = 'flex';
                }

                // Automatically switch to the dungeon tab
                const dungeonTab = document.querySelector('.tab[data-tab="dungeons"]');
                if (dungeonTab) {
                    // Simulate a click on the dungeon tab
                    dungeonTab.click();
                }

                // Update UI with a slight delay to ensure everything is loaded
                setTimeout(() => {
                    this.uiUpdateFlags.dungeon = true;
                    this.updateDungeonUI();
                }, 100);
            } else {
                // Update UI normally if no active dungeon
                this.uiUpdateFlags.dungeon = true;
                this.updateDungeonUI();
            }

            return true;
        } catch (error) {
            console.error('Error loading dungeon state:', error);
            return false;
        }
    }
}

// Start the game when the page loads
window.onload = () => {
    // Initialize the game and store it in a global variable for debugging
    window.game = new Game();

    // Auto-open the first help section
    setTimeout(() => {
        const firstHelpTitle = document.querySelector('.help-title');
        if (firstHelpTitle) {
            firstHelpTitle.click();
        }
    }   , 1000);
};