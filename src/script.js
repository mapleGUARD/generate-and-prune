// --- DATA BANKS (Prompt Generation) ---

const adjectives = ["Radioactive", "Invisible", "Sticky", "Ancient", "Digital", "Angry", "Wet", "Frozen", "Gigantic", "Tiny", "Floating", "Explosive", "Silent", "Glowing", "Magnetic", "Edible", "Venomous", "Indestructible", "Haunted", "Furry", "Transparent", "Clockwork", "Liquid", "Infinite", "Broken", "Sentient", "Paper", "Electric", "Smelly", "Expensive", "Useless", "Dangerous", "Holy", "Cursed", "Heavy", "Feather-light", "Solar-powered", "Underground", "Flying", "Inflatable", "Recycled", "Origami", "Concrete", "Neon", "Musical", "Intelligent", "Telepathic", "Unstoppable", "Microscopic", "Biodegradable"];

const nouns = ["Brick", "Toaster", "Smartphone", "Sock", "Banana", "Chainsaw", "Cloud", "Piano", "Cactus", "Skeleton", "Shopping Cart", "Ladder", "Toothbrush", "Paperclip", "Bucket", "Cat", "Dinosaur", "Car Trunk", "Tire", "Coffee Mug", "Alarm Clock", "Matchbox", "Shoe", "Umbrella", "Mirror", "Hammer", "Bicycle", "Toilet", "Telescope", "Sandwich", "Refrigerator", "Drone", "Statue", "Treehouse", "Submarine", "Helicopter", "Lightbulb", "Pillow", "Guitar", "Spoon", "Key", "Wallet", "Backpack", "Chair", "Table", "Door", "Window", "Book", "Pen", "Computer", "Egg", "Ocean", "Mountain", "Volcano" ];

// CONTEXTUAL PRIMING: Categorized angles for better constraint matching
const primingAngles = {
    // Angles for Functional/Action-Oriented Prompts
    functional: [
        "Disaster / Survival", "Weaponized / Aggressive", "Repair / Construction", 
        "Musical / Artistic", "Legal / Bureaucratic", "Crime / Theft", 
        "Luxury / Decoration", "Low-Effort / Lazy", "High-Tech Upgrade", "Zero-G Environment"
    ],
    // Angles for Hypothetical/Scenario-Oriented Prompts
    hypothetical: [
        "Sci-Fi / Futuristic", "Prehistoric / Primitive", "Fairy Tale / Magical", 
        "Historical Event", "Anthropological / Cultural", "Religious / Ritual", 
        "Political / Governing", "Philosophical Meaning", "Post-Apocalyptic", "Children's Story"
    ],
    // Angles for Opposite/Negative Prompts (Often used with Opposite Mode, but can be mixed)
    opposite: [
        "Financial Ruin", "Social Embarrassment", "Legal Consequence", 
        "Physical Pain", "Ecological Disaster", "Extreme Inconvenience", 
        "Instant Failure", "Toxic / Poisonous", "Public Outrage", "Utter Uselessness"
    ]
};

const functionalTemplates = [
    "How would you use {a/an} {adj_word} {noun_word} to escape a prison?", 
    "Use {a/an} {adj_word} {noun_word} to fix a broken car.", 
    "How would a billionaire use {a/an} {adj_word} {noun_word}?", 
    "Invent a sport played with {a/an} {adj_word} {noun_word}.", 
    "How would you use {a/an} {adj_word} {noun_word} for self-defense?", 
    "Sell {a/an} {adj_word} {noun_word} on a TV infomercial."
];

const hypotheticalTemplates = [
    "You are a ghost. How do you haunt someone with {a/an} {adj_word} {noun_word}?", 
    "It is the year 3000. Archaeologists find {a/an} {adj_word} {noun_word}. What do they think it is?", 
    "Write a news headline about {a/an} {adj_word} {noun_word}.", 
    "If {a/an} {adj_word} {noun_word} became the president, what is its first law?", 
    "Describe a religion that worships {a/an} {adj_word} {noun_word}.", 
    "A wizard turns you into {a/an} {adj_word} {noun_word}. What do you do?"
];

