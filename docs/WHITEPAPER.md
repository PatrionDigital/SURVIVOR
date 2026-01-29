**\$VSC TOKEN**

**TOKENOMICS WHITEPAPER**

Farcaster Survivors

_A Bullet Heaven Game on Base_

Version 2.2 \| January 2026

**Table of Contents**

**1. Executive Summary**

\$VSC is the primary currency token of Farcaster Survivors, a bullet
heaven roguelite game built as a Farcaster Mini App on Base. This
whitepaper details the token's economic design, emission mechanics, and
governance systems.

**1.1 Key Highlights**

- Self-deployed on Base with custom bonding curves

- Gameplay-driven emissions via RewardDistributor contract

- Six gear tokens with bonding curves paired to \$VSC

- 60/40 Treasury/Burn fee split (governance-adjustable)

- Futarchy governance activated 6 months post-launch

- Bootstrapped by developer with no external investors or outside
  influences

- Testnet soft-launch on Base Sepolia followed by mainnet TGE

**2. Token Ecosystem**

The Farcaster Survivors economy uses a multi-token system: one primary
currency (\$VSC) and six gear tokens. All tokens use self-deployed
polynomial bonding curves, keeping fees internal to the ecosystem.

**2.1 \$VSC Token Specifications**

---

**Property** **Value**

**Token Name** Vampire Survivor Clone

**Symbol** \$VSC

**Network** Base (Ethereum L2)

**Token Standard** ERC-20

**Max Supply** 100,000,000,000 (100 Billion)

**Decimals** 18

**Minting** Gameplay rewards via RewardDistributor
contract

**Burning** 40% of all trading fees

---

**2.2 Gear Tokens**

Six gear tokens enable the meta-progression staking system. Each token
corresponds to a gear slot and trades against \$VSC via bonding curves.

---

**Token** **Gear Slot** **Stat Bonus** **Trading**

**\$WEAPON** Weapon Core +% Base Damage Bonding curve vs
\$VSC

**\$ARMOR** Armor Plate +% Damage Reduction Bonding curve vs
\$VSC

**\$POWER** Power Belt +% Area of Effect Bonding curve vs
\$VSC

**\$GLOVES** Combat Gloves +% Attack Speed Bonding curve vs
\$VSC

**\$AMULET** Amulet +% XP Gain Bonding curve vs
\$VSC

**\$BOOTS** Swift Boots +% Movement Speed Bonding curve vs
\$VSC

---

Gear tokens have uncapped supply (bonding curve minted), 18 decimals,
and use the same polynomial curve formula as \$VSC trading pairs.

**3. Token Allocation**

The initial \$VSC allocation is designed for a bootstrapped project with
no external investor dependencies. Ongoing emissions are driven by
gameplay activity.

**3.1 Initial Allocation**

---

**Category** **Allocation** **Tokens** **Vesting**

**Gameplay 42% 42B RewardDistributor
Emissions**

**Team & Advisors** 24% 24B 8mo cliff, 24mo
vest

**Treasury** 24% 24B DAO-controlled

**Liquidity** 6% 6B Protocol-owned

**Prelaunch Airdrop** 4% 4B Instant at TGE

---

**3.2 Allocation Rationale**

**Gameplay Emissions (42%)**

The largest allocation fuels the play-to-earn economy. Tokens are minted
by the RewardDistributor contract based on gameplay activity: survival
time, enemies defeated, achievements unlocked, and social actions.

**Team & Advisors (24%)**

Compensates the developer for bootstrapping the project without external
funding. The 8-month cliff and 24-month vesting reflect the higher risk
profile of an independently funded project while ensuring alignment with
long-term success.

**Treasury (24%)**

Strategic reserve for operations, development, partnerships, and
ecosystem initiatives. All major disbursements require futarchy
governance approval once activated.

**Liquidity (6%)**

Reserved for initial bonding curve seeding and future liquidity
deployments.

**Prelaunch Airdrop (4%)**

Rewards early community members during the 1-week prelaunch period.
Distributed via Merkle tree claim with 90-day window.

**4. Token Flow**

The \$VSC economy creates circular flows between gameplay, trading, and
maintenance systems.

**4.1 Token Sources (Minting)**

---

**Source** **Description**

**Gameplay Rewards** Earned from surviving, defeating enemies, and
completing runs

