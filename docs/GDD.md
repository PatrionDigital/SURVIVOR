**GAME DESIGN DOCUMENT**

\[Working Title: Farcaster Survivors\]

*A Crypto-Native Bullet Heaven Game on Farcaster*

Version 2.0

January 2026

Ecosystem Token: \$VSC (Vampire Survivor Clone)

**Table of Contents**

1\. Executive Summary

2\. Core Gameplay Systems

3\. Meta-Progression System

4\. Crypto Economics

5\. Farcaster Mini Apps Integration

6\. Player Feedback Loops

7\. Systems Relationships

8\. Technical Architecture Overview

9\. Appendix: Token Specifications

**1. Executive Summary**

**1.1 Game Concept**

Farcaster Survivors is a crypto-native bullet heaven game built as a
Farcaster Mini App. Players control a character who automatically
attacks while the player focuses on movement, dodging enemies, and
collecting experience gems. The game features deep meta-progression
through a gear staking system that bridges gameplay with tokenized
economics on Base L2.

**1.2 Core Pillars**

**Accessible Gameplay:** Auto-attack mechanics requiring only movement
input, playable in Farcaster Mini Apps

**Deep Progression:** Six gear slots with token-based power scaling and
hybrid rarity tiers

**Social Integration:** Native Farcaster features including social
graph, casts, and notifications

**Sustainable Economics:** Self-deployed bonding curves with 60/40 fee
split (treasury/burn) for Base grant eligibility

**1.3 Target Platform**

Farcaster Mini Apps running in Warpcast and compatible clients (Base
app, Supercast). The game renders as an interactive Mini App that users
can discover in the Mini App store, receive notifications for, and play
directly without leaving their social experience.

**1.4 Session Structure**

Each game session runs in Survival Mode with linear difficulty scaling
over time. Sessions typically last 10-30 minutes depending on player
skill. The game features auto-attack combat where the player focuses on
movement and strategic weapon/passive selection during level-ups.

**1.5 Key Updates in v2.0**

  ------------------- ----------------------- ---------------------------
  **Area**            **Previous (v1.0)**     **Updated (v2.0)**

  Platform            Farcaster Frames v2     Farcaster Mini Apps SDK

  Token Supply        1 billion \$VSC         100 billion \$VSC

  Fee Split           50% treasury / 50% burn 60% treasury / 40% burn
                                              (dynamic)

  Deployment          External platforms      Self-deployed bonding
                      (Clanker)               curves

  Gear System         Token threshold tiers   Hybrid rarity + maintenance
                                              mechanic

  Game Mode           Multiple modes          Survival Mode only (linear
                                              scaling)

  Global Upgrades     Internal registry       ERC-1155 NFTs
  ------------------- ----------------------- ---------------------------

**2. Core Gameplay Systems**

**2.1 Movement and Combat**

The player controls a single character on a 2D plane. Movement is
handled via touch/drag on mobile or WASD/arrow keys on desktop. The
character automatically attacks in the direction of the nearest enemy
using equipped weapons. There is no manual attack button.

**Control Scheme:** Movement only (auto-attack is always active)

**Camera:** Fixed follow-cam centered on player

**Enemies:** Spawn from screen edges in waves of increasing difficulty

**2.2 Survival Mode**

The game features a single mode at launch: Survival Mode with
never-ending gameplay and linear difficulty scaling over time. Players
survive as long as possible against increasingly difficult waves of
enemies. Death ends the run and rewards are calculated based on survival
time and enemies defeated.

**Difficulty Scaling:** Enemy health, damage, and spawn rate increase
linearly with time

**No Victory Condition:** Play continues until death

**Rewards:** Based on survival time, XP collected, and enemies defeated

**2.3 Weapon System**

Players can equip up to 6 weapons simultaneously. Each weapon has unique
attack patterns, damage types, and upgrade paths. Weapons are selected
during level-up choices and can evolve when certain conditions are met.

  --------------- ------------------------------- -----------------------
  **Weapon**      **Base Behavior**               **Evolution**

  Magic Wand      Fires homing projectile at      Holy Wand (piercing)
                  nearest enemy                   

  Knife           Throws knives in facing         Thousand Edge (bounce)
                  direction                       

  Axe             Throws high-damage axes in arc  Death Spiral (orbit)

  Cross           Boomerang that returns through  Heaven Sword (split)
                  enemies                         

  Fire Wand       Fires seeking flame projectiles Hellfire (explosion)

  Lightning Ring  Strikes random nearby enemies   Thunder Loop (chain)
  --------------- ------------------------------- -----------------------