const oppositeTemplates = [
    "How to accidentally kill someone with {a/an} {adj_word} {noun_word}?", 
    "Why is {a/an} {adj_word} {noun_word} the worst gift for a toddler?", 
    "Describe the most illegal use for {a/an} {adj_word} {noun_word}.", 
    "Why would {a/an} {adj_word} {noun_word} ruin a wedding?", 
    "Ways {a/an} {adj_word} {noun_word} could destroy the world.", 
    "What is the most boring thing to do with {a/an} {adj_word} {noun_word}?"
];

const wildcards = [
    "⚡ New Rule: No using your hands!",
    "⚡ New Rule: Must involve water!",
    "⚡ New Rule: Cost must be under $10!",
    "⚡ New Rule: Must be silent!",
    "⚡ New Rule: Must be edible!",
    "⚡ New Rule: Must be invisible!",
    "⚡ New Rule: Must be heavy!",
    "⚡ New Rule: Must be tiny!",
    "⚡ New Rule: Must be made of paper!",
    "⚡ New Rule: Must be dangerous!"
];

// --- CONFIGURATION ---
let GEN_TIME = 45; 
let PRUNE_TIME = 60; 
let TOTAL_ROUNDS = 5;
let MIN_IDEAS = 15; 
const IDEAS_PER_MINUTE_TARGET = 5; 
const INCUBATION_TIME = 10; 

// --- STATE ---
let ideas = []; 
let sessionResults = []; 
let historicalSessions = []; 
let currentRound = 0;
let roundPassed = false; 
let isBrutalMode = false; 
let isWildcardMode = false;

let timerInterval;
let currentPromptText = "";
let currentPrime = "";
let currentWildcard = "";

// --- DOM ELEMENTS ---
const screens = {
    landing: document.getElementById('landing-screen'),
    gen: document.getElementById('gen-screen'),
    prune: document.getElementById('prune-screen'),
    result: document.getElementById('result-screen')
};
const modal = document.getElementById('incubation-modal');
const failModal = document.getElementById('fail-modal');
const ideaInput = document.getElementById('idea-input');


// --- STORAGE & HISTORY ---

function loadSessionHistory() {
    const history = localStorage.getItem('creativeTrainingHistory');
    if (history) {
        try {
            historicalSessions = JSON.parse(history);
        } catch (e) {
            console.error("Error loading session history:", e);
            historicalSessions = [];
        }
    }
    loadPreferences(); // Load settings on startup
    initSettingsListeners();
}

function initSettingsListeners() {
    const inputs = [
        'num-rounds', 'gen-duration', 'prune-duration', 'prompt-type',
        'brutal-mode', 'opposite-mode', 'wildcard-mode'
    ];
    
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', savePreferences);
            // Also save on input for number fields to catch typing before blur
            if (el.tagName === 'INPUT' && el.type === 'number') {
                el.addEventListener('input', savePreferences);
            }
        }
    });
}

function saveSessionHistory() {
    const sessionSummary = aggregateSessionResults();
    historicalSessions.push(sessionSummary);
    localStorage.setItem('creativeTrainingHistory', JSON.stringify(historicalSessions));
}

function clearHistory() {
    if(confirm("Are you sure you want to clear ALL past session history? This cannot be undone.")) {
        localStorage.removeItem('creativeTrainingHistory');
        historicalSessions = [];
        alert("Session history cleared!");
        location.reload();
    }
}

// --- SETTINGS STORAGE ---