**Daily Login Bonus** Escalating rewards for consecutive daily logins

**Achievements** One-time rewards for completing milestones

**Social Actions** Rewards for casts, referrals, and friend
challenges

---

**4.2 Token Sinks (Burning/Spending)**

---

**Sink** **Description**

**Gear Maintenance** Refill maintenance pool to retain +50% power
bonus

**Global Upgrade Mint ERC-1155 permanent stat upgrades
NFTs** (progressive cost)

**Trading Fees** 40% of all bonding curve fees are burned

**Premium Cosmetics** Visual customizations and skins

**Tournament Entry** Fees for competitive events with prize pools

---

**4.3 Gear Maintenance System**

The maintenance mechanic creates ongoing \$VSC utility:

- Base Power (Permanent): Always active based on staked gear token
  amount

- Maintenance Bonus: +50% additional power when maintenance pool is
  full

- Decay Rate: 1% of maintenance pool per week

- Refill Cost: Spend \$VSC to refill maintenance pool

- Power Floor: 50% minimum ensures returning players retain baseline
  strength

**5. Bonding Curve Economics**

All token trading uses self-deployed polynomial bonding curves,
providing liquidity without external DEX dependencies and keeping all
fees internal to the ecosystem.

**5.1 Curve Formula**

Price = BasePrice + (Slope × Supply²)

The quadratic curve creates intuitive price discovery: early buyers get
better prices, demand increases prices for all holders, and large trades
have meaningful price impact.

**5.2 Curve Parameters**

---

**Parameter** **Value** **Notes**

**Curve Type** Polynomial Price = Base + Slope ×
(quadratic) Supply²

**Base Price** 0.0001 \$VSC Starting price per token

**Slope** 0.000001 Price acceleration factor

**Reserve Ratio** 100% Fully collateralized

**Buy Fee** 2% Applied on purchases

**Sell Fee** 3% Applied on sales

**Gear Upgrade Fee** 5% Applied on staking actions

---

**5.3 Fee Distribution**

All fees are split between treasury and burn:

---

**Destination** **Default Split** **Purpose**

**Treasury** 60% Operations &
development

**Burn** 40% Deflationary pressure

---

The 60/40 split is the default but can be adjusted by futarchy
governance once activated.

**6. Governance**

**Futarchy governance will be activated 6 months after mainnet launch.
During the initial period, parameter changes will be managed by the
development team with community input via social channels.**

**6.1 Futarchy System**

Economic parameters are governed by futarchy, a prediction-market-based
system where decisions are made based on market prices reflecting
collective belief about proposal outcomes.

**Single Binary Market Model**

Each proposal uses a single binary outcome market rather than dual
conditional markets:

1.  Proposal Submission: Holder with 10,000+ \$VSC staked submits
    proposal with target metric and success criteria

2.  Market Creation: A single prediction market opens with "Pass" and
    "Fail" conditional tokens

3.  Trading Period: 7 days for participants to trade based on their
    beliefs about the proposal's impact

4.  Settlement: Time-Weighted Average Price (TWAP) is calculated at
    market close

5.  Execution: If "Pass" TWAP exceeds "Fail" TWAP by ≥1.5%, proposal
    auto-executes

**Settlement Mechanism**

The TWAP-based settlement (following the MetaDAO model) filters
short-term price manipulation by averaging prices over the trading
period. The 1.5% pass threshold ensures only proposals with clear market
consensus are executed, enforcing caution in governance decisions.

**6.2 Governable Parameters**

---

**Parameter** **Current** **Evaluation Metric**

**Treasury/Burn 60% / 40% 30-day token velocity +
Split** treasury runway

**Buy Fee Rate** 2% Daily trading volume

**Sell Fee Rate** 3% Net token holder growth

**Maintenance Decay** 1% / week Weekly active players

**Reward Emission Variable 7-day new player retention
Rate**

**Gear Tier 1/100/1K/10K/100K Median gear power distribution
Thresholds**

---

**7. Vesting & Distribution**

**7.1 Vesting Schedule**

All vesting managed through Hedgey Finance on Base, preserving
governance rights for locked tokens.

---

**Category** **Cliff** **Vest **TGE **Interval**
Period** Unlock**

**Team** 8 mo 24 mo 0% Monthly linear

**Advisors** 8 mo 24 mo 0% Monthly linear