**2.4 Passive Item System**

Players can hold up to 6 passive items that modify stats or add special
effects. Some passives combine with weapons to trigger evolutions.

  ------------------- ------------------------------- -------------------
  **Passive**         **Effect**                      **Evolution Combo**

  Spinach             +10% damage per level           N/A

  Armor               +5% damage reduction per level  N/A

  Empty Tome          -8% cooldown per level          Magic Wand
                                                      evolution

  Candelabrador       +10% area per level             Fire Wand evolution

  Bracer              +10% projectile speed per level Knife evolution

  Crown               +8% XP gain per level           N/A
  ------------------- ------------------------------- -------------------

**2.5 Experience and Leveling**

Defeated enemies drop experience gems. Collecting gems fills the XP bar.
When the bar is full, the player gains a level and is presented with 3-4
random choices to select from: new weapons, new passives, or upgrades to
existing items.

**XP Curve:** Each level requires more XP than the last (exponential
scaling)

**Luck Factor:** Higher luck stat increases chance of rare offerings

**Reroll:** Players can reroll choices once per level (costs in-game
currency)

**3. Meta-Progression System**

**3.1 Gear Staking System**

The core meta-progression system uses token staking across 6 gear slots.
Each gear slot accepts a specific gear token, and the amount staked
determines the power tier and bonuses applied to gameplay. This creates
a direct link between token holdings and in-game power.

  ------------------- ------------------- -------------------------------
  **Gear Slot**       **Token**           **Stat Bonus**

  Weapon Core         \$WEAPON            +% Base Damage

  Armor Plate         \$ARMOR             +% Damage Reduction

  Power Belt          \$POWER             +% Area of Effect

  Combat Gloves       \$GLOVES            +% Attack Speed

  Amulet              \$AMULET            +% XP Gain

  Swift Boots         \$BOOTS             +% Movement Speed
  ------------------- ------------------- -------------------------------

**3.2 Hybrid Rarity System**

Gear power uses a hybrid system combining continuous scaling with
discrete rarity tiers. Within each tier, power scales logarithmically
with token amount. Crossing tier thresholds unlocks visual changes, new
abilities, and multiplier bonuses.

*Power Formula: BasePower x TierMultiplier x log(StakedTokens)*

  ------------ --------------- ---------------- ------------ -------------------
  **Tier**     **Token         **Multiplier**   **Visual**   **Special Ability**
               Threshold**                                   

  Common       1 - 99          1.0x             Gray outline Base stats only

  Uncommon     100 - 999       1.1x             Green glow   +5% crit chance

  Rare         1,000 - 9,999   1.25x            Blue aura    +10% crit damage

  Epic         10,000 - 99,999 1.5x             Purple       Unique visual
                                                particles    effect

  Legendary    100,000+        2.0x             Golden       Exclusive ability
                                                flames       unlock
  ------------ --------------- ---------------- ------------ -------------------

**3.3 Gear Maintenance System**

To create ongoing token utility and prevent pure accumulation, gear uses
a maintenance mechanic. Staked tokens provide base power permanently,
but an additional maintenance pool provides bonus power that depletes
over time.

**Base Power (Permanent):** Always active based on staked amount

**Maintenance Bonus:** +50% additional power when maintenance pool is
full

**Decay Rate:** 1% of maintenance pool per week

**Refill Cost:** Spend \$VSC to refill maintenance pool

**Zero Maintenance:** 50% power floor ensures returning players retain
baseline strength

This system creates a continuous \$VSC sink while avoiding the
frustration of gear loss. Active players maintain maximum power, while
casual players retain meaningful progression.

**3.4 Global Upgrades (NFTs)**

Permanent stat upgrades are implemented as ERC-1155 NFTs, providing
collectibility, tradability, and clear ownership. Each upgrade category
has 10 levels, with each level costing progressively more \$VSC to mint.

  ------------------- --------------------------- -----------------------
  **Upgrade**         **Effect Per Level**        **Max Bonus (Lv10)**

  Might               +1% base damage             +10% damage

  Constitution        +1% max health              +10% health

  Swiftness           +0.5% movement speed        +5% speed

  Fortune             +1% luck                    +10% luck

  Wisdom              +1% XP gain                 +10% XP

  Recovery            +0.1 HP/s regeneration      +1 HP/s regen
  ------------------- --------------------------- -----------------------