function savePreferences() {
    const settings = {
        numRounds: document.getElementById('num-rounds').value,
        genDuration: document.getElementById('gen-duration').value,
        pruneDuration: document.getElementById('prune-duration').value,
        promptType: document.getElementById('prompt-type').value,
        brutalMode: document.getElementById('brutal-mode').checked,
        oppositeMode: document.getElementById('opposite-mode').checked,
        wildcardMode: document.getElementById('wildcard-mode').checked
    };
    localStorage.setItem('creativeTrainingSettings', JSON.stringify(settings));
}

function loadPreferences() {
    const settings = localStorage.getItem('creativeTrainingSettings');
    if (settings) {
        try {
            const s = JSON.parse(settings);
            if(s.numRounds !== undefined) document.getElementById('num-rounds').value = s.numRounds;
            if(s.genDuration !== undefined) document.getElementById('gen-duration').value = s.genDuration;
            if(s.pruneDuration !== undefined) document.getElementById('prune-duration').value = s.pruneDuration;
            if(s.promptType !== undefined) document.getElementById('prompt-type').value = s.promptType;
            if(s.brutalMode !== undefined) document.getElementById('brutal-mode').checked = s.brutalMode;
            if(s.oppositeMode !== undefined) document.getElementById('opposite-mode').checked = s.oppositeMode;
            if(s.wildcardMode !== undefined) document.getElementById('wildcard-mode').checked = s.wildcardMode;
            
            loadSettings(); // Sync global variables with loaded settings
        } catch (e) {
            console.error("Error loading settings:", e);
        }
    }
}

// --- STATISTICS FEATURE ---

function openStats() {
    document.getElementById('stats-modal').style.display = 'flex';
    renderGlobalStats();
    renderGlobalGraph();
}

function closeStats() {
    document.getElementById('stats-modal').style.display = 'none';
}