**Gameplay None Ongoing N/A Per-activity
Emissions**

**Airdrop** None None 100% Instant claim

---

**7.2 Prelaunch Program**

During the 1-week prelaunch period before TGE:

**Early Adopter NFTs**

First 1,000 community members receive transferable NFTs with permanent
benefits: exclusive leaderboard frames, 10% bonus on gameplay rewards,
early access to features, and guaranteed airdrop tier.

**Airdrop Eligibility**

---

**Criteria** **Weight** **Cap**

**Farcaster Power User Badge** 2x Required baseline

**Early Adopter NFT Holder** 3x Top tier allocation

**Base Network Activity (\>10 1.5x Verified on-chain
txns)**

**Prelaunch Engagement** 1.25x Cast interactions

---

Airdrop uses Merkle tree distribution with 90-day claim window.
Unclaimed tokens return to gameplay emissions pool.

**8. Launch Strategy**

**8.1 Phased Approach**

**Phase 0: Testnet Soft-Launch**

- Deploy all contracts on Base Sepolia testnet

- Public gameplay testing with test tokens

- Early Adopter NFT distribution begins

- **Note: Gameplay progression and token earnings do NOT carry over to
  mainnet**

**Phase 1: Prelaunch (1 Week)**

- Airdrop registration and eligibility verification

- Final testnet feedback collection

**Phase 2: TGE (Mainnet Launch)**

- Deploy \$VSC and gear token contracts on Base mainnet

- Initialize bonding curves with seed liquidity

- Airdrop claim opens (4B \$VSC)

- Hedgey vesting contracts for team allocation

**Phase 3: Game Launch**

- Farcaster Survivors public launch on mainnet

- RewardDistributor activated for gameplay emissions

**Phase 4: Governance Activation (+6 Months)**

- Futarchy prediction market contracts deployed

- Community governance begins for parameter adjustments

**8.2 Anti-Gaming Measures**

To protect token emissions from exploitation:

---

**Measure** **Purpose**

**Session Verification** Server validates gameplay patterns to detect
bots

**Diminishing Returns** Reward rate decreases after extended play
sessions

**Cooldown Periods** Mandatory breaks between high-reward
activities

**Behavioral Analysis** ML-based detection of automated play
patterns

---

**9. Smart Contract Architecture**

**9.1 Contract Overview**

All contracts implement OpenZeppelin Pausable for emergency response
capabilities.

---

**Contract** **Purpose**

**VSCToken.sol** Primary ERC-20 with mint/burn controls,
pausable

**GearToken.sol** Template for 6 gear tokens (ERC-20),
pausable

**BondingCurve.sol** Polynomial AMM with fee handling, pausable

**GearStaking.sol** Manages gear slot staking and power
calculation, pausable

**MaintenancePool.sol** Handles decay and refill logic, pausable

**GlobalUpgradeNFT.sol** ERC-1155 for permanent stat upgrades,
pausable

**RewardDistributor.sol** Manages gameplay reward emissions, pausable

**FutarchyMarket.sol** Binary prediction market with TWAP
settlement

**EarlyAdopterNFT.sol** ERC-721 transferable NFT for early
supporters

---

**9.2 Development Timeline**

---

**Phase** **Milestone** **Target**

**Development** Smart contract completion Q1 2026

**Testnet** Base Sepolia soft-launch Q1 2026

**Prelaunch** 1-week community building Q2 2026

**TGE** Base mainnet deployment + Q2 2026
airdrop

**Game Launch** Public release with gameplay Q2 2026
emissions

**Governance** Futarchy activation Q4 2026

---

**10. Risk Factors**

**10.1 Smart Contract Risk**

Smart contracts are deployed without third-party audit. While internal
testing is performed, undiscovered vulnerabilities may exist. Users
interact with contracts at their own risk. All contracts are pausable to
enable emergency response.

**10.2 Regulatory Risk**

\$VSC is designed as a utility token for in-game use. Regulatory
frameworks for digital assets vary by jurisdiction and may change. Users
are responsible for compliance with applicable laws in their
jurisdiction.

**10.3 Economic Risk**

Token inflation from gameplay emissions requires careful balancing with
sinks. Market conditions, player behavior, and unforeseen economic
factors may impact token value. The Project reserves the right to pause
emissions, adjust parameters, or migrate contracts at any time and
without prior notice to address exploits, economic attacks, regulatory
concerns, or other unforeseen situations that could compromise the
project's integrity or viability. Such actions may result in temporary
or permanent loss of access to tokens or functionality.