NFT implementation allows players to trade upgrade levels on secondary
markets (OpenSea, etc.) and provides visual representation of
progression through profile displays.

**4. Crypto Economics**

**4.1 Token Overview**

The ecosystem uses a primary currency token (\$VSC) and six gear tokens.
All tokens use custom-deployed bonding curves to enable trading without
external liquidity requirements while keeping fees internal for
sustainability and Base grant eligibility.

  -------------- ----------------------------- --------------------------
  **Token**      **Purpose**                   **Mechanism**

  \$VSC          Primary currency for all      Gameplay rewards, bonding
                 transactions                  curve trading

  \$WEAPON       Weapon Core gear staking      Bonding curve vs \$VSC

  \$ARMOR        Armor Plate gear staking      Bonding curve vs \$VSC

  \$POWER        Power Belt gear staking       Bonding curve vs \$VSC

  \$GLOVES       Combat Gloves gear staking    Bonding curve vs \$VSC

  \$AMULET       Amulet gear staking           Bonding curve vs \$VSC

  \$BOOTS        Swift Boots gear staking      Bonding curve vs \$VSC
  -------------- ----------------------------- --------------------------

**4.2 Self-Deployed Bonding Curves**

All tokens use self-deployed polynomial bonding curves rather than
external platforms. This approach provides full control over fee
structures, qualifies for Base ecosystem grants that reward smart
contract deployment, and keeps all trading fees internal to the game
economy.

**Bonding Curve Formula**

*Price = BasePrice + (Slope x Supply\^2)*

The polynomial (quadratic) curve provides intuitive price discovery
where early buyers get better prices, later demand increases prices for
all holders, and large buys/sells have meaningful price impact.

**Fee Structure**

  ----------------------- --------------- -------------------------------
  **Fee Type**            **Rate**        **Distribution**

  Buy Fee                 2%              60% Treasury, 40% Burn

  Sell Fee                3%              60% Treasury, 40% Burn

  Gear Upgrade            5%              60% Treasury, 40% Burn
  ----------------------- --------------- -------------------------------

**Dynamic Fee Adjustment**

The fee split ratio can be adjusted by governance based on economic
conditions:

**High Inflation (\>5% supply growth):** 40% Treasury / 60% Burn (more
deflationary)

**Normal Conditions:** 60% Treasury / 40% Burn (balanced)

**Low Activity (\<2% growth):** 70% Treasury / 30% Burn (more runway)

**Base Grant Eligibility**

By deploying our own smart contracts on Base Mainnet rather than using
external platforms, the game qualifies for Base ecosystem grants that
reward developers for on-chain activity. This provides additional
revenue streams beyond trading fees.

**4.3 Token Flow**

**\$VSC Sources (Minting)**

Gameplay rewards from surviving and defeating enemies, daily login
bonuses, achievement completions, and social actions (casts, referrals).

**\$VSC Sinks (Burning)**

Gear maintenance refills, global upgrade NFT minting, bonding curve
trading fees (40% burn), premium cosmetics, and tournament entry fees.

**4.4 Anti-Gaming Measures**

  --------------------------- -------------------------------------------
  **Measure**                 **Purpose**

  Session Verification        Server validates gameplay patterns to
                              detect bots

  Diminishing Returns         Reward rate decreases after extended play
                              sessions

  Cooldown Periods            Mandatory breaks between high-reward
                              activities

  Behavioral Analysis         ML-based detection of automated play
                              patterns
  --------------------------- -------------------------------------------

**5. Farcaster Mini Apps Integration**

**5.1 Mini Apps SDK Implementation**

The game is built using the \@farcaster/miniapp-sdk, which provides
authentication, wallet integration, and access to Farcaster social
features. Mini Apps are web applications (HTML/CSS/JavaScript)
discoverable within Farcaster clients.

**SDK Initialization**

The game initializes the Mini Apps SDK on load to access user context,
wallet functionality, and platform features.