function renderGlobalStats() {
    const totalSessions = historicalSessions.length;
    let totalIdeas = 0;
    let totalPassedRounds = 0;
    let sumOrg = 0;
    let sumViab = 0;

    historicalSessions.forEach(s => {
        totalIdeas += s.totalIdeas;
        totalPassedRounds += s.passedRounds;
        // Weighted average based on passed rounds per session isn't stored directly, 
        // but we have avgOriginality for the session.
        // Simple average of session averages for now:
        sumOrg += s.avgOriginality;
        sumViab += s.avgViability;
    });

    const globalAvgOrg = totalSessions > 0 ? (sumOrg / totalSessions).toFixed(1) : "0.0";
    const globalAvgViab = totalSessions > 0 ? (sumViab / totalSessions).toFixed(1) : "0.0";

    const grid = document.getElementById('global-stats-grid');
    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${totalSessions}</div>
            <div class="stat-label">Sessions Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalIdeas}</div>
            <div class="stat-label">Total Ideas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalPassedRounds}</div>
            <div class="stat-label">Rounds Passed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:var(--primary);">${globalAvgOrg}</div>
            <div class="stat-label">Avg Originality</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:var(--accent);">${globalAvgViab}</div>
            <div class="stat-label">Avg Viability</div>
        </div>
    `;
}

function renderGlobalGraph() {
    // Reusing the graph logic but targeting the stats modal container
    const history = historicalSessions;
    const container = document.getElementById('stats-graph-container');
    container.innerHTML = '';
    
    if (history.length < 1) {
        container.innerHTML = `<p style="text-align: center; color: var(--secondary); padding: 20px;">Complete at least 1 session to see your progress graph!</p>`;
        return;
    }

    const W = 500; 
    const H = 200; 
    const P = 20; 
    const maxY = 5; 
    const totalSessions = history.length;
    const xStep = totalSessions > 1 ? W / (totalSessions - 1) : W;
    
    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${W + 2 * P} ${H + 2 * P}" style="background: #fff;">`;
    svg += `<g transform="translate(${P}, ${P})">`;

    // Grid lines
    for (let i = 0; i <= maxY; i++) {
        const y = H - (i / maxY) * H;
        svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="2" />`;
    }
    
    // X Axis Labels (Session Numbers)
    // If too many sessions, skip labels
    const skip = Math.ceil(totalSessions / 10);
    for (let i = 0; i < totalSessions; i+=skip) {
        const x = i * xStep;
        svg += `<text x="${x}" y="${H + 15}" font-size="10" fill="var(--secondary)" text-anchor="middle">${i + 1}</text>`;
    }

    const pointsOrg = [];
    const pointsViab = [];

    history.forEach((session, index) => {
        const x = index * xStep;
        const yOrg = H - (session.avgOriginality / maxY) * H;
        const yViab = H - (session.avgViability / maxY) * H;
        
        pointsOrg.push(`${x},${yOrg}`);
        pointsViab.push(`${x},${yViab}`);
    });

    svg += `<polyline fill="none" stroke="var(--primary)" stroke-width="2" points="${pointsOrg.join(' ')}" />`;
    pointsOrg.forEach(point => {
        const [x, y] = point.split(',');
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="var(--primary)" />`;
    });
    
    svg += `<polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pointsViab.join(' ')}" />`;
    pointsViab.forEach(point => {
        const [x, y] = point.split(',');
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="var(--accent)" />`;
    });

    svg += `</g></svg>`;

    container.innerHTML += svg;
    
    // Y Axis Labels
    container.innerHTML += `<div class="y-axis-label" style="top: ${P + H}px; left: ${P - 5}px;">0</div>`;
    container.innerHTML += `<div class="y-axis-label" style="top: ${P}px; left: ${P - 5}px;">5</div>`;
}

// --- UTILITY FUNCTIONS ---

function getArticle(word) {
    const cleanWord = word.replace(/<\/?strong>/g, ''); 
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    if (cleanWord.length === 0) return 'a'; 
    return vowels.includes(cleanWord[0].toLowerCase()) ? 'an' : 'a';
}

function getPrimeAngle(isOpposite, promptType) {
    let category;
    if (isBrutalMode || isOpposite) {
        // If Brutal or Opposite is on, prioritize the high-stress/negative angles for maximum cognitive load.
        category = primingAngles.opposite;
    } else if (promptType === 'functional') {
        category = primingAngles.functional;
    } else if (promptType === 'hypothetical') {
        category = primingAngles.hypothetical;
    } else {
        // Default for 'all' mode
        category = Math.random() < 0.5 ? primingAngles.functional : primingAngles.hypothetical;
    }
    
    return category[Math.floor(Math.random() * category.length)];
}


function generatePromptText(isOpposite, promptType) {
    let selectedTemplates = [];
    let finalPromptType;

    if (isOpposite) {
        selectedTemplates = oppositeTemplates;
        finalPromptType = 'opposite';
    } else {
        if (promptType === 'functional') {
            selectedTemplates = functionalTemplates;
            finalPromptType = 'functional';
        } else if (promptType === 'hypothetical') {
            selectedTemplates = hypotheticalTemplates;
            finalPromptType = 'hypothetical';
        } else { // 'all'
            if (Math.random() < 0.5) {
                selectedTemplates = functionalTemplates;
                finalPromptType = 'functional';
            } else {
                selectedTemplates = hypotheticalTemplates;
                finalPromptType = 'hypothetical';
            }
        }
    }

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    let result = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];

    result = result.replace('{adj_word}', `<strong>${adj}</strong>`)
                   .replace('{noun_word}', `<strong>${noun}</strong>`);

    result = result.replace(/\{a\/an\}/g, (match, offset) => {
        const subsequentString = result.substring(offset + match.length).trim();
        const nextWordMatch = subsequentString.match(/^([\w<>/]+)/);
        if (nextWordMatch && nextWordMatch[1]) {
            return getArticle(nextWordMatch[1]);
        }
        return 'a'; 
    });
    
    return { text: result, type: finalPromptType };
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// --- SESSION FLOW MANAGEMENT ---

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function loadSettings() {
    GEN_TIME = parseInt(document.getElementById('gen-duration').value) || 45;
    PRUNE_TIME = parseInt(document.getElementById('prune-duration').value) || 60;
    TOTAL_ROUNDS = parseInt(document.getElementById('num-rounds').value) || 5;
    isBrutalMode = document.getElementById('brutal-mode').checked; 
    isWildcardMode = document.getElementById('wildcard-mode').checked;
    
    MIN_IDEAS = Math.ceil((GEN_TIME / 60) * IDEAS_PER_MINUTE_TARGET);
}

function startIncubation() {
    loadSettings();
    if (currentRound === 0) {
        sessionResults = []; 
        currentRound = 1;
    } else {
        // Adaptive Difficulty: If previous round was passed easily, increase difficulty
        if (sessionResults.length > 0) {
            const lastResult = sessionResults[sessionResults.length - 1];
            if (lastResult.status === "PASSED" && lastResult.count >= MIN_IDEAS + 3) {
                MIN_IDEAS += 2; 
            }
        }
        currentRound++;
    }
    
    const isOpposite = document.getElementById('opposite-mode').checked;
    const requestedPromptType = document.getElementById('prompt-type').value;
    
    // 1. Generate Prompt Text and determine its actual type
    const promptResult = generatePromptText(isOpposite, requestedPromptType);
    currentPromptText = promptResult.text;
    const actualPromptType = promptResult.type;

    // 2. Select Contextual Prime Angle
    currentPrime = getPrimeAngle(isOpposite, actualPromptType);
    
    // Update Modal UI
    document.getElementById('modal-prompt').innerHTML = currentPromptText;
    document.getElementById('modal-prime').innerText = currentPrime;
    document.getElementById('modal-round-status').innerText = `Round ${currentRound} of ${TOTAL_ROUNDS}`;

    modal.style.display = 'flex';
    let timeLeft = INCUBATION_TIME;
    document.getElementById('modal-countdown').innerText = timeLeft;

    let incubationTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('modal-countdown').innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(incubationTimer);
            modal.style.display = 'none';
            startGame();
        }
    }, 1000);
}


function startGame() {
    ideas = [];
    document.getElementById('gen-list').innerHTML = '';
    ideaInput.value = '';
    
    document.getElementById('gen-round-status').innerText = `Round ${currentRound} of ${TOTAL_ROUNDS}`;
    document.getElementById('gen-timer').innerText = formatTime(GEN_TIME);
    document.getElementById('gen-prompt').innerHTML = currentPromptText;
    
    // Show the prime during generation as a reminder
    document.getElementById('gen-prime-display').innerText = `Angle: ${currentPrime}`;
    
    // Reset Wildcard Display
    const wildcardBox = document.getElementById('gen-wildcard');
    wildcardBox.style.display = 'none';
    wildcardBox.innerText = '';
    currentWildcard = "";

    const minIdeaStatusElement = document.getElementById('min-idea-status');
    minIdeaStatusElement.innerText = `Goal: ${MIN_IDEAS} ideas to pass (Rate: ${IDEAS_PER_MINUTE_TARGET}/min). Current: 0`;
    minIdeaStatusElement.style.color = 'var(--secondary)';

    switchScreen('gen');
    startGenTimer();
    
    setTimeout(() => ideaInput.focus(), 100);
}

// --- GENERATION PHASE (DMN) ---

function startGenTimer() {
    let timeLeft = GEN_TIME;
    const timerDisplay = document.getElementById('gen-timer');
    const halfTime = Math.floor(GEN_TIME / 2);

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = formatTime(timeLeft);

        if (isWildcardMode && timeLeft === halfTime) {
            triggerWildcard();
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            startPruningPhase();
        }
    }, 1000);
}

function triggerWildcard() {
    const wildcardBox = document.getElementById('gen-wildcard');
    currentWildcard = wildcards[Math.floor(Math.random() * wildcards.length)];
    wildcardBox.innerText = currentWildcard;
    wildcardBox.style.display = 'block';
}

ideaInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && this.value.trim() !== "") {
        addIdea(this.value.trim());
        this.value = "";
    }
});

function addIdea(text) {
    ideas.push({ text: text, orig: 3, viab: 3 }); 
    const li = document.createElement('li');
    li.innerText = text;
    document.getElementById('gen-list').prepend(li);
    
    const currentCount = ideas.length;
    const minIdeaStatusElement = document.getElementById('min-idea-status');
    minIdeaStatusElement.innerText = `Goal: ${MIN_IDEAS} ideas to pass (Rate: ${IDEAS_PER_MINUTE_TARGET}/min). Current: ${currentCount}`;
    
    if (currentCount >= MIN_IDEAS) {
         minIdeaStatusElement.style.color = 'var(--accent)'; 
    } else {
         minIdeaStatusElement.style.color = 'var(--secondary)'; 
    }
}

// --- PRUNING PHASE (ECN) ---

function startPruningPhase() {
    if (ideas.length >= MIN_IDEAS) {
        roundPassed = true;
        switchScreen('prune');
        document.getElementById('prune-round-status').innerText = `Round ${currentRound} of ${TOTAL_ROUNDS}`;
        
        const pruneWildcardDisplay = document.getElementById('prune-wildcard-display');
        if (currentWildcard) {
            pruneWildcardDisplay.innerText = `Constraint to Check: ${currentWildcard}`;
            pruneWildcardDisplay.style.display = 'block';
        } else {
            pruneWildcardDisplay.style.display = 'none';
        }

        renderPruneList();
        
        let timeLeft = PRUNE_TIME;
        const timerDisplay = document.getElementById('prune-timer');

        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.innerText = formatTime(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endPruningPhase();
            }
        }, 1000);

    } else {
        roundPassed = false;
        saveRoundResults();

        document.getElementById('fail-required').innerText = MIN_IDEAS;
        document.getElementById('fail-generated').innerText = ideas.length;
        
        const failContent = document.getElementById('fail-modal-content');
        const failTitle = document.getElementById('fail-title');
        const failNextStep = document.getElementById('fail-next-step');

        if (isBrutalMode) {
            failContent.classList.add('brutal-fail-content');
            failTitle.innerHTML = "BRUTAL FAILURE! 💀";
            failNextStep.innerText = "Session terminated. Check your session summary.";
            failModal.style.display = 'flex';
            
            setTimeout(() => {
                failModal.style.display = 'none';
                finishSession(); 
            }, 3000);

        } else {
            failContent.classList.remove('brutal-fail-content');
            failTitle.innerHTML = "ROUND FAILED! ❌";
            failNextStep.innerText = "The next round will begin shortly.";
            failModal.style.display = 'flex';
        
            setTimeout(() => {
                failModal.style.display = 'none';
                if (currentRound < TOTAL_ROUNDS) {
                    startIncubation();
                } else {
                    finishSession();
                }
            }, 3000);
        }
    }
}

function renderPruneList() {
    const container = document.getElementById('prune-list');
    container.innerHTML = '';

    ideas.forEach((idea, index) => {
        const div = document.createElement('div');
        div.className = 'prune-item';
        // Note: The onchange attribute calls a global function, which is necessary here due to the dynamic rendering.
        div.innerHTML = `
            <h3>${idea.text}</h3>
            <div class="slider-group">
                <span class="slider-label">Originality</span>
                <input type="range" min="1" max="5" value="3" onchange="updateScore(${index}, 'orig', this.value)">
                <span class="slider-label">Viability</span>
                <input type="range" min="1" max="5" value="3" onchange="updateScore(${index}, 'viab', this.value)">
            </div>
        `;
        container.appendChild(div);
    });
}

// Made global so it can be called from the dynamically generated HTML in renderPruneList
function updateScore(index, type, value) {
    ideas[index][type] = parseInt(value);
}

function saveRoundResults() {
    let result = {
        round: currentRound,
        prompt: currentPromptText,
        status: "FAILED",
        count: ideas.length,
        avgOriginality: 0,
        avgViability: 0,
        topIdea: "N/A",
        topScore: 0
    };

    if (roundPassed) {
        const totalOriginality = ideas.reduce((sum, idea) => sum + idea.orig, 0);
        const totalViability = ideas.reduce((sum, idea) => sum + idea.viab, 0);
        
        ideas.sort((a, b) => (b.orig + b.viab) - (a.orig + a.viab));

        result.status = "PASSED";
        result.avgOriginality = (totalOriginality / ideas.length);
        result.avgViability = (totalViability / ideas.length);
        result.topIdea = ideas[0].text;
        result.topScore = (ideas[0].orig + ideas[0].viab) / 2;
    }

    sessionResults.push(result);
}

function endPruningPhase() {
    clearInterval(timerInterval);
    saveRoundResults();

    if (currentRound < TOTAL_ROUNDS) {
        startIncubation(); 
    } else {
        finishSession(); 
    }
}

function aggregateSessionResults() {
    const passedRounds = sessionResults.filter(r => r.status === "PASSED");
    let totalOrg = passedRounds.reduce((sum, r) => sum + r.avgOriginality, 0);
    let totalViab = passedRounds.reduce((sum, r) => sum + r.avgViability, 0);
    let totalIdeas = sessionResults.reduce((sum, r) => sum + r.count, 0);
    
    return {
        date: new Date().toLocaleDateString(),
        totalRounds: TOTAL_ROUNDS,
        passedRounds: passedRounds.length,
        totalIdeas: totalIdeas,
        avgOriginality: passedRounds.length > 0 ? totalOrg / passedRounds.length : 0,
        avgViability: passedRounds.length > 0 ? totalViab / passedRounds.length : 0
    };
}

// --- RESULTS PHASE & GRAPHING ---

function finishSession() {
    switchScreen('result');
    
    saveSessionHistory();

    renderSessionMetrics();

    renderProgressGraph();
}

function renderSessionMetrics() {
    document.getElementById('summary-total-rounds').innerText = sessionResults.length; 

    const summaryDiv = document.getElementById('summary-metrics');
    summaryDiv.innerHTML = '<h3>Round-by-Round Breakdown</h3>';

    let totalIdeaCount = 0;
    let totalAvgOrg = 0;
    let totalAvgViab = 0;
    let passedRounds = 0;
    let bestIdea = null;

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
        <thead>
            <tr style="background:#e2e8f0;">
                <th style="padding: 8px; border: 1px solid #ccc;">Rnd</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Status</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Ideas</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Avg Org</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Top Score</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    sessionResults.forEach(result => {
        const statusColor = result.status === "PASSED" ? 'var(--accent)' : 'var(--danger)';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 8px; border: 1px solid #ccc;">${result.round}</td>
            <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold; color: ${statusColor};">${result.status}</td>
            <td style="padding: 8px; border: 1px solid #ccc;">${result.count}</td>
            <td style="padding: 8px; border: 1px solid #ccc;">${result.avgOriginality.toFixed(1) || 'N/A'}</td>
            <td style="padding: 8px; border: 1px solid #ccc;">${result.topScore ? result.topScore.toFixed(1) : 'N/A'}</td>
        `;
        tbody.appendChild(tr);

        totalIdeaCount += result.count;
        if (result.status === "PASSED") {
            totalAvgOrg += result.avgOriginality;
            totalAvgViab += result.avgViability;
            passedRounds++;
        }

        if (result.topScore && (!bestIdea || result.topScore > bestIdea.score)) {
            bestIdea = { idea: result.topIdea, score: result.topScore, round: result.round };
        }
    });

    summaryDiv.appendChild(table);

    const overallAvgOrg = passedRounds > 0 ? (totalAvgOrg / passedRounds).toFixed(1) : "0.0";
    const overallAvgViab = passedRounds > 0 ? (totalAvgViab / passedRounds).toFixed(1) : "0.0";

    summaryDiv.innerHTML += `
        <h3 style="margin-top: 1.5rem;">Overall Session Metrics (Passed Rounds)</h3>
        <p><strong>Total Rounds Passed:</strong> ${passedRounds} / ${TOTAL_ROUNDS}</p>
        <p><strong>Total Ideas Generated:</strong> ${totalIdeaCount}</p>
        <p><strong>Avg Originality (Passed):</strong> ${overallAvgOrg} / 5</p>
        <p><strong>Avg Viability (Passed):</strong> ${overallAvgViab} / 5</p>
        ${bestIdea && bestIdea.score > 0 ? `<p><strong>Best Idea (${bestIdea.score.toFixed(1)}):</strong> "${bestIdea.idea}" (Round ${bestIdea.round})</p>` : ''}
    `;
}

