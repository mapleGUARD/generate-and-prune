import { state } from './state.js';
import { loadSettings, startIncubation, addIdea, endPruningPhase } from './game.js';
import { updateScore, renderGlobalStats, renderGlobalGraph } from './ui.js';

// --- GLOBAL EXPORTS FOR HTML ---
window.startIncubation = startIncubation;
window.endPruningPhase = endPruningPhase;
window.updateScore = updateScore;
window.setAppMode = setAppMode;
window.toggleGameMode = toggleGameMode;
window.openStats = openStats;
window.closeStats = closeStats;
window.clearHistory = clearHistory;

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    loadSessionHistory();
    
    // Initialize View based on saved preference or default to 'training'
    const savedMode = localStorage.getItem('appMode') || 'training';
    setAppMode(savedMode);
});

const ideaInput = document.getElementById('idea-input');
ideaInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && this.value.trim() !== "") {
        addIdea(this.value.trim());
        this.value = "";
    }
});

function setAppMode(mode) {
    state.appMode = mode;
    localStorage.setItem('appMode', mode); 
    
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-mode-${mode}`).classList.add('active');
    
    document.getElementById('training-view').style.display = (mode === 'training') ? 'block' : 'none';
    document.getElementById('custom-view').style.display = (mode === 'custom') ? 'block' : 'none';
}

function toggleGameMode() {
    const mode = document.querySelector('input[name="game-mode"]:checked').value;
    const oppositeContainer = document.getElementById('opposite-mode-container');
    
    if (mode === 'connect') {
        oppositeContainer.style.display = 'none';
        document.getElementById('opposite-mode').checked = false;
    } else {
        oppositeContainer.style.display = 'flex';
    }
    savePreferences();
}

function loadSessionHistory() {
    const history = localStorage.getItem('creativeTrainingHistory');
    if (history) {
        try {
            state.historicalSessions = JSON.parse(history);
        } catch (e) {
            console.error("Error loading session history:", e);
            state.historicalSessions = [];
        }
    }
    loadPreferences(); 
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
            if (el.tagName === 'INPUT' && el.type === 'number') {
                el.addEventListener('input', savePreferences);
            }
        }
    });
}

function savePreferences() {
    const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
    const settings = {
        numRounds: document.getElementById('num-rounds').value,
        genDuration: document.getElementById('gen-duration').value,
        pruneDuration: document.getElementById('prune-duration').value,
        promptType: document.getElementById('prompt-type').value,
        brutalMode: document.getElementById('brutal-mode').checked,
        oppositeMode: document.getElementById('opposite-mode').checked,
        wildcardMode: document.getElementById('wildcard-mode').checked,
        gameMode: gameMode
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
            
            if(s.gameMode) {
                const radio = document.querySelector(`input[name="game-mode"][value="${s.gameMode}"]`);
                if(radio) {
                    radio.checked = true;
                    toggleGameMode(); 
                }
            }
            
            loadSettings(); 
        } catch (e) {
            console.error("Error loading settings:", e);
        }
    }
}

function openStats() {
    document.getElementById('stats-modal').style.display = 'flex';
    renderGlobalStats();
    renderGlobalGraph();
}

function closeStats() {
    document.getElementById('stats-modal').style.display = 'none';
}

function clearHistory() {
    if(confirm("Are you sure you want to clear ALL past session history? This cannot be undone.")) {
        localStorage.removeItem('creativeTrainingHistory');
        state.historicalSessions = [];
        alert("Session history cleared!");
        location.reload();
    }
}