**Key SDK Features**

  ------------------- -------------------------------- -----------------------
  **Feature**         **SDK Method**                   **Use Case**

  Authentication      sdk.actions.signIn()             Sign In With Farcaster
                                                       (SIWF)

  Wallet Access       sdk.wallet.ethProvider           Token transactions on
                                                       Base

  User Context        sdk.context.user                 FID, username, display
                                                       name, PFP

  Location Context    sdk.context.location             Where app was opened
                                                       from

  Notifications       sdk.actions.sendNotification()   Re-engage players

  Cast Sharing        sdk.actions.composeCast()        Share achievements
  ------------------- -------------------------------- -----------------------

**5.2 Manifest Configuration**

The Mini App is configured via a manifest file at
/.well-known/farcaster.json which defines the app metadata, permissions,
and embed settings.

**5.3 Context Types**

The SDK provides different context based on how the Mini App was opened:

  ----------------- -------------------------- ---------------------------
  **Context Type**  **Description**            **Available Data**

  cast_embed        Embedded in a cast         Cast author, hash, text,
                                               embeds

  cast_share        Shared via system share    Shared cast metadata
                    sheet                      

  notification      Opened from notification   Notification ID, title,
                                               body

  launcher          Opened from Mini App       Basic context only
                    launcher                   

  channel           Opened from a channel      Channel key, name, image

  open_miniapp      Opened by another Mini App Referrer domain
  ----------------- -------------------------- ---------------------------

**5.4 Social Features**

**Leaderboards**

Farcaster-native leaderboards show rankings across friends, followers,
and global players. Leaderboard data is stored on-chain and can be
displayed in the Mini App or shared via casts.

**Achievement Sharing**

When players reach milestones (high scores, rare drops, tier upgrades),
they can share achievements as casts with embedded Mini App previews,
driving organic discovery.

**Friend Challenges**

Players can challenge friends by sharing a special challenge cast. The
friend opens the Mini App from the cast embed and competes on the same
seed/parameters.

**5.5 Notification Strategy**

The Mini App uses Farcaster notifications to re-engage players for daily
rewards, maintenance reminders, friend challenges, and special events.
Notifications are permission-based and respect user preferences.

**6. Player Feedback Loops**

**6.1 Session Loop (5-30 minutes)**

  ----------- --------------- ----------------------- -------------------
  **Phase**   **Duration**    **Player Action**       **Reward**

  Start       0-2 min         Initial weapon          First levels
                              selection               

  Build       2-10 min        Weapon/passive          Evolution unlocks
                              synergies               

  Peak        10-20 min       Optimize for survival   High scores

  End         Death           Review results          \$VSC + XP
  ----------- --------------- ----------------------- -------------------

**6.2 Daily Loop**

**Login Bonus:** Escalating \$VSC rewards for consecutive days

**Daily Challenges:** Specific objectives for bonus rewards

**Maintenance Check:** Reminder to refill gear maintenance if low

**6.3 Weekly Loop**

**Weekly Leaderboard Reset:** Compete for top positions

**Seasonal Events:** Limited-time challenges with exclusive rewards

**Maintenance Decay:** 1% weekly decay creates regular engagement

**6.4 Long-term Progression**

**Gear Tier Climbing:** Save tokens to reach next rarity threshold

**NFT Collection:** Mint all global upgrade levels

**Completionist Goals:** Unlock all weapons, evolutions, achievements

**7. Systems Relationships**

**7.1 Economy Flow**

The game economy creates a circular flow: Players earn \$VSC through
gameplay, spend it on gear tokens and maintenance, fees are split
between treasury (operations/development) and burn (deflation), and the
cycle continues.

**7.2 Progression Dependencies**

  ----------------------- ----------------------- -----------------------
  **Input**               **Enables**             **Creates Demand For**

  Gameplay Time           XP + \$VSC Rewards      More sessions

  \$VSC Holdings          Gear Token Purchases    Bonding curve volume

  Gear Tokens Staked      In-Game Power Boost     Competitive advantage

  Maintenance Refills     Full Power Retention    \$VSC sink

  NFT Minting             Permanent Stat Boosts   \$VSC sink
  ----------------------- ----------------------- -----------------------

**7.3 Social-Economic Integration**

Farcaster social features drive economic activity: friend challenges
increase engagement, leaderboard competition drives gear upgrades,
achievement sharing attracts new players who enter the economy.

**7.4 Post-Build Analysis: Machinations.io**

After core systems are implemented, the game economy will be modeled in
Machinations.io for parameter evaluation and balance testing. This tool
enables simulation of token flows, player progression curves, and
economic scenarios before mainnet deployment.