function renderProgressGraph() {
    const history = historicalSessions;
    const container = document.getElementById('graph-container');
    container.innerHTML = '';
    
    if (history.length < 1) {
        container.innerHTML = `<p style="text-align: center; color: var(--secondary);">Complete at least 1 session to start tracking and graphing your progress!</p>`;
        return;
    }

    const W = 500; 
    const H = 200; 
    const P = 20; 
    const maxY = 5; 
    const totalSessions = history.length;
    const xStep = totalSessions > 1 ? W / (totalSessions - 1) : W;
    
    let svg = `<svg width="${W + 2 * P}" height="${H + 2 * P}" viewBox="0 0 ${W + 2 * P} ${H + 2 * P}" style="background: #f8fafc;">`;
    svg += `<g transform="translate(${P}, ${P})">`;

    for (let i = 0; i <= maxY; i++) {
        const y = H - (i / maxY) * H;
        svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="2" />`;
    }
    
    for (let i = 0; i < totalSessions; i++) {
        const x = i * xStep;
        svg += `<text x="${x}" y="${H + 15}" font-size="10" fill="var(--secondary)" text-anchor="middle">${i + 1}</text>`;
    }
    svg += `<text x="${W / 2}" y="${H + 35}" font-size="10" fill="var(--secondary)" text-anchor="middle">Session Number</text>`;


    const pointsOrg = [];
    const pointsViab = [];

    history.forEach((session, index) => {
        const x = index * xStep;
        const yOrg = H - (session.avgOriginality / maxY) * H;
        const yViab = H - (session.avgViability / maxY) * H;
        
        pointsOrg.push(`${x},${yOrg}`);
        pointsViab.push(`${x},${yViab}`);
    });

    svg += `<polyline fill="none" stroke="var(--primary)" stroke-width="2" points="${pointsOrg.join(' ')}" />`;
    pointsOrg.forEach(point => {
        const [x, y] = point.split(',');
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="var(--primary)" />`;
    });
    
    svg += `<polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pointsViab.join(' ')}" />`;
    pointsViab.forEach(point => {
        const [x, y] = point.split(',');
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="var(--accent)" />`;
    });

    svg += `</g></svg>`;

    container.innerHTML += svg;
    
    container.innerHTML += `<div class="y-axis-label" style="top: ${P + H}px; left: ${P - 15}px;">0</div>`;
    container.innerHTML += `<div class="y-axis-label" style="top: ${P}px; left: ${P - 15}px;">5</div>`;
}

document.addEventListener('DOMContentLoaded', loadSessionHistory);

// Expose updateScore globally for onchange events in the dynamically rendered HTML
window.updateScore = updateScore;
window.startIncubation = startIncubation;
window.clearHistory = clearHistory;
window.endPruningPhase = endPruningPhase;