**10.4 Governance Risk**

Futarchy is experimental. Prediction markets may be subject to
manipulation despite TWAP-based settlement safeguards. Governance
outcomes are not guaranteed to benefit all participants. Futarchy will
only be activated 6 months post-launch to allow for ecosystem
stabilization.

**10.5 Operational Risk**

This project is bootstrapped by an independent developer without
external funding or institutional backing. Development timelines,
feature delivery, and ongoing support are subject to resource
availability.

**10.6 Testnet Disclaimer**

Participation in the Base Sepolia testnet soft-launch is for testing
purposes only. All gameplay progression, token balances, and
achievements earned during testnet will be reset and will not carry over
to mainnet launch.

**11. Legal Disclaimer**

**PLEASE READ THIS DISCLAIMER CAREFULLY BEFORE PARTICIPATING IN THE
FARCASTER SURVIVORS ECOSYSTEM OR ACQUIRING \$VSC TOKENS.**

**11.1 No Investment Advice**

This whitepaper does not constitute investment advice, financial advice,
trading advice, or any other form of advice. You should not treat any of
the whitepaper's content as such. The Project does not recommend that
any cryptocurrency should be bought, sold, or held by you. Do conduct
your own due diligence and consult your financial advisor before making
any investment decisions.

**11.2 No Warranties**

\$VSC tokens are provided "as is" and "as available" without warranties
of any kind, either express or implied, including but not limited to
implied warranties of merchantability, fitness for a particular purpose,
title, and non-infringement. The Project does not warrant that the
tokens, smart contracts, or any related services will be uninterrupted,
timely, secure, or error-free.

**11.3 Limitation of Liability**

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE
PROJECT, ITS DEVELOPERS, AFFILIATES, OR SERVICE PROVIDERS BE LIABLE FOR
ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR
INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE
LOSSES, RESULTING FROM: (A) YOUR ACCESS TO OR USE OF OR INABILITY TO
ACCESS OR USE THE TOKENS OR SMART CONTRACTS; (B) ANY CONDUCT OR CONTENT
OF ANY THIRD PARTY; (C) ANY CONTENT OBTAINED FROM THE PROJECT; OR (D)
UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR
CONTENT.

**11.4 Assumption of Risk**

You acknowledge and agree that: (a) digital assets involve significant
risks; (b) you have sufficient knowledge and experience to evaluate the
merits and risks of acquiring tokens; (c) you are acquiring tokens
solely for use within the game ecosystem and not for investment
purposes; (d) you may lose some or all of the value of your tokens; (e)
the Project may cease operations at any time; (f) smart contracts may
contain bugs or vulnerabilities; and (g) regulatory changes may
adversely affect the tokens.

**11.5 Forward-Looking Statements**

This whitepaper contains forward-looking statements based on current
expectations. These statements involve known and unknown risks,
uncertainties, and other factors that may cause actual results to differ
materially. The Project undertakes no obligation to update
forward-looking statements.

**11.6 No Guarantee of Value**

\$VSC tokens have no inherent value and are not redeemable for any fiat
currency, cryptocurrency, or other asset. The Project makes no
representations or warranties regarding the future value of \$VSC
tokens. Token value may decrease to zero.

**11.7 Jurisdictional Restrictions**

The distribution of this whitepaper and the acquisition of \$VSC tokens
may be restricted by law in certain jurisdictions. This whitepaper does
not constitute an offer or solicitation in any jurisdiction where such
offer or solicitation is unlawful. Persons who access this whitepaper
are required to inform themselves of and comply with any such
restrictions.

**11.8 Right to Modify**

The Project reserves the right, at its sole discretion, to modify,
suspend, or discontinue any aspect of the token ecosystem, including but
not limited to: emission rates, fee structures, governance mechanisms,
smart contracts, and any other parameters described in this whitepaper.
Such modifications may be made without prior notice.

\-\--

**Contact**

- Farcaster: \@farcastersurvivors

- Website: farcastersurvivors.game

_By acquiring, holding, or using \$VSC tokens, you acknowledge that you
have read, understood, and agree to be bound by the terms of this
disclaimer._