**8. Technical Architecture Overview**

**8.1 Technology Stack**

  ----------------------- -----------------------------------------------
  **Component**           **Technology**

  Platform                Farcaster Mini Apps (@farcaster/miniapp-sdk)

  Game Engine             Phaser 3 (JavaScript)

  Frontend                React + TypeScript + Vite

  Backend                 Node.js + Express

  Database                PostgreSQL + Redis (caching)

  Blockchain              Base L2 (Ethereum)

  Smart Contracts         Solidity (self-deployed)
  ----------------------- -----------------------------------------------

**8.2 Smart Contract Architecture**

  --------------------------- -------------------------------------------
  **Contract**                **Purpose**

  VSCToken.sol                Primary ERC-20 token with mint/burn
                              controls

  GearToken.sol               Template for 6 gear tokens (ERC-20)

  BondingCurve.sol            Polynomial bonding curve AMM with fee
                              handling

  GearStaking.sol             Manages gear slot staking and power
                              calculation

  MaintenancePool.sol         Handles maintenance decay and refill logic

  GlobalUpgradeNFT.sol        ERC-1155 for global stat upgrades

  RewardDistributor.sol       Manages gameplay reward distribution
  --------------------------- -------------------------------------------

**8.3 Deployment Target**

Primary deployment on Base (Coinbase L2) for low gas costs and Farcaster
ecosystem alignment. Base provides fast finality, low fees, native
Coinbase wallet integration, and ecosystem grants for smart contract
deployment.

**Development Strategy**

**Local Development:** Generic ERC-20 on Anvil (Foundry local testnet)

**Testnet:** Base Sepolia for integration testing

**Mainnet:** Self-deployed contracts on Base Mainnet

**8.4 Server Architecture**

The game uses a hybrid architecture where gameplay runs client-side
(Phaser in browser) with server-side validation. Critical actions
(rewards, staking, trading) require server verification before
blockchain execution.

**9. Appendix: Token Specifications**

**9.1 \$VSC Token**

  ----------------------- -----------------------------------------------
  **Property**            **Value**

  Name                    Vampire Survivor Clone

  Symbol                  \$VSC

  Decimals                18

  Max Supply              100,000,000,000 (100 billion)

  Network                 Base (Ethereum L2)

  Standard                ERC-20

  Minting                 Gameplay rewards, controlled by
                          RewardDistributor

  Burning                 Fee mechanism (40% of trading fees)
  ----------------------- -----------------------------------------------

**9.2 Gear Tokens**

  ----------------------- -----------------------------------------------
  **Property**            **Value**

  Names                   \$WEAPON, \$ARMOR, \$POWER, \$GLOVES, \$AMULET,
                          \$BOOTS

  Decimals                18

  Max Supply              Uncapped (bonding curve minted)

  Network                 Base (Ethereum L2)

  Standard                ERC-20

  Trading                 Via bonding curve against \$VSC
  ----------------------- -----------------------------------------------

**9.3 Bonding Curve Parameters**

  ------------------- ----------------------- ---------------------------
  **Parameter**       **Value**               **Notes**

  Curve Type          Polynomial (quadratic)  Price = Base + Slope x
                                              Supply\^2

  Base Price          0.0001 \$VSC            Starting price per token

  Slope               0.000001                Price acceleration factor

  Reserve Ratio       100%                    Fully collateralized

  Buy Fee             2%                      Applied on purchases

  Sell Fee            3%                      Applied on sales

  Fee Distribution    60% Treasury / 40% Burn Dynamically adjustable
  ------------------- ----------------------- ---------------------------

**9.4 Global Upgrade NFT**

  ----------------------- -----------------------------------------------
  **Property**            **Value**

  Standard                ERC-1155

  Token IDs               1-6 (one per upgrade type)

  Max Level               10 per upgrade type

  Mint Cost               Progressive (Level\^2 x BaseCost)

  Tradeable               Yes (OpenSea compatible)
  ----------------------- -----------------------------------------------

*--- End of Document ---*

---

**GDD v2.0 ADDENDUM**

Governance & Prestige Systems

**10. Futarchy Governance System**

**10.1 Overview**

The game implements a futarchy-based governance system for economic
parameter decisions. Unlike traditional token-weighted voting where
whales dominate through sheer holdings, futarchy requires participants
to stake capital on predictions about proposal outcomes. This creates
natural whale deterrence since large bets move prediction markets
against the bettor.

