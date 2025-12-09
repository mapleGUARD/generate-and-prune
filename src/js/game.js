import { state, config } from './state.js';
import { wildcards } from './data.js';
import { formatTime, generateConnectPrompt, generatePromptText, getPrimeAngle } from './utils.js';
import { switchScreen, renderPruneList, renderSessionMetrics, renderProgressGraph } from './ui.js';

const modal = document.getElementById('incubation-modal');
const failModal = document.getElementById('fail-modal');
const ideaInput = document.getElementById('idea-input');

export function loadSettings() {
    config.GEN_TIME = parseInt(document.getElementById('gen-duration').value) || 45;
    config.PRUNE_TIME = parseInt(document.getElementById('prune-duration').value) || 60;
    config.TOTAL_ROUNDS = parseInt(document.getElementById('num-rounds').value) || 5;
    state.isBrutalMode = document.getElementById('brutal-mode').checked; 
    state.isWildcardMode = document.getElementById('wildcard-mode').checked;
    
    const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
    state.isConnectMode = (gameMode === 'connect');
    
    config.MIN_IDEAS = Math.ceil((config.GEN_TIME / 60) * config.IDEAS_PER_MINUTE_TARGET);
}

export function startIncubation() {
    let isOpposite = false;
    let requestedPromptType = 'all';

    if (state.appMode === 'training') {
        config.TOTAL_ROUNDS = 10;
        config.GEN_TIME = 60;
        config.PRUNE_TIME = 60;
        state.isWildcardMode = true;
        state.isBrutalMode = document.getElementById('training-brutal-mode').checked;
        
        let nextRound = (state.currentRound === 0) ? 1 : state.currentRound + 1;
        
        state.isConnectMode = (nextRound > 5);
        
        isOpposite = Math.random() < 0.3;
        
        config.MIN_IDEAS = Math.ceil((config.GEN_TIME / 60) * config.IDEAS_PER_MINUTE_TARGET);
        requestedPromptType = 'all';
        
    } else {
        loadSettings();
        isOpposite = document.getElementById('opposite-mode').checked;
        requestedPromptType = document.getElementById('prompt-type').value;
    }

    if (state.currentRound === 0) {
        state.sessionResults = []; 
        state.currentRound = 1;
    } else {
        if (state.sessionResults.length > 0) {
            const lastResult = state.sessionResults[state.sessionResults.length - 1];
            if (lastResult.status === "PASSED" && lastResult.count >= config.MIN_IDEAS + 3) {
                config.MIN_IDEAS += 2; 
            }
        }
        state.currentRound++;
    }
    
    let promptResult;
    if (state.isConnectMode) {
        promptResult = generateConnectPrompt();
    } else {
        promptResult = generatePromptText(isOpposite, requestedPromptType);
    }
    
    state.currentPromptText = promptResult.text;
    const actualPromptType = promptResult.type;

    state.currentPrime = getPrimeAngle(isOpposite, actualPromptType);

    document.getElementById('modal-prompt').innerHTML = state.currentPromptText;
    document.getElementById('modal-prime').innerText = state.currentPrime;
    document.getElementById('modal-round-status').innerText = `Round ${state.currentRound} of ${config.TOTAL_ROUNDS}`;

    modal.style.display = 'flex';
    let timeLeft = config.INCUBATION_TIME;
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

export function startGame() {
    state.ideas = [];
    document.getElementById('gen-list').innerHTML = '';
    ideaInput.value = '';
    
    document.getElementById('gen-round-status').innerText = `Round ${state.currentRound} of ${config.TOTAL_ROUNDS}`;
    document.getElementById('gen-timer').innerText = formatTime(config.GEN_TIME);
    document.getElementById('gen-prompt').innerHTML = state.currentPromptText;
    
    document.getElementById('gen-prime-display').innerText = `Angle: ${state.currentPrime}`;
    
    const wildcardBox = document.getElementById('gen-wildcard');
    wildcardBox.style.display = 'none';
    wildcardBox.innerText = '';
    state.currentWildcard = "";

    const minIdeaStatusElement = document.getElementById('min-idea-status');
    minIdeaStatusElement.innerText = `Goal: ${config.MIN_IDEAS} ideas to pass (Rate: ${config.IDEAS_PER_MINUTE_TARGET}/min). Current: 0`;
    minIdeaStatusElement.style.color = 'var(--secondary)';

    switchScreen('gen');
    startGenTimer();
    
    setTimeout(() => ideaInput.focus(), 100);
}

function startGenTimer() {
    let timeLeft = config.GEN_TIME;
    const timerDisplay = document.getElementById('gen-timer');
    const halfTime = Math.floor(config.GEN_TIME / 2);

    state.timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = formatTime(timeLeft);

        if (state.isWildcardMode && timeLeft === halfTime) {
            triggerWildcard();
        }

        if (timeLeft <= 0) {
            clearInterval(state.timerInterval);
            startPruningPhase();
        }
    }, 1000);
}

function triggerWildcard() {
    const wildcardBox = document.getElementById('gen-wildcard');
    state.currentWildcard = wildcards[Math.floor(Math.random() * wildcards.length)];
    wildcardBox.innerText = state.currentWildcard;
    wildcardBox.style.display = 'block';
}

