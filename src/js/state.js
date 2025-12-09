export const config = {
    GEN_TIME: 45,
    PRUNE_TIME: 60,
    TOTAL_ROUNDS: 5,
    MIN_IDEAS: 15,
    IDEAS_PER_MINUTE_TARGET: 5,
    INCUBATION_TIME: 10
};

export const state = {
    ideas: [],
    sessionResults: [],
    historicalSessions: [],
    currentRound: 0,
    roundPassed: false,
    isBrutalMode: false,
    isWildcardMode: false,
    isConnectMode: false,
    appMode: 'custom', // 'custom' or 'training'
    timerInterval: null,
    currentPromptText: "",
    currentPrime: "",
    currentWildcard: ""
};