**10.2 Core Principle**

\"Vote on values, bet on beliefs\" --- The community votes on what
metrics matter (e.g., player retention, token velocity), but decisions
are made based on prediction market outcomes for whether proposals will
improve those metrics.

**10.3 How It Works**

**Step 1: Proposal Submission**

Any holder with minimum threshold (e.g., 10,000 \$VSC staked) can submit
a governance proposal. Proposals must include: the proposed change,
target metric(s), success criteria, and measurement timeframe.

**Step 2: Market Creation**

Two conditional prediction markets are created automatically:

**Market A (Proposal Passes):** \"What will \[target metric\] be if this
proposal is implemented?\"

**Market B (Proposal Fails):** \"What will \[target metric\] be if this
proposal is NOT implemented?\"

**Step 3: Trading Period**

Participants buy shares in either market based on their predictions.
Market prices reflect collective beliefs about outcomes. Trading period
lasts 7 days.

**Step 4: Decision**

If Market A price \> Market B price (meaning the market predicts the
proposal improves the metric), the proposal passes. Otherwise, it fails.

**Step 5: Settlement**

After the measurement period, the actual metric value determines
payouts. Accurate predictors profit; inaccurate predictors lose their
stake.

**10.4 Whale Deterrence Mechanics**

  ----------------------- -----------------------------------------------
  **Mechanism**           **How It Deters Whales**

  Price Impact            Large buys move the market price against the
                          buyer, making manipulation expensive

  Capital at Risk         Betting against true beliefs loses money over
                          time as markets resolve

  Information Premium     Knowledge and analysis matter more than raw
                          capital

  Slippage Costs          Big positions incur significant slippage on
                          entry and exit

  Public Visibility       Large bets are visible, inviting counter-bets
                          from informed traders
  ----------------------- -----------------------------------------------

**10.5 Governable Parameters**

The following parameters can be modified through futarchy governance:

  ----------------------- ------------------- ---------------------------
  **Parameter**           **Current Value**   **Metric for Evaluation**

  Treasury/Burn Split     60% / 40%           30-day token velocity +
                                              treasury runway

  Buy Fee Rate            2%                  Daily trading volume

  Sell Fee Rate           3%                  Net token holder growth

  Maintenance Decay Rate  1% per week         Weekly active players

  Reward Emission Rate    Variable            New player retention
                                              (7-day)

  Gear Tier Thresholds    1/100/1K/10K/100K   Median gear power
                                              distribution
  ----------------------- ------------------- ---------------------------

**10.6 Dynamic Burn Rate Implementation**

The treasury/burn fee split is the primary candidate for dynamic
adjustment via futarchy. Rather than hardcoded rules, the community can
propose changes based on economic conditions:

  ----------------------- ----------------------- -----------------------
  **Scenario**            **Proposed Change**     **Success Metric**

  High inflation concern  Increase burn to 60%    Supply growth rate \<
                                                  3%

  Treasury depletion      Decrease burn to 30%    Treasury runway \> 12
                                                  months

  Stagnant economy        Decrease burn to 20%    Trading volume increase
                                                  \> 25%

  Healthy growth          Maintain 40% burn       All metrics within
                                                  targets
  ----------------------- ----------------------- -----------------------

**10.7 Technical Implementation**

  --------------------------- -------------------------------------------
  **Contract**                **Purpose**

  FutarchyGovernor.sol        Manages proposal lifecycle and market
                              creation

  PredictionMarket.sol        LMSR-based market maker for conditional
                              outcomes

  OracleResolver.sol          Reports actual metric values for settlement

  ProposalExecutor.sol        Executes passed proposals on-chain
  --------------------------- -------------------------------------------

Markets use Logarithmic Market Scoring Rule (LMSR) for automated market
making, ensuring liquidity at all price levels while maintaining bounded
loss for the protocol.

**11. Prestige NFT System**

**11.1 Design Philosophy**

Prestige NFTs are ultra-premium achievements reserved for exceptional
accomplishments. These are NOT participation trophies---no \"gold stars
for effort.\" Each Prestige NFT represents a meaningful milestone that
required significant skill, dedication, or contribution to the
ecosystem.

**11.2 Display Features**