export function addIdea(text) {
    state.ideas.push({ text: text, orig: 3, viab: 3 }); 
    const li = document.createElement('li');
    li.innerText = text;
    document.getElementById('gen-list').prepend(li);
    
    const currentCount = state.ideas.length;
    const minIdeaStatusElement = document.getElementById('min-idea-status');
    minIdeaStatusElement.innerText = `Goal: ${config.MIN_IDEAS} ideas to pass (Rate: ${config.IDEAS_PER_MINUTE_TARGET}/min). Current: ${currentCount}`;
    
    if (currentCount >= config.MIN_IDEAS) {
         minIdeaStatusElement.style.color = 'var(--accent)'; 
    } else {
         minIdeaStatusElement.style.color = 'var(--secondary)'; 
    }
}

function startPruningPhase() {
    if (state.ideas.length >= config.MIN_IDEAS) {
        state.roundPassed = true;
        switchScreen('prune');
        document.getElementById('prune-round-status').innerText = `Round ${state.currentRound} of ${config.TOTAL_ROUNDS}`;
        
        const pruneWildcardDisplay = document.getElementById('prune-wildcard-display');
        if (state.currentWildcard) {
            const cleanRule = state.currentWildcard.replace("⚡ New Rule: ", "");
            pruneWildcardDisplay.innerText = `Constraint to Check: ${cleanRule}`;
            pruneWildcardDisplay.style.display = 'block';
        } else {
            pruneWildcardDisplay.style.display = 'none';
        }

        renderPruneList();
        
        let timeLeft = config.PRUNE_TIME;
        const timerDisplay = document.getElementById('prune-timer');

        state.timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.innerText = formatTime(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(state.timerInterval);
                endPruningPhase();
            }
        }, 1000);

    } else {
        state.roundPassed = false;
        saveRoundResults();

        document.getElementById('fail-required').innerText = config.MIN_IDEAS;
        document.getElementById('fail-generated').innerText = state.ideas.length;
        
        const failContent = document.getElementById('fail-modal-content');
        const failTitle = document.getElementById('fail-title');
        const failNextStep = document.getElementById('fail-next-step');

        if (state.isBrutalMode) {
            failContent.classList.add('brutal-fail-content');
            failTitle.innerHTML = "BRUTAL FAILURE! 💀";
            failNextStep.innerText = "Session restarting from Round 1...";
            failModal.style.display = 'flex';
            
            setTimeout(() => {
                failModal.style.display = 'none';
                state.currentRound = 0; 
                startIncubation(); 
            }, 3000);

        } else {
            failContent.classList.remove('brutal-fail-content');
            failTitle.innerHTML = "ROUND FAILED! ❌";
            failNextStep.innerText = "The next round will begin shortly.";
            failModal.style.display = 'flex';
        
            setTimeout(() => {
                failModal.style.display = 'none';
                if (state.currentRound < config.TOTAL_ROUNDS) {
                    startIncubation();
                } else {
                    finishSession();
                }
            }, 3000);
        }
    }
}

export function endPruningPhase() {
    clearInterval(state.timerInterval);
    saveRoundResults();

    if (state.currentRound < config.TOTAL_ROUNDS) {
        startIncubation(); 
    } else {
        finishSession(); 
    }
}

function saveRoundResults() {
    let result = {
        round: state.currentRound,
        prompt: state.currentPromptText,
        status: "FAILED",
        count: state.ideas.length,
        avgOriginality: 0,
        avgViability: 0,
        topIdea: "N/A",
        topScore: 0
    };

    if (state.roundPassed) {
        const totalOriginality = state.ideas.reduce((sum, idea) => sum + idea.orig, 0);
        const totalViability = state.ideas.reduce((sum, idea) => sum + idea.viab, 0);
        
        state.ideas.sort((a, b) => (b.orig + b.viab) - (a.orig + a.viab));

        result.status = "PASSED";
        result.avgOriginality = (totalOriginality / state.ideas.length);
        result.avgViability = (totalViability / state.ideas.length);
        result.topIdea = state.ideas[0].text;
        result.topScore = (state.ideas[0].orig + state.ideas[0].viab) / 2;
    }

    state.sessionResults.push(result);
}

function finishSession() {
    switchScreen('result');
    
    saveSessionHistory();

    renderSessionMetrics();

    renderProgressGraph();
}

function saveSessionHistory() {
    const sessionSummary = aggregateSessionResults();
    state.historicalSessions.push(sessionSummary);
    localStorage.setItem('creativeTrainingHistory', JSON.stringify(state.historicalSessions));
}

function aggregateSessionResults() {
    const passedRounds = state.sessionResults.filter(r => r.status === "PASSED");
    let totalOrg = passedRounds.reduce((sum, r) => sum + r.avgOriginality, 0);
    let totalViab = passedRounds.reduce((sum, r) => sum + r.avgViability, 0);
    let totalIdeas = state.sessionResults.reduce((sum, r) => sum + r.count, 0);
    
    return {
        date: new Date().toLocaleDateString(),
        totalRounds: config.TOTAL_ROUNDS,
        passedRounds: passedRounds.length,
        totalIdeas: totalIdeas,
        avgOriginality: passedRounds.length > 0 ? totalOrg / passedRounds.length : 0,
        avgViability: passedRounds.length > 0 ? totalViab / passedRounds.length : 0
    };
}