Prestige NFTs unlock exclusive visual customizations that display across
the game and Farcaster social layer:

**Leaderboard Background Textures**

Each Prestige NFT grants a unique background texture for the holder\'s
leaderboard entry, making their ranking visually distinct from standard
entries.

  ------------------- ----------------------- ---------------------------
  **Texture**         **Unlocked By**         **Visual Description**

  Void Shimmer        30-Minute Survivor      Deep purple with shifting
                                              particle effects

  Golden Flames       All Legendaries         Animated gold fire border

  Crimson Storm       1M Enemies Defeated     Red lightning crackling
                                              effect

  Ethereal Frost      Season 1 Champion       Ice crystal overlay with
                                              glow

  Founder\'s Legacy   Genesis Player          Exclusive metallic gradient
  ------------------- ----------------------- ---------------------------

**Avatar Frames**

Premium frames surround the player\'s Farcaster PFP in all game contexts
(leaderboards, friend lists, cast embeds, challenge invites).

  ------------------- --------------------------- -----------------------
  **Frame**           **Unlocked By**             **Visual Description**

  Obsidian Crown      Top 10 All-Time             Dark crown with gem
                                                  accents

  Phoenix Wings       5 Evolution Masteries       Fiery wing extensions

  Diamond Edge        100K Total \$VSC Burned     Crystalline angular
                                                  frame

  Void Halo           All Weapons Mastered        Rotating dark energy
                                                  ring

  Champion\'s Laurel  Tournament Winner           Golden laurel wreath
  ------------------- --------------------------- -----------------------

**11.3 Achievement Categories**

**Survival Mastery**

  ----------------------- ------------------------------- ---------------
  **NFT Name**            **Requirement**                 **Rarity**

  Iron Will               Survive 15 minutes              Rare

  Undying                 Survive 20 minutes              Epic

  Immortal                Survive 30 minutes              Legendary

  Eternal                 Survive 45 minutes              Mythic
  ----------------------- ------------------------------- ---------------

**Combat Excellence**

  ----------------------- ------------------------------- ---------------
  **NFT Name**            **Requirement**                 **Rarity**

  Slayer                  100,000 lifetime kills          Rare

  Annihilator             500,000 lifetime kills          Epic

  Extinction Event        1,000,000 lifetime kills        Legendary

  Godslayer               Defeat hidden boss              Mythic
  ----------------------- ------------------------------- ---------------

**Economic Contribution**

  ----------------------- ------------------------------- ---------------
  **NFT Name**            **Requirement**                 **Rarity**

  Patron                  50,000 \$VSC total burned       Rare

  Benefactor              250,000 \$VSC total burned      Epic

  Pillar                  1,000,000 \$VSC total burned    Legendary

  Architect               Top 10 governance participation Mythic
  ----------------------- ------------------------------- ---------------

**Competitive Achievement**

  ----------------------- ------------------------------- ---------------
  **NFT Name**            **Requirement**                 **Rarity**

  Contender               Top 100 weekly leaderboard      Rare

  Elite                   Top 10 weekly leaderboard       Epic

  Champion                Weekly #1 finish                Legendary

  Legend                  Season champion                 Mythic
  ----------------------- ------------------------------- ---------------

**Special & Limited**

  ----------------------- ------------------------------- --------------------
  **NFT Name**            **Requirement**                 **Rarity**

  Genesis                 Played during launch week       Legendary
                                                          (time-limited)

  Pioneer                 First 1,000 players             Legendary
                                                          (quantity-limited)

  Oracle                  Correct 10 futarchy predictions Epic

  Whale Hunter            Win governance vote against     Mythic
                          whale opposition                
  ----------------------- ------------------------------- --------------------

**11.4 Technical Specification**

  ----------------------- -----------------------------------------------
  **Property**            **Value**

  Standard                ERC-721 (unique, non-fungible)

  Metadata                On-chain SVG with dynamic traits

  Soulbound Option        Configurable per achievement type

  Display Integration     Farcaster profile, Mini App, OpenSea

  Verification            On-chain achievement oracle
  ----------------------- -----------------------------------------------

**11.5 Anti-Farming Measures**

To preserve prestige value, achievements require server-validated
gameplay with anti-bot detection. Time-based achievements use session
verification. Kill counts require pattern analysis to detect automation.
Economic achievements are inherently resistant to farming due to real
cost.

*--- End of Addendum ---*
